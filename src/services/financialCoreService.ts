/**
 * FINANCIAL CORE SERVICE
 * 
 * Este serviço gerencia todas as operações financeiras do sistema e mantém
 * sincronização automática entre clientes principais e clientes financeiros.
 * 
 * SINCRONIZAÇÃO AUTOMÁTICA:
 * - Quando um cliente é criado/editado no módulo principal, automaticamente
 *   é criado/atualizado o registro correspondente no módulo financeiro
 * - Campos sincronizados: nome, projeto, CPF, CNPJ, contato, telefone, email, endereço
 * - A sincronização ocorre através da função syncSingleClientWithFinancialClient()
 * - Não é necessário intervenção manual para manter os dados atualizados
 * 
 * ESTRUTURA DE DADOS:
 * - Clientes principais: coleção 'clients'
 * - Clientes financeiros: coleção 'financeiro_financialClients'
 * - Ligação através do campo 'originalClientId'
 */

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
  Timestamp,
  getDocsFromCache,
  getDocsFromServer
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { 
  ChartOfAccounts, 
  CostCenter, 
  AccountsPayable, 
  AccountsReceivable,
  Supplier,
  FinancialDashboardData
} from '@/types/financial';
import { Client, Collaborator, FinancialClient } from '@/types';

// Coleções do Firebase - ESTRUTURA UNIFICADA
const FINANCIAL_ROOT_COLLECTION = 'financeiro';

// Para Firestore, vou usar uma estrutura híbrida:
// Opção 1: Coleções unificadas com prefixo
const CHART_OF_ACCOUNTS_COLLECTION = 'financeiro_chartOfAccounts';
const COST_CENTERS_COLLECTION = 'financeiro_costCenters';
const ACCOUNTS_PAYABLE_COLLECTION = 'financeiro_accountsPayable';
const ACCOUNTS_RECEIVABLE_COLLECTION = 'financeiro_accountsReceivable';
const SUPPLIERS_COLLECTION = 'financeiro_suppliers';
const FINANCIAL_CLIENTS_COLLECTION = 'financialClients';

// Coleções externas (fora do módulo financeiro)
const CLIENTS_COLLECTION = 'clients';
const COLLABORATORS_COLLECTION = 'collaborators';

// Helper para converter timestamps
const convertTimestamp = (timestamp: any): Date => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (timestamp && timestamp.toDate) {
    return timestamp.toDate();
  }
  return timestamp ? new Date(timestamp) : new Date();
};

// ==================== DADOS REAIS DO SISTEMA ====================

// Buscar todos os clientes reais
export const getRealClients = async (): Promise<Client[]> => {
  try {
    const snapshot = await getDocs(collection(db, CLIENTS_COLLECTION));
    
    return snapshot.docs.map(doc => {
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
        documents: data.documents || [],
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt)
      } as Client;
    });
  } catch (error) {
    console.error("Erro ao buscar clientes reais:", error);
    return [];
  }
};

// Buscar todos os colaboradores reais
export const getRealCollaborators = async (): Promise<Collaborator[]> => {
  try {
    console.log("🔍 Buscando colaboradores da coleção unificada...");
    
    // Tentar buscar na nova coleção unificada primeiro
    try {
      const unifiedSnapshot = await getDocs(collection(db, 'collaborators_unified'));
      
      if (unifiedSnapshot.size > 0) {
        const collaboratorsList = unifiedSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            uid: data.uid || doc.id,
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            email: data.email || "",
            birthDate: convertTimestamp(data.birthDate),
            hierarchyLevel: data.hierarchyLevel || 'Estagiário/Auxiliar',
            phone: data.phone || "",
            address: data.address || "",
            avatar: data.avatar || data.photoURL,
            responsibleName: data.responsibleName || "",
            customPermissions: data.customPermissions,
            createdAt: convertTimestamp(data.createdAt),
            updatedAt: convertTimestamp(data.updatedAt),
            source: 'collaborators' as const
          } as Collaborator;
        });

        console.log(`✅ ${collaboratorsList.length} colaboradores carregados da coleção unificada`);
        return collaboratorsList;
      }
    } catch (unifiedError) {
      console.log("⚠️ Coleção unificada não encontrada, usando método legacy...");
    }
    
    // Fallback para o método antigo se a nova coleção não existir ou estiver vazia
    console.log("🔄 Usando método legacy (coleções separadas)...");
    
    // Buscar na coleção collaborators
    const collaboratorsSnapshot = await getDocs(collection(db, COLLABORATORS_COLLECTION));
    
          // Não há mais coleção users separada
      // const usersSnapshot = await getDocs(collection(db, 'users'));
    
    // Mapear colaboradores da coleção collaborators
    const collaboratorsList = collaboratorsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        uid: data.uid,
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        email: data.email || "",
        birthDate: convertTimestamp(data.birthDate),
        hierarchyLevel: data.hierarchyLevel || 'Estagiário/Auxiliar',
        phone: data.phone || "",
        address: data.address || "",
        avatar: data.avatar || data.photoURL,
        responsibleName: data.responsibleName || "",
        customPermissions: data.customPermissions,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
        source: 'collaborators' as const
      } as Collaborator;
    });

    // Não há mais coleção users separada - retornar apenas collaborators
    const allCollaborators = collaboratorsList;
    console.log(`✅ ${allCollaborators.length} colaboradores carregados (método legacy)`);
    return allCollaborators;
    
  } catch (error) {
    console.error("❌ Erro ao buscar colaboradores reais:", error);
    return [];
  }
};

// Converter cliente real em cliente financeiro
export const convertClientToFinancialClient = (client: Client): FinancialClient => {
  return {
    id: client.id,
    originalClientId: client.id,
    name: client.name,
    monthlyValue: 0, // Será preenchido posteriormente
    dueDate: 10, // Padrão: dia 10 de cada mês
    contractStartDate: client.createdAt,
    contractType: 'Recorrente',
    contractTerm: '1 ano',
    billingType: 'Mensal',
    status: 'Sem dados financeiros',
    assignedTo: client.assignedTo,
    invoiceRequired: false,
    contactInfo: {
      email: client.email || "",
      phone: client.phone || "",
      address: client.address || ""
    },
    project: client.project,
    clientStatus: client.status,
    contactName: client.contactName,
    cpf: client.cpf,
    cnpj: client.cnpj,
    createdAt: client.createdAt,
    updatedAt: client.updatedAt
  };
};

// ==================== PLANO DE CONTAS ====================
export const createAccount = async (account: Omit<ChartOfAccounts, 'id' | 'createdAt' | 'updatedAt'>): Promise<ChartOfAccounts> => {
  try {
    const docRef = await addDoc(collection(db, CHART_OF_ACCOUNTS_COLLECTION), {
      ...account,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return {
      id: docRef.id,
      ...account,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  } catch (error) {
    console.error("Erro ao criar conta:", error);
    throw new Error("Falha ao criar conta");
  }
};

export const getAllAccounts = async (): Promise<ChartOfAccounts[]> => {
  try {
    const q = query(collection(db, CHART_OF_ACCOUNTS_COLLECTION), orderBy('code'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: convertTimestamp(doc.data().createdAt),
      updatedAt: convertTimestamp(doc.data().updatedAt)
    })) as ChartOfAccounts[];
  } catch (error) {
    console.error("Erro ao buscar contas:", error);
    return [];
  }
};

// ==================== CENTRO DE CUSTOS ====================
export const createCostCenter = async (costCenter: Omit<CostCenter, 'id' | 'createdAt' | 'updatedAt'>): Promise<CostCenter> => {
  try {
    const docRef = await addDoc(collection(db, COST_CENTERS_COLLECTION), {
      ...costCenter,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return {
      id: docRef.id,
      ...costCenter,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  } catch (error) {
    console.error("Erro ao criar centro de custo:", error);
    throw new Error("Falha ao criar centro de custo");
  }
};

export const getAllCostCenters = async (): Promise<CostCenter[]> => {
  try {
    const q = query(collection(db, COST_CENTERS_COLLECTION), orderBy('code'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: convertTimestamp(doc.data().createdAt),
      updatedAt: convertTimestamp(doc.data().updatedAt)
    })) as CostCenter[];
  } catch (error) {
    console.error("Erro ao buscar centros de custo:", error);
    return [];
  }
};

// ==================== FORNECEDORES ====================
export const createSupplier = async (supplier: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>): Promise<Supplier> => {
  try {
    const docRef = await addDoc(collection(db, SUPPLIERS_COLLECTION), {
      ...supplier,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return {
      id: docRef.id,
      ...supplier,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  } catch (error) {
    console.error("Erro ao criar fornecedor:", error);
    throw new Error("Falha ao criar fornecedor");
  }
};

// Helper para encontrar a coleção onde o documento existe
const findDocumentCollection = async (id: string, collectionNames: string[]): Promise<string | null> => {
  for (const collectionName of collectionNames) {
    try {
      const docRef = doc(db, collectionName, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        console.log(`🔍 [findDocumentCollection] Documento ${id} encontrado na coleção: ${collectionName}`);
        return collectionName;
      }
    } catch (error) {
      console.log(`⚠️ [findDocumentCollection] Erro ao verificar coleção ${collectionName}:`, error);
    }
  }
  return null;
};

export const updateSupplier = async (id: string, supplier: Partial<Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  try {
    console.log(`🔍 [updateSupplier] Procurando fornecedor ${id} nas coleções...`);
    
    // Tentar múltiplas coleções possíveis
    const collectionNames = [
      'financeiro_suppliers',
      'suppliers', 
      'fornecedores',
      'Suppliers',
      'financial_suppliers'
    ];
    
    const foundCollection = await findDocumentCollection(id, collectionNames);
    
    if (!foundCollection) {
      console.error(`❌ [updateSupplier] Fornecedor ${id} não encontrado em nenhuma coleção`);
      throw new Error(`Fornecedor não encontrado`);
    }
    
    console.log(`✅ [updateSupplier] Atualizando fornecedor ${id} na coleção: ${foundCollection}`);
    const docRef = doc(db, foundCollection, id);
    await updateDoc(docRef, {
      ...supplier,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Erro ao atualizar fornecedor:", error);
    throw new Error("Falha ao atualizar fornecedor");
  }
};

export const deleteSupplier = async (id: string): Promise<void> => {
  try {
    console.log(`🔍 [deleteSupplier] Procurando fornecedor ${id} nas coleções...`);
    
    // Tentar múltiplas coleções possíveis
    const collectionNames = [
      'financeiro_suppliers',
      'suppliers', 
      'fornecedores',
      'Suppliers',
      'financial_suppliers'
    ];
    
    const foundCollection = await findDocumentCollection(id, collectionNames);
    
    if (!foundCollection) {
      console.error(`❌ [deleteSupplier] Fornecedor ${id} não encontrado em nenhuma coleção`);
      throw new Error(`Fornecedor não encontrado`);
    }
    
    console.log(`🗑️ [deleteSupplier] Excluindo fornecedor ${id} da coleção: ${foundCollection}`);
    const docRef = doc(db, foundCollection, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Erro ao excluir fornecedor:", error);
    throw new Error("Falha ao excluir fornecedor");
  }
};

export const getAllSuppliers = async (): Promise<Supplier[]> => {
  try {
    console.log("🔍 [getAllSuppliers] Tentando diferentes coleções...");
    
    // Tentar múltiplas coleções possíveis
    const collectionNames = [
      'financeiro_suppliers',
      'suppliers', 
      'fornecedores',
      'Suppliers',
      'financial_suppliers'
    ];
    
    let foundData = false;
    let suppliers: Supplier[] = [];
    
    for (const collectionName of collectionNames) {
      try {
        console.log(`🔍 [getAllSuppliers] Testando coleção: ${collectionName}`);
        const snapshot = await getDocs(collection(db, collectionName));
        console.log(`📊 [getAllSuppliers] Coleção ${collectionName}: ${snapshot.docs.length} documentos`);
        
        if (snapshot.docs.length > 0) {
          foundData = true;
          suppliers = snapshot.docs.map(doc => {
            const data = doc.data();
            console.log("📄 [getAllSuppliers] Documento encontrado:", {
              id: doc.id,
              name: data.name,
              isActive: data.isActive,
              hasRecurrence: data.hasRecurrence,
              monthlyValue: data.monthlyValue,
              collection: collectionName
            });
            
            return {
              id: doc.id,
              ...data,
              createdAt: convertTimestamp(data.createdAt),
              updatedAt: convertTimestamp(data.updatedAt)
            };
          }) as Supplier[];
          
          console.log(`✅ [getAllSuppliers] Dados encontrados na coleção: ${collectionName}`);
          break;
        }
      } catch (error) {
        console.log(`⚠️ [getAllSuppliers] Erro na coleção ${collectionName}:`, error);
      }
    }
    
    if (!foundData) {
      console.log("❌ [getAllSuppliers] NENHUM DADO ENCONTRADO em nenhuma coleção!");
    }

    console.log("📊 [getAllSuppliers] Total de fornecedores processados:", suppliers.length);

    // Ordenar por nome no lado do cliente
    return suppliers.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("❌ [getAllSuppliers] Erro ao buscar fornecedores:", error);
    return [];
  }
};

// ==================== CONTAS A PAGAR ====================
export const createAccountPayable = async (account: Omit<AccountsPayable, 'id' | 'createdAt' | 'updatedAt'>): Promise<AccountsPayable> => {
  try {
    const docRef = await addDoc(collection(db, ACCOUNTS_PAYABLE_COLLECTION), {
      ...account,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return {
      id: docRef.id,
      ...account,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  } catch (error) {
    console.error("Erro ao criar conta a pagar:", error);
    throw new Error("Falha ao criar conta a pagar");
  }
};

export const updateAccountPayable = async (id: string, account: Partial<Omit<AccountsPayable, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  try {
    console.log(`🔍 [updateAccountPayable] Procurando conta ${id} nas coleções...`);
    
    // Tentar múltiplas coleções possíveis
    const collectionNames = [
      'financeiro_accountsPayable',
      'accountsPayable',
      'accounts_payable',
      'contasPagar',
      'contas_pagar',
      'AccountsPayable',
      'financial_accountsPayable'
    ];
    
    const foundCollection = await findDocumentCollection(id, collectionNames);
    
    if (!foundCollection) {
      console.error(`❌ [updateAccountPayable] Conta ${id} não encontrada em nenhuma coleção`);
      throw new Error(`Conta a pagar não encontrada`);
    }
    
    console.log(`✅ [updateAccountPayable] Atualizando conta ${id} na coleção: ${foundCollection}`);
    const docRef = doc(db, foundCollection, id);
    await updateDoc(docRef, {
      ...account,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Erro ao atualizar conta a pagar:", error);
    throw new Error("Falha ao atualizar conta a pagar");
  }
};

export const deleteAccountPayable = async (id: string): Promise<void> => {
  try {
    console.log(`🔍 [deleteAccountPayable] Procurando conta ${id} nas coleções...`);
    
    // Tentar múltiplas coleções possíveis
    const collectionNames = [
      'financeiro_accountsPayable',
      'accountsPayable',
      'accounts_payable',
      'contasPagar',
      'contas_pagar',
      'AccountsPayable',
      'financial_accountsPayable'
    ];
    
    const foundCollection = await findDocumentCollection(id, collectionNames);
    
    if (!foundCollection) {
      console.error(`❌ [deleteAccountPayable] Conta ${id} não encontrada em nenhuma coleção`);
      throw new Error(`Conta a pagar não encontrada`);
    }
    
    console.log(`🗑️ [deleteAccountPayable] Excluindo conta ${id} da coleção: ${foundCollection}`);
    const docRef = doc(db, foundCollection, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Erro ao excluir conta a pagar:", error);
    throw new Error("Falha ao excluir conta a pagar");
  }
};

export const getAllAccountsPayable = async (): Promise<AccountsPayable[]> => {
  try {
    console.log("🔍 [getAllAccountsPayable] Tentando diferentes coleções...");
    
    // Tentar múltiplas coleções possíveis
    const collectionNames = [
      'financeiro_accountsPayable',
      'accountsPayable',
      'accounts_payable',
      'contasPagar',
      'contas_pagar',
      'AccountsPayable',
      'financial_accountsPayable'
    ];
    
    let foundData = false;
    let accountsPayable: AccountsPayable[] = [];
    
    for (const collectionName of collectionNames) {
      try {
        console.log(`🔍 [getAllAccountsPayable] Testando coleção: ${collectionName}`);
        const q = query(collection(db, collectionName), orderBy('dueDate'));
        const snapshot = await getDocs(q);
        console.log(`📊 [getAllAccountsPayable] Coleção ${collectionName}: ${snapshot.docs.length} documentos`);
        
        if (snapshot.docs.length > 0) {
          foundData = true;
          accountsPayable = snapshot.docs.map(doc => {
            const data = doc.data();
            console.log("💳 [getAllAccountsPayable] Conta encontrada:", {
              id: doc.id,
              description: data.description,
              supplierName: data.supplierName,
              totalAmount: data.totalAmount,
              status: data.status,
              collection: collectionName
            });
            
            return {
              id: doc.id,
              ...data,
              dueDate: convertTimestamp(data.dueDate),
              createdAt: convertTimestamp(data.createdAt),
              updatedAt: convertTimestamp(data.updatedAt),
              approvedAt: data.approvedAt ? convertTimestamp(data.approvedAt) : undefined
            };
          }) as AccountsPayable[];
          
          console.log(`✅ [getAllAccountsPayable] Dados encontrados na coleção: ${collectionName}`);
          break;
        }
      } catch (error) {
        console.log(`⚠️ [getAllAccountsPayable] Erro na coleção ${collectionName}:`, error);
        // Se der erro de orderBy, tentar sem ordenação
        try {
          console.log(`🔄 [getAllAccountsPayable] Tentando ${collectionName} sem orderBy...`);
          const snapshot = await getDocs(collection(db, collectionName));
          console.log(`📊 [getAllAccountsPayable] Coleção ${collectionName} (sem orderBy): ${snapshot.docs.length} documentos`);
          
          if (snapshot.docs.length > 0) {
            foundData = true;
            accountsPayable = snapshot.docs.map(doc => {
              const data = doc.data();
              console.log("💳 [getAllAccountsPayable] Conta encontrada (sem orderBy):", {
                id: doc.id,
                description: data.description,
                supplierName: data.supplierName,
                totalAmount: data.totalAmount,
                status: data.status,
                collection: collectionName
              });
              
              return {
                id: doc.id,
                ...data,
                dueDate: convertTimestamp(data.dueDate),
                createdAt: convertTimestamp(data.createdAt),
                updatedAt: convertTimestamp(data.updatedAt),
                approvedAt: data.approvedAt ? convertTimestamp(data.approvedAt) : undefined
              };
            }) as AccountsPayable[];
            
            console.log(`✅ [getAllAccountsPayable] Dados encontrados na coleção: ${collectionName} (sem orderBy)`);
            break;
          }
        } catch (innerError) {
          console.log(`❌ [getAllAccountsPayable] Erro também sem orderBy em ${collectionName}:`, innerError);
        }
      }
    }
    
    if (!foundData) {
      console.log("❌ [getAllAccountsPayable] NENHUM DADO ENCONTRADO em nenhuma coleção!");
    }
    
    console.log("📊 [getAllAccountsPayable] Total de contas processadas:", accountsPayable.length);
    return accountsPayable;
  } catch (error) {
    console.error("❌ [getAllAccountsPayable] Erro ao buscar contas a pagar:", error);
    return [];
  }
};

// ==================== CONTAS A RECEBER ====================
export const createAccountReceivable = async (account: Omit<AccountsReceivable, 'id' | 'createdAt' | 'updatedAt'>): Promise<AccountsReceivable> => {
  try {
    const docRef = await addDoc(collection(db, ACCOUNTS_RECEIVABLE_COLLECTION), {
      ...account,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return {
      id: docRef.id,
      ...account,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  } catch (error) {
    console.error("Erro ao criar conta a receber:", error);
    throw new Error("Falha ao criar conta a receber");
  }
};

export const getAllAccountsReceivable = async (): Promise<AccountsReceivable[]> => {
  try {
    const q = query(collection(db, ACCOUNTS_RECEIVABLE_COLLECTION), orderBy('dueDate'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        dueDate: convertTimestamp(data.dueDate),
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt)
      };
    }) as AccountsReceivable[];
  } catch (error) {
    console.error("Erro ao buscar contas a receber:", error);
    return [];
  }
};

export const deleteAccountReceivable = async (id: string): Promise<void> => {
  try {
    console.log(`🔍 [deleteAccountReceivable] Procurando conta ${id} nas coleções...`);
    
    // Tentar múltiplas coleções possíveis  
    const collectionNames = [
      'financeiro_accountsReceivable',
      'accountsReceivable',
      'accounts_receivable',
      'contasReceber',
      'contas_receber',
      'AccountsReceivable',
      'financial_accountsReceivable'
    ];
    
    const foundCollection = await findDocumentCollection(id, collectionNames);
    
    if (!foundCollection) {
      console.error(`❌ [deleteAccountReceivable] Conta ${id} não encontrada em nenhuma coleção`);
      throw new Error(`Conta a receber não encontrada`);
    }
    
    console.log(`🗑️ [deleteAccountReceivable] Excluindo conta ${id} da coleção: ${foundCollection}`);
    const docRef = doc(db, foundCollection, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Erro ao excluir conta a receber:", error);
    throw new Error("Falha ao excluir conta a receber");
  }
};

export const updateAccountReceivable = async (id: string, account: Partial<Omit<AccountsReceivable, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  try {
    console.log(`🔍 [updateAccountReceivable] Procurando conta ${id} nas coleções...`);
    
    // Tentar múltiplas coleções possíveis
    const collectionNames = [
      'financeiro_accountsReceivable',
      'accountsReceivable',
      'accounts_receivable',
      'contasReceber',
      'contas_receber',
      'AccountsReceivable',
      'financial_accountsReceivable'
    ];
    
    const foundCollection = await findDocumentCollection(id, collectionNames);
    
    if (!foundCollection) {
      console.error(`❌ [updateAccountReceivable] Conta ${id} não encontrada em nenhuma coleção`);
      throw new Error(`Conta a receber não encontrada`);
    }
    
    console.log(`✅ [updateAccountReceivable] Atualizando conta ${id} na coleção: ${foundCollection}`);
    const docRef = doc(db, foundCollection, id);
    await updateDoc(docRef, {
      ...account,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Erro ao atualizar conta a receber:", error);
    throw new Error("Falha ao atualizar conta a receber");
  }
};

// ==================== CLIENTES FINANCEIROS ====================
export const getAllFinancialClients = async (): Promise<FinancialClient[]> => {
  try {
    console.log('🔄 [getAllFinancialClients] Buscando dados frescos do servidor...');
    
    // Forçar busca do servidor para evitar cache desatualizado
    const snapshot = await getDocsFromServer(collection(db, FINANCIAL_CLIENTS_COLLECTION));
    
    console.log(`📊 [getAllFinancialClients] Encontrados ${snapshot.docs.length} clientes financeiros`);
    
    const clients = snapshot.docs.map(doc => {
      const data = doc.data();
      const client = {
        id: doc.id,
        originalClientId: data.originalClientId || '',
        name: data.name || '',
        project: data.project || '',
        monthlyValue: data.monthlyValue || 0,
        dueDate: data.dueDate || 1,
        contractStartDate: convertTimestamp(data.contractStartDate),
        contractEndDate: data.contractEndDate ? convertTimestamp(data.contractEndDate) : undefined,
        contractType: data.contractType || 'Recorrente',
        contractTerm: data.contractTerm || '1 ano',
        billingType: data.billingType || 'Mensal',
        status: data.status || 'Ativo',
        lastPaymentDate: data.lastPaymentDate ? convertTimestamp(data.lastPaymentDate) : undefined,
        assignedTo: data.assignedTo || '',
        invoiceRequired: data.invoiceRequired || false,
        contactInfo: {
          email: data.contactInfo?.email || '',
          phone: data.contactInfo?.phone || '',
          address: data.contactInfo?.address || ''
        },
        clientStatus: data.clientStatus || '',
        contactName: data.contactName || '',
        cpf: data.cpf || '',
        cnpj: data.cnpj || '',
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt)
      };
      
      // Log detalhado para debug
      if (data.lastPaymentDate) {
        console.log(`💰 [getAllFinancialClients] Cliente ${client.name} (${client.id}) - lastPaymentDate: ${client.lastPaymentDate.toISOString()}`);
      } else {
        console.log(`💰 [getAllFinancialClients] Cliente ${client.name} (${client.id}) - lastPaymentDate: null/undefined`);
      }
      
      return client;
    });
    
    console.log('✅ [getAllFinancialClients] Busca concluída com sucesso');
    return clients;
  } catch (error) {
    console.error('❌ [getAllFinancialClients] Erro ao buscar clientes financeiros:', error);
    return [];
  }
};

export const deleteFinancialClient = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, FINANCIAL_CLIENTS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Erro ao excluir cliente financeiro:", error);
    throw new Error("Falha ao excluir cliente financeiro");
  }
};

// ==================== DASHBOARD COM DADOS REAIS ====================
export const getFinancialDashboardData = async (): Promise<FinancialDashboardData> => {
  try {
    console.log("🔍 DEBUG: Iniciando coleta de dados do dashboard...");
    
    // Buscar dados reais
    const [
      realClients, 
      realCollaborators, 
      accountsPayable, 
      accountsReceivable, 
      financialClients,
      suppliers
    ] = await Promise.all([
      getRealClients(),
      getRealCollaborators(),
      getAllAccountsPayable(),
      getAllAccountsReceivable(),
      getAllFinancialClients(),
      getAllSuppliers()
    ]);

    // DEBUG: Mostrar quantidades encontradas
    console.log("📊 DEBUG: Dados encontrados:", {
      realClients: realClients.length,
      realCollaborators: realCollaborators.length,
      accountsPayable: accountsPayable.length,
      accountsReceivable: accountsReceivable.length,
      financialClients: financialClients.length,
      suppliers: suppliers.length
    });

    // DEBUG: Mostrar detalhes dos fornecedores
    console.log("🏭 DEBUG: Fornecedores detalhados:", 
      suppliers.map(supplier => ({
        id: supplier.id,
        name: supplier.name,
        hasRecurrence: supplier.hasRecurrence,
        monthlyValue: supplier.monthlyValue,
        isActive: supplier.isActive
      }))
    );

    // DEBUG: Mostrar detalhes dos clientes financeiros
    console.log("💰 DEBUG: Clientes financeiros detalhados:", 
      financialClients.map(client => ({
        id: client.id,
        name: client.name,
        monthlyValue: client.monthlyValue,
        status: client.status
      }))
    );

    // DEBUG: Mostrar contas a pagar
    console.log("💳 DEBUG: Contas a pagar:", 
      accountsPayable.map(account => ({
        id: account.id,
        description: account.description,
        amount: account.totalAmount,
        status: account.status
      }))
    );

    // DEBUG: Mostrar contas a receber
    console.log("📥 DEBUG: Contas a receber:", 
      accountsReceivable.map(account => ({
        id: account.id,
        description: account.description,
        amount: account.totalAmount,
        status: account.status
      }))
    );

    // Verificar se há dados reais ou apenas estruturas vazias
    const hasRealPayables = accountsPayable.some(account => account.totalAmount > 0);
    const hasRealReceivables = accountsReceivable.some(account => account.totalAmount > 0);
    const hasRealFinancialClients = financialClients.some(client => client.monthlyValue > 0);
    const hasRealSuppliers = suppliers.some(supplier => supplier.hasRecurrence && supplier.monthlyValue && supplier.isActive);

    console.log("🔍 DEBUG: Verificação de dados reais:", {
      hasRealPayables,
      hasRealReceivables,
      hasRealFinancialClients,
      hasRealSuppliers
    });

    // Calcular métricas apenas com dados reais (sem valores fictícios)
    
    // Cálculos reais de contas a pagar (incluindo fornecedores com recorrência)
    const accountsPayableTotal = accountsPayable.reduce((sum, account) => sum + account.totalAmount, 0);
    const suppliersRecurrentTotal = suppliers
      .filter(s => s.hasRecurrence && s.monthlyValue && s.isActive)
      .reduce((sum, s) => sum + (s.monthlyValue || 0), 0);
    const totalPayables = accountsPayableTotal + suppliersRecurrentTotal;
    
    const accountsOverduePayables = accountsPayable
      .filter(account => account.status === 'VENCIDO')
      .reduce((sum, account) => sum + account.totalAmount, 0);
    // Fornecedores recorrentes ativos são considerados pendentes, não vencidos
    const overduePayables = accountsOverduePayables;
    
    // Cálculos reais de contas a receber (incluindo clientes com recorrência)
    const accountsReceivableTotal = accountsReceivable.reduce((sum, account) => sum + account.totalAmount, 0);
    const clientsRecurrentTotal = financialClients
      .filter(c => c.contractType === 'Recorrente' && c.monthlyValue && c.status === 'Ativo')
      .reduce((sum, c) => sum + c.monthlyValue, 0);
    const totalReceivables = accountsReceivableTotal + clientsRecurrentTotal;
    
    const accountsOverdueReceivables = accountsReceivable
      .filter(account => account.status === 'VENCIDO')
      .reduce((sum, account) => sum + account.totalAmount, 0);
    // Clientes recorrentes ativos são considerados pendentes, não vencidos
    const overdueReceivables = accountsOverdueReceivables;

    // Receita mensal dos clientes financeiros ATIVOS (apenas se tiver dados reais)
    const activeFinancialClients = financialClients.filter(client => 
      client.status === 'Ativo' && client.monthlyValue > 0
    );
    const monthlyRevenueFromClients = activeFinancialClients.reduce((sum, client) => sum + client.monthlyValue, 0);

    // ✅ CORREÇÃO: INCLUIR CONTAS A RECEBER NA RECEITA MENSAL
    // Somar também as contas a receber (pendentes + recebidas)
    const revenueFromReceivables = accountsReceivable
      .filter(account => account.status === 'PENDENTE' || account.status === 'RECEBIDO')
      .reduce((sum, account) => sum + account.totalAmount, 0);

    // RECEITA MENSAL TOTAL = Clientes Financeiros + Contas a Receber
    const monthlyRevenue = monthlyRevenueFromClients + revenueFromReceivables;

    // DEBUG: Mostrar cálculo corrigido da receita
    console.log("💰 DEBUG: Cálculo CORRETO da receita mensal:", {
      clientesFinanceiros: monthlyRevenueFromClients,
      contasAReceber: revenueFromReceivables,
      receitaMensalTotal: monthlyRevenue,
      detalhesClientes: activeFinancialClients.map(c => ({ 
        nome: c.name, 
        valor: c.monthlyValue 
      })),
      detalhesContas: accountsReceivable.map(acc => ({ 
        cliente: acc.clientName, 
        valor: acc.totalAmount, 
        status: acc.status 
      }))
    });

    // ⚠️ IMPORTANTE: Não usar valores padrão fictícios
    // Meta de receita (baseada em dados reais ou zero)
    const monthlyRevenueTarget = monthlyRevenue > 0 ? monthlyRevenue * 1.2 : 0;

    // Caixa atual - APENAS DADOS REAIS (sem valores fictícios)
    const currentCash = totalReceivables - totalPayables;

    // Projeção de caixa 7 dias (baseada em dados reais ou zero)
    const cashProjection7Days = monthlyRevenue > 0 ? currentCash + (monthlyRevenue * 0.25) : currentCash;

    // Top clientes (apenas clientes com receita real)
    const topClients = activeFinancialClients
      .sort((a, b) => b.monthlyValue - a.monthlyValue)
      .slice(0, 3)
      .map(client => ({
        id: client.id,
        name: client.name,
        revenue: client.monthlyValue
      }));

    // Top projetos (apenas projetos em andamento reais)
    const activeProjects = realClients.filter(client => client.status === 'Em andamento');
    const topProjects = activeProjects
      .slice(0, 3)
      .map(client => ({
        id: client.id,
        name: client.project || client.name,
        profitability: 0 // Zerado até termos dados reais de custo vs receita
      }));

    // Próximos vencimentos (incluindo fornecedores e clientes recorrentes)
    const upcomingDues = [
      // Contas a receber pendentes
      ...accountsReceivable
        .filter(account => account.status === 'PENDENTE' && account.totalAmount > 0)
        .slice(0, 2)
        .map(account => ({
          type: 'RECEIVABLE' as const,
          description: `${account.clientName} - ${account.description}`,
          amount: account.totalAmount,
          dueDate: account.dueDate
        })),
      // Contas a pagar pendentes
      ...accountsPayable
        .filter(account => account.status === 'PENDENTE' && account.totalAmount > 0)
        .slice(0, 2)
        .map(account => ({
          type: 'PAYABLE' as const,
          description: `${account.supplierName} - ${account.description}`,
          amount: account.totalAmount,
          dueDate: account.dueDate
        })),
      // Fornecedores com recorrência mensal
      ...suppliers
        .filter(s => s.hasRecurrence && s.monthlyValue && s.isActive)
        .slice(0, 2)
        .map(supplier => {
          // Calcular próximo vencimento baseado no dia do pagamento
          const currentDate = new Date();
          const nextDueDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), supplier.paymentDay || 15);
          if (nextDueDate < currentDate) {
            nextDueDate.setMonth(nextDueDate.getMonth() + 1);
          }
          
          return {
            type: 'PAYABLE' as const,
            description: `${supplier.name} - Pagamento Recorrente`,
            amount: supplier.monthlyValue || 0,
            dueDate: nextDueDate
          };
        }),
      // Clientes com recorrência mensal
      ...financialClients
        .filter(c => c.contractType === 'Recorrente' && c.monthlyValue && c.status === 'Ativo')
        .slice(0, 2)
        .map(client => {
          // Calcular próximo vencimento baseado no dia do vencimento
          const currentDate = new Date();
          const nextDueDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), client.dueDate);
          if (nextDueDate < currentDate) {
            nextDueDate.setMonth(nextDueDate.getMonth() + 1);
          }
          
          return {
            type: 'RECEIVABLE' as const,
            description: `${client.name} - Recebimento Recorrente`,
            amount: client.monthlyValue,
            dueDate: nextDueDate
          };
        })
    ].sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime()).slice(0, 6);

    // Margem bruta - Apenas se há receita real
    const grossMargin = monthlyRevenue > 0 ? ((monthlyRevenue - (totalPayables * 0.1)) / monthlyRevenue) * 100 : 0;

    const result = {
      currentCash,
      cashProjection7Days,
      monthlyRevenue,
      monthlyRevenueTarget,
      overdueReceivables,
      overduePayables,
      grossMargin,
      topClients,
      topProjects,
      indicators: [],
      upcomingDues
    };

    console.log("📈 DEBUG: Resultado final do dashboard:", result);

    // ⚠️ AVISO FINAL: Verificar se todos os valores são baseados em dados reais
    if (result.currentCash === 0 && result.monthlyRevenue === 0 && result.overdueReceivables === 0 && result.overduePayables === 0) {
      console.log("⚠️ AVISO: Dashboard sem dados financeiros reais. Todos os valores são zero porque não há registros no Firebase.");
    }

    return result;
  } catch (error) {
    console.error("Erro ao buscar dados do dashboard:", error);
    
    // Retornar dados zerados em caso de erro (sem valores fictícios)
    return {
      currentCash: 0,
      cashProjection7Days: 0,
      monthlyRevenue: 0,
      monthlyRevenueTarget: 0,
      overdueReceivables: 0,
      overduePayables: 0,
      grossMargin: 0,
      topClients: [],
      topProjects: [],
      indicators: [],
      upcomingDues: []
    };
  }
};

// Função para debugar e verificar dados reais
export const debugFinancialData = async (): Promise<void> => {
  console.log("🔍 INICIANDO DEBUG COMPLETO DOS DADOS FINANCEIROS");
  
  try {
    const [clients, collaborators, financialClients] = await Promise.all([
      getRealClients(),
      getRealCollaborators(), 
      getAllFinancialClients()
    ]);

    console.log("👥 CLIENTES REAIS:", clients.map(c => ({ id: c.id, name: c.name, status: c.status })));
    console.log("🧑‍💼 COLABORADORES REAIS:", collaborators.map(c => ({ id: c.id, name: `${c.firstName} ${c.lastName}` })));
    console.log("💰 CLIENTES FINANCEIROS:", financialClients.map(fc => ({ 
      id: fc.id, 
      name: fc.name, 
      monthlyValue: fc.monthlyValue, 
      status: fc.status,
      originalClientId: fc.originalClientId 
    })));

    // Verificar se há dados fictícios
    const possibleMockData = financialClients.filter(fc => 
      fc.name.includes('Teste') || 
      fc.name.includes('Debug') ||
      fc.id.includes('debug') ||
      fc.id.includes('temp-')
    );

    if (possibleMockData.length > 0) {
      console.warn("⚠️ DADOS FICTÍCIOS ENCONTRADOS:", possibleMockData);
    }

  } catch (error) {
    console.error("❌ Erro no debug:", error);
  }
};

// ==================== SINCRONIZAÇÃO DE DADOS ====================

// Sincronizar clientes reais com clientes financeiros
export const syncClientsWithFinancialClients = async (): Promise<void> => {
  try {
    const realClients = await getRealClients();
    const financialClients = await getAllFinancialClients();
    
    // IDs dos clientes que já têm dados financeiros
    const existingFinancialClientIds = new Set(
      financialClients.map(fc => fc.originalClientId).filter(Boolean)
    );

    // Criar clientes financeiros para clientes que não têm
    for (const client of realClients) {
      if (!existingFinancialClientIds.has(client.id)) {
        const financialClient = convertClientToFinancialClient(client);
        
        await addDoc(collection(db, FINANCIAL_CLIENTS_COLLECTION), {
          ...financialClient,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else {
        // Atualizar cliente financeiro existente com dados mais recentes
        const existingFinancialClient = financialClients.find(fc => fc.originalClientId === client.id);
        if (existingFinancialClient) {
          const updatedData = {
            name: client.name,
            project: client.project,
            contactName: client.contactName,
            cpf: client.cpf,
            cnpj: client.cnpj,
            assignedTo: client.assignedTo,
            contactInfo: {
              email: client.email || "",
              phone: client.phone || "",
              address: client.address || ""
            },
            clientStatus: client.status,
            updatedAt: serverTimestamp()
          };

          const docRef = doc(db, FINANCIAL_CLIENTS_COLLECTION, existingFinancialClient.id);
          await updateDoc(docRef, updatedData);
        }
      }
    }
  } catch (error) {
    console.error("Erro ao sincronizar clientes:", error);
  }
};

// Função para forçar sincronização completa de todos os clientes
export const forceSyncAllClientsWithFinancialClients = async (): Promise<void> => {
  try {
    console.log("🔄 Forçando sincronização completa de clientes...");
    
    const realClients = await getRealClients();
    const financialClients = await getAllFinancialClients();
    
    console.log(`📊 Encontrados ${realClients.length} clientes principais e ${financialClients.length} clientes financeiros`);
    
    let created = 0;
    let updated = 0;
    let errors = 0;
    
    for (const client of realClients) {
      try {
        const existingFinancialClient = financialClients.find(fc => fc.originalClientId === client.id);
        
        if (!existingFinancialClient) {
          // Criar novo cliente financeiro
          const financialClient = convertClientToFinancialClient(client);
          
          await addDoc(collection(db, FINANCIAL_CLIENTS_COLLECTION), {
            ...financialClient,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          
          created++;
          console.log(`✅ Criado cliente financeiro para: ${client.name}`);
        } else {
          // Verificar se o documento ainda existe antes de atualizar
          const docRef = doc(db, FINANCIAL_CLIENTS_COLLECTION, existingFinancialClient.id);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            // Atualizar cliente financeiro existente
            const updatedData = {
              name: client.name,
              project: client.project,
              contactName: client.contactName,
              cpf: client.cpf || "",
              cnpj: client.cnpj || "",
              assignedTo: client.assignedTo,
              contactInfo: {
                email: client.email || "",
                phone: client.phone || "",
                address: client.address || ""
              },
              clientStatus: client.status,
              updatedAt: serverTimestamp()
            };

            await updateDoc(docRef, updatedData);
            
            updated++;
            console.log(`🔄 Atualizado cliente financeiro: ${client.name} (CPF: ${client.cpf || 'N/A'}, CNPJ: ${client.cnpj || 'N/A'})`);
          } else {
            // Documento não existe mais, criar novo
            console.log(`⚠️ Documento financeiro ${existingFinancialClient.id} não existe mais, criando novo para: ${client.name}`);
            
            const financialClient = convertClientToFinancialClient(client);
            
            await addDoc(collection(db, FINANCIAL_CLIENTS_COLLECTION), {
              ...financialClient,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
            
            created++;
          }
        }
      } catch (error) {
        console.error(`❌ Erro ao processar cliente ${client.name}:`, error);
        errors++;
      }
    }
    
    console.log(`🎉 Sincronização completa! Criados: ${created}, Atualizados: ${updated}, Erros: ${errors}`);
  } catch (error) {
    console.error("❌ Erro na sincronização forçada:", error);
    throw error;
  }
};

// Flag para controlar limpeza em execução
let isCleaningInProgress = false;

// Função para limpar clientes financeiros duplicados
export const cleanDuplicateFinancialClients = async (): Promise<void> => {
  try {
    // console.log("🧹 Iniciando limpeza agressiva de clientes financeiros duplicados...");
    
    // Buscar todos os clientes financeiros
    const allClients = await getAllFinancialClients();
    // console.log(`📊 Total de clientes encontrados: ${allClients.length}`);
    
    if (allClients.length === 0) {
      // console.log("✅ Nenhum cliente financeiro encontrado para limpeza");
      return;
    }

    // Criar mapa para identificar duplicatas por originalClientId e nome
    const clientMap = new Map<string, FinancialClient[]>();
    let orphanClients: FinancialClient[] = [];
    
    // Agrupar clientes
    allClients.forEach(client => {
      if (client.originalClientId) {
        // Clientes com originalClientId
        const key = client.originalClientId;
        if (!clientMap.has(key)) {
          clientMap.set(key, []);
        }
        clientMap.get(key)!.push(client);
      } else {
        // Clientes órfãos (sem originalClientId) - agrupar por nome
        const nameKey = `name_${client.name}`;
        if (!clientMap.has(nameKey)) {
          clientMap.set(nameKey, []);
        }
        clientMap.get(nameKey)!.push(client);
      }
    });

    let totalRemoved = 0;
    let duplicateGroups = 0;
    
    // Processar cada grupo
    for (const [key, clients] of clientMap.entries()) {
      if (clients.length > 1) {
        duplicateGroups++;
        // console.log(`🔍 Grupo ${key}: ${clients.length} duplicatas encontradas`);
        
        // Ordenar por data de atualização (mais recente primeiro)
        clients.sort((a, b) => {
          const dateA = a.updatedAt && typeof a.updatedAt === 'object' && 'toDate' in a.updatedAt 
            ? (a.updatedAt as any).toDate() 
            : a.updatedAt instanceof Date 
              ? a.updatedAt 
              : new Date(0);
          const dateB = b.updatedAt && typeof b.updatedAt === 'object' && 'toDate' in b.updatedAt 
            ? (b.updatedAt as any).toDate() 
            : b.updatedAt instanceof Date 
              ? b.updatedAt 
              : new Date(0);
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        });
        
        // Manter apenas o primeiro (mais recente), remover os outros
        const toKeep = clients[0];
        const toRemove = clients.slice(1);
        
        // console.log(`📌 Mantendo cliente: ${toKeep.name} (ID: ${toKeep.id})`);
        
        // Remover as duplicatas
        for (const client of toRemove) {
          try {
            await deleteFinancialClient(client.id);
            // console.log(`🗑️ Removido duplicata: ${client.name} (ID: ${client.id})`);
            totalRemoved++;
          } catch (error) {
            console.error(`❌ Erro ao remover duplicata ${client.id}:`, error);
          }
        }
      }
    }

    // Remover clientes órfãos sem originalClientId que não têm correspondente na coleção clients
    const realClients = await getRealClients();
    const realClientNames = new Set(realClients.map(c => c.name));
    
    const orphansToRemove = allClients.filter(fc => 
      !fc.originalClientId && !realClientNames.has(fc.name)
    );
    
    for (const orphan of orphansToRemove) {
      try {
        await deleteFinancialClient(orphan.id);
        // console.log(`🗑️ Removido cliente órfão: ${orphan.name} (ID: ${orphan.id})`);
        totalRemoved++;
      } catch (error) {
        console.error(`❌ Erro ao remover órfão ${orphan.id}:`, error);
      }
    }

    // console.log(`✅ Limpeza concluída!`);
    // console.log(`📊 Estatísticas:`);
    // console.log(`   - Grupos com duplicatas: ${duplicateGroups}`);
    // console.log(`   - Total de registros removidos: ${totalRemoved}`);
    // console.log(`   - Órfãos removidos: ${orphansToRemove.length}`);
    
    // Verificar o resultado final
    const finalClients = await getAllFinancialClients();
    // console.log(`📈 Clientes restantes após limpeza: ${finalClients.length}`);
    
  } catch (error) {
    console.error("❌ Erro durante limpeza de duplicatas:", error);
    throw error;
  }
};

// Função melhorada para sincronização individual com proteção contra duplicatas
export const syncSingleClientWithFinancialClient = async (clientId: string): Promise<void> => {
  try {
    // console.log(`🔄 Sincronizando cliente ${clientId}...`);
    
    // Buscar o cliente específico
    const clientDoc = await getDoc(doc(db, CLIENTS_COLLECTION, clientId));
    if (!clientDoc.exists()) {
      // console.log(`⚠️ Cliente ${clientId} não encontrado`);
      return;
    }
    
    const clientData = clientDoc.data();
    const client: Client = {
      id: clientDoc.id,
      name: clientData.name || "",
      project: clientData.project || "",
      status: clientData.status || "Em andamento",
      contactName: clientData.contactName || "",
      email: clientData.email || "",
      phone: clientData.phone || "",
      address: clientData.address || "",
      cpf: clientData.cpf || "",
      cnpj: clientData.cnpj || "",
      assignedTo: clientData.assignedTo || "",
      assignedToName: clientData.assignedToName || "",
      documents: clientData.documents || [],
      createdAt: convertTimestamp(clientData.createdAt),
      updatedAt: convertTimestamp(clientData.updatedAt)
    };

    // Buscar TODOS os clientes financeiros com o mesmo originalClientId
    const financialClientsQuery = query(
      collection(db, FINANCIAL_CLIENTS_COLLECTION),
      where('originalClientId', '==', clientId)
    );
    const financialClientsSnapshot = await getDocs(financialClientsQuery);
    
    if (financialClientsSnapshot.empty) {
      // Criar novo cliente financeiro apenas se não existir nenhum
      const financialClient = convertClientToFinancialClient(client);
      
      await addDoc(collection(db, FINANCIAL_CLIENTS_COLLECTION), {
        ...financialClient,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // console.log(`✅ Criado cliente financeiro para: ${client.name}`);
    } else if (financialClientsSnapshot.docs.length === 1) {
      // Atualizar único cliente financeiro existente
      const financialClientDoc = financialClientsSnapshot.docs[0];
      const docRef = doc(db, FINANCIAL_CLIENTS_COLLECTION, financialClientDoc.id);
      
      const updatedData = {
        name: client.name,
        project: client.project,
        contactName: client.contactName,
        cpf: client.cpf || "",
        cnpj: client.cnpj || "",
        assignedTo: client.assignedTo,
        contactInfo: {
          email: client.email || "",
          phone: client.phone || "",
          address: client.address || ""
        },
        clientStatus: client.status,
        updatedAt: serverTimestamp()
      };

      await updateDoc(docRef, updatedData);
      // console.log(`🔄 Atualizado cliente financeiro: ${client.name} (CPF: ${client.cpf || 'N/A'}, CNPJ: ${client.cnpj || 'N/A'})`);
    } else {
      // Múltiplos duplicatas encontrados - limpar e manter apenas um
      // console.log(`🚨 Encontrados ${financialClientsSnapshot.docs.length} duplicatas para ${client.name}, limpando...`);
      
      // Manter o primeiro, deletar o resto
      const docsToDelete = financialClientsSnapshot.docs.slice(1);
      for (const docToDelete of docsToDelete) {
        await deleteDoc(doc(db, FINANCIAL_CLIENTS_COLLECTION, docToDelete.id));
      }
      
      // Atualizar o que restou
      const remainingDoc = financialClientsSnapshot.docs[0];
      const docRef = doc(db, FINANCIAL_CLIENTS_COLLECTION, remainingDoc.id);
      
      const updatedData = {
        name: client.name,
        project: client.project,
        contactName: client.contactName,
        cpf: client.cpf || "",
        cnpj: client.cnpj || "",
        assignedTo: client.assignedTo,
        contactInfo: {
          email: client.email || "",
          phone: client.phone || "",
          address: client.address || ""
        },
        clientStatus: client.status,
        updatedAt: serverTimestamp()
      };

      await updateDoc(docRef, updatedData);
      // console.log(`🔄 Limpeza e atualização concluída para: ${client.name}`);
    }
  } catch (error) {
    console.error(`❌ Erro ao sincronizar cliente ${clientId}:`, error);
  }
};

// ==================== UTILIDADES ====================
export const calculateFinancialIndicators = async () => {
  // Implementação futura para calcular indicadores financeiros
  return [];
};

export const generateFinancialReport = async (startDate: Date, endDate: Date) => {
  // Implementação futura para gerar relatórios financeiros
  return null;
};

export const validateFinancialData = (data: any): boolean => {
  // Implementação futura para validar dados financeiros
  return true;
};

// ==================== MIGRAÇÃO DE DADOS ====================

// Função para migrar dados das coleções antigas para a nova estrutura
export const migrateFinancialDataToUnifiedStructure = async (): Promise<void> => {
  try {
    // console.log("🔄 Iniciando migração para estrutura unificada 'financeiro'...");
    
    // Coleções antigas
    const oldCollections = {
      'suppliers': 'financeiro_suppliers',
      'accountsPayable': 'financeiro_accountsPayable', 
      'accountsReceivable': 'financeiro_accountsReceivable',
      'chartOfAccounts': 'financeiro_chartOfAccounts',
      'costCenters': 'financeiro_costCenters',
      'financialClients': 'financeiro_financialClients'
    };

    for (const [oldCollection, newCollection] of Object.entries(oldCollections)) {
      try {
        // Verificar se a nova coleção já tem dados
        const newSnapshot = await getDocs(collection(db, newCollection));
        if (newSnapshot.docs.length > 0) {
          // console.log(`✅ Coleção ${newCollection} já possui dados. Pulando migração.`);
          continue;
        }

        // Buscar dados da coleção antiga
        const oldSnapshot = await getDocs(collection(db, oldCollection));
        
        if (oldSnapshot.docs.length === 0) {
          // console.log(`ℹ️ Coleção ${oldCollection} está vazia. Pulando.`);
          continue;
        }

        // console.log(`📦 Migrando ${oldSnapshot.docs.length} documentos de ${oldCollection} para ${newCollection}...`);

        // Migrar cada documento
        for (const docSnapshot of oldSnapshot.docs) {
          const data = docSnapshot.data();
          await addDoc(collection(db, newCollection), {
            ...data,
            migratedAt: serverTimestamp(),
            originalId: docSnapshot.id
          });
        }

        // console.log(`✅ Migração de ${oldCollection} concluída!`);
        
      } catch (error) {
        console.error(`❌ Erro ao migrar ${oldCollection}:`, error);
      }
    }

    // console.log("🎉 Migração para estrutura unificada concluída!");
    
  } catch (error) {
    console.error("❌ Erro na migração:", error);
    throw new Error("Falha na migração de dados");
  }
};

// Função para verificar o status da migração
export const checkMigrationStatus = async (): Promise<{
  isCompleted: boolean;
  collectionsStatus: Record<string, { old: number; new: number; migrated: boolean }>;
}> => {
  const collections = {
    'suppliers': 'financeiro_suppliers',
    'accountsPayable': 'financeiro_accountsPayable', 
    'accountsReceivable': 'financeiro_accountsReceivable',
    'chartOfAccounts': 'financeiro_chartOfAccounts',
    'costCenters': 'financeiro_costCenters',
    'financialClients': 'financeiro_financialClients'
  };

  const status: Record<string, { old: number; new: number; migrated: boolean }> = {};
  let allMigrated = true;

  for (const [oldCollection, newCollection] of Object.entries(collections)) {
    try {
      const [oldSnapshot, newSnapshot] = await Promise.all([
        getDocs(collection(db, oldCollection)),
        getDocs(collection(db, newCollection))
      ]);

      const oldCount = oldSnapshot.docs.length;
      const newCount = newSnapshot.docs.length;
      const migrated = oldCount === 0 || newCount >= oldCount;

      status[oldCollection] = {
        old: oldCount,
        new: newCount,
        migrated
      };

      if (!migrated) allMigrated = false;

    } catch (error) {
      console.error(`Erro ao verificar status de ${oldCollection}:`, error);
      status[oldCollection] = { old: 0, new: 0, migrated: false };
      allMigrated = false;
    }
  }

  return {
    isCompleted: allMigrated,
    collectionsStatus: status
  };
};

// Função para debug - pode ser chamada do console do navegador
export const debugCleanDuplicates = async (): Promise<void> => {
  console.log("🔧 DEBUG: Executando limpeza manual de duplicatas...");
  try {
    await cleanDuplicateFinancialClients();
    console.log("✅ DEBUG: Limpeza manual concluída com sucesso!");
  } catch (error) {
    console.error("❌ DEBUG: Erro na limpeza manual:", error);
  }
};

// Exportar para window (apenas em desenvolvimento)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).debugCleanDuplicates = debugCleanDuplicates;
  console.log("🔧 Função debugCleanDuplicates() disponível no console");
}

// Função para buscar apenas clientes financeiros ativos e configurados
export const getActiveFinancialClients = async (): Promise<FinancialClient[]> => {
  try {
    const allClients = await getAllFinancialClients();
    
    // Filtrar apenas clientes com dados financeiros reais configurados
    return allClients.filter(client => 
      client.status !== 'Sem dados financeiros' && 
      !client.id.startsWith('temp-') &&
      client.monthlyValue > 0 &&
      client.originalClientId // Deve ter referência ao cliente original
    );
  } catch (error) {
    console.error('Erro ao buscar clientes financeiros ativos:', error);
    return [];
  }
};

// Função para validar e debugar dados do dashboard
export const validateDashboardData = async (): Promise<{
  isValid: boolean;
  issues: string[];
  summary: {
    totalPayables: number;
    totalReceivables: number;
    cashFlow: number;
    activeClients: number;
    activeSuppliersWithRecurrence: number;
  };
}> => {
  const issues: string[] = [];
  
  try {
    // Buscar todos os dados
    const [
      accountsPayable,
      accountsReceivable,
      financialClients,
      suppliers
    ] = await Promise.all([
      getAllAccountsPayable(),
      getAllAccountsReceivable(),
      getAllFinancialClients(),
      getAllSuppliers()
    ]);

    // Validações
    const totalPayables = accountsPayable.reduce((sum, account) => sum + account.totalAmount, 0);
    const suppliersRecurrentTotal = suppliers
      .filter(s => s.hasRecurrence && s.monthlyValue && s.isActive)
      .reduce((sum, s) => sum + (s.monthlyValue || 0), 0);
    
    const totalReceivables = accountsReceivable.reduce((sum, account) => sum + account.totalAmount, 0);
    const clientsRecurrentTotal = financialClients
      .filter(c => c.contractType === 'Recorrente' && c.monthlyValue && c.status === 'Ativo')
      .reduce((sum, c) => sum + c.monthlyValue, 0);

    const cashFlow = (totalReceivables + clientsRecurrentTotal) - (totalPayables + suppliersRecurrentTotal);
    
    // Verificar inconsistências
    if (totalPayables === 0 && totalReceivables === 0) {
      issues.push("⚠️ Nenhuma conta a pagar ou receber encontrada");
    }
    
    if (cashFlow < 0) {
      issues.push(`⚠️ Fluxo de caixa negativo: R$ ${cashFlow.toFixed(2)} - há mais compromissos a pagar do que a receber`);
    }
    
    if (financialClients.length === 0) {
      issues.push("⚠️ Nenhum cliente financeiro ativo encontrado");
    }
    
    if (suppliers.filter(s => s.hasRecurrence && s.isActive).length === 0) {
      issues.push("⚠️ Nenhum fornecedor com recorrência ativa encontrado");
    }

    // Verificar contas vencidas
    const overduePayables = accountsPayable.filter(account => account.status === 'VENCIDO');
    const overdueReceivables = accountsReceivable.filter(account => account.status === 'VENCIDO');
    
    if (overduePayables.length > 0) {
      issues.push(`❌ ${overduePayables.length} conta(s) a pagar vencida(s)`);
    }
    
    if (overdueReceivables.length > 0) {
      issues.push(`❌ ${overdueReceivables.length} conta(s) a receber vencida(s)`);
    }

    const summary = {
      totalPayables: totalPayables + suppliersRecurrentTotal,
      totalReceivables: totalReceivables + clientsRecurrentTotal,
      cashFlow,
      activeClients: financialClients.filter(c => c.status === 'Ativo').length,
      activeSuppliersWithRecurrence: suppliers.filter(s => s.hasRecurrence && s.isActive).length
    };

    console.log("📋 VALIDAÇÃO DO DASHBOARD:", {
      summary,
      issues,
      detalhes: {
        contasPagar: {
          contas: accountsPayable.length,
          total: totalPayables,
          fornecedoresRecorrentes: suppliersRecurrentTotal
        },
        contasReceber: {
          contas: accountsReceivable.length,
          total: totalReceivables,
          clientesRecorrentes: clientsRecurrentTotal
        }
      }
    });

    return {
      isValid: issues.length === 0,
      issues,
      summary
    };

  } catch (error) {
    console.error("Erro na validação do dashboard:", error);
    return {
      isValid: false,
      issues: [`❌ Erro na validação: ${error}`],
      summary: {
        totalPayables: 0,
        totalReceivables: 0,
        cashFlow: 0,
        activeClients: 0,
        activeSuppliersWithRecurrence: 0
      }
    };
  }
};

// Função específica para debugar receita mensal
export const debugMonthlyRevenue = async (): Promise<{
  totalRevenue: number;
  revenueFromClients: number;
  revenueFromReceivables: number;
  activeClients: Array<{
    id: string;
    name: string;
    monthlyValue: number;
    status: string;
    contractType: string;
  }>;
  accountsReceivable: Array<{
    id: string;
    clientName: string;
    description: string;
    totalAmount: number;
    status: string;
  }>;
  calculation: {
    step: string;
    value: number;
    details: string;
  }[];
  issues: string[];
}> => {
  const calculation: Array<{ step: string; value: number; details: string }> = [];
  const issues: string[] = [];
  
  try {
    console.log("🔍 [debugMonthlyRevenue] Iniciando debug da receita mensal CORRIGIDO...");
    
    // Buscar todos os dados
    const [allFinancialClients, allAccountsReceivable] = await Promise.all([
      getAllFinancialClients(),
      getAllAccountsReceivable()
    ]);
    
    calculation.push({
      step: "1. Total de clientes financeiros",
      value: allFinancialClients.length,
      details: `Encontrados ${allFinancialClients.length} clientes financeiros`
    });

    calculation.push({
      step: "2. Total de contas a receber",
      value: allAccountsReceivable.length,
      details: `Encontradas ${allAccountsReceivable.length} contas a receber`
    });

    // PARTE 1: Clientes financeiros ativos
    const activeClients = allFinancialClients.filter(client => 
      client.status === 'Ativo' && client.monthlyValue > 0
    );
    const revenueFromClients = activeClients.reduce((sum, client) => sum + client.monthlyValue, 0);
    
    calculation.push({
      step: "3. Receita de clientes financeiros",
      value: revenueFromClients,
      details: `${activeClients.length} clientes ativos com receita`
    });

    console.log("💰 [debugMonthlyRevenue] Clientes financeiros ativos:", activeClients.map(c => ({
      nome: c.name,
      valor: c.monthlyValue
    })));

    // PARTE 2: Contas a receber
    const receivableAccounts = allAccountsReceivable.filter(account => 
      account.status === 'PENDENTE' || account.status === 'RECEBIDO'
    );
    const revenueFromReceivables = receivableAccounts.reduce((sum, account) => sum + account.totalAmount, 0);
    
    calculation.push({
      step: "4. Receita de contas a receber",
      value: revenueFromReceivables,
      details: `${receivableAccounts.length} contas pendentes/recebidas`
    });

    console.log("📥 [debugMonthlyRevenue] Contas a receber:", receivableAccounts.map(acc => ({
      cliente: acc.clientName,
      descricao: acc.description,
      valor: acc.totalAmount,
      status: acc.status
    })));

    // TOTAL
    const totalRevenue = revenueFromClients + revenueFromReceivables;
    
    calculation.push({
      step: "5. RECEITA MENSAL TOTAL",
      value: totalRevenue,
      details: `Clientes (R$ ${revenueFromClients}) + Contas a Receber (R$ ${revenueFromReceivables})`
    });

    // Verificações
    if (activeClients.length === 0 && receivableAccounts.length === 0) {
      issues.push("❌ Nenhuma fonte de receita encontrada");
    }

    if (revenueFromClients === 0) {
      issues.push("⚠️ Nenhuma receita de clientes financeiros");
    }

    if (revenueFromReceivables === 0) {
      issues.push("⚠️ Nenhuma receita de contas a receber");
    }

    const result = {
      totalRevenue,
      revenueFromClients,
      revenueFromReceivables,
      activeClients: activeClients.map(client => ({
        id: client.id,
        name: client.name,
        monthlyValue: client.monthlyValue,
        status: client.status,
        contractType: client.contractType
      })),
      accountsReceivable: receivableAccounts.map(account => ({
        id: account.id,
        clientName: account.clientName,
        description: account.description,
        totalAmount: account.totalAmount,
        status: account.status
      })),
      calculation,
      issues
    };

    console.log("📋 [debugMonthlyRevenue] Resultado CORRIGIDO:", result);
    return result;

  } catch (error) {
    console.error("❌ [debugMonthlyRevenue] Erro:", error);
    issues.push(`❌ Erro no debug: ${error}`);
    
    return {
      totalRevenue: 0,
      revenueFromClients: 0,
      revenueFromReceivables: 0,
      activeClients: [],
      accountsReceivable: [],
      calculation,
      issues
    };
  }
}; 