import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, BookOpen, Calendar, Users, DollarSign, Package } from "lucide-react";
import { db } from "@/config/firebase";
import { collection, getDocs, getDoc, doc, query, where } from "firebase/firestore";
import { getEventosByCourseId } from "@/services/eventosService";
import { toast } from "sonner";

interface Course {
  id: string;
  title: string;
  description?: string;
  duration?: string;
  instructor?: string;
  price?: number;
  status?: string;
}

interface Lesson {
  id: string;
  courseId: string;
  lessonDate: string;
  lessonStartTime: string;
  professorId?: string;
  professorName?: string;
  professorPaymentValue?: number;
  numberOfStudents?: string;
  locationName?: string;
  lessonTheme?: string;
  calculatedMaterials?: {
    totalMaxillas?: number;
    totalImplants?: number;
    totalSurgicalKits?: number;
  };
}

interface ProfessorSummary {
  professorId: string;
  professorName: string;
  lessons: { date: string; time: string }[];
  totalValue: number;
}

export const CourseDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [eventosCount, setEventosCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const courseRef = doc(db, "courses", id);
        const courseSnap = await getDoc(courseRef);
        if (!courseSnap.exists()) {
          setCourse(null);
          setLessons([]);
          setEventosCount(0);
          return;
        }
        const c = courseSnap.data();
        setCourse({
          id: courseSnap.id,
          title: (c?.title as string) || "",
          description: c?.description as string | undefined,
          duration: c?.duration as string | undefined,
          instructor: c?.instructor as string | undefined,
          price: c?.price as number | undefined,
          status: c?.status as string | undefined,
        });

        const lessonsCol = collection(db, "lessons");
        const q = query(lessonsCol, where("courseId", "==", id));
        const lessonsSnap = await getDocs(q);
        const lessonsList = lessonsSnap.docs
          .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            courseId: (data.courseId as string) || "",
            lessonDate: (data.lessonDate as string) || "",
            lessonStartTime: (data.lessonStartTime as string) || "",
            professorId: data.professorId as string | undefined,
            professorName: data.professorName as string | undefined,
            professorPaymentValue: data.professorPaymentValue as number | undefined,
            numberOfStudents: (data.numberOfStudents as string) || "",
            locationName: (data.locationName as string) || "",
            lessonTheme: (data.lessonTheme as string) || "",
            calculatedMaterials: data.calculatedMaterials as Lesson["calculatedMaterials"],
          };
        })
          .sort(
            (a, b) =>
              new Date((b.lessonDate || "0") + "T12:00:00").getTime() -
              new Date((a.lessonDate || "0") + "T12:00:00").getTime()
          );
        setLessons(lessonsList);

        const eventos = await getEventosByCourseId(id);
        setEventosCount(eventos.length);
      } catch (e) {
        console.error("Erro ao carregar detalhes do curso:", e);
        toast.error("Não foi possível carregar os dados do curso");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const materials = lessons.reduce(
    (acc, l) => {
      const m = l.calculatedMaterials;
      if (!m) return acc;
      return {
        totalMaxillas: acc.totalMaxillas + (m.totalMaxillas ?? 0),
        totalImplants: acc.totalImplants + (m.totalImplants ?? 0),
        totalSurgicalKits: acc.totalSurgicalKits + (m.totalSurgicalKits ?? 0),
      };
    },
    { totalMaxillas: 0, totalImplants: 0, totalSurgicalKits: 0 }
  );

  const totalMaterialsCount =
    materials.totalMaxillas + materials.totalImplants + materials.totalSurgicalKits;

  const professorsMap = new Map<string, ProfessorSummary>();
  for (const l of lessons) {
    if (!l.professorId) continue;
    const key = l.professorId;
    const name = l.professorName || "Professor não identificado";
    const existing = professorsMap.get(key);
    const entry = {
      date: l.lessonDate,
      time: l.lessonStartTime || "",
    };
    const value = l.professorPaymentValue ?? 0;
    if (existing) {
      existing.lessons.push(entry);
      existing.totalValue += value;
    } else {
      professorsMap.set(key, {
        professorId: key,
        professorName: name,
        lessons: [entry],
        totalValue: value,
      });
    }
  }
  const professors = Array.from(professorsMap.values());

  const totalCost = lessons.reduce(
    (sum, l) => sum + (l.professorPaymentValue ?? 0),
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("/courses", { state: { activeTab: "courses" } })}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Curso não encontrado.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => navigate("/courses")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar aos Cursos
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{course.title}</CardTitle>
          {course.description && (
            <CardDescription>{course.description}</CardDescription>
          )}
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aulas</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lessons.length}</div>
            <p className="text-xs text-muted-foreground">aulas vinculadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Material enviado</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMaterialsCount}</div>
            <p className="text-xs text-muted-foreground">
              maxilas: {materials.totalMaxillas} · implantes: {materials.totalImplants} · kits: {materials.totalSurgicalKits}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eventos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{eventosCount}</div>
            <p className="text-xs text-muted-foreground">eventos relacionados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Professores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{professors.length}</div>
            <p className="text-xs text-muted-foreground">professores que lecionaram</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custo total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {totalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">valor professores</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aulas</CardTitle>
          <CardDescription>Lista de aulas vinculadas a este curso</CardDescription>
        </CardHeader>
        <CardContent>
          {lessons.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma aula vinculada a este curso.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Horário</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Tema</TableHead>
                    <TableHead>Alunos</TableHead>
                    <TableHead>Professor</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lessons.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>
                        {l.lessonDate
                          ? format(new Date(l.lessonDate + "T12:00:00"), "dd/MM/yyyy", {
                              locale: ptBR,
                            })
                          : "—"}
                      </TableCell>
                      <TableCell>{l.lessonStartTime || "—"}</TableCell>
                      <TableCell>{l.locationName || "—"}</TableCell>
                      <TableCell>{l.lessonTheme || "—"}</TableCell>
                      <TableCell>{l.numberOfStudents || "—"}</TableCell>
                      <TableCell>{l.professorName || "—"}</TableCell>
                      <TableCell className="text-right">
                        {l.professorPaymentValue != null
                          ? `R$ ${l.professorPaymentValue.toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                            })}`
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Professores</CardTitle>
          <CardDescription>
            Professores que lecionaram para este curso, com datas e valores
          </CardDescription>
        </CardHeader>
        <CardContent>
          {professors.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum professor identificado nas aulas.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Professor</TableHead>
                    <TableHead>Aulas (data/hora)</TableHead>
                    <TableHead className="text-right">Valor total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {professors.map((p) => (
                    <TableRow key={p.professorId}>
                      <TableCell className="font-medium">{p.professorName}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {p.lessons.map((a, i) => (
                            <span key={i} className="text-sm">
                              {a.date
                                ? format(new Date(a.date + "T12:00:00"), "dd/MM/yyyy", {
                                    locale: ptBR,
                                  })
                                : "—"}{" "}
                              {a.time ? a.time : ""}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        R${" "}
                        {p.totalValue.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
