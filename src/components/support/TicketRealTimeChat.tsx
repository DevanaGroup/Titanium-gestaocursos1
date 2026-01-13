import React, { useState, useEffect, useRef, useCallback } from 'react';
import { auth, db, storage } from '@/config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  doc,
  getDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

// Icons
import { 
  Send, 
  MessageCircle, 
  Loader2, 
  Clock, 
  CheckCheck,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Download,
  X
} from 'lucide-react';

// Types
import { SupportTicket } from '@/types/support';

interface ChatAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

interface ChatMessage {
  id: string;
  ticketId: string;
  message: string;
  senderId: string;
  senderName: string;
  senderRole: 'user' | 'support';
  timestamp: Date;
  read: boolean;
  attachments?: ChatAttachment[];
}

interface TicketRealTimeChatProps {
  ticket: SupportTicket;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TicketRealTimeChat: React.FC<TicketRealTimeChatProps> = ({
  ticket,
  open,
  onOpenChange
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [supportUser, setSupportUser] = useState<any>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll automático para a última mensagem
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Carregar usuário de suporte (Diretor de TI)
  const loadSupportUser = useCallback(async () => {
    try {
      if (ticket.assignedTo) {
        const supportDoc = await getDoc(doc(db, 'collaborators_unified', ticket.assignedTo));
        if (supportDoc.exists()) {
          setSupportUser({
            id: supportDoc.id,
            ...supportDoc.data()
          });
        }
      }
    } catch (error) {
      console.error('Erro ao carregar usuário de suporte:', error);
    }
  }, [ticket.assignedTo]);

  // Verificar autenticação e carregar dados do usuário
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        
        try {
          // Buscar dados do usuário atual
          const userDoc = await getDoc(doc(db, 'collaborators_unified', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserRole(userData.hierarchyLevel || '');
          }

          // Buscar Diretor de TI para o chat
          await loadSupportUser();
        } catch (error) {
          console.error('Erro ao buscar dados:', error);
        }
      }
    });

    return () => unsubscribe();
  }, [ticket.assignedTo, loadSupportUser]);

  // Configurar listener para mensagens em tempo real
  useEffect(() => {
    if (!ticket.id || !open) return;

    const chatRef = collection(db, 'supportTickets', ticket.id, 'chatMessages');
    const q = query(chatRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages: ChatMessage[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        newMessages.push({
          id: doc.id,
          ticketId: ticket.id,
          message: data.message,
          senderId: data.senderId,
          senderName: data.senderName,
          senderRole: data.senderRole,
          timestamp: data.timestamp?.toDate() || new Date(),
          read: data.read || false,
          attachments: data.attachments || []
        });
      });

      setMessages(newMessages);
      setIsLoading(false);
    }, (error) => {
      console.error('Erro ao escutar mensagens:', error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [ticket.id, open]);

  // Enviar mensagem
  const sendMessage = async () => {
    if ((!newMessage.trim() && selectedFiles.length === 0) || !currentUser || isSending) return;

    try {
      setIsSending(true);
      setIsUploading(true);

      const isUserSupport = ['Diretor de TI', 'Presidente'].includes(userRole);
      
      // Upload dos arquivos selecionados
      let attachments: ChatAttachment[] = [];
      if (selectedFiles.length > 0) {
        toast.info('Enviando arquivos...');
        
        for (const file of selectedFiles) {
          try {
            const attachment = await uploadFile(file);
            attachments.push(attachment);
          } catch (error) {
            console.error('Erro ao fazer upload do arquivo:', file.name, error);
            toast.error(`Erro ao enviar arquivo: ${file.name}`);
          }
        }
      }
      
      const messageData = {
        ticketId: ticket.id,
        message: newMessage.trim() || (attachments.length > 0 ? '' : ''),
        senderId: currentUser.uid,
        senderName: currentUser.displayName || currentUser.email || 'Usuário',
        senderRole: isUserSupport ? 'support' : 'user',
        timestamp: serverTimestamp(),
        read: false,
        ...(attachments.length > 0 && { attachments })
      };

      const chatRef = collection(db, 'supportTickets', ticket.id, 'chatMessages');
      await addDoc(chatRef, messageData);

      setNewMessage('');
      setSelectedFiles([]);
      toast.success(attachments.length > 0 ? 'Mensagem e arquivos enviados!' : 'Mensagem enviada!');

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setIsSending(false);
      setIsUploading(false);
    }
  };

  // Handle enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Simular indicador de digitação
  const handleTyping = () => {
    setIsTyping(true);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1000);
  };

  const formatMessageTime = (date: Date) => {
    return format(date, 'HH:mm', { locale: ptBR });
  };

  const formatMessageDate = (date: Date) => {
    return format(date, "dd 'de' MMMM", { locale: ptBR });
  };

  // Agrupar mensagens por data
  const groupMessagesByDate = (messages: ChatMessage[]) => {
    const groups: { [key: string]: ChatMessage[] } = {};
    
    messages.forEach(message => {
      const dateKey = format(message.timestamp, 'yyyy-MM-dd');
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });
    
    return groups;
  };

  const messageGroups = groupMessagesByDate(messages);
  const isCurrentUserSupport = ['Diretor de TI', 'Presidente'].includes(userRole);

  // Upload de arquivo para Firebase Storage
  const uploadFile = async (file: File): Promise<ChatAttachment> => {
    const fileName = `chat_${ticket.id}_${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `support-chat/${ticket.id}/${fileName}`);
    
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    return {
      id: `att_${Date.now()}`,
      name: file.name,
      url: downloadURL,
      type: file.type,
      size: file.size
    };
  };

  // Manipular seleção de arquivos
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => {
      // Verificar tamanho (máximo 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`Arquivo "${file.name}" é muito grande. Máximo 10MB.`);
        return false;
      }
      return true;
    });

    setSelectedFiles(prev => [...prev, ...validFiles]);
    
    // Limpar input
    if (event.target) {
      event.target.value = '';
    }
  };

  // Remover arquivo selecionado
  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Formatar tamanho do arquivo
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Se não está aberto, não renderizar nada
  if (!open) return null;

  // Renderização direta (sem modal)
  return (
    <div className="flex flex-col h-full bg-white rounded-lg border">
      {/* Header do Chat */}
      <div className="flex-shrink-0 border-b p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-full">
            <MessageCircle className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold">Chat de Suporte - #{ticket.protocol}</h3>
            <p className="text-sm text-muted-foreground">
              {ticket.title}
            </p>
          </div>
        </div>
        
        {/* Status do chat */}
        <div className="flex items-center gap-4 mt-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Chat Ativo
          </Badge>
          
          {supportUser && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Avatar className="w-6 h-6">
                <AvatarImage src={supportUser.avatar} />
                <AvatarFallback className="text-xs">
                  {supportUser.name?.charAt(0) || 'S'}
                </AvatarFallback>
              </Avatar>
              <span>Suporte: {supportUser.name || ticket.assignedToName || 'Diretor de TI'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Área de mensagens */}
      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="ml-2">Carregando mensagens...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(messageGroups).map(([dateKey, dayMessages]) => (
              <div key={dateKey}>
                {/* Separador de data */}
                <div className="flex items-center justify-center my-4">
                  <div className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
                    {formatMessageDate(dayMessages[0].timestamp)}
                  </div>
                </div>
                
                {/* Mensagens do dia */}
                {dayMessages.map((message) => {
                  const isFromCurrentUser = message.senderId === currentUser?.uid;
                  const isFromSupport = message.senderRole === 'support';
                  
                  return (
                    <div
                      key={message.id}
                      className={`flex gap-3 mb-4 ${isFromCurrentUser ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isFromCurrentUser && (
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarImage src={isFromSupport ? supportUser?.avatar : undefined} />
                          <AvatarFallback className="text-xs">
                            {isFromSupport ? 'TI' : message.senderName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      
                      <div className={`max-w-[70%] ${isFromCurrentUser ? 'text-right' : 'text-left'}`}>
                        <div
                          className={`inline-block p-3 rounded-2xl ${
                            isFromCurrentUser
                              ? 'bg-blue-600 text-white'
                              : isFromSupport
                              ? 'bg-green-100 text-green-800 border border-green-200'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {!isFromCurrentUser && (
                            <div className="text-xs font-medium mb-1 opacity-70">
                              {message.senderName} {isFromSupport && '(Suporte)'}
                            </div>
                          )}
                          
                          {message.message && (
                            <p className="whitespace-pre-wrap mb-2">{message.message}</p>
                          )}
                          
                          {/* Anexos */}
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="space-y-2">
                              {message.attachments.map((attachment) => (
                                <div key={attachment.id} className="flex items-center gap-2 p-2 bg-white/10 rounded-lg">
                                  {attachment.type.startsWith('image/') ? (
                                    <div className="flex items-center gap-2">
                                      <ImageIcon className="w-4 h-4" />
                                      <img 
                                        src={attachment.url} 
                                        alt={attachment.name}
                                        className="max-w-48 max-h-32 rounded cursor-pointer hover:opacity-80"
                                        onClick={() => window.open(attachment.url, '_blank')}
                                      />
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 min-w-0">
                                      <FileText className="w-4 h-4 flex-shrink-0" />
                                      <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium truncate">{attachment.name}</p>
                                        <p className="text-xs opacity-70">{formatFileSize(attachment.size)}</p>
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 w-6 p-0 hover:bg-white/20"
                                        onClick={() => window.open(attachment.url, '_blank')}
                                      >
                                        <Download className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div className={`text-xs text-muted-foreground mt-1 flex items-center gap-1 ${
                          isFromCurrentUser ? 'justify-end' : 'justify-start'
                        }`}>
                          <Clock className="w-3 h-3" />
                          {formatMessageTime(message.timestamp)}
                          {isFromCurrentUser && (
                            <CheckCheck className="w-3 h-3 text-blue-500" />
                          )}
                        </div>
                      </div>
                      
                      {isFromCurrentUser && (
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarImage src={currentUser?.photoURL} />
                          <AvatarFallback className="text-xs">
                            {currentUser?.displayName?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
            
            {/* Indicador de digitação */}
            {isTyping && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span>Suporte está digitando...</span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input de nova mensagem */}
      <div className="flex-shrink-0 border-t p-4">
        {/* Arquivos selecionados */}
        {selectedFiles.length > 0 && (
          <div className="mb-3 p-3 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium mb-2">Arquivos selecionados:</div>
            <div className="space-y-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-white rounded border">
                  {file.type.startsWith('image/') ? (
                    <ImageIcon className="w-4 h-4 text-blue-500" />
                  ) : (
                    <FileText className="w-4 h-4 text-gray-500" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => removeSelectedFile(index)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <div className="flex gap-1">
            {/* Botão de anexar arquivo */}
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSending}
              title="Anexar arquivo"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            
            {/* Input de arquivo oculto */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt,.zip,.rar"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          <Input
            placeholder="Digite sua mensagem..."
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            onKeyPress={handleKeyPress}
            disabled={isSending}
            className="flex-1"
          />
          
          <Button 
            onClick={sendMessage} 
            disabled={(!newMessage.trim() && selectedFiles.length === 0) || isSending}
            size="icon"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          {isUploading ? (
            'Enviando arquivos...'
          ) : isCurrentUserSupport ? (
            'Você está no modo suporte - suas mensagens serão destacadas'
          ) : (
            'Conectado com o suporte técnico - resposta em tempo real'
          )}
        </div>
        
        <div className="text-xs text-gray-400 mt-1">
          Formatos aceitos: Imagens, PDF, DOC, TXT, ZIP • Máximo 10MB por arquivo
        </div>
      </div>
    </div>
  );
};