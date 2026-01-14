import React, { useState, useEffect } from 'react';
import { Bot, Plus, MessageCircle, Settings, Zap, Brain, Sparkles, Activity, X, Save, MoreVertical, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { auth, db } from '@/config/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { 
  getAssistants, 
  createAssistant, 
  updateLastUsed, 
  deleteAssistant,
  Assistant,
  DynamicField,
  FieldType
} from '@/services/assistantService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { HierarchyLevel } from '@/types';

import { toast } from 'sonner';

interface AssistantSelectionProps {
  onSelectAssistant: (assistantId: string, assistantName?: string, aiModel?: string) => void;
  onCreateNewAssistant: () => void;
}

const AssistantSelection: React.FC<AssistantSelectionProps> = ({ 
  onSelectAssistant, 
  onCreateNewAssistant 
}) => {
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<HierarchyLevel | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newAssistant, setNewAssistant] = useState({
    name: '',
    description: '',
    aiModel: 'GPT-4 Turbo',
    agentId: ''
  });
  const [dynamicFields, setDynamicFields] = useState<DynamicField[]>([]);
  const [showFieldEditor, setShowFieldEditor] = useState(false);
  const [editingField, setEditingField] = useState<DynamicField | null>(null);

  // Monitor auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Buscar dados do usuário para obter o role
        try {
          const userDoc = await getDoc(doc(db, "collaborators_unified", currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserRole(userData.hierarchyLevel as HierarchyLevel);
          }
        } catch (error) {
          console.error('Erro ao buscar dados do usuário:', error);
        }
        
        loadUserAssistants();
      } else {
        setAssistants([]);
        setUserRole(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loadUserAssistants = async () => {
    try {
      setLoading(true);
      
      // Buscar todos os assistentes globais
      const globalAssistants = await getAssistants();
      
      // Todos os assistentes são globais agora
      setAssistants(globalAssistants);
    } catch (error) {
      console.error('Erro ao carregar assistentes:', error);
      toast.error('Erro ao carregar assistentes');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAssistant = async (assistant: Assistant) => {
    if (!assistant.isActive) {
      toast.error("Este assistente não está ativo no momento.");
      return;
    }
    
    try {
      // Atualizar último uso no Firestore para todos os assistentes
      await updateLastUsed(assistant.id);
      
      toast.success(`🚀 Iniciando ${assistant.name}...`);
      onSelectAssistant(assistant.id, assistant.name, assistant.aiModel);
    } catch (error) {
      console.error('Erro ao selecionar assistente:', error);
      // Não impedir a seleção mesmo se falhar a atualização
      onSelectAssistant(assistant.id, assistant.name, assistant.aiModel);
    }
  };

  const handleCreateNew = () => {
    setShowCreateDialog(true);
  };

  const handleSaveNewAssistant = async () => {
    if (!newAssistant.name.trim()) {
      toast.error("Por favor, informe o nome do assistente.");
      return;
    }

    if (!newAssistant.description.trim()) {
      toast.error("Por favor, informe a descrição do assistente.");
      return;
    }

    if (!newAssistant.agentId.trim()) {
      toast.error("Por favor, informe o ID do agente de IA.");
      return;
    }

    if (!user) {
      toast.error("Usuário não autenticado.");
      return;
    }

    try {
      const newAssistantData = await createAssistant({
        name: newAssistant.name.trim(),
        description: newAssistant.description.trim(),
        aiModel: newAssistant.aiModel,
        agentId: newAssistant.agentId.trim(),
        dynamicFields: dynamicFields
      });

      // Atualizar a lista local
      setAssistants(prev => [newAssistantData, ...prev]);
      
      // Reset form
      setNewAssistant({
        name: '',
        description: '',
        aiModel: 'GPT-4 Turbo',
        agentId: ''
      });
      
      setShowCreateDialog(false);
      
      toast.success(`✨ Assistente "${newAssistantData.name}" criado com sucesso!`);
      
      // Automatically select the new assistant
      setTimeout(() => {
        onSelectAssistant(newAssistantData.id, newAssistantData.name, newAssistantData.aiModel);
      }, 1000);
    } catch (error) {
      console.error('Erro ao criar assistente:', error);
      toast.error('Erro ao criar assistente. Tente novamente.');
    }
  };

  const handleCancelCreate = () => {
    setNewAssistant({
      name: '',
      description: '',
      aiModel: 'GPT-4 Turbo',
      agentId: ''
    });
    setDynamicFields([]);
    setShowCreateDialog(false);
  };

  const handleDeleteAssistant = async (assistantId: string, assistantName: string) => {
    // Não permitir deletar o assistente principal (por nome)
    if (assistantName === "ChatBot Principal") {
      toast.error("Não é possível deletar o assistente principal.");
      return;
    }

    // Confirmação antes de deletar
    const confirmed = window.confirm(
      `Tem certeza que deseja deletar o assistente "${assistantName}"?\n\nEsta ação não pode ser desfeita.`
    );

    if (!confirmed) return;

    try {
      await deleteAssistant(assistantId);
      
      // Atualizar a lista local
      setAssistants(prev => prev.filter(assistant => assistant.id !== assistantId));
      
      toast.success(`✅ Assistente "${assistantName}" deletado com sucesso!`);
    } catch (error) {
      console.error('Erro ao deletar assistente:', error);
      toast.error('Erro ao deletar assistente. Tente novamente.');
    }
  };

  // Verificar se o usuário é Diretor de TI
  const isDirectorTI = userRole === 'Nível 1'; // Diretor de TI mapeia para Nível 1

  // Funções para campos dinâmicos
  const addDynamicField = (field: DynamicField) => {
    setDynamicFields(prev => [...prev, field]);
  };

  const removeDynamicField = (fieldId: string) => {
    setDynamicFields(prev => prev.filter(field => field.id !== fieldId));
  };

  const updateDynamicField = (fieldId: string, updatedField: DynamicField) => {
    setDynamicFields(prev => prev.map(field => 
      field.id === fieldId ? updatedField : field
    ));
  };

  const createNewField = (): DynamicField => {
    const fieldId = `field_${Date.now()}`;
    return {
      id: fieldId,
      variableName: '',
      label: '',
      type: 'text',
      required: false
    };
  };

  return (
    <>
      <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-gray-900 dark:via-blue-950/20 dark:to-indigo-950/30 overflow-hidden">
        {/* Header compacto com efeito glassmorphism */}
        <div className="relative overflow-hidden flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-cerrado-green1/20 via-blue-500/10 to-purple-500/10 backdrop-blur-sm"></div>
          <div className="relative p-4 border-b border-white/20 backdrop-blur-md bg-white/60 dark:bg-gray-900/60">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                {/* Ícone principal compacto */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-cerrado-green1 to-blue-600 rounded-xl blur-md opacity-50 animate-pulse"></div>
                  <div className="relative p-3 rounded-xl bg-gradient-to-r from-cerrado-green1 to-blue-600 shadow-xl">
                    <Bot className="h-6 w-6 text-white drop-shadow-lg" />
                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-ping"></div>
                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"></div>
                  </div>
                </div>
                
                <div className="space-y-0.5">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 dark:from-white dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent">
                    Assistentes IA
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                    Central de Inteligência Artificial • {assistants.length} assistente{assistants.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              
              {/* Botões de ação */}
              <div className="flex gap-2">
                {/* Botão criar novo - apenas para Diretor de TI */}
                {isDirectorTI && (
                  <Button
                    onClick={handleCreateNew}
                    size="sm"
                    className="relative group bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold px-4 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg blur opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
                    <div className="relative flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Criar</span>
                      <Sparkles className="h-3 w-3 opacity-70" />
                    </div>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Conteúdo principal otimizado */}
        <div className="flex-1 p-4 overflow-hidden">
          <div className="h-full max-w-7xl mx-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cerrado-green1 mx-auto mb-4"></div>
                  <p className="text-lg font-medium text-gray-600 dark:text-gray-300">Carregando assistentes...</p>
                </div>
              </div>
            ) : assistants.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Bot className="h-16 w-16 text-gray-400 mx-auto mb-6" />
                  <h3 className="text-xl font-bold text-gray-600 dark:text-gray-300 mb-2">Nenhum assistente encontrado</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">
                    {isDirectorTI ? "Crie seu primeiro assistente personalizado!" : "Apenas o Diretor de TI pode criar assistentes."}
                  </p>
                  {isDirectorTI && (
                    <Button
                      onClick={handleCreateNew}
                      className="bg-gradient-to-r from-cerrado-green1 to-blue-600 hover:from-cerrado-green1/90 hover:to-blue-600/90 text-white font-semibold px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Criar Primeiro Assistente
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Carrossel de assistentes */}
                <Carousel 
                  opts={{
                    align: "start",
                    loop: assistants.length > 3,
                    skipSnaps: false,
                    dragFree: true,
                  }}
                  className="w-full relative"
                >
                  <CarouselContent className="-ml-4">
                    {assistants.map((assistant) => (
                      <CarouselItem key={assistant.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
                        <div className="p-1">
                          <Card
                            className="group relative overflow-hidden cursor-pointer bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 hover:border-cerrado-green1/60 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl h-full"
                            onClick={() => handleSelectAssistant(assistant)}
                          >
                            {/* Efeito de brilho */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                            
                            {/* Background gradient */}
                            <div className="absolute inset-0 bg-gradient-to-br from-cerrado-green1/5 via-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            
                            <CardContent className="relative p-6">
                              {/* Avatar e status */}
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <div className="relative">
                                    <div className="absolute inset-0 bg-gradient-to-r from-cerrado-green1 to-blue-600 rounded-lg blur-sm opacity-50 group-hover:opacity-75 transition-opacity duration-300"></div>
                                    <div className="relative p-3 rounded-lg bg-gradient-to-r from-cerrado-green1 to-blue-600 shadow-lg">
                                      <MessageCircle className="h-6 w-6 text-white" />
                                      {assistant.isActive && (
                                        <div className="absolute -bottom-1 -right-1">
                                          <div className="w-3 h-3 bg-green-400 rounded-full border-2 border-white shadow-sm animate-pulse"></div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  {assistant.isActive && (
                                    <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 px-2 py-1 text-xs font-semibold shadow-sm">
                                      <Activity className="h-3 w-3 mr-1" />
                                      Online
                                    </Badge>
                                  )}
                                </div>
                                
                                {/* Menu de três pontos - apenas para Diretor de TI */}
                                {isDirectorTI && assistant.name !== "ChatBot Principal" && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <MoreVertical className="h-4 w-4 text-gray-500" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                      <DropdownMenuItem
                                        className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20 cursor-pointer"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteAssistant(assistant.id, assistant.name);
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Deletar Assistente
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                              
                              {/* Informações */}
                              <div className="space-y-3 mb-4">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1">
                                  {assistant.name}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-2 min-h-[2.5rem]">
                                  {assistant.description}
                                </p>
                              </div>
                              
                              {/* Footer */}
                              <div className="flex items-center justify-between pt-3 border-t border-gray-200/50 dark:border-gray-700/30">
                                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                  {assistant.messageCount.toLocaleString()} conversas
                                </div>
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                  <span className="text-xs text-green-600 dark:text-green-400 font-semibold">Ativo</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="absolute -left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/95 dark:bg-gray-800/95 border-2 border-gray-200 dark:border-gray-700 shadow-xl hover:bg-cerrado-green1 hover:text-white hover:border-cerrado-green1 transition-all duration-300 hover:scale-110" />
                  <CarouselNext className="absolute -right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/95 dark:bg-gray-800/95 border-2 border-gray-200 dark:border-gray-700 shadow-xl hover:bg-cerrado-green1 hover:text-white hover:border-cerrado-green1 transition-all duration-300 hover:scale-110" />
                </Carousel>
              </div>
            )}

            {/* Seção de informações compacta */}
            <div className="mt-8">
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-indigo-600/10 backdrop-blur-md border border-blue-200/30 dark:border-blue-700/30 p-4">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-indigo-500/5"></div>
                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500">
                      <Brain className="h-4 w-4 text-white" />
                    </div>
                    <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                      Central de IA • Recursos Avançados
                    </h4>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="flex items-center gap-1.5 text-blue-800 dark:text-blue-200">
                      <Zap className="h-3 w-3" />
                      <span className="font-medium">Tempo real</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-blue-800 dark:text-blue-200">
                      <Brain className="h-3 w-3" />
                      <span className="font-medium">Aprendizado</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-blue-800 dark:text-blue-200">
                      <Sparkles className="h-3 w-3" />
                      <span className="font-medium">Personalização</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-blue-800 dark:text-blue-200">
                      <Activity className="h-3 w-3" />
                      <span className="font-medium">Performance</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dialog para criar novo assistente */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[500px] bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border border-white/20 dark:border-gray-700/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              <Sparkles className="h-5 w-5 text-blue-600" />
              Criar Novo Assistente IA
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-300">
              Configure seu assistente personalizado para necessidades específicas. Ele será integrado com n8n para automações avançadas.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="assistant-name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Nome do Assistente *
              </Label>
              <Input
                id="assistant-name"
                placeholder="Ex: Assistente Financeiro, Suporte Técnico..."
                value={newAssistant.name}
                onChange={(e) => setNewAssistant(prev => ({ ...prev, name: e.target.value }))}
                className="bg-white/50 dark:bg-gray-800/50 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="assistant-description" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Descrição *
              </Label>
              <Textarea
                id="assistant-description"
                placeholder="Descreva o propósito e funcionalidades do assistente..."
                value={newAssistant.description}
                onChange={(e) => setNewAssistant(prev => ({ ...prev, description: e.target.value }))}
                className="bg-white/50 dark:bg-gray-800/50 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 min-h-[100px] resize-none"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="agent-id" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                ID do Agente de IA *
              </Label>
              <Input
                id="agent-id"
                placeholder="Ex: agent_12345, ai_assistant_v2..."
                value={newAssistant.agentId}
                onChange={(e) => setNewAssistant(prev => ({ ...prev, agentId: e.target.value }))}
                className="bg-white/50 dark:bg-gray-800/50 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 font-mono text-sm"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Este ID será usado para identificar o agente nos fluxos de automação
              </p>
            </div>

            {/* Seção de campos dinâmicos */}
            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Campos de Coleta de Dados
                </h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addDynamicField(createNewField())}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar Campo
                </Button>
              </div>

              {dynamicFields.length > 0 ? (
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {dynamicFields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {field.type}
                          </Badge>
                          <span className="text-sm font-medium">
                            {field.label || `Campo ${index + 1}`}
                          </span>
                          {field.required && (
                            <Badge variant="destructive" className="text-xs">
                              Obrigatório
                            </Badge>
                          )}
                        </div>
                        {field.description && (
                          <p className="text-xs text-gray-500 mt-1">
                            {field.description}
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDynamicField(field.id)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  Este assistente coletará dados padrão. Adicione campos personalizados se necessário.
                </p>
              )}
            </div>

          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200/50 dark:border-gray-700/30">
            <Button
              variant="outline"
              onClick={handleCancelCreate}
              className="px-4 py-2"
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={handleSaveNewAssistant}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2"
            >
              <Save className="h-4 w-4 mr-2" />
              Criar Assistente
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AssistantSelection; 