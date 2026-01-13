import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Clock, User, FileText, AlertCircle, CheckCircle, Circle, Trash2, Edit, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/config/firebase";

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

interface TaskHistoryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  taskId?: string;
  taskTitle?: string;
  showAllTasks?: boolean;
  currentUserId?: string;
}

export const TaskHistoryDialog: React.FC<TaskHistoryDialogProps> = ({
  isOpen,
  onOpenChange,
  taskId,
  taskTitle,
  showAllTasks = false,
  currentUserId
}) => {
  const [auditLogs, setAuditLogs] = useState<TaskAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTaskAuditLogs();
    }
  }, [isOpen, taskId, showAllTasks, currentUserId]);

  const fetchTaskAuditLogs = async () => {
    setIsLoading(true);
    try {
      console.log('🔍 Buscando histórico de tarefas:', { taskId, showAllTasks, currentUserId });
      
      let logsQuery;
      
      if (taskId) {
        // Buscar logs de uma tarefa específica
        logsQuery = query(
          collection(db, 'auditLogs'),
          where('performedOn', '==', taskId),
          where('entityType', '==', 'task')
        );
      } else if (showAllTasks) {
        // Para níveis superiores: buscar todos os logs de tarefas
        logsQuery = query(
          collection(db, 'auditLogs'),
          where('entityType', '==', 'task')
        );
      } else if (currentUserId) {
        // Para usuários normais: buscar apenas logs das suas tarefas
        logsQuery = query(
          collection(db, 'auditLogs'),
          where('entityType', '==', 'task'),
          where('performedBy', '==', currentUserId)
        );
      } else {
        setAuditLogs([]);
        return;
      }
      
      const logsSnapshot = await getDocs(logsQuery);
      console.log(`📊 Logs encontrados: ${logsSnapshot.size}`);
      
      const logs = logsSnapshot.docs.map(doc => {
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
        return <Circle className="h-4 w-4 text-green-600" />;
      case 'update_task':
        return <Edit className="h-4 w-4 text-blue-600" />;
      case 'delete_task':
        return <Trash2 className="h-4 w-4 text-red-600" />;
      case 'change_status':
        return <CheckCircle className="h-4 w-4 text-purple-600" />;
      case 'assign_task':
        return <User className="h-4 w-4 text-orange-600" />;
      case 'change_priority':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'move_task':
        return <ArrowRight className="h-4 w-4 text-indigo-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create_task':
        return <Badge variant="default" className="bg-green-100 text-green-800">Criação</Badge>;
      case 'update_task':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Atualização</Badge>;
      case 'delete_task':
        return <Badge variant="destructive">Exclusão</Badge>;
      case 'change_status':
        return <Badge variant="default" className="bg-purple-100 text-purple-800">Status</Badge>;
      case 'assign_task':
        return <Badge variant="default" className="bg-orange-100 text-orange-800">Atribuição</Badge>;
      case 'change_priority':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Prioridade</Badge>;
      case 'move_task':
        return <Badge variant="default" className="bg-indigo-100 text-indigo-800">Movimentação</Badge>;
      default:
        return <Badge variant="secondary">{action}</Badge>;
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

  const getDialogTitle = () => {
    if (taskId && taskTitle) {
      return `Histórico da Tarefa: ${taskTitle}`;
    } else if (showAllTasks) {
      return 'Histórico Completo de Tarefas';
    } else {
      return 'Meu Histórico de Tarefas';
    }
  };

  const getDialogDescription = () => {
    if (taskId && taskTitle) {
      return `Histórico completo de alterações da tarefa "${taskTitle}"`;
    } else if (showAllTasks) {
      return 'Histórico completo de todas as tarefas realizadas no sistema';
    } else {
      return 'Histórico das suas atividades relacionadas a tarefas';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {getDialogTitle()}
          </DialogTitle>
          <DialogDescription>
            {getDialogDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-sm text-muted-foreground">Carregando histórico...</p>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                {taskId ? 'Nenhum histórico encontrado para esta tarefa.' : 'Nenhum histórico de tarefas encontrado.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {auditLogs.map((log, index) => (
                <div key={log.id} className="relative">
                  <div className="flex items-start gap-3">
                    {/* Ícone da ação */}
                    <div className="flex-shrink-0 mt-1">
                      {getActionIcon(log.action)}
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getActionBadge(log.action)}
                          <span className="text-sm font-medium">
                            {formatAction(log.action)}
                          </span>
                        </div>
                        
                        <time className="text-xs text-muted-foreground">
                          {format(log.timestamp, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </time>
                      </div>

                      {/* Título da tarefa (quando exibindo histórico geral) */}
                      {!taskId && log.taskTitle && (
                        <p className="text-sm font-medium text-primary mt-1">
                          Tarefa: {log.taskTitle}
                        </p>
                      )}

                      {/* Detalhes */}
                      <p className="text-sm text-muted-foreground mt-1">
                        {log.details}
                      </p>

                      {/* Quem fez */}
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Realizado por: {log.performedByName || log.performedBy || 'Sistema'}
                      </p>

                      {/* Mudanças específicas */}
                      {log.changes && Object.keys(log.changes).length > 0 && (
                        <div className="mt-2 p-2 bg-muted/50 rounded-sm">
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Campos alterados:
                          </p>
                          {Object.entries(log.changes).map(([field, change]) => (
                            <div key={field} className="text-xs text-muted-foreground">
                              <span className="font-medium">{field}:</span>{' '}
                              <span className="line-through text-red-600">{change.from}</span>
                              {' → '}
                              <span className="text-green-600">{change.to}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Linha conectora */}
                  {index < auditLogs.length - 1 && (
                    <div className="absolute left-2 top-8 bottom-0 w-px bg-border"></div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}; 