import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { format, parse, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  date?: Date;
  onDateChange?: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = "Selecione uma data",
  className
}: DatePickerProps) {
  const [inputValue, setInputValue] = React.useState(
    date ? format(date, "dd/MM/yyyy") : ""
  );
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setInputValue(date ? format(date, "dd/MM/yyyy") : "");
  }, [date]);

  function applyMask(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const masked = applyMask(e.target.value);
    setInputValue(masked);

    if (masked.length === 10) {
      const parsed = parse(masked, "dd/MM/yyyy", new Date());
      if (isValid(parsed)) {
        onDateChange?.(parsed);
      }
    } else if (masked.length === 0) {
      onDateChange?.(undefined);
    }
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      const parsed = parse(inputValue, "dd/MM/yyyy", new Date());
      if (isValid(parsed)) {
        onDateChange?.(parsed);
        setOpen(false);
      }
    }
  }

  function handleCalendarSelect(selected: Date | undefined) {
    onDateChange?.(selected);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          className={cn(
            "flex items-center w-full rounded-md border border-input bg-background shadow-sm hover:shadow-md transition-all duration-200 h-10 px-3 gap-2",
            className
          )}
        >
          <CalendarIcon
            className="h-4 w-4 text-muted-foreground shrink-0 cursor-pointer"
            onClick={() => setOpen(true)}
          />
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            placeholder={placeholder}
            maxLength={10}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleCalendarSelect}
          initialFocus
          locale={ptBR}
        />
      </PopoverContent>
    </Popover>
  );
} 