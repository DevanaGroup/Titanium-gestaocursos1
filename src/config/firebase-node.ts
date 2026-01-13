import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
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

// Initialize Firebase (without analytics for Node.js)
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

export default app; 