import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  Timestamp,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '@/config/firebase';
import { Collaborator, HierarchyLevel } from '@/types';

const COLLABORATORS_COLLECTION = 'collaborators';
const MAIL_COLLECTION = 'mail';

// Helper function to generate a random password
const generateRandomPassword = (length: number = 8): string => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  
  return password;
};

// Convert Firestore timestamps to JavaScript Date objects
const convertTimestamp = (collaborator: any): Collaborator => {
  return {
    ...collaborator,
    birthDate: collaborator.birthDate instanceof Timestamp 
      ? collaborator.birthDate.toDate() 
      : new Date(collaborator.birthDate),
    createdAt: collaborator.createdAt instanceof Timestamp 
      ? collaborator.createdAt.toDate() 
      : new Date(collaborator.createdAt),
    updatedAt: collaborator.updatedAt instanceof Timestamp 
      ? collaborator.updatedAt.toDate() 
      : new Date(collaborator.updatedAt)
  };
};

export const getCollaborators = async (): Promise<Collaborator[]> => {
  try {
    console.log("🔍 collaboratorService - Iniciando busca de usuários...");
    
    // Buscar na coleção users (principal)
    const usersSnapshot = await getDocs(collection(db, 'users'));
    
    if (usersSnapshot.size > 0) {
      console.log("✅ collaboratorService - Usando coleção users:", usersSnapshot.size, "usuários");
      
      const collaboratorsList = usersSnapshot.docs.map(doc => {
        const data = doc.data();
        return convertTimestamp({
          id: doc.id,
          uid: data.uid || doc.id,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          birthDate: data.birthDate || new Date(),
          hierarchyLevel: data.hierarchyLevel || 'Nível 5',
          phone: data.phone || '',
          whatsapp: data.whatsapp || '',
          avatar: data.avatar || data.photoURL,
          customPermissions: data.customPermissions,
          createdAt: data.createdAt || new Date(),
          updatedAt: data.updatedAt || new Date()
        });
      });

      console.log("📋 collaboratorService - Usuários carregados:", collaboratorsList.length);
      return collaboratorsList;
    }
    
    console.log("⚠️ collaboratorService - Nenhum usuário encontrado na coleção users");
    return [];
    
  } catch (error) {
    console.error('❌ collaboratorService - Error getting users:', error);
    throw error;
  }
};

export const getCollaboratorById = async (id: string): Promise<Collaborator | null> => {
  try {
    // Buscar na coleção users primeiro
    const userDoc = await getDoc(doc(db, 'users', id));
    
    if (userDoc.exists()) {
      const data = userDoc.data();
      return convertTimestamp({
        id: userDoc.id,
        uid: data.uid || userDoc.id,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        email: data.email || '',
        birthDate: data.birthDate || new Date(),
        hierarchyLevel: data.hierarchyLevel || 'Nível 5',
        phone: data.phone || '',
        whatsapp: data.whatsapp || '',
        avatar: data.avatar || data.photoURL,
        customPermissions: data.customPermissions,
        createdAt: data.createdAt || new Date(),
        updatedAt: data.updatedAt || new Date()
      });
    }
    
    return null;
  } catch (error) {
    console.error('Error getting collaborator by ID:', error);
    throw error;
  }
};

// Função legada mantida para compatibilidade
export const getCollaboratorByIdLegacy = async (id: string): Promise<Collaborator | null> => {
  try {
    const docRef = doc(db, COLLABORATORS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return convertTimestamp({
        id: docSnap.id,
        ...data
      });
    }
    
    return null;
  } catch (error) {
    console.error('Error getting collaborator by ID:', error);
    throw error;
  }
};

export const createCollaborator = async (data: Omit<Collaborator, 'id' | 'createdAt' | 'updatedAt'>): Promise<Collaborator> => {
  try {
    // Generate a random password
    const password = generateRandomPassword();
    
    // Create a new user in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, data.email, password);
    const uid = userCredential.user.uid;
    
    // Prepare data for Firestore
    const collaboratorData = {
      uid: uid,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      displayName: data.firstName,
      hierarchyLevel: data.hierarchyLevel,
      photoURL: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    // Save to Firestore users collection with the same ID as the authentication user
    await setDoc(doc(db, 'users', uid), collaboratorData);
    
    // Send welcome email
    const welcomeEmail = {
      to: data.email,
      message: {
        subject: "Bem-vindo ao Sistema Cerrado Engenharia",
        text: `Olá ${data.firstName} ${data.lastName},\n\nSeja bem-vindo ao Sistema Cerrado Engenharia. Seus dados de acesso são:\n\nE-mail: ${data.email}\nSenha: ${password}\n\nRecomendamos que você altere sua senha após o primeiro acesso.\n\nAtenciosamente,\nEquipe Cerrado Engenharia`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2E7D32;">Bem-vindo ao Sistema Cerrado Engenharia</h2>
            <p>Olá <strong>${data.firstName} ${data.lastName}</strong>,</p>
            <p>Seja bem-vindo ao Sistema Cerrado Engenharia. Seus dados de acesso são:</p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>E-mail:</strong> ${data.email}</p>
              <p><strong>Senha:</strong> ${password}</p>
            </div>
            <p>Recomendamos que você altere sua senha após o primeiro acesso.</p>
            <p>Atenciosamente,<br>Equipe Cerrado Engenharia</p>
          </div>
        `
      }
    };
    
    // Add to the mail collection for the email trigger
    await addDoc(collection(db, MAIL_COLLECTION), welcomeEmail);
    
    // Return the full collaborator data with ID
    return {
      ...data,
      id: uid,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  } catch (error) {
    console.error('Error creating collaborator:', error);
    throw error;
  }
};

export const updateCollaborator = async (id: string, data: Partial<Collaborator>): Promise<boolean> => {
  try {
    const docRef = doc(db, COLLABORATORS_COLLECTION, id);
    
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error updating collaborator:', error);
    throw error;
  }
};

export const deleteCollaborator = async (id: string): Promise<boolean> => {
  try {
    const docRef = doc(db, COLLABORATORS_COLLECTION, id);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error('Error deleting collaborator:', error);
    throw error;
  }
};

export const getCollaboratorsByResponsible = async (responsibleName: string): Promise<Collaborator[]> => {
  try {
    const q = query(
      collection(db, COLLABORATORS_COLLECTION),
      where("responsibleName", "==", responsibleName)
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return convertTimestamp({
        id: doc.id,
        ...data
      });
    });
  } catch (error) {
    console.error('Error getting collaborators by responsible:', error);
    throw error;
  }
};
