import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  BRAZILIAN_BANKS,
  getBankDisplay,
  findBankByCodeOrName,
  type BrazilianBank,
} from "@/constants/brazilianBanks";

interface BankComboboxProps {
  value?: string; // "001 - Banco do Brasil" ou vazio
  onValueChange: (value: string, bankCode?: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function BankCombobox({
  value,
  onValueChange,
  placeholder = "Selecione o banco...",
  className,
  disabled = false,
}: BankComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const filteredBanks = React.useMemo(
    () => findBankByCodeOrName(search),
    [search]
  );

  const handleSelect = (bank: BrazilianBank) => {
    const display = getBankDisplay(bank);
    onValueChange(display, bank.code);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", className)}
          disabled={disabled}
        >
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar por código ou nome do banco..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>Nenhum banco encontrado.</CommandEmpty>
            <CommandGroup>
              {filteredBanks.map((bank) => {
                const display = getBankDisplay(bank);
                const isSelected = value === display;
                return (
                  <CommandItem
                    key={bank.code}
                    value={display}
                    onSelect={() => handleSelect(bank)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {display}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
