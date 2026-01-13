import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { auth, db } from '@/config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  Clock, 
  User, 
  Calendar, 
  Building, 
  ArrowRight, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Send,
  FileSignature,
  Activity,
  Timer,
  Paperclip,
  FileText
} from 'lucide-react';
import { 
  TaskProcess, 
  ProcessStep, 
  ProcessStepStatus, 
  ProcessMetrics,
  Collaborator 
} from '@/types';
import { 
  getTaskProcess, 
  forwardTask, 
  signTask, 
  rejectTask, 
  calculateProcessMetrics,
  initializeTaskProcess 
} from '@/services/processService';
import { getCollaborators } from '@/services/collaboratorService';
import { encryptPassword, verifyPassword } from '@/utils/cryptoUtils';
import RichTextEditor from './RichTextEditor';
import RichTextViewer from './RichTextViewer';
import FileUploader from './FileUploader';
import { 
  uploadMultipleProcessAttachments, 
  convertFileUploadsToFiles,
  ProcessAttachment 
} from '@/services/processAttachmentService';

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate?: any;
  assignedTo?: string;
  assignedToName?: string;
  createdBy?: string;
  createdByName?: string;
  clientId?: string;
  clientName?: string;
  createdAt?: any;
  updatedAt?: any;
}

interface TaskProcessDialogProps {
  task: Task | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TaskProcessDialog({ task, isOpen, onOpenChange }: TaskProcessDialogProps) {
  const [taskProcess, setTaskProcess] = useState<TaskProcess | null>(null);
  const [processMetrics, setProcessMetrics] = useState<ProcessMetrics | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userHierarchyLevel, setUserHierarchyLevel] = useState<string | null>(null);
  
  // Estados para movimentação de tarefa
  const [isForwardDialogOpen, setIsForwardDialogOpen] = useState(false);
  const [selectedCollaborator, setSelectedCollaborator] = useState<string>('');
  const [forwardRichNotes, setForwardRichNotes] = useState('');
  const [forwardFiles, setForwardFiles] = useState<any[]>([]);
  
  // Estados para assinatura/rejeição
  const [isSignDialogOpen, setIsSignDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [signRichNotes, setSignRichNotes] = useState('');
  const [signFiles, setSignFiles] = useState<any[]>([]);
  const [rejectRichReason, setRejectRichReason] = useState('');
  const [rejectFiles, setRejectFiles] = useState<any[]>([]);
  
  // Estados para senha de assinatura
  const [signaturePassword, setSignaturePassword] = useState('');
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [isRegisteringPassword, setIsRegisteringPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Estados para dialog de despacho
  const [isDispatchDialogOpen, setIsDispatchDialogOpen] = useState(false);
  const [selectedStep, setSelectedStep] = useState<ProcessStep | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      
      // Buscar hierarquia do usuário
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'collaborators_unified', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserHierarchyLevel(userData.hierarchyLevel || null);
          }
        } catch (error) {
          console.error('Erro ao buscar hierarquia do usuário:', error);
        }
      } else {
        setUserHierarchyLevel(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchCollaborators = async () => {
      try {
        const collaboratorsList = await getCollaborators();
        setCollaborators(collaboratorsList);
        
        console.log('👥 DEBUG - Colaboradores carregados:', collaboratorsList.length);
        collaboratorsList.forEach(collab => {
          console.log(`  - ${collab.firstName} ${collab.lastName} (${collab.email || 'SEM EMAIL'}) - ${collab.hierarchyLevel}`);
        });
      } catch (error) {
        console.error('Erro ao buscar colaboradores:', error);
      }
    };

    if (isOpen) {
      fetchCollaborators();
    }
  }, [isOpen]);

  useEffect(() => {
    const fetchTaskProcess = async () => {
      if (!task || !isOpen) return;

      setLoading(true);
      try {
        let process = await getTaskProcess(task.id);
        
        // Se não existe processo, inicializar um novo
        if (!process && task.assignedTo) {
          await initializeTaskProcess(task.id, task.assignedTo, task.assignedToName || 'Responsável');
          process = await getTaskProcess(task.id);
        } else if (!process && !task.assignedTo) {
          console.warn('Tarefa sem responsável definido, não é possível inicializar processo');
        }
        
        setTaskProcess(process);
        
        // Calcular métricas
        if (process) {
          const metrics = await calculateProcessMetrics(task.id);
          setProcessMetrics(metrics);
        }
      } catch (error) {
        console.error('Erro ao buscar processo da tarefa:', error);
        toast.error('Erro ao carregar dados do processo');
      } finally {
        setLoading(false);
      }
    };

    fetchTaskProcess();
  }, [task, isOpen]);

  const getStatusConfig = (status: ProcessStepStatus) => {
    switch (status) {
      case ProcessStepStatus.EmAnalise:
        return {
          label: 'Em Análise',
          color: 'bg-blue-100 text-blue-800',
          icon: <Clock className="w-4 h-4" />
        };
      case ProcessStepStatus.EmTransito:
        return {
          label: 'Em Trânsito',
          color: 'bg-yellow-100 text-yellow-800',
          icon: <ArrowRight className="w-4 h-4" />
        };
      case ProcessStepStatus.Assinado:
        return {
          label: 'Assinado',
          color: 'bg-green-100 text-green-800',
          icon: <CheckCircle2 className="w-4 h-4" />
        };
      case ProcessStepStatus.Rejeitado:
        return {
          label: 'Rejeitado',
          color: 'bg-red-100 text-red-800',
          icon: <XCircle className="w-4 h-4" />
        };
      default:
        return {
          label: status,
          color: 'bg-gray-100 text-gray-800',
          icon: <AlertCircle className="w-4 h-4" />
        };
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'Não definida';
    
    try {
      if (date.toDate) {
        return format(date.toDate(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
      }
      if (typeof date === 'string') {
        return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
      }
      if (date instanceof Date) {
        return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
      }
    } catch (error) {
      console.error('Erro ao formatar data:', error);
    }
    
    return 'Data inválida';
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}min`;
  };

  // Função removida: convertHtmlToText - não estava sendo usada

  const openDispatchDialog = (step: ProcessStep) => {
    setSelectedStep(step);
    setIsDispatchDialogOpen(true);
  };

  const getCurrentUserStep = () => {
    if (!taskProcess || !currentUser) return null;
    
    const currentStep = taskProcess.steps.find(step => 
      step.isActive && 
      step.toUserId === currentUser.uid
    );
    
    return currentStep;
  };

  const canUserTramitar = () => {
    // Cliente Externo não pode tramitar tarefas
    if (userHierarchyLevel === "Cliente Externo") return false;
    
    if (!taskProcess || !currentUser) return false;
    
    const currentStep = getCurrentUserStep();
    return currentStep && currentStep.status === ProcessStepStatus.EmAnalise;
  };

  const canUserAssinar = () => {
    // Cliente Externo não pode assinar tarefas
    if (userHierarchyLevel === "Cliente Externo") return false;
    
    if (!taskProcess || !currentUser) return false;
    
    const currentStep = getCurrentUserStep();
    return currentStep && currentStep.status === ProcessStepStatus.EmTransito;
  };

  const canUserRejeitar = () => {
    // Cliente Externo não pode rejeitar tarefas
    if (userHierarchyLevel === "Cliente Externo") return false;
    
    if (!taskProcess || !currentUser) return false;
    
    const currentStep = getCurrentUserStep();
    return currentStep && currentStep.status === ProcessStepStatus.EmTransito;
  };

  const handleForward = async () => {
    if (!task || !currentUser || !selectedCollaborator) return;

    try {
      const selectedCollab = collaborators.find(c => c.uid === selectedCollaborator);
      if (!selectedCollab) return;

      console.log('🔍 DEBUG - Colaborador selecionado:', {
        uid: selectedCollab.uid,
        name: `${selectedCollab.firstName} ${selectedCollab.lastName}`,
        email: selectedCollab.email,
        hierarchyLevel: selectedCollab.hierarchyLevel
      });

      // Validar se o email existe
      if (!selectedCollab.email) {
        toast.error('O colaborador selecionado não possui email cadastrado!');
        console.error('❌ Colaborador sem email:', selectedCollab);
        return;
      }

      // Upload de arquivos se houver
      let uploadedAttachments: ProcessAttachment[] = [];
      if (forwardFiles && forwardFiles.length > 0) {
        toast.info('Fazendo upload dos anexos...');
        const files = convertFileUploadsToFiles(forwardFiles);
        const tempStepId = `temp_${Date.now()}`; // ID temporário para organizar os arquivos
        
        uploadedAttachments = await uploadMultipleProcessAttachments(
          files,
          task.id,
          tempStepId,
          currentUser.uid,
          currentUser.displayName || currentUser.email || 'Usuário'
        );
      }

      console.log('📨 Dados que serão enviados para forwardTask:', {
        taskId: task.id,
        fromUserId: currentUser.uid,
        fromUserName: currentUser.displayName || currentUser.email,
        toUserId: selectedCollab.uid,
        toUserName: selectedCollab.firstName,
        toUserEmail: selectedCollab.email,
        richNotes: forwardRichNotes || ''
      });

      await forwardTask(
        task.id,
        currentUser.uid,
        currentUser.displayName || currentUser.email,
        selectedCollab.uid,
        selectedCollab.firstName,
        selectedCollab.email,
        forwardRichNotes || '', // Rich HTML content
        uploadedAttachments // Anexos já processados
      );

      // Recarregar processo
      const updatedProcess = await getTaskProcess(task.id);
      setTaskProcess(updatedProcess);
      
      // Limpar estados
      setIsForwardDialogOpen(false);
      setSelectedCollaborator('');
      setForwardRichNotes('');
      setForwardFiles([]);
    } catch (error: any) {
      console.error('Erro ao mover tarefa:', error);
      toast.error(error.message || 'Erro ao mover tarefa');
    }
  };

  const checkUserHasSignaturePassword = async () => {
    if (!currentUser) return false;
    
    try {
      // Verificar se o usuário tem senha de assinatura registrada na coleção unificada
      const userDoc = await getDoc(doc(db, 'collaborators_unified', currentUser.uid));
      return userDoc.exists() && userDoc.data()?.signaturePassword;
    } catch (error) {
      console.error('Erro ao verificar senha de assinatura:', error);
      return false;
    }
  };

  const verifySignaturePassword = async (password: string) => {
    if (!currentUser) return false;
    
    try {
      const userDoc = await getDoc(doc(db, 'collaborators_unified', currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.signaturePassword) {
          // Usar verificação criptografada
          return await verifyPassword(password, userData.signaturePassword);
        }
      }
      return false;
    } catch (error) {
      console.error('Erro ao verificar senha:', error);
      return false;
    }
  };

  const registerSignaturePassword = async (password: string) => {
    if (!currentUser) return false;
    
    try {
      // Criptografar a senha antes de salvar
      const encryptedPassword = await encryptPassword(password);
      
      await updateDoc(doc(db, 'collaborators_unified', currentUser.uid), {
        signaturePassword: encryptedPassword, // Senha criptografada
        signaturePasswordCreatedAt: new Date()
      });
      return true;
    } catch (error) {
      console.error('Erro ao registrar senha:', error);
      return false;
    }
  };

  const initiateSignProcess = async () => {
    const hasPassword = await checkUserHasSignaturePassword();
    
    if (!hasPassword) {
      toast.error('Você precisa registrar uma senha de assinatura antes de assinar documentos');
      setIsRegisteringPassword(true);
      setShowPasswordDialog(true);
    } else {
      setIsRegisteringPassword(false);
      setShowPasswordDialog(true);
    }
  };

  const handlePasswordConfirm = async () => {
    if (isRegisteringPassword) {
      // Registrar nova senha
      if (newPassword !== confirmPassword) {
        toast.error('As senhas não conferem');
        return;
      }
      
      if (newPassword.length < 6) {
        toast.error('A senha deve ter pelo menos 6 caracteres');
        return;
      }
      
      const success = await registerSignaturePassword(newPassword);
      if (success) {
        toast.success('Senha de assinatura registrada com sucesso!');
        setShowPasswordDialog(false);
        setNewPassword('');
        setConfirmPassword('');
        // Continuar com assinatura
        handleSign();
      } else {
        toast.error('Erro ao registrar senha');
      }
    } else {
      // Verificar senha existente
      const isValid = await verifySignaturePassword(signaturePassword);
      if (isValid) {
        setShowPasswordDialog(false);
        setSignaturePassword('');
        handleSign();
      } else {
        toast.error('Senha incorreta');
      }
    }
  };

  const handleSign = async () => {
    if (!task || !currentUser) return;

    try {
      // Upload de arquivos se houver
      let uploadedAttachments: ProcessAttachment[] = [];
      if (signFiles && signFiles.length > 0) {
        toast.info('Fazendo upload dos anexos...');
        const files = convertFileUploadsToFiles(signFiles);
        const tempStepId = `sign_${Date.now()}`; // ID temporário para organizar os arquivos
        
        uploadedAttachments = await uploadMultipleProcessAttachments(
          files,
          task.id,
          tempStepId,
          currentUser.uid,
          currentUser.displayName || currentUser.email || 'Usuário'
        );
      }

      await signTask(task.id, currentUser.uid, signRichNotes || '', uploadedAttachments);
      
      // Recarregar processo
      const updatedProcess = await getTaskProcess(task.id);
      setTaskProcess(updatedProcess);
      
      setIsSignDialogOpen(false);
      setSignRichNotes('');
      setSignFiles([]);
      
      toast.success('Tarefa assinada com sucesso!');
    } catch (error: any) {
      console.error('Erro ao assinar tarefa:', error);
      toast.error(error.message || 'Erro ao assinar tarefa');
    }
  };

  const handleReject = async () => {
    if (!task || !currentUser || (!rejectRichReason.trim())) return;

    try {
      await rejectTask(task.id, currentUser.uid, rejectRichReason);
      
      // Recarregar processo
      const updatedProcess = await getTaskProcess(task.id);
      setTaskProcess(updatedProcess);
      
      setIsRejectDialogOpen(false);
      setRejectRichReason('');
      setRejectFiles([]);
    } catch (error: any) {
      console.error('Erro ao rejeitar tarefa:', error);
      toast.error(error.message || 'Erro ao rejeitar tarefa');
    }
  };

  if (!task) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="w-[90vw] max-w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Detalhes da Tarefa</DialogTitle>
            <DialogDescription>
              Visualização completa da tarefa e histórico de trâmites
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Alert para ação necessária */}
            {(canUserTramitar() || canUserAssinar() || canUserRejeitar()) && (
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <h3 className="font-medium text-blue-800 dark:text-blue-200">
                      Ações Disponíveis
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      {canUserTramitar() && "Você pode tramitar esta tarefa para outro responsável."}
                      {canUserAssinar() && "Você pode assinar para confirmar o recebimento desta tarefa."}
                      {canUserRejeitar() && "Você pode rejeitar esta tarefa com justificativa."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Informações da Tarefa */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{task.title}</span>
                  <div className="flex gap-2">
                    <Badge variant="outline">
                      {task.status}
                    </Badge>
                    <Badge variant="outline">
                      {task.priority}
                    </Badge>
                  </div>
                </CardTitle>
                <CardDescription>
                  ID: {task.id}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Descrição</h4>
                    <p className="text-muted-foreground">{task.description || 'Sem descrição'}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span className="text-sm">Responsável: {task.assignedToName || 'Não atribuído'}</span>
                    </div>
                    {task.clientName && (
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4" />
                        <span className="text-sm">Cliente: {task.clientName}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">Prazo: {formatDate(task.dueDate)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ações do Usuário */}
            {(canUserTramitar() || canUserAssinar() || canUserRejeitar()) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Ações Disponíveis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 flex-wrap">
                    {canUserTramitar() && (
                      <Button 
                        onClick={() => setIsForwardDialogOpen(true)}
                        className="gap-2"
                        size="lg"
                      >
                        <Send className="w-4 h-4" />
                        Tramitar
                      </Button>
                    )}
                    {canUserAssinar() && (
                      <Button 
                        onClick={initiateSignProcess}
                        variant="outline"
                        className="gap-2"
                        size="lg"
                      >
                        <FileSignature className="w-4 h-4" />
                        Assinar
                      </Button>
                    )}
                    {canUserRejeitar() && (
                      <Button 
                        onClick={() => setIsRejectDialogOpen(true)}
                        variant="destructive"
                        className="gap-2"
                        size="lg"
                      >
                        <XCircle className="w-4 h-4" />
                        Rejeitar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Histórico de Trâmites */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Timer className="w-5 h-5" />
                  Histórico de Trâmites
                </CardTitle>
                <CardDescription>
                  Acompanhe todo o fluxo da tarefa através dos responsáveis
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : taskProcess && taskProcess.steps.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[60px] text-center">#</TableHead>
                          <TableHead className="min-w-[120px] text-center">De</TableHead>
                          <TableHead className="min-w-[120px] text-center">Para</TableHead>
                          <TableHead className="min-w-[140px] text-center">Status</TableHead>
                          <TableHead className="min-w-[180px] text-center">Data/Hora</TableHead>
                          <TableHead className="min-w-[100px] text-center">Tempo</TableHead>
                          <TableHead className="min-w-[120px] text-center">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {taskProcess.steps.map((step, index) => {
                          const statusConfig = getStatusConfig(step.status);
                          const isCurrentStep = step.isActive;
                          return (
                            <TableRow 
                              key={step.id}
                              className={isCurrentStep ? 'bg-blue-50 dark:bg-blue-950/20' : ''}
                            >
                              <TableCell className="text-center font-bold text-sm">
                                <div className="flex items-center justify-center">
                                  <span className="bg-gray-100 dark:bg-gray-700 rounded-full w-6 h-6 flex items-center justify-center text-xs">
                                    {index + 1}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="font-medium text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <User className="w-4 h-4 text-gray-500" />
                                  <span className="truncate">{step.fromUserName.split(' ')[0]}</span>
                                </div>
                              </TableCell>
                              <TableCell className="font-medium text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <User className="w-4 h-4 text-blue-500" />
                                  <span className="truncate">{step.toUserName.split(' ')[0]}</span>
                                  {isCurrentStep && (
                                    <Badge variant="secondary" className="text-xs ml-1 animate-pulse">
                                      Atual
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge className={statusConfig.color}>
                                  {statusConfig.icon}
                                  <span className="ml-1">{statusConfig.label}</span>
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-gray-400" />
                                    <span className="text-xs">{formatDate(step.createdAt)}</span>
                                  </div>
                                  {step.signedAt && (
                                    <div className="flex items-center gap-1 text-green-600">
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span className="text-xs">Assinado: {formatDate(step.signedAt)}</span>
                                    </div>
                                  )}
                                  {step.rejectedAt && (
                                    <div className="flex items-center gap-1 text-red-600">
                                      <XCircle className="w-3 h-3" />
                                      <span className="text-xs">Rejeitado: {formatDate(step.rejectedAt)}</span>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <Clock className="w-4 h-4 text-gray-400" />
                                  <span className="font-mono text-sm">
                                    {step.timeInAnalysis ? formatDuration(step.timeInAnalysis) : (
                                      isCurrentStep ? (
                                        <span className="text-blue-600 animate-pulse">Em andamento...</span>
                                      ) : '-'
                                    )}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                {(step.notes || step.richNotes) ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openDispatchDialog(step)}
                                    className="gap-2"
                                  >
                                    <FileText className="w-3 h-3" />
                                    Ver despacho
                                  </Button>
                                ) : (
                                  <span className="text-gray-400 italic text-sm">Sem despacho</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Timer className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-lg font-medium text-muted-foreground mb-2">
                      Nenhum trâmite registrado
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Esta tarefa ainda não possui histórico de movimentações.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Métricas do Processo */}
            {processMetrics && (
              <Card>
                <CardHeader>
                  <CardTitle>Métricas do Processo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatDuration(processMetrics.totalProcessTime)}
                      </div>
                      <div className="text-sm text-muted-foreground">Tempo Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {formatDuration(processMetrics.averageStepTime)}
                      </div>
                      <div className="text-sm text-muted-foreground">Tempo Médio por Etapa</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {taskProcess?.totalSteps || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Total de Etapas</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para Tramitar Tarefa */}
      <AlertDialog open={isForwardDialogOpen} onOpenChange={setIsForwardDialogOpen}>
        <AlertDialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Tramitar Tarefa</AlertDialogTitle>
            <AlertDialogDescription>
              Transfira a responsabilidade desta tarefa para outro colaborador.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-6">
            <div>
              <Label htmlFor="collaborator">Novo Responsável</Label>
              <Select value={selectedCollaborator} onValueChange={setSelectedCollaborator}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um colaborador" />
                </SelectTrigger>
                <SelectContent>
                  {collaborators
                    .map(collaborator => (
                      <SelectItem key={collaborator.uid} value={collaborator.uid}>
                        {collaborator.firstName} - {collaborator.hierarchyLevel}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Despacho e Instruções</Label>
              <RichTextEditor
                content={forwardRichNotes}
                onChange={setForwardRichNotes}
                placeholder="Digite o despacho com instruções detalhadas para o novo responsável..."
                className="mt-2"
              />
            </div>
            
            <div>
              <Label className="flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Anexar Documentos
              </Label>
              <FileUploader
                files={forwardFiles}
                onFilesChange={setForwardFiles}
                maxFiles={5}
                maxSize={10}
                className="mt-2"
              />
            </div>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleForward}
              disabled={!selectedCollaborator}
            >
              Tramitar Tarefa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog para Assinar Tarefa */}
      <AlertDialog open={isSignDialogOpen} onOpenChange={setIsSignDialogOpen}>
        <AlertDialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Assinar Tarefa</AlertDialogTitle>
            <AlertDialogDescription>
              Ao assinar, você confirma o recebimento e aceita a responsabilidade pela tarefa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-6">
            <div>
              <Label>Observações sobre a Assinatura</Label>
              <RichTextEditor
                content={signRichNotes}
                onChange={setSignRichNotes}
                placeholder="Adicione observações sobre a assinatura, cronograma ou próximos passos..."
                className="mt-2"
              />
            </div>
            
            <div>
              <Label className="flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Anexar Documentos
              </Label>
              <FileUploader
                files={signFiles}
                onFilesChange={setSignFiles}
                maxFiles={3}
                maxSize={10}
                className="mt-2"
              />
            </div>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSign}>
              Assinar Tarefa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog para Rejeitar Tarefa */}
      <AlertDialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <AlertDialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar Tarefa</AlertDialogTitle>
            <AlertDialogDescription>
              Informe o motivo da rejeição da tarefa com detalhes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-6">
            <div>
              <Label>Motivo da Rejeição *</Label>
              <RichTextEditor
                content={rejectRichReason}
                onChange={setRejectRichReason}
                placeholder="Explique detalhadamente o motivo da rejeição, problemas identificados e sugestões..."
                className="mt-2"
              />
            </div>
            
            <div>
              <Label className="flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Anexar Evidências
              </Label>
              <FileUploader
                files={rejectFiles}
                onFilesChange={setRejectFiles}
                maxFiles={5}
                maxSize={10}
                className="mt-2"
              />
            </div>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleReject}
              disabled={!rejectRichReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              Rejeitar Tarefa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog para Senha de Assinatura */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isRegisteringPassword ? 'Registrar Senha de Assinatura' : 'Confirmar Assinatura'}
            </DialogTitle>
            <DialogDescription>
              {isRegisteringPassword 
                ? 'Crie uma senha pessoal para confirmar suas assinaturas digitais.'
                : 'Digite sua senha de assinatura para confirmar a operação.'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {isRegisteringPassword ? (
              <>
                <div>
                  <Label htmlFor="new-password">Nova Senha *</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="confirm-password">Confirmar Senha *</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Digite a senha novamente"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </>
            ) : (
              <div>
                <Label htmlFor="signature-password">Senha de Assinatura *</Label>
                <Input
                  id="signature-password"
                  type="password"
                  placeholder="Digite sua senha"
                  value={signaturePassword}
                  onChange={(e) => setSignaturePassword(e.target.value)}
                  className="mt-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handlePasswordConfirm();
                    }
                  }}
                />
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowPasswordDialog(false);
                setSignaturePassword('');
                setNewPassword('');
                setConfirmPassword('');
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handlePasswordConfirm}
              disabled={
                isRegisteringPassword 
                  ? !newPassword || !confirmPassword
                  : !signaturePassword
              }
            >
              {isRegisteringPassword ? 'Registrar' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para Ver Despacho */}
      <Dialog open={isDispatchDialogOpen} onOpenChange={setIsDispatchDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Detalhes do Despacho
            </DialogTitle>
            <DialogDescription>
              Visualize o despacho enviado e seus anexos
            </DialogDescription>
          </DialogHeader>
          
          {selectedStep && (
            <div className="space-y-6">
              {/* Informações do Trâmite */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">De:</Label>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">{selectedStep.fromUserName.split(' ')[0]}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Para:</Label>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <User className="w-4 h-4 text-blue-500" />
                    <span className="font-medium">{selectedStep.toUserName.split(' ')[0]}</span>
                  </div>
                </div>
              </div>

              {/* Data e Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Data do Envio:</Label>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span>{formatDate(selectedStep.createdAt)}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Status:</Label>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <Badge className={getStatusConfig(selectedStep.status).color}>
                      {getStatusConfig(selectedStep.status).icon}
                      <span className="ml-1">{getStatusConfig(selectedStep.status).label}</span>
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Conteúdo do Despacho */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Conteúdo do Despacho:</Label>
                <RichTextViewer 
                  content={selectedStep.richNotes || selectedStep.notes || ''} 
                />
              </div>

              {/* Anexos */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">
                  Anexos {selectedStep.attachments && selectedStep.attachments.length > 0 ? `(${selectedStep.attachments.length})` : ''}:
                </Label>
                <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                  {selectedStep.attachments && selectedStep.attachments.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2">
                      {selectedStep.attachments.map((attachment, index) => (
                        <div key={index} className="flex items-center gap-3 p-2 border rounded-lg bg-white dark:bg-gray-700">
                          <Paperclip className="w-4 h-4 text-gray-500" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{attachment.name || attachment.originalName || `Anexo ${index + 1}`}</p>
                            <p className="text-xs text-muted-foreground">
                              {attachment.type && `${attachment.type} • `}
                              {attachment.size && `${(attachment.size / 1024).toFixed(1)} KB • `}
                              Enviado em {attachment.uploadedAt ? formatDate(attachment.uploadedAt) : 'data não disponível'}
                            </p>
                          </div>
                          {attachment.url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(attachment.url, '_blank')}
                            >
                              Abrir
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <Paperclip className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-muted-foreground">Nenhum anexo encontrado</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDispatchDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 