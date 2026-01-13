import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../config/firebase';
import { Collaborator, HierarchyLevel } from '@/types';

// Usar apenas uma coleção unificada
const COLLABORATORS_COLLECTION = 'collaborators';
const MAIL_COLLECTION = 'mail';

// Gerar senha aleatória
const generateRandomPassword = (length: number = 8): string => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  
  return password;
};

// Converter Firestore timestamps
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

// ✅ FUNÇÃO SIMPLIFICADA - BUSCAR APENAS EM UMA COLEÇÃO
export const getCollaboratorsUnified = async (): Promise<Collaborator[]> => {
  try {
    console.log("🔍 Buscando colaboradores da coleção unificada...");
    
    // Buscar apenas na coleção 'collaborators' (unificada)
    const collaboratorsSnapshot = await getDocs(
      query(collection(db, COLLABORATORS_COLLECTION), orderBy('firstName'))
    );
    
    const collaboratorsList = collaboratorsSnapshot.docs.map(doc => {
      const data = doc.data();
      return convertTimestamp({
        id: doc.id,
        uid: data.uid || doc.id,
        ...data
      });
    });

    console.log(`✅ ${collaboratorsList.length} colaboradores carregados da coleção unificada`);
    return collaboratorsList;
    
  } catch (error) {
    console.error('❌ Erro ao buscar colaboradores:', error);
    return [];
  }
};

export const getCollaboratorById = async (id: string): Promise<Collaborator | null> => {
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

export const createCollaboratorUnified = async (data: Omit<Collaborator, 'id' | 'createdAt' | 'updatedAt'>): Promise<Collaborator> => {
  try {
    // Gerar senha aleatória
    const password = generateRandomPassword();
    
    // Criar usuário no Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, data.email, password);
    const uid = userCredential.user.uid;
    
         // Preparar dados completos para a coleção unificada
    const collaboratorData = {
      uid: uid,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      hierarchyLevel: data.hierarchyLevel,
      birthDate: data.birthDate || new Date(),
      phone: data.phone || '',
      address: data.address || '',
      responsibleName: data.responsibleName || '',
      customPermissions: data.customPermissions || undefined,
      avatar: data.avatar || null,
      
      // Metadados
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    // Salvar APENAS na coleção unificada
    await setDoc(doc(db, COLLABORATORS_COLLECTION, uid), collaboratorData);
    
    // Enviar email de boas-vindas
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
    
    await addDoc(collection(db, MAIL_COLLECTION), welcomeEmail);
    
    return {
      ...data,
      id: uid,
      uid: uid,
      phone: data.phone || '',
      address: data.address || '',
      responsibleName: data.responsibleName || '',
      avatar: data.avatar || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  } catch (error) {
    console.error('Error creating collaborator:', error);
    throw error;
  }
};

export const updateCollaboratorUnified = async (id: string, data: Partial<Collaborator>): Promise<boolean> => {
  try {
    const docRef = doc(db, COLLABORATORS_COLLECTION, id);
    
    // Atualizar displayName se firstName ou lastName mudaram
    const updateData = {
      ...data,
      updatedAt: serverTimestamp()
    };
    
    // Atualização simples sem displayName
    
    await updateDoc(docRef, updateData);
    return true;
  } catch (error) {
    console.error('Error updating collaborator:', error);
    throw error;
  }
};

export const deleteCollaboratorUnified = async (id: string): Promise<boolean> => {
  try {
    const docRef = doc(db, COLLABORATORS_COLLECTION, id);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error('Error deleting collaborator:', error);
    throw error;
  }
};

export const getCollaboratorsByResponsibleUnified = async (responsibleName: string): Promise<Collaborator[]> => {
  try {
    const q = query(
      collection(db, COLLABORATORS_COLLECTION),
      where("responsibleName", "==", responsibleName),
      orderBy('firstName')
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