import admin from 'firebase-admin';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Inicializa o Firebase Admin se ainda não estiver inicializado
if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);
  
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const auth = getAuth();
const db = getFirestore();

const createAdminUser = async () => {
  try {
    const userData = {
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@cerrado.com',
      password: 'admin123',
      birthDate: '1990-01-01'
    };

    // 1. Criar usuário no Authentication
    const userRecord = await auth.createUser({
      email: userData.email,
      password: userData.password,
      displayName: `${userData.firstName} ${userData.lastName}`
    });

    console.log('Usuário criado no Authentication:', userRecord.uid);

    // 2. Criar documento na coleção 'users'
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      displayName: `${userData.firstName} ${userData.lastName}`,
      hierarchyLevel: 'Gerente',
      photoURL: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('Documento criado na coleção users');

    // 3. Criar documento na coleção 'collaborators'
    await db.collection('collaborators').doc(userRecord.uid).set({
      uid: userRecord.uid,
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      birthDate: new Date(userData.birthDate),
      hierarchyLevel: 'Gerente',
      phone: '',
      address: '',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('Documento criado na coleção collaborators');
    console.log('Usuário Gerente criado com sucesso!');
    console.log('Você pode fazer login com:');
    console.log('Email:', userData.email);
    console.log('Senha:', userData.password);

  } catch (error) {
    console.error('Erro ao criar usuário admin:', error);
  } finally {
    process.exit(0);
  }
};

createAdminUser(); 