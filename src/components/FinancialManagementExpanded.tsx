import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  Building2,
  Calculator,
  BarChart3,
  PieChart,
  ArrowRight,
  DollarSign,
  Calendar,
  Target,
  Settings,
  Plus,
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock,
  Receipt,
  PiggyBank,
  Search,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { 
  FinancialModule, 
  FinancialDashboardData, 
  FinancialModule as FinancialModuleType 
} from "@/types/financial";
import {
  getRealClients,
  getRealCollaborators,
  syncClientsWithFinancialClients,
  getFinancialDashboardData,
  debugFinancialData,
  validateDashboardData,
  debugMonthlyRevenue
} from "@/services/financialCoreService";

// Componentes modulares (a serem implementados)
import { FinancialDashboard } from "./financial/FinancialDashboard";
import { FinancialDueDatesManager } from "./financial/FinancialDueDatesManager";
import { AccountsPayableModule } from "./financial/AccountsPayableModule";
import { AccountsReceivableModule } from "./financial/AccountsReceivableModule";
import { PayrollModule } from "./financial/PayrollModule";
import { AccountingModule } from "./financial/AccountingModule";
import { ChartOfAccountsManager } from "./financial/ChartOfAccountsManager";
import { CostCenterManager } from "./financial/CostCenterManager";

export const FinancialManagementExpanded = () => {
  const [activeModule, setActiveModule] = useState<FinancialModule>(FinancialModule.OPERATIONAL);
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<FinancialDashboardData | null>(null);
  const [systemStats, setSystemStats] = useState({
    totalClients: 0,
    totalCollaborators: 0,
    lastSync: null as Date | null
  });
  const [selectedModule, setSelectedModule] = useState("dashboard");

  // Menu de módulos financeiros compacto
  const financialModules = [
    {
      id: FinancialModule.OPERATIONAL,
      icon: <LayoutDashboard className="w-6 h-6" />,
      title: "Dashboard",
      shortTitle: "Dashboard",
      color: "bg-blue-500",
      hoverColor: "hover:bg-blue-600",
      items: [
        "Fluxo de Caixa em Tempo Real",
        "Conciliação Bancária Automática", 
        "Análise de Indicadores KPI",
        "Orçamento x Realizado",
        "Projeções Financeiras",
        "Alertas de Vencimento"
      ]
    },
    {
      id: FinancialModule.DUE_DATES,
      icon: <Calendar className="w-6 h-6" />,
      title: "Controle de Vencimentos",
      shortTitle: "Vencimentos",
      color: "bg-amber-500",
      hoverColor: "hover:bg-amber-600",
      items: [
        "Calendário de Vencimentos",
        "Notificações Automáticas",
        "Alertas por Email/WhatsApp",
        "Relatórios de Vencimentos",
        "Configuração de Prioridades",
        "Dashboard de Acompanhamento"
      ]
    },
    {
      id: FinancialModule.ACCOUNTS_PAYABLE,
      icon: <CreditCard className="w-6 h-6" />,
      title: "Contas a Pagar",
      shortTitle: "A Pagar",
      color: "bg-red-500",
      hoverColor: "hover:bg-red-600",
      items: [
        "Cadastro de Fornecedores",
        "Lançamento de Contas",
        "Vencimentos e Programação",
        "Controle de Pagamentos",
        "Aprovação de Despesas",
        "Relatórios por Fornecedor"
      ]
    },
    {
      id: FinancialModule.ACCOUNTS_RECEIVABLE,
      icon: <TrendingUp className="w-6 h-6" />,
      title: "Contas a Receber",
      shortTitle: "A Receber",
      color: "bg-green-500",
      hoverColor: "hover:bg-green-600",
      items: [
        "Gestão de Clientes",
        "Faturamento Automático",
        "Controle de Recebimentos",
        "Gestão de Inadimplência",
        "Cobrança Automatizada",
        "Análise de Crédito"
      ]
    },
    {
      id: FinancialModule.HUMAN_RESOURCES,
      icon: <Users className="w-6 h-6" />,
      title: "Recursos Humanos",
      shortTitle: "RH",
      color: "bg-purple-500",
      hoverColor: "hover:bg-purple-600",
      items: [
        "Folha de Pagamento",
        "Benefícios e Auxílios",
        "Provisões Trabalhistas",
        "Férias e 13º Salário",
        "Controle de Ponto",
        "Relatórios Trabalhistas"
      ]
    },
    {
      id: FinancialModule.ACCOUNTING,
      icon: <Calculator className="w-6 h-6" />,
      title: "Contabilidade",
      shortTitle: "Contabilidade",
      color: "bg-orange-500",
      hoverColor: "hover:bg-orange-600",
      items: [
        "Plano de Contas",
        "Lançamentos Contábeis",
        "Centro de Custos",
        "DRE e Balanço Patrimonial",
        "Livros Fiscais",
        "Conciliação Contábil"
      ]
    },
    {
      id: FinancialModule.COSTS_PROJECTS,
      icon: <Target className="w-6 h-6" />,
      title: "Custos e Projetos",
      shortTitle: "Projetos",
      color: "bg-indigo-500",
      hoverColor: "hover:bg-indigo-600",
      items: [
        "Gestão de Projetos",
        "Apropriação de Custos",
        "Controle de Horas",
        "Margem por Projeto",
        "Análise de Lucratividade",
        "Orçamento de Projetos"
      ]
    },
    {
      id: FinancialModule.REPORTS_BI,
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Relatórios e BI",
      shortTitle: "Relatórios",
      color: "bg-emerald-500",
      hoverColor: "hover:bg-emerald-600",
      items: [
        "Dashboard Executivo",
        "Indicadores Financeiros",
        "Análise de Cenários",
        "Relatórios Customizados",
        "Business Intelligence",
        "Exportação de Dados"
      ]
    }
  ];

  // Módulos desabilitados (visíveis mas não clicáveis)
  const disabledModules = [
    FinancialModule.ACCOUNTING,
    FinancialModule.COSTS_PROJECTS,
    FinancialModule.REPORTS_BI
  ];

  useEffect(() => {
    const loadFinancialData = async () => {
      setIsLoading(true);
      
      try {
        toast.loading("Carregando dados financeiros...", { id: "loading-financial" });
        
        const [realClients, realCollaborators] = await Promise.all([
          getRealClients(),
          getRealCollaborators()
        ]);

        setSystemStats({
          totalClients: realClients.length,
          totalCollaborators: realCollaborators.length,
          lastSync: new Date()
        });

        // Sincronizar clientes reais com clientes financeiros
        await syncClientsWithFinancialClients();
        
        // Carregar dados do dashboard financeiro
        const dashboardData = await getFinancialDashboardData();
        
        // 🔍 DEBUG: Verificar dados detalhados do dashboard
        console.log("📊 DEBUG DASHBOARD FINAL:", {
          currentCash: dashboardData.currentCash,
          monthlyRevenue: dashboardData.monthlyRevenue,
          overduePayables: dashboardData.overduePayables,
          overdueReceivables: dashboardData.overdueReceivables,
          upcomingDues: dashboardData.upcomingDues,
          topClients: dashboardData.topClients,
          topProjects: dashboardData.topProjects
        });
        
        // 🔍 VALIDAÇÃO: Verificar consistência dos dados
        const validation = await validateDashboardData();
        console.log("✅ VALIDAÇÃO COMPLETA:", validation);
        
        if (!validation.isValid) {
          console.warn("⚠️ PROBLEMAS ENCONTRADOS:", validation.issues);
          validation.issues.forEach(issue => {
            toast.warning(issue, { duration: 5000 });
          });
        }
        
        setDashboardData(dashboardData);
        
        toast.dismiss("loading-financial");
        toast.success(`Sistema carregado! ${realClients.length} clientes e ${realCollaborators.length} colaboradores encontrados.`);
      } catch (error) {
        console.error("Erro ao carregar dados financeiros:", error);
        toast.dismiss("loading-financial");
        toast.error("Erro ao carregar dados financeiros");
        
        // Definir dados padrão em caso de erro
        setDashboardData({
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
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadFinancialData();
  }, []);

  const renderModuleContent = () => {
    // Módulos desabilitados sempre mostram mensagem de desenvolvimento
    if (disabledModules.includes(activeModule)) {
      const module = financialModules.find(m => m.id === activeModule);
      return (
        <div className="text-center py-12">
          {module?.icon && (
            <div className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4 flex items-center justify-center">
              {module.icon}
            </div>
          )}
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">{module?.title}</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Este módulo será desenvolvido posteriormente.
          </p>
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
            <Clock className="w-4 h-4 mr-2" />
            Em desenvolvimento
          </div>
        </div>
      );
    }

    switch (activeModule) {
      case FinancialModule.OPERATIONAL:
        return <FinancialDashboard data={dashboardData} />;
      case FinancialModule.DUE_DATES:
        return <FinancialDueDatesManager />;
      case FinancialModule.ACCOUNTS_PAYABLE:
        return <AccountsPayableModule />;
      case FinancialModule.ACCOUNTS_RECEIVABLE:
        return <AccountsReceivableModule />;
      case FinancialModule.HUMAN_RESOURCES:
        return <PayrollModule />;
      default:
        return (
          <div className="text-center py-12">
            <Settings className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Módulo em Desenvolvimento</h3>
            <p className="text-gray-500 dark:text-gray-400">
              Este módulo está sendo implementado e estará disponível em breve.
            </p>
          </div>
        );
    }
  };

  const getModuleStats = (moduleId: FinancialModule) => {
    if (!dashboardData) return "---";
    
    // Retorna estatísticas específicas de cada módulo baseadas em dados reais
    switch (moduleId) {
      case FinancialModule.OPERATIONAL:
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(dashboardData.currentCash);
      case FinancialModule.DUE_DATES:
        return dashboardData.upcomingDues.length.toString() + " vencimentos";
      case FinancialModule.ACCOUNTS_PAYABLE:
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(dashboardData.overduePayables);
      case FinancialModule.ACCOUNTS_RECEIVABLE:
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(dashboardData.overdueReceivables);
      case FinancialModule.HUMAN_RESOURCES:
        return systemStats.totalCollaborators.toString();
      default:
        return "---";
    }
  };

  const handleSyncData = useCallback(async () => {
    try {
      console.log("🔄 Handler handleSyncData executado");
      toast.loading("Sincronizando dados...", { id: "sync-data" });
      
      await syncClientsWithFinancialClients();
      const newDashboardData = await getFinancialDashboardData();
      setDashboardData(newDashboardData);
      
      setSystemStats(prev => ({ ...prev, lastSync: new Date() }));
      
      toast.dismiss("sync-data");
      toast.success("Dados sincronizados com sucesso!");
    } catch (error) {
      console.error("Erro ao sincronizar:", error);
      toast.dismiss("sync-data");
      toast.error("Erro ao sincronizar dados");
    }
  }, []);

  // Handler para debug de dados
  const handleDebugData = useCallback(async () => {
    try {
      console.log("🔍 Handler handleDebugData executado");
      toast.loading("Executando debug dos dados...", { id: "debug-data" });
      
      await debugFinancialData();
      
      toast.dismiss("debug-data");
      toast.success("Debug concluído! Verifique o console para detalhes.");
    } catch (error) {
      console.error("Erro no debug:", error);
      toast.dismiss("debug-data");
      toast.error("Erro no debug de dados");
    }
  }, []);

  // Handler para validação de dados
  const handleValidateData = useCallback(async () => {
    try {
      console.log("🔍 Handler handleValidateData executado");
      toast.loading("Validando dados do dashboard...", { id: "validate-data" });
      
      const validation = await validateDashboardData();
      
      toast.dismiss("validate-data");
      
      if (validation.isValid) {
        toast.success("✅ Todos os dados estão consistentes!");
      } else {
        toast.warning("⚠️ Problemas encontrados nos dados. Verifique o console.");
        validation.issues.forEach((issue, index) => {
          setTimeout(() => toast.warning(issue, { duration: 4000 }), index * 500);
        });
      }
      
      console.log("📋 RESULTADO DA VALIDAÇÃO:", validation);
    } catch (error) {
      console.error("Erro na validação:", error);
      toast.dismiss("validate-data");
      toast.error("Erro na validação de dados");
    }
  }, []);

  // Handler para debug específico da receita mensal
  const handleDebugRevenue = useCallback(async () => {
    try {
      console.log("💰 Handler handleDebugRevenue executado");
      toast.loading("Analisando receita mensal...", { id: "debug-revenue" });
      
      const revenueDebug = await debugMonthlyRevenue();
      
      toast.dismiss("debug-revenue");
      
      if (revenueDebug.issues.length === 0) {
        toast.success(
          `✅ Receita Total: R$ ${revenueDebug.totalRevenue.toFixed(2)} | ` +
          `Clientes: R$ ${revenueDebug.revenueFromClients.toFixed(2)} | ` +
          `Contas a Receber: R$ ${revenueDebug.revenueFromReceivables.toFixed(2)}`,
          { duration: 6000 }
        );
      } else {
        toast.warning("⚠️ Inconsistências na receita encontradas!");
        revenueDebug.issues.forEach((issue, index) => {
          setTimeout(() => toast.warning(issue, { duration: 4000 }), index * 500);
        });
      }
      
      // Mostrar detalhes no console
      console.log("💰 DEBUG RECEITA MENSAL DETALHADO (CORRIGIDO):", revenueDebug);
      console.log("📊 CLIENTES FINANCEIROS:", revenueDebug.activeClients);
      console.log("📥 CONTAS A RECEBER:", revenueDebug.accountsReceivable);
      
    } catch (error) {
      console.error("Erro no debug da receita:", error);
      toast.dismiss("debug-revenue");
      toast.error("Erro no debug da receita");
    }
  }, []);

  // Handlers para botões contextuais
  const handlePeriodSelect = useCallback(() => {
    console.log("🔍 Handler handlePeriodSelect executado");
    // toast.info("Seleção de período em desenvolvimento");
  }, []);

  const handleExportData = useCallback(() => {
    console.log("📊 Handler handleExportData executado");
    // toast.info("Exportação de dados em desenvolvimento");
  }, []);

  const handleNewAccount = useCallback((e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    console.log("💳 Handler handleNewAccount executado");
    // toast.info("Nova conta a pagar em desenvolvimento");
  }, []);

  const handleNewInvoice = useCallback((e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    console.log("📄 Handler handleNewInvoice executado");
    // toast.info("Novo faturamento em desenvolvimento");
  }, []);

  const handleNewPayroll = useCallback((e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    console.log("👥 Handler handleNewPayroll executado");
    // toast.info("Nova folha de pagamento em desenvolvimento");
  }, []);

  const handleViewReports = useCallback((e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    console.log("📈 Handler handleViewReports executado");
    // toast.info("Visualização de relatórios em desenvolvimento");
  }, []);

  const handleViewAccounting = useCallback((e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    console.log("🧮 Handler handleViewAccounting executado");
    // toast.info("Visualizar dados contábeis em desenvolvimento");
  }, []);

  const handleNewEntry = useCallback((e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    console.log("📝 Handler handleNewEntry executado");
    // toast.info("Novo lançamento contábil em desenvolvimento");
  }, []);

  const getModuleButtons = () => {
    console.log("🔄 getModuleButtons executado para módulo:", activeModule);
    
    // Não exibir botões para módulos desabilitados
    if (disabledModules.includes(activeModule)) {
      return null;
    }
    
    // Removidos todos os botões desnecessários conforme solicitado
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando sistema financeiro...</p>
          <p className="text-sm text-gray-500 mt-2">Integrando dados reais do Firebase</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="financial-management-expanded space-y-6">
        {/* Header com alertas */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Sistema Financeiro</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Gestão financeira integrada com {systemStats.totalClients} clientes e {systemStats.totalCollaborators} colaboradores
              </p>
            </div>
          </div>

          {/* Info sobre última sincronização */}
          {systemStats.lastSync && (
            <Alert className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
              <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                <strong>Sistema Sincronizado:</strong> Última atualização em {systemStats.lastSync.toLocaleString('pt-BR')}
              </AlertDescription>
            </Alert>
          )}

          {/* Alertas financeiros */}
          {dashboardData && dashboardData.upcomingDues.length > 0 && (
            <Alert className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
              <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <AlertDescription className="text-orange-800 dark:text-orange-200">
                <strong>Atenção:</strong> Você tem {dashboardData.upcomingDues.length} vencimentos próximos.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Módulos em linha horizontal - compactos */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-600">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Selecione um Módulo:</h3>
          <div className="flex space-x-3 overflow-x-auto pb-2">
            {financialModules.map((module) => {
              const isActive = activeModule === module.id;
              const isDisabled = disabledModules.includes(module.id);
              const stats = getModuleStats(module.id);
              
              return (
                <Tooltip key={module.id}>
                  <TooltipTrigger asChild>
                    <div
                      className={`flex-shrink-0 w-32 h-28 rounded-lg transition-all duration-200 p-3 border-2 relative ${
                        isDisabled 
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-600 cursor-not-allowed opacity-60' 
                          : isActive 
                            ? `${module.color} text-white border-transparent shadow-lg scale-105 cursor-pointer`
                            : `bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 ${module.hoverColor} hover:text-white hover:scale-102 cursor-pointer`
                      }`}
                      onClick={() => !isDisabled && setActiveModule(module.id)}
                    >
                      <div className="flex flex-col items-center justify-center h-full space-y-2">
                        <div className={`p-1 rounded ${isActive ? 'bg-white/20' : ''}`}>
                          {module.icon}
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-semibold leading-tight">
                            {module.shortTitle}
                          </p>
                          <p className="text-xs opacity-90 font-medium">
                            {isDisabled ? 'Em desenvolvimento' : stats}
                          </p>
                        </div>
                        {isActive && !isDisabled && (
                          <CheckCircle className="w-4 h-4 absolute top-1 right-1" />
                        )}
                        {isDisabled && (
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-200/50 dark:bg-gray-600/50 rounded-lg">
                            <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          </div>
                        )}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <div className="space-y-2">
                      <p className="font-semibold">{module.title}</p>
                      {isDisabled ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Este módulo será desenvolvido posteriormente e não está disponível no momento.
                        </p>
                      ) : (
                        <div className="space-y-1">
                          {module.items.map((item, index) => (
                            <div key={index} className="flex items-center text-xs">
                              <ArrowRight className="w-3 h-3 mr-1 flex-shrink-0" />
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>

        {/* Conteúdo do módulo ativo */}
        <Card className="min-h-[600px]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {financialModules.find(m => m.id === activeModule)?.icon}
                <div>
                  <CardTitle>
                    {financialModules.find(m => m.id === activeModule)?.title}
                  </CardTitle>
                  <CardDescription>
                    Módulo {financialModules.find(m => m.id === activeModule)?.shortTitle.toLowerCase()} - Gestão empresarial completa
                  </CardDescription>
                </div>
              </div>
              <div className="flex space-x-2">
                {(() => {
                  const buttons = getModuleButtons();
                  return buttons ? buttons : null;
                })()}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {renderModuleContent()}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}; 