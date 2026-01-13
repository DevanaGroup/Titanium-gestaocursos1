import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

// Configuração do Firebase (usando as credenciais do projeto)
const firebaseConfig = {
  apiKey: "AIzaSyC1u5HlcK5jS8OFqJUYAaPq4SCZ7iEfLWE",
  authDomain: "titanium-cursos.firebaseapp.com",
  projectId: "titanium-cursos",
  storageBucket: "titanium-cursos.firebasestorage.app",
  messagingSenderId: "551484538701",
  appId: "1:551484538701:web:cca9c668c3281a50af4104",
  measurementId: "G-P7JQ1EFSFY"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const createNivel1User = async () => {
  try {
    const userData = {
      firstName: 'Admin',
      lastName: 'Devana',
      email: 'contato@devana.com.br',
      password: 'devdev',
      birthDate: '1990-01-01'
    };

    console.log('🚀 Iniciando criação do usuário Nível 1...');
    console.log('📧 Email:', userData.email);

    let user;
    
    // 1. Tentar criar ou fazer login no Firebase Auth
    console.log('⏳ Verificando/criando usuário no Firebase Authentication...');
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        userData.email,
        userData.password
      );
      user = userCredential.user;
      console.log('✅ Usuário criado no Authentication!');
    } catch (authError: any) {
      if (authError.code === 'auth/email-already-in-use') {
        console.log('⚠️ Usuário já existe no Auth, fazendo login...');
        const userCredential = await signInWithEmailAndPassword(
          auth,
          userData.email,
          userData.password
        );
        user = userCredential.user;
        console.log('✅ Login realizado com sucesso!');
      } else {
        throw authError;
      }
    }
    
    console.log('   UID:', user.uid);

    // 2. Verificar se o documento já existe
    console.log('⏳ Verificando se documento já existe...');
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const existingData = userDoc.data();
      console.log('⚠️ Documento já existe no Firestore!');
      console.log('   Nível atual:', existingData.hierarchyLevel);
      
      // Atualizar para Nível 1 se não for
      if (existingData.hierarchyLevel !== 'Nível 1') {
        console.log('⏳ Atualizando nível hierárquico para Nível 1...');
        await setDoc(userDocRef, {
          hierarchyLevel: 'Nível 1',
          updatedAt: serverTimestamp()
        }, { merge: true });
        console.log('✅ Nível atualizado para Nível 1!');
      } else {
        console.log('✅ Usuário já está com Nível 1!');
      }
    } else {
      // 3. Criar documento na coleção users
      console.log('⏳ Criando documento na coleção users...');
      await setDoc(userDocRef, {
        uid: user.uid,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        displayName: userData.firstName,
        hierarchyLevel: 'Nível 1',
        photoURL: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log('✅ Documento criado na coleção users!');
    }
    console.log('');
    console.log('🎉 USUÁRIO NÍVEL 1 CRIADO COM SUCESSO!');
    console.log('');
    console.log('📋 Credenciais de acesso:');
    console.log('   Email:', userData.email);
    console.log('   Senha:', userData.password);
    console.log('   Nível: Nível 1 (Máximo de permissões)');
    console.log('   UID:', user.uid);
    console.log('');
    console.log('✅ Você já pode fazer login com essas credenciais!');
    
    return { success: true, uid: user.uid };
  } catch (error: any) {
    console.error('❌ Erro ao criar usuário:', error);
    
    if (error.code === 'auth/email-already-in-use') {
      console.error('⚠️ Este email já está em uso!');
      console.error('   O usuário provavelmente já existe no sistema.');
    } else if (error.code === 'auth/weak-password') {
      console.error('⚠️ Senha muito fraca!');
    } else if (error.code === 'auth/invalid-email') {
      console.error('⚠️ Email inválido!');
    } else {
      console.error('⚠️ Código do erro:', error.code);
      console.error('⚠️ Mensagem:', error.message);
    }
    
    throw error;
  }
};

// Executar
createNivel1User()
  .then(() => {
    console.log('');
    console.log('✅ Script executado com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('');
    console.error('❌ Falha ao executar script');
    process.exit(1);
  });
