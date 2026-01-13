import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  AlertTriangle, 
  FileText, 
  Image as ImageIcon,
  Clock,
  User,
  Calendar,
  Settings
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SupportTicket } from '@/types/support';

interface TicketDetailsModalProps {
  ticket: SupportTicket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTicketUpdated?: () => void;
}

export const TicketDetailsModal: React.FC<TicketDetailsModalProps> = ({
  ticket,
  open,
  onOpenChange,
  onTicketUpdated
}) => {
  const [updatedTicket, setUpdatedTicket] = useState<SupportTicket | null>(ticket);

  // Atualizar ticket local quando prop muda
  useEffect(() => {
    setUpdatedTicket(ticket);
  }, [ticket]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Aberto': return <AlertTriangle className="w-4 h-4" />;
      case 'Em Análise': return <Clock className="w-4 h-4" />;
      case 'Resolvido': return <Clock className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Aberto': return 'bg-red-100 text-red-800 border-red-200';
      case 'Em Análise': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Aguardando Usuário': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Em Desenvolvimento': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Em Teste': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Resolvido': return 'bg-green-100 text-green-800 border-green-200';
      case 'Fechado': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'Cancelado': return 'bg-gray-100 text-gray-500 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgente': return 'bg-red-100 text-red-800 border-red-200';
      case 'Alta': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Média': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Baixa': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (date: Date) => {
    return format(date, 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  if (!updatedTicket) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-blue-600" />
            Ticket #{updatedTicket.protocol}
          </DialogTitle>
          <DialogDescription>
            {updatedTicket.title}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto space-y-6 max-h-[70vh]">
              {/* Status e Badges */}
              <div className="flex flex-wrap gap-4">
                <Badge className={getStatusColor(updatedTicket.status)}>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(updatedTicket.status)}
                    <span>{updatedTicket.status}</span>
                  </div>
                </Badge>
                <Badge variant="outline" className={getPriorityColor(updatedTicket.priority)}>
                  {updatedTicket.priority}
                </Badge>
                <Badge variant="outline">
                  {updatedTicket.category}
                </Badge>
              </div>

              {/* Informações Principais */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Solicitante
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <strong>Nome:</strong> {updatedTicket.requesterName}
                    </div>
                    <div>
                      <strong>Email:</strong> {updatedTicket.requesterEmail}
                    </div>
                    <div>
                      <strong>Hierarquia:</strong> {updatedTicket.requesterHierarchy}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Datas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <strong>Criado em:</strong> {formatDate(updatedTicket.createdAt)}
                    </div>
                    <div>
                      <strong>Atualizado:</strong> {formatDate(updatedTicket.updatedAt)}
                    </div>
                    {updatedTicket.resolvedAt && (
                      <div>
                        <strong>Resolvido em:</strong> {formatDate(updatedTicket.resolvedAt)}
                      </div>
                    )}
                    {updatedTicket.assignedToName && (
                      <div>
                        <strong>Atribuído para:</strong> {updatedTicket.assignedToName}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Descrição */}
              <Card>
                <CardHeader>
                  <CardTitle>Descrição do Problema</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{updatedTicket.description}</p>
                </CardContent>
              </Card>

              {/* Informações Técnicas */}
              {(updatedTicket.browserInfo || updatedTicket.deviceInfo) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Informações Técnicas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      {updatedTicket.browserInfo && (
                        <>
                          <div><strong>Navegador:</strong> {updatedTicket.browserInfo.browser}</div>
                          <div><strong>Versão:</strong> {updatedTicket.browserInfo.version}</div>
                        </>
                      )}
                      {updatedTicket.deviceInfo && (
                        <>
                          <div><strong>Sistema:</strong> {updatedTicket.deviceInfo.os}</div>
                          <div><strong>Dispositivo:</strong> {updatedTicket.deviceInfo.device}</div>
                          {updatedTicket.deviceInfo.screenResolution && (
                            <div><strong>Resolução:</strong> {updatedTicket.deviceInfo.screenResolution}</div>
                          )}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Anexos e Screenshots */}
              <Card>
                <CardHeader>
                  <CardTitle>Arquivos Anexados</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">

                  {/* Screenshots */}
                  {updatedTicket.screenshots && updatedTicket.screenshots.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-muted-foreground mb-2">Screenshots:</h5>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {updatedTicket.screenshots.map((screenshotUrl, index) => (
                          <div key={index} className="border rounded-lg overflow-hidden">
                            <div className="aspect-video bg-gray-50 flex items-center justify-center">
                              <img 
                                src={screenshotUrl} 
                                alt={`Screenshot ${index + 1}`}
                                className="max-w-full max-h-full object-contain cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => window.open(screenshotUrl, '_blank')}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.innerHTML = `
                                      <div class="flex flex-col items-center justify-center text-gray-500 p-4">
                                        <svg class="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2z"></path>
                                        </svg>
                                        <span class="text-xs">Erro ao carregar imagem</span>
                                      </div>
                                    `;
                                  }
                                }}
                              />
                            </div>
                            <div className="p-2 bg-gray-50">
                              <div className="flex items-center gap-2">
                                <ImageIcon className="w-4 h-4 text-blue-600" />
                                <span className="text-xs truncate">Screenshot {index + 1}</span>
                                <button
                                  onClick={() => window.open(screenshotUrl, '_blank')}
                                  className="ml-auto text-blue-600 hover:text-blue-800 text-xs"
                                >
                                  Ver
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Documentos/Anexos */}
                  {updatedTicket.attachments && updatedTicket.attachments.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-muted-foreground mb-2">Documentos:</h5>
                      <div className="space-y-2">
                        {updatedTicket.attachments.map((attachment, index) => (
                          <div key={index} className="border rounded-lg p-3 text-sm hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-3">
                              <FileText className="w-5 h-5 text-gray-600 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{attachment.originalName || attachment.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {attachment.size ? (attachment.size / 1024 / 1024).toFixed(2) + ' MB' : 'Tamanho desconhecido'}
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = attachment.url;
                                  link.download = attachment.originalName || attachment.name;
                                  link.target = '_blank';
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                }}
                                className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                              >
                                Baixar
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mensagem quando não há arquivos */}
                  {(!updatedTicket.screenshots || updatedTicket.screenshots.length === 0) && 
                   (!updatedTicket.attachments || updatedTicket.attachments.length === 0) && (
                    <div className="text-center text-gray-500 py-8">
                      <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>Nenhum arquivo anexado</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
        

      </DialogContent>
    </Dialog>
  );
}; 