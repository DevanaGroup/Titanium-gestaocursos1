
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarClock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Event {
  id: string;
  title: string;
  date: Date;
  participants: string[];
}

interface EventsListProps {
  events: Event[];
  title: string;
  className?: string;
}

const formatDate = (date: Date) => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  ) {
    return `Hoje, ${format(date, "HH:mm")}`;
  } else if (
    date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear()
  ) {
    return `Amanhã, ${format(date, "HH:mm")}`;
  } else {
    return format(date, "dd/MM, HH:mm", { locale: ptBR });
  }
};

const EventsList: React.FC<EventsListProps> = ({ events, title, className }) => {
  return (
    <Card className={`shadow-sm hover:shadow-md transition-shadow ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {events.length === 0 ? (
            <p className="text-sm text-center text-muted-foreground">Nenhum evento encontrado</p>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                className="flex items-start space-x-3 bg-background p-3 rounded-md border"
              >
                <CalendarClock className="h-5 w-5 text-cerrado-green1 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{event.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{formatDate(event.date)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {event.participants.join(", ")}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default EventsList;
