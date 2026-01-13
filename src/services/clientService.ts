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
  orderBy
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Client } from '@/types';
import { createDefaultFoldersForClient } from './folderService';

const CLIENTS_COLLECTION = 'clients';

// Convert Firestore timestamps to JavaScript Date objects
const convertTimestamp = (client: any): Client => {
  return {
    ...client,
    createdAt: client.createdAt instanceof Timestamp 
      ? client.createdAt.toDate() 
      : new Date(client.createdAt),
    updatedAt: client.updatedAt instanceof Timestamp 
      ? client.updatedAt.toDate() 
      : new Date(client.updatedAt)
  };
};

export const getClients = async (): Promise<Client[]> => {
  try {
    console.log("🔍 Buscando clientes no Firebase...");
    
    // Primeiro, tentar buscar todos os clientes sem ordenação
    const querySnapshot = await getDocs(collection(db, CLIENTS_COLLECTION));
    
    console.log("📊 Query executada, documentos encontrados:", querySnapshot.size);
    
    if (querySnapshot.empty) {
      console.log("❌ Nenhum documento encontrado na coleção 'clients'");
      return [];
    }

    const clients = querySnapshot.docs.map(doc => {
      const data = doc.data();
      console.log("📄 Documento encontrado:", doc.id, data);
      
      // Criar cliente com campos padrão para compatibilidade
      const client = {
        id: doc.id,
        name: data.name || "",
        project: data.project || "",
        status: data.status || "Em andamento",
        contactName: data.contactName || "",
        email: data.email || "",
        phone: data.phone || "",
        address: data.address || "",
        cpf: data.cpf || "",
        cnpj: data.cnpj || "",
        assignedTo: data.assignedTo || "",
        assignedToName: data.assignedToName || "",
        collaboratorId: data.collaboratorId || "",
        documents: data.documents || [],
        createdAt: data.createdAt instanceof Timestamp 
          ? data.createdAt.toDate() 
          : (data.createdAt ? new Date(data.createdAt) : new Date()),
        updatedAt: data.updatedAt instanceof Timestamp 
          ? data.updatedAt.toDate() 
          : (data.updatedAt ? new Date(data.updatedAt) : new Date())
      };
      
      console.log("✅ Cliente processado:", client);
      return client as Client;
    });
    
    // Ordenar por data de atualização mais recente (mais seguro)
    clients.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    
    console.log("📈 Total de clientes processados:", clients.length);
    return clients;
  } catch (error) {
    console.error('❌ Erro ao buscar clientes:', error);
    
    // Tentar busca básica sem query complexa
    try {
      console.log("🔄 Tentando busca básica...");
      const basicQuery = await getDocs(collection(db, CLIENTS_COLLECTION));
      
      const basicClients = basicQuery.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || "",
          project: data.project || "",
          status: data.status || "Em andamento",
          contactName: data.contactName || "",
          email: data.email || "",
          phone: data.phone || "",
          address: data.address || "",
          cpf: data.cpf || "",
          cnpj: data.cnpj || "",
          assignedTo: data.assignedTo || "",
          assignedToName: data.assignedToName || "",
          collaboratorId: data.collaboratorId || "",
          documents: data.documents || [],
          createdAt: new Date(),
          updatedAt: new Date()
        } as Client;
      });
      
      console.log("✅ Busca básica bem-sucedida:", basicClients.length, "clientes");
      return basicClients;
    } catch (basicError) {
      console.error('❌ Erro na busca básica:', basicError);
      throw error;
    }
  }
};

export const getClientById = async (id: string): Promise<Client | null> => {
  try {
    const docRef = doc(db, CLIENTS_COLLECTION, id);
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
    console.error('Error getting client by ID:', error);
    throw error;
  }
};

export const createClient = async (data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<Client> => {
  try {
    // Prepare data for Firestore
    const clientData = {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    // Save to Firestore
    const docRef = await addDoc(collection(db, CLIENTS_COLLECTION), clientData);
    
    // Criar as pastas padrão para o cliente
    await createDefaultFoldersForClient(docRef.id);
    
    // Return the full client data with ID
    return {
      ...data,
      id: docRef.id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  } catch (error) {
    console.error('Error creating client:', error);
    throw error;
  }
};

export const updateClient = async (id: string, data: Partial<Client>): Promise<boolean> => {
  try {
    const docRef = doc(db, CLIENTS_COLLECTION, id);
    
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error updating client:', error);
    throw error;
  }
};

export const deleteClient = async (id: string): Promise<boolean> => {
  try {
    const docRef = doc(db, CLIENTS_COLLECTION, id);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error('Error deleting client:', error);
    throw error;
  }
};

export const searchClients = async (term: string): Promise<Client[]> => {
  try {
    // Since Firestore doesn't support native text search,
    // we'll get all clients and filter in memory
    const clients = await getClients();
    
    if (!term) return clients;
    
    const lowerTerm = term.toLowerCase();
    
    return clients.filter(client => 
      client.name.toLowerCase().includes(lowerTerm) ||
      client.project.toLowerCase().includes(lowerTerm) ||
      (client.contactName && client.contactName.toLowerCase().includes(lowerTerm)) ||
      (client.email && client.email.toLowerCase().includes(lowerTerm))
    );
  } catch (error) {
    console.error('Error searching clients:', error);
    throw error;
  }
};
