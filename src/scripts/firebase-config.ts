import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDKdQJiWfhpeMJnBJwJmqZXZ2lCmUOsz2A",
  authDomain: "cerrado-web-genesis.firebaseapp.com",
  projectId: "cerrado-web-genesis",
  storageBucket: "cerrado-web-genesis.appspot.com",
  messagingSenderId: "169467094015",
  appId: "1:169467094015:web:6e1bf8c5a74f06b0b6af7e",
  measurementId: "G-XDE0QDKGN5"
};

// Inicializar Firebase sem Analytics para scripts Node.js
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app); 