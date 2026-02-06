import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Plus,
  Search,
  Filter,
  Calendar,
  DollarSign,
  Building,
  Clock,
  CheckCircle,
  AlertTriangle,
  Eye,
  Edit,
  Calculator,
  FileText,
  Download,
  X,
  Settings,
  Save,
  RefreshCw,
  MoreVertical
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { getRealCollaborators } from "@/services/financialCoreService";
import { Collaborator } from "@/types";
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';

interface PayrollRecord {
  id: string;
  collaboratorId: string;
  collaboratorName: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  period: string;
  status: 'CALCULADO' | 'PAGO' | 'PENDENTE';
  paymentDate?: Date;
  hierarchyLevel: string;
  // Informações bancárias
  bankInfo?: {
    bank: string;
    agency: string;
    account: string;
    pixKey: string;
  };
}

interface SalaryConfig {
  [key: string]: number;
}

interface PayrollConfig {
  salaryByLevel: SalaryConfig;
  allowancesPercentage: number;
  deductionsPercentage: number;
}

export const PayrollModule = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  
  // Estados para modais
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);
  
  // Estados para filtros
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [hierarchyFilter, setHierarchyFilter] = useState<string>("all");

  // Estados para configurações salariais
  const [payrollConfig, setPayrollConfig] = useState<PayrollConfig>({
    salaryByLevel: {
      'Presidente': 35000,
      'Diretor': 25000,
      'Diretor de TI': 28000,
      'Diretor Financeiro': 30000,
      'Gerente': 15000,
      'Coordenador': 10000,
      'Supervisor': 8000,
      'Líder Técnico': 12000,
      'Engenheiro': 9000,
      'Analista': 6000,
      'Financeiro': 7000,
      'Técnico/Assistente': 4000,
      'Comercial': 5000,
      'Estagiário/Auxiliar': 2000
    },
    allowancesPercentage: 15,
    deductionsPercentage: 25
  });

  // Estados para edição de dados bancários
  const [editingBankInfo, setEditingBankInfo] = useState({
    bank: '',
    agency: '',
    account: '',
    pixKey: ''
  });
  const [editingStatus, setEditingStatus] = useState<'CALCULADO' | 'PAGO' | 'PENDENTE'>('PENDENTE');
  const [editingPeriod, setEditingPeriod] = useState('');

  // ⚠️ NOVOS ESTADOS: Para edição de salários individuais
  const [editingSalaryValues, setEditingSalaryValues] = useState({
    baseSalary: 0,
    allowances: 0,
    deductions: 0,
    netSalary: 0
  });

  // Carregar configurações do localStorage ao inicializar
  useEffect(() => {
    const loadSavedConfig = async () => {
      try {
        console.log("🔄 Iniciando carregamento das configurações...");
        
        // 1. Primeiro, tentar carregar do Firebase
        try {
          const configDoc = await getDoc(doc(db, 'payrollConfigurations', 'default'));
          if (configDoc.exists()) {
            const firebaseConfig = configDoc.data();
            console.log("📂 Configuração carregada do Firebase:", firebaseConfig);
            
            // Verificar se a configuração do Firebase é válida
            if (firebaseConfig.allowancesPercentage !== undefined && 
                firebaseConfig.deductionsPercentage !== undefined &&
                firebaseConfig.salaryByLevel && 
                Object.keys(firebaseConfig.salaryByLevel).length > 0) {
              
              const configToSet = {
                salaryByLevel: firebaseConfig.salaryByLevel,
                allowancesPercentage: firebaseConfig.allowancesPercentage,
                deductionsPercentage: firebaseConfig.deductionsPercentage
              };
              
              setPayrollConfig(configToSet);
              
              // Sincronizar com localStorage
              localStorage.setItem('payrollConfig', JSON.stringify(configToSet));
              
              toast.success("✅ Configurações carregadas do Firebase!");
              toast.info(`📊 Carregado: ${firebaseConfig.allowancesPercentage}% adicionais, ${firebaseConfig.deductionsPercentage}% descontos`);
              return;
            }
          }
        } catch (firebaseError) {
          console.warn("⚠️ Erro ao carregar do Firebase, tentando localStorage:", firebaseError);
        }
        
        // 2. Se falhou no Firebase, tentar localStorage
        const savedConfig = localStorage.getItem('payrollConfig');
        
        if (savedConfig) {
          console.log("📂 Dados brutos do localStorage:", savedConfig);
          const parsedConfig = JSON.parse(savedConfig);
          console.log("📂 Dados parseados do localStorage:", parsedConfig);
          
          // Verificar se a configuração carregada tem todos os campos necessários
          if (parsedConfig.allowancesPercentage !== undefined && 
              parsedConfig.deductionsPercentage !== undefined &&
              parsedConfig.salaryByLevel && 
              Object.keys(parsedConfig.salaryByLevel).length > 0) {
            
            console.log("✅ Configuração válida encontrada:");
            console.log("   - Adicionais:", parsedConfig.allowancesPercentage, "%");
            console.log("   - Descontos:", parsedConfig.deductionsPercentage, "%");
            console.log("   - Cargos:", Object.keys(parsedConfig.salaryByLevel).length);
            
            setPayrollConfig(parsedConfig);
            
            toast.success("✅ Configurações de folha carregadas do backup local!");
            toast.info(`📊 Carregado: ${parsedConfig.allowancesPercentage}% adicionais, ${parsedConfig.deductionsPercentage}% descontos`);
          } else {
            console.log("⚠️ Configuração salva inválida, campos faltando:");
            console.log("   - allowancesPercentage:", parsedConfig.allowancesPercentage);
            console.log("   - deductionsPercentage:", parsedConfig.deductionsPercentage);
            console.log("   - salaryByLevel:", parsedConfig.salaryByLevel ? Object.keys(parsedConfig.salaryByLevel).length : "undefined");
            toast.warning("⚠️ Configuração salva inválida, usando valores padrão");
          }
        } else {
          console.log("📝 Nenhuma configuração salva encontrada");
          toast.info("📝 Configurações padrão inicializadas - Adicionais: 15%, Descontos: 25%");
        }
      } catch (error) {
        console.error("❌ Erro ao carregar configurações:", error);
        toast.error("❌ Erro ao carregar configurações salvas, usando padrões");
      }
    };

    loadSavedConfig();
  }, []);

  // Salvar configurações automaticamente sempre que payrollConfig mudar
  // ⚠️ REMOVIDO: Auto-save automático estava causando problemas
  // Os valores agora são salvos apenas quando o usuário clicar em "Salvar Configurações"

  // Carregamento inicial dos dados (apenas uma vez)
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const collaboratorsData = await getRealCollaborators();
        
        console.log("🧑‍💼 PayrollModule - Colaboradores carregados:", collaboratorsData.length);
        console.log("👥 PayrollModule - Lista de colaboradores:", collaboratorsData.map(c => `${c.firstName} ${c.lastName} (${c.uid}) - ${c.source || 'unknown'}`));
        
        setCollaborators(collaboratorsData);  
        
        if (collaboratorsData.length > 0) {
          toast.success(`✅ Dados carregados: ${collaboratorsData.length} colaboradores`);
        } else {
          toast.info("ℹ️ Nenhum colaborador encontrado no sistema.");
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        toast.error("❌ Erro ao carregar dados de RH");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []); // Sem dependências - executa apenas uma vez

  // ⚠️ MODIFICAÇÃO CRÍTICA: Carregar dados salvos OU gerar novos APENAS quando colaboradores mudam
  // NÃO recalcular quando configurações mudam para preservar valores manuais
  useEffect(() => {
    const loadPayrollRecords = async () => {
      try {
        console.log("🔄 Carregando dados da folha de pagamento...");
        
        // 1. SEMPRE tentar carregar dados salvos do Firebase PRIMEIRO
        try {
          const payrollDoc = await getDoc(doc(db, 'payrollRecords', 'current'));
          if (payrollDoc.exists()) {
            const data = payrollDoc.data();
            const savedRecords = data.records || [];
            
            // Se encontrou dados salvos, usar eles independente se há colaboradores ou não
            if (savedRecords.length > 0) {
              console.log("✅ Dados reais carregados do Firebase:", savedRecords.length);
              setPayrollRecords(savedRecords);
              
              // Sincronizar com localStorage
              localStorage.setItem('payrollRecords', JSON.stringify(savedRecords));
              
              toast.success(`✅ ${savedRecords.length} registros carregados do Firebase`);
              return;
            }
          }
        } catch (firebaseError) {
          console.warn("⚠️ Erro ao acessar Firebase:", firebaseError);
        }
        
        // 2. Se falhou no Firebase, tentar localStorage
        const savedRecords = localStorage.getItem('payrollRecords');
        if (savedRecords) {
          const parsedRecords = JSON.parse(savedRecords);
          
          if (parsedRecords && parsedRecords.length > 0) {
            console.log("✅ Dados reais carregados do localStorage:", parsedRecords.length);
            setPayrollRecords(parsedRecords);
            toast.success(`✅ ${parsedRecords.length} registros carregados do backup local`);
            return;
          }
        }
        
        // 3. Se não há dados salvos e há colaboradores, gerar folha automaticamente
        if (collaborators.length > 0) {
          console.log("🔄 Gerando folha baseada nos colaboradores:", collaborators.length);
          
          const autoGeneratedRecords: PayrollRecord[] = collaborators.map((collaborator) => {
            const baseSalary = getSalaryByLevel(collaborator.hierarchyLevel);
            const allowances = baseSalary * (payrollConfig.allowancesPercentage / 100);
            const deductions = baseSalary * (payrollConfig.deductionsPercentage / 100);
            const netSalary = baseSalary + allowances - deductions;
            
            return {
              id: `payroll-${collaborator.id}-${Date.now()}`,
              collaboratorId: collaborator.id,
              collaboratorName: `${collaborator.firstName} ${collaborator.lastName}`,
              baseSalary,
              allowances,
              deductions,
              netSalary,
              period: new Date().toISOString().slice(0, 7),
              status: 'CALCULADO' as const,
              hierarchyLevel: collaborator.hierarchyLevel
            };
          });
          
          setPayrollRecords(autoGeneratedRecords);
          
          // Salvar automaticamente
          localStorage.setItem('payrollRecords', JSON.stringify(autoGeneratedRecords));
          
          // Salvar no Firebase
          try {
            const payrollDoc = doc(db, 'payrollRecords', 'current');
            const cleanedRecords = autoGeneratedRecords.map(record => cleanPayrollRecord(record));
            const dataToSave = cleanDataForFirebase({
              records: cleanedRecords,
              lastUpdated: serverTimestamp(),
              period: new Date().toISOString().slice(0, 7),
              totalRecords: autoGeneratedRecords.length,
              totalSalaryBase: autoGeneratedRecords.reduce((sum, r) => sum + r.baseSalary, 0),
              totalAllowances: autoGeneratedRecords.reduce((sum, r) => sum + r.allowances, 0),
              totalDeductions: autoGeneratedRecords.reduce((sum, r) => sum + r.deductions, 0),
              totalNet: autoGeneratedRecords.reduce((sum, r) => sum + r.netSalary, 0),
              configSnapshot: payrollConfig
            });
            await setDoc(payrollDoc, dataToSave);
            console.log("✅ Nova folha salva no Firebase");
          } catch (firebaseError) {
            console.error("❌ Erro ao salvar no Firebase:", firebaseError);
          }
          
          toast.success(`✅ Folha gerada para ${autoGeneratedRecords.length} colaboradores`);
          return;
        }
        
        // 4. Se não há dados nem colaboradores
        console.log("📋 Aguardando colaboradores para gerar folha");
        setPayrollRecords([]);
        
      } catch (error) {
        console.error("❌ Erro ao carregar dados:", error);
        setPayrollRecords([]);
        toast.error("Erro ao carregar folha de pagamento");
      }
    };

    loadPayrollRecords();
  }, [collaborators]);

  // Handlers para botões
  const handleCalculatePayroll = async () => {
    if (collaborators.length === 0) {
      toast.error("Nenhum colaborador encontrado. Cadastre colaboradores primeiro.");
      return;
    }

    try {
      toast.loading("Calculando folha de pagamento...", { id: "calculating-payroll" });
      
      // Gerar registros baseados nos colaboradores reais atuais
      const newPayrollRecords: PayrollRecord[] = collaborators.map((collaborator) => {
        const baseSalary = getSalaryByLevel(collaborator.hierarchyLevel);
        const allowances = baseSalary * (payrollConfig.allowancesPercentage / 100);
        const deductions = baseSalary * (payrollConfig.deductionsPercentage / 100);
        const netSalary = baseSalary + allowances - deductions;
        
        return {
          id: `payroll-${collaborator.id}-${Date.now()}`,
          collaboratorId: collaborator.id,
          collaboratorName: `${collaborator.firstName} ${collaborator.lastName}`,
          baseSalary,
          allowances,
          deductions,
          netSalary,
          period: new Date().toISOString().slice(0, 7), // YYYY-MM atual
          status: 'CALCULADO' as const,
          hierarchyLevel: collaborator.hierarchyLevel
        };
      });
      
      // Substituir registros antigos pelos novos
      setPayrollRecords(newPayrollRecords);
      
      // Salvar no localStorage
      localStorage.setItem('payrollRecords', JSON.stringify(newPayrollRecords));
      
      // Salvar no Firebase
      try {
        const payrollDoc = doc(db, 'payrollRecords', 'current');
        const cleanedRecords = newPayrollRecords.map(record => cleanPayrollRecord(record));
        const dataToSave = cleanDataForFirebase({
          records: cleanedRecords,
          lastUpdated: serverTimestamp(),
          period: new Date().toISOString().slice(0, 7),
          totalRecords: newPayrollRecords.length,
          totalSalaryBase: newPayrollRecords.reduce((sum, r) => sum + r.baseSalary, 0),
          totalAllowances: newPayrollRecords.reduce((sum, r) => sum + r.allowances, 0),
          totalDeductions: newPayrollRecords.reduce((sum, r) => sum + r.deductions, 0),
          totalNet: newPayrollRecords.reduce((sum, r) => sum + r.netSalary, 0),
          configSnapshot: payrollConfig
        });
        await setDoc(payrollDoc, dataToSave);
        console.log("✅ Nova folha salva no Firebase!");
      } catch (firebaseError) {
        console.error("❌ Erro ao salvar no Firebase:", firebaseError);
        toast.warning("Folha calculada mas erro ao salvar no Firebase");
      }
      
      toast.dismiss("calculating-payroll");
      toast.success(`✅ Folha calculada para ${newPayrollRecords.length} colaboradores!`);
      
    } catch (error) {
      console.error("Erro ao calcular folha:", error);
      toast.dismiss("calculating-payroll");
      toast.error("Erro ao calcular folha de pagamento");
    }
  };

  const handleNewCollaborator = () => {
    toast.info("Funcionalidade 'Novo Colaborador' em desenvolvimento");
  };

  const handleGenerateReport = () => {
    // Gerar CSV com todos os dados
    const csvData = payrollRecords.map(record => ({
      'Nome': record.collaboratorName,
      'Hierarquia': record.hierarchyLevel,
      'Salário Base': record.baseSalary,
      'Adicionais': record.allowances,
      'Descontos': record.deductions,
      'Líquido': record.netSalary,
      'Status': record.status,
      'Período': record.period
    }));
    
    const csvContent = Object.keys(csvData[0]).join(',') + '\n' + 
      csvData.map(row => Object.values(row).join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'folha-pagamento.csv';
    link.click();
    window.URL.revokeObjectURL(url);
    
    toast.success("Relatório CSV gerado e baixado com sucesso!");
  };

  const handleFilterClick = () => {
    setFiltersOpen(true);
  };

  // Novos handlers para os botões de ação
  const handleViewPayroll = (record: PayrollRecord) => {
    setSelectedRecord(record);
    setViewModalOpen(true);
  };

  const handleEditPayroll = (record: PayrollRecord) => {
    setSelectedRecord(record);
    
    // Carregar dados atuais nos estados de edição
    setEditingStatus(record.status);
    setEditingPeriod(record.period);
    setEditingBankInfo({
      bank: record.bankInfo?.bank || '',
      agency: record.bankInfo?.agency || '',
      account: record.bankInfo?.account || '',
      pixKey: record.bankInfo?.pixKey || ''
    });

    // ⚠️ NOVO: Carregar valores salariais para edição
    setEditingSalaryValues({
      baseSalary: record.baseSalary,
      allowances: record.allowances,
      deductions: record.deductions,
      netSalary: record.netSalary
    });
    
    setEditModalOpen(true);
  };

  const handleGeneratePayrollReport = (record: PayrollRecord) => {
    // Gerar PDF individual (simulado)
    const reportData = {
      collaborator: record.collaboratorName,
      period: record.period,
      baseSalary: record.baseSalary,
      allowances: record.allowances,
      deductions: record.deductions,
      netSalary: record.netSalary,
      status: record.status
    };
    
    // Simular download do relatório
    const jsonContent = JSON.stringify(reportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `folha-${record.collaboratorName.replace(/\s+/g, '-')}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    toast.success(`Relatório de ${record.collaboratorName} baixado com sucesso!`);
  };

  const handleGenerateReports = () => {
    handleGenerateReport();
  };

  const handleSaveEdit = async () => {
    if (selectedRecord) {
      // Criar/atualizar registro individual com informações bancárias
      const collaboratorBankInfo = {
        collaboratorId: selectedRecord.collaboratorId,
        collaboratorName: selectedRecord.collaboratorName,
        hierarchyLevel: selectedRecord.hierarchyLevel,
        bankInfo: {
          bank: editingBankInfo.bank,
          agency: editingBankInfo.agency,
          account: editingBankInfo.account,
          pixKey: editingBankInfo.pixKey
        },
        lastUpdated: new Date(),
        period: editingPeriod || selectedRecord.period,
        status: editingStatus
      };

      try {
        // 1. Salvar informações bancárias em coleção específica
        const bankInfoDoc = doc(db, 'collaboratorsBankInfo', selectedRecord.collaboratorId);
        const cleanedBankInfo = cleanDataForFirebase(collaboratorBankInfo);
        await setDoc(bankInfoDoc, cleanedBankInfo);
        console.log("✅ Informações bancárias salvas no Firebase!");

        // 2. Também salvar/atualizar na coleção de payrollRecords
        if (payrollRecords.length > 0) {
          const updatedRecords = payrollRecords.map(record => {
            if (record.id === selectedRecord.id) {
              return {
                ...record,
                status: editingStatus,
                period: editingPeriod,
                baseSalary: editingSalaryValues.baseSalary || record.baseSalary,
                allowances: editingSalaryValues.allowances || record.allowances,
                deductions: editingSalaryValues.deductions || record.deductions,
                netSalary: editingSalaryValues.netSalary || record.netSalary,
                bankInfo: {
                  bank: editingBankInfo.bank,
                  agency: editingBankInfo.agency,
                  account: editingBankInfo.account,
                  pixKey: editingBankInfo.pixKey
                }
              };
            }
            return record;
          });
          
          setPayrollRecords(updatedRecords);
          localStorage.setItem('payrollRecords', JSON.stringify(updatedRecords));
          
          // Salvar no Firebase
          const payrollDoc = doc(db, 'payrollRecords', 'current');
          const cleanedUpdatedRecords = updatedRecords.map(record => cleanPayrollRecord(record));
          const dataToSave = cleanDataForFirebase({
            records: cleanedUpdatedRecords,
            lastUpdated: serverTimestamp(),
            updatedBy: 'user',
            totalRecords: updatedRecords.length,
            totalSalaryBase: updatedRecords.reduce((sum, r) => sum + r.baseSalary, 0),
            totalAllowances: updatedRecords.reduce((sum, r) => sum + r.allowances, 0),
            totalDeductions: updatedRecords.reduce((sum, r) => sum + r.deductions, 0),
            totalNet: updatedRecords.reduce((sum, r) => sum + r.netSalary, 0),
            configSnapshot: payrollConfig
          });
          await setDoc(payrollDoc, dataToSave);
        }

        // Feedback de sucesso
        const changes = [];
        if (editingBankInfo.bank) changes.push(`Banco: ${editingBankInfo.bank}`);
        if (editingBankInfo.agency) changes.push(`Agência: ${editingBankInfo.agency}`);
        if (editingBankInfo.account) changes.push(`Conta: ${editingBankInfo.account}`);
        if (editingBankInfo.pixKey) changes.push(`PIX: ${editingBankInfo.pixKey}`);
        
        toast.success(`✅ Informações bancárias de ${selectedRecord.collaboratorName} salvas!`);
        if (changes.length > 0) {
          toast.info(`💳 Dados salvos: ${changes.join(', ')}`);
        }

      } catch (firebaseError) {
        console.error("❌ Erro ao salvar no Firebase:", firebaseError);
        toast.error("❌ Erro ao salvar informações bancárias no Firebase");
      }
      
      closeEditModal();
    }
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setSelectedRecord(null);
    // Limpar estados de edição
    setEditingBankInfo({ bank: '', agency: '', account: '', pixKey: '' });
    setEditingStatus('PENDENTE');
    setEditingPeriod('');
    // ⚠️ NOVO: Limpar valores salariais
    setEditingSalaryValues({
      baseSalary: 0,
      allowances: 0,
      deductions: 0,
      netSalary: 0
    });
  };

  const applyFilters = () => {
    setFiltersOpen(false);
    toast.success("Filtros aplicados com sucesso!");
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setHierarchyFilter("all");
    toast.info("Filtros limpos");
  };

  const getSalaryByLevel = (level: string): number => {
    return payrollConfig.salaryByLevel[level] || 3000;
  };

  // Função para formatar valor como moeda brasileira
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Função para formatar entrada de moeda (sem símbolo R$)
  const formatCurrencyInput = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Função para processar entrada de moeda
  const parseCurrencyInput = (value: string): number => {
    // Remove todos os caracteres não numéricos
    const numericValue = value.replace(/\D/g, '');
    return parseInt(numericValue) || 0;
  };

  // Função para atualizar configuração de salário com formatação
  const updateSalaryConfig = (level: string, inputValue: string) => {
    const numericValue = parseCurrencyInput(inputValue);
    
    console.log(`🔄 Atualizando salário ${level}: ${inputValue} → ${numericValue}`);
    
    // Só atualiza se o valor realmente mudou
    setPayrollConfig(prev => {
      if (prev.salaryByLevel[level] === numericValue) {
        console.log(`⚪ Valor inalterado para ${level}: ${numericValue}`);
        return prev; // Não atualiza se o valor for igual
      }
      
      const newConfig = {
        ...prev,
        salaryByLevel: {
          ...prev.salaryByLevel,
          [level]: numericValue
        }
      };
      
      console.log(`✅ Configuração atualizada para ${level}:`, newConfig);
      return newConfig;
    });
  };

  // Função para atualizar percentuais
  const updatePercentages = (allowances: number, deductions: number) => {
    console.log(`🔄 Atualizando percentuais: Adicionais ${allowances}%, Descontos ${deductions}%`);
    
    setPayrollConfig(prev => {
      const newConfig = {
        ...prev,
        allowancesPercentage: allowances,
        deductionsPercentage: deductions
      };
      
      console.log(`✅ Percentuais atualizados:`, newConfig);
      return newConfig;
    });
  };

  // Função para salvar configurações
  const savePayrollConfig = async () => {
    try {
      console.log("🔄 Iniciando salvamento das configurações:", payrollConfig);
      
      // 1. Salvar no Firebase primeiro
      try {
        const configDoc = doc(db, 'payrollConfigurations', 'default');
        const dataToSave = cleanDataForFirebase({
          ...payrollConfig,
          lastUpdated: serverTimestamp(),
          updatedBy: 'user' // Aqui você pode colocar o ID do usuário logado
        });
        await setDoc(configDoc, dataToSave);
        console.log("✅ Configurações salvas no Firebase!");
      } catch (firebaseError) {
        console.error("❌ Erro ao salvar no Firebase:", firebaseError);
        toast.error("❌ Erro ao salvar no Firebase, salvando apenas localmente");
      }
      
      // 2. Salvar no localStorage como backup
      const configString = JSON.stringify(payrollConfig);
      localStorage.setItem('payrollConfig', configString);
      
      // Verificar se foi salvo no localStorage
      const verification1 = localStorage.getItem('payrollConfig');
      
      if (!verification1) {
        throw new Error("Primeira verificação falhou - localStorage não aceitou os dados");
      }
      
      // Segunda verificação após um pequeno delay
      setTimeout(() => {
        const verification2 = localStorage.getItem('payrollConfig');
        if (!verification2) {
          console.error("❌ Segunda verificação falhou - dados perdidos");
          toast.error("❌ Problema de persistência detectado!");
          return;
        }
        
        const parsedVerify = JSON.parse(verification2);
        console.log("💾 Configurações salvas e verificadas (2ª verificação):", parsedVerify);
        
        // Verificar se os valores críticos estão corretos
        if (parsedVerify.allowancesPercentage !== payrollConfig.allowancesPercentage ||
            parsedVerify.deductionsPercentage !== payrollConfig.deductionsPercentage) {
          console.error("❌ Valores incorretos salvos!");
          console.error("Original:", payrollConfig);
          console.error("Salvo:", parsedVerify);
          toast.error("❌ Configurações salvas incorretamente!");
          return;
        }
        
        toast.success("✅ Configurações salvas e verificadas no Firebase e localmente!");
      }, 100);
      
      const parsedVerify = JSON.parse(verification1);
      console.log("💾 Configurações salvas e verificadas (1ª verificação):", parsedVerify);
      
      // Feedback detalhado sobre o que foi salvo
      const totalCargos = Object.keys(payrollConfig.salaryByLevel).length;
      const faixaSalarial = `R$ ${Math.min(...Object.values(payrollConfig.salaryByLevel)).toLocaleString('pt-BR')} - R$ ${Math.max(...Object.values(payrollConfig.salaryByLevel)).toLocaleString('pt-BR')}`;
      
      toast.success("✅ Configurações salvas com sucesso no Firebase!");
      toast.info(`📊 Salvo: ${totalCargos} cargos, ${payrollConfig.allowancesPercentage}% adicionais, ${payrollConfig.deductionsPercentage}% descontos`);
      toast.info(`💰 Faixa salarial: ${faixaSalarial}`);
      toast.info("💡 Para aplicar as novas configurações aos salários existentes, use 'Recalcular Folha'");
      
    } catch (error) {
      console.error("❌ Erro ao salvar configurações:", error);
      toast.error(`❌ Erro ao salvar configurações: ${error.message}`);
    }
  };

  // ⚠️ NOVA FUNÇÃO: Recálculo manual e controlado pelo usuário
  const handleRecalculatePayroll = async () => {
    if (collaborators.length === 0) {
      toast.error("❌ Nenhum colaborador encontrado para recalcular");
      return;
    }

    // Confirmar ação antes de recalcular
    const confirmed = window.confirm(
      `⚠️ ATENÇÃO: Esta ação irá recalcular TODOS os salários baseado nas configurações atuais.\n\n` +
      `Isso pode sobrescrever valores que foram alterados manualmente.\n\n` +
      `Deseja continuar?`
    );

    if (!confirmed) {
      toast.info("❌ Recálculo cancelado pelo usuário");
      return;
    }

    // Backup dos dados atuais
    const backupRecords = [...payrollRecords];
    
    try {
      const recalculatedRecords = collaborators.map((collaborator) => {
        // Tentar preservar algumas informações do registro existente
        const existingRecord = payrollRecords.find(r => r.collaboratorId === collaborator.id);
        
        const baseSalary = getSalaryByLevel(collaborator.hierarchyLevel);
        const allowances = baseSalary * (payrollConfig.allowancesPercentage / 100);
        const deductions = baseSalary * (payrollConfig.deductionsPercentage / 100);
        const netSalary = baseSalary + allowances - deductions;
        
        return {
          id: existingRecord?.id || `payroll-${collaborator.id}`,
          collaboratorId: collaborator.id,
          collaboratorName: `${collaborator.firstName} ${collaborator.lastName}`,
          baseSalary,
          allowances,
          deductions,
          netSalary,
          period: existingRecord?.period || "2025-01",
          status: existingRecord?.status || 'PENDENTE',
          hierarchyLevel: collaborator.hierarchyLevel,
          bankInfo: existingRecord?.bankInfo // Preservar informações bancárias
        };
      });

      // Calcular diferenças para feedback
      const oldTotal = backupRecords.reduce((sum, r) => sum + r.netSalary, 0);
      const newTotal = recalculatedRecords.reduce((sum, r) => sum + r.netSalary, 0);
      const difference = newTotal - oldTotal;

      // 1. Atualizar estado local
      setPayrollRecords(recalculatedRecords);
      
      // 2. Salvar no localStorage
      localStorage.setItem('payrollRecords', JSON.stringify(recalculatedRecords));
      
      // 3. Salvar no Firebase
      try {
        const payrollDoc = doc(db, 'payrollRecords', 'current');
        const cleanedRecalculatedRecords = recalculatedRecords.map(record => cleanPayrollRecord(record));
        const dataToSave = cleanDataForFirebase({
          records: cleanedRecalculatedRecords,
          lastRecalculated: serverTimestamp(),
          recalculatedBy: 'user', // Aqui você pode colocar o ID do usuário logado
          totalRecords: recalculatedRecords.length,
          totalSalaryBase: recalculatedRecords.reduce((sum, r) => sum + r.baseSalary, 0),
          totalAllowances: recalculatedRecords.reduce((sum, r) => sum + r.allowances, 0),
          totalDeductions: recalculatedRecords.reduce((sum, r) => sum + r.deductions, 0),
          totalNet: newTotal,
          configSnapshot: payrollConfig // Salvar também um snapshot das configurações usadas
        });
        await setDoc(payrollDoc, dataToSave);
        console.log("✅ Folha de pagamento salva no Firebase!");
      } catch (firebaseError) {
        console.error("❌ Erro ao salvar no Firebase:", firebaseError);
        toast.warning("⚠️ Erro ao salvar no Firebase, dados salvos apenas localmente");
      }
      
      // Feedback detalhado
      toast.success("✅ Folha de pagamento recalculada e salva no Firebase!");
      toast.info(`📊 ${recalculatedRecords.length} registros foram atualizados`);
      
      if (Math.abs(difference) > 0.01) {
        const differenceText = difference > 0 
          ? `⬆️ Aumento total: ${formatCurrency(Math.abs(difference))}` 
          : `⬇️ Redução total: ${formatCurrency(Math.abs(difference))}`;
        toast.info(differenceText);
      }
      
      console.log("🔄 Folha recalculada manualmente:", recalculatedRecords);
      
    } catch (error) {
      console.error("Erro ao recalcular folha:", error);
      setPayrollRecords(backupRecords); // Restaurar backup em caso de erro
      toast.error("❌ Erro ao recalcular folha. Dados restaurados.");
    }
  };

  const getStatusBadge = (status: string) => {
    const configs = {
      PENDENTE: { color: "bg-yellow-100 text-yellow-800", icon: Clock },
      CALCULADO: { color: "bg-blue-100 text-blue-800", icon: Calculator },
      PAGO: { color: "bg-green-100 text-green-800", icon: CheckCircle }
    };
    
    const config = configs[status as keyof typeof configs];
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  const getTotalByStatus = (status: string) => {
    return payrollRecords
      .filter(p => p.status === status)
      .reduce((sum, p) => sum + p.netSalary, 0);
  };

  const getCountByStatus = (status: string) => {
    return payrollRecords.filter(p => p.status === status).length;
  };

  // Função para ordenar níveis hierárquicos por importância
  const getHierarchyOrder = (level: string): number => {
    const hierarchyOrder: { [key: string]: number } = {
      'Presidente': 1,
      'Diretor': 2,
      'Diretor Financeiro': 3,
      'Diretor de TI': 4,
      'Gerente': 5,
      'Coordenador': 6,
      'Supervisor': 7,
      'Líder Técnico': 8,
      'Engenheiro': 9,
      'Analista': 10,
      'Financeiro': 11,
      'Técnico/Assistente': 12,
      'Comercial': 13,
      'Estagiário/Auxiliar': 14
    };
    
    return hierarchyOrder[level] || 999;
  };

  const filteredPayrollRecords = payrollRecords.filter(record => {
    const matchesSearch = searchTerm === "" || 
      record.collaboratorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.hierarchyLevel.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || record.status === statusFilter;
    const matchesHierarchy = hierarchyFilter === "all" || record.hierarchyLevel === hierarchyFilter;
    
    return matchesSearch && matchesStatus && matchesHierarchy;
  });

  // Obter valores únicos para os filtros
  const uniqueStatuses = [...new Set(payrollRecords.map(r => r.status))];
  const uniqueHierarchies = [...new Set(payrollRecords.map(r => r.hierarchyLevel))];

  // Função para verificar a integridade dos cálculos
  const verifyPayrollIntegrity = (records: PayrollRecord[]) => {
    const issues: string[] = [];
    
    records.forEach((record, index) => {
      // Verificar se os cálculos estão corretos
      const expectedBaseSalary = getSalaryByLevel(record.hierarchyLevel);
      const expectedAllowances = expectedBaseSalary * (payrollConfig.allowancesPercentage / 100);
      const expectedDeductions = expectedBaseSalary * (payrollConfig.deductionsPercentage / 100);
      const expectedNetSalary = expectedBaseSalary + expectedAllowances - expectedDeductions;
      
      // Comparar com tolerância para problemas de arredondamento
      const tolerance = 0.01;
      
      if (Math.abs(record.baseSalary - expectedBaseSalary) > tolerance) {
        issues.push(`Salário base incorreto para ${record.collaboratorName}: esperado ${formatCurrency(expectedBaseSalary)}, atual ${formatCurrency(record.baseSalary)}`);
      }
      
      if (Math.abs(record.allowances - expectedAllowances) > tolerance) {
        issues.push(`Adicionais incorretos para ${record.collaboratorName}: esperado ${formatCurrency(expectedAllowances)}, atual ${formatCurrency(record.allowances)}`);
      }
      
      if (Math.abs(record.deductions - expectedDeductions) > tolerance) {
        issues.push(`Descontos incorretos para ${record.collaboratorName}: esperado ${formatCurrency(expectedDeductions)}, atual ${formatCurrency(record.deductions)}`);
      }
      
      if (Math.abs(record.netSalary - expectedNetSalary) > tolerance) {
        issues.push(`Salário líquido incorreto para ${record.collaboratorName}: esperado ${formatCurrency(expectedNetSalary)}, atual ${formatCurrency(record.netSalary)}`);
      }
      
      // Verificar se os campos obrigatórios estão preenchidos
      if (!record.collaboratorName.trim()) {
        issues.push(`Nome do colaborador vazio no registro ${index + 1}`);
      }
      
      if (!record.hierarchyLevel.trim()) {
        issues.push(`Hierarquia não definida para ${record.collaboratorName}`);
      }
      
      if (!['PENDENTE', 'CALCULADO', 'PAGO'].includes(record.status)) {
        issues.push(`Status inválido para ${record.collaboratorName}: ${record.status}`);
      }
    });
    
    // Verificar totais gerais
    const totalNetSalary = records.reduce((sum, r) => sum + r.netSalary, 0);
    const totalBaseSalary = records.reduce((sum, r) => sum + r.baseSalary, 0);
    const totalAllowances = records.reduce((sum, r) => sum + r.allowances, 0);
    const totalDeductions = records.reduce((sum, r) => sum + r.deductions, 0);
    
    const expectedTotal = totalBaseSalary + totalAllowances - totalDeductions;
    if (Math.abs(totalNetSalary - expectedTotal) > 0.01) {
      issues.push(`Total da folha inconsistente: esperado ${formatCurrency(expectedTotal)}, atual ${formatCurrency(totalNetSalary)}`);
    }
    
    return issues;
  };

  // ⚠️ NOVA FUNÇÃO: Atualizar valores salariais individuais
  const updateSalaryValue = (field: keyof typeof editingSalaryValues, value: string) => {
    const numericValue = parseCurrencyInput(value);
    
    setEditingSalaryValues(prev => {
      const updated = { ...prev, [field]: numericValue };
      
      // Se alterou base, adicionais ou descontos, recalcular o líquido automaticamente
      if (field === 'baseSalary' || field === 'allowances' || field === 'deductions') {
        updated.netSalary = updated.baseSalary + updated.allowances - updated.deductions;
      }
      
      return updated;
    });
  };

  // ⚠️ NOVA FUNÇÃO: Limpar e reinicializar configurações
  const resetPayrollConfig = async () => {
    const confirmed = window.confirm(
      `⚠️ ATENÇÃO: Esta ação irá restaurar todas as configurações para os valores padrão.\n\n` +
      `Isso incluirá:\n` +
      `• Salários por cargo\n` +
      `• Percentuais de adicionais e descontos\n\n` +
      `Deseja continuar?`
    );

    if (!confirmed) {
      toast.info("❌ Reset cancelado pelo usuário");
      return;
    }

    try {
      // Restaurar configurações padrão
      const defaultConfig: PayrollConfig = {
        salaryByLevel: {
          'Presidente': 35000,
          'Diretor': 25000,
          'Diretor de TI': 28000,
          'Diretor Financeiro': 30000,
          'Gerente': 15000,
          'Coordenador': 10000,
          'Supervisor': 8000,
          'Líder Técnico': 12000,
          'Engenheiro': 9000,
          'Analista': 6000,
          'Financeiro': 7000,
          'Técnico/Assistente': 4000,
          'Comercial': 5000,
          'Estagiário/Auxiliar': 2000
        },
        allowancesPercentage: 15,
        deductionsPercentage: 25
      };
      
      // 1. Salvar configurações padrão no Firebase
      try {
        const configDoc = doc(db, 'payrollConfigurations', 'default');
        const dataToSave = cleanDataForFirebase({
          ...defaultConfig,
          lastUpdated: serverTimestamp(),
          updatedBy: 'user', // Aqui você pode colocar o ID do usuário logado
          resetAt: serverTimestamp()
        });
        await setDoc(configDoc, dataToSave);
        console.log("✅ Configurações padrão salvas no Firebase!");
      } catch (firebaseError) {
        console.error("❌ Erro ao resetar no Firebase:", firebaseError);
        toast.warning("⚠️ Erro ao resetar no Firebase, resetando apenas localmente");
      }
      
      // 2. Atualizar estado local
      setPayrollConfig(defaultConfig);
      
      // 3. Salvar no localStorage como backup
      localStorage.setItem('payrollConfig', JSON.stringify(defaultConfig));
      
      toast.success("✅ Configurações restauradas para os valores padrão no Firebase!");
      toast.info("💡 As configurações foram reinicializadas com sucesso");
      
      console.log("🔄 Configurações resetadas:", defaultConfig);
      
    } catch (error) {
      console.error("❌ Erro ao resetar configurações:", error);
      toast.error("❌ Erro ao resetar configurações. Tente novamente.");
    }
  };

  // Função auxiliar para remover campos undefined antes de salvar no Firebase
  const cleanDataForFirebase = (data: any): any => {
    if (data === null || data === undefined) {
      return null;
    }
    
    if (Array.isArray(data)) {
      return data.map(item => cleanDataForFirebase(item));
    }
    
    if (typeof data === 'object') {
      const cleaned: any = {};
      Object.keys(data).forEach(key => {
        const value = data[key];
        if (value !== undefined) {
          cleaned[key] = cleanDataForFirebase(value);
        }
      });
      return cleaned;
    }
    
    return data;
  };

  // Função auxiliar para limpar um registro de folha de pagamento
  const cleanPayrollRecord = (record: PayrollRecord): any => {
    return {
      id: record.id || '',
      collaboratorId: record.collaboratorId || '',
      collaboratorName: record.collaboratorName || '',
      baseSalary: record.baseSalary || 0,
      allowances: record.allowances || 0,
      deductions: record.deductions || 0,
      netSalary: record.netSalary || 0,
      period: record.period || new Date().toISOString().slice(0, 7),
      status: record.status || 'PENDENTE',
      hierarchyLevel: record.hierarchyLevel || 'Estagiário/Auxiliar',
      ...(record.paymentDate && { paymentDate: record.paymentDate }),
      ...(record.bankInfo && {
        bankInfo: {
          bank: record.bankInfo.bank || '',
          agency: record.bankInfo.agency || '',
          account: record.bankInfo.account || '',
          pixKey: record.bankInfo.pixKey || ''
        }
      })
    };
  };

  // ⚠️ NOVA FUNÇÃO: Forçar carregamento dos dados reais salvos
  const forceLoadRealData = async () => {
    try {
      toast.loading("Procurando seus dados salvos...", { id: "force-load" });
      
      // 1. Verificar todos os documentos no Firebase
      console.log("🔍 Verificando todos os dados no Firebase...");
      
      // Tentar carregar dados de folha
      try {
        const payrollDoc = await getDoc(doc(db, 'payrollRecords', 'current'));
        if (payrollDoc.exists()) {
          const data = payrollDoc.data();
          console.log("📂 Dados encontrados no Firebase:", data);
          
          if (data.records && data.records.length > 0) {
            setPayrollRecords(data.records);
            localStorage.setItem('payrollRecords', JSON.stringify(data.records));
            
            toast.dismiss("force-load");
            toast.success(`✅ ${data.records.length} registros de folha recuperados do Firebase!`);
            return;
          }
        }
      } catch (firebaseError) {
        console.warn("⚠️ Erro ao acessar Firebase:", firebaseError);
      }
      
      // 2. Verificar localStorage
      console.log("🔍 Verificando localStorage...");
      const localData = localStorage.getItem('payrollRecords');
      if (localData) {
        try {
          const parsedData = JSON.parse(localData);
          console.log("📂 Dados encontrados no localStorage:", parsedData);
          
          if (parsedData && parsedData.length > 0) {
            setPayrollRecords(parsedData);
            
            toast.dismiss("force-load");
            toast.success(`✅ ${parsedData.length} registros recuperados do backup local!`);
            return;
          }
        } catch (parseError) {
          console.error("❌ Erro ao processar dados locais:", parseError);
        }
      }
      
      // 3. Se não encontrou dados, verificar se há colaboradores para gerar
      if (collaborators.length > 0) {
        toast.dismiss("force-load");
        toast.warning("Nenhum dado salvo encontrado. Clique em 'Calcular Nova Folha' para gerar baseado nos seus colaboradores.");
      } else {
        toast.dismiss("force-load");
        toast.error("Nenhum dado encontrado e nenhum colaborador cadastrado. Cadastre colaboradores primeiro.");
      }
      
    } catch (error) {
      console.error("❌ Erro ao forçar carregamento:", error);
      toast.dismiss("force-load");
      toast.error("Erro ao procurar dados salvos");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando folha de pagamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header removido conforme solicitado */}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="payroll">Folha ({payrollRecords.length})</TabsTrigger>
          <TabsTrigger value="collaborators">Colaboradores ({collaborators.length})</TabsTrigger>
          <TabsTrigger value="reports">Relatórios</TabsTrigger>
          <TabsTrigger value="config">
            <Settings className="w-4 h-4 mr-2" />
            Configurações
          </TabsTrigger>
        </TabsList>

        {/* Dashboard */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Indicadores Principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-purple-800 dark:text-purple-300 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Folha Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                  {formatCurrency(payrollRecords.reduce((sum, p) => sum + p.netSalary, 0))}
                </div>
                <div className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                  {payrollRecords.length} colaboradores
                </div>
              </CardContent>
            </Card>

            <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-yellow-800 dark:text-yellow-300 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Pendentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                  {formatCurrency(getTotalByStatus('PENDENTE'))}
                </div>
                <div className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                  {getCountByStatus('PENDENTE')} colaboradores
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-300 flex items-center gap-2">
                  <Calculator className="w-4 h-4" />
                  Calculados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {formatCurrency(getTotalByStatus('CALCULADO'))}
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  {getCountByStatus('CALCULADO')} colaboradores
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-800 dark:text-green-300 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Pagos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {formatCurrency(getTotalByStatus('PAGO'))}
                </div>
                <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                  {getCountByStatus('PAGO')} colaboradores
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Estatísticas Detalhadas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-indigo-800 dark:text-indigo-300">
                  Salário Médio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">
                  {payrollRecords.length > 0 
                    ? formatCurrency(payrollRecords.reduce((sum, p) => sum + p.netSalary, 0) / payrollRecords.length)
                    : formatCurrency(0)
                  }
                </div>
                <div className="text-sm text-indigo-600 dark:text-indigo-400 mt-1">
                  Valor médio líquido
                </div>
              </CardContent>
            </Card>

            <Card className="bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-teal-800 dark:text-teal-300">
                  Maior Salário
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-teal-700 dark:text-teal-400">
                  {payrollRecords.length > 0 
                    ? formatCurrency(Math.max(...payrollRecords.map(p => p.netSalary)))
                    : formatCurrency(0)
                  }
                </div>
                <div className="text-sm text-teal-600 dark:text-teal-400 mt-1">
                  Maior salário líquido
                </div>
              </CardContent>
            </Card>

            <Card className="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-orange-800 dark:text-orange-300">
                  Menor Salário
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                  {payrollRecords.length > 0 
                    ? formatCurrency(Math.min(...payrollRecords.map(p => p.netSalary)))
                    : formatCurrency(0)
                  }
                </div>
                <div className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                  Menor salário líquido
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-800 dark:text-gray-300">
                  Total Descontos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-700 dark:text-gray-400">
                  {formatCurrency(payrollRecords.reduce((sum, p) => sum + p.deductions, 0))}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Descontos totais ({payrollConfig.deductionsPercentage}%)
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Resumo por Hierarquia */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo por Hierarquia</CardTitle>
              <CardDescription>
                Distribuição salarial por nível hierárquico
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(
                  payrollRecords.reduce((acc, record) => {
                    if (!acc[record.hierarchyLevel]) {
                      acc[record.hierarchyLevel] = { count: 0, total: 0 };
                    }
                    acc[record.hierarchyLevel].count++;
                    acc[record.hierarchyLevel].total += record.netSalary;
                    return acc;
                  }, {} as { [key: string]: { count: number, total: number } })
                )
                .sort(([levelA], [levelB]) => getHierarchyOrder(levelA) - getHierarchyOrder(levelB))
                .map(([level, data]) => (
                  <div key={level} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{level}</p>
                      <p className="text-sm text-gray-600">{data.count} colaborador(es)</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-purple-600">{formatCurrency(data.total)}</p>
                      <p className="text-sm text-gray-500">
                        Média: {data.count > 0 ? formatCurrency(data.total / data.count) : formatCurrency(0)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Folha */}
        <TabsContent value="payroll" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Folha de Pagamento</CardTitle>
                  <CardDescription>
                    Gestão completa da folha de pagamento
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Buscar colaboradores..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Button variant="outline" onClick={handleFilterClick}>
                    <Filter className="w-4 h-4 mr-2" />
                    Filtros
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredPayrollRecords.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Colaborador</TableHead>
                      <TableHead>Hierarquia</TableHead>
                      <TableHead>Salário Base</TableHead>
                      <TableHead>Adicionais</TableHead>
                      <TableHead>Descontos</TableHead>
                      <TableHead>Líquido</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayrollRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.collaboratorName}</TableCell>
                        <TableCell>{record.hierarchyLevel}</TableCell>
                        <TableCell>{formatCurrency(record.baseSalary)}</TableCell>
                        <TableCell className="text-green-600">{formatCurrency(record.allowances)}</TableCell>
                        <TableCell className="text-red-600">{formatCurrency(record.deductions)}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(record.netSalary)}</TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewPayroll(record)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Visualizar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditPayroll(record)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleGeneratePayrollReport(record)}>
                                <FileText className="mr-2 h-4 w-4" />
                                Gerar relatório
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Nenhum registro encontrado</h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm ? "Tente ajustar os filtros de busca" : "Configure colaboradores para gerar a folha de pagamento"}
                  </p>
                  {!searchTerm && collaborators.length > 0 && (
                    <Button onClick={handleCalculatePayroll}>
                      <Calculator className="w-4 h-4 mr-2" />
                      Calcular Nova Folha
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Colaboradores */}
        <TabsContent value="collaborators" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Colaboradores</CardTitle>
                  <CardDescription>
                    {collaborators.length} colaboradores cadastrados
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {collaborators.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {collaborators.map((collaborator) => (
                    <Card key={collaborator.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold">{collaborator.firstName}</h3>
                          <p className="text-sm text-gray-600">{collaborator.email}</p>
                          <p className="text-sm text-gray-600">{collaborator.phone}</p>
                          <p className="text-sm font-medium text-purple-600 mt-1">
                            {collaborator.hierarchyLevel}
                          </p>
                        </div>
                        <Badge className="bg-green-100 text-green-800">
                          Ativo
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Nenhum colaborador cadastrado</h3>
                  <p className="text-gray-500 mb-4">
                    Gerencie colaboradores através do sistema de RH
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Relatórios */}
        <TabsContent value="reports" className="space-y-6">
          <div className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Relatórios Personalizados</h3>
            <p className="text-gray-500 mb-6">
              Gere relatórios detalhados da folha de pagamento
            </p>
            <Button onClick={handleGenerateReport} size="lg">
              <Calendar className="w-4 h-4 mr-2" />
              Gerar Relatório
            </Button>
          </div>
        </TabsContent>

        {/* Configurações */}
        <TabsContent value="config" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Configurações de Percentuais */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Percentuais de Cálculo
                </CardTitle>
                <CardDescription>
                  Configure os percentuais de adicionais e descontos aplicados aos salários
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="allowances">Percentual de Adicionais (%)</Label>
                  <Input
                    id="allowances"
                    type="number"
                    value={payrollConfig.allowancesPercentage}
                    onChange={(e) => updatePercentages(
                      Number(e.target.value), 
                      payrollConfig.deductionsPercentage
                    )}
                    placeholder="15"
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Valor atual: {payrollConfig.allowancesPercentage}% (adicionado ao salário base)
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="deductions">Percentual de Descontos (%)</Label>
                  <Input
                    id="deductions"
                    type="number"
                    value={payrollConfig.deductionsPercentage}
                    onChange={(e) => updatePercentages(
                      payrollConfig.allowancesPercentage,
                      Number(e.target.value)
                    )}
                    placeholder="25"
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Valor atual: {payrollConfig.deductionsPercentage}% (descontado do salário base)
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-semibold mb-2">Exemplo de Cálculo:</h4>
                  <div className="bg-gray-50 p-3 rounded-lg text-sm">
                    <p>• Salário Base: R$ 5.000,00</p>
                    <p>• Adicionais ({payrollConfig.allowancesPercentage}%): +R$ {(5000 * payrollConfig.allowancesPercentage / 100).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                    <p>• Descontos ({payrollConfig.deductionsPercentage}%): -R$ {(5000 * payrollConfig.deductionsPercentage / 100).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                    <p className="font-semibold pt-1 border-t border-gray-300">
                      • Líquido: R$ {(5000 + (5000 * payrollConfig.allowancesPercentage / 100) - (5000 * payrollConfig.deductionsPercentage / 100)).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Configurações de Salários por Cargo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Salários por Cargo
                </CardTitle>
                <CardDescription>
                  Configure o salário base para cada nível hierárquico
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {Object.entries(payrollConfig.salaryByLevel).map(([level, salary]) => (
                    <div key={level} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <Label className="font-medium">{level}</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">R$</span>
                        <Input
                          type="text"
                          value={formatCurrencyInput(salary)}
                          onChange={(e) => updateSalaryConfig(level, e.target.value)}
                          onFocus={(e) => e.target.select()}
                          className="w-32 text-right"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Botão de Salvar */}
          <div className="flex justify-center gap-4">
            <Button onClick={savePayrollConfig} size="lg" className="min-w-48" variant="outline">
              <Save className="w-4 h-4 mr-2" />
              Salvar Configurações
            </Button>
            <Button onClick={handleRecalculatePayroll} size="lg" className="min-w-48" variant="destructive">
              <Calculator className="w-4 h-4 mr-2" />
              Recalcular Folha
            </Button>
            <Button onClick={resetPayrollConfig} size="lg" className="min-w-48" variant="secondary">
              <RefreshCw className="w-4 h-4 mr-2" />
              Restaurar Padrão
            </Button>
          </div>

          {/* Resumo das Configurações */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo das Configurações Atuais</CardTitle>
              <CardDescription>
                Visualize como as configurações afetam os cálculos e o impacto financeiro atual
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{payrollConfig.allowancesPercentage}%</div>
                  <div className="text-sm text-blue-800">Adicionais</div>
                  <div className="text-xs text-blue-600 mt-1">
                    Total: {formatCurrency(payrollRecords.reduce((sum, r) => sum + r.allowances, 0))}
                  </div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{payrollConfig.deductionsPercentage}%</div>
                  <div className="text-sm text-red-800">Descontos</div>
                  <div className="text-xs text-red-600 mt-1">
                    Total: {formatCurrency(payrollRecords.reduce((sum, r) => sum + r.deductions, 0))}
                  </div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {Object.keys(payrollConfig.salaryByLevel).length}
                  </div>
                  <div className="text-sm text-green-800">Cargos Configurados</div>
                  <div className="text-xs text-green-600 mt-1">
                    Faixa: {formatCurrency(Math.min(...Object.values(payrollConfig.salaryByLevel)))} - {formatCurrency(Math.max(...Object.values(payrollConfig.salaryByLevel)))}
                  </div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {formatCurrency(payrollRecords.reduce((sum, r) => sum + r.baseSalary, 0))}
                  </div>
                  <div className="text-sm text-purple-800">Total Base</div>
                  <div className="text-xs text-purple-600 mt-1">
                    {payrollRecords.length} colaboradores
                  </div>
                </div>
              </div>

              {/* Análise por Status */}
              <div className="mb-6">
                <h4 className="font-semibold mb-3">Distribuição por Status</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-yellow-800">Pendentes</span>
                      <span className="font-semibold text-yellow-600">{getCountByStatus('PENDENTE')}</span>
                    </div>
                    <div className="text-lg font-bold text-yellow-700">
                      {formatCurrency(getTotalByStatus('PENDENTE'))}
                    </div>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-blue-800">Calculados</span>
                      <span className="font-semibold text-blue-600">{getCountByStatus('CALCULADO')}</span>
                    </div>
                    <div className="text-lg font-bold text-blue-700">
                      {formatCurrency(getTotalByStatus('CALCULADO'))}
                    </div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-green-800">Pagos</span>
                      <span className="font-semibold text-green-600">{getCountByStatus('PAGO')}</span>
                    </div>
                    <div className="text-lg font-bold text-green-700">
                      {formatCurrency(getTotalByStatus('PAGO'))}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-800">Controle Total dos Salários! 🎯</h4>
                    <p className="text-sm text-blue-700 mb-2">
                      <strong>Agora você tem controle total:</strong>
                    </p>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• <strong>Salvar Configurações</strong>: Apenas salva as configurações sem alterar salários</li>
                      <li>• <strong>Recalcular Folha</strong>: Aplica as configurações recalculando TODOS os salários</li>
                      <li>• Os valores alterados manualmente são preservados até você escolher recalcular</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Visualização */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Folha de Pagamento</DialogTitle>
            <DialogDescription>
              Informações completas do colaborador
            </DialogDescription>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Colaborador</Label>
                  <p className="text-lg font-semibold">{selectedRecord.collaboratorName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Hierarquia</Label>
                  <p>{selectedRecord.hierarchyLevel}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Período</Label>
                  <p>{selectedRecord.period}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedRecord.status)}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <Label className="text-sm font-medium">Salário Base</Label>
                  <p className="text-lg font-semibold text-blue-600">
                    {formatCurrency(selectedRecord.baseSalary)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Adicionais</Label>
                  <p className="text-lg font-semibold text-green-600">
                    +{formatCurrency(selectedRecord.allowances)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Descontos</Label>
                  <p className="text-lg font-semibold text-red-600">
                    -{formatCurrency(selectedRecord.deductions)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Salário Líquido</Label>
                  <p className="text-xl font-bold text-purple-600">
                    {formatCurrency(selectedRecord.netSalary)}
                  </p>
                </div>
              </div>
              
              {/* Informações Bancárias se disponíveis */}
              {selectedRecord.bankInfo && (selectedRecord.bankInfo.bank || selectedRecord.bankInfo.agency || selectedRecord.bankInfo.account || selectedRecord.bankInfo.pixKey) && (
                <div className="pt-4 border-t">
                  <Label className="text-sm font-medium">Informações para Pagamento</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    {selectedRecord.bankInfo.bank && (
                      <div>
                        <p className="text-xs text-gray-500">Banco</p>
                        <p className="font-medium">{selectedRecord.bankInfo.bank}</p>
                      </div>
                    )}
                    {selectedRecord.bankInfo.agency && (
                      <div>
                        <p className="text-xs text-gray-500">Agência</p>
                        <p className="font-medium">{selectedRecord.bankInfo.agency}</p>
                      </div>
                    )}
                    {selectedRecord.bankInfo.account && (
                      <div>
                        <p className="text-xs text-gray-500">Conta</p>
                        <p className="font-medium">{selectedRecord.bankInfo.account}</p>
                      </div>
                    )}
                    {selectedRecord.bankInfo.pixKey && (
                      <div>
                        <p className="text-xs text-gray-500">Chave PIX</p>
                        <p className="font-medium">{selectedRecord.bankInfo.pixKey}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button onClick={() => setViewModalOpen(false)}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Edição */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Folha de Pagamento</DialogTitle>
            <DialogDescription>
              Modificar dados do colaborador
            </DialogDescription>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4">
              {/* Informações Básicas - sempre visíveis */}
              <div className="grid grid-cols-3 gap-4 pb-4 border-b">
                <div>
                  <Label className="text-sm">Colaborador</Label>
                  <p className="font-semibold">{selectedRecord.collaboratorName}</p>
                </div>
                <div>
                  <Label className="text-sm">Hierarquia</Label>
                  <p className="text-sm text-gray-600">{selectedRecord.hierarchyLevel}</p>
                </div>
                <div>
                  <Label className="text-sm">Período</Label>
                  <Input 
                    value={editingPeriod} 
                    onChange={(e) => setEditingPeriod(e.target.value)}
                    className="h-8" 
                  />
                </div>
              </div>

              {/* Tabs para organizar as seções */}
              <Tabs defaultValue="status" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="status">Status & Geral</TabsTrigger>
                  <TabsTrigger value="payment">Informações Bancárias</TabsTrigger>
                  <TabsTrigger value="salary">Detalhes Salariais</TabsTrigger>
                </TabsList>

                {/* Aba Status & Geral */}
                <TabsContent value="status" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Status</Label>
                      <Select value={editingStatus} onValueChange={(value: 'CALCULADO' | 'PAGO' | 'PENDENTE') => setEditingStatus(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PENDENTE">Pendente</SelectItem>
                          <SelectItem value="CALCULADO">Calculado</SelectItem>
                          <SelectItem value="PAGO">Pago</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Salário Líquido</Label>
                      <div className="flex h-10 w-full rounded-md border border-input bg-blue-50 px-3 py-2 text-sm text-blue-700 font-bold">
                        {formatCurrency(selectedRecord.netSalary)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2 text-sm">Resumo dos Valores</h4>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div className="text-center">
                        <p className="text-gray-600">Base</p>
                        <p className="font-semibold">{formatCurrency(selectedRecord.baseSalary)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-600">Adicionais</p>
                        <p className="font-semibold text-green-600">+{formatCurrency(selectedRecord.allowances)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-600">Descontos</p>
                        <p className="font-semibold text-red-600">-{formatCurrency(selectedRecord.deductions)}</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Aba Informações Bancárias */}
                <TabsContent value="payment" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">Banco</Label>
                      <Input 
                        placeholder="Ex: Banco do Brasil, Itaú, Nubank..."
                        value={editingBankInfo.bank}
                        onChange={(e) => setEditingBankInfo(prev => ({...prev, bank: e.target.value}))}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Agência</Label>
                      <Input 
                        placeholder="Ex: 1234-5"
                        value={editingBankInfo.agency}
                        onChange={(e) => setEditingBankInfo(prev => ({...prev, agency: e.target.value}))}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Conta Corrente</Label>
                      <Input 
                        placeholder="Ex: 12345-6"
                        value={editingBankInfo.account}
                        onChange={(e) => setEditingBankInfo(prev => ({...prev, account: e.target.value}))}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Chave PIX</Label>
                      <Input 
                        placeholder="CPF, e-mail, telefone ou chave aleatória"
                        value={editingBankInfo.pixKey}
                        onChange={(e) => setEditingBankInfo(prev => ({...prev, pixKey: e.target.value}))}
                        className="h-9"
                      />
                    </div>
                  </div>
                  
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg mt-4">
                    <p className="text-sm text-green-800">
                      <strong>💳 Informação:</strong> Essas informações serão usadas para facilitar pagamentos de salários, 
                      adiantamentos e reembolsos para o colaborador.
                    </p>
                  </div>
                </TabsContent>

                {/* Aba Detalhes Salariais */}
                <TabsContent value="salary" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">Salário Base</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">R$</span>
                        <Input
                          type="text"
                          value={formatCurrencyInput(editingSalaryValues.baseSalary)}
                          onChange={(e) => updateSalaryValue('baseSalary', e.target.value)}
                          onFocus={(e) => e.target.select()}
                          className="text-right"
                          placeholder="0"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Valor base do salário
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm">Adicionais</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">R$</span>
                        <Input
                          type="text"
                          value={formatCurrencyInput(editingSalaryValues.allowances)}
                          onChange={(e) => updateSalaryValue('allowances', e.target.value)}
                          onFocus={(e) => e.target.select()}
                          className="text-right text-green-600"
                          placeholder="0"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Adicionais e benefícios
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm">Descontos</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">R$</span>
                        <Input
                          type="text"
                          value={formatCurrencyInput(editingSalaryValues.deductions)}
                          onChange={(e) => updateSalaryValue('deductions', e.target.value)}
                          onFocus={(e) => e.target.select()}
                          className="text-right text-red-600"
                          placeholder="0"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Descontos e impostos
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm">Salário Líquido</Label>
                      <div className="flex h-9 w-full rounded-md border border-input bg-blue-50 px-3 py-2 text-sm text-blue-700 font-bold">
                        {formatCurrency(editingSalaryValues.netSalary)}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Calculado automaticamente
                      </p>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-green-800">Edição Individual Habilitada! ✅</h4>
                        <p className="text-sm text-green-700">
                          <strong>Agora você pode:</strong> Alterar os valores salariais individuais de cada colaborador.
                          O salário líquido é calculado automaticamente (Base + Adicionais - Descontos).
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
              
              {/* Botões de ação */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={closeEditModal}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveEdit}>
                  Salvar Alterações
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Filtros */}
      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Filtros Avançados</DialogTitle>
            <DialogDescription>
              Filtre os registros por status e hierarquia
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {uniqueStatuses.map(status => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Hierarquia</Label>
              <Select value={hierarchyFilter} onValueChange={setHierarchyFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as hierarquias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as hierarquias</SelectItem>
                  {uniqueHierarchies.map(hierarchy => (
                    <SelectItem key={hierarchy} value={hierarchy}>
                      {hierarchy}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={clearFilters}>
                <X className="w-4 h-4 mr-2" />
                Limpar Filtros
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setFiltersOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={applyFilters}>
                  Aplicar Filtros
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}; 