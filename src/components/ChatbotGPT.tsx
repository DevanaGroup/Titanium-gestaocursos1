import { useState, useRef, useEffect } from "react";
import { Send, User, Bot, Trash2, Loader2, History, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { collection, getDocs, query, doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/config/firebase";
import OpenAI from "openai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { messageHistoryService, MessageHistory } from '@/services/messageHistoryService';
import ConversationHistory from './ConversationHistory';

interface Message {
  id: string;
  content: string;
  sender: "user" | "bot";
  timestamp: Date;
}

interface Client {
  id: string;
  name: string;
  project: string;
  status: string;
  lastUpdate: string;
  contactName: string;
  email: string;
  phone: string;
  logoUrl: string;
  documents: Document[];
}

interface Document {
  id: string;
  name: string;
  url: string;
  uploadDate: string;
  categoriaId?: string;
  categoriaNome?: string;
  subCategoriaId?: string;
  subCategoriaNome?: string;
  content?: string;
}

const ChatbotGPT = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      content: "Olá! Sou o assistente virtual da Cerrado Assessoria. Como posso ajudá-lo hoje?",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);

  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string>('');
  const [showHistory, setShowHistory] = useState(false);

  const [typingText, setTypingText] = useState("");
  const [currentMessage, setCurrentMessage] = useState<Message | null>(null);

  // Inicializar OpenAI (use variáveis de ambiente)
  const openai = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY || "",
    dangerouslyAllowBrowser: true
  });

  // Carregar dados do sistema
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Buscar clientes
        const clientsCollection = collection(db, "clients");
        const clientsSnapshot = await getDocs(clientsCollection);
        const clientsList = clientsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            project: data.project,
            status: data.status,
            lastUpdate: data.lastUpdate,
            contactName: data.contactName,
            email: data.email,
            phone: data.phone,
            logoUrl: data.logoUrl,
            documents: data.documents || []
          };
        });
        setClients(clientsList);

        // Extrair todos os documentos
        const allDocuments: Document[] = [];
        clientsList.forEach(client => {
          if (client.documents) {
            allDocuments.push(...client.documents);
          }
        });
        setDocuments(allDocuments);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        toast.error("Não foi possível carregar os dados do sistema");
      }
    };

    fetchData();
  }, []);

  // Inicializar thread ID quando o componente for carregado
  useEffect(() => {
    if (!currentThreadId) {
      const newThreadId = messageHistoryService.generateThreadId();
      setCurrentThreadId(newThreadId);
    }
  }, []);

  // Salvar mensagem no histórico
  const saveMessageToHistory = async (message: Message) => {
    if (!auth.currentUser || !currentThreadId) return;

    try {
      await messageHistoryService.saveMessage({
        userId: auth.currentUser.uid,
        message: message.content,
        role: message.sender === 'user' ? 'user' : 'assistant',
        thread: currentThreadId,
        agentId: 'chatbot-principal-agent' // Agent ID fixo para o chatbot principal
      });
    } catch (error) {
      console.error('Erro ao salvar mensagem no histórico:', error);
    }
  };

  // Função para rolar para a última mensagem
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Rolar para baixo quando:
  // 1. Novas mensagens são adicionadas
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 2. O texto de digitação é atualizado
  useEffect(() => {
    scrollToBottom();
  }, [typingText]);

  // 3. O estado de digitação muda
  useEffect(() => {
    scrollToBottom();
  }, [isBotTyping]);

  // Função para simular digitação
  const typeMessage = (text: string, onComplete: () => void) => {
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex <= text.length) {
        setTypingText(text.substring(0, currentIndex));
        currentIndex++;
        scrollToBottom(); // Rolar durante a digitação
      } else {
        clearInterval(interval);
        onComplete();
      }
    }, 20);
  };

  // Função para buscar o conteúdo de um documento específico
  const buscarConteudoDocumento = async (documentoId: string, clienteId: string): Promise<string> => {
    try {
      const clienteRef = doc(db, "clients", clienteId);
      const clienteSnap = await getDoc(clienteRef);
      
      if (!clienteSnap.exists()) {
        throw new Error("Cliente não encontrado");
      }
      
      const clienteData = clienteSnap.data();
      const documento = clienteData.documents.find((doc: any) => doc.id === documentoId);
      
      if (!documento) {
        throw new Error("Documento não encontrado");
      }
      
      return documento.content || "";
    } catch (error) {
      console.error("Erro ao buscar conteúdo do documento:", error);
      return "";
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    // Criar nova mensagem do usuário
    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue.trim(),
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    setIsBotTyping(true);

    // Salvar mensagem do usuário no histórico
    await saveMessageToHistory(userMessage);

    try {
      // Preparar contexto para a IA
      const systemContext = `
        Você é um assistente virtual da Cerrado Assessoria, especializado em ajudar com informações sobre clientes e documentos.
        
        Dados disponíveis:
        - Clientes: ${JSON.stringify(clients)}
        - Documentos: ${JSON.stringify(documents)}
        
        Suas respostas devem ser:
        1. Precisas e baseadas nos dados disponíveis
        2. Úteis e diretas
        3. Em português
        4. Sem mencionar que você é uma IA
        5. Sem mencionar os dados brutos que você recebeu
        6. Use markdown para formatar suas respostas

        Se o usuário fizer uma pergunta específica sobre o conteúdo de um documento, responda:
        "Vou buscar o conteúdo específico deste documento para você. Um momento..."
      `;

      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          { role: "system", content: systemContext },
          { role: "user", content: userMessage.content }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      let aiResponse = completion.choices[0].message.content;

      // Verificar se a resposta indica necessidade de buscar conteúdo específico
      if (aiResponse?.includes("Vou buscar o conteúdo específico")) {
        // Extrair informações do documento mencionado
        const documentoMatch = userMessage.content.match(/documento\s+([^,\.\?]+)/i);
        const clienteMatch = userMessage.content.match(/cliente\s+([^,\.\?]+)/i);

        if (documentoMatch && clienteMatch) {
          const documentoNome = documentoMatch[1].trim();
          const clienteNome = clienteMatch[1].trim();

          // Encontrar o documento e cliente correspondentes
          const cliente = clients.find(c => c.name.toLowerCase().includes(clienteNome.toLowerCase()));
          if (cliente) {
            const documento = cliente.documents.find(d => d.name.toLowerCase().includes(documentoNome.toLowerCase()));
            if (documento) {
              // Buscar o conteúdo específico do documento
              const conteudo = await buscarConteudoDocumento(documento.id, cliente.id);
              
              // Fazer uma nova consulta à IA com o conteúdo específico
              const completionComConteudo = await openai.chat.completions.create({
                model: "gpt-4-turbo-preview",
                messages: [
                  { role: "system", content: systemContext },
                  { role: "user", content: `Com base no conteúdo do documento "${documento.name}" do cliente "${cliente.name}", responda: ${userMessage.content}\n\nConteúdo do documento:\n${conteudo}` }
                ],
                temperature: 0.7,
                max_tokens: 1000
              });

              aiResponse = completionComConteudo.choices[0].message.content;
            }
          }
        }
      }

      // Criar mensagem do bot
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponse || "Desculpe, não consegui processar sua solicitação.",
        sender: "bot",
        timestamp: new Date(),
      };

      setCurrentMessage(botMessage);
      setTypingText("");

      // Simular digitação
      typeMessage(botMessage.content, async () => {
        setMessages((prev) => [...prev, botMessage]);
        setCurrentMessage(null);
        setTypingText("");
        setIsBotTyping(false);
        
        // Salvar mensagem do bot no histórico
        await saveMessageToHistory(botMessage);
      });

    } catch (error) {
      console.error("Erro ao gerar resposta:", error);
      toast.error("Ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.");
      setIsBotTyping(false);
    } finally {
      setIsLoading(false);
    }
  };

  const clearConversation = () => {
    const newThreadId = messageHistoryService.generateThreadId();
    setCurrentThreadId(newThreadId);
    setMessages([
      {
        id: "welcome",
        content: "Olá! Sou o assistente virtual da Cerrado Assessoria. Como posso ajudá-lo hoje?",
        sender: "bot",
        timestamp: new Date(),
      },
    ]);
    toast.success("Nova conversa iniciada!");
  };

  // Função para carregar uma conversa do histórico
  const loadConversationFromHistory = (threadId: string, messages: MessageHistory[]) => {
    const convertedMessages: Message[] = messages.map(msg => ({
      id: msg.id || Date.now().toString(),
      content: msg.message,
      sender: msg.role === 'user' ? 'user' : 'bot',
      timestamp: new Date(msg.createdAt)
    }));

    setMessages(convertedMessages);
    setCurrentThreadId(threadId);
    setShowHistory(false);
    toast.success('Conversa carregada com sucesso!');
  };

  const renderMarkdown = (text: string) => {
    // Convert markdown to HTML
    const html = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // bold
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // italic
      .replace(/`(.*?)`/g, '<code>$1</code>') // code
      .replace(/^# (.*$)/gm, '<h1>$1</h1>') // h1
      .replace(/^## (.*$)/gm, '<h2>$1</h2>') // h2
      .replace(/^### (.*$)/gm, '<h3>$1</h3>') // h3
      .replace(/^\* (.*$)/gm, '<li>$1</li>') // list items
      .replace(/^- (.*$)/gm, '<li>$1</li>') // list items
      .replace(/\n/g, '<br />'); // line breaks

    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  };

  return (
    <Card className="flex flex-col h-full shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Chatbot GPT</CardTitle>
            <CardDescription>Converse com o assistente virtual da Cerrado</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowHistory(true)}
              title="Histórico de conversas"
            >
              <History className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={clearConversation}
              title="Nova conversa"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-[calc(100vh-300px)] p-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-3 mb-4 ${message.sender === "user" ? "flex-row-reverse" : ""}`}
            >
              <Avatar className="h-8 w-8">
                {message.sender === "user" ? (
                  <>
                    <AvatarImage src="/placeholder.svg" alt="User" />
                    <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                  </>
                ) : (
                  <>
                    <AvatarImage src="/lovable-uploads/3fe7d4d1-d7f8-41e0-8d9d-0cfd2df82a5d.png" alt="Bot" />
                    <AvatarFallback><Bot className="h-4 w-4" /></AvatarFallback>
                  </>
                )}
              </Avatar>
              <div
                className={`rounded-lg px-4 py-2 max-w-[80%] ${
                  message.sender === "user"
                    ? "bg-cerrado-green1 text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {message.sender === "bot" ? (
                  <div className="prose prose-sm max-w-none">
                    {renderMarkdown(message.content)}
                  </div>
                ) : (
                  <p>{message.content}</p>
                )}
                <p className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))}
          {isBotTyping && currentMessage && (
            <div className="flex items-start gap-3 mb-4">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/lovable-uploads/3fe7d4d1-d7f8-41e0-8d9d-0cfd2df82a5d.png" alt="Bot" />
                <AvatarFallback><Bot className="h-4 w-4" /></AvatarFallback>
              </Avatar>
              <div className="rounded-lg px-4 py-2 max-w-[80%] bg-gray-100 text-gray-800">
                <div className="prose prose-sm max-w-none">
                  {renderMarkdown(typingText)}
                </div>
                <span className="animate-pulse">▋</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </ScrollArea>
      </CardContent>
      <div className="p-4 border-t">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <Input
            placeholder="Digite sua mensagem..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !inputValue.trim()}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>

      {/* Componente de histórico */}
      <ConversationHistory
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        onSelectThread={loadConversationFromHistory}
      />
    </Card>
  );
};

export default ChatbotGPT;