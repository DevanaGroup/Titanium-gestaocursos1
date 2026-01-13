import type { IncomingMessage, ServerResponse } from 'http';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK once
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export default async function handler(req: IncomingMessage & { method?: string }, res: ServerResponse & { status?: (code: number) => any; setHeader?: any; end?: any }) {
  const method = (req.method || 'GET').toUpperCase();

  // Enable CORS for local tests if needed
  if (res.setHeader) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  if (method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end?.();
  }

  if (method !== 'POST') {
    res.statusCode = 405;
    res.setHeader?.('Content-Type', 'application/json');
    return res.end?.(JSON.stringify({ error: 'Método não permitido' }));
  }

  try {
    const auth = getAuth();
    const db = getFirestore();

    // 1) Delete all users from Authentication
    const users = await auth.listUsers();
    const deletePromises = users.users.map((user) => auth.deleteUser(user.uid));
    await Promise.all(deletePromises);

    // 2) Delete all documents from 'users'
    const usersSnapshot = await db.collection('users').get();
    const userDeletePromises = usersSnapshot.docs.map((doc) => doc.ref.delete());
    await Promise.all(userDeletePromises);

    // 3) Delete all documents from 'collaborators'
    const collaboratorsSnapshot = await db.collection('collaborators').get();
    const collaboratorDeletePromises = collaboratorsSnapshot.docs.map((doc) => doc.ref.delete());
    await Promise.all(collaboratorDeletePromises);

    // 4) Delete all documents from 'tasks'
    const tasksSnapshot = await db.collection('tasks').get();
    const taskDeletePromises = tasksSnapshot.docs.map((doc) => doc.ref.delete());
    await Promise.all(taskDeletePromises);

    // 5) Delete all documents from 'auditLogs'
    const auditLogsSnapshot = await db.collection('auditLogs').get();
    const auditLogDeletePromises = auditLogsSnapshot.docs.map((doc) => doc.ref.delete());
    await Promise.all(auditLogDeletePromises);

    res.statusCode = 200;
    res.setHeader?.('Content-Type', 'application/json');
    return res.end?.(JSON.stringify({ message: 'Todos os dados foram deletados com sucesso' }));
  } catch (error) {
    console.error('Erro ao limpar dados:', error);
    res.statusCode = 500;
    res.setHeader?.('Content-Type', 'application/json');
    return res.end?.(JSON.stringify({ error: 'Erro ao limpar dados' }));
  }
}