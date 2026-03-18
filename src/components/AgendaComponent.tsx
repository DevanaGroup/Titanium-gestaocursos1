import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, dateFnsLocalizer, Views, View } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { format, parse, startOfWeek, getDay, parseISO, addHours, addMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar as CalendarIcon,
  Plus,
  Edit,
  Trash2,
  MapPin,
  Users,
  UserCheck,
  AlertCircle,
  BookOpen,
  Tag,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from 'sonner';
import { auth } from '@/config/firebase';
import {
  getUserAgendaForMonth,
  createAgendaEvent,
  updateAgendaEvent,
  deleteAgendaEvent,
} from '@/services/agendaService';
import { getEventosForMonth } from '@/services/eventosService';
import { getLessonsForMonth, LessonCalendarItem } from '@/services/lessonCalendarService';
import {
  AgendaEvent,
  AgendaEventType,
  AgendaEventStatus,
  TaskPriority,
} from '@/types';
import { Evento } from '@/services/eventosService';
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";

// ─── date-fns localizer ───────────────────────────────────────────────────────
const locales = { 'pt-BR': ptBR };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

// ─── Types ────────────────────────────────────────────────────────────────────
type EventSource = 'agenda' | 'lesson' | 'evento';

interface UnifiedCalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  source: EventSource;
  color: string;
  rawAgenda?: AgendaEvent;
  rawLesson?: LessonCalendarItem;
  rawEvento?: Evento;
}

// ─── Color helpers ─────────────────────────────────────────────────────────────
const LESSON_THEME_COLORS: Record<string, string> = {
  'Fase Cirúrgica':   '#1d4ed8',
  'Fluxo Protético':  '#15803d',
  'Cirurgia Guiada':  '#b91c1c',
  'Zigomático':       '#7c3aed',
  'Implante Day':     '#d97706',
  'Boas Vindas':      '#0369a1',
};

const AGENDA_TYPE_COLORS: Record<string, string> = {
  'Reunião':         '#0891b2',
  'Compromisso':     '#d97706',
  'Treinamento':     '#15803d',
  'Apresentação':    '#7c3aed',
  'Visita Técnica':  '#0369a1',
  'Almoço':          '#b45309',
  'Feriado':         '#64748b',
  'Ponto Facultativo': '#64748b',
};

function getLessonColor(lesson: LessonCalendarItem): string {
  const theme = lesson.lessonTheme || '';
  const titleUpper = lesson.title.toUpperCase();

  for (const [key, color] of Object.entries(LESSON_THEME_COLORS)) {
    if (theme.includes(key) || titleUpper.includes(key.toUpperCase())) return color;
  }

  if (titleUpper.includes('FASE CIRURG') || titleUpper.includes('CIRURGIA GUIA')) return LESSON_THEME_COLORS['Fase Cirúrgica'];
  if (titleUpper.includes('FLUXO PROT')) return LESSON_THEME_COLORS['Fluxo Protético'];
  if (titleUpper.includes('ZIGOM')) return LESSON_THEME_COLORS['Zigomático'];
  if (titleUpper.includes('IMPLANTE')) return LESSON_THEME_COLORS['Implante Day'];
  if (titleUpper.includes('BOAS VINDAS')) return LESSON_THEME_COLORS['Boas Vindas'];

  return '#1e40af';
}

function getAgendaColor(event: AgendaEvent): string {
  if (event.color) return event.color;
  return AGENDA_TYPE_COLORS[event.type] || '#6366f1';
}

// ─── Duration parser ──────────────────────────────────────────────────────────
function parseDurationHours(lesson: LessonCalendarItem): number {
  if (lesson.lessonDuration === '4 horas') return 4;
  if (lesson.lessonDuration === '8 horas') return 8;
  if (lesson.lessonDuration === 'Outro' && lesson.customDuration) {
    const match = lesson.customDuration.match(/(\d+)/);
    if (match) return parseInt(match[1]);
  }
  return 8;
}

// ─── Converters to UnifiedCalendarEvent ──────────────────────────────────────
function agendaToCalEvent(ev: AgendaEvent): UnifiedCalendarEvent {
  return {
    id: ev.id,
    title: ev.title,
    start: ev.startDate,
    end: ev.endDate,
    allDay: ev.allDay,
    source: 'agenda',
    color: getAgendaColor(ev),
    rawAgenda: ev,
  };
}

function lessonToCalEvent(lesson: LessonCalendarItem): UnifiedCalendarEvent {
  const dateStr = lesson.lessonDate; // yyyy-MM-dd
  const timeStr = lesson.lessonStartTime || '08:00';
  const [h, m] = timeStr.split(':').map(Number);

  let start: Date;
  try {
    start = parseISO(dateStr);
    start = new Date(start.getFullYear(), start.getMonth(), start.getDate(), h, m, 0);
  } catch {
    start = new Date();
  }

  const durationHours = parseDurationHours(lesson);
  const end = addHours(start, durationHours);

  const statusPrefix = lesson.status === 'inactive' ? 'cancelado_' : '';
  return {
    id: lesson.id,
    title: `${statusPrefix}${lesson.title}`.toUpperCase(),
    start,
    end,
    allDay: false,
    source: 'lesson',
    color: lesson.status === 'inactive' ? '#dc2626' : getLessonColor(lesson),
    rawLesson: lesson,
  };
}

function eventoToCalEvent(ev: Evento): UnifiedCalendarEvent {
  const [h, m] = (ev.time || '08:00').split(':').map(Number);
  const start = new Date(ev.date.getFullYear(), ev.date.getMonth(), ev.date.getDate(), h, m, 0);
  const end = addHours(start, 1);
  return {
    id: ev.id,
    title: ev.title,
    start,
    end,
    allDay: false,
    source: 'evento',
    color: '#be185d',
    rawEvento: ev,
  };
}

// ─── Messages in pt-BR ────────────────────────────────────────────────────────
const messages = {
  allDay: 'Dia inteiro',
  previous: 'Anterior',
  next: 'Próximo',
  today: 'Hoje',
  month: 'Mês',
  week: 'Semana',
  day: 'Dia',
  agenda: 'Agenda',
  date: 'Data',
  time: 'Hora',
  event: 'Evento',
  noEventsInRange: 'Nenhum evento neste período.',
  showMore: (total: number) => `+ ${total} mais`,
};

// ─── Props ─────────────────────────────────────────────────────────────────────
interface AgendaComponentProps {
  userId?: string;
  userName?: string;
}

// ─── Main component ───────────────────────────────────────────────────────────
export const AgendaComponent: React.FC<AgendaComponentProps> = ({
  userId: propUserId,
  userName: propUserName,
}) => {
  const currentUser = auth.currentUser;
  const userId = propUserId || currentUser?.uid || '';
  const userName = propUserName || currentUser?.displayName || 'Usuário';

  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<View>(Views.MONTH);
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [selectedInitialDate, setSelectedInitialDate] = useState<Date | undefined>(undefined);
  const [selectedCalEvent, setSelectedCalEvent] = useState<UnifiedCalendarEvent | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const queryClient = useQueryClient();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  // ─── Queries ──────────────────────────────────────────────────────────────
  const { data: agendaEvents = [] } = useQuery({
    queryKey: ['agendaEvents', userId, year, month],
    queryFn: () => getUserAgendaForMonth(userId, year, month),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ['lessonsCalendar', year, month],
    queryFn: () => getLessonsForMonth(year, month),
    staleTime: 5 * 60 * 1000,
  });

  const { data: eventos = [] } = useQuery({
    queryKey: ['eventosCalendar', year, month],
    queryFn: () => getEventosForMonth(year, month),
    staleTime: 5 * 60 * 1000,
  });

  // ─── Unified events ───────────────────────────────────────────────────────
  const allEvents: UnifiedCalendarEvent[] = [
    ...agendaEvents.map(agendaToCalEvent),
    ...lessons.map(lessonToCalEvent),
    ...eventos.map(eventoToCalEvent),
  ];

  // ─── Mutations ────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: createAgendaEvent,
    onSuccess: () => {
      toast.success('Evento criado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['agendaEvents'] });
      setIsCreateEventOpen(false);
    },
    onError: () => toast.error('Erro ao criar evento'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAgendaEvent,
    onSuccess: () => {
      toast.success('Evento excluído!');
      queryClient.invalidateQueries({ queryKey: ['agendaEvents'] });
      setIsDetailOpen(false);
      setDeleteConfirmOpen(false);
      setSelectedCalEvent(null);
    },
    onError: () => toast.error('Erro ao excluir evento'),
  });

  // ─── Event style ──────────────────────────────────────────────────────────
  const eventPropGetter = useCallback((event: UnifiedCalendarEvent) => ({
    style: {
      backgroundColor: event.color,
      borderColor: event.color,
      color: '#fff',
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: 500,
      padding: '1px 4px',
      border: 'none',
    },
  }), []);

  // ─── Slot select (click on empty day) ─────────────────────────────────────
  const handleSelectSlot = useCallback(({ start }: { start: Date }) => {
    setSelectedInitialDate(start);
    setIsCreateEventOpen(true);
  }, []);

  // ─── Event select ─────────────────────────────────────────────────────────
  const handleSelectEvent = useCallback((event: UnifiedCalendarEvent) => {
    setSelectedCalEvent(event);
    setIsDetailOpen(true);
  }, []);

  // ─── Navigation ───────────────────────────────────────────────────────────
  const handleNavigate = useCallback((date: Date) => {
    setCurrentDate(date);
  }, []);

  // ─── Legend ───────────────────────────────────────────────────────────────
  const legendItems = [
    { label: 'Aulas - Fase Cirúrgica', color: '#1d4ed8' },
    { label: 'Aulas - Fluxo Protético', color: '#15803d' },
    { label: 'Aulas - Cirurgia Guiada', color: '#b91c1c' },
    { label: 'Aulas - Zigomático', color: '#7c3aed' },
    { label: 'Aulas - Implante Day', color: '#d97706' },
    { label: 'Agenda/Compromissos', color: '#6366f1' },
    { label: 'Eventos', color: '#be185d' },
  ];

  // ─── Custom toolbar ───────────────────────────────────────────────────────
  const CustomToolbar = ({ label, onNavigate, onView, view }: any) => (
    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onNavigate('PREV')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => onNavigate('TODAY')}>
          Hoje
        </Button>
        <Button variant="outline" size="sm" onClick={() => onNavigate('NEXT')}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="text-lg font-semibold ml-2 capitalize">{label}</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex rounded-md border overflow-hidden">
          {[
            { key: Views.MONTH, label: 'Mês' },
            { key: Views.WEEK, label: 'Semana' },
            { key: Views.DAY, label: 'Dia' },
            { key: Views.AGENDA, label: 'Agenda' },
          ].map(({ key, label: vLabel }) => (
            <button
              key={key}
              onClick={() => onView(key)}
              className={`px-3 py-1.5 text-sm transition-colors ${
                view === key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background hover:bg-accent text-foreground'
              }`}
            >
              {vLabel}
            </button>
          ))}
        </div>
        <Button
          size="sm"
          onClick={() => { setSelectedInitialDate(new Date()); setIsCreateEventOpen(true); }}
          className="bg-red-500 hover:bg-red-600 text-white"
        >
          <Plus className="h-4 w-4 mr-1" />
          Novo Evento
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Aulas no mês</p>
            <p className="text-2xl font-bold text-blue-600">{lessons.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Compromissos</p>
            <p className="text-2xl font-bold text-indigo-600">{agendaEvents.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Eventos</p>
            <p className="text-2xl font-bold text-pink-600">{eventos.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{allEvents.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {legendItems.map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-block w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
            {label}
          </div>
        ))}
      </div>

      {/* Calendar */}
      <Card>
        <CardContent className="p-4">
          <div style={{ height: 680 }}>
            <Calendar
              localizer={localizer}
              events={allEvents}
              date={currentDate}
              view={currentView}
              onNavigate={handleNavigate}
              onView={setCurrentView}
              eventPropGetter={eventPropGetter}
              onSelectSlot={handleSelectSlot}
              onSelectEvent={handleSelectEvent}
              selectable
              messages={messages}
              culture="pt-BR"
              components={{ toolbar: CustomToolbar }}
              formats={{
                monthHeaderFormat: (date: Date) => format(date, 'MMMM yyyy', { locale: ptBR }),
                dayHeaderFormat: (date: Date) => format(date, "EEEE, d 'de' MMMM", { locale: ptBR }),
                dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
                  `${format(start, "d 'de' MMM", { locale: ptBR })} – ${format(end, "d 'de' MMM", { locale: ptBR })}`,
                weekdayFormat: (date: Date) => format(date, 'EEE', { locale: ptBR }),
                agendaDateFormat: (date: Date) => format(date, "EEE, dd/MM/yyyy", { locale: ptBR }),
                agendaTimeFormat: (date: Date) => format(date, 'HH:mm', { locale: ptBR }),
              }}
              popup
            />
          </div>
        </CardContent>
      </Card>

      {/* Event Detail Dialog */}
      <EventDetailDialog
        event={selectedCalEvent}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onDeleteRequest={() => setDeleteConfirmOpen(true)}
      />

      {/* Create Agenda Event Dialog */}
      <CreateEventDialog
        open={isCreateEventOpen}
        onOpenChange={setIsCreateEventOpen}
        onSubmit={(data) => createMutation.mutate(data)}
        initialDate={selectedInitialDate}
        userId={userId}
        userName={userName}
      />

      {/* Delete Confirm */}
      <ConfirmationDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={() => {
          if (selectedCalEvent?.source === 'agenda' && selectedCalEvent.rawAgenda) {
            deleteMutation.mutate(selectedCalEvent.rawAgenda.id);
          }
        }}
        title="Excluir Evento"
        description="Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="destructive"
      />
    </div>
  );
};

// ─── Event Detail Dialog ──────────────────────────────────────────────────────
interface EventDetailDialogProps {
  event: UnifiedCalendarEvent | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDeleteRequest: () => void;
}

const EventDetailDialog: React.FC<EventDetailDialogProps> = ({
  event,
  open,
  onOpenChange,
  onDeleteRequest,
}) => {
  if (!event) return null;

  const sourceLabel: Record<EventSource, string> = {
    agenda: 'Compromisso / Agenda',
    lesson: 'Aula',
    evento: 'Evento',
  };

  const sourceIcon: Record<EventSource, React.ReactNode> = {
    agenda: <CalendarIcon className="h-4 w-4" />,
    lesson: <BookOpen className="h-4 w-4" />,
    evento: <Tag className="h-4 w-4" />,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-8">
            <span
              className="inline-block w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: event.color }}
            />
            {event.title}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-1">
            {sourceIcon[event.source]}
            {sourceLabel[event.source]}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          {/* Date/Time */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarIcon className="h-4 w-4 flex-shrink-0" />
            <span>
              {format(event.start, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
              {!event.allDay && (
                <span> · {format(event.start, 'HH:mm', { locale: ptBR })} – {format(event.end, 'HH:mm', { locale: ptBR })}</span>
              )}
              {event.allDay && <span> · Dia inteiro</span>}
            </span>
          </div>

          {/* Agenda event details */}
          {event.source === 'agenda' && event.rawAgenda && (
            <>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline">{event.rawAgenda.type}</Badge>
                <Badge>{event.rawAgenda.status}</Badge>
                <Badge variant="secondary">{event.rawAgenda.priority}</Badge>
              </div>
              {event.rawAgenda.location && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  {event.rawAgenda.location}
                </div>
              )}
              {event.rawAgenda.description && (
                <p className="text-muted-foreground">{event.rawAgenda.description}</p>
              )}
              {event.rawAgenda.clientName && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4 flex-shrink-0" />
                  {event.rawAgenda.clientName}
                </div>
              )}
            </>
          )}

          {/* Lesson details */}
          {event.source === 'lesson' && event.rawLesson && (
            <>
              {event.rawLesson.lessonTheme && (
                <div className="flex gap-2">
                  <Badge variant="outline">{event.rawLesson.lessonTheme}</Badge>
                  <Badge variant="secondary">{event.rawLesson.lessonDuration}</Badge>
                </div>
              )}
              {event.rawLesson.locationName && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  {event.rawLesson.locationName}
                  {event.rawLesson.locationAddress && ` — ${event.rawLesson.locationAddress}`}
                </div>
              )}
              {event.rawLesson.courseResponsibleName && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4 flex-shrink-0" />
                  Responsável: {event.rawLesson.courseResponsibleName}
                </div>
              )}
              {event.rawLesson.professorName && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <UserCheck className="h-4 w-4 flex-shrink-0" />
                  Professor: {event.rawLesson.professorName}
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4 flex-shrink-0" />
                {event.rawLesson.numberOfStudents} aluno(s)
              </div>
              {event.rawLesson.protocol && (
                <p className="text-xs text-muted-foreground">Protocolo: {event.rawLesson.protocol}</p>
              )}
            </>
          )}

          {/* Evento details */}
          {event.source === 'evento' && event.rawEvento && (
            <>
              {event.rawEvento.description && (
                <p className="text-muted-foreground">{event.rawEvento.description}</p>
              )}
              {event.rawEvento.location && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  {event.rawEvento.location}
                </div>
              )}
              {event.rawEvento.material && (
                <p className="text-xs text-muted-foreground">Material: {event.rawEvento.material}</p>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          {event.source === 'agenda' && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDeleteRequest}
              className="text-red-600 hover:text-red-700 mr-auto"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Excluir
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Create Event Dialog ──────────────────────────────────────────────────────
interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (data: Omit<AgendaEvent, 'id' | 'createdAt' | 'updatedAt'>) => void;
  initialDate?: Date;
  userId: string;
  userName: string;
}

const CreateEventDialog: React.FC<CreateEventDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  initialDate,
  userId,
  userName,
}) => {
  const defaultDate = initialDate || new Date();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: AgendaEventType.Compromisso,
    status: AgendaEventStatus.Agendado,
    startDate: defaultDate,
    endDate: addHours(defaultDate, 1),
    allDay: false,
    location: '',
    priority: TaskPriority.Média,
    notifyAllCollaborators: false,
    notifyByHierarchy: [] as string[],
    customParticipants: [] as string[],
  });

  const [selectedHierarchies, setSelectedHierarchies] = useState<string[]>([]);

  const availableHierarchies = [
    'Presidente', 'Diretor', 'Diretor de TI', 'Gerente', 'Coordenador',
    'Supervisor', 'Líder Técnico', 'Engenheiro', 'Analista', 'Financeiro',
    'Técnico/Assistente', 'Estagiário/Auxiliar',
  ];

  React.useEffect(() => {
    if (open && initialDate) {
      setFormData((prev) => ({
        ...prev,
        startDate: initialDate,
        endDate: addHours(initialDate, 1),
      }));
    }
  }, [open, initialDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) { toast.error('Título é obrigatório'); return; }
    onSubmit({
      ...formData,
      ownerId: userId,
      ownerName: userName,
      createdBy: userId,
      createdByName: userName,
      notifyByHierarchy: selectedHierarchies,
    });
    setFormData({
      title: '',
      description: '',
      type: AgendaEventType.Compromisso,
      status: AgendaEventStatus.Agendado,
      startDate: new Date(),
      endDate: addHours(new Date(), 1),
      allDay: false,
      location: '',
      priority: TaskPriority.Média,
      notifyAllCollaborators: false,
      notifyByHierarchy: [],
      customParticipants: [],
    });
    setSelectedHierarchies([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[660px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Novo Compromisso</DialogTitle>
          <DialogDescription>
            Preencha os dados do compromisso e selecione quem deve ser notificado.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Reunião com cliente"
                required
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detalhes..."
                rows={2}
              />
            </div>

            <div>
              <Label>Tipo</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as AgendaEventType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.values(AgendaEventType).map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Prioridade</Label>
              <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v as TaskPriority })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.values(TaskPriority).map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label>Local</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Ex: Escritório, Online..."
              />
            </div>

            <div>
              <Label>Início</Label>
              <Input
                type="datetime-local"
                value={format(formData.startDate, "yyyy-MM-dd'T'HH:mm")}
                onChange={(e) => setFormData({ ...formData, startDate: new Date(e.target.value) })}
              />
            </div>

            <div>
              <Label>Fim</Label>
              <Input
                type="datetime-local"
                value={format(formData.endDate, "yyyy-MM-dd'T'HH:mm")}
                onChange={(e) => setFormData({ ...formData, endDate: new Date(e.target.value) })}
              />
            </div>
          </div>

          {/* Notifications */}
          <div className="space-y-3 border-t pt-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Notificações
            </h3>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="notifyAll"
                checked={formData.notifyAllCollaborators}
                onCheckedChange={(v) => setFormData({ ...formData, notifyAllCollaborators: v as boolean })}
              />
              <Label htmlFor="notifyAll" className="text-sm">Notificar todos os colaboradores</Label>
            </div>
            <div className="grid grid-cols-2 gap-1 max-h-28 overflow-y-auto">
              {availableHierarchies.map((h) => (
                <div key={h} className="flex items-center space-x-2">
                  <Checkbox
                    id={`h-${h}`}
                    checked={selectedHierarchies.includes(h)}
                    disabled={formData.notifyAllCollaborators}
                    onCheckedChange={(v) =>
                      setSelectedHierarchies((prev) =>
                        v ? [...prev, h] : prev.filter((x) => x !== h)
                      )
                    }
                  />
                  <Label htmlFor={`h-${h}`} className="text-xs">{h}</Label>
                </div>
              ))}
            </div>
            <div className="flex items-start gap-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              O organizador sempre é notificado.
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">Criar Compromisso</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AgendaComponent;
