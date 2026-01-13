import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  updateProfile as firebaseUpdateProfile, 
  User as FirebaseUser 
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { User } from '@/types';

// Função auxiliar para gerar username a partir do nome (ex: "Ana Costa" -> "ACOSTA")
const generateUsername = (firstName: string, lastName: string): string => {
  const firstInitial = firstName?.charAt(0)?.toUpperCase() || '';
  const lastUpper = lastName?.toUpperCase().replace(/\s+/g, '') || '';
  return `${firstInitial}${lastUpper}`;
};

// Função para buscar email por username
const findEmailByUsername = async (username: string): Promise<string | null> => {
  try {
    // Buscar na coleção users
    const usersRef = collection(db, 'users');
    
    // Primeiro, tentar buscar por campo username se existir
    const usernameQuery = query(usersRef, where('username', '==', username.toUpperCase()));
    const usernameSnapshot = await getDocs(usernameQuery);
    
    if (!usernameSnapshot.empty) {
      const userData = usernameSnapshot.docs[0].data();
      return userData.email || null;
    }
    
    // Se não encontrou por campo username, tentar gerar username a partir do nome
    const allDocs = await getDocs(usersRef);
    for (const docSnap of allDocs.docs) {
      const userData = docSnap.data();
      const generatedUsername = generateUsername(userData.firstName || '', userData.lastName || '');
      if (generatedUsername === username.toUpperCase()) {
        return userData.email || null;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error finding email by username:', error);
    return null;
  }
};

export const signIn = async (usernameOrEmail: string, password: string) => {
  try {
    let email = usernameOrEmail;
    
    // Se não contém "@", tratar como username e buscar o email correspondente
    if (!usernameOrEmail.includes('@')) {
      const foundEmail = await findEmailByUsername(usernameOrEmail);
      if (!foundEmail) {
        throw new Error('Username ou email não encontrado');
      }
      email = foundEmail;
    }
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Get additional user data from Firestore - buscar na coleção users
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return {
        uid: user.uid,
        email: user.email || '',
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        displayName: `${userData.firstName} ${userData.lastName}`,
        photoURL: user.photoURL || userData.photoURL || undefined,
        hierarchyLevel: userData.hierarchyLevel || "Nível 5",
        phoneNumber: userData.phoneNumber,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt
      } as User;
    }
    
    // Se não encontrou na coleção users, retornar null
    return null;
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
};

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
    return true;
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

export const getCurrentUser = (): Promise<User | null> => {
  return new Promise((resolve, reject) => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      unsubscribe();
      
      if (user) {
        try {
          // Buscar na coleção users
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            resolve({
              uid: user.uid,
              email: user.email || '',
              firstName: userData.firstName || '',
              lastName: userData.lastName || '',
              displayName: `${userData.firstName} ${userData.lastName}`,
              photoURL: user.photoURL || userData.photoURL || undefined,
              hierarchyLevel: userData.hierarchyLevel || "Nível 5",
              phoneNumber: userData.phoneNumber,
              createdAt: userData.createdAt,
              updatedAt: userData.updatedAt
            } as User);
            return;
          }
          
          // Se não encontrou na coleção users, retornar null
          resolve(null);
        } catch (error) {
          reject(error);
        }
      } else {
        resolve(null);
      }
    }, reject);
  });
};

export const updateProfile = async (userId: string, data: Partial<User>) => {
  try {
    const currentUser = auth.currentUser;
    
    if (currentUser) {
      const updates: Partial<User> = {
        ...data,
        updatedAt: new Date()
      };

      // Se firstName ou lastName foram atualizados, atualizar o displayName
      if (data.firstName || data.lastName) {
        const userDoc = await getDoc(doc(db, 'users', userId));
        const userData = userDoc.exists() ? userDoc.data() : null;
        const firstName = data.firstName || userData?.firstName || '';
        const lastName = data.lastName || userData?.lastName || '';
        
        if (firstName && lastName) {
          updates.displayName = `${firstName} ${lastName}`;
          await firebaseUpdateProfile(currentUser, {
            displayName: updates.displayName
          });
        }
      }

      // Se photoURL foi atualizado
      if (data.photoURL) {
        await firebaseUpdateProfile(currentUser, {
          photoURL: data.photoURL
        });
      }
      
      // Update the Firestore document
      await updateDoc(doc(db, 'users', userId), updates);
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
};
