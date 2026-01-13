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
  orderBy,
  writeBatch,
  setDoc
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { storage } from '@/config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { clientFolderStructure } from '../config/folderStructure';
import { HierarchyLevel } from '@/types';

export interface Folder {
  id: string;
  clientId: string;
  nome: string;
  icone: string;
  isPadrao: boolean;
  ordem: number;
  isSubfolder?: boolean;
  parentId?: string;
  path: string;
  allowedFileTypes?: string[];
  description?: string;
  // Campos de permissão para controle de acesso
  isRestricted?: boolean;
  allowedRoles?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface FolderDocument {
  id: string;
  name: string;
  url: string;
  uploadDate: string;
  clientId: string;
  folderId: string;
  folderName: string;
  categoriaId?: string;
  categoriaNome?: string;
  subCategoriaId?: string;
  subCategoriaNome?: string;
  observacao?: string;
  content?: string;
  size?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface FolderStats {
  documentCount: number;
  totalSize: number;
}

// Constantes de coleção
const CLIENTS_COLLECTION = 'clients';
const FOLDERS_COLLECTION = 'folders';
const DOCUMENTS_COLLECTION = 'documents';

// Convert Firestore timestamps to JavaScript Date objects
const convertFolderTimestamp = (folder: any): Folder => {
  return {
    ...folder,
    createdAt: folder.createdAt instanceof Timestamp 
      ? folder.createdAt.toDate() 
      : new Date(folder.createdAt),
    updatedAt: folder.updatedAt instanceof Timestamp 
      ? folder.updatedAt.toDate() 
      : new Date(folder.updatedAt)
  };
};

const convertDocumentTimestamp = (document: any): FolderDocument => {
  return {
    ...document,
    createdAt: document.createdAt instanceof Timestamp 
      ? document.createdAt.toDate() 
      : new Date(document.createdAt),
    updatedAt: document.updatedAt instanceof Timestamp 
      ? document.updatedAt.toDate() 
      : new Date(document.updatedAt)
  };
};

// ==================== FOLDER OPERATIONS ====================

export const createDefaultFoldersForClient = async (clientId: string): Promise<Folder[]> => {
  try {
    console.log('🚀 Criando estrutura padrão com 7 pastas para novo cliente...');
    
    // Usar a função simples que SEMPRE funciona
    await createSimple7Folders(clientId);
    
    // Retornar as pastas criadas
    const folders = await getFoldersByClient(clientId);
    console.log(`✅ ${folders.length} pastas criadas para o cliente!`);
    
    return folders;
  } catch (error) {
    console.error('Error creating default folders:', error);
    throw error;
  }
};

export const getFoldersByClient = async (clientId: string): Promise<Folder[]> => {
  try {
    console.log(`🔍 Buscando pastas para o cliente ${clientId}`);
    
    const foldersCollection = collection(db, CLIENTS_COLLECTION, clientId, FOLDERS_COLLECTION);
    const querySnapshot = await getDocs(foldersCollection);
    
    console.log(`📊 Encontradas ${querySnapshot.size} pastas`);
    
    const folders = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return convertFolderTimestamp({
        id: doc.id,
        ...data
      } as Folder);
    });
    
    // Organizar as pastas em ordem
    folders.sort((a, b) => a.ordem - b.ordem);
    
    return folders;
  } catch (error) {
    console.error('❌ Erro ao buscar pastas do cliente:', error);
    return []; // Retornar array vazio em caso de erro
  }
};

export const createCustomFolder = async (clientId: string, folderData: Omit<Folder, 'id' | 'clientId' | 'createdAt' | 'updatedAt'>): Promise<Folder> => {
  try {
    const data = {
      ...folderData,
      clientId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const foldersCollection = collection(db, CLIENTS_COLLECTION, clientId, FOLDERS_COLLECTION);
    const docRef = await addDoc(foldersCollection, data);
    
    return {
      id: docRef.id,
      ...folderData,
      clientId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  } catch (error) {
    console.error('Error creating custom folder:', error);
    throw error;
  }
};

export const updateFolder = async (clientId: string, folderId: string, updates: Partial<Folder>): Promise<boolean> => {
  try {
    const docRef = doc(db, CLIENTS_COLLECTION, clientId, FOLDERS_COLLECTION, folderId);
    
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error updating folder:', error);
    throw error;
  }
};

export const deleteFolder = async (clientId: string, folderId: string): Promise<boolean> => {
  try {
    // Verificar se a pasta é padrão
    const folderRef = doc(db, CLIENTS_COLLECTION, clientId, FOLDERS_COLLECTION, folderId);
    const folderDoc = await getDoc(folderRef);
    
    if (folderDoc.exists() && folderDoc.data().isPadrao) {
      throw new Error("Não é possível excluir pastas padrão");
    }

    // Verificar se há documentos na pasta
    const documentsInFolder = await getDocumentsByFolder(clientId, folderId);
    if (documentsInFolder.length > 0) {
      throw new Error("Não é possível excluir uma pasta que contém documentos");
    }

    await deleteDoc(folderRef);
    return true;
  } catch (error) {
    console.error('Error deleting folder:', error);
    throw error;
  }
};

export const createSubfolder = async (clientId: string, parentId: string, folderData: Omit<Folder, 'id' | 'clientId' | 'createdAt' | 'updatedAt' | 'parentId' | 'isSubfolder'>): Promise<Folder> => {
  try {
    // Verificar se a pasta pai existe
    const parentFolder = await getDoc(doc(db, CLIENTS_COLLECTION, clientId, FOLDERS_COLLECTION, parentId));
    if (!parentFolder.exists()) {
      throw new Error("Pasta pai não encontrada");
    }

    // Buscar todas as sub-pastas da pasta pai para determinar a próxima ordem
    const subfolders = await getDocs(
      query(
        collection(db, CLIENTS_COLLECTION, clientId, FOLDERS_COLLECTION),
        where("parentId", "==", parentId)
      )
    );
    const nextOrder = subfolders.size + 1;

    const data = {
      ...folderData,
      clientId,
      parentId,
      isSubfolder: true,
      ordem: nextOrder,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, CLIENTS_COLLECTION, clientId, FOLDERS_COLLECTION), data);
    
    return {
      id: docRef.id,
      ...folderData,
      clientId,
      parentId,
      isSubfolder: true,
      ordem: nextOrder,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  } catch (error) {
    console.error('Error creating subfolder:', error);
    throw error;
  }
};

export const getSubfoldersByParent = async (clientId: string, parentId: string): Promise<Folder[]> => {
  try {
    const q = query(
      collection(db, CLIENTS_COLLECTION, clientId, FOLDERS_COLLECTION),
      where("parentId", "==", parentId),
      orderBy("ordem")
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return convertFolderTimestamp({
        id: doc.id,
        ...data
      });
    });
  } catch (error) {
    console.error('Error getting subfolders:', error);
    throw error;
  }
};

// ==================== DOCUMENT OPERATIONS ====================

export const getDocumentsByFolder = async (clientId: string, folderId: string): Promise<FolderDocument[]> => {
  try {
    if (!clientId || !folderId) {
      console.error('ClientId e FolderId são obrigatórios');
      return [];
    }

    // Buscar documentos que correspondam ao folderId
    const q = query(
      collection(db, CLIENTS_COLLECTION, clientId, DOCUMENTS_COLLECTION),
      where("folderId", "==", folderId)
    );
    
    const querySnapshot = await getDocs(q);
    
    // Ordenar os resultados em memória
    const documents = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return convertDocumentTimestamp({
        id: doc.id,
        ...data
      });
    }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    return documents;
  } catch (error) {
    console.error('Error getting documents by folder:', error);
    return []; // Retornar array vazio em caso de erro
  }
};

export const getDocumentsByClient = async (clientId: string): Promise<FolderDocument[]> => {
  try {
    const q = query(
      collection(db, CLIENTS_COLLECTION, clientId, DOCUMENTS_COLLECTION)
    );
    
    const querySnapshot = await getDocs(q);
    
    // Ordenar os resultados em memória
    const documents = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return convertDocumentTimestamp({
        id: doc.id,
        ...data
      });
    }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    return documents;
  } catch (error) {
    console.error('Error getting documents by client:', error);
    throw error;
  }
};

export const createDocument = async (clientId: string, documentData: Omit<FolderDocument, 'id'>): Promise<FolderDocument> => {
  try {
    const data = {
      ...documentData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, CLIENTS_COLLECTION, clientId, DOCUMENTS_COLLECTION), data);
    
    return {
      id: docRef.id,
      ...documentData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  } catch (error) {
    console.error('Error creating document:', error);
    throw error;
  }
};

export const updateDocument = async (clientId: string, documentId: string, updates: Partial<FolderDocument>): Promise<boolean> => {
  try {
    const docRef = doc(db, CLIENTS_COLLECTION, clientId, DOCUMENTS_COLLECTION, documentId);
    
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error updating document:', error);
    throw error;
  }
};

export const deleteDocument = async (clientId: string, documentId: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, CLIENTS_COLLECTION, clientId, DOCUMENTS_COLLECTION, documentId));
    return true;
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};

export const moveDocument = async (clientId: string, documentId: string, newFolderId: string, newFolderName: string): Promise<boolean> => {
  try {
    await updateDocument(clientId, documentId, {
      folderId: newFolderId,
      folderName: newFolderName
    });
    return true;
  } catch (error) {
    console.error('Error moving document:', error);
    throw error;
  }
};

// Função para criar pastas padrão para clientes existentes
export const createDefaultFoldersForExistingClients = async (): Promise<void> => {
  try {
    // Buscar todos os clientes
    const clientsSnapshot = await getDocs(collection(db, 'clients'));
    
    // Para cada cliente
    for (const clientDoc of clientsSnapshot.docs) {
      const clientId = clientDoc.id;
      
      // Verificar se o cliente já tem pastas
      const existingFolders = await getFoldersByClient(clientId);
      
      // Se não tiver pastas, criar as padrão
      if (existingFolders.length === 0) {
        await createDefaultFoldersForClient(clientId);
        console.log(`Pastas padrão criadas para o cliente ${clientId}`);
      }
    }
  } catch (error) {
    console.error('Error creating default folders for existing clients:', error);
    throw error;
  }
};

export const uploadFileToStorage = async (file: File, clientId: string, folderId: string): Promise<string> => {
  try {
    // Criar uma referência única para o arquivo
    const fileName = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `documents/${clientId}/${folderId}/${fileName}`);
    
    // Fazer upload do arquivo
    await uploadBytes(storageRef, file);
    
    // Obter a URL de download
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading file to storage:', error);
    throw error;
  }
};

// Função para criar a estrutura padrão de pastas
export async function createDefaultFolderStructure(clientId: string) {
  try {
    console.log('🚀 Iniciando criação da estrutura de pastas padrão (7 pastas)...');
    
    // Verificar se já existem pastas para este cliente
    const existingFolders = await getFoldersByClient(clientId);
    console.log(`📂 Pastas existentes: ${existingFolders.length}`);
    
    // Se já existirem pastas principais, resetar completamente a estrutura
    const hasMainFolders = existingFolders.some(folder => !folder.parentId);
    if (hasMainFolders) {
      console.log('🔄 Cliente já possui pastas. Verificando se tem estrutura completa...');
      
      // Contar quantas pastas principais existem
      const mainFoldersCount = existingFolders.filter(folder => !folder.parentId).length;
      
      if (mainFoldersCount < 7) {
        console.log(`📁 Cliente tem apenas ${mainFoldersCount} pastas. Adicionando pastas faltantes...`);
        
        // Verificar quais pastas estão faltando e adicionar
        for (let i = 0; i < clientFolderStructure.length; i++) {
          const folder = clientFolderStructure[i];
          const existsAlready = existingFolders.some(f => f.nome === folder.name && !f.parentId);
          
          if (!existsAlready) {
            console.log(`📁 Adicionando pasta faltante: ${folder.name}`);
            try {
              await createFirebaseFolder(clientId, '', folder, undefined, i + 1);
            } catch (error) {
              console.error(`❌ Erro ao criar pasta ${folder.name}:`, error);
            }
          }
        }
      } else {
        console.log('✅ Cliente já possui estrutura completa de 7 pastas.');
      }
      
      return await getFoldersByClient(clientId);
    }
    
    console.log('📁 Criando estrutura completa de 7 pastas...');
    
    // Criar as 7 pastas principais e suas subpastas
    const createdFolders = [];
    for (let i = 0; i < clientFolderStructure.length; i++) {
      const folder = clientFolderStructure[i];
      try {
        console.log(`📁 Criando pasta ${i + 1}/7: ${folder.name}`);
        const createdFolder = await createFirebaseFolder(clientId, '', folder, undefined, i + 1);
        createdFolders.push(createdFolder);
      } catch (error) {
        console.error(`❌ Erro ao criar pasta ${folder.name}:`, error);
        throw error;
      }
    }
    
    // Verificar se todas as 7 pastas foram criadas
    const finalFolders = await getFoldersByClient(clientId);
    const mainFolders = finalFolders.filter(f => !f.parentId);
    console.log(`✅ Estrutura criada com sucesso! Total de pastas principais: ${mainFolders.length}/7`);
    
    if (mainFolders.length !== 7) {
      console.warn(`⚠️ Esperado 7 pastas, mas foram criadas ${mainFolders.length}`);
    }
    
    return finalFolders;
  } catch (error) {
    console.error('❌ Erro ao criar estrutura de pastas:', error);
    throw error;
  }
}

async function createFirebaseFolder(
  clientId: string,
  parentPath: string,
  structure: typeof clientFolderStructure[0],
  parentId?: string,
  ordem: number = 0
) {
  try {
    const timestamp = new Date();
    
    // Criar a pasta principal
    const foldersCollection = collection(db, CLIENTS_COLLECTION, clientId, FOLDERS_COLLECTION);
    
    // Construir o caminho completo
    const fullPath = parentPath 
      ? `${parentPath}/${structure.name}`.replace(/^\/+/, '')
      : structure.name;
    
    console.log(`📁 Criando pasta: ${structure.name}`);
    console.log(`📍 Path: ${fullPath}`);
    console.log(`👆 ParentId: ${parentId || 'root'}`);
    
    // Preparar os dados da pasta
    const folderData: Folder = {
      id: doc(foldersCollection).id, // Gerar ID antes
      clientId,
      nome: structure.name,
      icone: 'folder',
      isPadrao: true,
      ordem,
      path: fullPath,
      description: structure.description,
      allowedFileTypes: structure.allowedFileTypes || [],
      isSubfolder: Boolean(parentId),
      isRestricted: structure.isRestricted || false,
      allowedRoles: structure.allowedRoles || [],
      createdAt: timestamp,
      updatedAt: timestamp
    };

    // Adicionar parentId apenas se ele existir
    if (parentId) {
      folderData.parentId = parentId;
    }
    
    // Remover campos undefined antes de salvar no Firestore
    const firestoreData = Object.entries(folderData).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);

    // Adicionar timestamps do Firestore
    firestoreData.createdAt = serverTimestamp();
    firestoreData.updatedAt = serverTimestamp();
    
    // Salvar a pasta no Firestore usando o ID gerado
    await setDoc(doc(foldersCollection, folderData.id), firestoreData);
    console.log(`✅ Pasta ${structure.name} criada com sucesso!`);
    
    // Criar subpastas recursivamente
    if (structure.subFolders && structure.subFolders.length > 0) {
      console.log(`📂 Criando ${structure.subFolders.length} subpastas para: ${structure.name}`);
      
      for (let i = 0; i < structure.subFolders.length; i++) {
        const subFolder = structure.subFolders[i];
        await createFirebaseFolder(
          clientId,
          fullPath,
          subFolder,
          folderData.id,
          i + 1
        );
      }
    }
    
    return folderData;
  } catch (error) {
    console.error(`❌ Erro ao criar pasta ${structure.name}:`, error);
    throw error;
  }
}

export const resetFolderStructure = async (clientId: string): Promise<void> => {
  try {
    console.log('🧹 Iniciando limpeza da estrutura de pastas...');
    
    // Buscar todas as pastas do cliente
    const folders = await getFoldersByClient(clientId);
    
    // Se não houver pastas, criar a estrutura
    if (folders.length === 0) {
      console.log('📂 Nenhuma pasta encontrada. Criando estrutura inicial...');
      await createDefaultFolderStructure(clientId);
      return;
    }
    
    // Excluir todas as pastas em lote
    const batch = writeBatch(db);
    
    // Verificar se há documentos em alguma pasta
    for (const folder of folders) {
      const documents = await getDocumentsByFolder(clientId, folder.id);
      if (documents.length > 0) {
        throw new Error(`A pasta ${folder.nome} contém documentos e não pode ser excluída.`);
      }
      
      const folderRef = doc(db, CLIENTS_COLLECTION, clientId, FOLDERS_COLLECTION, folder.id);
      batch.delete(folderRef);
    }
    
    // Executar a exclusão em lote
    await batch.commit();
    console.log('✨ Pastas antigas removidas com sucesso');
    
    // Aguardar um momento para garantir que a exclusão foi processada
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Criar nova estrutura
    console.log('🚀 Criando nova estrutura de pastas...');
    await createDefaultFolderStructure(clientId);
    
    console.log('✅ Estrutura de pastas recriada com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao resetar estrutura de pastas:', error);
    throw error;
  }
};

// ==================== PERMISSION UTILITIES ====================

export const hasAccessToFolder = (folder: Folder, userHierarchyLevel: HierarchyLevel): boolean => {
  // Se a pasta não é restrita, todos têm acesso
  if (!folder.isRestricted || !folder.allowedRoles || folder.allowedRoles.length === 0) {
    return true;
  }
  
  // Verificar se o nível hierárquico do usuário está na lista de roles permitidos
  return folder.allowedRoles.includes(userHierarchyLevel);
};

export const filterFoldersByPermission = (folders: Folder[], userHierarchyLevel: HierarchyLevel): Folder[] => {
  // Se for Presidente, não filtrar NADA
  if (userHierarchyLevel === 'Presidente') {
    return folders;
  }
  
  return folders.filter(folder => hasAccessToFolder(folder, userHierarchyLevel));
};

// Função específica para adicionar a 7ª pasta confidencial a clientes existentes
export const addConfidentialFolderToExistingClient = async (clientId: string): Promise<void> => {
  try {
    console.log(`🔒 Adicionando pasta confidencial para o cliente ${clientId}...`);
    
    // Verificar se já existe a pasta confidencial
    const existingFolders = await getFoldersByClient(clientId);
    const hasConfidentialFolder = existingFolders.some(folder => 
      folder.nome === "Documentos Confidenciais" && !folder.parentId
    );
    
    if (hasConfidentialFolder) {
      console.log('✅ Pasta confidencial já existe para este cliente.');
      return;
    }
    
    // Buscar a estrutura da pasta confidencial
    const confidentialFolderStructure = clientFolderStructure.find(folder => 
      folder.name === "Documentos Confidenciais"
    );
    
    if (!confidentialFolderStructure) {
      throw new Error('Estrutura da pasta confidencial não encontrada');
    }
    
    // Criar a pasta confidencial como 7ª pasta
    await createFirebaseFolder(clientId, '', confidentialFolderStructure, undefined, 7);
    
    console.log('✅ Pasta "Documentos Confidenciais" adicionada com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao adicionar pasta confidencial:', error);
    throw error;
  }
};

// Função para adicionar a pasta confidencial para TODOS os clientes existentes
export const addConfidentialFolderToAllClients = async (): Promise<void> => {
  try {
    console.log('🚀 Iniciando adição da pasta confidencial para todos os clientes...');
    
    // Buscar todos os clientes
    const clientsSnapshot = await getDocs(collection(db, 'clients'));
    console.log(`👥 Encontrados ${clientsSnapshot.docs.length} clientes`);
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    // Para cada cliente
    for (const clientDoc of clientsSnapshot.docs) {
      const clientId = clientDoc.id;
      const clientData = clientDoc.data();
      
      try {
        console.log(`📋 Processando cliente: ${clientData.name || clientId}`);
        
        // Verificar se já tem pastas (clientes sem pastas são ignorados)
        const existingFolders = await getFoldersByClient(clientId);
        if (existingFolders.length === 0) {
          console.log(`⏭️ Cliente ${clientData.name} não tem estrutura de pastas. Pulando...`);
          skipCount++;
          continue;
        }
        
        // Verificar se já tem a pasta confidencial
        const hasConfidentialFolder = existingFolders.some(folder => 
          folder.nome === "Documentos Confidenciais" && !folder.parentId
        );
        
        if (hasConfidentialFolder) {
          console.log(`✅ Cliente ${clientData.name} já tem pasta confidencial. Pulando...`);
          skipCount++;
          continue;
        }
        
        // Adicionar a pasta confidencial
        await addConfidentialFolderToExistingClient(clientId);
        successCount++;
        console.log(`✅ Pasta confidencial adicionada para ${clientData.name}`);
        
        // Pequena pausa para não sobrecarregar o Firebase
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Erro ao processar cliente ${clientData.name}:`, error);
        errorCount++;
      }
    }
    
    console.log('📊 Resumo da operação:');
    console.log(`✅ Sucesso: ${successCount} clientes`);
    console.log(`⏭️ Pulados: ${skipCount} clientes`);
    console.log(`❌ Erros: ${errorCount} clientes`);
    console.log('🎉 Operação concluída!');
    
  } catch (error) {
    console.error('❌ Erro ao adicionar pasta confidencial para todos os clientes:', error);
    throw error;
  }
};

// Função para verificar quantos clientes têm a pasta confidencial
export const checkConfidentialFolderStatus = async (): Promise<{
  totalClients: number;
  clientsWithFolders: number;
  clientsWithConfidential: number;
  clientsWithoutConfidential: number;
  details: Array<{
    id: string;
    name: string;
    hasConfidentialFolder: boolean;
    totalFolders: number;
  }>;
}> => {
  try {
    console.log('🔍 Verificando status da pasta confidencial em todos os clientes...');
    
    // Buscar todos os clientes
    const clientsSnapshot = await getDocs(collection(db, 'clients'));
    console.log(`👥 Total de clientes: ${clientsSnapshot.docs.length}`);
    
    let clientsWithFolders = 0;
    let clientsWithConfidential = 0;
    let clientsWithoutConfidential = 0;
    const details = [];
    
    // Para cada cliente, verificar se tem a pasta confidencial
    for (const clientDoc of clientsSnapshot.docs) {
      const clientId = clientDoc.id;
      const clientData = clientDoc.data();
      
      try {
        // Buscar pastas do cliente
        const existingFolders = await getFoldersByClient(clientId);
        
        if (existingFolders.length > 0) {
          clientsWithFolders++;
          
          // Verificar se tem a pasta confidencial
          const hasConfidentialFolder = existingFolders.some(folder => 
            folder.nome === "Documentos Confidenciais" && !folder.parentId
          );
          
          if (hasConfidentialFolder) {
            clientsWithConfidential++;
          } else {
            clientsWithoutConfidential++;
          }
          
          details.push({
            id: clientId,
            name: clientData.name || 'Sem nome',
            hasConfidentialFolder,
            totalFolders: existingFolders.filter(f => !f.parentId).length
          });
          
          console.log(`📋 ${clientData.name}: ${hasConfidentialFolder ? '✅ TEM' : '❌ NÃO TEM'} pasta confidencial (${existingFolders.filter(f => !f.parentId).length} pastas)`);
        } else {
          details.push({
            id: clientId,
            name: clientData.name || 'Sem nome',
            hasConfidentialFolder: false,
            totalFolders: 0
          });
          console.log(`📋 ${clientData.name}: Sem estrutura de pastas`);
        }
        
      } catch (error) {
        console.error(`❌ Erro ao verificar cliente ${clientData.name}:`, error);
      }
    }
    
    const result = {
      totalClients: clientsSnapshot.docs.length,
      clientsWithFolders,
      clientsWithConfidential,
      clientsWithoutConfidential,
      details
    };
    
    console.log('📊 RESUMO DA VERIFICAÇÃO:');
    console.log(`👥 Total de clientes: ${result.totalClients}`);
    console.log(`📁 Clientes com estrutura de pastas: ${result.clientsWithFolders}`);
    console.log(`🔒 Clientes COM pasta confidencial: ${result.clientsWithConfidential}`);
    console.log(`❌ Clientes SEM pasta confidencial: ${result.clientsWithoutConfidential}`);
    
    return result;
    
  } catch (error) {
    console.error('❌ Erro ao verificar status da pasta confidencial:', error);
    throw error;
  }
};

// Função para verificar e corrigir estrutura de TODOS os clientes
export const verifyAndFixAllClientsStructure = async (): Promise<{
  totalClients: number;
  clientsWithIncompleteStructure: number;
  clientsFixed: number;
  errors: number;
  details: Array<{
    id: string;
    name: string;
    mainFoldersCount: number;
    totalFoldersCount: number;
    status: 'complete' | 'incomplete' | 'fixed' | 'error';
    missingFolders?: string[];
  }>;
}> => {
  try {
    console.log('🔍 VERIFICANDO ESTRUTURA DE TODOS OS CLIENTES...');
    
    // Buscar todos os clientes
    const clientsSnapshot = await getDocs(collection(db, 'clients'));
    console.log(`👥 Total de clientes encontrados: ${clientsSnapshot.docs.length}`);
    
    let clientsWithIncompleteStructure = 0;
    let clientsFixed = 0;
    let errors = 0;
    const details = [];
    
    // Nomes das 7 pastas padrão
    const expectedFolders = [
      "Documentos Gerais",
      "Questionário Padrão", 
      "Banco de Imagens",
      "Fluxograma",
      "Equipamentos e Matérias Primas",
      "Documentos Prontos",
      "Documentos Confidenciais"
    ];
    
    // Para cada cliente
    for (const clientDoc of clientsSnapshot.docs) {
      const clientId = clientDoc.id;
      const clientData = clientDoc.data();
      
      try {
        console.log(`\n📋 Verificando cliente: ${clientData.name || clientId}`);
        
        // Buscar pastas do cliente
        const existingFolders = await getFoldersByClient(clientId);
        const mainFolders = existingFolders.filter(f => !f.parentId);
        const mainFoldersCount = mainFolders.length;
        const totalFoldersCount = existingFolders.length;
        
        console.log(`📁 Pastas principais: ${mainFoldersCount}/7 | Total: ${totalFoldersCount}`);
        
        // Verificar quais pastas estão faltando
        const existingFolderNames = mainFolders.map(f => f.nome);
        const missingFolders = expectedFolders.filter(expected => 
          !existingFolderNames.includes(expected)
        );
        
        if (missingFolders.length > 0) {
          console.log(`❌ Pastas faltando: ${missingFolders.join(', ')}`);
        }
        
        let status: 'complete' | 'incomplete' | 'fixed' | 'error' = 'complete';
        
        if (mainFoldersCount < 7) {
          clientsWithIncompleteStructure++;
          status = 'incomplete';
          
          try {
            console.log(`🔧 Aplicando estrutura completa...`);
            await createDefaultFolderStructure(clientId);
            clientsFixed++;
            status = 'fixed';
            console.log(`✅ Estrutura corrigida!`);
          } catch (fixError) {
            console.error(`❌ Erro ao corrigir estrutura:`, fixError);
            errors++;
            status = 'error';
          }
        } else {
          console.log(`✅ Estrutura completa (${mainFoldersCount} pastas)`);
        }
        
        details.push({
          id: clientId,
          name: clientData.name || 'Sem nome',
          mainFoldersCount,
          totalFoldersCount,
          status,
          missingFolders: missingFolders.length > 0 ? missingFolders : undefined
        });
        
        // Pausa para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Erro ao processar cliente ${clientData.name}:`, error);
        errors++;
        
        details.push({
          id: clientId,
          name: clientData.name || 'Sem nome',
          mainFoldersCount: 0,
          totalFoldersCount: 0,
          status: 'error'
        });
      }
    }
    
    const result = {
      totalClients: clientsSnapshot.docs.length,
      clientsWithIncompleteStructure,
      clientsFixed,
      errors,
      details
    };
    
    console.log('\n📊 RESUMO FINAL:');
    console.log(`👥 Total de clientes: ${result.totalClients}`);
    console.log(`❌ Clientes com estrutura incompleta: ${result.clientsWithIncompleteStructure}`);
    console.log(`✅ Clientes corrigidos: ${result.clientsFixed}`);
    console.log(`⚠️ Erros: ${result.errors}`);
    
    // Listar detalhes por cliente
    console.log('\n📋 DETALHES POR CLIENTE:');
    result.details.forEach((client, index) => {
      const statusIcon = {
        'complete': '✅',
        'incomplete': '❌', 
        'fixed': '🔧',
        'error': '💥'
      }[client.status];
      
      console.log(`${index + 1}. ${statusIcon} ${client.name} - ${client.mainFoldersCount}/7 pastas principais (${client.totalFoldersCount} total)`);
      
      if (client.missingFolders && client.missingFolders.length > 0) {
        console.log(`   📁 Faltavam: ${client.missingFolders.join(', ')}`);
      }
    });
    
    return result;
    
  } catch (error) {
    console.error('❌ Erro geral na verificação:', error);
    throw error;
  }
};

// Função AGRESSIVA para forçar 7 pastas em TODOS os clientes
export const forceCreate7FoldersForAllClients = async (): Promise<void> => {
  try {
    console.log('🔥 FORÇANDO CRIAÇÃO DE 7 PASTAS PARA TODOS OS CLIENTES...');
    
    // Buscar todos os clientes
    const clientsSnapshot = await getDocs(collection(db, 'clients'));
    console.log(`👥 Total de clientes: ${clientsSnapshot.docs.length}`);
    
    const expectedFolders = [
      {
        name: "Documentos Gerais",
        description: "Armazenar documentos administrativos do cliente e da propriedade",
        order: 1
      },
      {
        name: "Questionário Padrão", 
        description: "Formulários para preenchimento de informações da empresa",
        order: 2
      },
      {
        name: "Banco de Imagens",
        description: "Armazenar fotos organizadas por local",
        order: 3
      },
      {
        name: "Fluxograma",
        description: "Armazenar fluxogramas manuais ou escaneados",
        order: 4
      },
      {
        name: "Equipamentos e Matérias Primas",
        description: "Listar e registrar os equipamentos e insumos utilizados",
        order: 5
      },
      {
        name: "Documentos Prontos",
        description: "Armazenar documentos finais para envio ou assinatura",
        order: 6
      },
      {
        name: "Documentos Confidenciais",
        description: "Documentos sensíveis e informações confidenciais - Acesso restrito",
        order: 7,
        isRestricted: true,
        allowedRoles: ["Presidente", "Diretor Financeiro", "Diretor de TI"]
      }
    ];
    
    // Para cada cliente
    for (const clientDoc of clientsSnapshot.docs) {
      const clientId = clientDoc.id;
      const clientData = clientDoc.data();
      
      try {
        console.log(`\n🔥 FORÇANDO cliente: ${clientData.name || clientId}`);
        
        // Buscar pastas existentes
        const existingFolders = await getFoldersByClient(clientId);
        const mainFolders = existingFolders.filter(f => !f.parentId);
        
        console.log(`📁 Cliente tem ${mainFolders.length} pastas principais`);
        
        // Para cada pasta esperada
        for (const expectedFolder of expectedFolders) {
          const existsAlready = mainFolders.some(f => f.nome === expectedFolder.name);
          
          if (!existsAlready) {
            console.log(`➕ Criando pasta: ${expectedFolder.name}`);
            
            // Criar pasta usando EXATAMENTE a mesma estrutura das outras
            const foldersCollection = collection(db, CLIENTS_COLLECTION, clientId, FOLDERS_COLLECTION);
            const folderRef = doc(foldersCollection);
            
            // Usar EXATAMENTE os mesmos campos das outras pastas
            const folderData = {
              id: folderRef.id,
              clientId,
              nome: expectedFolder.name,
              icone: 'folder',
              isPadrao: true,
              ordem: expectedFolder.order,
              path: expectedFolder.name,
              description: expectedFolder.description,
              allowedFileTypes: [],
              isSubfolder: false,
              isRestricted: expectedFolder.isRestricted || false,
              allowedRoles: expectedFolder.allowedRoles || [],
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            };
            
            // Remover campos undefined
            const cleanData = Object.entries(folderData).reduce((acc, [key, value]) => {
              if (value !== undefined) {
                acc[key] = value;
              }
              return acc;
            }, {} as Record<string, any>);
            
            await setDoc(folderRef, cleanData);
            console.log(`✅ Pasta ${expectedFolder.name} criada com ID: ${folderRef.id}!`);
          } else {
            console.log(`✅ Pasta ${expectedFolder.name} já existe`);
          }
        }
        
        // Verificar novamente
        const updatedFolders = await getFoldersByClient(clientId);
        const updatedMainFolders = updatedFolders.filter(f => !f.parentId);
        console.log(`🎯 Cliente agora tem ${updatedMainFolders.length}/7 pastas principais`);
        
        // Pausa
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Erro no cliente ${clientData.name}:`, error);
      }
    }
    
    console.log('\n🎉 OPERAÇÃO AGRESSIVA CONCLUÍDA!');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
    throw error;
  }
};

// Função SUPER SIMPLES para criar as 7 pastas - SEM COMPLICAÇÃO
export const createSimple7Folders = async (clientId: string): Promise<void> => {
  try {
    console.log(`🔥 CRIANDO 7 PASTAS SIMPLES para ${clientId}`);
    
    const folders = [
      { nome: "Documentos Gerais", ordem: 1, desc: "Armazenar documentos administrativos do cliente e da propriedade" },
      { nome: "Questionário Padrão", ordem: 2, desc: "Formulários para preenchimento de informações da empresa" },
      { nome: "Banco de Imagens", ordem: 3, desc: "Armazenar fotos organizadas por local" },
      { nome: "Fluxograma", ordem: 4, desc: "Armazenar fluxogramas manuais ou escaneados" },
      { nome: "Equipamentos e Matérias Primas", ordem: 5, desc: "Listar e registrar os equipamentos e insumos utilizados" },
      { nome: "Documentos Prontos", ordem: 6, desc: "Armazenar documentos finais para envio ou assinatura" },
      { nome: "Documentos Confidenciais", ordem: 7, desc: "Documentos sensíveis e informações confidenciais", isRestricted: true, allowedRoles: ["Presidente", "Diretor Financeiro", "Diretor de TI"] }
    ];
    
    for (const folder of folders) {
      try {
        console.log(`➕ Criando: ${folder.nome}`);
        
        const foldersCollection = collection(db, "clients", clientId, "folders");
        const folderRef = doc(foldersCollection);
        
        const data = {
          clientId: clientId,
          nome: folder.nome,
          icone: "folder",
          isPadrao: true,
          ordem: folder.ordem,
          path: folder.nome,
          description: folder.desc,
          allowedFileTypes: [],
          isSubfolder: false,
          isRestricted: folder.isRestricted || false,
          allowedRoles: folder.allowedRoles || [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        await setDoc(folderRef, data);
        console.log(`✅ ${folder.nome} criada!`);
        
      } catch (error) {
        console.error(`❌ Erro em ${folder.nome}:`, error);
      }
    }
    
    console.log('✅ 7 pastas criadas!');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
    throw error;
  }
};

// Função para aplicar nas existentes
export const applySimple7FoldersToAll = async (): Promise<void> => {
  try {
    console.log('🚀 APLICANDO 7 PASTAS SIMPLES EM TODOS');
    
    const clientsSnapshot = await getDocs(collection(db, 'clients'));
    console.log(`👥 ${clientsSnapshot.docs.length} clientes`);
    
    for (const clientDoc of clientsSnapshot.docs) {
      const clientId = clientDoc.id;
      const clientData = clientDoc.data();
      
      try {
        console.log(`\n🔄 Cliente: ${clientData.name}`);
        
        // Buscar pastas existentes
        const existingFolders = await getFoldersByClient(clientId);
        const mainFolders = existingFolders.filter(f => !f.parentId);
        
        console.log(`📁 Tem ${mainFolders.length} pastas`);
        
        // Se tem menos de 7, criar todas novamente
        if (mainFolders.length < 7) {
          console.log('🔧 Criando pastas...');
          await createSimple7Folders(clientId);
        } else {
          console.log('✅ Já tem 7 pastas');
        }
        
      } catch (error) {
        console.error(`❌ Erro no cliente ${clientData.name}:`, error);
      }
    }
    
    console.log('\n🎉 CONCLUÍDO!');
    
  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  }
};

// Função DEFINITIVA para limpar duplicatas e criar exatamente 7 pastas
export const cleanAndCreate7FoldersForClient = async (clientId: string): Promise<void> => {
  try {
    console.log(`🧹 LIMPANDO E CRIANDO 7 PASTAS PARA ${clientId}`);
    
    // 1. DELETAR TODAS AS PASTAS EXISTENTES
    const existingFolders = await getFoldersByClient(clientId);
    console.log(`🗑️ Deletando ${existingFolders.length} pastas existentes...`);
    
    const batch = writeBatch(db);
    
    for (const folder of existingFolders) {
      const folderRef = doc(db, "clients", clientId, "folders", folder.id);
      batch.delete(folderRef);
    }
    
    await batch.commit();
    console.log('✅ Todas as pastas antigas deletadas');
    
    // 2. CRIAR EXATAMENTE AS 7 PASTAS NOVAS
    const folders = [
      { nome: "Documentos Gerais", ordem: 1, desc: "Armazenar documentos administrativos do cliente e da propriedade" },
      { nome: "Questionário Padrão", ordem: 2, desc: "Formulários para preenchimento de informações da empresa" },
      { nome: "Banco de Imagens", ordem: 3, desc: "Armazenar fotos organizadas por local" },
      { nome: "Fluxograma", ordem: 4, desc: "Armazenar fluxogramas manuais ou escaneados" },
      { nome: "Equipamentos e Matérias Primas", ordem: 5, desc: "Listar e registrar os equipamentos e insumos utilizados" },
      { nome: "Documentos Prontos", ordem: 6, desc: "Armazenar documentos finais para envio ou assinatura" },
      { nome: "Documentos Confidenciais", ordem: 7, desc: "Documentos sensíveis e informações confidenciais", isRestricted: true, allowedRoles: ["Presidente", "Diretor Financeiro"] }
    ];
    
    console.log('📁 Criando 7 pastas novas...');
    
    for (const folder of folders) {
      try {
        const foldersCollection = collection(db, "clients", clientId, "folders");
        const folderRef = doc(foldersCollection);
        
        const data = {
          clientId: clientId,
          nome: folder.nome,
          icone: "folder",
          isPadrao: true,
          ordem: folder.ordem,
          path: folder.nome,
          description: folder.desc,
          allowedFileTypes: [],
          isSubfolder: false,
          isRestricted: folder.isRestricted || false,
          allowedRoles: folder.allowedRoles || [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        await setDoc(folderRef, data);
        console.log(`✅ ${folder.nome} criada!`);
        
      } catch (error) {
        console.error(`❌ Erro em ${folder.nome}:`, error);
      }
    }
    
    console.log('🎉 7 pastas criadas com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
    throw error;
  }
};

// Função para aplicar em todos os clientes
export const cleanAndCreate7FoldersForAllClients = async (): Promise<void> => {
  try {
    console.log('🚀 LIMPANDO E CRIANDO 7 PASTAS EM TODOS OS CLIENTES');
    
    const clientsSnapshot = await getDocs(collection(db, 'clients'));
    console.log(`👥 ${clientsSnapshot.docs.length} clientes`);
    
    for (const clientDoc of clientsSnapshot.docs) {
      const clientId = clientDoc.id;
      const clientData = clientDoc.data();
      
      try {
        console.log(`\n🔄 Cliente: ${clientData.name}`);
        await cleanAndCreate7FoldersForClient(clientId);
        console.log(`✅ Cliente ${clientData.name} concluído!`);
        
        // Pausa para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`❌ Erro no cliente ${clientData.name}:`, error);
      }
    }
    
    console.log('\n🎉 TODOS OS CLIENTES PROCESSADOS!');
    
  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  }
}; 