import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "@/config/firebase";
import { ExpenseAttachment } from "@/types";

const STORAGE_PATH = "expense-attachments";

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
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Validar arquivo
export const validateFile = (file: File): { isValid: boolean; error?: string } => {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: "Tipo de arquivo não permitido. Use: JPG, PNG, PDF, DOC, DOCX, XLS, XLSX"
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

// Upload de arquivo único
export const uploadExpenseAttachment = async (
  file: File,
  requestId: string,
  userId: string
): Promise<ExpenseAttachment> => {
  try {
    // Validar arquivo
    const validation = validateFile(file);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Gerar nome único para o arquivo
    const fileExtension = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
    const filePath = `${STORAGE_PATH}/${userId}/${requestId}/${fileName}`;

    // Upload para Firebase Storage
    const storageRef = ref(storage, filePath);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    // Retornar informações do anexo
    const attachment: ExpenseAttachment = {
      id: fileName,
      name: file.name,
      url: downloadURL,
      type: file.type,
      size: file.size,
      uploadedAt: new Date()
    };

    return attachment;
  } catch (error) {
    console.error("Erro ao fazer upload do arquivo:", error);
    throw error;
  }
};

// Upload de múltiplos arquivos
export const uploadMultipleAttachments = async (
  files: File[],
  requestId: string,
  userId: string,
  onProgress?: (progress: number) => void
): Promise<ExpenseAttachment[]> => {
  const attachments: ExpenseAttachment[] = [];
  const totalFiles = files.length;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const attachment = await uploadExpenseAttachment(file, requestId, userId);
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
export const deleteExpenseAttachment = async (
  attachment: ExpenseAttachment,
  requestId: string,
  userId: string
): Promise<void> => {
  try {
    const filePath = `${STORAGE_PATH}/${userId}/${requestId}/${attachment.id}`;
    const storageRef = ref(storage, filePath);
    await deleteObject(storageRef);
  } catch (error) {
    console.error("Erro ao deletar arquivo:", error);
    throw error;
  }
};

// Deletar todos os anexos de uma solicitação
export const deleteAllRequestAttachments = async (
  attachments: ExpenseAttachment[],
  requestId: string,
  userId: string
): Promise<void> => {
  const deletePromises = attachments.map(attachment =>
    deleteExpenseAttachment(attachment, requestId, userId)
  );

  try {
    await Promise.all(deletePromises);
  } catch (error) {
    console.error("Erro ao deletar anexos:", error);
    // Não lançar erro para não bloquear outras operações
  }
};

// Obter URL temporária para visualização
export const getTemporaryViewUrl = async (filePath: string): Promise<string> => {
  try {
    const storageRef = ref(storage, filePath);
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error("Erro ao obter URL temporária:", error);
    throw error;
  }
};

// Utilitário para formatar tamanho do arquivo
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Utilitário para obter ícone do tipo de arquivo
export const getFileTypeIcon = (mimeType: string): string => {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType.includes('word')) return '📝';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
  return '📎';
}; 