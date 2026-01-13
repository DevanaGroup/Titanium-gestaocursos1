// Utilidades para processamento de arquivos

export interface ProcessedFile {
  name: string;
  content: string;
  type: string;
  size: number;
  originalSize?: number;
  compressed?: boolean;
  file: File; // Arquivo original para upload para Tess Pareto
}

/**
 * Converte um arquivo para base64
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Processa um arquivo para envio
 */
export const processFile = async (file: File): Promise<ProcessedFile> => {
  const content = await fileToBase64(file);
  
  return {
    name: file.name,
    content,
    type: file.type,
    size: file.size,
    originalSize: file.size,
    compressed: false,
    file: file // Manter referência ao arquivo original
  };
};

/**
 * Processa múltiplos arquivos
 */
export const processFiles = async (files: File[]): Promise<ProcessedFile[]> => {
  const processedFiles: ProcessedFile[] = [];
  
  for (const file of files) {
    try {
      const processed = await processFile(file);
      processedFiles.push(processed);
    } catch (error) {
      console.error(`Erro ao processar arquivo ${file.name}:`, error);
      throw new Error(`Erro ao processar arquivo ${file.name}`);
    }
  }
  
  return processedFiles;
};

/**
 * Valida tipo de arquivo
 */
export const validateFileType = (file: File, allowedTypes: string[]): boolean => {
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  const mimeType = file.type.toLowerCase();
  
  return allowedTypes.some(type => {
    const cleanType = type.replace('.', '').toLowerCase();
    return fileExtension === cleanType || mimeType.includes(cleanType);
  });
};

/**
 * Valida tamanho do arquivo
 */
export const validateFileSize = (file: File, maxSizeMB: number): boolean => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
};

/**
 * Formata tamanho do arquivo
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Obtém informações do arquivo
 */
export const getFileInfo = (file: File) => {
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: new Date(file.lastModified),
    extension: file.name.split('.').pop()?.toLowerCase() || '',
    sizeFormatted: formatFileSize(file.size)
  };
};

/**
 * Trunca conteúdo base64 para logs (para não sobrecarregar o console)
 */
export const truncateBase64ForLog = (content: string, maxLength: number = 100): string => {
  if (content.length <= maxLength) return content;
  
  const prefix = content.substring(0, 50);
  const suffix = content.substring(content.length - 50);
  
  return `${prefix}...${suffix}`;
}; 