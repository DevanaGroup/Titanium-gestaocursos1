import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Brain, Zap, History, RefreshCw, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { messageHistoryService, MessageHistory } from '@/services/messageHistoryService';
import { auth } from '@/config/firebase';
import ConversationHistory from './ConversationHistory';
import { getAssistants, Assistant, DynamicField } from '@/services/assistantService';
import WebhookDataPreview from './WebhookDataPreview';
import { processFiles, validateFileType, validateFileSize, formatFileSize, ProcessedFile } from '@/utils/fileUtils';
import { tessPareto, TessFileResponse } from '@/services/tessPareto';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface CustomChatInterfaceProps {
  assistantId: string;
  assistantName: string;
  aiModel?: string;
}

const CustomChatInterface: React.FC<CustomChatInterfaceProps> = ({
  assistantId,
  assistantName,
  aiModel = 'GPT-4 Turbo'
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentThreadId, setCurrentThreadId] = useState<string>('');
  const [showHistory, setShowHistory] = useState(false);
  const [agentId, setAgentId] = useState<string>('');
  const [currentAssistant, setCurrentAssistant] = useState<Assistant | null>(null);
  const [showChatInput, setShowChatInput] = useState(false);
  const [dynamicData, setDynamicData] = useState<any>(null);
  const [isFirstMessage, setIsFirstMessage] = useState(true);
  const [formData, setFormData] = useState<{[key: string]: any}>({});
  const [fileProcessing, setFileProcessing] = useState<{[key: string]: boolean}>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Inicializar thread ID e buscar agentId quando o componente for carregado
  useEffect(() => {
    if (!currentThreadId) {
      const newThreadId = messageHistoryService.generateThreadId();
      setCurrentThreadId(newThreadId);
    }
  }, []);

  // Buscar dados completos do assistente
  useEffect(() => {
    const fetchAssistant = async () => {
      try {
        const assistants = await getAssistants();
        const assistant = assistants.find(a => a.id === assistantId);
        if (assistant) {
          setCurrentAssistant(assistant);
          setAgentId(assistant.agentId);
          
          // Verificar se precisa mostrar campos dinâmicos ou input de chat
          if (assistant.dynamicFields && assistant.dynamicFields.length > 0) {
            setShowChatInput(false); // Começa com campos dinâmicos
          } else {
            setShowChatInput(true); // Mostra chat input diretamente
            setIsFirstMessage(false); // Não é primeira mensagem se não tem campos dinâmicos
          }
        }
      } catch (error) {
        console.error('Erro ao buscar dados do assistente:', error);
      }
    };

    if (assistantId) {
      fetchAssistant();
    }
  }, [assistantId]);

  // Salvar mensagem no histórico
  const saveMessageToHistory = async (message: Message, dynamicDataToSave?: any) => {
    if (!auth.currentUser || !currentThreadId) return;

    try {
      await messageHistoryService.saveMessage({
        userId: auth.currentUser.uid,
        message: message.text,
        role: message.sender === 'user' ? 'user' : 'assistant',
        thread: currentThreadId,
        agentId: agentId,
        dynamicData: dynamicDataToSave
      });
    } catch (error) {
      console.error('Erro ao salvar mensagem no histórico:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setIsFirstMessage(false);

    // Salvar mensagem do usuário no histórico (incluindo dados dinâmicos se for primeira mensagem)
    await saveMessageToHistory(userMessage, dynamicData);

    // Preparar dados para envio ao webhook com estrutura separada
    const allMessages = [...messages, userMessage];
    const formattedMessages = allMessages.map(msg => ({
      content: msg.text,
      role: msg.sender === 'user' ? 'user' : 'assistant',
      timestamp: msg.timestamp
    }));

    const webhookPayload = {
      data: {
        agentId: currentAssistant?.agentId || agentId,
        thread: currentThreadId,
        assistantId: currentAssistant?.id,
        assistantName: currentAssistant?.name,
        messages: formattedMessages,
        wait_execution: false,
        timestamp: new Date().toISOString()
      },
      form: {
        ...(dynamicData?.form || {}),
        messages: formattedMessages
      }
    };

    console.log('📤 Enviando payload estruturado para webhook:', webhookPayload);

    // Enviar para webhook n8n
    try {
      const response = await fetch('https://devana-tecnologia-n8n.yrd2ng.easypanel.host/webhook-test/f7cdd969-03f4-456d-ac2d-1315ccb2fc24', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload)
      });

      if (response.ok) {
        const webhookResponse = await response.json();
        console.log('✅ Webhook response:', webhookResponse);
      } else {
        console.error('❌ Erro ao enviar para webhook:', response.status);
      }
    } catch (webhookError) {
      console.error('❌ Erro de conexão com webhook:', webhookError);
    }

    // Simular resposta do assistente (em produção, virá do webhook)
    setTimeout(async () => {
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: currentAssistant?.name === 'SEIA-MASTER' 
          ? "Olá! Sou o SEIA-MASTER, especializado em estudos ambientais. Com base nos dados que você forneceu, posso ajudá-lo com análises específicas do seu projeto. Em que posso auxiliar?" 
          : `Como ${assistantName}, posso ajudá-lo com suas necessidades específicas. Esta é uma resposta simulada - em breve será integrado com n8n para automações avançadas.`,
        sender: 'bot',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
      
      // Salvar mensagem do assistente no histórico
      await saveMessageToHistory(botMessage);
      
      setIsLoading(false);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Função para carregar uma conversa do histórico
  const loadConversationFromHistory = (threadId: string, messages: MessageHistory[]) => {
    const convertedMessages: Message[] = messages.map(msg => ({
      id: msg.id || Date.now().toString(),
      text: msg.message,
      sender: msg.role === 'user' ? 'user' : 'bot',
      timestamp: new Date(msg.createdAt)
    }));

    setMessages(convertedMessages);
    setCurrentThreadId(threadId);
    setShowHistory(false);
    toast.success('Conversa carregada com sucesso!');
  };

  // Função para iniciar uma nova conversa
  const startNewConversation = () => {
    const newThreadId = messageHistoryService.generateThreadId();
    setCurrentThreadId(newThreadId);
    setMessages([]);
    setIsFirstMessage(true);
    setDynamicData(null);
    setFormData({}); // Limpar dados do formulário
    
    // Resetar estado do chat input baseado nos campos dinâmicos
    if (currentAssistant?.dynamicFields && currentAssistant.dynamicFields.length > 0) {
      setShowChatInput(false); // Voltar para campos dinâmicos
    } else {
      setShowChatInput(true); // Manter chat input
    }
    
    toast.success('Nova conversa iniciada!');
  };

  // Validar campos obrigatórios
  const validateFormData = () => {
    if (!currentAssistant?.dynamicFields) return true;

    const requiredFields = currentAssistant.dynamicFields.filter(field => field.required);
    const missingFields = requiredFields.filter(field => {
      const fieldValue = formData[field.variableName];
      
      // Para campos de arquivo, verificar se tem conteúdo
      if (field.type === 'file' || field.type === 'multiple-files') {
        return !fieldValue || 
               (Array.isArray(fieldValue) && fieldValue.length === 0) ||
               (typeof fieldValue === 'object' && !fieldValue.name);
      }
      
      // Para outros campos, verificar se não está vazio
      return !fieldValue || fieldValue.trim() === '';
    });

    if (missingFields.length > 0) {
      toast.error(`Campos obrigatórios não preenchidos: ${missingFields.map(f => f.label).join(', ')}`);
      return false;
    }

    return true;
  };

  // Função para lidar com o envio de dados dinâmicos
  const handleDynamicDataSubmit = async () => {
    if (!validateFormData()) return;

    // Verificar se há arquivos para enviar
    const hasFiles = currentAssistant?.dynamicFields?.some(field => 
      (field.type === 'file' || field.type === 'multiple-files') && formData[field.variableName]
    );

    if (hasFiles) {
      if (!tessPareto.isConfigured()) {
        toast.warning('⚠️ API do Tess Pareto não configurada. Usando fallback base64...');
      } else {
        toast.info('📤 Enviando arquivos para Tess Pareto...');
      }
    }

    // Formatar dados do formulário no padrão da API (lowercase)
    const formattedFormData: any = {};
    
    if (currentAssistant?.dynamicFields) {
      for (const field of currentAssistant.dynamicFields) {
        const fieldValue = formData[field.variableName];
        if (fieldValue) {
          // Converter variableName para lowercase para a API
          const apiFieldName = field.variableName.toLowerCase();
          
          // Formatação especial para arquivos
          if (field.type === 'file' || field.type === 'multiple-files') {
                          try {
                if (tessPareto.isConfigured()) {
                  // Enviar para Tess Pareto se configurado
                  if (Array.isArray(fieldValue)) {
                    // Múltiplos arquivos - fazer upload e processar
                    const uploadedFiles: TessFileResponse[] = [];
                    for (const fileData of fieldValue) {
                      if (fileData.file) {
                        console.log(`🔄 Enviando arquivo: ${fileData.file.name}`);
                        const uploadResult = await tessPareto.uploadAndProcessFile(fileData.file, true);
                        uploadedFiles.push(uploadResult.file);
                        console.log(`✅ Arquivo enviado e processado: ${uploadResult.file.filename} (ID: ${uploadResult.file.id})`);
                        if (uploadResult.processResult) {
                          console.log(`📋 Resultado do processamento:`, uploadResult.processResult);
                        }
                      }
                    }
                    formattedFormData[apiFieldName] = uploadedFiles;
                  } else {
                    // Arquivo único - fazer upload e processar
                    if (fieldValue.file) {
                      console.log(`🔄 Enviando arquivo: ${fieldValue.file.name}`);
                      const uploadResult = await tessPareto.uploadAndProcessFile(fieldValue.file, true);
                      formattedFormData[apiFieldName] = uploadResult.file;
                      console.log(`✅ Arquivo enviado e processado: ${uploadResult.file.filename} (ID: ${uploadResult.file.id})`);
                      if (uploadResult.processResult) {
                        console.log(`📋 Resultado do processamento:`, uploadResult.processResult);
                      }
                    }
                  }
                } else {
                // Fallback: usar base64 se Tess Pareto não configurado
                if (Array.isArray(fieldValue)) {
                  // Múltiplos arquivos
                  formattedFormData[apiFieldName] = fieldValue.map(file => ({
                    name: file.name,
                    content: file.content,
                    type: file.type,
                    size: file.size
                  }));
                } else {
                  // Arquivo único
                  formattedFormData[apiFieldName] = {
                    name: fieldValue.name,
                    content: fieldValue.content,
                    type: fieldValue.type,
                    size: fieldValue.size
                  };
                }
              }
            } catch (error) {
              console.error('❌ Erro ao fazer upload para Tess Pareto:', error);
              toast.error(`Erro ao enviar arquivo: ${error}`);
              
              // Fallback para base64 em caso de erro
              console.log('🔄 Usando fallback base64...');
              if (Array.isArray(fieldValue)) {
                formattedFormData[apiFieldName] = fieldValue.map(file => ({
                  name: file.name,
                  content: file.content,
                  type: file.type,
                  size: file.size
                }));
              } else {
                formattedFormData[apiFieldName] = {
                  name: fieldValue.name,
                  content: fieldValue.content,
                  type: fieldValue.type,
                  size: fieldValue.size
                };
              }
            }
          } else {
            // Outros tipos de campo
            formattedFormData[apiFieldName] = fieldValue;
          }
        }
      }
    }

    // Estrutura separada: data (sistema) e form (formulário no modelo solicitado)
    const initialMessages = [
      {
        content: "Dados iniciais coletados para elaboração de estudo ambiental",
        role: "user"
      }
    ];

    // Extrair file_ids dos arquivos enviados ao Tess Pareto
    const fileIds: number[] = [];
    Object.values(formattedFormData).forEach(value => {
      if (value && typeof value === 'object') {
        if (Array.isArray(value)) {
          // Múltiplos arquivos
          value.forEach(item => {
            if (item && typeof item === 'object' && 'id' in item && typeof item.id === 'number') {
              fileIds.push(item.id);
            }
          });
        } else if ('id' in value && typeof value.id === 'number') {
          // Arquivo único
          fileIds.push(value.id);
        }
      }
    });

    // Converter arquivos para formato simplificado (nome do arquivo ou ID)
    const processedFormData = { ...formattedFormData };
    Object.keys(processedFormData).forEach(key => {
      const value = processedFormData[key];
      if (value && typeof value === 'object') {
        if (Array.isArray(value)) {
          // Múltiplos arquivos - usar apenas nome do primeiro arquivo
          const firstFile = value[0];
          if (firstFile && typeof firstFile === 'object') {
            processedFormData[key] = ('filename' in firstFile ? firstFile.filename : 
                                   'name' in firstFile ? firstFile.name : 'arquivo.pdf') as string;
          }
        } else {
          // Arquivo único - usar nome do arquivo
          processedFormData[key] = ('filename' in value ? value.filename : 
                                 'name' in value ? value.name : 'arquivo.pdf') as string;
        }
      }
    });

    const payload = {
      data: {
        agentId: currentAssistant?.agentId || agentId,
        thread: currentThreadId,
        assistantId: currentAssistant?.id,
        assistantName: currentAssistant?.name,
        messages: initialMessages,
        wait_execution: false,
        timestamp: new Date().toISOString()
      },
      form: {
        ...processedFormData,
        messages: initialMessages,
        file_ids: fileIds,
        wait_execution: false
      }
    };

    console.log('📤 Payload estruturado para API:', payload);
    
    // Enviar dados iniciais para webhook
    try {
      const response = await fetch('https://devana-tecnologia-n8n.yrd2ng.easypanel.host/webhook-test/f7cdd969-03f4-456d-ac2d-1315ccb2fc24', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
                 body: JSON.stringify(payload)
       });

       if (response.ok) {
         const webhookResponse = await response.json();
         console.log('✅ Dados dinâmicos enviados com sucesso:', webhookResponse);
       } else {
         console.error('❌ Erro ao enviar dados dinâmicos:', response.status);
       }
     } catch (error) {
       console.error('❌ Erro de conexão com webhook:', error);
     }
     
     setDynamicData(payload);
     setShowChatInput(true); // Mostrar chat input após envio dos dados
     setIsFirstMessage(false);

     // Salvar dados dinâmicos no histórico (primeira interação)
     const dataMessage: Message = {
       id: Date.now().toString(),
       text: 'Dados iniciais coletados para estudo ambiental',
       sender: 'user',
       timestamp: new Date()
     };

     saveMessageToHistory(dataMessage, payload);

     toast.success(`✅ Dados enviados com sucesso! ${Object.keys(formattedFormData).length} campos coletados.`);
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-gray-900 dark:via-blue-950/20 dark:to-indigo-950/30">
      {/* Header do chat personalizado */}
      <div className="relative overflow-hidden flex-shrink-0">
        <div className="absolute inset-0 bg-gradient-to-r from-cerrado-green1/20 via-blue-500/10 to-purple-500/10 backdrop-blur-sm"></div>
        <div className="relative p-4 border-b border-white/20 backdrop-blur-md bg-white/60 dark:bg-gray-900/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-cerrado-green1 to-blue-600 rounded-xl blur-md opacity-50 animate-pulse"></div>
                <div className="relative p-3 rounded-xl bg-gradient-to-r from-cerrado-green1 to-blue-600 shadow-xl">
                  <Brain className="h-6 w-6 text-white drop-shadow-lg" />
                  <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-ping"></div>
                </div>
              </div>
              
              <div className="space-y-0.5">
                <h2 className="text-xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 dark:from-white dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent">
                  {assistantName}
                </h2>

              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistory(true)}
                className="flex items-center gap-1"
              >
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">Histórico</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={startNewConversation}
                className="flex items-center gap-1"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">Nova</span>
              </Button>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-600 dark:text-green-400 font-medium">Online</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Área de mensagens */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 max-w-4xl mx-auto">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.sender === 'bot' && (
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cerrado-green1 to-blue-600 flex items-center justify-center">
                    <Brain className="h-4 w-4 text-white" />
                  </div>
                </div>
              )}
              
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                  message.sender === 'user'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                    : 'bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-white/20 dark:border-gray-700/30 text-gray-900 dark:text-white'
                }`}
              >
                <p className="text-sm leading-relaxed">{message.text}</p>
                <div className="flex justify-end mt-1">
                  <span className={`text-xs ${
                    message.sender === 'user' 
                      ? 'text-blue-100' 
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {message.timestamp.toLocaleTimeString('pt-BR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
              </div>
              
              {message.sender === 'user' && (
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-gray-600 to-gray-800 flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cerrado-green1 to-blue-600 flex items-center justify-center">
                  <Brain className="h-4 w-4 text-white animate-pulse" />
                </div>
              </div>
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-white/20 dark:border-gray-700/30 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input de mensagem ou formulário dinâmico */}
      <div className="border-t border-white/20 backdrop-blur-md bg-white/60 dark:bg-gray-900/60">
        {showChatInput ? (
          // Input de chat normal
          <div className="p-4">
            <div className="max-w-4xl mx-auto">
              <div className="relative">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={`Converse com ${assistantName}...`}
                  className="pr-12 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-white/30 dark:border-gray-700/30 focus:border-cerrado-green1/50 dark:focus:border-cerrado-green1/50 rounded-xl"
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-cerrado-green1 to-blue-600 hover:from-cerrado-green1/90 hover:to-blue-600/90 text-white rounded-lg h-8 w-8 p-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center justify-center mt-2">
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  <Sparkles className="h-3 w-3 inline mr-1" />
                  Assistente personalizado • Integração n8n em breve
                </p>
              </div>
            </div>
          </div>
        ) : (
          // Formulário de coleta de dados dinâmicos
          currentAssistant?.dynamicFields && (
            <div className="p-6">
              <div className="max-w-4xl mx-auto">
                <div className="mb-6 text-center">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2 flex items-center justify-center gap-2">
                    <Send className="h-5 w-5 text-blue-600" />
                    Configure os Dados Iniciais
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Preencha as informações necessárias para iniciar uma conversa otimizada com <strong>{assistantName}</strong>
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {currentAssistant.dynamicFields.map((field) => {
                    const fieldValue = formData[field.variableName] || '';
                    
                    switch (field.type) {
                      case 'text':
                        return (
                          <div key={field.id} className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {field.label}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            {field.description && (
                              <p className="text-xs text-gray-500">{field.description}</p>
                            )}
                            <Input
                              placeholder={field.placeholder}
                              value={fieldValue}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                [field.variableName]: e.target.value
                              }))}
                              className="bg-white/80 dark:bg-gray-800/80"
                            />
                          </div>
                        );
                      
                      case 'textarea':
                        return (
                          <div key={field.id} className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {field.label}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            {field.description && (
                              <p className="text-xs text-gray-500">{field.description}</p>
                            )}
                            <textarea
                              placeholder={field.placeholder}
                              value={fieldValue}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                [field.variableName]: e.target.value
                              }))}
                              rows={3}
                              className="w-full px-3 py-2 bg-white/80 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                          </div>
                        );
                      
                      case 'dropdown':
                        return (
                          <div key={field.id} className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {field.label}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            {field.description && (
                              <p className="text-xs text-gray-500">{field.description}</p>
                            )}
                            <select 
                              value={fieldValue}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                [field.variableName]: e.target.value
                              }))}
                              className="w-full px-3 py-2 bg-white/80 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            >
                              <option value="">Selecione uma opção...</option>
                              {field.options?.map((option, index) => (
                                <option key={index} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      
                      case 'file':
                      case 'multiple-files':
                        const isProcessing = fileProcessing[field.variableName];
                        
                        return (
                          <div key={field.id} className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {field.label}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            {field.description && (
                              <p className="text-xs text-gray-500">{field.description}</p>
                            )}
                            <div className={`border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors ${isProcessing ? 'bg-blue-50 border-blue-300' : ''}`}>
                              <input
                                type="file"
                                multiple={field.type === 'multiple-files'}
                                accept={field.validation?.fileTypes?.join(',')}
                                disabled={isProcessing}
                                onChange={async (e) => {
                                  const files = Array.from(e.target.files || []);
                                  
                                  if (files.length === 0) {
                                    setFormData(prev => ({
                                      ...prev,
                                      [field.variableName]: ''
                                    }));
                                    return;
                                  }

                                  // Indicar que está processando
                                  setFileProcessing(prev => ({
                                    ...prev,
                                    [field.variableName]: true
                                  }));

                                  try {
                                    // Validar arquivos antes do processamento
                                    for (const file of files) {
                                      // Validar tipo de arquivo
                                      if (field.validation?.fileTypes) {
                                        if (!validateFileType(file, field.validation.fileTypes)) {
                                          toast.error(`Arquivo ${file.name} não é do tipo permitido. Tipos aceitos: ${field.validation.fileTypes.join(', ')}`);
                                          setFileProcessing(prev => ({
                                            ...prev,
                                            [field.variableName]: false
                                          }));
                                          return;
                                        }
                                      }

                                      // Validar tamanho do arquivo (padrão 200MB)
                                      const maxSizeMB = field.validation?.maxFileSize || 200;
                                      if (!validateFileSize(file, maxSizeMB)) {
                                        toast.error(`Arquivo ${file.name} é muito grande. Tamanho máximo: ${maxSizeMB}MB (atual: ${formatFileSize(file.size)})`);
                                        setFileProcessing(prev => ({
                                          ...prev,
                                          [field.variableName]: false
                                        }));
                                        return;
                                      }
                                    }

                                    // Processar arquivos
                                    const processedFiles = await processFiles(files);
                                    
                                    setFormData(prev => ({
                                      ...prev,
                                      [field.variableName]: field.type === 'multiple-files' ? processedFiles : processedFiles[0]
                                    }));

                                    toast.success(`${files.length} arquivo(s) processado(s) com sucesso!`);

                                  } catch (error) {
                                    console.error('Erro ao processar arquivos:', error);
                                    toast.error(`Erro ao processar arquivos: ${error}`);
                                    
                                    // Limpar dados em caso de erro
                                    setFormData(prev => ({
                                      ...prev,
                                      [field.variableName]: ''
                                    }));
                                  } finally {
                                    // Parar indicador de processamento
                                    setFileProcessing(prev => ({
                                      ...prev,
                                      [field.variableName]: false
                                    }));
                                  }
                                }}
                                className="hidden"
                                id={field.id}
                              />
                              <label htmlFor={field.id} className={`cursor-pointer ${isProcessing ? 'pointer-events-none' : ''}`}>
                                {isProcessing ? (
                                  <div className="flex flex-col items-center gap-2">
                                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                                    <p className="text-sm text-blue-600 font-medium">
                                      Processando arquivo(s)...
                                    </p>
                                  </div>
                                ) : (
                                  <>
                                    <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                    <p className="text-sm text-gray-600">
                                      Clique para selecionar {field.type === 'multiple-files' ? 'arquivos' : 'arquivo'}
                                    </p>
                                    {field.validation?.fileTypes && (
                                      <p className="text-xs text-gray-500 mt-1">
                                        Tipos aceitos: {field.validation.fileTypes.join(', ')}
                                      </p>
                                    )}
                                    {field.validation?.maxFileSize && (
                                      <p className="text-xs text-gray-500">
                                        Tamanho máximo: {field.validation.maxFileSize}MB
                                      </p>
                                    )}
                                  </>
                                )}
                              </label>
                              {fieldValue && !isProcessing && (
                                <div className="mt-2 space-y-1">
                                  {Array.isArray(fieldValue) ? (
                                    fieldValue.map((file: ProcessedFile, index: number) => (
                                      <div key={index} className="flex items-center justify-between text-xs bg-green-50 p-2 rounded">
                                        <span className="text-green-700 font-medium">{file.name}</span>
                                        <div className="flex items-center gap-2">
                                          <span className="text-green-600">
                                            {formatFileSize(file.size)}
                                          </span>
                                          <Badge variant="secondary" className="text-xs">
                                            Base64
                                          </Badge>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="flex items-center justify-between text-xs bg-green-50 p-2 rounded">
                                      <span className="text-green-700 font-medium">{fieldValue.name}</span>
                                      <div className="flex items-center gap-2">
                                        <span className="text-green-600">
                                          {formatFileSize(fieldValue.size)}
                                        </span>
                                        <Badge variant="secondary" className="text-xs">
                                          Base64
                                        </Badge>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      
                      default:
                        return null;
                    }
                  })}
                </div>
                
                                {/* Preview dos dados se houver algum preenchido */}
                {Object.keys(formData).length > 0 && (
                  <div className="mt-6">
                    <WebhookDataPreview 
                      data={{
                        data: {
                          agentId: currentAssistant?.agentId || agentId,
                          thread: currentThreadId,
                          assistantId: currentAssistant?.id,
                          assistantName: currentAssistant?.name,
                          messages: [{ role: "user", content: "Dados iniciais coletados..." }],
                          wait_execution: false,
                          timestamp: new Date().toISOString()
                        },
                        form: {
                          ...formData,
                          messages: [{ role: "user", content: "Dados iniciais coletados..." }],
                          file_ids: [73325, 73326], // IDs de exemplo
                          wait_execution: false
                        }
                      }}
                      title="Preview do Payload para Webhook (data + form)"
                    />
                  </div>
                )}
                
                <div className="flex justify-center mt-8">
                  <Button
                    onClick={handleDynamicDataSubmit}
                    disabled={currentAssistant?.dynamicFields?.filter(f => f.required).some(f => !formData[f.variableName])}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    Enviar Dados e Iniciar Conversa
                    <Sparkles className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )
        )}
      </div>

      {/* Componente de histórico */}
      <ConversationHistory
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        onSelectThread={loadConversationFromHistory}
      />
    </div>
  );
};

export default CustomChatInterface; 