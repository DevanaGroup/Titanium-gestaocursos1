import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "@/config/firebase";

const STORAGE_PATH = "process-attachments";

// Interface para anexos de trâmites
export interface ProcessAttachment {
  id: string;
  name: string;
  originalName: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: Date;
  uploadedBy: string;
  uploadedByName: string;
}

// Tipos de arquivo permitidos
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Validar arquivo
export const validateFile = (file: File): { isValid: boolean; error?: string } => {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: "Tipo de arquivo não permitido. Use: JPG, PNG, PDF, DOC, DOCX, XLS, XLSX, TXT"
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: "Arquivo muito grande. Tamanho máximo: 10MB"
    };
  }

  return { isValid: true };
};

// Upload de arquivo único para trâmite
export const uploadProcessAttachment = async (
  file: File,
  taskId: string,
  stepId: string,
  userId: string,
  userName: string
): Promise<ProcessAttachment> => {
  try {
    // Validar arquivo
    const validation = validateFile(file);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Gerar nome único para o arquivo
    const fileExtension = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
    const filePath = `${STORAGE_PATH}/${taskId}/${stepId}/${fileName}`;

    // Upload para Firebase Storage
    const storageRef = ref(storage, filePath);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    // Retornar informações do anexo
    const attachment: ProcessAttachment = {
      id: fileName,
      name: fileName,
      originalName: file.name,
      url: downloadURL,
      type: file.type,
      size: file.size,
      uploadedAt: new Date(),
      uploadedBy: userId,
      uploadedByName: userName
    };

    return attachment;
  } catch (error) {
    console.error("Erro ao fazer upload do arquivo:", error);
    throw error;
  }
};

// Upload de múltiplos arquivos
export const uploadMultipleProcessAttachments = async (
  files: File[],
  taskId: string,
  stepId: string,
  userId: string,
  userName: string,
  onProgress?: (progress: number) => void
): Promise<ProcessAttachment[]> => {
  const attachments: ProcessAttachment[] = [];
  const totalFiles = files.length;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const attachment = await uploadProcessAttachment(file, taskId, stepId, userId, userName);
      attachments.push(attachment);
      
      // Callback de progresso
      if (onProgress) {
        onProgress(((i + 1) / totalFiles) * 100);
      }
    } catch (error) {
      console.error(`Erro ao fazer upload do arquivo ${file.name}:`, error);
      // Continuar com os outros arquivos mesmo se um falhar
    }
  }

  return attachments;
};

// Deletar anexo
export const deleteProcessAttachment = async (
  attachment: ProcessAttachment,
  taskId: string,
  stepId: string
): Promise<void> => {
  try {
    const filePath = `${STORAGE_PATH}/${taskId}/${stepId}/${attachment.id}`;
    const storageRef = ref(storage, filePath);
    await deleteObject(storageRef);
  } catch (error) {
    console.error("Erro ao deletar arquivo:", error);
    throw error;
  }
};

// Converter FileUpload para File para upload
export const convertFileUploadsToFiles = (fileUploads: any[]): File[] => {
  return fileUploads.map(fileUpload => fileUpload.file).filter(Boolean);
}; 