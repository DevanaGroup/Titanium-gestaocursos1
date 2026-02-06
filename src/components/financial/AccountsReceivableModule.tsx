import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TrendingUp,
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
  Trash2,
  Users,
  Receipt,
  CreditCard,
  MoreVertical
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { getAllAccountsReceivable, getAllFinancialClients, deleteAccountReceivable, deleteFinancialClient, cleanDuplicateFinancialClients } from "@/services/financialCoreService";
import { AccountsReceivable } from "@/types/financial";
import { FinancialClient } from "@/types";
import { FinancialClientFormModal } from "./FinancialClientFormModal";
import { ReceivableFormModal } from "./ReceivableFormModal";

export const AccountsReceivableModule = () => {
  const [activeTab, setActiveTab] = useState("receivables");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [receivables, setReceivables] = useState<AccountsReceivable[]>([]);
  const [clients, setClients] = useState<FinancialClient[]>([]);

  // Estados para modais
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isReceivableModalOpen, setIsReceivableModalOpen] = useState(false);

  // Estados para edição
  const [editingClient, setEditingClient] = useState<FinancialClient | null>(null);
  const [editingReceivable, setEditingReceivable] = useState<AccountsReceivable | null>(null);

  // Estados para visualização
  const [viewingClient, setViewingClient] = useState<FinancialClient | null>(null);
  const [viewingReceivable, setViewingReceivable] = useState<AccountsReceivable | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Executar limpeza FORÇADA de duplicatas
      // console.log("🧹 EXECUÇÃO FORÇADA - Limpeza de clientes financeiros duplicados...");
      toast.loading("Executando limpeza forçada...");
      
      try {
        await cleanDuplicateFinancialClients();
        // console.log("✅ Limpeza forçada concluída com sucesso");
      } catch (cleanError) {
        console.error("❌ Erro na limpeza forçada:", cleanError);
        toast.error("Erro na limpeza de duplicatas, mas continuando...");
      }
      
      toast.dismiss();
      
      const [receivablesData, clientsData] = await Promise.all([
        getAllAccountsReceivable(),
        getAllFinancialClients()
      ]);
      
      setReceivables(receivablesData);
      setClients(clientsData);
      
      // console.log(`📊 RESULTADO FINAL: ${receivablesData.length} contas a receber e ${clientsData.length} clientes financeiros`);
      
      if (receivablesData.length > 0 || clientsData.length > 0) {
        toast.success(`✅ Dados limpos carregados: ${receivablesData.length} contas a receber e ${clientsData.length} clientes financeiros`);
      } else {
        // toast.info("Nenhum dado encontrado. Comece criando clientes e contas a receber.");
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.dismiss();
      toast.error("Erro ao carregar dados de contas a receber");
    } finally {
      setIsLoading(false);
    }
  };

  // Handlers para novos registros
  const handleNewReceivable = () => {
    // console.log("💰 [AccountsReceivable] Abrindo modal para nova conta a receber");
    setEditingReceivable(null);
    setIsReceivableModalOpen(true);
  };

  const handleNewClient = () => {
    // console.log("👤 [AccountsReceivable] Abrindo modal para novo cliente financeiro");
    setEditingClient(null);
    setIsClientModalOpen(true);
  };

  const handleGenerateReport = () => {
    // toast.info("Geração de relatórios em desenvolvimento");
  };

  const handleFilterClick = () => {
    // toast.info("Filtros avançados em desenvolvimento");
  };

  const handleForceCleanup = async () => {
    // console.log("🧹 [AccountsReceivable] Executando limpeza forçada manual");
    toast.loading("Executando limpeza forçada...");
    
    try {
      await cleanDuplicateFinancialClients();
      toast.dismiss();
      toast.success("Limpeza concluída! Recarregando dados...");
      await loadData();
    } catch (error) {
      console.error("Erro na limpeza forçada:", error);
      toast.dismiss();
      toast.error("Erro durante a limpeza forçada");
    }
  };

  // Handlers para contas a receber
  const handleViewReceivable = (receivable: AccountsReceivable) => {
    // console.log("🔍 [AccountsReceivable] Visualizando conta:", receivable.id);
    setViewingReceivable(receivable);
  };

  const handleEditReceivable = (receivable: AccountsReceivable) => {
    // console.log("✏️ [AccountsReceivable] Editando conta:", receivable.id);
    setEditingReceivable(receivable);
    setIsReceivableModalOpen(true);
  };

  const handleDeleteReceivable = async (receivable: AccountsReceivable) => {
    // console.log("🗑️ [AccountsReceivable] Excluindo conta:", receivable.id);
    
    if (window.confirm(`Tem certeza que deseja excluir a conta "${receivable.description}"?`)) {
      try {
        await deleteAccountReceivable(receivable.id);
        toast.success("Conta a receber excluída com sucesso!");
        await loadData();
      } catch (error) {
        console.error("Erro ao excluir conta:", error);
        toast.error("Erro ao excluir conta a receber");
      }
    }
  };

  // Handlers para clientes
  const handleViewClient = (client: FinancialClient) => {
    // console.log("🔍 [AccountsReceivable] Visualizando cliente:", client.id);
    setViewingClient(client);
  };

  const handleEditClient = (client: FinancialClient) => {
    // console.log("✏️ [AccountsReceivable] Editando cliente:", client.id);
    setEditingClient(client);
    setIsClientModalOpen(true);
  };

  const handleDeleteClient = async (client: FinancialClient) => {
    // console.log("🗑️ [AccountsReceivable] Excluindo cliente:", client.id);
    
    if (window.confirm(`Tem certeza que deseja excluir o cliente "${client.name}"?`)) {
      try {
        await deleteFinancialClient(client.id);
        toast.success("Cliente excluído com sucesso!");
        await loadData();
      } catch (error) {
        console.error("Erro ao excluir cliente:", error);
        toast.error("Erro ao excluir cliente");
      }
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const configs = {
      PENDENTE: { color: "bg-yellow-100 text-yellow-800", icon: Clock },
      RECEBIDO: { color: "bg-green-100 text-green-800", icon: CheckCircle },
      VENCIDO: { color: "bg-red-100 text-red-800", icon: AlertTriangle },
      CANCELADO: { color: "bg-gray-100 text-gray-800", icon: AlertTriangle },
      Ativo: { color: "bg-green-100 text-green-800", icon: CheckCircle },
      Inativo: { color: "bg-gray-100 text-gray-800", icon: Clock },
      Inadimplente: { color: "bg-red-100 text-red-800", icon: AlertTriangle },
      Suspenso: { color: "bg-yellow-100 text-yellow-800", icon: AlertTriangle }
    };
    
    const config = configs[status as keyof typeof configs];
    if (!config) return <Badge>{status}</Badge>;
    
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  const getTotalByStatus = (status: string) => {
    return receivables
      .filter(r => r.status === status)
      .reduce((sum, r) => sum + r.totalAmount, 0);
  };

  const getCountByStatus = (status: string) => {
    return receivables.filter(r => r.status === status).length;
  };

  // Função para calcular o total geral incluindo clientes com recorrência
  const getTotalReceivables = () => {
    const receivablesTotal = receivables.reduce((sum, r) => sum + r.totalAmount, 0);
    const clientsTotal = clients
      .filter(c => c.contractType === 'Recorrente' && c.monthlyValue && c.status === 'Ativo')
      .reduce((sum, c) => sum + c.monthlyValue, 0);
    return receivablesTotal + clientsTotal;
  };

  // Função para calcular o total pendente incluindo clientes com recorrência
  const getTotalPendingReceivables = () => {
    const receivablesPending = getTotalByStatus('PENDENTE');
    const clientsPending = clients
      .filter(c => c.contractType === 'Recorrente' && c.monthlyValue && c.status === 'Ativo')
      .reduce((sum, c) => sum + c.monthlyValue, 0);
    return receivablesPending + clientsPending;
  };

  // Função para contar o total de contas (incluindo clientes com recorrência)
  const getTotalCount = () => {
    const receivablesCount = receivables.length;
    const clientsCount = clients.filter(c => c.contractType === 'Recorrente' && c.monthlyValue && c.status === 'Ativo').length;
    return receivablesCount + clientsCount;
  };

  // Função para contar contas pendentes (incluindo clientes com recorrência)
  const getTotalPendingCount = () => {
    const receivablesPendingCount = getCountByStatus('PENDENTE');
    const clientsPendingCount = clients.filter(c => c.contractType === 'Recorrente' && c.monthlyValue && c.status === 'Ativo').length;
    return receivablesPendingCount + clientsPendingCount;
  };

  const filteredReceivables = receivables.filter(receivable => 
    searchTerm === "" || 
    receivable.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    receivable.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredClients = clients.filter(client => 
    searchTerm === "" || 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.project?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando contas a receber...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header removido conforme solicitado */}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="receivables">Contas a Receber ({receivables.length})</TabsTrigger>
          <TabsTrigger value="clients">Clientes Financeiros ({clients.length})</TabsTrigger>
        </TabsList>

        {/* Contas a Receber */}
        <TabsContent value="receivables" className="space-y-6">
          {/* Indicadores */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-800 dark:text-green-300 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Total a Receber
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {formatCurrency(getTotalReceivables())}
                </div>
                <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                  {getTotalCount()} contas
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
                  {formatCurrency(getTotalPendingReceivables())}
                </div>
                <div className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                  {getTotalPendingCount()} contas
                </div>
              </CardContent>
            </Card>

            <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-800 dark:text-red-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Vencidas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                  {formatCurrency(getTotalByStatus('VENCIDO'))}
                </div>
                <div className="text-sm text-red-600 dark:text-red-400 mt-1">
                  {getCountByStatus('VENCIDO')} contas
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-300 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Recebidas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {formatCurrency(getTotalByStatus('RECEBIDO'))}
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  {getCountByStatus('RECEBIDO')} contas
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Próximos Recebimentos */}
          <Card>
            <CardHeader>
              <CardTitle>Próximos Recebimentos</CardTitle>
              <CardDescription>
                Contas pendentes + Clientes com recorrência mensal ativa
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(receivables.filter(r => r.status === 'PENDENTE').length > 0 || 
                clients.filter(c => c.contractType === 'Recorrente' && c.monthlyValue && c.status === 'Ativo').length > 0) ? (
                <div className="space-y-3">
                  {/* Contas a Receber Pendentes */}
                  {receivables
                    .filter(r => r.status === 'PENDENTE')
                    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                    .slice(0, 3)
                    .map((receivable) => (
                      <div key={receivable.id} className="flex items-center justify-between p-3 border dark:border-gray-600 rounded-lg">
                        <div>
                          <p className="font-medium dark:text-gray-100">{receivable.clientName}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{receivable.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600 dark:text-green-400">{formatCurrency(receivable.totalAmount)}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Vence em {new Date(receivable.dueDate).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    ))}
                  
                  {/* Clientes com Recorrência */}
                  {clients
                    .filter(c => c.contractType === 'Recorrente' && c.monthlyValue && c.status === 'Ativo')
                    .slice(0, 3)
                    .map((client) => {
                      const currentDate = new Date();
                      const nextDueDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), client.dueDate);
                      if (nextDueDate < currentDate) {
                        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
                      }
                      
                      return (
                        <div key={client.id} className="flex items-center justify-between p-3 border rounded-lg bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                          <div>
                            <p className="font-medium dark:text-gray-100">{client.name}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{client.project || client.billingType} (Recorrente)</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600 dark:text-green-400">{formatCurrency(client.monthlyValue)}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Vence em {nextDueDate.toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma conta pendente encontrada</p>
                  {clients.length === 0 && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Comece cadastrando clientes financeiros</p>
                      <Button variant="outline" onClick={() => setActiveTab("clients")}>
                        <Building className="w-4 h-4 mr-2" />
                        Ir para Clientes
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Controles */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por cliente ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-[300px]"
                />
              </div>
              <Button variant="outline" size="sm" onClick={handleFilterClick}>
                <Filter className="w-4 h-4 mr-2" />
                Filtros
              </Button>
            </div>
            <Button onClick={handleNewReceivable}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Receita Avulsa
            </Button>
          </div>

          {/* Lista de Contas a Receber */}
          <Card>
            <CardHeader>
              <CardTitle>Receitas Avulsas</CardTitle>
              <CardDescription>
                {filteredReceivables.length} receitas registradas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredReceivables.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Nenhuma receita avulsa encontrada</p>
                  <p className="mb-4">Registre serviços pontuais sem criar clientes completos</p>
                  <Button onClick={handleNewReceivable}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Receita Avulsa
                  </Button>
                </div>
              )}

              {filteredReceivables.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReceivables.map((receivable, index) => (
                      <TableRow key={`${receivable.id}-${index}`}>
                        <TableCell className="font-medium">
                          {receivable.clientName}
                        </TableCell>
                        <TableCell>{receivable.description}</TableCell>
                        <TableCell>{formatCurrency(receivable.totalAmount)}</TableCell>
                        <TableCell>
                          {new Date(receivable.dueDate).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(receivable.status)}
                        </TableCell>
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewReceivable(receivable)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Visualizar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditReceivable(receivable)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteReceivable(receivable)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clientes Financeiros */}
        <TabsContent value="clients" className="space-y-6">
          {/* Controles */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nome ou projeto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-[300px]"
                />
              </div>
            </div>
            <Button onClick={handleNewClient}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Cliente Financeiro
            </Button>
          </div>

          {/* Lista de Clientes */}
          <Card>
            <CardHeader>
              <CardTitle>Clientes Financeiros</CardTitle>
              <CardDescription>
                {filteredClients.length} clientes cadastrados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredClients.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Nenhum cliente encontrado</p>
                  <p className="mb-4">Comece criando um novo cliente financeiro</p>
                  <Button onClick={handleNewClient}>
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Cliente Financeiro
                  </Button>
                </div>
              )}

              {filteredClients.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Projeto</TableHead>
                      <TableHead>CPF/CNPJ</TableHead>
                      <TableHead>Valor Mensal</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Tipo de Cobrança</TableHead>
                      <TableHead>Nota Fiscal</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client, index) => (
                      <TableRow key={`${client.id}-${index}`}>
                        <TableCell className="font-medium">
                          {client.name}
                        </TableCell>
                        <TableCell>{client.project || "N/A"}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {client.cnpj || client.cpf || "N/A"}
                        </TableCell>
                        <TableCell>{formatCurrency(client.monthlyValue)}</TableCell>
                        <TableCell>Dia {client.dueDate}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{client.billingType}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={client.invoiceRequired ? "default" : "secondary"}>
                            {client.invoiceRequired ? "Sim" : "Não"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(client.status)}
                        </TableCell>
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewClient(client)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Visualizar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditClient(client)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteClient(client)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modais */}
      <FinancialClientFormModal
        isOpen={isClientModalOpen}
        onClose={() => {
          setIsClientModalOpen(false);
          setEditingClient(null);
        }}
        onSuccess={loadData}
        initialData={editingClient}
      />

      <ReceivableFormModal
        isOpen={isReceivableModalOpen}
        onClose={() => {
          setIsReceivableModalOpen(false);
          setEditingReceivable(null);
        }}
        onSuccess={loadData}
        initialData={editingReceivable}
      />

      {/* Modal de Visualização de Cliente */}
      {viewingClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-[500px] max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Detalhes do Cliente</CardTitle>
              <CardDescription>Informações financeiras completas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Informações Básicas</h4>
                <div className="space-y-2 text-sm">
                  <div><strong>Nome:</strong> {viewingClient.name}</div>
                  <div><strong>Projeto:</strong> {viewingClient.project || "N/A"}</div>
                  {viewingClient.cnpj && <div><strong>CNPJ:</strong> {viewingClient.cnpj}</div>}
                  {viewingClient.cpf && <div><strong>CPF:</strong> {viewingClient.cpf}</div>}
                  <div><strong>Status:</strong> {getStatusBadge(viewingClient.status)}</div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Informações Financeiras</h4>
                <div className="space-y-2 text-sm">
                  <div><strong>Valor Mensal:</strong> {formatCurrency(viewingClient.monthlyValue)}</div>
                  <div><strong>Data de Vencimento:</strong> Dia {viewingClient.dueDate} de cada mês</div>
                  <div><strong>Tipo de Cobrança:</strong> {viewingClient.billingType}</div>
                  <div><strong>Tipo de Contrato:</strong> {viewingClient.contractType}</div>
                  <div><strong>Nota Fiscal:</strong> {viewingClient.invoiceRequired ? "Sim" : "Não"}</div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Contato</h4>
                <div className="space-y-2 text-sm">
                  <div><strong>Email:</strong> {viewingClient.contactInfo.email || "N/A"}</div>
                  <div><strong>Telefone:</strong> {viewingClient.contactInfo.phone || "N/A"}</div>
                  <div><strong>Endereço:</strong> {viewingClient.contactInfo.address || "N/A"}</div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setViewingClient(null)}>
                  Fechar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de Visualização de Conta a Receber */}
      {viewingReceivable && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-[500px] max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Detalhes da Conta a Receber</CardTitle>
              <CardDescription>Informações da conta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div><strong>Cliente:</strong> {viewingReceivable.clientName}</div>
                <div><strong>Descrição:</strong> {viewingReceivable.description}</div>
                <div><strong>Valor Total:</strong> {formatCurrency(viewingReceivable.totalAmount)}</div>
                <div><strong>Vencimento:</strong> {new Date(viewingReceivable.dueDate).toLocaleDateString('pt-BR')}</div>
                <div><strong>Status:</strong> {getStatusBadge(viewingReceivable.status)}</div>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setViewingReceivable(null)}>
                  Fechar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}; 