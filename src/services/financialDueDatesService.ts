import { 
  getAllAccountsPayable, 
  getAllAccountsReceivable, 
  getAllFinancialClients, 
  getAllSuppliers,
  updateAccountPayable,
  updateAccountReceivable,
  updateSupplier
} from './financialCoreService';
import { markPaymentReceived, updateFinancialClient } from './financialService';
import { deleteField } from 'firebase/firestore';
import { AccountsPayable, AccountsReceivable, Supplier } from '@/types/financial';
import { FinancialClient } from '@/types';

export interface FinancialAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedAt: Date;
  uploadedBy: string;
  description?: string;
}

export interface FinancialDue {
  id: string;
  type: 'RECEIVABLE' | 'PAYABLE';
  description: string;
  amount: number;
  dueDate: Date;
  status: 'PENDING' | 'OVERDUE' | 'PAID' | 'RECEIVED';
  clientName?: string;
  supplierName?: string;
  installmentNumber?: number;
  totalInstallments?: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  notes?: string;
  paymentDate?: Date;
  paymentAmount?: number;
  paymentMethod?: string;
  observations?: string;
  originalData?: any;
  source: 'ACCOUNT_PAYABLE' | 'ACCOUNT_RECEIVABLE' | 'SUPPLIER_RECURRING' | 'CLIENT_RECURRING';
  attachments?: FinancialAttachment[];
  updatedBy?: string;
  updatedAt?: Date;
}

/**
 * Função para determinar a prioridade baseada no valor
 */
const calculatePriority = (amount: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' => {
  if (amount >= 50000) return 'URGENT';
  if (amount >= 10000) return 'HIGH';
  if (amount >= 1000) return 'MEDIUM';
  return 'LOW';
};

/**
 * Função para determinar se uma conta está vencida
 */
export const isOverdue = (dueDate: Date): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueDate < today;
};

/**
 * Função para converter status do sistema para o formato do componente
 */
const convertStatus = (status: string, isOverdueFlag: boolean): 'PENDING' | 'OVERDUE' | 'PAID' | 'RECEIVED' => {
  if (status === 'PAGO') return 'PAID';
  if (status === 'RECEBIDO') return 'RECEIVED';
  if (status === 'PENDENTE') return 'PENDING';
  if (status === 'CANCELADO') return 'PENDING'; // Tratar cancelado como pendente por enquanto
  if (isOverdueFlag) return 'OVERDUE';
  return 'PENDING';
};

/**
 * Buscar todas as contas a pagar e converter para formato de vencimentos
 */
const getPayablesDues = async (): Promise<FinancialDue[]> => {
  try {
    console.log("🔍 [getPayablesDues] Buscando contas a pagar...");
    const accountsPayable = await getAllAccountsPayable();
    
    console.log(`📊 [getPayablesDues] Encontradas ${accountsPayable.length} contas a pagar`);
    
    return accountsPayable.map(account => {
      const overdueFlag = isOverdue(account.dueDate);
      const priority = calculatePriority(account.totalAmount);
      const status = convertStatus(account.status, overdueFlag);
      
      return {
        id: account.id,
        type: 'PAYABLE',
        description: account.description,
        amount: account.totalAmount,
        dueDate: account.dueDate,
        status,
        supplierName: account.supplierName,
        priority,
        observations: account.approvedBy ? `Aprovado por: ${account.approvedBy}` : undefined,
        originalData: account,
        source: 'ACCOUNT_PAYABLE'
      };
    });
  } catch (error) {
    console.error("❌ [getPayablesDues] Erro ao buscar contas a pagar:", error);
    return [];
  }
};

/**
 * Buscar todas as contas a receber e converter para formato de vencimentos
 */
const getReceivablesDues = async (): Promise<FinancialDue[]> => {
  try {
    console.log("🔍 [getReceivablesDues] Buscando contas a receber...");
    const accountsReceivable = await getAllAccountsReceivable();
    
    console.log(`📊 [getReceivablesDues] Encontradas ${accountsReceivable.length} contas a receber`);
    
    return accountsReceivable.map(account => {
      const overdueFlag = isOverdue(account.dueDate);
      const priority = calculatePriority(account.totalAmount);
      const status = convertStatus(account.status, overdueFlag);
      
      return {
        id: account.id,
        type: 'RECEIVABLE',
        description: account.description,
        amount: account.totalAmount,
        dueDate: account.dueDate,
        status,
        clientName: account.clientName,
        priority,
        observations: account.invoiceNumber ? `Nota Fiscal: ${account.invoiceNumber}` : undefined,
        originalData: account,
        source: 'ACCOUNT_RECEIVABLE'
      };
    });
  } catch (error) {
    console.error("❌ [getReceivablesDues] Erro ao buscar contas a receber:", error);
    return [];
  }
};

/**
 * Buscar fornecedores recorrentes e gerar vencimentos
 */
const getSupplierRecurringDues = async (): Promise<FinancialDue[]> => {
  try {
    console.log("🔍 [getSupplierRecurringDues] Buscando fornecedores recorrentes...");
    const suppliers = await getAllSuppliers();
    
    const recurringSuppliers = suppliers.filter(supplier => 
      supplier.hasRecurrence && 
      supplier.monthlyValue && 
      supplier.isActive
    );
    
    console.log(`📊 [getSupplierRecurringDues] Encontrados ${recurringSuppliers.length} fornecedores recorrentes`);
    
    const allDues: FinancialDue[] = [];
    
    recurringSuppliers.forEach(supplier => {
      const currentDate = new Date();
      const paymentDay = supplier.paymentDay || 15;
      const priority = calculatePriority(supplier.monthlyValue || 0);
      
      // Gerar vencimentos para os próximos 6 meses (incluindo mês atual)
      for (let monthOffset = 0; monthOffset < 6; monthOffset++) {
        const dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + monthOffset, paymentDay);
        const overdueFlag = isOverdue(dueDate);
        
        allDues.push({
          id: `supplier-${supplier.id}-${dueDate.getFullYear()}-${dueDate.getMonth() + 1}`,
          type: 'PAYABLE',
          description: `${supplier.name} - Pagamento Recorrente`,
          amount: supplier.monthlyValue || 0,
          dueDate: dueDate,
          status: overdueFlag ? 'OVERDUE' : 'PENDING',
          supplierName: supplier.name,
          priority,
          observations: `Serviços: ${supplier.services}`,
          originalData: supplier,
          source: 'SUPPLIER_RECURRING'
        });
      }
    });
    
    console.log(`📊 [getSupplierRecurringDues] Gerados ${allDues.length} vencimentos recorrentes`);
    
    return allDues;
  } catch (error) {
    console.error("❌ [getSupplierRecurringDues] Erro ao buscar fornecedores recorrentes:", error);
    return [];
  }
};

/**
 * Buscar clientes recorrentes e gerar vencimentos
 */
const getClientRecurringDues = async (): Promise<FinancialDue[]> => {
  try {
    console.log("🔍 [getClientRecurringDues] Buscando clientes recorrentes...");
    const clients = await getAllFinancialClients();
    
    const recurringClients = clients.filter(client => 
      client.contractType === 'Recorrente' && 
      client.monthlyValue && 
      client.monthlyValue > 0 && // Garantir que tem valor mensal > 0
      (client.status === 'Ativo' || client.status === 'Inadimplente') // Incluir inadimplentes
    );
    
    console.log(`📊 [getClientRecurringDues] Encontrados ${recurringClients.length} clientes recorrentes`);
    
    const allDues: FinancialDue[] = [];
    
    recurringClients.forEach(client => {
      const currentDate = new Date();
      const dueDay = client.dueDate || 10;
      const priority = calculatePriority(client.monthlyValue || 0);
      
      // Gerar vencimentos para os próximos 6 meses (incluindo mês atual)
      for (let monthOffset = 0; monthOffset < 6; monthOffset++) {
        const dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + monthOffset, dueDay);
        const overdueFlag = isOverdue(dueDate);
        
        // Verificar se este vencimento já foi pago baseado no lastPaymentDate
        let status: 'PENDING' | 'OVERDUE' | 'PAID' | 'RECEIVED' = overdueFlag ? 'OVERDUE' : 'PENDING';
        
        if (client.lastPaymentDate) {
          const lastPayment = new Date(client.lastPaymentDate);
          const dueMonth = dueDate.getMonth();
          const dueYear = dueDate.getFullYear();
          const lastPaymentMonth = lastPayment.getMonth();
          const lastPaymentYear = lastPayment.getFullYear();
          
          // Se o último pagamento foi no mesmo mês/ano do vencimento, considerar como pago
          if (lastPaymentMonth === dueMonth && lastPaymentYear === dueYear) {
            status = 'RECEIVED';
            console.log(`✅ [getClientRecurringDues] Cliente ${client.name} - Vencimento ${dueMonth + 1}/${dueYear} marcado como RECEIVED (último pagamento: ${lastPaymentMonth + 1}/${lastPaymentYear})`);
          }
        }
        
        allDues.push({
          id: `client-${client.id}-${dueDate.getFullYear()}-${dueDate.getMonth() + 1}`,
          type: 'RECEIVABLE',
          description: `${client.name} - Recebimento Recorrente`,
          amount: client.monthlyValue || 0,
          dueDate: dueDate,
          status: status,
          clientName: client.name,
          priority,
          observations: `Projeto: ${client.project}`,
          originalData: client,
          source: 'CLIENT_RECURRING'
        });
      }
    });
    
    console.log(`📊 [getClientRecurringDues] Gerados ${allDues.length} vencimentos recorrentes`);
    
    return allDues;
  } catch (error) {
    console.error("❌ [getClientRecurringDues] Erro ao buscar clientes recorrentes:", error);
    return [];
  }
};



/**
 * Buscar todos os vencimentos financeiros do sistema
 */
export const getAllFinancialDues = async (): Promise<FinancialDue[]> => {
  try {
    console.log("🔍 [getAllFinancialDues] Iniciando busca de vencimentos...");
    
    // Buscar de todas as fontes em paralelo
    const [payablesDues, receivablesDues, supplierRecurringDues, clientRecurringDues] = await Promise.all([
      getPayablesDues(),
      getReceivablesDues(),
      getSupplierRecurringDues(),
      getClientRecurringDues()
    ]);
    
    // Combinar todos os vencimentos
    const allDues = [
      ...payablesDues,
      ...receivablesDues,
      ...supplierRecurringDues,
      ...clientRecurringDues
    ];
    
    console.log(`📊 [getAllFinancialDues] Total de vencimentos encontrados: ${allDues.length}`);
    console.log(`📊 [getAllFinancialDues] Detalhes:`, {
      contasAPagar: payablesDues.length,
      contasAReceber: receivablesDues.length,
      fornecedoresRecorrentes: supplierRecurringDues.length,
      clientesRecorrentes: clientRecurringDues.length
    });
    
    // Ordenar por data de vencimento
    allDues.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
    
    return allDues;
  } catch (error) {
    console.error("❌ [getAllFinancialDues] Erro ao buscar vencimentos:", error);
    return [];
  }
};

/**
 * Buscar estatísticas dos vencimentos
 */
export const getFinancialDuesStats = async () => {
  try {
    const allDues = await getAllFinancialDues();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const overdue = allDues.filter(due => due.status === 'OVERDUE');
    const dueToday = allDues.filter(due => {
      const dueDate = new Date(due.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate.getTime() === today.getTime() && due.status === 'PENDING';
    });
    
    const dueThisWeek = allDues.filter(due => {
      const daysUntilDue = Math.ceil((due.dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilDue >= 0 && daysUntilDue <= 7 && due.status === 'PENDING';
    });
    
    const receivables = allDues.filter(due => due.type === 'RECEIVABLE' && due.status === 'PENDING');
    const payables = allDues.filter(due => due.type === 'PAYABLE' && due.status === 'PENDING');
    
    return {
      overdue: {
        count: overdue.length,
        amount: overdue.reduce((sum, due) => sum + due.amount, 0)
      },
      dueToday: {
        count: dueToday.length,
        amount: dueToday.reduce((sum, due) => sum + due.amount, 0)
      },
      dueThisWeek: {
        count: dueThisWeek.length,
        amount: dueThisWeek.reduce((sum, due) => sum + due.amount, 0)
      },
      receivables: {
        count: receivables.length,
        amount: receivables.reduce((sum, due) => sum + due.amount, 0)
      },
      payables: {
        count: payables.length,
        amount: payables.reduce((sum, due) => sum + due.amount, 0)
      }
    };
  } catch (error) {
    console.error("❌ [getFinancialDuesStats] Erro ao calcular estatísticas:", error);
    return {
      overdue: { count: 0, amount: 0 },
      dueToday: { count: 0, amount: 0 },
      dueThisWeek: { count: 0, amount: 0 },
      receivables: { count: 0, amount: 0 },
      payables: { count: 0, amount: 0 }
    };
  }
};

/**
 * Atualizar status de um vencimento
 */
export const updateFinancialDueStatus = async (
  dueId: string, 
  newStatus: 'PENDING' | 'PAID' | 'RECEIVED',
  paymentData?: {
    paymentDate?: Date;
    paymentAmount?: number;
    paymentMethod?: string;
    observations?: string;
  }
): Promise<void> => {
  try {
    console.log(`🚀 [updateFinancialDueStatus] INICIANDO atualização para vencimento ${dueId}`);
    console.log(`📋 [updateFinancialDueStatus] Novo status: ${newStatus}`);
    console.log(`📋 [updateFinancialDueStatus] Dados de pagamento:`, paymentData);
    
    // Primeiro, buscar o vencimento para identificar sua origem
    console.log(`🔍 [updateFinancialDueStatus] Buscando vencimento ${dueId} para identificar origem...`);
    const allDues = await getAllFinancialDues();
    const targetDue = allDues.find(due => due.id === dueId);
    
    if (!targetDue) {
      console.error(`❌ [updateFinancialDueStatus] Vencimento com ID ${dueId} não encontrado`);
      throw new Error(`Vencimento com ID ${dueId} não encontrado`);
    }
    
    console.log(`✅ [updateFinancialDueStatus] Vencimento encontrado:`, {
      id: targetDue.id,
      description: targetDue.description,
      type: targetDue.type,
      source: targetDue.source,
      currentStatus: targetDue.status
    });
    
    // Atualizar baseado na origem do vencimento
    console.log(`🔄 [updateFinancialDueStatus] Atualizando baseado na origem: ${targetDue.source}`);
    
    switch (targetDue.source) {
      case 'ACCOUNT_PAYABLE':
        console.log(`💳 [updateFinancialDueStatus] Processando conta a pagar...`);
        const payableUpdateData: any = {
          status: newStatus === 'PAID' ? 'PAGO' : 'PENDENTE'
        };
        
        if (paymentData) {
          if (paymentData.paymentDate !== undefined) payableUpdateData.paymentDate = paymentData.paymentDate;
          if (paymentData.paymentAmount !== undefined) payableUpdateData.paymentAmount = paymentData.paymentAmount;
          if (paymentData.paymentMethod !== undefined) payableUpdateData.paymentMethod = paymentData.paymentMethod;
          if (paymentData.observations !== undefined) payableUpdateData.observations = paymentData.observations;
        }
        
        console.log(`📋 [updateFinancialDueStatus] Dados para atualização (PAYABLE):`, payableUpdateData);
        await updateAccountPayable(dueId, payableUpdateData);
        console.log(`✅ [updateFinancialDueStatus] Conta a pagar atualizada com sucesso`);
        break;
      
      case 'ACCOUNT_RECEIVABLE':
        console.log(`💰 [updateFinancialDueStatus] Processando conta a receber...`);
        const receivableUpdateData: any = {
          status: newStatus === 'RECEIVED' ? 'RECEBIDO' : 'PENDENTE'
        };
        
        if (paymentData) {
          if (paymentData.paymentDate !== undefined) receivableUpdateData.paymentDate = paymentData.paymentDate;
          if (paymentData.paymentAmount !== undefined) receivableUpdateData.paymentAmount = paymentData.paymentAmount;
          if (paymentData.paymentMethod !== undefined) receivableUpdateData.paymentMethod = paymentData.paymentMethod;
          if (paymentData.observations !== undefined) receivableUpdateData.observations = paymentData.observations;
        }
        
        console.log(`📋 [updateFinancialDueStatus] Dados para atualização (RECEIVABLE):`, receivableUpdateData);
        await updateAccountReceivable(dueId, receivableUpdateData);
        console.log(`✅ [updateFinancialDueStatus] Conta a receber atualizada com sucesso`);
        break;
      
      case 'SUPPLIER_RECURRING':
        console.log(`⚠️ [updateFinancialDueStatus] Fornecedor recorrente ${dueId} - funcionalidade de persistência não implementada`);
        console.log(`📋 [updateFinancialDueStatus] Para implementar, adicionar campo de status na interface Supplier`);
        break;
      
      case 'CLIENT_RECURRING':
        console.log(`👤 [updateFinancialDueStatus] Processando cliente recorrente...`);
        
        // Extrair o ID do cliente do ID do vencimento (formato: client-{clientId}-{year}-{month})
        const clientIdMatch = dueId.match(/^client-([^-]+)-/);
        if (!clientIdMatch) {
          console.error(`❌ [updateFinancialDueStatus] ID de vencimento de cliente recorrente inválido: ${dueId}`);
          throw new Error(`ID de vencimento de cliente recorrente inválido: ${dueId}`);
        }
        
        const clientId = clientIdMatch[1];
        console.log(`📋 [updateFinancialDueStatus] ID do cliente extraído: ${clientId}`);
        
        if (newStatus === 'RECEIVED') {
          console.log(`💰 [updateFinancialDueStatus] Marcando pagamento como recebido para cliente ${clientId}`);
          const paymentDate = paymentData?.paymentDate || new Date();
          await markPaymentReceived(clientId, paymentDate);
          console.log(`✅ [updateFinancialDueStatus] Pagamento marcado como recebido para cliente ${clientId}`);
        } else if (newStatus === 'PENDING') {
          console.log(`⏳ [updateFinancialDueStatus] Marcando cliente ${clientId} como pendente`);
          const updateData: any = {
            status: 'Ativo',
            lastPaymentDate: deleteField()
          };
          
          await updateFinancialClient(clientId, updateData);
          console.log(`✅ [updateFinancialDueStatus] Cliente ${clientId} marcado como pendente`);
        }
        break;
      
      default:
        console.error(`❌ [updateFinancialDueStatus] Origem do vencimento não reconhecida: ${targetDue.source}`);
        throw new Error(`Origem do vencimento não reconhecida: ${targetDue.source}`);
    }
    
    console.log(`✅ [updateFinancialDueStatus] Status atualizado com sucesso no banco de dados`);
  } catch (error) {
    console.error("❌ [updateFinancialDueStatus] Erro ao atualizar status:", error);
    throw error;
  }
}; 