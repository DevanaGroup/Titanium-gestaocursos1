import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc,
  query, 
  orderBy, 
  where,
  serverTimestamp,
  Timestamp,
  getDoc
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { ExpenseRequest, ExpenseRequestStats, ExpenseAttachment } from "@/types";

const COLLECTION_NAME = "expenseRequests";

// Função para gerar protocolo único
const generateProtocol = (): string => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const time = Date.now().toString().slice(-6);
  
  return `EXP${year}${month}${day}${time}`;
};

// Converter Timestamp do Firebase para Date
const timestampToDate = (timestamp: any): Date => {
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  return new Date(timestamp);
};

// Converter Date para Timestamp
const dateToTimestamp = (date: Date) => {
  return Timestamp.fromDate(date);
};

// Converter dados de viagem para o formato do Firestore
const convertTravelDetailsForFirestore = (travelDetails: any) => {
  if (!travelDetails) return null;
  
  return {
    ...travelDetails,
    startDate: travelDetails.startDate ? dateToTimestamp(travelDetails.startDate) : null,
    endDate: travelDetails.endDate ? dateToTimestamp(travelDetails.endDate) : null
  };
};

// Converter dados de recorrência para o formato do Firestore
const convertRecurringDetailsForFirestore = (recurringDetails: any) => {
  if (!recurringDetails) return null;
  
  const converted: any = {
    ...recurringDetails
  };
  
  // Só adicionar endDate se existir
  if (recurringDetails.endDate) {
    converted.endDate = dateToTimestamp(recurringDetails.endDate);
  }
  
  return converted;
};

// Converter dados de viagem do Firestore para o formato da aplicação
const convertTravelDetailsFromFirestore = (travelDetails: any) => {
  if (!travelDetails) return undefined;
  
  return {
    ...travelDetails,
    startDate: travelDetails.startDate ? timestampToDate(travelDetails.startDate) : undefined,
    endDate: travelDetails.endDate ? timestampToDate(travelDetails.endDate) : undefined
  };
};

// Converter dados de recorrência do Firestore para o formato da aplicação
const convertRecurringDetailsFromFirestore = (recurringDetails: any) => {
  if (!recurringDetails) return undefined;
  
  return {
    ...recurringDetails,
    endDate: recurringDetails.endDate ? timestampToDate(recurringDetails.endDate) : undefined
  };
};

// Converter anexos do Firestore para o formato da aplicação
const convertAttachmentsFromFirestore = (attachments: any[]): ExpenseAttachment[] => {
  if (!attachments || !Array.isArray(attachments)) return [];
  
  return attachments.map(attachment => ({
    ...attachment,
    uploadedAt: attachment.uploadedAt ? timestampToDate(attachment.uploadedAt) : new Date()
  }));
};

// Criar nova solicitação
export const createExpenseRequest = async (requestData: Omit<ExpenseRequest, 'id' | 'protocol' | 'createdAt' | 'updatedAt' | 'status'>): Promise<string> => {
  try {
    const protocol = generateProtocol();
    
    const docData: any = {
      ...requestData,
      protocol,
      status: 'Em análise' as const,
      expectedDate: dateToTimestamp(requestData.expectedDate),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // Adicionar campos opcionais apenas se existirem e não forem undefined
    if (requestData.travelDetails && Object.keys(requestData.travelDetails).length > 0) {
      const convertedTravelDetails = convertTravelDetailsForFirestore(requestData.travelDetails);
      if (convertedTravelDetails) {
        docData.travelDetails = convertedTravelDetails;
      }
    }

    if (requestData.recurringDetails && Object.keys(requestData.recurringDetails).length > 0) {
      const convertedRecurringDetails = convertRecurringDetailsForFirestore(requestData.recurringDetails);
      if (convertedRecurringDetails) {
        docData.recurringDetails = convertedRecurringDetails;
      }
    }

    // Remover qualquer campo undefined ou null do objeto final
    const cleanedDocData = Object.fromEntries(
      Object.entries(docData).filter(([_, value]) => value !== undefined && value !== null)
    );

    const docRef = await addDoc(collection(db, COLLECTION_NAME), cleanedDocData);
    return docRef.id;
  } catch (error) {
    console.error("Erro ao criar solicitação de despesa:", error);
    throw error;
  }
};

// Buscar todas as solicitações (para gestores)
export const getAllExpenseRequests = async (): Promise<ExpenseRequest[]> => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      
      return {
        id: doc.id,
        ...data,
        expectedDate: timestampToDate(data.expectedDate),
        createdAt: timestampToDate(data.createdAt),
        updatedAt: timestampToDate(data.updatedAt),
        reviewedAt: data.reviewedAt ? timestampToDate(data.reviewedAt) : undefined,
        paidAt: data.paidAt ? timestampToDate(data.paidAt) : undefined,
        travelDetails: convertTravelDetailsFromFirestore(data.travelDetails),
        recurringDetails: convertRecurringDetailsFromFirestore(data.recurringDetails),
        attachments: convertAttachmentsFromFirestore(data.attachments)
      } as ExpenseRequest;
    });
  } catch (error) {
    console.error("Erro ao buscar solicitações:", error);
    throw error;
  }
};

// Buscar solicitações por usuário
export const getExpenseRequestsByUser = async (userId: string): Promise<ExpenseRequest[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME), 
      where("requesterId", "==", userId)
      // Temporariamente removendo orderBy para teste
      // orderBy("createdAt", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    
    const requests = querySnapshot.docs.map(doc => {
      const data = doc.data();
      
      return {
        id: doc.id,
        ...data,
        expectedDate: timestampToDate(data.expectedDate),
        createdAt: timestampToDate(data.createdAt),
        updatedAt: timestampToDate(data.updatedAt),
        reviewedAt: data.reviewedAt ? timestampToDate(data.reviewedAt) : undefined,
        paidAt: data.paidAt ? timestampToDate(data.paidAt) : undefined,
        travelDetails: convertTravelDetailsFromFirestore(data.travelDetails),
        recurringDetails: convertRecurringDetailsFromFirestore(data.recurringDetails),
        attachments: convertAttachmentsFromFirestore(data.attachments)
      } as ExpenseRequest;
    });
    
    // Ordenar no lado cliente temporariamente
    requests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    return requests;
  } catch (error) {
    console.error("❌ Erro ao buscar solicitações do usuário:", error);
    throw error;
  }
};

// Aprovar solicitação
export const approveExpenseRequest = async (
  requestId: string, 
  reviewerId: string,
  reviewerName: string,
  comments?: string
): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, requestId);
    await updateDoc(docRef, {
      status: 'Aprovado',
      reviewedBy: reviewerId,
      reviewedByName: reviewerName,
      reviewedAt: serverTimestamp(),
      reviewComments: comments || '',
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Erro ao aprovar solicitação:", error);
    throw error;
  }
};

// Reprovar solicitação
export const rejectExpenseRequest = async (
  requestId: string, 
  reviewerId: string,
  reviewerName: string,
  comments: string
): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, requestId);
    await updateDoc(docRef, {
      status: 'Reprovado',
      reviewedBy: reviewerId,
      reviewedByName: reviewerName,
      reviewedAt: serverTimestamp(),
      reviewComments: comments,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Erro ao reprovar solicitação:", error);
    throw error;
  }
};

// Marcar como pago
export const markAsPaid = async (
  requestId: string,
  payerId: string,
  payerName: string,
  paymentMethod: ExpenseRequest['paymentMethod']
): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, requestId);
    await updateDoc(docRef, {
      paidAt: serverTimestamp(),
      paidBy: payerId,
      paidByName: payerName,
      paymentMethod: paymentMethod,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Erro ao marcar como pago:", error);
    throw error;
  }
};

// Cancelar solicitação
export const cancelExpenseRequest = async (requestId: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, requestId);
    await updateDoc(docRef, {
      status: 'Cancelado',
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Erro ao cancelar solicitação:", error);
    throw error;
  }
};

// Buscar solicitação por ID
export const getExpenseRequestById = async (requestId: string): Promise<ExpenseRequest | null> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, requestId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        expectedDate: timestampToDate(data.expectedDate),
        createdAt: timestampToDate(data.createdAt),
        updatedAt: timestampToDate(data.updatedAt),
        reviewedAt: data.reviewedAt ? timestampToDate(data.reviewedAt) : undefined,
        paidAt: data.paidAt ? timestampToDate(data.paidAt) : undefined,
        travelDetails: convertTravelDetailsFromFirestore(data.travelDetails),
        recurringDetails: convertRecurringDetailsFromFirestore(data.recurringDetails),
        attachments: convertAttachmentsFromFirestore(data.attachments)
      } as ExpenseRequest;
    }
    
    return null;
  } catch (error) {
    console.error("Erro ao buscar solicitação:", error);
    throw error;
  }
};

// Obter estatísticas das solicitações
export const getExpenseRequestStats = async (userId?: string): Promise<ExpenseRequestStats> => {
  try {
    let q;
    if (userId) {
      q = query(collection(db, COLLECTION_NAME), where("requesterId", "==", userId));
    } else {
      q = query(collection(db, COLLECTION_NAME));
    }
    
    const querySnapshot = await getDocs(q);
    const requests = querySnapshot.docs.map(doc => doc.data() as ExpenseRequest);
    
    const stats: ExpenseRequestStats = {
      total: requests.length,
      pending: requests.filter(r => r.status === 'Em análise').length,
      approved: requests.filter(r => r.status === 'Aprovado').length,
      rejected: requests.filter(r => r.status === 'Reprovado').length,
      totalAmount: requests.reduce((sum, r) => sum + r.amount, 0),
      approvedAmount: requests.filter(r => r.status === 'Aprovado').reduce((sum, r) => sum + r.amount, 0),
      pendingAmount: requests.filter(r => r.status === 'Em análise').reduce((sum, r) => sum + r.amount, 0),
    };
    
    return stats;
  } catch (error) {
    console.error("Erro ao obter estatísticas:", error);
    throw error;
  }
};

// Atualizar solicitação
export const updateExpenseRequest = async (
  requestId: string, 
  updateData: Partial<ExpenseRequest>
): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, requestId);
    const dataToUpdate = { ...updateData };
    
    // Converter dates para timestamps se necessário
    if (dataToUpdate.expectedDate) {
      dataToUpdate.expectedDate = dateToTimestamp(dataToUpdate.expectedDate) as any;
    }
    
    dataToUpdate.updatedAt = serverTimestamp() as any;
    
    await updateDoc(docRef, dataToUpdate);
  } catch (error) {
    console.error("Erro ao atualizar solicitação:", error);
    throw error;
  }
};

// Deletar solicitação
export const deleteExpenseRequest = async (requestId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, requestId));
  } catch (error) {
    console.error("Erro ao deletar solicitação:", error);
    throw error;
  }
};

// Atualizar anexos de uma solicitação
export const updateExpenseRequestAttachments = async (
  requestId: string, 
  attachments: ExpenseAttachment[]
): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, requestId);
    await updateDoc(docRef, {
      attachments: attachments,
      updatedAt: serverTimestamp()
    });
    console.log("✅ Anexos atualizados com sucesso para a solicitação:", requestId);
  } catch (error) {
    console.error("Erro ao atualizar anexos:", error);
    throw error;
  }
};

// Função de teste para verificar acesso à coleção
export const testCollectionAccess = async (): Promise<number> => {
  try {
    const q = query(collection(db, COLLECTION_NAME));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.length;
  } catch (error) {
    console.error("❌ Erro ao acessar coleção:", error);
    throw error;
  }
}; 