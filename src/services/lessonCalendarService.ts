import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';

export interface LessonCalendarItem {
  id: string;
  title: string;
  lessonDate: string;
  lessonStartTime: string;
  lessonDuration: string;
  customDuration?: string;
  locationName: string;
  locationAddress?: string;
  courseResponsibleName: string;
  courseId: string;
  courseTitle?: string;
  lessonTheme?: string;
  numberOfStudents: string;
  professorName?: string;
  status: 'active' | 'inactive' | 'draft';
  protocol?: string;
  origin?: 'Externo' | 'Interno';
}

const fromFirestore = (id: string, data: Record<string, unknown>): LessonCalendarItem => ({
  id,
  title: buildTitle(data),
  lessonDate: (data.lessonDate as string) || '',
  lessonStartTime: (data.lessonStartTime as string) || '08:00',
  lessonDuration: (data.lessonDuration as string) || '8 horas',
  customDuration: data.customDuration as string | undefined,
  locationName: (data.locationName as string) || '',
  locationAddress: data.locationAddress as string | undefined,
  courseResponsibleName: (data.courseResponsibleName as string) || '',
  courseId: (data.courseId as string) || '',
  courseTitle: data.courseTitle as string | undefined,
  lessonTheme: data.lessonTheme as string | undefined,
  numberOfStudents: (data.numberOfStudents as string) || '0',
  professorName: data.professorName as string | undefined,
  status: (data.status as 'active' | 'inactive' | 'draft') || 'active',
  protocol: data.protocol as string | undefined,
  origin: data.origin as 'Externo' | 'Interno' | undefined,
});

function buildTitle(data: Record<string, unknown>): string {
  const theme = data.lessonTheme as string | undefined;
  const location = data.locationName as string | undefined;
  const responsible = data.courseResponsibleName as string | undefined;
  if (theme && location) return `${theme}_${location}`;
  if (theme) return theme;
  if (location) return location;
  if (responsible) return responsible;
  return 'Aula';
}

export const getLessonsForMonth = async (year: number, month: number): Promise<LessonCalendarItem[]> => {
  const snap = await getDocs(query(collection(db, 'lessons'), orderBy('createdAt', 'desc')));
  const start = startOfMonth(new Date(year, month - 1, 1));
  const end = endOfMonth(new Date(year, month - 1, 1));

  return snap.docs
    .map((d) => fromFirestore(d.id, d.data() as Record<string, unknown>))
    .filter((lesson) => {
      if (!lesson.lessonDate) return false;
      try {
        const date = parseISO(lesson.lessonDate);
        return isWithinInterval(date, { start, end });
      } catch {
        return false;
      }
    });
};

export const getAllLessons = async (): Promise<LessonCalendarItem[]> => {
  const snap = await getDocs(query(collection(db, 'lessons'), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => fromFirestore(d.id, d.data() as Record<string, unknown>));
};
