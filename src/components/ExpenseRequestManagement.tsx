import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Plus, 
  Eye, 
  Check, 
  X, 
  Calendar,
  DollarSign,
  ClipboardList,
  AlertCircle,
  FileText,
  Search,
  Filter,
  Download,
  Upload,
  CreditCard,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  Paperclip,
  Trash2,
  MapPin,
  Car,
  Plane,
  MoreHorizontal
} from "lucide-react";
import { toast } from "sonner";
import { auth } from "@/config/firebase";
import { ExpenseRequest, ExpenseRequestStats, ExpenseAttachment } from "@/types";
import {
  createExpenseRequest,
  getAllExpenseRequests,
  getExpenseRequestsByUser,
  approveExpenseRequest,
  rejectExpenseRequest,
  markAsPaid,
  cancelExpenseRequest,
  getExpenseRequestStats,
  testCollectionAccess,
  updateExpenseRequestAttachments
} from "@/services/expenseRequestService";
import {
  uploadExpenseAttachment,
  deleteExpenseAttachment,
  formatFileSize,
  getFileTypeIcon,
  validateFile
} from "@/services/fileUploadService";
import { format, getMonth, getYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getDoc, doc } from "firebase/firestore";
import { db } from "@/config/firebase";

export const ExpenseRequestManagement = () => {
  const [requests, setRequests] = useState<ExpenseRequest[]>([]);
  const [stats, setStats] = useState<ExpenseRequestStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ExpenseRequest | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [userFirstName, setUserFirstName] = useState<string>('');
  const [reviewComments, setReviewComments] = useState("");
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("approve");

  // Estados do formulário de nova solicitação
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    amount: 0,
    category: "Outros" as ExpenseRequest['category'],
    subcategory: "Outros" as ExpenseRequest['subcategory'],
    urgency: "Média" as ExpenseRequest['urgency'],
    justification: "",
    expectedDate: "",
    clientId: "",
    clientName: "",
    projectId: "",
    projectName: "",
    isTravel: false,
    isRecurring: false
  });

  // Estados para viagem
  const [travelData, setTravelData] = useState({
    destination: "",
    startDate: "",
    endDate: "",
    purpose: "",
    kmBefore: 0,
    kmAfter: 0,
    visitReportLink: "",
    accommodationDetails: "",
    transportDetails: ""
  });

  // Estados para recorrência
  const [recurringData, setRecurringData] = useState({
    frequency: "Mensal" as "Mensal" | "Trimestral" | "Semestral" | "Anual",
    endDate: "",
    occurrences: 0
  });

  // Estados para upload de arquivos
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedAttachments, setUploadedAttachments] = useState<ExpenseAttachment[]>([]);

  // Buscar dados do usuário
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setCurrentUser(user);
        
        try {
          // Buscar dados do usuário no Firestore - priorizar coleção unificada
          let userData = null;
          
          // Tentar buscar na coleção unificada primeiro
          const unifiedDoc = await getDoc(doc(db, "collaborators_unified", user.uid));
          if (unifiedDoc.exists()) {
            userData = unifiedDoc.data();
            console.log("🔍 ExpenseRequestManagement - Dados do usuário (unified):", userData);
          } else {
            // Fallback para coleção collaborators
            const userDoc = await getDoc(doc(db, "collaborators_unified", user.uid));
            
            if (userDoc.exists()) {
              userData = userDoc.data();
              console.log("🔍 ExpenseRequestManagement - Dados do usuário (collaborators):", userData);
            } else {
              // Se não encontrou na coleção unificada, definir dados padrão
              console.log("❌ ExpenseRequestManagement - Usuário não encontrado na coleção unificada");
            }
          }
          
          setUserRole(userData?.hierarchyLevel || "Estagiário/Auxiliar");
          setUserFirstName(userData?.firstName || '');
        } catch (error) {
          console.error("Erro ao buscar dados do usuário:", error);
          setUserRole("Colaborador");
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Carregar dados
  useEffect(() => {
    if (currentUser && userRole) {
      loadData();
    }
  }, [currentUser, userRole]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Teste básico de acesso à coleção
      await testCollectionAccess();
      
      let requestsData: ExpenseRequest[];
      let statsData: ExpenseRequestStats;

      if (userRole === "Presidente" || userRole === "Diretor de TI" || userRole === "Diretor Financeiro") {
        // Aprovadores veem todas as solicitações
        requestsData = await getAllExpenseRequests();
        statsData = await getExpenseRequestStats();
      } else {
        // Colaboradores veem apenas suas solicitações
        requestsData = await getExpenseRequestsByUser(currentUser.uid);
        statsData = await getExpenseRequestStats(currentUser.uid);
      }

      setRequests(requestsData);
      setStats(statsData);
    } catch (error) {
      console.error("❌ Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Filtros
  const filteredRequests = requests.filter(request => {
    const matchesSearch = 
      request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.protocol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.requesterName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || request.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || request.category === categoryFilter;
    const matchesUrgency = urgencyFilter === "all" || request.urgency === urgencyFilter;
    
    // Filtro por mês
    const matchesMonth = monthFilter === "all" || 
      `${getYear(request.createdAt)}-${String(getMonth(request.createdAt) + 1).padStart(2, '0')}` === monthFilter;
    
    return matchesSearch && matchesStatus && matchesCategory && matchesUrgency && matchesMonth;
  });

  // Calcular estatísticas baseadas nos dados filtrados
  const filteredStats = {
    total: filteredRequests.length,
    pending: filteredRequests.filter(r => r.status === 'Em análise').length,
    approved: filteredRequests.filter(r => r.status === 'Aprovado').length,
    rejected: filteredRequests.filter(r => r.status === 'Reprovado').length,
    cancelled: filteredRequests.filter(r => r.status === 'Cancelado').length,
    totalAmount: filteredRequests.reduce((sum, r) => sum + r.amount, 0),
    approvedAmount: filteredRequests.filter(r => r.status === 'Aprovado').reduce((sum, r) => sum + r.amount, 0)
  };

  // Gerar opções de mês baseadas nas solicitações existentes
  const getMonthOptions = () => {
    const months = new Set<string>();
    requests.forEach(request => {
      const monthKey = `${getYear(request.createdAt)}-${String(getMonth(request.createdAt) + 1).padStart(2, '0')}`;
      months.add(monthKey);
    });
    
    return Array.from(months).sort().reverse().map(monthKey => {
      const [year, month] = monthKey.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return {
        value: monthKey,
        label: format(date, 'MMMM yyyy', { locale: ptBR })
      };
    });
  };

  // Criar nova solicitação
  const handleCreateRequest = async () => {
    if (!formData.title || !formData.description || !formData.amount || !formData.expectedDate) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    // Validações específicas para viagem
    if (formData.isTravel) {
      if (!travelData.destination || !travelData.startDate || !travelData.endDate) {
        toast.error("Preencha todos os campos obrigatórios da viagem");
        return;
      }
    }

    if (!currentUser) {
      toast.error("Usuário não autenticado");
      return;
    }

    try {
      setIsUploading(true);
      
      // Preparar dados da solicitação
      const requestData: Omit<ExpenseRequest, 'id' | 'protocol' | 'createdAt' | 'updatedAt' | 'status'> = {
        ...formData,
        requesterId: currentUser.uid,
        requesterName: userFirstName || currentUser.displayName || "Usuário",
        expectedDate: new Date(formData.expectedDate),
        attachments: [] as ExpenseAttachment[]
      };

      // Adicionar dados de viagem APENAS se aplicável
      if (formData.isTravel && travelData.destination && travelData.startDate && travelData.endDate) {
        requestData.travelDetails = {
          ...travelData,
          startDate: new Date(travelData.startDate),
          endDate: new Date(travelData.endDate),
          kmTotal: travelData.kmAfter - travelData.kmBefore
        };
      }

      // Adicionar dados de recorrência APENAS se aplicável
      if (formData.isRecurring && recurringData.frequency) {
        requestData.recurringDetails = {
          ...recurringData,
          endDate: recurringData.endDate ? new Date(recurringData.endDate) : undefined
        };
      }

      // Upload de arquivos PRIMEIRO se houver
      let uploadedFiles: ExpenseAttachment[] = [];
      if (selectedFiles.length > 0) {
        toast.loading("Fazendo upload dos arquivos...");
        
        // Criar um ID temporário para os uploads
        const tempRequestId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          try {
            const attachment = await uploadExpenseAttachment(file, tempRequestId, currentUser.uid);
            uploadedFiles.push(attachment);
            setUploadProgress(((i + 1) / selectedFiles.length) * 100);
          } catch (error) {
            console.error(`Erro ao fazer upload do arquivo ${file.name}:`, error);
            toast.error(`Erro ao fazer upload do arquivo ${file.name}`);
          }
        }
        
        toast.dismiss();
      }

      // Adicionar anexos aos dados da solicitação
      requestData.attachments = uploadedFiles;

      // Criar solicitação com anexos já incluídos
      const requestId = await createExpenseRequest(requestData);
      
      toast.success(uploadedFiles.length > 0 
        ? `Solicitação criada com ${uploadedFiles.length} anexo(s)!` 
        : "Solicitação criada com sucesso!"
      );
      setIsCreateDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error("Erro ao criar solicitação:", error);
      toast.error("Erro ao criar solicitação");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Aprovar/Reprovar solicitação
  const handleReviewRequest = async (action: "approve" | "reject") => {
    if (!selectedRequest || !currentUser) return;

    try {
      const reviewerName = userFirstName || currentUser.displayName || "Gerente";

      if (action === "approve") {
        await approveExpenseRequest(
          selectedRequest.id,
          currentUser.uid,
          reviewerName,
          reviewComments
        );
        toast.success("Solicitação aprovada!");
      } else {
        if (!reviewComments.trim()) {
          toast.error("É obrigatório informar o motivo da reprovação");
          return;
        }
        await rejectExpenseRequest(
          selectedRequest.id,
          currentUser.uid,
          reviewerName,
          reviewComments
        );
        toast.success("Solicitação reprovada!");
      }

      setIsReviewDialogOpen(false);
      setReviewComments("");
      loadData();
    } catch (error) {
      console.error("Erro ao revisar solicitação:", error);
      toast.error("Erro ao revisar solicitação");
    }
  };

  // Cancelar solicitação
  const handleCancelRequest = async (requestId: string) => {
    try {
      await cancelExpenseRequest(requestId);
      toast.success("Solicitação cancelada!");
      loadData();
    } catch (error) {
      console.error("Erro ao cancelar solicitação:", error);
      toast.error("Erro ao cancelar solicitação");
    }
  };

  // Manipular seleção de arquivos
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles: File[] = [];
    
    files.forEach(file => {
      const validation = validateFile(file);
      if (validation.isValid) {
        validFiles.push(file);
      } else {
        toast.error(`${file.name}: ${validation.error}`);
      }
    });

    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  // Remover arquivo selecionado
  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Remover anexo já enviado
  const handleRemoveAttachment = async (attachment: ExpenseAttachment) => {
    try {
      await deleteExpenseAttachment(attachment, selectedRequest?.id || "", currentUser?.uid || "");
      setUploadedAttachments(prev => prev.filter(a => a.id !== attachment.id));
      toast.success("Anexo removido com sucesso!");
    } catch (error) {
      console.error("Erro ao remover anexo:", error);
      toast.error("Erro ao remover anexo");
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      amount: 0,
      category: "Outros",
      subcategory: "Outros",
      urgency: "Média",
      justification: "",
      expectedDate: "",
      clientId: "",
      clientName: "",
      projectId: "",
      projectName: "",
      isTravel: false,
      isRecurring: false
    });
    
    setTravelData({
      destination: "",
      startDate: "",
      endDate: "",
      purpose: "",
      kmBefore: 0,
      kmAfter: 0,
      visitReportLink: "",
      accommodationDetails: "",
      transportDetails: ""
    });
    
    setRecurringData({
      frequency: "Mensal",
      endDate: "",
      occurrences: 0
    });
    
    setSelectedFiles([]);
    setUploadedAttachments([]);
    setUploadProgress(0);
  };

  const getStatusBadge = (status: ExpenseRequest['status']) => {
    const statusConfig = {
      'Em análise': { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
      'Aprovado': { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 },
      'Reprovado': { color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
      'Cancelado': { color: 'bg-muted text-muted-foreground border-border', icon: Ban }
    };

    const config = statusConfig[status];
    const IconComponent = config.icon;

    return (
      <Badge variant="outline" className={`${config.color} flex items-center gap-1`}>
        <IconComponent className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  const getUrgencyBadge = (urgency: ExpenseRequest['urgency']) => {
    const urgencyConfig = {
      'Baixa': 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800',
      'Média': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Alta': 'bg-orange-100 text-orange-800 border-orange-200',
      'Urgente': 'bg-red-100 text-red-800 border-red-200'
    };

    return (
      <Badge variant="outline" className={urgencyConfig[urgency]}>
        {urgency}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando solicitações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="expense-management space-y-6">
      {/* Estatísticas - Baseadas nos filtros aplicados */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Solicitações</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredStats.total}</div>
            <p className="text-xs text-muted-foreground">
              {filteredStats.total === requests.length ? 'Total de solicitações' : 'Com filtros aplicados'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{filteredStats.pending}</div>
            <p className="text-xs text-muted-foreground">
              Aguardando análise
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprovadas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{filteredStats.approved}</div>
            <p className="text-xs text-muted-foreground">
              Prontas para pagamento
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {filteredStats.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              R$ {filteredStats.approvedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} aprovado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de solicitações */}
      <Card>
        <CardHeader>
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Solicitações de Despesas</CardTitle>
                <CardDescription className="text-sm">
                  {userRole === "Presidente" || userRole === "Diretor de TI" || userRole === "Diretor Financeiro"
                    ? "Gerencie todas as solicitações de despesas da empresa"
                    : "Visualize e gerencie suas solicitações de despesas"}
                </CardDescription>
              </div>
              
              <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-cerrado-green2 hover:bg-cerrado-green1 responsive-button">
                <Plus className="mr-2 h-4 w-4" />
                Nova Solicitação
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="responsive-card h-[600px] overflow-y-auto">
          {/* Filtros */}
          <div className="flex flex-col gap-4 mb-6">
            {/* Indicador de filtros ativos */}
            {(searchTerm || statusFilter !== "all" || categoryFilter !== "all" || urgencyFilter !== "all" || monthFilter !== "all") && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <Filter className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-800">
                  {filteredStats.total} resultado(s) encontrado(s) com os filtros aplicados
                </span>
              </div>
            )}

            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative w-full lg:w-48">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground/70 w-3.5 h-3.5 z-10" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 responsive-input h-9 text-sm"
                />
              </div>

              <div className="relative">
                <Calendar className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground/70 w-3.5 h-3.5 pointer-events-none z-10" />
                <Select value={monthFilter} onValueChange={setMonthFilter}>
                  <SelectTrigger className="w-full lg:w-40 responsive-input pl-8 h-9">
                    <SelectValue placeholder="Mês" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {getMonthOptions().map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full lg:w-36 responsive-input h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Em análise">Pendente</SelectItem>
                  <SelectItem value="Aprovado">Aprovado</SelectItem>
                  <SelectItem value="Reprovado">Rejeitado</SelectItem>
                  <SelectItem value="Cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full lg:w-32 responsive-input h-9">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="Operacional">Operacional</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Administrativo">Administrativo</SelectItem>
                  <SelectItem value="Tecnologia">Tecnologia</SelectItem>
                  <SelectItem value="Recursos Humanos">RH</SelectItem>
                  <SelectItem value="Viagem">Viagem</SelectItem>
                  <SelectItem value="Alimentação">Alimentação</SelectItem>
                  <SelectItem value="Material">Material</SelectItem>
                  <SelectItem value="Outros">Outros</SelectItem>
                </SelectContent>
              </Select>

              <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                <SelectTrigger className="w-full lg:w-28 responsive-input h-9">
                  <SelectValue placeholder="Urgência" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="Baixa">Baixa</SelectItem>
                  <SelectItem value="Média">Média</SelectItem>
                  <SelectItem value="Alta">Alta</SelectItem>
                  <SelectItem value="Urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setCategoryFilter("all");
                  setUrgencyFilter("all");
                  setMonthFilter("all");
                }}
                className="lg:w-auto responsive-button h-9 px-3"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Tabela de solicitações */}
          {filteredRequests.length > 0 ? (
            <div className="adaptive-table-container border rounded-md">
              <Table className="responsive-table">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">Protocolo</TableHead>
                    <TableHead className="text-center">Título</TableHead>
                    {(userRole === "Presidente" || userRole === "Diretor de TI" || userRole === "Diretor Financeiro") && (
                      <TableHead className="text-center">Solicitante</TableHead>
                    )}
                    <TableHead className="text-center">Categoria</TableHead>
                    <TableHead className="text-center">Valor</TableHead>
                    <TableHead className="text-center">Urgência</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Data</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-mono text-sm text-center">
                        {request.protocol}
                      </TableCell>
                      <TableCell className="font-medium text-truncate-responsive text-center">
                        {request.title}
                      </TableCell>
                      {(userRole === "Presidente" || userRole === "Diretor de TI" || userRole === "Diretor Financeiro") && (
                        <TableCell className="text-truncate-responsive text-center">{request.requesterName}</TableCell>
                      )}
                      <TableCell className="text-center">
                        <Badge variant="outline" className="responsive-badge">{request.category}</Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-green-600 text-center">
                        R$ {request.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center">
                        {getUrgencyBadge(request.urgency)}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(request.status)}
                      </TableCell>
                      <TableCell className="text-center">
                        {format(request.createdAt, "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedRequest(request);
                                setIsViewDialogOpen(true);
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Visualizar
                            </DropdownMenuItem>
                            
                            {(userRole === "Presidente" || userRole === "Diretor de TI" || userRole === "Diretor Financeiro") && request.status === "Em análise" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setReviewAction("approve");
                                    setIsReviewDialogOpen(true);
                                  }}
                                >
                                  <Check className="mr-2 h-4 w-4 text-green-600" />
                                  Aprovar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setReviewAction("reject");
                                    setIsReviewDialogOpen(true);
                                  }}
                                >
                                  <X className="mr-2 h-4 w-4 text-red-600" />
                                  Rejeitar
                                </DropdownMenuItem>
                              </>
                            )}

                            {request.requesterId === currentUser?.uid && request.status === "Em análise" && (
                              <DropdownMenuItem
                                onClick={() => handleCancelRequest(request.id)}
                              >
                                <Ban className="mr-2 h-4 w-4 text-muted-foreground" />
                                Cancelar
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-10">
              <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/60 mb-3" />
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== "all" || categoryFilter !== "all" || urgencyFilter !== "all"
                  ? "Nenhuma solicitação encontrada com os filtros aplicados."
                  : "Nenhuma solicitação encontrada."}
              </p>
              {(!searchTerm && statusFilter === "all" && categoryFilter === "all" && urgencyFilter === "all") && (
                <Button 
                  className="mt-4"
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  Criar primeira solicitação
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para criar nova solicitação */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Solicitação de Despesa</DialogTitle>
            <DialogDescription>
              Preencha os dados da despesa que precisa ser reembolsada ou paga
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Informações Básicas</TabsTrigger>
              <TabsTrigger value="travel" disabled={!formData.isTravel}>
                <MapPin className="w-4 h-4 mr-2" />
                Viagem
              </TabsTrigger>
              <TabsTrigger value="recurring" disabled={!formData.isRecurring}>
                <Calendar className="w-4 h-4 mr-2" />
                Recorrência
              </TabsTrigger>
              <TabsTrigger value="attachments">
                <Paperclip className="w-4 h-4 mr-2" />
                Anexos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Ex: Passagem aérea para reunião cliente"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Valor (R$) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva detalhadamente a despesa..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value as ExpenseRequest['category'] }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Operacional">Operacional</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                      <SelectItem value="Administrativo">Administrativo</SelectItem>
                      <SelectItem value="Tecnologia">Tecnologia</SelectItem>
                      <SelectItem value="Recursos Humanos">Recursos Humanos</SelectItem>
                      <SelectItem value="Viagem">Viagem</SelectItem>
                      <SelectItem value="Alimentação">Alimentação</SelectItem>
                      <SelectItem value="Material">Material</SelectItem>
                      <SelectItem value="Combustível">Combustível</SelectItem>
                      <SelectItem value="Hospedagem">Hospedagem</SelectItem>
                      <SelectItem value="Transporte">Transporte</SelectItem>
                      <SelectItem value="Outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subcategory">Subcategoria</Label>
                  <Select 
                    value={formData.subcategory} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, subcategory: value as ExpenseRequest['subcategory'] }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Combustível">Combustível</SelectItem>
                      <SelectItem value="Pedágio">Pedágio</SelectItem>
                      <SelectItem value="Estacionamento">Estacionamento</SelectItem>
                      <SelectItem value="Alimentação">Alimentação</SelectItem>
                      <SelectItem value="Hospedagem">Hospedagem</SelectItem>
                      <SelectItem value="Passagem Aérea">Passagem Aérea</SelectItem>
                      <SelectItem value="Passagem Terrestre">Passagem Terrestre</SelectItem>
                      <SelectItem value="Taxi/Uber">Taxi/Uber</SelectItem>
                      <SelectItem value="Material de Escritório">Material de Escritório</SelectItem>
                      <SelectItem value="Software">Software</SelectItem>
                      <SelectItem value="Hardware">Hardware</SelectItem>
                      <SelectItem value="Treinamento">Treinamento</SelectItem>
                      <SelectItem value="Evento">Evento</SelectItem>
                      <SelectItem value="Outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="urgency">Urgência</Label>
                  <Select 
                    value={formData.urgency} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, urgency: value as ExpenseRequest['urgency'] }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Baixa">Baixa</SelectItem>
                      <SelectItem value="Média">Média</SelectItem>
                      <SelectItem value="Alta">Alta</SelectItem>
                      <SelectItem value="Urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expectedDate">Data Esperada *</Label>
                  <Input
                    id="expectedDate"
                    type="date"
                    value={formData.expectedDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, expectedDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="justification">Justificativa</Label>
                <Textarea
                  id="justification"
                  value={formData.justification}
                  onChange={(e) => setFormData(prev => ({ ...prev, justification: e.target.value }))}
                  placeholder="Justifique a necessidade desta despesa..."
                  rows={3}
                />
              </div>

              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="isTravel" 
                    checked={formData.isTravel}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isTravel: !!checked }))}
                  />
                  <Label htmlFor="isTravel">Esta é uma despesa de viagem</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="isRecurring" 
                    checked={formData.isRecurring}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isRecurring: !!checked }))}
                  />
                  <Label htmlFor="isRecurring">Despesa recorrente</Label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="travel" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="destination">Destino *</Label>
                  <Input
                    id="destination"
                    value={travelData.destination}
                    onChange={(e) => setTravelData(prev => ({ ...prev, destination: e.target.value }))}
                    placeholder="Ex: São Paulo - SP"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purpose">Finalidade da Viagem</Label>
                  <Input
                    id="purpose"
                    value={travelData.purpose}
                    onChange={(e) => setTravelData(prev => ({ ...prev, purpose: e.target.value }))}
                    placeholder="Ex: Reunião com cliente"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-3">
                <div className="space-y-2">
                  <Label htmlFor="travelStartDate">Data de Saída *</Label>
                  <Input
                    id="travelStartDate"
                    type="date"
                    value={travelData.startDate}
                    onChange={(e) => setTravelData(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="travelEndDate">Data de Retorno *</Label>
                  <Input
                    id="travelEndDate"
                    type="date"
                    value={travelData.endDate}
                    onChange={(e) => setTravelData(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="kmBefore">KM Antes</Label>
                  <Input
                    id="kmBefore"
                    type="number"
                    value={travelData.kmBefore}
                    onChange={(e) => setTravelData(prev => ({ ...prev, kmBefore: Number(e.target.value) }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kmAfter">KM Depois</Label>
                  <Input
                    id="kmAfter"
                    type="number"
                    value={travelData.kmAfter}
                    onChange={(e) => setTravelData(prev => ({ ...prev, kmAfter: Number(e.target.value) }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>KM Total</Label>
                  <Input
                    value={travelData.kmAfter - travelData.kmBefore}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="visitReportLink">Link do Relatório de Visita</Label>
                <Input
                  id="visitReportLink"
                  value={travelData.visitReportLink}
                  onChange={(e) => setTravelData(prev => ({ ...prev, visitReportLink: e.target.value }))}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accommodationDetails">Detalhes da Hospedagem</Label>
                <Textarea
                  id="accommodationDetails"
                  value={travelData.accommodationDetails}
                  onChange={(e) => setTravelData(prev => ({ ...prev, accommodationDetails: e.target.value }))}
                  placeholder="Nome do hotel, endereço, etc."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="transportDetails">Detalhes do Transporte</Label>
                <Textarea
                  id="transportDetails"
                  value={travelData.transportDetails}
                  onChange={(e) => setTravelData(prev => ({ ...prev, transportDetails: e.target.value }))}
                  placeholder="Meio de transporte, companhia aérea, etc."
                  rows={2}
                />
              </div>
            </TabsContent>

            <TabsContent value="recurring" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequência</Label>
                  <Select 
                    value={recurringData.frequency} 
                    onValueChange={(value) => setRecurringData(prev => ({ ...prev, frequency: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mensal">Mensal</SelectItem>
                      <SelectItem value="Trimestral">Trimestral</SelectItem>
                      <SelectItem value="Semestral">Semestral</SelectItem>
                      <SelectItem value="Anual">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="occurrences">Número de Ocorrências (opcional)</Label>
                  <Input
                    id="occurrences"
                    type="number"
                    min="1"
                    value={recurringData.occurrences}
                    onChange={(e) => setRecurringData(prev => ({ ...prev, occurrences: Number(e.target.value) }))}
                    placeholder="Ex: 12 para um ano"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recurringEndDate">Data Final (opcional)</Label>
                <Input
                  id="recurringEndDate"
                  type="date"
                  value={recurringData.endDate}
                  onChange={(e) => setRecurringData(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </TabsContent>

            <TabsContent value="attachments" className="space-y-4">
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground/60" />
                    <div className="mt-4">
                      <Label htmlFor="file-upload" className="cursor-pointer">
                        <span className="text-cerrado-green1 hover:text-cerrado-green2">
                          Clique para selecionar arquivos
                        </span>
                        <span className="text-muted-foreground"> ou arraste aqui</span>
                      </Label>
                      <Input
                        id="file-upload"
                        type="file"
                        multiple
                        className="hidden"
                        accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx"
                        onChange={handleFileSelect}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Formatos aceitos: JPG, PNG, PDF, DOC, DOCX, XLS, XLSX (máx. 10MB cada)
                    </p>
                  </div>
                </div>

                {/* Lista de arquivos selecionados */}
                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    <Label>Arquivos Selecionados:</Label>
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getFileTypeIcon(file.type)}</span>
                          <div>
                            <p className="text-sm font-medium">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFile(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Progresso do upload */}
                {isUploading && (
                  <div className="space-y-2">
                    <Label>Progresso do Upload:</Label>
                    <Progress value={uploadProgress} />
                  </div>
                )}

                {/* Lista de anexos já enviados */}
                {uploadedAttachments.length > 0 && (
                  <div className="space-y-2">
                    <Label>Anexos Enviados:</Label>
                    {uploadedAttachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center justify-between p-2 border rounded bg-green-50">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getFileTypeIcon(attachment.type)}</span>
                          <div>
                            <p className="text-sm font-medium">{attachment.name}</p>
                            <p className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAttachment(attachment)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateRequest} disabled={isUploading}>
              {isUploading ? "Enviando..." : "Criar Solicitação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para visualizar solicitação */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Detalhes da Solicitação
            </DialogTitle>
            <DialogDescription>
              Informações completas da solicitação de despesa para análise
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Informações Gerais</TabsTrigger>
                <TabsTrigger value="details">Detalhes Específicos</TabsTrigger>
                <TabsTrigger value="attachments">
                  <Paperclip className="w-4 h-4 mr-2" />
                  Anexos ({selectedRequest.attachments?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="history">Histórico</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                {/* Cabeçalho com informações principais */}
                <div className="bg-muted/30 p-4 rounded-lg border">
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Protocolo</Label>
                      <p className="font-mono font-bold text-lg">{selectedRequest.protocol}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                      <div className="mt-1">
                        {getStatusBadge(selectedRequest.status)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Valor Total</Label>
                      <p className="text-2xl font-bold text-green-600">
                        R$ {selectedRequest.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="text-right">
                      <Label className="text-sm font-medium text-muted-foreground">Urgência</Label>
                      <div className="mt-1">
                        {getUrgencyBadge(selectedRequest.urgency)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Informações da solicitação */}
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Título</Label>
                    <p className="font-medium text-lg">{selectedRequest.title}</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Descrição Detalhada</Label>
                    <p className="text-sm bg-card p-3 rounded border min-h-[60px]">{selectedRequest.description}</p>
                  </div>
                </div>

                {/* Categorização */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Categoria</Label>
                    <Badge variant="outline" className="mt-1 block w-fit">{selectedRequest.category}</Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Subcategoria</Label>
                    <Badge variant="outline" className="mt-1 block w-fit">{selectedRequest.subcategory}</Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Data Esperada</Label>
                    <p className="font-medium">{format(selectedRequest.expectedDate, 'dd/MM/yyyy', { locale: ptBR })}</p>
                  </div>
                </div>

                {/* Informações do solicitante */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Solicitado por</Label>
                    <p className="font-medium">{selectedRequest.requesterName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Data da Solicitação</Label>
                    <p>{format(selectedRequest.createdAt, 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
                  </div>
                </div>

                {/* Justificativa */}
                {selectedRequest.justification && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Justificativa Empresarial</Label>
                    <p className="text-sm bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded border border-yellow-200 dark:border-yellow-800">{selectedRequest.justification}</p>
                  </div>
                )}

                {/* Informações de projeto/cliente se existirem */}
                {(selectedRequest.clientName || selectedRequest.projectName) && (
                  <div className="grid grid-cols-2 gap-4">
                    {selectedRequest.clientName && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Cliente</Label>
                        <p className="font-medium">{selectedRequest.clientName}</p>
                      </div>
                    )}
                    {selectedRequest.projectName && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Projeto</Label>
                        <p className="font-medium">{selectedRequest.projectName}</p>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="details" className="space-y-4 mt-4">
                {/* Detalhes de Viagem */}
                {selectedRequest.travelDetails ? (
                  <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Plane className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <h3 className="font-semibold text-blue-800 dark:text-blue-200">Detalhes da Viagem</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Destino</Label>
                        <p className="font-medium">{selectedRequest.travelDetails.destination}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Finalidade</Label>
                        <p>{selectedRequest.travelDetails.purpose || "Não informado"}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Data de Saída</Label>
                        <p className="font-medium">{format(selectedRequest.travelDetails.startDate, 'dd/MM/yyyy', { locale: ptBR })}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Data de Retorno</Label>
                        <p className="font-medium">{format(selectedRequest.travelDetails.endDate, 'dd/MM/yyyy', { locale: ptBR })}</p>
                      </div>
                    </div>

                    {/* Informações de KM */}
                    {(selectedRequest.travelDetails.kmBefore || selectedRequest.travelDetails.kmAfter) && (
                      <div className="grid grid-cols-3 gap-4 mt-3">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">KM Inicial</Label>
                          <p className="font-mono">{selectedRequest.travelDetails.kmBefore?.toLocaleString() || "0"}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">KM Final</Label>
                          <p className="font-mono">{selectedRequest.travelDetails.kmAfter?.toLocaleString() || "0"}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Total de KM</Label>
                          <p className="font-mono font-bold text-blue-600 dark:text-blue-400">
                            {selectedRequest.travelDetails.kmTotal?.toLocaleString() || 
                             ((selectedRequest.travelDetails.kmAfter || 0) - (selectedRequest.travelDetails.kmBefore || 0)).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Detalhes adicionais */}
                    {selectedRequest.travelDetails.accommodationDetails && (
                      <div className="mt-3">
                        <Label className="text-sm font-medium text-muted-foreground">Hospedagem</Label>
                        <p className="text-sm bg-card p-2 rounded border">{selectedRequest.travelDetails.accommodationDetails}</p>
                      </div>
                    )}

                    {selectedRequest.travelDetails.transportDetails && (
                      <div className="mt-3">
                        <Label className="text-sm font-medium text-muted-foreground">Transporte</Label>
                        <p className="text-sm bg-card p-2 rounded border">{selectedRequest.travelDetails.transportDetails}</p>
                      </div>
                    )}

                    {selectedRequest.travelDetails.visitReportLink && (
                      <div className="mt-3">
                        <Label className="text-sm font-medium text-muted-foreground">Relatório de Visita</Label>
                        <a 
                          href={selectedRequest.travelDetails.visitReportLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline block"
                        >
                          {selectedRequest.travelDetails.visitReportLink}
                        </a>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Detalhes de Recorrência */}
                {selectedRequest.recurringDetails ? (
                  <div className="border rounded-lg p-4 bg-purple-50 dark:bg-purple-900/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      <h3 className="font-semibold text-purple-800 dark:text-purple-200">Despesa Recorrente</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Frequência</Label>
                        <Badge variant="outline" className="mt-1 block w-fit bg-purple-100 dark:bg-purple-900/30">
                          {selectedRequest.recurringDetails.frequency}
                        </Badge>
                      </div>
                      {selectedRequest.recurringDetails.occurrences && (
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Número de Ocorrências</Label>
                          <p className="font-medium">{selectedRequest.recurringDetails.occurrences}</p>
                        </div>
                      )}
                    </div>

                    {selectedRequest.recurringDetails.endDate && (
                      <div className="mt-3">
                        <Label className="text-sm font-medium text-muted-foreground">Data Final</Label>
                        <p className="font-medium">{format(selectedRequest.recurringDetails.endDate, 'dd/MM/yyyy', { locale: ptBR })}</p>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Caso não haja detalhes específicos */}
                {!selectedRequest.travelDetails && !selectedRequest.recurringDetails && (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/60" />
                    <p>Esta solicitação não possui detalhes específicos de viagem ou recorrência.</p>
                    <p className="text-sm">Trata-se de uma despesa comum do tipo "{selectedRequest.category}".</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="attachments" className="space-y-4 mt-4">
                {selectedRequest.attachments && selectedRequest.attachments.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-4">
                      <Paperclip className="w-5 h-5 text-green-600" />
                      <h3 className="font-semibold">Comprovantes e Documentos Anexados</h3>
                      <Badge variant="outline">{selectedRequest.attachments.length} arquivo(s)</Badge>
                    </div>
                    
                    {selectedRequest.attachments.map((attachment, index) => (
                      <div key={attachment.id || index} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/50 dark:hover:bg-muted/20 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getFileTypeIcon(attachment.type)}</span>
                          <div>
                            <p className="font-medium">{attachment.name}</p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{formatFileSize(attachment.size)}</span>
                              <span>Enviado em: {
                                attachment.uploadedAt && attachment.uploadedAt instanceof Date && !isNaN(attachment.uploadedAt.getTime()) 
                                  ? format(attachment.uploadedAt, 'dd/MM/yyyy HH:mm', { locale: ptBR })
                                  : "Data não disponível"
                              }</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(attachment.url, '_blank')}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Visualizar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = attachment.url;
                              link.download = attachment.name;
                              link.click();
                            }}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Baixar
                          </Button>
                        </div>
                      </div>
                    ))}

                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Importante para Análise:</p>
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            Verifique todos os comprovantes antes da aprovação. Confirme se os valores, datas e 
                            fornecedores estão de acordo com a política de despesas da empresa.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Paperclip className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="font-medium text-lg mb-2">Nenhum Anexo Encontrado</h3>
                    <p className="text-sm">Esta solicitação não possui comprovantes anexados.</p>
                    <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        ⚠️ <strong>Atenção:</strong> Verifique se comprovantes são necessários para este tipo de despesa antes da aprovação.
                      </p>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history" className="space-y-4 mt-4">
                <div className="space-y-4">
                  {/* Linha do tempo da solicitação */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                      <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                      <div className="flex-1">
                        <p className="font-medium">Solicitação Criada</p>
                        <p className="text-sm text-muted-foreground">
                          Por {selectedRequest.requesterName} em {format(selectedRequest.createdAt, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </p>
                      </div>
                    </div>

                    {selectedRequest.updatedAt && selectedRequest.updatedAt.getTime() !== selectedRequest.createdAt.getTime() && (
                      <div className="flex items-center gap-3 p-3 bg-muted/30 rounded border">
                        <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                        <div className="flex-1">
                          <p className="font-medium">Última Atualização</p>
                          <p className="text-sm text-muted-foreground">
                            Em {format(selectedRequest.updatedAt, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedRequest.reviewedAt && (
                      <div className={`flex items-center gap-3 p-3 rounded border ${
                        selectedRequest.status === 'Aprovado' 
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                          : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                      }`}>
                        <div className={`w-3 h-3 rounded-full ${
                          selectedRequest.status === 'Aprovado' ? 'bg-green-600' : 'bg-red-600'
                        }`}></div>
                        <div className="flex-1">
                          <p className="font-medium">
                            {selectedRequest.status === 'Aprovado' ? 'Aprovado' : 'Reprovado'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Por {selectedRequest.reviewedByName} em {format(selectedRequest.reviewedAt, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedRequest.paidAt && (
                      <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded border border-purple-200 dark:border-purple-800">
                        <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
                        <div className="flex-1">
                          <p className="font-medium">Pagamento Efetuado</p>
                          <p className="text-sm text-muted-foreground">
                            Por {selectedRequest.paidByName} em {format(selectedRequest.paidAt, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </p>
                          {selectedRequest.paymentMethod && (
                            <p className="text-sm text-purple-700 dark:text-purple-300">
                              Método: {selectedRequest.paymentMethod}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Comentários da revisão */}
                  {selectedRequest.reviewComments && (
                    <div className="mt-6">
                      <Label className="text-sm font-medium text-muted-foreground">Comentários da Análise</Label>
                      <div className="mt-2 p-4 bg-muted/30 rounded border">
                        <p className="text-sm whitespace-pre-wrap">{selectedRequest.reviewComments}</p>
                        {selectedRequest.reviewedByName && selectedRequest.reviewedAt && (
                          <div className="mt-3 pt-3 border-t border-border">
                            <p className="text-xs text-muted-foreground">
                              <strong>{selectedRequest.reviewedByName}</strong> • {format(selectedRequest.reviewedAt, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter className="flex gap-2">
            {(userRole === "Presidente" || userRole === "Diretor de TI" || userRole === "Diretor Financeiro") && selectedRequest?.status === "Em análise" && (
              <>
                <Button
                  onClick={() => {
                    setReviewAction("approve");
                    setIsReviewDialogOpen(true);
                    setIsViewDialogOpen(false);
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Aprovar
                </Button>
                <Button
                  onClick={() => {
                    setReviewAction("reject");
                    setIsReviewDialogOpen(true);
                    setIsViewDialogOpen(false);
                  }}
                  variant="destructive"
                >
                  <X className="w-4 h-4 mr-2" />
                  Reprovar
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para aprovar/reprovar */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {reviewAction === "approve" ? "Aprovar Solicitação" : "Reprovar Solicitação"}
            </DialogTitle>
            <DialogDescription>
              {reviewAction === "approve" 
                ? "Confirme a aprovação desta solicitação de despesa"
                : "Informe o motivo da reprovação desta solicitação"
              }
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="font-medium">{selectedRequest.title}</p>
                <p className="text-sm text-muted-foreground">{selectedRequest.protocol}</p>
                <p className="text-lg font-semibold text-green-600 mt-1">
                  R$ {selectedRequest.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reviewComments">
                  {reviewAction === "approve" ? "Comentários (opcional)" : "Motivo da reprovação *"}
                </Label>
                <Textarea
                  id="reviewComments"
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  placeholder={reviewAction === "approve" 
                    ? "Adicione comentários sobre a aprovação..."
                    : "Explique o motivo da reprovação..."
                  }
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => handleReviewRequest(reviewAction)}
              className={reviewAction === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
            >
              {reviewAction === "approve" ? "Aprovar" : "Reprovar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}; 