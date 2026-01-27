import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';

const COLLECTION_NAME = 'eventos';

export interface Evento {
  id: string;
  title: string;
  date: Date;
  time?: string;
  description: string;
  material?: string;
  location?: string;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
}

export type EventoInput = Omit<Evento, 'id' | 'createdAt' | 'updatedAt'>;

const timestampToDate = (t: unknown): Date => {
  if (t && typeof (t as any).toDate === 'function') return (t as any).toDate();
  if (t instanceof Date) return t;
  if (typeof t === 'string' || typeof t === 'number') return new Date(t);
  return new Date();
};

const toFirestore = (e: Partial<Evento>) => {
  const data: Record<string, unknown> = { ...e };
  if (data.date) data.date = Timestamp.fromDate(data.date as Date);
  if (data.createdAt) data.createdAt = Timestamp.fromDate(data.createdAt as Date);
  if (data.updatedAt) data.updatedAt = Timestamp.fromDate(data.updatedAt as Date);
  delete data.id;
  return data;
};

const fromFirestore = (id: string, data: Record<string, unknown>): Evento => ({
  id,
  title: (data.title as string) || '',
  date: timestampToDate(data.date),
  time: data.time as string | undefined,
  description: (data.description as string) || '',
  material: data.material as string | undefined,
  location: data.location as string | undefined,
  createdBy: (data.createdBy as string) || '',
  createdByName: (data.createdByName as string) || '',
  createdAt: timestampToDate(data.createdAt),
  updatedAt: timestampToDate(data.updatedAt),
});

export const getEventos = async (): Promise<Evento[]> => {
  const snap = await getDocs(collection(db, COLLECTION_NAME));
  const list = snap.docs.map((d) => fromFirestore(d.id, d.data() as Record<string, unknown>));
  list.sort((a, b) => b.date.getTime() - a.date.getTime());
  return list;
};

export const createEvento = async (input: EventoInput): Promise<string> => {
  const now = new Date();
  const docRef = await addDoc(collection(db, COLLECTION_NAME), toFirestore({
    ...input,
    createdAt: now,
    updatedAt: now,
  }));
  return docRef.id;
};

export const updateEvento = async (id: string, updates: Partial<EventoInput>): Promise<void> => {
  const ref = doc(db, COLLECTION_NAME, id);
  await updateDoc(ref, toFirestore({ ...updates, updatedAt: new Date() }));
};

export const deleteEvento = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, COLLECTION_NAME, id));
}
