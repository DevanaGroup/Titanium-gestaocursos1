import React, { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, User, FileText, AlertCircle, CheckCircle, Circle, Trash2, Edit, ArrowRight, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "@/config/firebase";
import { useNavigate } from "react-router-dom";
import { Collaborator, HierarchyLevel } from '@/types';
import { getDoc, doc } from 'firebase/firestore';
import { getTasksByCollaboratorClientId } from '@/services/taskService';

interface TaskAuditLog {
  id: string;
  action: string;
  performedBy: string;
  performedByName?: string;
  performedOn: string;
  timestamp: any;
  details: string;
  entityType: 'task';
  changes?: Record<string, { from: any; to: any }>;
  taskTitle?: string;
  taskId?: string;
}

export default function TaskHistory() {
  const [auditLogs, setAuditLogs] = useState<TaskAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('Colaborador');
  const [currentCollaborator, setCurrentCollaborator] = useState<Collaborator | null>(null);
  const navigate = useNavigate();

  // Obter usuário atual
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          // Buscar dados do usuário no Firestore - priorizar coleção unificada
          let userData = null;
          let userDoc = null;
          
          // Tentar buscar na coleção unificada primeiro
          const unifiedDoc = await getDoc(doc(db, "collaborators_unified", user.uid));
          if (unifiedDoc.exists()) {
            userData = unifiedDoc.data();
            userDoc = unifiedDoc;
            console.log("🔍 TaskHistory - Dados do usuário (unified):", userData);
            
            setCurrentCollaborator({
              id: userDoc.id,
              uid: user.uid,
              firstName: userData.firstName,
              lastName: userData.lastName,
              email: userData.email,
              birthDate: userData.birthDate?.toDate() || new Date(),
              hierarchyLevel: userData.hierarchyLevel as HierarchyLevel,
              customPermissions: userData.customPermissions,
              createdAt: userData.createdAt?.toDate() || new Date(),
              updatedAt: userData.updatedAt?.toDate() || new Date()
            } as Collaborator);
          } else {
            // Se não encontrou na coleção unificada, definir dados padrão
            console.log("❌ TaskHistory - Usuário não encontrado na coleção unificada");
          }
          
          setUserRole(userData?.hierarchyLevel || "Estagiário/Auxiliar");
        } catch (error) {
          console.error("Erro ao buscar dados do usuário:", error);
        }
      } else {
        setCurrentUser(null);
        setCurrentCollaborator(null);
        setUserRole('Colaborador');
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchTaskAuditLogs();
    }
  }, [currentUser, userRole]);

  // Função para verificar se o usuário pode visualizar todas as tarefas
  const canViewAllTasks = () => {
    // Se tiver dados do colaborador com permissões customizadas, usar essas
    if (currentCollaborator?.customPermissions) {
      return currentCollaborator.customPermissions.canViewAllTasks;
    }
    
    // Senão, usar verificação baseada no papel hierárquico
    return ["Presidente", "Diretor", "Diretor de TI", "Gerente", "Administrador"].includes(userRole);
  };

  const fetchTaskAuditLogs = async () => {
    setIsLoading(true);
    try {
      let logsQuery;
      
      // Se for Cliente Externo, buscar apenas tarefas do seu cliente
      if (userRole === "Cliente Externo" && currentUser) {
        // Buscar tarefas do cliente
        const clientTasks = await getTasksByCollaboratorClientId(currentUser.uid);
        const taskIds = clientTasks.map(task => task.id);
        
        if (taskIds.length === 0) {
          setAuditLogs([]);
          setIsLoading(false);
          return;
        }
        
        // Buscar todos os logs de tarefas e filtrar no cliente
        // (Firestore limita 'in' a 10 valores, então buscamos todos e filtramos)
        logsQuery = query(
          collection(db, 'auditLogs'),
          where('entityType', '==', 'task')
        );
      } else if (canViewAllTasks()) {
        // Para níveis superiores: buscar todos os logs de tarefas
        logsQuery = query(
          collection(db, 'auditLogs'),
          where('entityType', '==', 'task')
        );
      } else if (currentUser) {
        // Para usuários normais: buscar apenas logs das suas tarefas
        logsQuery = query(
          collection(db, 'auditLogs'),
          where('entityType', '==', 'task'),
          where('performedBy', '==', currentUser.uid)
        );
      } else {
        setAuditLogs([]);
        return;
      }
      
      const logsSnapshot = await getDocs(logsQuery);
      console.log(`📊 Logs encontrados: ${logsSnapshot.size}`);
      
      let logs = logsSnapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          action: data.action || '',
          performedBy: data.performedBy || '',
          performedByName: data.performedByName || '',
          performedOn: data.performedOn || '',
          timestamp: data.timestamp?.toDate() || new Date(),
          details: data.details || '',
          entityType: 'task' as const,
          changes: data.changes || {},
          taskTitle: data.taskTitle || '',
          taskId: data.taskId || ''
        } as TaskAuditLog;
      });

      // Se for Cliente Externo, filtrar apenas logs das tarefas do cliente
      if (userRole === "Cliente Externo" && currentUser) {
        const clientTasks = await getTasksByCollaboratorClientId(currentUser.uid);
        const taskIds = new Set(clientTasks.map(task => task.id));
        logs = logs.filter(log => taskIds.has(log.performedOn) || taskIds.has(log.taskId || ''));
      }

      // Ordenar os logs por timestamp no frontend
      logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      console.log(`✅ Logs processados: ${logs.length}`);
      setAuditLogs(logs);
      
    } catch (error) {
      console.error('❌ Erro ao buscar histórico de tarefas:', error);
      setAuditLogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create_task':
        return <Circle className="h-5 w-5 text-green-600" />;
      case 'update_task':
        return <Edit className="h-5 w-5 text-blue-600" />;
      case 'delete_task':
        return <Trash2 className="h-5 w-5 text-red-600" />;
      case 'change_status':
        return <CheckCircle className="h-5 w-5 text-purple-600" />;
      case 'assign_task':
        return <User className="h-5 w-5 text-orange-600" />;
      case 'change_priority':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'move_task':
        return <ArrowRight className="h-5 w-5 text-indigo-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create_task':
        return <Badge variant="default" className="bg-green-100 text-green-800 text-sm">Criação</Badge>;
      case 'update_task':
        return <Badge variant="default" className="bg-blue-100 text-blue-800 text-sm">Atualização</Badge>;
      case 'delete_task':
        return <Badge variant="destructive" className="text-sm">Exclusão</Badge>;
      case 'change_status':
        return <Badge variant="default" className="bg-purple-100 text-purple-800 text-sm">Status</Badge>;
      case 'assign_task':
        return <Badge variant="default" className="bg-orange-100 text-orange-800 text-sm">Atribuição</Badge>;
      case 'change_priority':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800 text-sm">Prioridade</Badge>;
      case 'move_task':
        return <Badge variant="default" className="bg-indigo-100 text-indigo-800 text-sm">Movimentação</Badge>;
      default:
        return <Badge variant="secondary" className="text-sm">{action}</Badge>;
    }
  };

  const formatAction = (action: string) => {
    const actionMap: Record<string, string> = {
      'CREATE_TASK': 'Tarefa criada',
      'UPDATE_TASK': 'Dados atualizados',
      'DELETE_TASK': 'Tarefa removida',
      'CHANGE_STATUS': 'Status alterado',
      'ASSIGN_TASK': 'Tarefa atribuída',
      'CHANGE_PRIORITY': 'Prioridade alterada',
      'UPDATE_DUE_DATE': 'Prazo alterado',
      'MOVE_TASK': 'Tarefa movida'
    };
    
    return actionMap[action.toUpperCase()] || action;
  };

  const getPageTitle = () => {
    if (canViewAllTasks()) {
      return 'Histórico Completo de Tarefas';
    } else {
      return 'Meu Histórico de Tarefas';
    }
  };

  const getPageDescription = () => {
    if (canViewAllTasks()) {
      return 'Histórico completo de todas as atividades relacionadas a tarefas no sistema';
    } else {
      return 'Histórico das suas atividades relacionadas a tarefas';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/dashboard', { state: { activeTab: 'tasks' } })}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <Clock className="h-6 w-6" />
                  {getPageTitle()}
                </h1>
                <p className="text-muted-foreground mt-1">
                  {getPageDescription()}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{currentUser?.email}</span>
              <Badge variant="outline">{userRole}</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-4 text-muted-foreground">Carregando histórico...</p>
            </div>
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground/50" />
            <p className="mt-4 text-lg text-muted-foreground">
              Nenhum histórico de tarefas encontrado.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              As atividades de tarefas aparecerão aqui quando realizadas.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Stats */}
            <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-card p-4 rounded-lg border">
                <h3 className="text-sm font-medium text-muted-foreground">Total de Atividades</h3>
                <p className="text-2xl font-bold text-foreground">{auditLogs.length}</p>
              </div>
              
              <div className="bg-card p-4 rounded-lg border">
                <h3 className="text-sm font-medium text-muted-foreground">Período</h3>
                <p className="text-sm text-foreground">
                  {auditLogs.length > 0 && format(auditLogs[auditLogs.length - 1].timestamp, "dd/MM/yyyy", { locale: ptBR })} - {auditLogs.length > 0 && format(auditLogs[0].timestamp, "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
              
              <div className="bg-card p-4 rounded-lg border">
                <h3 className="text-sm font-medium text-muted-foreground">Última Atividade</h3>
                <p className="text-sm text-foreground">
                  {auditLogs.length > 0 && format(auditLogs[0].timestamp, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-6">
              {auditLogs.map((log, index) => (
                <div key={log.id} className="relative">
                  <div className="flex gap-4">
                    {/* Timeline line */}
                    <div className="flex flex-col items-center">
                      <div className="flex-shrink-0 w-10 h-10 bg-background border-2 border-primary rounded-full flex items-center justify-center">
                        {getActionIcon(log.action)}
                      </div>
                      {index < auditLogs.length - 1 && (
                        <div className="w-px h-16 bg-border mt-2"></div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 bg-card border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {getActionBadge(log.action)}
                          <h3 className="font-semibold text-foreground">
                            {formatAction(log.action)}
                          </h3>
                        </div>
                        
                        <time className="text-sm text-muted-foreground">
                          {format(log.timestamp, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </time>
                      </div>

                      {/* Título da tarefa */}
                      {log.taskTitle && (
                        <p className="text-lg font-medium text-primary mt-2">
                          📋 {log.taskTitle}
                        </p>
                      )}

                      {/* Detalhes */}
                      <p className="text-muted-foreground mt-2">
                        {log.details}
                      </p>

                      {/* Quem fez */}
                      <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>Realizado por: <strong>{log.performedByName || log.performedBy || 'Sistema'}</strong></span>
                      </div>

                      {/* Mudanças específicas */}
                      {log.changes && Object.keys(log.changes).length > 0 && (
                        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                          <p className="text-sm font-medium text-muted-foreground mb-2">
                            Campos alterados:
                          </p>
                          <div className="space-y-1">
                            {Object.entries(log.changes).map(([field, change]) => (
                              <div key={field} className="text-sm">
                                <span className="font-medium text-foreground">{field}:</span>{' '}
                                <span className="line-through text-red-600 bg-red-50 px-1 rounded">{change.from}</span>
                                {' → '}
                                <span className="text-green-600 bg-green-50 px-1 rounded">{change.to}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 