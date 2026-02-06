import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  CreditCard,
  BarChart3,
  Bell,
  Download,
  Receipt,
  Settings,
  Save,
  Building2,
  Filter,
  Search,
  X,
  MoreVertical
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { FinancialClient, MonthlyBalance, BalanceExpense } from "@/types";
import {
  getAllClientsWithFinancialData,
  saveFinancialData,
  updateFinancialClient,
  deleteFinancialClient,
  markPaymentReceived,
  markClientAsDefaulting,
  getClientsWithUpcomingDueDates,
  createMonthlyBalance,
  getMonthlyBalance,
  addExpenseToBalance,
  calculateMonthlyRevenue,
  generateFinancialAlert,
  generateInvoiceAndBoleto
} from "@/services/financialService";
import { format, addDays, isAfter, isBefore, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";


export const FinancialManagement = () => {
  console.log("🎯 Componente FinancialManagement carregado!");
  
  const [clients, setClients] = useState<FinancialClient[]>([]);
  const [currentBalance, setCurrentBalance] = useState<MonthlyBalance | null>(null);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAddExpenseDialogOpen, setIsAddExpenseDialogOpen] = useState(false);
  const [isEditClientDialogOpen, setIsEditClientDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<FinancialClient | null>(null);
  const [activeTab, setActiveTab] = useState("clients");

  // Estados do formulário de edição rápida
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [quickEditData, setQuickEditData] = useState({
    monthlyValue: 0,
    dueDate: 1,
    billingType: "Mensal" as FinancialClient['billingType'],
    contractType: "Recorrente" as FinancialClient['contractType']
  });

  // Estados do formulário de despesa
  const [expenseFormData, setExpenseFormData] = useState({
    description: "",
    amount: 0,
    category: "Operacional" as BalanceExpense['category'],
    date: ""
  });

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        console.log("🚀 Iniciando carregamento dos dados financeiros...");
        
        // Buscar todos os clientes com dados financeiros integrados
        const clientsData = await getAllClientsWithFinancialData();
        console.log("📋 Clientes carregados:", clientsData);
        setClients(clientsData);

        // Buscar ou criar balanço do mês atual
        let balance = await getMonthlyBalance(currentMonth, currentYear);
        if (!balance) {
          console.log("📊 Criando novo balanço mensal...");
          const monthlyRevenue = await calculateMonthlyRevenue(currentMonth, currentYear);
          balance = await createMonthlyBalance({
            month: currentMonth,
            year: currentYear,
            totalRevenue: monthlyRevenue,
            totalExpenses: 0,
            netProfit: monthlyRevenue,
            expenses: [],
            clients: clientsData.filter(c => c.status === 'Ativo')
          });
        }
        setCurrentBalance(balance);

        // Gerar alertas de vencimento
        const upcomingClients = await getClientsWithUpcomingDueDates(10);
        const alertMessages = upcomingClients.map(client => 
          `${client.name} - Vencimento em ${differenceInDays(getNextDueDate(client), new Date())} dias`
        );
        setAlerts(alertMessages);

        console.log("✅ Dados financeiros carregados com sucesso:", {
          clientesTotal: clientsData.length,
          clientesAtivos: clientsData.filter(c => c.status === 'Ativo').length,
          clientesSemDados: clientsData.filter(c => c.status === 'Sem dados financeiros').length,
          alertas: alertMessages.length
        });

      } catch (error) {
        console.error("❌ Erro detalhado ao carregar dados financeiros:", error);
        
        // Mostrar mais detalhes do erro
        if (error instanceof Error) {
          console.error("Mensagem:", error.message);
          console.error("Stack:", error.stack);
        }
        
        toast.error("Erro ao carregar dados financeiros. Verifique o console para mais detalhes.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentMonth, currentYear]);

  // Função para calcular próxima data de vencimento
  const getNextDueDate = (client: FinancialClient): Date => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Criar data de vencimento para este mês
    let dueDate = new Date(currentYear, currentMonth, client.dueDate);
    
    // Se já passou do vencimento deste mês, calcular para o próximo mês
    if (dueDate < today) {
      dueDate = new Date(currentYear, currentMonth + 1, client.dueDate);
    }
    
    return dueDate;
  };

  // Função para determinar o status de pagamento com cores
  const getPaymentStatus = (client: FinancialClient): { status: string; color: string; variant: "default" | "secondary" | "destructive" | "outline" } => {
    if (client.status === 'Sem dados financeiros') {
      return { status: "Configurar", color: "bg-gray-100 text-gray-800", variant: "outline" };
    }

    const today = new Date();
    const nextDueDate = getNextDueDate(client);
    const daysUntilDue = differenceInDays(nextDueDate, today);
    
    // Verificar se tem pagamento recente (último mês)
    const lastPayment = client.lastPaymentDate;
    const hasRecentPayment = lastPayment && differenceInDays(today, lastPayment) <= 35;
    
    if (hasRecentPayment && daysUntilDue > 10) {
      return { status: "Em Dia", color: "bg-green-100 text-green-800", variant: "default" };
    } else if (daysUntilDue <= 10 && daysUntilDue > 0) {
      return { status: "Vencendo", color: "bg-yellow-100 text-yellow-800", variant: "outline" };
    } else if (daysUntilDue <= 0) {
      return { status: "Vencido", color: "bg-red-100 text-red-800", variant: "destructive" };
    } else {
      return { status: "Aguardando", color: "bg-blue-100 text-blue-800", variant: "secondary" };
    }
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || client.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleQuickEdit = (client: FinancialClient) => {
    setEditingClientId(client.id);
    setQuickEditData({
      monthlyValue: client.monthlyValue,
      dueDate: client.dueDate,
      billingType: client.billingType || 'Mensal',
      contractType: client.contractType
    });
  };

  const handleSaveQuickEdit = async (client: FinancialClient) => {
    if (!client.originalClientId) {
      toast.error("Erro: Cliente sem referência original");
      return;
    }

    try {
      await saveFinancialData(client.originalClientId, {
        monthlyValue: quickEditData.monthlyValue,
        dueDate: quickEditData.dueDate,
        contractStartDate: client.contractStartDate,
        contractEndDate: client.contractEndDate,
        contractType: quickEditData.contractType,
        billingType: quickEditData.billingType,
        status: 'Ativo'
      });

      // Recarregar dados
      const updatedClients = await getAllClientsWithFinancialData();
      setClients(updatedClients);
      setEditingClientId(null);
      
      toast.success("Dados financeiros salvos com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar dados financeiros:", error);
      toast.error("Erro ao salvar dados financeiros");
    }
  };

  const handleCancelEdit = () => {
    setEditingClientId(null);
  };

  const handleMarkPayment = async (client: FinancialClient) => {
    if (client.status === 'Sem dados financeiros') {
      toast.error("Configure os dados financeiros primeiro");
      return;
    }

    try {
      // Se o ID começar com "temp-", precisamos criar os dados financeiros primeiro
      if (client.id.startsWith('temp-')) {
        toast.error("Configure os dados financeiros primeiro");
        return;
      }

      await markPaymentReceived(client.id, new Date());
      
      // Recarregar dados
      const updatedClients = await getAllClientsWithFinancialData();
      setClients(updatedClients);

      toast.success("Pagamento marcado como recebido!");
    } catch (error) {
      console.error("Erro ao marcar pagamento:", error);
      toast.error("Erro ao marcar pagamento");
    }
  };

  const handleMarkAsDefaulting = async (client: FinancialClient) => {
    if (client.status === 'Sem dados financeiros' || client.id.startsWith('temp-')) {
      toast.error("Configure os dados financeiros primeiro");
      return;
    }

    try {
      await markClientAsDefaulting(client.id);
      
      // Recarregar dados
      const updatedClients = await getAllClientsWithFinancialData();
      setClients(updatedClients);

      toast.success("Cliente marcado como inadimplente");
    } catch (error) {
      console.error("Erro ao marcar como inadimplente:", error);
      toast.error("Erro ao marcar como inadimplente");
    }
  };

  const handleAddExpense = async () => {
    if (!expenseFormData.description || !expenseFormData.amount) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      const expense: BalanceExpense = {
        id: Date.now().toString(),
        description: expenseFormData.description,
        amount: expenseFormData.amount,
        category: expenseFormData.category,
        date: new Date(expenseFormData.date || new Date())
      };

      await addExpenseToBalance(currentMonth, currentYear, expense);
      
      // Atualizar balanço local
      if (currentBalance) {
        const updatedBalance = {
          ...currentBalance,
          expenses: [...currentBalance.expenses, expense],
          totalExpenses: currentBalance.totalExpenses + expense.amount,
          netProfit: currentBalance.totalRevenue - (currentBalance.totalExpenses + expense.amount)
        };
        setCurrentBalance(updatedBalance);
      }

      setIsAddExpenseDialogOpen(false);
      resetExpenseForm();
      
      toast.success("Despesa adicionada com sucesso!");
    } catch (error) {
      console.error("Erro ao adicionar despesa:", error);
      toast.error("Erro ao adicionar despesa");
    }
  };

  const handleGenerateInvoice = async (client: FinancialClient) => {
    if (client.status === 'Sem dados financeiros' || client.id.startsWith('temp-')) {
      toast.error("Configure os dados financeiros primeiro");
      return;
    }

    try {
      toast.loading("Gerando NF e Boleto...");
      
      const result = await generateInvoiceAndBoleto(client.id);
      
      toast.dismiss();
      toast.success("NF e Boleto gerados com sucesso!", {
        description: "Documentos disponíveis para download",
        action: {
          label: "Baixar",
          onClick: () => {
            if (result.invoice) window.open(result.invoice, '_blank');
            if (result.boleto) window.open(result.boleto, '_blank');
          }
        }
      });
    } catch (error) {
      console.error("Erro ao gerar documentos:", error);
      toast.dismiss();
      toast.error("Erro ao gerar NF e Boleto");
    }
  };

  const resetExpenseForm = () => {
    setExpenseFormData({
      description: "",
      amount: 0,
      category: "Operacional",
      date: ""
    });
  };

  const getStatusBadge = (status: FinancialClient['status']) => {
    const statusConfig = {
      'Ativo': { variant: 'default' as const, icon: CheckCircle, color: 'bg-green-100 text-green-800' },
      'Inativo': { variant: 'secondary' as const, icon: XCircle, color: 'bg-gray-100 text-gray-800' },
      'Inadimplente': { variant: 'destructive' as const, icon: AlertTriangle, color: 'bg-red-100 text-red-800' },
      'Suspenso': { variant: 'outline' as const, icon: XCircle, color: 'bg-yellow-100 text-yellow-800' },
      'Sem dados financeiros': { variant: 'outline' as const, icon: Settings, color: 'bg-blue-100 text-blue-800' }
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={`badge flex items-center gap-1 ${config.color}`}>
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando dados financeiros...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="financial-management space-y-6">
      {/* Alertas de Vencimento */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <Alert key={index} className="border-orange-200 bg-orange-50">
              <Bell className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>Atenção:</strong> {alert} - NF e Boleto devem ser gerados!
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="clients">Clientes Financeiros</TabsTrigger>
          <TabsTrigger value="monthly">Visão Mensal</TabsTrigger>
          <TabsTrigger value="expenses">Custos e Despesas</TabsTrigger>
          <TabsTrigger value="balance">Balanço do Mês</TabsTrigger>
        </TabsList>

        {/* Aba de Clientes Financeiros */}
        <TabsContent value="clients" className="space-y-6">
          <Card className="transition-shadow duration-200 hover:shadow-md">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Building2 className="w-5 h-5" />
                    Todos os Clientes
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Todos os seus clientes com status financeiro integrado
                  </CardDescription>
                </div>
                <div className="flex flex-col lg:flex-row gap-3">
                  {/* Campo de busca à esquerda */}
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground/70 w-3.5 h-3.5 z-10" />
                    <Input 
                      placeholder="Buscar cliente..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 h-9 text-sm"
                    />
                  </div>

                  {/* Botão de filtros à direita */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`h-9 px-3 gap-2 ${
                          statusFilter !== "all"
                            ? "bg-primary text-primary-foreground border-primary"
                            : ""
                        }`}
                      >
                        <Filter className="h-4 w-4" />
                        <span className="hidden sm:inline">Filtros</span>
                        {statusFilter !== "all" && (
                          <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                            1
                          </Badge>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-4" align="end">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-sm">Filtros</h4>
                          {statusFilter !== "all" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setStatusFilter("all");
                              }}
                              className="h-7 px-2 text-xs"
                            >
                              <X className="h-3 w-3 mr-1" />
                              Limpar
                            </Button>
                          )}
                        </div>

                        <div className="space-y-3">
                          {/* Filtro de Status */}
                          <div className="space-y-2">
                            <Label htmlFor="filter-status" className="text-xs font-medium">
                              Status
                            </Label>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                              <SelectTrigger id="filter-status" className="h-9">
                                <SelectValue placeholder="Selecione o status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="Ativo">Ativo</SelectItem>
                                <SelectItem value="Inativo">Inativo</SelectItem>
                                <SelectItem value="Inadimplente">Inadimplente</SelectItem>
                                <SelectItem value="Suspenso">Suspenso</SelectItem>
                                <SelectItem value="Sem dados financeiros">Sem dados financeiros</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardHeader>
            <CardContent className="card-content">
              {filteredClients.length > 0 ? (
                <div className="table-container border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Cliente</TableHead>
                        <TableHead className="w-[160px]">Projeto</TableHead>
                        <TableHead className="w-[140px]">Valor/Cobrança</TableHead>
                        <TableHead className="w-[120px]">Vencimento</TableHead>
                        <TableHead className="w-[120px]">Status Pagamento</TableHead>
                        <TableHead className="w-[100px]">Nota Fiscal</TableHead>
                        <TableHead className="w-[100px]">Status</TableHead>
                        <TableHead className="w-[140px] text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClients.map((client) => {
                        const paymentStatus = getPaymentStatus(client);
                        const nextDueDate = getNextDueDate(client);
                        const isEditing = editingClientId === client.id;
                        
                        return (
                          <TableRow key={client.id} className="dark:hover:bg-muted/20">
                            <TableCell className="font-medium">
                              <div className="max-w-[160px]">
                                <div className="font-semibold truncate">{client.name}</div>
                                {client.contactName && (
                                  <div className="text-sm text-gray-500 truncate">Contato: {client.contactName}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm max-w-[140px]">
                                <div className="font-medium truncate">{client.project || 'Não informado'}</div>
                                <div className="text-gray-500 truncate">Status: {client.clientStatus}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <div className="space-y-1 min-w-[120px]">
                                  <Input
                                    type="number"
                                    placeholder="Valor mensal"
                                    value={quickEditData.monthlyValue}
                                    onChange={(e) => setQuickEditData(prev => ({
                                      ...prev, 
                                      monthlyValue: parseFloat(e.target.value) || 0
                                    }))}
                                    className="h-7 text-xs"
                                  />
                                  <Select 
                                    value={quickEditData.billingType} 
                                    onValueChange={(value) => setQuickEditData(prev => ({
                                      ...prev, 
                                      billingType: value as FinancialClient['billingType']
                                    }))}
                                  >
                                    <SelectTrigger className="h-7 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Mensal">Mensal</SelectItem>
                                      <SelectItem value="Anual">Anual</SelectItem>
                                      <SelectItem value="Trimestral">Trimestral</SelectItem>
                                      <SelectItem value="Semestral">Semestral</SelectItem>
                                      <SelectItem value="Único">Único</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              ) : (
                                <div className="max-w-[120px]">
                                  <div className="font-medium truncate">
                                    R$ {client.monthlyValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </div>
                                  <div className="text-sm text-gray-500 truncate">
                                    {client.billingType || 'Mensal'}
                                  </div>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <Select 
                                  value={quickEditData.dueDate.toString()} 
                                  onValueChange={(value) => setQuickEditData(prev => ({
                                    ...prev, 
                                    dueDate: parseInt(value)
                                  }))}
                                >
                                  <SelectTrigger className="h-7 w-16 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                                      <SelectItem key={day} value={day.toString()}>
                                        {day}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                client.status !== 'Sem dados financeiros' ? (
                                  <div className="max-w-[100px]">
                                    <div>Dia {client.dueDate}</div>
                                    <div className="text-sm text-gray-500 truncate">
                                      {format(nextDueDate, "dd/MM/yyyy", { locale: ptBR })}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-gray-400">-</div>
                                )
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={paymentStatus.variant} className={`badge ${paymentStatus.color}`}>
                                {paymentStatus.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={client.invoiceRequired ? "default" : "secondary"}>
                                {client.invoiceRequired ? "Sim" : "Não"}
                              </Badge>
                            </TableCell>
                            <TableCell>{getStatusBadge(client.status)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                {isEditing ? (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleSaveQuickEdit(client)}
                                      className="text-green-600 hover:text-green-700 h-7 w-7 p-0"
                                      title="Salvar"
                                    >
                                      <Save className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={handleCancelEdit}
                                      className="text-gray-600 hover:text-gray-700 h-7 w-7 p-0"
                                      title="Cancelar"
                                    >
                                      <XCircle className="w-3 h-3" />
                                    </Button>
                                  </>
                                ) : (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      {client.status === 'Sem dados financeiros' ? (
                                        <DropdownMenuItem onClick={() => handleQuickEdit(client)}>
                                          <Settings className="mr-2 h-4 w-4" />
                                          Configurar dados financeiros
                                        </DropdownMenuItem>
                                      ) : (
                                        <>
                                          <DropdownMenuItem onClick={() => handleGenerateInvoice(client)}>
                                            <FileText className="mr-2 h-4 w-4" />
                                            Gerar NF e Boleto
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleMarkPayment(client)}>
                                            <CheckCircle className="mr-2 h-4 w-4" />
                                            Marcar como Pago
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleQuickEdit(client)}>
                                            <Edit className="mr-2 h-4 w-4" />
                                            Editar dados financeiros
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={() => handleMarkAsDefaulting(client)}
                                            className="text-red-600 focus:text-red-600"
                                          >
                                            <AlertTriangle className="mr-2 h-4 w-4" />
                                            Marcar como Inadimplente
                                          </DropdownMenuItem>
                                        </>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : clients.length > 0 ? (
                <div className="text-center py-10">
                  <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500">Nenhum cliente corresponde aos filtros aplicados.</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Ajuste os filtros acima para ver mais resultados
                  </p>
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Total de clientes carregados: {clients.length}</h4>
                    <div className="text-sm text-blue-700 space-y-1">
                      <div>• Com dados financeiros: {clients.filter(c => c.status !== 'Sem dados financeiros').length}</div>
                      <div>• Sem dados financeiros: {clients.filter(c => c.status === 'Sem dados financeiros').length}</div>
                      <div>• Filtro atual: {statusFilter === 'all' ? 'Todos' : statusFilter}</div>
                      <div>• Termo de busca: {searchTerm || 'Nenhum'}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10">
                  <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500">Nenhum cliente encontrado.</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Verifique os logs do console (F12) para mais informações sobre o carregamento
                  </p>
                  <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                    <h4 className="font-medium text-yellow-900 mb-2">⚠️ Diagnóstico</h4>
                    <div className="text-sm text-yellow-700 space-y-1">
                      <div>• Estado de carregamento: {isLoading ? 'Carregando...' : 'Finalizado'}</div>
                      <div>• Total de clientes: {clients.length}</div>
                      <div>• Verifique o console (F12) para logs detalhados</div>
                      <div>• Certifique-se de que há clientes cadastrados na seção "Clientes"</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba de Visão Mensal */}
        <TabsContent value="monthly" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Visão Mensal</CardTitle>
              <CardDescription>Funcionalidade movida para o módulo de Vencimentos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">
                  Esta funcionalidade foi movida para o módulo de Vencimentos para evitar duplicação.
                  Acesse o módulo de Vencimentos no menu expandido.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba de Custos e Despesas */}
        <TabsContent value="expenses" className="space-y-6">
          <Card>
            <CardHeader className="card-header">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="w-5 h-5" />
                    Custos e Despesas
                  </CardTitle>
                  <CardDescription>
                    Gerencie os custos operacionais e despesas do mês
                  </CardDescription>
                </div>
                <Button onClick={() => setIsAddExpenseDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Despesa
                </Button>
              </div>
            </CardHeader>
            <CardContent className="card-content">
              {currentBalance && currentBalance.expenses.length > 0 ? (
                <div className="table-container border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentBalance.expenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell className="font-medium">{expense.description}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="badge">{expense.category}</Badge>
                          </TableCell>
                          <TableCell>
                            {format(expense.date, "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-right text-red-600">
                            - R$ {expense.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-10">
                  <TrendingDown className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500">Nenhuma despesa cadastrada este mês.</p>
                  <Button 
                    className="mt-4"
                    onClick={() => setIsAddExpenseDialogOpen(true)}
                  >
                    Adicionar primeira despesa
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba de Balanço do Mês */}
        <TabsContent value="balance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-green-50 border-green-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-800 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Receita Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">
                  R$ {currentBalance?.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                </div>
                <p className="text-xs text-green-600 mt-1">
                  {clients.filter(c => c.status === 'Ativo').length} clientes ativos
                </p>
              </CardContent>
            </Card>

            <Card className="bg-red-50 border-red-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-800 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4" />
                  Despesas Totais
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-700">
                  R$ {currentBalance?.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                </div>
                <p className="text-xs text-red-600 mt-1">
                  {currentBalance?.expenses.length || 0} despesas registradas
                </p>
              </CardContent>
            </Card>

            <Card className={`${(currentBalance?.netProfit || 0) >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
              <CardHeader className="pb-2">
                <CardTitle className={`text-sm font-medium flex items-center gap-2 ${(currentBalance?.netProfit || 0) >= 0 ? 'text-blue-800' : 'text-red-800'}`}>
                  <BarChart3 className="w-4 h-4" />
                  Lucro Líquido
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${(currentBalance?.netProfit || 0) >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                  R$ {currentBalance?.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                </div>
                <p className={`text-xs mt-1 ${(currentBalance?.netProfit || 0) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  Mês de {format(new Date(currentYear, currentMonth - 1), "MMMM/yyyy", { locale: ptBR })}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Resumo Financeiro Detalhado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="font-medium">Receita Bruta</span>
                  <span className="text-green-600 font-semibold">
                    + R$ {currentBalance?.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="font-medium">Despesas Operacionais</span>
                  <span className="text-red-600 font-semibold">
                    - R$ {currentBalance?.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-t-2 border-gray-200">
                  <span className="font-bold text-lg">Resultado Final</span>
                  <span className={`font-bold text-lg ${(currentBalance?.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(currentBalance?.netProfit || 0) >= 0 ? '+' : ''} R$ {currentBalance?.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Dialog para Adicionar Despesa */}
      <Dialog open={isAddExpenseDialogOpen} onOpenChange={setIsAddExpenseDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nova Despesa</DialogTitle>
            <DialogDescription>
              Adicione uma nova despesa ao balanço do mês atual.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="expense-description">Descrição *</Label>
              <Input
                id="expense-description"
                value={expenseFormData.description}
                onChange={(e) => setExpenseFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Ex: Hospedagem servidor, Licenças software..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-amount">Valor (R$) *</Label>
              <Input
                id="expense-amount"
                type="number"
                step="0.01"
                min="0"
                value={expenseFormData.amount}
                onChange={(e) => setExpenseFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-category">Categoria</Label>
              <Select 
                value={expenseFormData.category} 
                onValueChange={(value) => setExpenseFormData(prev => ({ ...prev, category: value as BalanceExpense['category'] }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Operacional">Operacional</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Administrativo">Administrativo</SelectItem>
                  <SelectItem value="Tecnologia">Tecnologia</SelectItem>
                  <SelectItem value="Recursos Humanos">Recursos Humanos</SelectItem>
                  <SelectItem value="Outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-date">Data</Label>
              <Input
                id="expense-date"
                type="date"
                value={expenseFormData.date}
                onChange={(e) => setExpenseFormData(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddExpenseDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddExpense}>
              Adicionar Despesa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}; 