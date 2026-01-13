import React, { useState, useEffect } from 'react';
import { 
  History, 
  MessageCircle, 
  Search, 
  Calendar, 
  User, 
  Bot,
  X,
  RefreshCw,
  Clock,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { messageHistoryService, ConversationThread, MessageHistory } from '@/services/messageHistoryService';
import { auth } from '@/config/firebase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface ConversationHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectThread?: (threadId: string, messages: MessageHistory[]) => void;
}

const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  isOpen,
  onClose,
  onSelectThread
}) => {
  const [threads, setThreads] = useState<ConversationThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<MessageHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showMessagesModal, setShowMessagesModal] = useState(false);

  // Carregar threads do usuário
  const loadUserThreads = async () => {
    if (!auth.currentUser) return;

    try {
      setLoading(true);
      const userThreads = await messageHistoryService.getUserConversationThreads(
        auth.currentUser.uid,
        20
      );
      setThreads(userThreads);
    } catch (error) {
      console.error('Erro ao carregar threads:', error);
      toast.error('Erro ao carregar histórico de conversas');
    } finally {
      setLoading(false);
    }
  };

  // Carregar mensagens de uma thread específica
  const loadThreadMessages = async (threadId: string) => {
    try {
      setLoading(true);
      const messages = await messageHistoryService.getThreadMessages(threadId);
      setThreadMessages(messages);
      setSelectedThread(threadId);
      setShowMessagesModal(true);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      toast.error('Erro ao carregar mensagens da conversa');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar threads baseado no termo de busca
  const filteredThreads = threads.filter(thread =>
    thread.preview.toLowerCase().includes(searchTerm.toLowerCase()) ||
    thread.thread.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Carregar dados ao abrir
  useEffect(() => {
    if (isOpen) {
      loadUserThreads();
    }
  }, [isOpen]);

  // Selecionar thread e fechar modal
  const handleSelectThread = (threadId: string, messages: MessageHistory[]) => {
    if (onSelectThread) {
      onSelectThread(threadId, messages);
    }
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] bg-white/95 dark:bg-gray-900/95 backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <History className="h-5 w-5 text-blue-600" />
              Histórico de Conversas
              <Badge variant="secondary" className="ml-2">
                {threads.length} conversa{threads.length !== 1 ? 's' : ''}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Barra de busca e refresh */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar conversas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={loadUserThreads}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {/* Lista de conversas */}
            <ScrollArea className="h-[400px] border rounded-lg">
              <div className="p-4 space-y-3">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : filteredThreads.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Nenhuma conversa encontrada</p>
                    <p className="text-sm">
                      {searchTerm ? 'Tente um termo diferente' : 'Inicie uma conversa para ver o histórico'}
                    </p>
                  </div>
                ) : (
                  filteredThreads.map((thread) => (
                    <Card
                      key={thread.thread}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-l-4 border-l-blue-500"
                      onClick={() => loadThreadMessages(thread.thread)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <MessageCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
                              <span className="text-xs font-mono text-gray-500 truncate">
                                {thread.thread}
                              </span>
                            </div>
                            
                            <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-2 mb-2">
                              {thread.preview}
                            </p>
                            
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(thread.lastMessageAt, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                              </div>
                              <div className="flex items-center gap-1">
                                <MessageCircle className="h-3 w-3" />
                                {thread.messageCount} mensagem{thread.messageCount !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                          
                          <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Ações */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal para exibir mensagens da thread */}
      <Dialog open={showMessagesModal} onOpenChange={setShowMessagesModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] bg-white/95 dark:bg-gray-900/95 backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <MessageCircle className="h-5 w-5 text-blue-600" />
              Conversa: {selectedThread}
              <Badge variant="secondary" className="ml-2">
                {threadMessages.length} mensagem{threadMessages.length !== 1 ? 's' : ''}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="h-[500px] border rounded-lg">
            <div className="p-4 space-y-4">
              {threadMessages.map((message, index) => (
                <div
                  key={message.id || index}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div className={`max-w-[70%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      {message.role === 'user' ? (
                        <User className="h-3 w-3" />
                      ) : (
                        <Bot className="h-3 w-3" />
                      )}
                      <span className="text-xs font-medium opacity-70">
                        {message.role === 'user' ? 'Você' : 'Assistente'}
                      </span>
                      <span className="text-xs opacity-50">
                        {format(new Date(message.createdAt), 'HH:mm', { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="flex justify-between gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (selectedThread) {
                  handleSelectThread(selectedThread, threadMessages);
                }
              }}
            >
              Continuar Conversa
            </Button>
            <Button variant="outline" onClick={() => setShowMessagesModal(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ConversationHistory; 