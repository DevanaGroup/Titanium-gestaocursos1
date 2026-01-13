import type { IncomingMessage, ServerResponse } from 'http';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export default async function handler(req: IncomingMessage & { method?: string; url?: string }, res: ServerResponse & { setHeader?: any; end?: any; statusCode?: number }) {
  const method = (req.method || 'GET').toUpperCase();

  if (res.setHeader) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  if (method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end?.();
  }

  if (method !== 'DELETE') {
    res.statusCode = 405;
    res.setHeader?.('Content-Type', 'application/json');
    return res.end?.(JSON.stringify({ error: 'Método não permitido' }));
  }

  // parse uid from query string
  const url = new URL(req.url || '/', 'http://localhost');
  const uid = url.searchParams.get('uid');

  if (!uid) {
    res.statusCode = 400;
    res.setHeader?.('Content-Type', 'application/json');
    return res.end?.(JSON.stringify({ error: 'UID do usuário é obrigatório' }));
  }

  try {
    const auth = getAuth();
    const db = getFirestore();

    await auth.deleteUser(uid);

    await db.collection('users').doc(uid).delete();

    const collaboratorsSnapshot = await db.collection('collaborators')
      .where('uid', '==', uid)
      .get();
    const deletePromises = collaboratorsSnapshot.docs.map((doc) => doc.ref.delete());
    await Promise.all(deletePromises);

    const tasksSnapshot = await db.collection('tasks')
      .where('assignedTo', '==', uid)
      .get();
    const taskDeletePromises = tasksSnapshot.docs.map((doc) => doc.ref.delete());
    await Promise.all(taskDeletePromises);

    res.statusCode = 200;
    res.setHeader?.('Content-Type', 'application/json');
    return res.end?.(JSON.stringify({ message: 'Usuário deletado com sucesso' }));
  } catch (error: any) {
    console.error('Erro detalhado ao deletar usuário:', error);
    res.statusCode = 500;
    res.setHeader?.('Content-Type', 'application/json');
    return res.end?.(JSON.stringify({ error: 'Erro ao deletar usuário', details: error?.message || 'Erro desconhecido' }));
  }
}