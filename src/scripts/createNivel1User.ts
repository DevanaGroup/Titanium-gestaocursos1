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

const createNivel1User = async () => {
  try {
    const userData = {
      firstName: 'Admin',
      lastName: 'Devana',
      email: 'contato@devana.com.br',
      password: 'devdev',
      birthDate: '1990-01-01'
    };

    console.log('🚀 Criando usuário Nível 1...');

    // 1. Criar usuário no Authentication
    const userRecord = await auth.createUser({
      email: userData.email,
      password: userData.password,
      displayName: `${userData.firstName} ${userData.lastName}`
    });

    console.log('✅ Usuário criado no Authentication:', userRecord.uid);

    // 2. Criar documento na coleção unificada
    await db.collection('collaborators_unified').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      displayName: userData.firstName,
      hierarchyLevel: 'Nível 1',
      birthDate: new Date(userData.birthDate),
      phone: '',
      whatsapp: '',
      photoURL: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('✅ Documento criado na coleção collaborators_unified');
    console.log('✅ Usuário Nível 1 criado com sucesso!');
    console.log('');
    console.log('📧 Credenciais de acesso:');
    console.log('   Email:', userData.email);
    console.log('   Senha:', userData.password);
    console.log('   Nível: Nível 1');
    console.log('   UID:', userRecord.uid);

  } catch (error: any) {
    console.error('❌ Erro ao criar usuário:', error);
    if (error.code === 'auth/email-already-exists') {
      console.error('⚠️ Este email já está em uso!');
    }
    throw error;
  } finally {
    process.exit(0);
  }
};

createNivel1User();
