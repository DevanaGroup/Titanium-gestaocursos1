import { db } from '../config/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { clientFolderStructure } from '../config/folderStructure';

interface FolderData {
  name: string;
  path: string;
  type: 'folder';
  allowedFileTypes?: string[];
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

async function createFirebaseFolder(
  clientId: string,
  folderPath: string,
  structure: typeof clientFolderStructure[0]
) {
  const timestamp = new Date();
  const fullPath = `${folderPath}/${structure.name}`;
  
  // Criar a pasta principal
  const folderData: FolderData = {
    name: structure.name,
    path: fullPath,
    type: 'folder',
    allowedFileTypes: structure.allowedFileTypes,
    description: structure.description,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  // Criar documento da pasta no Firestore
  const foldersCollection = collection(db, 'clients', clientId, 'folders');
  const folderDoc = doc(foldersCollection, structure.name);
  await setDoc(folderDoc, folderData);

  console.log(`✅ Pasta criada no Firebase: ${fullPath}`);

  // Criar subpastas recursivamente
  if (structure.subFolders) {
    for (const subFolder of structure.subFolders) {
      await createFirebaseFolder(clientId, fullPath, subFolder);
    }
  }
}

export async function createClientFolderStructure(clientId: string) {
  console.log('🚀 Iniciando criação da estrutura de pastas no Firebase...\n');

  try {
    // Criar todas as pastas da estrutura
    for (const folder of clientFolderStructure) {
      await createFirebaseFolder(clientId, '', folder);
    }

    console.log('\n✨ Estrutura de pastas criada com sucesso no Firebase!');
  } catch (error) {
    console.error('❌ Erro ao criar estrutura de pastas:', error);
    throw error;
  }
} 