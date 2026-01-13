import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  MessageCircle, 
  Settings, 
  UserPlus, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Eye, 
  EyeOff,
  Edit,
  FileText,
  Bug
} from 'lucide-react';
import { TicketUpdate, UpdateType } from '@/types/support';

interface TicketTimelineProps {
  updates: TicketUpdate[];
  showInternalComments: boolean;
}

export const TicketTimeline: React.FC<TicketTimelineProps> = ({ 
  updates, 
  showInternalComments 
}) => {
  // Filtrar updates baseado na visibilidade de comentários internos
  const filteredUpdates = updates.filter(update => 
    showInternalComments || !update.isInternal
  );

  const getUpdateIcon = (type: UpdateType, isInternal?: boolean) => {
    if (isInternal) {
      return <EyeOff className="w-4 h-4" />;
    }

    switch (type) {
      case 'comment':
        return <MessageCircle className="w-4 h-4" />;
      case 'status_change':
        return <Settings className="w-4 h-4" />;
      case 'assignment':
        return <UserPlus className="w-4 h-4" />;
      case 'resolution':
        return <CheckCircle className="w-4 h-4" />;
      case 'system':
        return <Bot className="w-4 h-4" />;
      case 'additional_info':
        return <FileText className="w-4 h-4" />;
      default:
        return <MessageCircle className="w-4 h-4" />;
    }
  };

  const getUpdateColor = (type: UpdateType, isInternal?: boolean) => {
    if (isInternal) {
      return 'bg-purple-100 text-purple-800 border-purple-200';
    }

    switch (type) {
      case 'comment':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'status_change':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'assignment':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'resolution':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'system':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'additional_info':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getUpdateTitle = (update: TicketUpdate) => {
    switch (update.type) {
      case 'comment':
        return update.isInternal ? 'Comentário Interno' : 'Comentário';
      case 'status_change':
        return 'Mudança de Status';
      case 'assignment':
        return 'Atribuição';
      case 'resolution':
        return 'Resolução';
      case 'system':
        return 'Sistema';
      case 'additional_info':
        return 'Informações Adicionais';
      default:
        return 'Atualização';
    }
  };

  const getRoleIcon = (role: 'requester' | 'support' | 'system') => {
    switch (role) {
      case 'requester':
        return '👤';
      case 'support':
        return '🛠️';
      case 'system':
        return '🤖';
      default:
        return '👤';
    }
  };

  const getRoleName = (role: 'requester' | 'support' | 'system') => {
    switch (role) {
      case 'requester':
        return 'Solicitante';
      case 'support':
        return 'Suporte';
      case 'system':
        return 'Sistema';
      default:
        return 'Usuário';
    }
  };

  const formatDate = (date: Date) => {
    return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (filteredUpdates.length === 0) {
    return (
      <div className="text-center py-8">
        <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Nenhuma comunicação ainda</h3>
        <p className="text-muted-foreground">
          Este ticket ainda não possui histórico de comunicação.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filteredUpdates.map((update, index) => (
        <div key={update.id} className="flex gap-4">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="text-xs">
                {update.authorRole === 'system' ? '🤖' : getInitials(update.authorName)}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Conteúdo */}
          <div className="flex-1 min-w-0">
            <div className="bg-white border rounded-lg p-4 shadow-sm">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={getUpdateColor(update.type, update.isInternal)}>
                    <div className="flex items-center gap-1">
                      {getUpdateIcon(update.type, update.isInternal)}
                      <span>{getUpdateTitle(update)}</span>
                    </div>
                  </Badge>
                  
                  {update.isInternal && (
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                      <EyeOff className="w-3 h-3 mr-1" />
                      Interno
                    </Badge>
                  )}
                </div>
                
                <div className="text-xs text-muted-foreground">
                  {formatDate(update.createdAt)}
                </div>
              </div>

              {/* Autor */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm">{getRoleIcon(update.authorRole)}</span>
                <span className="font-medium text-sm">{update.authorName}</span>
                <span className="text-xs text-muted-foreground">
                  ({getRoleName(update.authorRole)})
                </span>
              </div>

              {/* Conteúdo da mensagem */}
              <div className="space-y-3">
                <p className="text-sm whitespace-pre-wrap">
                  {update.message}
                </p>

                {/* Mudanças específicas */}
                {update.statusChange && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <div className="text-sm">
                      <strong>Status alterado:</strong>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="bg-gray-100">
                          {update.statusChange.from}
                        </Badge>
                        <span>→</span>
                        <Badge variant="outline" className="bg-green-100">
                          {update.statusChange.to}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}

                {update.assignmentChange && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                    <div className="text-sm">
                      <strong>Atribuição alterada:</strong>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-muted-foreground">
                          {update.assignmentChange.fromName || 'Não atribuído'}
                        </span>
                        <span>→</span>
                        <span className="font-medium">
                          {update.assignmentChange.toName}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Anexos */}
                {update.attachments && update.attachments.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Anexos:</div>
                    <div className="space-y-1">
                      {update.attachments.map((attachment, i) => (
                        <div 
                          key={i}
                          className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm"
                        >
                          <FileText className="w-4 h-4 text-gray-600" />
                          <span className="flex-1 truncate">{attachment.originalName}</span>
                          <span className="text-xs text-muted-foreground">
                            {(attachment.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Linha de conexão (exceto para o último item) */}
            {index < filteredUpdates.length - 1 && (
              <div className="w-px h-4 bg-gray-200 ml-4 mt-2"></div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// Fix para ícone Bot que não existe no lucide-react
const Bot: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`${className} flex items-center justify-center text-xs`}>🤖</div>
); 