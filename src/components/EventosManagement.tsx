import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarDays, Plus, Edit, Trash2, CalendarIcon, Search } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  getEventos,
  createEvento,
  updateEvento,
  deleteEvento,
  type Evento,
  type EventoInput,
} from "@/services/eventosService";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { cn } from "@/lib/utils";
import { db } from "@/config/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EventosManagementProps {
  userId?: string | null;
  userName?: string;
}

export const EventosManagement: React.FC<EventosManagementProps> = ({ userId, userName }) => {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editing, setEditing] = useState<Evento | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [form, setForm] = useState({
    title: "",
    date: new Date(),
    time: "",
    description: "",
    material: "",
    location: "",
    courseId: "",
  });

  const resetForm = () => {
    setForm({
      title: "",
      date: new Date(),
      time: "",
      description: "",
      material: "",
      location: "",
      courseId: "",
    });
    setEditing(null);
  };

  const fetchCourses = async () => {
    try {
      const q = query(collection(db, "courses"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({
        id: d.id,
        title: (d.data().title as string) || "",
      }));
      setCourses(list);
    } catch (e) {
      console.error("Erro ao carregar cursos:", e);
    }
  };

  const loadEventos = async () => {
    setLoading(true);
    try {
      const list = await getEventos();
      setEventos(list);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar eventos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEventos();
  }, []);

  useEffect(() => {
    fetchCourses();
  }, []);

  const filtered = eventos.filter(
    (e) =>
      !searchTerm ||
      e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.description && e.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (e.material && e.material.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCreate = async () => {
    if (!form.title.trim()) {
      toast.error("Preencha o título do evento.");
      return;
    }
    if (!userId || !userName) {
      toast.error("Usuário não identificado.");
      return;
    }
    try {
      const input: EventoInput = {
        title: form.title.trim(),
        date: form.date,
        time: form.time.trim() || undefined,
        description: form.description.trim(),
        material: form.material.trim() || undefined,
        location: form.location.trim() || undefined,
        courseId: form.courseId.trim() || undefined,
        createdBy: userId,
        createdByName: userName,
      };
      await createEvento(input);
      toast.success("Evento criado.");
      resetForm();
      setIsAddOpen(false);
      loadEventos();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao criar evento.");
    }
  };

  const handleUpdate = async () => {
    if (!editing) return;
    if (!form.title.trim()) {
      toast.error("Preencha o título do evento.");
      return;
    }
    try {
      await updateEvento(editing.id, {
        title: form.title.trim(),
        date: form.date,
        time: form.time.trim() || undefined,
        description: form.description.trim(),
        material: form.material.trim() || undefined,
        location: form.location.trim() || undefined,
        courseId: form.courseId.trim() || undefined,
      });
      toast.success("Evento atualizado.");
      resetForm();
      setEditing(null);
      loadEventos();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao atualizar evento.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteEvento(id);
      toast.success("Evento excluído.");
      setDeleteId(null);
      loadEventos();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao excluir evento.");
    }
  };

  const openEdit = (e: Evento) => {
    setEditing(e);
    setForm({
      title: e.title,
      date: e.date,
      time: e.time || "",
      description: e.description || "",
      material: e.material || "",
      location: e.location || "",
      courseId: e.courseId || "",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="min-h-[120px] flex flex-col justify-center">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Eventos
              </CardTitle>
              <CardDescription>
                Crie e programe eventos. Defina data, material e demais informações.
              </CardDescription>
            </div>
            <Dialog open={isAddOpen} onOpenChange={(o) => { setIsAddOpen(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="bg-red-500 text-white hover:bg-red-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Evento
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Novo Evento</DialogTitle>
                  <DialogDescription>
                    Preencha os dados do evento. Data e título são obrigatórios.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Título *</Label>
                    <Input
                      id="title"
                      placeholder="Ex: Workshop de Gestão"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Data *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !form.date && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {form.date ? format(form.date, "PPP", { locale: ptBR }) : "Selecione"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={form.date}
                            onSelect={(d) => d && setForm({ ...form, date: d })}
                            locale={ptBR}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="time">Hora</Label>
                      <Input
                        id="time"
                        placeholder="Ex: 14:00"
                        value={form.time}
                        onChange={(e) => setForm({ ...form, time: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="location">Local</Label>
                    <Input
                      id="location"
                      placeholder="Ex: Sala 3, auditório"
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Descrição</Label>
                    <textarea
                      id="description"
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Detalhes do evento"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="material">Material</Label>
                    <textarea
                      id="material"
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Material necessário, links, anexos..."
                      value={form.material}
                      onChange={(e) => setForm({ ...form, material: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Vincular ao curso</Label>
                    <Select
                      value={form.courseId || "none"}
                      onValueChange={(v) => setForm({ ...form, courseId: v === "none" ? "" : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Nenhum" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {courses.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setIsAddOpen(false); resetForm(); }}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreate}>Criar evento</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent className="min-h-[480px]">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar eventos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchTerm ? "Nenhum evento encontrado." : "Nenhum evento cadastrado. Adicione o primeiro."}
            </div>
          ) : (
            <div className="rounded-md border min-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">Título</TableHead>
                    <TableHead className="text-center">Data</TableHead>
                    <TableHead className="text-center">Hora</TableHead>
                    <TableHead className="text-center">Local</TableHead>
                    <TableHead className="text-center">Material</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.title}</TableCell>
                      <TableCell className="text-center">
                        {format(e.date, "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-center">{e.time || "—"}</TableCell>
                      <TableCell className="text-center">{e.location || "—"}</TableCell>
                      <TableCell className="text-center max-w-[200px] truncate" title={e.material || ""}>
                        {e.material || "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(e)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(e.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Editar */}
      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) resetForm(); }}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Evento</DialogTitle>
            <DialogDescription>Altere os dados do evento.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-title">Título *</Label>
              <Input
                id="edit-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Data *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !form.date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.date ? format(form.date, "PPP", { locale: ptBR }) : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.date}
                      onSelect={(d) => d && setForm({ ...form, date: d })}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-time">Hora</Label>
                <Input
                  id="edit-time"
                  placeholder="14:00"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-location">Local</Label>
              <Input
                id="edit-location"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Descrição</Label>
              <textarea
                id="edit-description"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-material">Material</Label>
              <textarea
                id="edit-material"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={form.material}
                onChange={(e) => setForm({ ...form, material: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Vincular ao curso</Label>
              <Select
                value={form.courseId || "none"}
                onValueChange={(v) => setForm({ ...form, courseId: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => resetForm()}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title="Excluir evento"
        description="Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        variant="destructive"
      />
    </div>
  );
};
