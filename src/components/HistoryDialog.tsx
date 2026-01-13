import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, User, FileText, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/config/firebase";

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

interface HistoryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  entityId: string;
  entityType: 'collaborator' | 'client';
  entityName: string;
}

export const HistoryDialog: React.FC<HistoryDialogProps> = ({
  isOpen,
  onOpenChange,
  entityId,
  entityType,
  entityName
}) => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && entityId) {
      fetchAuditLogs();
    }
  }, [isOpen, entityId]);

  const fetchAuditLogs = async () => {
    setIsLoading(true);
    try {
      console.log('🔍 Buscando histórico para:', { entityId, entityType, entityName });
      
      // Buscar logs relacionados ao ID da entidade
      const logsQuery = query(
        collection(db, 'auditLogs'),
        where('performedOn', '==', entityId)
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
      
      // Se não encontrou logs, vamos buscar na coleção inteira para debug
      if (logs.length === 0) {
        console.log('🔍 Nenhum log encontrado. Verificando toda a coleção auditLogs...');
        const allLogsQuery = collection(db, 'auditLogs');
        const allLogsSnapshot = await getDocs(allLogsQuery);
        console.log(`📊 Total de logs na coleção: ${allLogsSnapshot.size}`);
        
        allLogsSnapshot.docs.forEach((doc, index) => {
          const data = doc.data();
          console.log(`📄 Log ${index + 1}:`, {
            id: doc.id,
            performedOn: data.performedOn,
            entityType: data.entityType,
            action: data.action,
            details: data.details
          });
        });
      }
    } catch (error) {
      console.error('❌ Erro ao buscar histórico:', error);
      setAuditLogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create_user':
      case 'create_client':
        return <User className="h-4 w-4 text-green-600" />;
      case 'update_user':
      case 'update_client':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'delete_user':
      case 'delete_client':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'upload_document':
        return <FileText className="h-4 w-4 text-green-600" />;
      case 'delete_document':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Histórico de Alterações
          </DialogTitle>
          <DialogDescription>
            Histórico completo de alterações para{' '}
            <span className="font-medium">{entityName}</span>
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
                Nenhum histórico encontrado para este {entityType === 'collaborator' ? 'colaborador' : 'cliente'}.
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