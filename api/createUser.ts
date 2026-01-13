import type { IncomingMessage, ServerResponse } from 'http';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const auth = getAuth();
const db = getFirestore();

export default async function handler(req: IncomingMessage & { method?: string; body?: any }, res: ServerResponse & { setHeader?: any; end?: any; statusCode?: number }) {
  const method = (req.method || 'GET').toUpperCase();

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
    return res.end?.(JSON.stringify({ error: 'Method not allowed' }));
  }

  try {
    let body = '';
    await new Promise<void>((resolve) => {
      (req as IncomingMessage).on('data', (chunk) => { body += chunk; });
      (req as IncomingMessage).on('end', () => resolve());
    });
    const { firstName, lastName, email, password, birthDate } = JSON.parse(body || '{}');

    const userRecord = await auth.createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`
    });

    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      firstName,
      lastName,
      displayName: `${firstName} ${lastName}`,
      hierarchyLevel: 'Gerente',
      photoURL: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await db.collection('collaborators').doc(userRecord.uid).set({
      uid: userRecord.uid,
      firstName,
      lastName,
      email,
      birthDate: new Date(birthDate),
      hierarchyLevel: 'Gerente',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    res.statusCode = 200;
    res.setHeader?.('Content-Type', 'application/json');
    return res.end?.(JSON.stringify({ success: true, message: 'Usuário Gerente criado com sucesso', uid: userRecord.uid }));
  } catch (error: any) {
    console.error('Erro ao criar usuário:', error);
    res.statusCode = 500;
    res.setHeader?.('Content-Type', 'application/json');
    return res.end?.(JSON.stringify({ success: false, error: error?.message || 'Erro interno do servidor' }));
  }
}