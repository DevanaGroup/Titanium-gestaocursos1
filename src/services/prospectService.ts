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
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/config/firebase';
import { ProspectClient } from '@/types';

const PROSPECTS_COLLECTION = 'prospects';

export const createProspectClient = async (
  data: Omit<ProspectClient, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ProspectClient> => {
  try {
    const prospectData = {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, PROSPECTS_COLLECTION), prospectData);
    
    return {
      id: docRef.id,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  } catch (error) {
    console.error('Erro ao criar prospect:', error);
    throw error;
  }
};

export const getProspectClients = async (): Promise<ProspectClient[]> => {
  try {
    const querySnapshot = await getDocs(
      query(collection(db, PROSPECTS_COLLECTION), orderBy('createdAt', 'desc'))
    );
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      expectedCloseDate: doc.data().expectedCloseDate?.toDate() || new Date()
    })) as ProspectClient[];
  } catch (error) {
    console.error('Erro ao buscar prospects:', error);
    throw error;
  }
};

export const getProspectsByStage = async (stage: ProspectClient['stage']): Promise<ProspectClient[]> => {
  try {
    const querySnapshot = await getDocs(
      query(
        collection(db, PROSPECTS_COLLECTION), 
        where('stage', '==', stage),
        orderBy('createdAt', 'desc')
      )
    );
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      expectedCloseDate: doc.data().expectedCloseDate?.toDate() || new Date()
    })) as ProspectClient[];
  } catch (error) {
    console.error('Erro ao buscar prospects por estágio:', error);
    throw error;
  }
};

export const updateProspectClient = async (
  id: string, 
  data: Partial<ProspectClient>
): Promise<void> => {
  try {
    const docRef = doc(db, PROSPECTS_COLLECTION, id);
    
    const updateData = {
      ...data,
      updatedAt: serverTimestamp()
    };

    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Erro ao atualizar prospect:', error);
    throw error;
  }
};

export const deleteProspectClient = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, PROSPECTS_COLLECTION, id));
  } catch (error) {
    console.error('Erro ao deletar prospect:', error);
    throw error;
  }
};

export const uploadProspectDocument = async (
  file: File, 
  prospectId: string, 
  documentName: string
): Promise<string> => {
  try {
    const fileName = `${prospectId}/${documentName}-${Date.now()}.${file.name.split('.').pop()}`;
    const storageRef = ref(storage, `prospects/${fileName}`);
    
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
  } catch (error) {
    console.error('Erro ao fazer upload do documento:', error);
    throw error;
  }
};

export const moveProspectToStage = async (
  prospectId: string, 
  newStage: ProspectClient['stage']
): Promise<void> => {
  try {
    await updateProspectClient(prospectId, { stage: newStage });
  } catch (error) {
    console.error('Erro ao mover prospect para novo estágio:', error);
    throw error;
  }
};

export const convertProspectToClient = async (
  prospectId: string
): Promise<void> => {
  try {
    // Marcar como ganho
    await updateProspectClient(prospectId, { 
      stage: 'Ganho',
      updatedAt: new Date()
    });
    
    // Em um cenário real, criaria um cliente na coleção principal
    // const prospect = await getDoc(doc(db, PROSPECTS_COLLECTION, prospectId));
    // if (prospect.exists()) {
    //   const prospectData = prospect.data() as ProspectClient;
    //   await createClient(convertProspectToClientData(prospectData));
    // }
  } catch (error) {
    console.error('Erro ao converter prospect em cliente:', error);
    throw error;
  }
};

export const getProspectsStatistics = async (): Promise<{
  total: number;
  byStage: Record<ProspectClient['stage'], number>;
  totalValue: number;
  averageProbability: number;
}> => {
  try {
    const prospects = await getProspectClients();
    
    const byStage = prospects.reduce((acc, prospect) => {
      acc[prospect.stage] = (acc[prospect.stage] || 0) + 1;
      return acc;
    }, {} as Record<ProspectClient['stage'], number>);
    
    const totalValue = prospects.reduce((sum, prospect) => sum + prospect.estimatedValue, 0);
    const averageProbability = prospects.length > 0 
      ? prospects.reduce((sum, prospect) => sum + prospect.probability, 0) / prospects.length 
      : 0;
    
    return {
      total: prospects.length,
      byStage,
      totalValue,
      averageProbability
    };
  } catch (error) {
    console.error('Erro ao calcular estatísticas de prospects:', error);
    throw error;
  }
}; 