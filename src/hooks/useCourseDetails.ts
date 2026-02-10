import { useState, useEffect } from "react";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/config/firebase";
import { getEventosByCourseId, type Evento } from "@/services/eventosService";

export type { Evento };

export interface Course {
  id: string;
  title: string;
  description?: string;
  duration?: string;
  instructor?: string;
  price?: number;
  status?: string;
}

export interface Lesson {
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
  protocol?: string;
  origin?: "Externo" | "Interno";
  calculatedMaterials?: {
    totalMaxillas?: number;
    totalImplants?: number;
    totalSurgicalKits?: number;
  };
}

export interface ProfessorSummary {
  professorId: string;
  professorName: string;
  lessons: { date: string; time: string }[];
  totalValue: number;
}

export interface ProfessorLessonRow {
  id: string;
  professorId: string;
  professorName: string;
  lessonDate: string;
  lessonTime: string;
  professorPaymentValue: number;
}

export interface MaterialRow {
  id: string;
  material: string;
  quantidade: number;
  aulaData: string;
  aulaHorario: string;
  aulaTema: string;
  lessonId: string;
}

export function useCourseDetails(courseId: string | undefined) {
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!courseId) return;
    const load = async () => {
      setLoading(true);
      try {
        const courseRef = doc(db, "courses", courseId);
        const courseSnap = await getDoc(courseRef);
        if (!courseSnap.exists()) {
          setCourse(null);
          setLessons([]);
          setEventos([]);
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
        const q = query(lessonsCol, where("courseId", "==", courseId));
        const lessonsSnap = await getDocs(q);
        const lessonsList = lessonsSnap.docs
          .filter((d) => !d.data().deletedAt)
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
              protocol: (data.protocol as string) || undefined,
              origin: (data.origin as "Externo" | "Interno") || undefined,
              calculatedMaterials: data.calculatedMaterials as Lesson["calculatedMaterials"],
            };
          })
          .sort(
            (a, b) =>
              new Date((b.lessonDate || "0") + "T12:00:00").getTime() -
              new Date((a.lessonDate || "0") + "T12:00:00").getTime()
          );
        setLessons(lessonsList);

        const eventosList = await getEventosByCourseId(courseId);
        setEventos(eventosList);
      } catch {
        setCourse(null);
        setLessons([]);
        setEventos([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [courseId]);

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
    const entry = { date: l.lessonDate, time: l.lessonStartTime || "" };
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

  // Uma linha por professor-aula (para tabela com linhas individuais)
  const professorsByLesson: ProfessorLessonRow[] = [];
  for (const l of lessons) {
    if (!l.professorId) continue;
    professorsByLesson.push({
      id: `${l.professorId}-${l.id}`,
      professorId: l.professorId,
      professorName: l.professorName || "Professor não identificado",
      lessonDate: l.lessonDate || "",
      lessonTime: l.lessonStartTime || "",
      professorPaymentValue: l.professorPaymentValue ?? 0,
    });
  }

  const totalCost = lessons.reduce(
    (sum, l) => sum + (l.professorPaymentValue ?? 0),
    0
  );

  const getMaxillaLabel = (theme: string) => {
    if (theme === "Zigomático") return "Crânios";
    if (theme === "Cirurgia Guiada") return "Modelo (mandíbula)";
    return "Maxilas";
  };

  const materialsByLesson: MaterialRow[] = [];
  for (const l of lessons) {
    const m = l.calculatedMaterials;
    if (!m) continue;
    const aulaData = l.lessonDate
      ? new Date(l.lessonDate + "T12:00:00").toLocaleDateString("pt-BR")
      : "—";
    if ((m.totalMaxillas ?? 0) > 0) {
      materialsByLesson.push({
        id: `${l.id}-maxillas`,
        material: getMaxillaLabel(l.lessonTheme || ""),
        quantidade: m.totalMaxillas!,
        aulaData,
        aulaHorario: l.lessonStartTime || "—",
        aulaTema: l.lessonTheme || "—",
        lessonId: l.id,
      });
    }
    if ((m.totalImplants ?? 0) > 0) {
      materialsByLesson.push({
        id: `${l.id}-implants`,
        material: "Implantes",
        quantidade: m.totalImplants!,
        aulaData,
        aulaHorario: l.lessonStartTime || "—",
        aulaTema: l.lessonTheme || "—",
        lessonId: l.id,
      });
    }
    if ((m.totalSurgicalKits ?? 0) > 0) {
      materialsByLesson.push({
        id: `${l.id}-kits`,
        material: "Kits Cirúrgicos",
        quantidade: m.totalSurgicalKits!,
        aulaData,
        aulaHorario: l.lessonStartTime || "—",
        aulaTema: l.lessonTheme || "—",
        lessonId: l.id,
      });
    }
  }

  const eventosCount = eventos.length;

  return {
    course,
    lessons,
    professors,
    professorsByLesson,
    materials,
    totalMaterialsCount,
    materialsByLesson,
    eventos,
    eventosCount,
    totalCost,
    loading,
  };
}
