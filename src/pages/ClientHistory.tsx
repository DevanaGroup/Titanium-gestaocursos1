import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Clock, User, FileText, AlertCircle, Calendar, History, Building, Activity } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SidebarProvider } from '@/contexts/SidebarContext';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { db, auth } from '@/config/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Skeleton } from '@/components/ui/skeleton';
import CustomSidebar from '@/components/CustomSidebar';
import { useTabCloseLogout } from "@/hooks/useTabCloseLogout";

interface Client {
  id: string;
  name: string;
  project: string;
  status: string;
  lastUpdate: string;
  contactName?: string;
  email?: string;
  phone?: string;
  logoUrl?: string;
}

interface UserData {
  name: string;
  role: string;
  avatar: string;
}

interface AuditLog {
  id: string;
  action: string;
  performedBy: string;
  performedByName?: string;
  performedOn: string;
  timestamp: any;
  details: string;
  entityType?: 'collaborator' | 'client';
  changes?: Record<string, { from: any; to: any }>;
}

const ClientHistoryPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [userData, setUserData] = useState<UserData>({
    name: 'Usuário',
    role: 'Gerente',
    avatar: '/placeholder.svg'
  });

  // Ativa o logout automático quando a guia é fechada
  useTabCloseLogout();

  // Gerenciamento de estado do usuário logado
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Buscar dados do usuário no Firestore - priorizar coleção unificada
        let userData = null;
        
        // Tentar buscar na coleção unificada primeiro
        const unifiedDoc = await getDoc(doc(db, "collaborators_unified", user.uid));
        if (unifiedDoc.exists()) {
          userData = unifiedDoc.data();
          console.log("🔍 ClientHistory - Dados do usuário (unified):", userData);
        } else {
          // Fallback para coleção collaborators
          const userDoc = await getDoc(doc(db, "collaborators_unified", user.uid));

        if (userDoc.exists()) {
            userData = userDoc.data();
            console.log("🔍 ClientHistory - Dados do usuário (collaborators):", userData);
          } else {
            // Se não encontrou na coleção unificada, definir dados padrão
            console.log("❌ ClientHistory - Usuário não encontrado na coleção unificada");
          }
        }

        if (userData) {
          // Mostrar apenas o firstName
          const displayName = userData.firstName || "Usuário";

          setUserData({
            name: displayName,
            role: userData.hierarchyLevel || "Estagiário/Auxiliar",
            avatar: userData.avatar || userData.photoURL || "/placeholder.svg"
            });
        }
      } else {
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Carregar dados do cliente
  useEffect(() => {
    const loadClient = async () => {
      if (!id) return;
      
      try {
        setIsLoading(true);
        const clientDoc = await getDoc(doc(db, "clients", id));
        
        if (clientDoc.exists()) {
          const clientData = {
            id: clientDoc.id,
            ...clientDoc.data()
          } as Client;
          
          setClient(clientData);
        } else {
          toast.error("Cliente não encontrado");
          navigate('/dashboard', { state: { activeTab: "clients" } });
        }
      } catch (error) {
        console.error("Erro ao carregar cliente:", error);
        toast.error("Erro ao carregar dados do cliente");
      } finally {
        setIsLoading(false);
      }
    };

    loadClient();
  }, [id, navigate]);

  // Carregar histórico do cliente
  useEffect(() => {
    const fetchAuditLogs = async () => {
      if (!client?.id) return;
      
      setIsHistoryLoading(true);
      try {
        console.log('🔍 Buscando histórico para cliente:', { entityId: client.id, entityName: client.name });
        
        // Buscar logs relacionados ao ID do cliente
        const logsQuery = query(
          collection(db, 'auditLogs'),
          where('performedOn', '==', client.id)
        );
        
        const logsSnapshot = await getDocs(logsQuery);
        console.log(`📊 Logs encontrados na consulta: ${logsSnapshot.size}`);
        
        const logs = logsSnapshot.docs.map(doc => {
          const data = doc.data();
          console.log('📄 Log encontrado:', doc.id, data);
          return {
            id: doc.id,
            ...data,
            timestamp: data.timestamp?.toDate() || new Date()
          };
        }) as AuditLog[];

        // Ordenar os logs por timestamp no frontend
        logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        console.log(`✅ Total de logs processados: ${logs.length}`);
        setAuditLogs(logs);
        
      } catch (error) {
        console.error('❌ Erro ao buscar histórico:', error);
        setAuditLogs([]);
        toast.error("Erro ao carregar histórico do cliente");
      } finally {
        setIsHistoryLoading(false);
      }
    };

    if (client?.id) {
      fetchAuditLogs();
    }
  }, [client]);

  // Função para gerar as iniciais a partir do nome
  const getAvatarInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Função para sair da conta
  const handleLogout = () => {
    auth.signOut().then(() => {
      toast.info("Você foi desconectado");
      navigate("/");
    }).catch((error) => {
      toast.error("Erro ao fazer logout: " + error.message);
    });
  };

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create_user':
      case 'create_client':
        return <User className="h-5 w-5 text-green-600" />;
      case 'update_user':
      case 'update_client':
        return <FileText className="h-5 w-5 text-blue-600" />;
      case 'delete_user':
      case 'delete_client':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'upload_document':
        return <FileText className="h-5 w-5 text-green-600" />;
      case 'delete_document':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Activity className="h-5 w-5 text-gray-600" />;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create_user':
      case 'create_client':
        return <Badge variant="default" className="bg-green-100 text-green-800">Criação</Badge>;
      case 'update_user':
      case 'update_client':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Atualização</Badge>;
      case 'delete_user':
      case 'delete_client':
        return <Badge variant="destructive">Exclusão</Badge>;
      case 'upload_document':
        return <Badge variant="default" className="bg-green-100 text-green-800">Upload</Badge>;
      case 'delete_document':
        return <Badge variant="destructive">Exclusão</Badge>;
      default:
        return <Badge variant="secondary">{action}</Badge>;
    }
  };

  const formatAction = (action: string) => {
    const actionMap: Record<string, string> = {
      'CREATE_USER': 'Usuário criado',
      'UPDATE_USER': 'Dados atualizados',
      'DELETE_USER': 'Usuário removido',
      'CREATE_CLIENT': 'Cliente criado',
      'UPDATE_CLIENT': 'Cliente atualizado',
      'DELETE_CLIENT': 'Cliente removido',
      'UPLOAD_DOCUMENT': 'Documento enviado',
      'DELETE_DOCUMENT': 'Documento excluído',
      'ASSIGN_CLIENT': 'Cliente atribuído',
      'CHANGE_STATUS': 'Status alterado',
      'PERMISSION_CHANGE': 'Permissões alteradas'
    };
    
    return actionMap[action.toUpperCase()] || action;
  };

  if (isLoading) {
    return (
      <SidebarProvider>
        <div className="flex h-screen bg-background">
          <CustomSidebar activeTab="clients" onTabChange={(tab) => {
            if (tab === "documents") {
              navigate("/documents");
              return;
            }
            if (tab === "chatbot") {
              navigate("/dashboard", { state: { activeTab: "chatbot" } });
              return;
            }
            navigate('/dashboard', { state: { activeTab: "clients" } });
          }} />
          <div className="flex flex-col flex-1">
            <header className="sticky top-0 z-20 flex items-center justify-between h-[80px] border-b bg-cerrado-green1 text-white px-4">
              <div className="flex items-center gap-4">
                <div className="text-xl font-semibold">Carregando...</div>
              </div>
              <div className="flex items-center gap-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="flex items-center gap-4 cursor-pointer">
                      <div className="flex flex-col items-end mr-2">
                        <span className="font-medium">{userData.name}</span>
                        <span className="text-xs opacity-80">{userData.role}</span>
                      </div>
                      <Avatar>
                        <AvatarImage src={userData.avatar} alt={userData.name} />
                        <AvatarFallback>{getAvatarInitials(userData.name)}</AvatarFallback>
                      </Avatar>
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/dashboard', { state: { activeTab: "clients" } })}>
                      <span>Voltar ao Dashboard</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </header>
            <main className="flex-1 dashboard-content bg-background p-6 overflow-auto h-[calc(100vh-80px)]">
              <div className="flex items-center justify-center h-full">
                <Card className="w-[600px]">
                  <CardHeader>
                    <CardTitle>Carregando histórico do cliente</CardTitle>
                    <CardDescription>Aguarde enquanto os dados são carregados...</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  if (!client) {
    return (
      <SidebarProvider>
        <div className="flex h-screen bg-background">
          <CustomSidebar activeTab="clients" onTabChange={(tab) => {
            if (tab === "documents") {
              navigate("/documents");
              return;
            }
            if (tab === "chatbot") {
              navigate("/dashboard", { state: { activeTab: "chatbot" } });
              return;
            }
            navigate('/dashboard', { state: { activeTab: "clients" } });
          }} />
          <div className="flex flex-col flex-1">
            <header className="sticky top-0 z-20 flex items-center justify-between h-[80px] border-b bg-cerrado-green1 text-white px-4">
              <div className="flex items-center gap-4">
                <div className="text-xl font-semibold">Cliente não encontrado</div>
              </div>
              <div className="flex items-center gap-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="flex items-center gap-4 cursor-pointer">
                      <div className="flex flex-col items-end mr-2">
                        <span className="font-medium">{userData.name}</span>
                        <span className="text-xs opacity-80">{userData.role}</span>
                      </div>
                      <Avatar>
                        <AvatarImage src={userData.avatar} alt={userData.name} />
                        <AvatarFallback>{getAvatarInitials(userData.name)}</AvatarFallback>
                      </Avatar>
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/dashboard', { state: { activeTab: "clients" } })}>
                      <span>Voltar ao Dashboard</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </header>
            <main className="flex-1 dashboard-content bg-background p-6 overflow-auto h-[calc(100vh-80px)]">
              <div className="flex items-center justify-center h-full">
                <Card>
                  <CardHeader>
                    <CardTitle>Cliente não encontrado</CardTitle>
                    <CardDescription>Não foi possível encontrar o cliente solicitado.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={() => navigate('/dashboard', { state: { activeTab: "clients" } })}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Voltar para o Dashboard
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background">
        <CustomSidebar activeTab="clients" onTabChange={(tab) => {
          if (tab === "documents") {
            navigate("/documents");
            return;
          }
          if (tab === "chatbot") {
            navigate("/dashboard", { state: { activeTab: "chatbot" } });
            return;
          }
          navigate('/dashboard', { state: { activeTab: "clients" } });
        }} />
        <div className="flex flex-col flex-1">
          <header className="sticky top-0 z-20 flex items-center justify-between h-[80px] border-b bg-cerrado-green1 text-white px-4">
            <div className="flex items-center gap-4">
              <div className="text-xl font-semibold">Histórico do Cliente</div>
            </div>
            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center gap-4 cursor-pointer">
                    <div className="flex flex-col items-end mr-2">
                      <span className="font-medium">{userData.name}</span>
                      <span className="text-xs opacity-80">{userData.role}</span>
                    </div>
                    <Avatar>
                      <AvatarImage src={userData.avatar} alt={userData.name} />
                      <AvatarFallback>{getAvatarInitials(userData.name)}</AvatarFallback>
                    </Avatar>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <span>Sair</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 dashboard-content bg-background p-6 overflow-auto h-[calc(100vh-80px)]">
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" onClick={() => navigate('/dashboard', { state: { activeTab: "clients" } })}>
                    <ArrowLeft className="h-4 w-4" />
                    Voltar
                  </Button>
                  <h1 className="text-2xl font-bold">Histórico de Alterações</h1>
                </div>
                <div className="flex items-center gap-4">
                  <Button 
                    variant="outline" 
                    onClick={() => navigate(`/client/${client.id}`)}
                    className="flex items-center gap-2"
                  >
                    <Building className="h-4 w-4" />
                    Ver Detalhes
                  </Button>
                </div>
              </div>

              {/* Informações do Cliente */}
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-6">
                    <Avatar className="w-20 h-20 border-2 border-gray-200">
                      {client.logoUrl ? (
                        <AvatarImage src={client.logoUrl} alt={client.name} />
                      ) : (
                        <AvatarFallback className="text-lg bg-green-700 text-white">
                          {client.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-xl font-bold">{client.name}</h2>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium
                          ${client.status === 'Em andamento' ? 'bg-blue-100 text-blue-800' : ''}
                          ${client.status === 'Concluído' ? 'bg-green-100 text-green-800' : ''}
                          ${client.status === 'Em análise' ? 'bg-purple-100 text-purple-800' : ''}
                          ${client.status === 'Aguardando documentos' ? 'bg-yellow-100 text-yellow-800' : ''}
                        `}>
                          {client.status}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-3">{client.project}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Última atualização: {client.lastUpdate}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <History className="h-4 w-4" />
                          <span>{auditLogs.length} alterações registradas</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Histórico de Alterações */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Timeline de Alterações
                  </CardTitle>
                  <CardDescription>
                    Histórico completo de todas as alterações realizadas neste cliente
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isHistoryLoading ? (
                    <div className="text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <p className="mt-2 text-sm text-muted-foreground">Carregando histórico...</p>
                    </div>
                  ) : auditLogs.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-medium mb-2">Nenhum histórico encontrado</h3>
                      <p className="text-sm text-muted-foreground">
                        Este cliente ainda não possui alterações registradas.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {auditLogs.map((log, index) => (
                        <div key={log.id} className="relative">
                          <div className="flex items-start gap-4">
                            {/* Ícone da ação */}
                            <div className="flex-shrink-0 mt-1 bg-background border-2 border-border rounded-full p-2">
                              {getActionIcon(log.action)}
                            </div>

                            {/* Conteúdo principal */}
                            <div className="flex-1 min-w-0 bg-card border border-border rounded-lg p-4 shadow-sm">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  {getActionBadge(log.action)}
                                  <h3 className="text-lg font-medium">
                                    {formatAction(log.action)}
                                  </h3>
                                </div>
                                
                                <time className="text-sm text-muted-foreground font-medium">
                                  {format(log.timestamp, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                </time>
                              </div>

                              {/* Detalhes da ação */}
                              <p className="text-sm text-muted-foreground mb-3">
                                {log.details}
                              </p>

                              {/* Informações do usuário */}
                              <div className="flex items-center gap-2 mb-3">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                  Realizado por: <span className="font-medium">{log.performedByName || log.performedBy || 'Sistema'}</span>
                                </span>
                              </div>

                              {/* Mudanças específicas */}
                              {log.changes && Object.keys(log.changes).length > 0 && (
                                <div className="bg-muted/50 rounded-md p-3 border">
                                  <p className="text-sm font-medium text-muted-foreground mb-2">
                                    Campos alterados:
                                  </p>
                                  <div className="space-y-2">
                                    {Object.entries(log.changes).map(([field, change]) => (
                                      <div key={field} className="text-sm">
                                        <span className="font-medium text-foreground">{field}:</span>
                                        <div className="ml-4 mt-1">
                                          <div className="flex items-center gap-2">
                                            <span className="text-red-600 line-through bg-red-50 px-2 py-1 rounded text-xs">
                                              {change.from || 'Vazio'}
                                            </span>
                                            <span className="text-muted-foreground">→</span>
                                            <span className="text-green-600 bg-green-50 px-2 py-1 rounded text-xs">
                                              {change.to || 'Vazio'}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Linha conectora para o próximo item */}
                          {index < auditLogs.length - 1 && (
                            <div className="absolute left-6 top-16 bottom-0 w-px bg-border"></div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default ClientHistoryPage; 