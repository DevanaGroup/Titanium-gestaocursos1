import fs from 'fs';
import path from 'path';
import { clientFolderStructure } from '../config/folderStructure';

function createFolder(basePath: string, structure: typeof clientFolderStructure[0]) {
  const folderPath = path.join(basePath, structure.name);
  
  // Criar a pasta principal
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
    console.log(`✅ Pasta criada: ${folderPath}`);
  }

  // Criar arquivo README.md com informações da pasta
  if (structure.description) {
    const readmePath = path.join(folderPath, 'README.md');
    let readmeContent = `# ${structure.name}\n\n${structure.description}\n\n`;
    
    if (structure.allowedFileTypes) {
      const fileTypesStr = structure.allowedFileTypes.join(', ');
      readmeContent += `\n## Tipos de arquivos permitidos:\n- ${fileTypesStr}\n`;
    }
    
    fs.writeFileSync(readmePath, readmeContent);
    console.log(`📝 README criado: ${readmePath}`);
  }

  // Criar subpastas recursivamente
  if (structure.subFolders) {
    structure.subFolders.forEach(subFolder => {
      createFolder(folderPath, subFolder);
    });
  }
}

export function createClientFolderStructure(basePath: string) {
  console.log('🚀 Iniciando criação da estrutura de pastas...\n');
  
  // Criar pasta base do cliente
  const clientBasePath = path.join(basePath, 'client-files');
  if (!fs.existsSync(clientBasePath)) {
    fs.mkdirSync(clientBasePath, { recursive: true });
    console.log(`📁 Pasta base do cliente criada: ${clientBasePath}\n`);
  }

  // Criar todas as pastas da estrutura
  clientFolderStructure.forEach(folder => {
    createFolder(clientBasePath, folder);
  });

  console.log('\n✨ Estrutura de pastas criada com sucesso!');
} 