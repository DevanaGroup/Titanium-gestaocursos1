import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyC1u5HlcK5jS8OFqJUYAaPq4SCZ7iEfLWE",
  authDomain: "titanium-cursos.firebaseapp.com",
  projectId: "titanium-cursos",
  storageBucket: "titanium-cursos.firebasestorage.app",
  messagingSenderId: "551484538701",
  appId: "1:551484538701:web:cca9c668c3281a50af4104",
  measurementId: "G-P7JQ1EFSFY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics only in browser environment and only in production
let analytics: any = null;
if (typeof window !== 'undefined' && import.meta.env.PROD) {
  isSupported()
    .then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    })
    .catch(() => {
      // Analytics not supported or failed to initialize
      console.log('Firebase Analytics não suportado neste ambiente');
    });
} else {
  // Avoid GA calls on local/dev to prevent aborted network requests
  console.log('Firebase Analytics desabilitado no ambiente de desenvolvimento');
}

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Configurar persistência da autenticação para garantir que a sessão persista entre recarregamentos
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error('Erro ao configurar persistência da autenticação:', error);
  });
}

// URL base para Cloud Functions
export const FUNCTIONS_BASE_URL = `https://us-central1-${firebaseConfig.projectId}.cloudfunctions.net`;

export default app;
