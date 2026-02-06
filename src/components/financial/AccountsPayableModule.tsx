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
  CreditCard,
  Plus,
  Search,
  Filter,
  Building,
  Clock,
  CheckCircle,
  AlertTriangle,
  Eye,
  Edit,
  Trash2,
  X,
  MoreVertical
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { getAllAccountsPayable, getAllSuppliers, deleteAccountPayable, deleteSupplier } from "@/services/financialCoreService";
import { AccountsPayable, Supplier } from "@/types/financial";

// Importar os modais que criamos
import { SupplierFormModal } from "./SupplierFormModal";
import { AccountPayableFormModal } from "./AccountPayableFormModal";
import { GeneralExpenseFormModal } from "./GeneralExpenseFormModal";

export const AccountsPayableModule = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [payables, setPayables] = useState<AccountsPayable[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  
  // Estados dos modais
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isGeneralExpenseModalOpen, setIsGeneralExpenseModalOpen] = useState(false);
  
  // Estados para edição
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editingAccount, setEditingAccount] = useState<AccountsPayable | null>(null);
  
  // Estados para visualização
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null);
  const [viewingAccount, setViewingAccount] = useState<AccountsPayable | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      console.log("🔄 [AccountsPayable] Iniciando carregamento de dados...");
      
      const [payablesData, suppliersData] = await Promise.all([
        getAllAccountsPayable(),
        getAllSuppliers()
      ]);
      
      console.log("📊 [AccountsPayable] Dados carregados:", {
        payables: payablesData.length,
        suppliers: suppliersData.length,
        payablesDetailed: payablesData.map(p => ({
          id: p.id,
          description: p.description,
          amount: p.totalAmount,
          status: p.status
        })),
        suppliersDetailed: suppliersData.map(s => ({
          id: s.id,
          name: s.name,
          hasRecurrence: s.hasRecurrence,
          monthlyValue: s.monthlyValue,
          isActive: s.isActive
        }))
      });
      
      setPayables(payablesData);
      setSuppliers(suppliersData);
      
      // Calcular totais para debug
      const totalPayables = payablesData.reduce((sum, p) => sum + p.totalAmount, 0);
      const totalSuppliersRecurrent = suppliersData
        .filter(s => s.hasRecurrence && s.monthlyValue && s.isActive)
        .reduce((sum, s) => sum + (s.monthlyValue || 0), 0);
      
      console.log("💰 [AccountsPayable] Totais calculados:", {
        totalPayables,
        totalSuppliersRecurrent,
        grandTotal: totalPayables + totalSuppliersRecurrent
      });
      
      if (suppliersData.length > 0 || payablesData.length > 0) {
        toast.success(`✅ Dados carregados: ${payablesData.length} contas a pagar e ${suppliersData.length} fornecedores`);
      } else {
        console.log("⚠️ [AccountsPayable] Nenhum dado encontrado no Firebase");
        // toast.info("Nenhum dado encontrado. Comece criando fornecedores e contas a pagar.");
      }
    } catch (error) {
      console.error("❌ [AccountsPayable] Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados de contas a pagar");
    } finally {
      setIsLoading(false);
    }
  };

  // Handlers atualizados para os diferentes tipos de contas
  const handleNewGeneralExpense = () => {
    console.log("🏦 [AccountsPayable] Abrindo modal para nova despesa geral");
    setIsGeneralExpenseModalOpen(true);
  };

  const handleNewSupplierAccount = () => {
    console.log("🏭 [AccountsPayable] Abrindo modal para conta com fornecedor");
    if (suppliers.length === 0) {
      toast.error("Cadastre pelo menos um fornecedor antes de criar uma conta");
      return;
    }
    setIsAccountModalOpen(true);
  };

  const handleNewSupplier = () => {
    console.log("🏭 [AccountsPayable] Abrindo modal para novo fornecedor");
    setIsSupplierModalOpen(true);
  };



  const handleFilterClick = () => {
    // toast.info("Filtros avançados em desenvolvimento");
  };

  // Handlers para contas a pagar
  const handleViewAccount = (account: AccountsPayable) => {
    console.log("🔍 [AccountsPayable] Visualizando conta:", account.id);
    setViewingAccount(account);
  };

  const handleEditAccount = (account: AccountsPayable) => {
    console.log("✏️ [AccountsPayable] Editando conta:", account.id);
    setEditingAccount(account);
    setIsGeneralExpenseModalOpen(true);
  };

  const handleDeleteAccount = async (account: AccountsPayable) => {
    console.log("🗑️ [AccountsPayable] Excluindo conta:", account.id);
    if (window.confirm(`Tem certeza que deseja excluir a conta "${account.description}"?`)) {
      try {
        await deleteAccountPayable(account.id);
        toast.success("Conta excluída com sucesso");
        loadData();
      } catch (error) {
        console.error("Erro ao excluir conta:", error);
        toast.error("Erro ao excluir conta");
      }
    }
  };

  // Handlers para fornecedores
  const handleViewSupplier = (supplier: Supplier) => {
    console.log("🔍 [AccountsPayable] Visualizando fornecedor:", supplier.id);
    setViewingSupplier(supplier);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    console.log("✏️ [AccountsPayable] Editando fornecedor:", supplier.id);
    setEditingSupplier(supplier);
    setIsSupplierModalOpen(true);
  };

  const handleDeleteSupplier = async (supplier: Supplier) => {
    console.log("🗑️ [AccountsPayable] Excluindo fornecedor:", supplier.id);
    if (window.confirm(`Tem certeza que deseja excluir o fornecedor "${supplier.name}"?`)) {
      try {
        await deleteSupplier(supplier.id);
        toast.success("Fornecedor excluído com sucesso");
        loadData();
      } catch (error) {
        console.error("Erro ao excluir fornecedor:", error);
        toast.error("Erro ao excluir fornecedor");
      }
    }
  };

  // Handler para fechar modais de visualização
  const handleCloseViewModals = () => {
    setViewingAccount(null);
    setViewingSupplier(null);
  };

  // Handler atualizado para dados
  const handleDataUpdated = () => {
    setEditingSupplier(null);
    setEditingAccount(null);
    loadData();
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
      PAGO: { color: "bg-green-100 text-green-800", icon: CheckCircle },
      VENCIDO: { color: "bg-red-100 text-red-800", icon: AlertTriangle },
      CANCELADO: { color: "bg-gray-100 text-gray-800", icon: AlertTriangle }
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
    return payables
      .filter(p => p.status === status)
      .reduce((sum, p) => sum + p.totalAmount, 0);
  };

  const getCountByStatus = (status: string) => {
    return payables.filter(p => p.status === status).length;
  };

  // Função para calcular o total geral incluindo fornecedores com recorrência
  const getTotalPayables = () => {
    const payablesTotal = payables.reduce((sum, p) => sum + p.totalAmount, 0);
    const suppliersTotal = suppliers
      .filter(s => s.hasRecurrence && s.monthlyValue && s.isActive)
      .reduce((sum, s) => sum + (s.monthlyValue || 0), 0);
    return payablesTotal + suppliersTotal;
  };

  // Função para calcular o total pendente incluindo fornecedores com recorrência
  const getTotalPendingPayables = () => {
    const payablesPending = getTotalByStatus('PENDENTE');
    const suppliersPending = suppliers
      .filter(s => s.hasRecurrence && s.monthlyValue && s.isActive)
      .reduce((sum, s) => sum + (s.monthlyValue || 0), 0);
    return payablesPending + suppliersPending;
  };

  // Função para contar o total de contas (incluindo fornecedores com recorrência)
  const getTotalCount = () => {
    const payablesCount = payables.length;
    const suppliersCount = suppliers.filter(s => s.hasRecurrence && s.monthlyValue && s.isActive).length;
    return payablesCount + suppliersCount;
  };

  // Função para contar contas pendentes (incluindo fornecedores com recorrência)
  const getTotalPendingCount = () => {
    const payablesPendingCount = getCountByStatus('PENDENTE');
    const suppliersPendingCount = suppliers.filter(s => s.hasRecurrence && s.monthlyValue && s.isActive).length;
    return payablesPendingCount + suppliersPendingCount;
  };

  const filteredPayables = payables.filter(payable => 
    searchTerm === "" || 
    payable.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payable.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando contas a pagar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="accounts">Contas ({payables.length})</TabsTrigger>
          <TabsTrigger value="suppliers">Fornecedores ({suppliers.length})</TabsTrigger>
        </TabsList>

        {/* Dashboard */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Indicadores */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-800 dark:text-red-300 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Total a Pagar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                  {formatCurrency(getTotalPayables())}
                </div>
                <div className="text-sm text-red-600 dark:text-red-400 mt-1">
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
                  {formatCurrency(getTotalPendingPayables())}
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

            <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-800 dark:text-green-300 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Pagas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {formatCurrency(getTotalByStatus('PAGO'))}
                </div>
                <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                  {getCountByStatus('PAGO')} contas
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Próximos Vencimentos */}
          <Card>
            <CardHeader>
              <CardTitle>Próximos Vencimentos</CardTitle>
              <CardDescription>
                Contas com vencimento nos próximos 30 dias + Fornecedores com recorrência mensal
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(payables.filter(p => p.status === 'PENDENTE').length > 0 || 
                suppliers.filter(s => s.hasRecurrence && s.monthlyValue && s.isActive).length > 0) ? (
                <div className="space-y-3">
                  {/* Contas a Pagar Pendentes */}
                  {payables
                    .filter(p => p.status === 'PENDENTE')
                    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
                    .slice(0, 3)
                    .map((payable) => (
                      <div key={payable.id} className="flex items-center justify-between p-3 border dark:border-gray-600 rounded-lg">
                        <div>
                          <p className="font-medium dark:text-gray-100">{payable.supplierName}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{payable.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-red-600 dark:text-red-400">{formatCurrency(payable.totalAmount)}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Vence em {payable.dueDate.toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    ))}
                  
                  {/* Fornecedores com Recorrência */}
                  {suppliers
                    .filter(s => s.hasRecurrence && s.monthlyValue && s.isActive)
                    .slice(0, 3)
                    .map((supplier) => {
                      const currentDate = new Date();
                      const nextDueDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), supplier.paymentDay || 10);
                      if (nextDueDate < currentDate) {
                        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
                      }
                      
                      return (
                        <div key={supplier.id} className="flex items-center justify-between p-3 border rounded-lg bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                          <div>
                            <p className="font-medium dark:text-gray-100">{supplier.name}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{supplier.services} (Recorrente)</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-blue-600 dark:text-blue-400">{formatCurrency(supplier.monthlyValue || 0)}</p>
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
                  {suppliers.length === 0 && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Comece cadastrando fornecedores</p>
                      <Button variant="outline" onClick={() => setActiveTab("suppliers")}>
                        <Building className="w-4 h-4 mr-2" />
                        Ir para Fornecedores
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contas */}
        <TabsContent value="accounts" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Despesas Gerais da Empresa</CardTitle>
                  <CardDescription>
                    Aluguel, energia, internet, material de escritório, etc.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Buscar despesas..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Button variant="outline" onClick={handleFilterClick}>
                    <Filter className="w-4 h-4 mr-2" />
                    Filtros
                  </Button>
                  <Button size="sm" onClick={handleNewGeneralExpense}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Despesa
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredPayables.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empresa/Fornecedor</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayables.map((payable) => (
                      <TableRow key={payable.id}>
                        <TableCell className="font-medium">{payable.supplierName}</TableCell>
                        <TableCell>{payable.description}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(payable.totalAmount)}</TableCell>
                        <TableCell>{payable.dueDate.toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell>{getStatusBadge(payable.status)}</TableCell>
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewAccount(payable)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Visualizar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditAccount(payable)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteAccount(payable)}
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
              ) : (
                <div className="text-center py-12">
                  <CreditCard className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Nenhuma despesa encontrada</h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm ? "Tente ajustar os filtros de busca" 
                      : "Cadastre as despesas gerais da empresa como aluguel, energia, internet, etc."
                    }
                  </p>
                  <Button onClick={handleNewGeneralExpense}>
                    <Plus className="w-4 h-4 mr-2" />
                    Cadastrar Primeira Despesa
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fornecedores */}
        <TabsContent value="suppliers" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Fornecedores e Prestadores</CardTitle>
                  <CardDescription>
                    {suppliers.length} fornecedores cadastrados
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Buscar fornecedores..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Button onClick={handleNewSupplier}>
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Fornecedor
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {suppliers.filter(supplier => 
                searchTerm === "" || 
                supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (supplier.services && supplier.services.toLowerCase().includes(searchTerm.toLowerCase()))
              ).length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome/Razão Social</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Serviços/Produtos</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Valor Mensal</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.filter(supplier => 
                      searchTerm === "" || 
                      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (supplier.services && supplier.services.toLowerCase().includes(searchTerm.toLowerCase()))
                    ).map((supplier) => (
                      <TableRow key={supplier.id}>
                        <TableCell className="font-medium">{supplier.name}</TableCell>
                        <TableCell>
                          {supplier.cnpj && (
                            <div className="text-sm">
                              <span className="text-gray-500">CNPJ:</span><br />
                              {supplier.cnpj}
                            </div>
                          )}
                          {supplier.cpf && (
                            <div className="text-sm">
                              <span className="text-gray-500">CPF:</span><br />
                              {supplier.cpf}
                            </div>
                          )}
                          {!supplier.cnpj && !supplier.cpf && (
                            <span className="text-gray-400 text-sm">Não informado</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-48">
                            <p className="text-sm">{supplier.services || "Não informado"}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{supplier.email}</p>
                            <p className="text-gray-500">{supplier.phone}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {supplier.hasRecurrence && supplier.monthlyValue ? (
                            <div className="text-sm">
                              <p className="font-semibold text-green-600">
                                {(supplier.monthlyValue).toLocaleString('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL'
                                })}
                              </p>
                              <p className="text-gray-500">Dia {supplier.paymentDay || 1}</p>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">Sem recorrência</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={supplier.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                            {supplier.isActive ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewSupplier(supplier)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Visualizar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditSupplier(supplier)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteSupplier(supplier)}
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
              ) : (
                <div className="text-center py-12">
                  <Building className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    {searchTerm ? "Nenhum fornecedor encontrado" : "Nenhum fornecedor cadastrado"}
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm 
                      ? "Tente ajustar os filtros de busca"
                      : "Cadastre fornecedores e prestadores de serviços para gerenciar contas específicas"
                    }
                  </p>
                  {!searchTerm && (
                    <Button onClick={handleNewSupplier}>
                      <Plus className="w-4 h-4 mr-2" />
                      Cadastrar Primeiro Fornecedor
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>


      </Tabs>

      {/* Modais */}
      <SupplierFormModal 
        isOpen={isSupplierModalOpen}
        onClose={() => {
          setIsSupplierModalOpen(false);
          setEditingSupplier(null);
        }}
        onSuccess={handleDataUpdated}
        initialData={editingSupplier}
      />

      <AccountPayableFormModal 
        isOpen={isAccountModalOpen}
        onClose={() => {
          setIsAccountModalOpen(false);
          setEditingAccount(null);
        }}
        onSuccess={handleDataUpdated}
      />

      <GeneralExpenseFormModal 
        isOpen={isGeneralExpenseModalOpen}
        onClose={() => {
          setIsGeneralExpenseModalOpen(false);
          setEditingAccount(null);
        }}
        onSuccess={handleDataUpdated}
        initialData={editingAccount}
      />

      {/* Modais de Visualização */}
      {viewingAccount && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Detalhes da Conta</h2>
                <Button variant="ghost" size="sm" onClick={handleCloseViewModals}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Fornecedor</label>
                    <p className="text-base">{viewingAccount.supplierName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Valor</label>
                    <p className="text-base font-semibold">{formatCurrency(viewingAccount.totalAmount)}</p>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Descrição</label>
                  <p className="text-base">{viewingAccount.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Data de Vencimento</label>
                    <p className="text-base">{viewingAccount.dueDate.toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <div className="mt-1">{getStatusBadge(viewingAccount.status)}</div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={handleCloseViewModals}>
                  Fechar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewingSupplier && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Detalhes do Fornecedor</h2>
                <Button variant="ghost" size="sm" onClick={handleCloseViewModals}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Nome/Razão Social</label>
                    <p className="text-base font-medium">{viewingSupplier.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <div className="mt-1">
                      <Badge className={viewingSupplier.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                        {viewingSupplier.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">CNPJ</label>
                    <p className="text-base">{viewingSupplier.cnpj || "Não informado"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">CPF</label>
                    <p className="text-base">{viewingSupplier.cpf || "Não informado"}</p>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Serviços/Produtos</label>
                  <p className="text-base">{viewingSupplier.services || "Não informado"}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-base">{viewingSupplier.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Telefone</label>
                    <p className="text-base">{viewingSupplier.phone}</p>
                  </div>
                </div>
                
                {viewingSupplier.hasRecurrence && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Valor Mensal</label>
                      <p className="text-base font-semibold text-green-600">
                        {viewingSupplier.monthlyValue?.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }) || "R$ 0,00"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Dia do Pagamento</label>
                      <p className="text-base">Dia {viewingSupplier.paymentDay || 1}</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={handleCloseViewModals}>
                  Fechar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 