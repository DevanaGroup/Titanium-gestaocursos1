// Tipos específicos para o sistema financeiro expandido

// ==================== PLANO DE CONTAS ====================
export interface ChartOfAccounts {
  id: string;
  code: string; // 1.1.01.001
  name: string;
  parentId?: string;
  level: number;
  nature: 'ATIVO' | 'PASSIVO' | 'PATRIMONIO' | 'RECEITA' | 'DESPESA';
  type: 'ANALITICA' | 'SINTETICA';
  acceptsLaunch: boolean;
  isActive: boolean;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== CENTRO DE CUSTOS ====================
export interface CostCenter {
  id: string;
  code: string;
  name: string;
  parentId?: string;
  responsible: string;
  responsibleName: string;
  budget?: number;
  description?: string;
  isActive: boolean;
  department: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== CONTAS A PAGAR ====================
export interface Supplier {
  id: string;
  name: string;
  cnpj?: string;
  cpf?: string;
  email: string;
  phone: string;
  services: string; // O que o fornecedor oferece
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  bankData?: {
    bank: string;
    agency: string;
    account: string;
    accountType: 'CORRENTE' | 'POUPANCA';
  };
  // Campos para recorrência mensal
  hasRecurrence?: boolean;
  monthlyValue?: number;
  paymentDay?: number; // Dia do mês para vencimento
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentInstallment {
  id: string;
  installmentNumber: number;
  amount: number;
  dueDate: Date;
  paidDate?: Date;
  status: 'PENDENTE' | 'PAGO' | 'VENCIDO' | 'CANCELADO';
  paymentMethod?: 'DINHEIRO' | 'PIX' | 'TRANSFERENCIA' | 'CARTAO' | 'BOLETO';
  bankAccount?: string;
  notes?: string;
}

export interface AccountsPayable {
  id: string;
  supplierId: string;
  supplierName: string;
  description: string;
  totalAmount: number;
  dueDate: Date;
  status: 'PENDENTE' | 'PAGO' | 'VENCIDO' | 'CANCELADO';
  costCenterId: string;
  accountId: string; // Plano de contas
  categoryId: string;
  installments: PaymentInstallment[];
  attachments: string[];
  approvedBy?: string;
  approvedAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== CONTAS A RECEBER ====================
export interface ReceiptInstallment {
  id: string;
  installmentNumber: number;
  amount: number;
  dueDate: Date;
  receivedDate?: Date;
  status: 'PENDENTE' | 'RECEBIDO' | 'VENCIDO' | 'CANCELADO';
  paymentMethod?: 'DINHEIRO' | 'PIX' | 'TRANSFERENCIA' | 'CARTAO' | 'BOLETO';
  bankAccount?: string;
  notes?: string;
}

export interface AccountsReceivable {
  id: string;
  clientId: string;
  clientName: string;
  description: string;
  totalAmount: number;
  dueDate: Date;
  status: 'PENDENTE' | 'RECEBIDO' | 'VENCIDO' | 'CANCELADO';
  costCenterId: string;
  accountId: string;
  categoryId: string;
  installments: ReceiptInstallment[];
  attachments: string[];
  invoiceNumber?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== FLUXO DE CAIXA ====================
export interface CashFlowEntry {
  id: string;
  date: Date;
  description: string;
  type: 'ENTRADA' | 'SAIDA';
  amount: number;
  category: string;
  costCenterId: string;
  accountId: string;
  status: 'REALIZADO' | 'PREVISTO';
  origin: 'CONTAS_PAGAR' | 'CONTAS_RECEBER' | 'MANUAL' | 'FOLHA_PAGAMENTO';
  originId?: string;
  bankAccount?: string;
  createdBy: string;
  createdAt: Date;
}

export interface CashFlowProjection {
  id: string;
  date: Date;
  initialBalance: number;
  entries: number;
  exits: number;
  finalBalance: number;
  createdAt: Date;
}

// ==================== FOLHA DE PAGAMENTO ====================
export interface PayrollBenefit {
  id: string;
  name: string;
  amount: number;
  type: 'FIXO' | 'VARIAVEL';
  isDiscountable: boolean;
}

export interface PayrollDeduction {
  id: string;
  name: string;
  amount: number;
  percentage?: number;
  type: 'INSS' | 'IRRF' | 'FGTS' | 'OUTROS';
}

export interface PayrollProvision {
  id: string;
  name: string;
  amount: number;
  percentage: number;
  type: 'FERIAS' | '13_SALARIO' | 'FGTS' | 'INSS_PATRONAL' | 'OUTROS';
}

export interface EmployeePayroll {
  id: string;
  employeeId: string;
  employeeName: string;
  month: number;
  year: number;
  grossSalary: number;
  benefits: PayrollBenefit[];
  deductions: PayrollDeduction[];
  provisions: PayrollProvision[];
  netSalary: number;
  workingDays: number;
  workingHours: number;
  overtimeHours: number;
  costCenterId: string;
  status: 'ABERTA' | 'FECHADA' | 'PAGA';
  paidAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== CONTABILIDADE ====================
export interface AccountingEntryLine {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  costCenterId?: string;
  description?: string;
}

export interface AccountingEntry {
  id: string;
  date: Date;
  description: string;
  document: string;
  entries: AccountingEntryLine[];
  totalDebit: number;
  totalCredit: number;
  costCenterId?: string;
  projectId?: string;
  status: 'RASCUNHO' | 'LANCADO' | 'APROVADO';
  approvedBy?: string;
  approvedAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== ORÇAMENTO ====================
export interface BudgetItem {
  id: string;
  accountId: string;
  costCenterId: string;
  month: number;
  year: number;
  budgetedAmount: number;
  realizedAmount: number;
  variance: number;
  variancePercentage: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Budget {
  id: string;
  year: number;
  name: string;
  description?: string;
  status: 'RASCUNHO' | 'APROVADO' | 'ATIVO';
  items: BudgetItem[];
  totalBudgeted: number;
  totalRealized: number;
  approvedBy?: string;
  approvedAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== INDICADORES FINANCEIROS ====================
export interface FinancialIndicator {
  id: string;
  name: string;
  value: number;
  previousValue: number;
  variation: number;
  variationPercentage: number;
  target?: number;
  unit: 'CURRENCY' | 'PERCENTAGE' | 'NUMBER' | 'DAYS';
  period: string;
  category: 'LIQUIDEZ' | 'RENTABILIDADE' | 'ENDIVIDAMENTO' | 'OPERACIONAL';
  calculatedAt: Date;
}

// ==================== DASHBOARD ====================
export interface FinancialDashboardData {
  currentCash: number;
  cashProjection7Days: number;
  monthlyRevenue: number;
  monthlyRevenueTarget: number;
  overdueReceivables: number;
  overduePayables: number;
  grossMargin: number;
  topClients: Array<{
    id: string;
    name: string;
    revenue: number;
  }>;
  topProjects: Array<{
    id: string;
    name: string;
    profitability: number;
  }>;
  indicators: FinancialIndicator[];
  upcomingDues: Array<{
    type: 'RECEIVABLE' | 'PAYABLE';
    description: string;
    amount: number;
    dueDate: Date;
  }>;
}

// ==================== ENUMS E UTILITÁRIOS ====================
export enum FinancialModule {
  OPERATIONAL = 'OPERATIONAL',
  DUE_DATES = 'DUE_DATES',
  ACCOUNTS_PAYABLE = 'ACCOUNTS_PAYABLE',
  ACCOUNTS_RECEIVABLE = 'ACCOUNTS_RECEIVABLE',
  HUMAN_RESOURCES = 'HUMAN_RESOURCES',
  TAX_FISCAL = 'TAX_FISCAL',
  ACCOUNTING = 'ACCOUNTING',
  COSTS_PROJECTS = 'COSTS_PROJECTS',
  REPORTS_BI = 'REPORTS_BI'
}

export enum FinancialPermission {
  // Contas a Pagar
  CREATE_PAYABLES = 'CREATE_PAYABLES',
  APPROVE_PAYABLES = 'APPROVE_PAYABLES',
  PAY_BILLS = 'PAY_BILLS',
  
  // Contas a Receber
  CREATE_RECEIVABLES = 'CREATE_RECEIVABLES',
  RECEIVE_PAYMENTS = 'RECEIVE_PAYMENTS',
  MANAGE_CUSTOMERS = 'MANAGE_CUSTOMERS',
  
  // Folha de Pagamento
  VIEW_PAYROLL = 'VIEW_PAYROLL',
  MANAGE_PAYROLL = 'MANAGE_PAYROLL',
  APPROVE_PAYROLL = 'APPROVE_PAYROLL',
  
  // Contabilidade
  CREATE_ENTRIES = 'CREATE_ENTRIES',
  APPROVE_ENTRIES = 'APPROVE_ENTRIES',
  CLOSE_MONTHS = 'CLOSE_MONTHS',
  
  // Plano de Contas e Centro de Custos
  MANAGE_CHART_ACCOUNTS = 'MANAGE_CHART_ACCOUNTS',
  MANAGE_COST_CENTERS = 'MANAGE_COST_CENTERS',
  
  // Relatórios
  VIEW_FINANCIAL_REPORTS = 'VIEW_FINANCIAL_REPORTS',
  EXPORT_DATA = 'EXPORT_DATA',
  VIEW_COSTS = 'VIEW_COSTS',
  VIEW_DASHBOARD = 'VIEW_DASHBOARD'
}

export interface FinancialPermissions {
  [key: string]: boolean;
}

// ==================== FILTROS E BUSCAS ====================
export interface FinancialFilter {
  startDate?: Date;
  endDate?: Date;
  costCenterId?: string;
  accountId?: string;
  status?: string[];
  category?: string;
  supplierId?: string;
  clientId?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface FinancialSearchResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
} 