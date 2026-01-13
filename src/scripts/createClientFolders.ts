import { createClientFolderStructure } from '../utils/createFolderStructure';
import path from 'path';

// Obter o diretório atual
const currentDir = process.cwd();

// Criar a estrutura de pastas no diretório public
createClientFolderStructure(path.join(currentDir, 'public')); 