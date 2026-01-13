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
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { FinancialClient, MonthlyBalance, BalanceExpense, Client } from '@/types';
import { differenceInDays, addDays } from 'date-fns';

const FINANCIAL_CLIENTS_COLLECTION = 'financialClients';
const MONTHLY_BALANCES_COLLECTION = 'monthlyBalances';
const CLIENTS_COLLECTION = 'clients';

// Converter Timestamp do Firestore para Date
const timestampToDate = (timestamp: any): Date => {
  try {
    if (!timestamp) {
      return new Date();
    }
    
    if (timestamp && timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    
    if (timestamp instanceof Date) {
      return timestamp;
    }
    
    // Tentar converter como string/número
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      console.warn("⚠️ Timestamp inválido, usando data atual:", timestamp);
      return new Date();
    }
    
    return date;
  } catch (error) {
    console.error("❌ Erro ao converter timestamp:", error, "Valor:", timestamp);
    return new Date();
  }
};

// Converter Date para Timestamp do Firestore
const dateToTimestamp = (date: Date): Timestamp => {
  return Timestamp.fromDate(date);
};

// Função para testar conectividade com Firebase
const testFirebaseConnection = async (): Promise<void> => {
  try {
    console.log("🔌 Testando conectividade com Firebase...");
    
    // Tentar uma consulta simples
    const testQuery = query(collection(db, CLIENTS_COLLECTION));
    const snapshot = await getDocs(testQuery);
    
    console.log("✅ Firebase conectado com sucesso!");
    console.log(`📊 Teste: ${snapshot.docs.length} documentos encontrados na coleção clients`);
    
    // Mostrar dados de um cliente para debug
    if (snapshot.docs.length > 0) {
      const firstClient = snapshot.docs[0];
      console.log("👤 Primeiro cliente (amostra):", {
        id: firstClient.id,
        data: firstClient.data()
      });
    }
    
  } catch (error) {
    console.error("❌ Erro de conectividade Firebase:", error);
    throw new Error(`Falha na conexão com Firebase: ${error}`);
  }
};

// Buscar todos os clientes com dados financeiros combinados
export const getAllClientsWithFinancialData = async (): Promise<FinancialClient[]> => {
  try {
    console.log("🔄 Iniciando busca de clientes com dados financeiros...");
    
    // Testar conectividade primeiro
    await testFirebaseConnection();
    
    // Buscar todos os clientes da coleção "clients"
    console.log("📋 Buscando clientes da coleção 'clients'...");
    const clientsSnapshot = await getDocs(collection(db, CLIENTS_COLLECTION));
    
    console.log(`📋 Encontrados ${clientsSnapshot.docs.length} clientes na coleção "clients"`);
    
    if (clientsSnapshot.empty) {
      console.warn("⚠️ Nenhum cliente encontrado na coleção 'clients'");
      return [];
    }
    
    // Para debug, mostrar alguns clientes encontrados
    console.log("🔍 Primeiros clientes encontrados:", clientsSnapshot.docs.slice(0, 3).map(doc => ({
      id: doc.id,
      name: doc.data().name,
      project: doc.data().project
    })));
    
    // Buscar todos os dados financeiros
    console.log("💰 Buscando dados financeiros...");
    const financialQuery = query(collection(db, FINANCIAL_CLIENTS_COLLECTION));
    const financialSnapshot = await getDocs(financialQuery);
    
    console.log(`💰 Encontrados ${financialSnapshot.docs.length} registros financeiros`);
    
    // Criar mapa de dados financeiros por originalClientId
    const financialDataMap = new Map();
    financialSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const key = data.originalClientId || data.name; // Fallback para nome se não tiver originalClientId
      financialDataMap.set(key, { id: doc.id, ...data });
    });
    
    console.log(`🗺️ Mapa de dados financeiros criado com ${financialDataMap.size} entradas`);
    
    // Combinar clientes com dados financeiros
    const combinedClients: FinancialClient[] = [];
    
    for (const clientDoc of clientsSnapshot.docs) {
      try {
        const clientData = clientDoc.data();
        const financialData = financialDataMap.get(clientDoc.id);
        
        console.log(`👤 Processando cliente: ${clientData.name || 'Sem nome'}`, {
          clientId: clientDoc.id,
          hasFinancialData: !!financialData
        });
        
        if (financialData) {
          // Cliente tem dados financeiros - VALIDAR SE O DOCUMENTO REALMENTE EXISTE
          console.log(`✅ Cliente ${clientData.name} tem dados financeiros - Validando existência...`);
          
          // Verificar se o documento financeiro realmente existe
          try {
            const docRef = doc(db, FINANCIAL_CLIENTS_COLLECTION, financialData.id);
            const docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) {
              console.warn(`⚠️ ATENÇÃO: Dados financeiros referenciados não existem para ${clientData.name}. ID: ${financialData.id}`);
              // Tratar como cliente sem dados financeiros
              const client: FinancialClient = {
                id: `temp-${clientDoc.id}`,
                originalClientId: clientDoc.id,
                name: clientData.name || "Nome não informado",
                monthlyValue: 0,
                dueDate: 1,
                contractStartDate: new Date(),
                contractEndDate: undefined,
                contractType: 'Recorrente',
                contractTerm: '1 ano',
                billingType: 'Mensal',
                status: 'Sem dados financeiros',
                lastPaymentDate: undefined,
                assignedTo: clientData.assignedTo || "",
                contactInfo: {
                  email: clientData.email || "",
                  phone: clientData.phone || "",
                  address: clientData.address || ""
                },
                project: clientData.project || "Projeto não informado",
                clientStatus: clientData.status || "Status não informado",
                contactName: clientData.contactName || "",
                cpf: clientData.cpf || "",
                cnpj: clientData.cnpj || "",
                createdAt: timestampToDate(clientData.createdAt || new Date()),
                updatedAt: timestampToDate(clientData.updatedAt || new Date()),
                invoiceRequired: false
              };
              combinedClients.push(client);
              continue;
            }
            
            console.log(`✅ Documento financeiro verificado e existe para ${clientData.name}`);
          } catch (validationError) {
            console.error(`❌ Erro ao validar documento financeiro para ${clientData.name}:`, validationError);
            // Em caso de erro, tratar como sem dados financeiros
            const client: FinancialClient = {
              id: `temp-${clientDoc.id}`,
              originalClientId: clientDoc.id,
              name: clientData.name || "Nome não informado",
              monthlyValue: 0,
              dueDate: 1,
              contractStartDate: new Date(),
              contractEndDate: undefined,
              contractType: 'Recorrente',
              contractTerm: '1 ano',
              billingType: 'Mensal',
              status: 'Sem dados financeiros',
              lastPaymentDate: undefined,
              assignedTo: clientData.assignedTo || "",
              contactInfo: {
                email: clientData.email || "",
                phone: clientData.phone || "",
                address: clientData.address || ""
              },
              project: clientData.project || "Projeto não informado",
              clientStatus: clientData.status || "Status não informado",
              contactName: clientData.contactName || "",
              cpf: clientData.cpf || "",
              cnpj: clientData.cnpj || "",
              createdAt: timestampToDate(clientData.createdAt || new Date()),
              updatedAt: timestampToDate(clientData.updatedAt || new Date()),
              invoiceRequired: false
            };
            combinedClients.push(client);
            continue;
          }
          
          const client: FinancialClient = {
            id: financialData.id,
            originalClientId: clientDoc.id,
            name: clientData.name || "Nome não informado",
            monthlyValue: financialData.monthlyValue || 0,
            dueDate: financialData.dueDate || 1,
            contractStartDate: timestampToDate(financialData.contractStartDate || new Date()),
            contractEndDate: financialData.contractEndDate ? timestampToDate(financialData.contractEndDate) : undefined,
            contractType: financialData.contractType || 'Recorrente',
            contractTerm: financialData.contractTerm || '1 ano',
            billingType: financialData.billingType || 'Mensal',
            status: financialData.status || 'Ativo',
            lastPaymentDate: financialData.lastPaymentDate ? timestampToDate(financialData.lastPaymentDate) : undefined,
            assignedTo: clientData.assignedTo || "",
            contactInfo: financialData.contactInfo || {
              email: clientData.email || "",
              phone: clientData.phone || "",
              address: clientData.address || ""
            },
            project: clientData.project || "Projeto não informado",
            clientStatus: clientData.status || "Status não informado",
            contactName: clientData.contactName || "",
            cpf: clientData.cpf || "",
            cnpj: clientData.cnpj || "",
            createdAt: timestampToDate(clientData.createdAt || new Date()),
            updatedAt: timestampToDate(financialData.updatedAt || clientData.updatedAt || new Date()),
            invoiceRequired: financialData.invoiceRequired || false
          };
          
          combinedClients.push(client);
        } else {
          // Cliente sem dados financeiros
          console.log(`⚠️ Cliente ${clientData.name} SEM dados financeiros`);
          
          const client: FinancialClient = {
            id: `temp-${clientDoc.id}`, // ID temporário
            originalClientId: clientDoc.id,
            name: clientData.name || "Nome não informado",
            monthlyValue: 0,
            dueDate: 1,
            contractStartDate: new Date(),
            contractEndDate: undefined,
            contractType: 'Recorrente',
            contractTerm: '1 ano',
            billingType: 'Mensal',
            status: 'Sem dados financeiros',
            lastPaymentDate: undefined,
            assignedTo: clientData.assignedTo || "",
            contactInfo: {
              email: clientData.email || "",
              phone: clientData.phone || "",
              address: clientData.address || ""
            },
            project: clientData.project || "Projeto não informado",
            clientStatus: clientData.status || "Status não informado",
            contactName: clientData.contactName || "",
            cpf: clientData.cpf || "",
            cnpj: clientData.cnpj || "",
            createdAt: timestampToDate(clientData.createdAt || new Date()),
            updatedAt: timestampToDate(clientData.updatedAt || new Date()),
            invoiceRequired: false
          };
          
          combinedClients.push(client);
        }
      } catch (clientError) {
        console.error(`❌ Erro ao processar cliente individual:`, clientError);
        // Continuar com o próximo cliente
      }
    }
    
    console.log(`🎯 Total de clientes processados: ${combinedClients.length}`);
    console.log("📊 Resumo dos clientes:", combinedClients.map(c => ({
      name: c.name,
      status: c.status,
      project: c.project
    })));
    
    return combinedClients;
    
  } catch (error) {
    console.error("❌ Erro detalhado ao buscar clientes com dados financeiros:", error);
    
    // Log mais detalhado do erro
    if (error instanceof Error) {
      console.error("Mensagem do erro:", error.message);
      console.error("Stack trace:", error.stack);
    }
    
    // Tentar retornar pelo menos os clientes básicos em caso de erro
    try {
      console.log("🔄 Tentando buscar apenas clientes básicos como fallback...");
      const clientsQuery = query(collection(db, CLIENTS_COLLECTION));
      const clientsSnapshot = await getDocs(clientsQuery);
      
      const basicClients: FinancialClient[] = clientsSnapshot.docs.map(clientDoc => {
        const clientData = clientDoc.data();
        return {
          id: `temp-${clientDoc.id}`,
          originalClientId: clientDoc.id,
          name: clientData.name || "Nome não informado",
          monthlyValue: 0,
          dueDate: 1,
          contractStartDate: new Date(),
          contractEndDate: undefined,
          contractType: 'Recorrente',
          billingType: 'Mensal',
          status: 'Sem dados financeiros',
          lastPaymentDate: undefined,
          assignedTo: clientData.assignedTo || "",
          contactInfo: {
            email: clientData.email || "",
            phone: clientData.phone || "",
            address: clientData.address || ""
          },
          project: clientData.project || "Projeto não informado",
          clientStatus: clientData.status || "Status não informado",
          contactName: clientData.contactName || "",
          cpf: clientData.cpf || "",
          cnpj: clientData.cnpj || "",
          createdAt: timestampToDate(clientData.createdAt || new Date()),
          updatedAt: timestampToDate(clientData.updatedAt || new Date()),
          invoiceRequired: false
        };
      });
      
      console.log(`✅ Fallback: ${basicClients.length} clientes básicos carregados`);
      return basicClients;
      
    } catch (fallbackError) {
      console.error("❌ Erro no fallback também:", fallbackError);
      
      // Como último recurso, retornar clientes fictícios para debug
      console.log("🚨 Retornando clientes fictícios para debug");
      return [
        {
          id: "debug-1",
          originalClientId: "debug-client-1",
          name: "Cliente Teste 1",
          monthlyValue: 5000,
          dueDate: 15,
          contractStartDate: new Date(),
          contractType: 'Recorrente',
          billingType: 'Mensal',
          status: 'Sem dados financeiros',
          assignedTo: "",
          contactInfo: { email: "teste@email.com", phone: "(11) 99999-9999", address: "" },
          project: "Projeto de Teste",
          clientStatus: "Em andamento",
          contactName: "Contato Teste",
          cpf: "",
          cnpj: "",
          createdAt: new Date(),
          updatedAt: new Date(),
          invoiceRequired: false
        },
        {
          id: "debug-2",
          originalClientId: "debug-client-2",
          name: "Cliente Teste 2",
          monthlyValue: 3000,
          dueDate: 10,
          contractStartDate: new Date(),
          contractType: 'Recorrente',
          billingType: 'Mensal',
          status: 'Sem dados financeiros',
          assignedTo: "",
          contactInfo: { email: "teste2@email.com", phone: "(11) 88888-8888", address: "" },
          project: "Outro Projeto",
          clientStatus: "Em análise",
          contactName: "Outro Contato",
          cpf: "",
          cnpj: "",
          createdAt: new Date(),
          updatedAt: new Date(),
          invoiceRequired: false
        }
      ];
    }
  }
};

// Criar ou atualizar dados financeiros para um cliente
export const saveFinancialData = async (
  originalClientId: string,
  financialData: {
    monthlyValue: number;
    dueDate: number;
    contractStartDate: Date;
    contractEndDate?: Date;
    contractType: 'Recorrente' | 'Pontual';
    billingType: 'Mensal' | 'Anual' | 'Trimestral' | 'Semestral' | 'Único';
    status?: 'Ativo' | 'Inativo' | 'Inadimplente' | 'Suspenso';
  }
): Promise<void> => {
  try {
    // Verificar se já existe dados financeiros para este cliente
    const existingQuery = query(
      collection(db, FINANCIAL_CLIENTS_COLLECTION),
      where("originalClientId", "==", originalClientId)
    );
    const existingSnapshot = await getDocs(existingQuery);
    
    const now = new Date();
    const dataToSave = {
      originalClientId,
      monthlyValue: financialData.monthlyValue,
      dueDate: financialData.dueDate,
      contractStartDate: dateToTimestamp(financialData.contractStartDate),
      contractEndDate: financialData.contractEndDate ? dateToTimestamp(financialData.contractEndDate) : null,
      contractType: financialData.contractType,
      billingType: financialData.billingType,
      status: financialData.status || 'Ativo',
      updatedAt: dateToTimestamp(now)
    };
    
    if (!existingSnapshot.empty) {
      // Atualizar dados existentes
      const docRef = existingSnapshot.docs[0].ref;
      await updateDoc(docRef, dataToSave);
    } else {
      // Criar novos dados financeiros
      await addDoc(collection(db, FINANCIAL_CLIENTS_COLLECTION), {
        ...dataToSave,
        createdAt: dateToTimestamp(now)
      });
    }
  } catch (error) {
    console.error("Erro ao salvar dados financeiros:", error);
    throw error;
  }
};

// Buscar clientes existentes da coleção "clients"
export const getExistingClients = async (): Promise<Client[]> => {
  try {
    const q = query(collection(db, CLIENTS_COLLECTION), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        project: data.project,
        status: data.status,
        contactName: data.contactName || "",
        email: data.email || "",
        phone: data.phone || "",
        address: data.address || "",
        createdAt: timestampToDate(data.createdAt),
        updatedAt: timestampToDate(data.updatedAt),
        documents: data.documents || [],
        assignedTo: data.assignedTo || "",
        assignedToName: data.assignedToName || ""
      };
    });
  } catch (error) {
    console.error("Erro ao buscar clientes existentes:", error);
    throw error;
  }
};

// Criar dados financeiros para um cliente existente
export const createFinancialDataForExistingClient = async (
  clientId: string, 
  financialData: {
    monthlyValue: number;
    dueDate: number;
    contractStartDate: Date;
    contractEndDate?: Date;
    contractType: 'Recorrente' | 'Pontual';
    billingType?: 'Mensal' | 'Anual' | 'Trimestral' | 'Semestral' | 'Único';
  }
): Promise<FinancialClient> => {
  try {
    // Buscar dados do cliente existente
    const clientRef = doc(db, CLIENTS_COLLECTION, clientId);
    const clientSnap = await getDoc(clientRef);
    
    if (!clientSnap.exists()) {
      throw new Error("Cliente não encontrado");
    }
    
    const clientData = clientSnap.data();
    const now = new Date();
    
    // Criar documento financeiro
    const financialClientData = {
      originalClientId: clientId, // Referência ao cliente original
      name: clientData.name,
      monthlyValue: financialData.monthlyValue,
      dueDate: financialData.dueDate,
      contractStartDate: dateToTimestamp(financialData.contractStartDate),
      contractEndDate: financialData.contractEndDate ? dateToTimestamp(financialData.contractEndDate) : null,
      contractType: financialData.contractType,
      billingType: financialData.billingType || 'Mensal',
      status: 'Ativo' as const,
      lastPaymentDate: null,
      assignedTo: clientData.assignedTo || "",
      contactInfo: {
        email: clientData.email || "",
        phone: clientData.phone || "",
        address: clientData.address || ""
      },
      createdAt: dateToTimestamp(now),
      updatedAt: dateToTimestamp(now)
    };
    
    const docRef = await addDoc(collection(db, FINANCIAL_CLIENTS_COLLECTION), financialClientData);

    return {
      id: docRef.id,
      originalClientId: clientId,
      name: clientData.name,
      monthlyValue: financialData.monthlyValue,
      dueDate: financialData.dueDate,
      contractStartDate: financialData.contractStartDate,
      contractEndDate: financialData.contractEndDate,
      contractType: financialData.contractType,
      billingType: financialData.billingType || 'Mensal',
      status: 'Ativo',
      lastPaymentDate: undefined,
      assignedTo: clientData.assignedTo || "",
      contactInfo: {
        email: clientData.email || "",
        phone: clientData.phone || "",
        address: clientData.address || ""
      },
      project: clientData.project,
      clientStatus: clientData.status,
      contactName: clientData.contactName,
      cpf: clientData.cpf || "",
      cnpj: clientData.cnpj || "",
      createdAt: now,
      updatedAt: now,
      invoiceRequired: false
    };
  } catch (error) {
    console.error("Erro ao criar dados financeiros para cliente existente:", error);
    throw error;
  }
};

// Manter as funções existentes para compatibilidade
export const getFinancialClients = async (): Promise<FinancialClient[]> => {
  return getAllClientsWithFinancialData();
};

// Verificar se um cliente já tem dados financeiros
export const checkIfClientHasFinancialData = async (clientId: string): Promise<boolean> => {
  try {
    const q = query(
      collection(db, FINANCIAL_CLIENTS_COLLECTION),
      where("originalClientId", "==", clientId)
    );
    
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error("Erro ao verificar dados financeiros:", error);
    return false;
  }
};

// Buscar clientes financeiros incluindo os que foram importados
export const getAllFinancialClients = async (): Promise<FinancialClient[]> => {
  return getAllClientsWithFinancialData();
};

export const createFinancialClient = async (clientData: Omit<FinancialClient, 'id' | 'createdAt' | 'updatedAt'>): Promise<FinancialClient> => {
  try {
    const now = new Date();
    const docRef = await addDoc(collection(db, FINANCIAL_CLIENTS_COLLECTION), {
      ...clientData,
      contractStartDate: dateToTimestamp(clientData.contractStartDate),
      contractEndDate: clientData.contractEndDate ? dateToTimestamp(clientData.contractEndDate) : null,
      lastPaymentDate: clientData.lastPaymentDate ? dateToTimestamp(clientData.lastPaymentDate) : null,
      createdAt: dateToTimestamp(now),
      updatedAt: dateToTimestamp(now)
    });

    return {
      ...clientData,
      id: docRef.id,
      createdAt: now,
      updatedAt: now,
      invoiceRequired: false
    };
  } catch (error) {
    console.error("Erro ao criar cliente financeiro:", error);
    throw error;
  }
};

export const updateFinancialClient = async (clientId: string, updates: Partial<Omit<FinancialClient, 'id' | 'createdAt' | 'updatedAt'>>): Promise<FinancialClient> => {
  try {
    const clientRef = doc(db, FINANCIAL_CLIENTS_COLLECTION, clientId);
    const now = new Date();
    
    const updateData: any = {
      ...updates,
      updatedAt: dateToTimestamp(now)
    };
    
    // Converter datas se existirem e forem objetos Date válidos
    if (updates.contractStartDate && updates.contractStartDate instanceof Date) {
      updateData.contractStartDate = dateToTimestamp(updates.contractStartDate);
    }
    if (updates.contractEndDate && updates.contractEndDate instanceof Date) {
      updateData.contractEndDate = dateToTimestamp(updates.contractEndDate);
    }
    if (updates.lastPaymentDate !== undefined) {
      // Se lastPaymentDate for null, undefined ou deleteField(), manter como está
      // Se for um Date válido, converter para timestamp
      if (updates.lastPaymentDate instanceof Date) {
        updateData.lastPaymentDate = dateToTimestamp(updates.lastPaymentDate);
      } else {
        // Para null, undefined ou deleteField(), manter o valor original
        updateData.lastPaymentDate = updates.lastPaymentDate;
      }
    }

    await updateDoc(clientRef, updateData);
    
    // Buscar o documento atualizado
    const updatedDoc = await getDoc(clientRef);
    const data = updatedDoc.data()!;
    
    return {
      id: clientId,
      originalClientId: data.originalClientId || '',
      name: data.name || '',
      monthlyValue: data.monthlyValue || 0,
      dueDate: data.dueDate || 1,
      contractStartDate: timestampToDate(data.contractStartDate),
      contractEndDate: data.contractEndDate ? timestampToDate(data.contractEndDate) : undefined,
      contractType: data.contractType || 'Recorrente',
      billingType: data.billingType || 'Mensal',
      status: data.status || 'Sem dados financeiros',
      lastPaymentDate: data.lastPaymentDate ? timestampToDate(data.lastPaymentDate) : undefined,
      assignedTo: data.assignedTo || '',
      invoiceRequired: data.invoiceRequired || false,
      contactInfo: {
        email: data.contactInfo?.email || '',
        phone: data.contactInfo?.phone || '',
        address: data.contactInfo?.address || ''
      },
      project: data.project || '',
      clientStatus: data.clientStatus || '',
      contactName: data.contactName || '',
      cpf: data.cpf || '',
      cnpj: data.cnpj || '',
      createdAt: timestampToDate(data.createdAt),
      updatedAt: timestampToDate(data.updatedAt)
    };
  } catch (error) {
    console.error("Erro ao atualizar cliente financeiro:", error);
    throw error;
  }
};

export const deleteFinancialClient = async (clientId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, FINANCIAL_CLIENTS_COLLECTION, clientId));
  } catch (error) {
    console.error("Erro ao deletar cliente financeiro:", error);
    throw error;
  }
};

export const markPaymentReceived = async (clientId: string, paymentDate: Date): Promise<void> => {
  try {
    console.log("🔍 Verificando se documento existe:", clientId);
    const clientRef = doc(db, FINANCIAL_CLIENTS_COLLECTION, clientId);
    
    // Verificar se o documento existe antes de atualizar
    const docSnap = await getDoc(clientRef);
    if (!docSnap.exists()) {
      console.error("❌ Documento não encontrado na coleção financialClients:", clientId);
      throw new Error(`Cliente financeiro não encontrado. ID: ${clientId}. Configure os dados financeiros primeiro na aba "Clientes Financeiros".`);
    }
    
    console.log("✅ Documento encontrado, atualizando...");
    await updateDoc(clientRef, {
      lastPaymentDate: dateToTimestamp(paymentDate),
      status: 'Ativo',
      updatedAt: dateToTimestamp(new Date())
    });
    console.log("✅ Pagamento marcado com sucesso!");
  } catch (error) {
    console.error("Erro ao marcar pagamento como recebido:", error);
    throw error;
  }
};

export const markClientAsDefaulting = async (clientId: string): Promise<void> => {
  try {
    console.log("🔍 Verificando se documento existe:", clientId);
    const clientRef = doc(db, FINANCIAL_CLIENTS_COLLECTION, clientId);
    
    // Verificar se o documento existe antes de atualizar
    const docSnap = await getDoc(clientRef);
    if (!docSnap.exists()) {
      console.error("❌ Documento não encontrado na coleção financialClients:", clientId);
      throw new Error(`Cliente financeiro não encontrado. ID: ${clientId}. Configure os dados financeiros primeiro na aba "Clientes Financeiros".`);
    }
    
    console.log("✅ Documento encontrado, marcando como inadimplente...");
    await updateDoc(clientRef, {
      status: 'Inadimplente',
      updatedAt: dateToTimestamp(new Date())
    });
    console.log("✅ Cliente marcado como inadimplente com sucesso!");
  } catch (error) {
    console.error("Erro ao marcar cliente como inadimplente:", error);
    throw error;
  }
};

export const getClientsWithUpcomingDueDates = async (daysAhead: number = 10): Promise<FinancialClient[]> => {
  try {
    const clients = await getAllClientsWithFinancialData();
    const today = new Date();
    
    return clients.filter(client => {
      if (client.status !== 'Ativo') return false;
      
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      let dueDate = new Date(currentYear, currentMonth, client.dueDate);
      
      // Se já passou do vencimento deste mês, calcular para o próximo mês
      if (dueDate < today) {
        dueDate = new Date(currentYear, currentMonth + 1, client.dueDate);
      }
      
      const daysUntilDue = differenceInDays(dueDate, today);
      return daysUntilDue <= daysAhead && daysUntilDue > 0;
    });
  } catch (error) {
    console.error("Erro ao buscar clientes com vencimentos próximos:", error);
    throw error;
  }
};

export const createMonthlyBalance = async (balanceData: Omit<MonthlyBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<MonthlyBalance> => {
  try {
    const now = new Date();
    
    // Converter dados para Firestore
    const firestoreData = {
      ...balanceData,
      expenses: balanceData.expenses.map(expense => ({
        ...expense,
        date: dateToTimestamp(expense.date)
      })),
      clients: balanceData.clients.map(client => ({
        ...client,
        contractStartDate: dateToTimestamp(client.contractStartDate),
        contractEndDate: client.contractEndDate ? dateToTimestamp(client.contractEndDate) : null,
        lastPaymentDate: client.lastPaymentDate ? dateToTimestamp(client.lastPaymentDate) : null,
        createdAt: dateToTimestamp(client.createdAt),
        updatedAt: dateToTimestamp(client.updatedAt)
      })),
      createdAt: dateToTimestamp(now),
      updatedAt: dateToTimestamp(now)
    };
    
    const docRef = await addDoc(collection(db, MONTHLY_BALANCES_COLLECTION), firestoreData);

    return {
      ...balanceData,
      id: docRef.id,
      createdAt: now,
      updatedAt: now
    };
  } catch (error) {
    console.error("Erro ao criar balanço mensal:", error);
    throw error;
  }
};

export const getMonthlyBalance = async (month: number, year: number): Promise<MonthlyBalance | null> => {
  try {
    const q = query(
      collection(db, MONTHLY_BALANCES_COLLECTION),
      where("month", "==", month),
      where("year", "==", year)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    const data = doc.data();
    
    return {
      id: doc.id,
      month: data.month,
      year: data.year,
      totalRevenue: data.totalRevenue,
      totalExpenses: data.totalExpenses,
      netProfit: data.netProfit,
      expenses: data.expenses.map((expense: any) => ({
        ...expense,
        date: timestampToDate(expense.date)
      })),
      clients: data.clients.map((client: any) => ({
        ...client,
        contractStartDate: timestampToDate(client.contractStartDate),
        contractEndDate: client.contractEndDate ? timestampToDate(client.contractEndDate) : undefined,
        lastPaymentDate: client.lastPaymentDate ? timestampToDate(client.lastPaymentDate) : undefined,
        createdAt: timestampToDate(client.createdAt),
        updatedAt: timestampToDate(client.updatedAt)
      })),
      createdAt: timestampToDate(data.createdAt),
      updatedAt: timestampToDate(data.updatedAt)
    };
  } catch (error) {
    console.error("Erro ao buscar balanço mensal:", error);
    throw error;
  }
};

export const addExpenseToBalance = async (month: number, year: number, expense: BalanceExpense): Promise<void> => {
  try {
    const balance = await getMonthlyBalance(month, year);
    
    if (!balance) {
      throw new Error("Balanço do mês não encontrado");
    }
    
    const updatedExpenses = [...balance.expenses, expense];
    const newTotalExpenses = balance.totalExpenses + expense.amount;
    const newNetProfit = balance.totalRevenue - newTotalExpenses;
    
    const balanceRef = doc(db, MONTHLY_BALANCES_COLLECTION, balance.id);
    await updateDoc(balanceRef, {
      expenses: updatedExpenses.map(exp => ({
        ...exp,
        date: dateToTimestamp(exp.date)
      })),
      totalExpenses: newTotalExpenses,
      netProfit: newNetProfit,
      updatedAt: dateToTimestamp(new Date())
    });
  } catch (error) {
    console.error("Erro ao adicionar despesa ao balanço:", error);
    throw error;
  }
};

export const calculateMonthlyRevenue = async (month: number, year: number): Promise<number> => {
  try {
    const clients = await getAllClientsWithFinancialData();
    
    return clients
      .filter(client => client.status === 'Ativo' && client.contractType === 'Recorrente')
      .reduce((total, client) => total + client.monthlyValue, 0);
  } catch (error) {
    console.error("Erro ao calcular receita mensal:", error);
    throw error;
  }
};

export const generateFinancialAlert = async (): Promise<string[]> => {
  try {
    const upcomingClients = await getClientsWithUpcomingDueDates(10);
    
    return upcomingClients.map(client => {
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      let dueDate = new Date(currentYear, currentMonth, client.dueDate);
      
      if (dueDate < today) {
        dueDate = new Date(currentYear, currentMonth + 1, client.dueDate);
      }
      
      const daysUntilDue = differenceInDays(dueDate, today);
      return `Cliente ${client.name} tem vencimento em ${daysUntilDue} dias`;
    });
  } catch (error) {
    console.error("Erro ao gerar alertas financeiros:", error);
    throw error;
  }
};

export const generateInvoiceAndBoleto = async (clientId: string): Promise<{ invoice: string; boleto: string }> => {
  try {
    // Simular geração de documentos
    // Em um ambiente real, aqui seria feita a integração com APIs de geração de documentos
    
    const client = await getFinancialClient(clientId);
    if (!client) {
      throw new Error("Cliente não encontrado");
    }
    
    // Simular URLs dos documentos gerados
    const invoice = `https://example.com/invoice/${clientId}-${Date.now()}.pdf`;
    const boleto = `https://example.com/boleto/${clientId}-${Date.now()}.pdf`;
    
    // Aqui você integraria com serviços reais como:
    // - API do Banco para gerar boletos
    // - Sistema de emissão de NF-e
    // - Templates de documentos
    
    return { invoice, boleto };
  } catch (error) {
    console.error("Erro ao gerar NF e Boleto:", error);
    throw error;
  }
};

export const getFinancialClient = async (clientId: string): Promise<FinancialClient | null> => {
  try {
    const docRef = doc(db, FINANCIAL_CLIENTS_COLLECTION, clientId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    const data = docSnap.data();
    return {
      id: docSnap.id,
      originalClientId: data.originalClientId || '',
      name: data.name || '',
      monthlyValue: data.monthlyValue || 0,
      dueDate: data.dueDate || 1,
      contractStartDate: timestampToDate(data.contractStartDate),
      contractEndDate: data.contractEndDate ? timestampToDate(data.contractEndDate) : undefined,
      contractType: data.contractType || 'Recorrente',
      contractTerm: data.contractTerm || '1 ano',
      billingType: data.billingType || 'Mensal',
      status: data.status || 'Sem dados financeiros',
      lastPaymentDate: data.lastPaymentDate ? timestampToDate(data.lastPaymentDate) : undefined,
      assignedTo: data.assignedTo || '',
      invoiceRequired: data.invoiceRequired || false,
      contactInfo: {
        email: data.contactInfo?.email || '',
        phone: data.contactInfo?.phone || '',
        address: data.contactInfo?.address || ''
      },
      project: data.project || '',
      clientStatus: data.clientStatus || '',
      contactName: data.contactName || '',
      cpf: data.cpf || '',
      cnpj: data.cnpj || '',
      createdAt: timestampToDate(data.createdAt),
      updatedAt: timestampToDate(data.updatedAt)
    };
  } catch (error) {
    console.error("Erro ao buscar cliente financeiro:", error);
    throw error;
  }
}; 