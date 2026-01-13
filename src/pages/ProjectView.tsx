import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, Edit, CheckCircle, Camera, FileText, MessageSquare, MapPin, ChevronRight, ChevronLeft, AlertCircle, Sparkles, Image as ImageIcon, X, Clock, MoreVertical, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/config/firebase";
import { doc, getDoc } from "firebase/firestore";
import { ProjectModule, NC, WeightedQuestion } from "@/types/checklist";
import { HierarchicalProjectSidebar } from "@/components/HierarchicalProjectSidebar";
import { usePageTitle } from "@/contexts/PageTitleContext";
import { useHeaderActions } from "@/contexts/HeaderActionsContext";
import { useIsMobile } from "@/hooks/use-mobile";

// Função para gerar IDs únicos
const generateUniqueId = (prefix: string) => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Função para sanitizar IDs duplicados
const sanitizeDuplicateIds = (modules: ProjectModule[]): ProjectModule[] => {
  const seenQuestionIds = new Set<string>();
  
  return modules.map(module => ({
    ...module,
    itens: module.itens.map(item => ({
      ...item,
      ncs: item.ncs.map(nc => ({
        ...nc,
        perguntas: nc.perguntas.map(q => {
          // Se o ID já foi visto, gerar um novo ID único
          if (seenQuestionIds.has(q.id)) {
            console.warn(`⚠️ ID duplicado detectado: ${q.id}. Gerando novo ID.`);
            const newId = generateUniqueId('question');
            seenQuestionIds.add(newId);
            return { ...q, id: newId };
          }
          seenQuestionIds.add(q.id);
          return q;
        })
      }))
    }))
  }));
};

interface ProjectDetail {
  id: string;
  nome: string;
  status: string;
  progresso: number;
  dataInicio: string;
  previsaoConclusao?: string;
  consultor?: string;
  cliente?: {
    id: string;
    nome: string;
    email: string;
    empresa: string;
  };
  observacoes?: string;
  modules?: ProjectModule[];
}

const ProjectView = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { setPageTitle } = usePageTitle();
  const { setRightAction } = useHeaderActions();
  const isMobile = useIsMobile();

  const [projectDetails, setProjectDetails] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<ProjectModule[]>([]);
  
  // Estados de navegação
  const [currentModuleId, setCurrentModuleId] = useState<string>('');
  const [currentItemId, setCurrentItemId] = useState<string>('');
  const [currentNcId, setCurrentNcId] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mediaDrawerOpen, setMediaDrawerOpen] = useState(false);

  useEffect(() => {
    if (id) {
      loadProject();
    }
  }, [id]);

  // Atualizar título do header quando o módulo mudar
  useEffect(() => {
    if (currentModuleId && modules.length > 0) {
      const currentModule = modules.find(m => m.id === currentModuleId);
      if (currentModule) {
        setPageTitle(currentModule.titulo);
      }
    }
  }, [currentModuleId, modules]); // Removido setPageTitle das dependências

  // Adicionar botão de editar no header mobile
  useEffect(() => {
    if (isMobile) {
      const editButton = (
        <Button 
          onClick={() => navigate(`/projetos/${id}/edit`)} 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9"
        >
          <Edit className="h-5 w-5" />
        </Button>
      );
      setRightAction(editButton);
    } else {
      setRightAction(null);
    }
    
    return () => {
      setRightAction(null);
    };
  }, [id, navigate, isMobile]); // Adicionado isMobile às dependências

  const loadProject = async () => {
    try {
      setLoading(true);
      const projectRef = doc(db, 'projetos', id!);
      const projectDoc = await getDoc(projectRef);
      
      if (!projectDoc.exists()) {
        toast.error('Projeto não encontrado');
        navigate("/dashboard", { state: { activeTab: 'projetos' } });
        return;
      }

      const projectData = projectDoc.data();
      console.log('=== DADOS DO PROJETO (VIEW MODE) ===', projectData);
      
      // Carregar módulos
      let loadedModules: ProjectModule[] = [];
      
      if (projectData.modules && Array.isArray(projectData.modules) && projectData.modules.length > 0) {
        console.log('✅ Carregando do campo MODULES');
        loadedModules = projectData.modules;
      } else {
        console.log('❌ Nenhum dado de avaliação encontrado');
      }
      
      console.log('loadedModules final:', loadedModules);
      
      // Sanitizar IDs duplicados antes de carregar
      const sanitizedModules = sanitizeDuplicateIds(loadedModules);
      setModules(sanitizedModules);

      // Inicializar navegação com o primeiro módulo/item/nc disponível
      if (sanitizedModules.length > 0) {
        const firstModule = sanitizedModules[0];
        setCurrentModuleId(firstModule.id);
        
        if (firstModule.itens && firstModule.itens.length > 0) {
          const firstItem = firstModule.itens[0];
          setCurrentItemId(firstItem.id);
          
          if (firstItem.ncs && firstItem.ncs.length > 0) {
            setCurrentNcId(firstItem.ncs[0].id);
          }
        }
      }

      setProjectDetails({
        id: projectDoc.id,
        nome: projectData.nome,
        status: projectData.status || 'Iniciado',
        progresso: projectData.progresso || 0,
        dataInicio: projectData.dataInicio,
        previsaoConclusao: projectData.previsaoConclusao,
        consultor: projectData.consultor || 'Não definido',
        cliente: projectData.cliente,
        observacoes: projectData.observacoes || '',
        modules: loadedModules
      });
    } catch (error) {
      console.error('Erro ao carregar projeto:', error);
      toast.error('Erro ao carregar projeto');
      navigate("/dashboard", { state: { activeTab: 'projetos' } });
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (moduleId: string, itemId: string, ncId?: string) => {
    setCurrentModuleId(moduleId);
    setCurrentItemId(itemId);
    if (ncId) {
      setCurrentNcId(ncId);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'concluído':
        return 'bg-green-100 text-green-800';
      case 'em andamento':
        return 'bg-blue-100 text-blue-800';
      case 'iniciado':
        return 'bg-purple-100 text-purple-800';
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getResponseText = (option: string | null) => {
    switch (option) {
      case 'very_bad': return 'NC';
      case 'good': return 'R';
      case 'na': return 'N/A';
      default: return 'Não Respondida';
    }
  };

  const getResponseColor = (option: string | null) => {
    switch (option) {
      case 'very_bad': return 'bg-red-100 text-red-800 border-red-200';
      case 'good': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'na': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  // Encontrar módulo, item e NC atual
  const currentModule = modules.find(m => m.id === currentModuleId);
  const currentItem = currentModule?.itens.find(i => i.id === currentItemId);
  const currentNC = currentItem?.ncs.find(nc => nc.id === currentNcId);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cerrado-green1 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando projeto...</p>
        </div>
      </div>
    );
  }

  if (!projectDetails) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Projeto não encontrado</p>
          <Button onClick={() => navigate("/dashboard", { state: { activeTab: 'projetos' } })} className="mt-4">
            Voltar aos Projetos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Sidebar Hierárquica */}
      <HierarchicalProjectSidebar
        modules={modules}
        currentModuleId={currentModuleId}
        currentItemId={currentItemId}
        currentNcId={currentNcId}
        onNavigate={handleNavigate}
        className="flex-shrink-0"
        showMobileButton={true}
        isOpen={isSidebarOpen}
        onOpenChange={setIsSidebarOpen}
      />

      {/* Conteúdo Principal */}
      <div className="flex-1 overflow-hidden w-full flex flex-col">
        <div className="flex-1 px-4 pt-2 pb-4 md:p-6 md:m-4 md:border md:border-gray-350 md:rounded-lg md:shadow-md bg-white overflow-y-auto">
          {currentNC && currentItem && currentModule ? (
            <div className="max-w-5xl mx-auto space-y-4 md:space-y-6">
              {/* Header Mobile - Verde com artigo atual */}
              <div className="md:hidden -mx-4 -mt-4 mb-4 bg-cerrado-green1 text-white px-4 py-3">
                <div className="flex items-start gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate("/dashboard", { state: { activeTab: 'projetos' } })}
                    className="h-8 w-8 text-white hover:bg-white/20 flex-shrink-0 mt-0.5"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-semibold leading-snug">
                      {currentItem.titulo}
                    </h2>
                  </div>
                </div>
              </div>

              {/* Botão Flutuante de Mídias - Mobile */}
              {(() => {
                // Verificar se a NC atual tem mídias
                let totalMedias = 0;
                if (currentNC && currentNC.perguntas) {
                  currentNC.perguntas.forEach(q => {
                    totalMedias += q.response?.mediaAttachments?.length || 0;
                  });
                }
                
                if (totalMedias > 0 && isMobile) {
                  return (
                    <Button
                      onClick={() => setMediaDrawerOpen(true)}
                      className="fixed left-0 top-[25%] -translate-y-1/2 z-40 h-20 w-12 rounded-r-full bg-cerrado-green1/60 hover:bg-cerrado-green1/80 backdrop-blur-lg shadow-lg p-0 flex items-center justify-center transition-all touch-manipulation"
                      type="button"
                    >
                      <Camera className="h-6 w-6 text-white" />
                    </Button>
                  );
                }
                return null;
              })()}

              {/* Header Desktop */}
              <div className="hidden md:block bg-white p-3 rounded-lg shadow-sm border border-gray-200 mb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate("/dashboard", { state: { activeTab: 'projetos' } })}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Voltar
                    </Button>
                    <div>
                      <h1 className="text-xl font-bold text-gray-900">{projectDetails.nome}</h1>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-700">Progresso Geral</div>
                      <div className="text-2xl font-bold text-blue-600">{projectDetails.progresso}%</div>
                    </div>
                    <Progress
                      value={projectDetails.progresso}
                      className="w-32 h-4"
                    />
                    <Button
                      onClick={() => navigate(`/projetos/${id}/edit`)}
                      variant="ghost"
                      size="icon"
                    >
                      <Edit className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Header do Módulo e Item (Artigo) - Desktop */}
              <div className="hidden md:block bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <div className="mb-2">
                  <Badge variant="outline" className="mb-1">
                    {currentModule.titulo}
                  </Badge>
                  <h2 className="text-lg font-bold text-gray-900">{currentItem.titulo}</h2>
                  {currentItem.descricao && (
                    <p className="text-sm text-gray-600 mt-1">{currentItem.descricao}</p>
                  )}
                </div>
              </div>

              {/* Perguntas */}
              <div className="space-y-4">
                {currentNC.perguntas && currentNC.perguntas.length > 0 ? (
                  currentNC.perguntas.map((question: WeightedQuestion, index: number) => (
                    <div
                      key={question.id}
                      className="bg-white rounded-lg p-6 shadow-sm border border-gray-200"
                    >
                      {/* Cabeçalho da NC e Pergunta */}
                      <div className="mb-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                          {currentNC.ncTitulo}
                        </h3>
                        {currentNC.local && (
                          <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {currentNC.local}
                          </p>
                        )}
                        <p className="text-sm text-gray-600">
                          {question.text}
                        </p>
                      </div>

                      {/* Resposta */}
                      {question.response ? (
                        <div className="space-y-3">
                          {/* Opção Selecionada */}
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-600">Resposta:</span>
                            <Badge
                              className={`text-sm px-3 py-1 border font-semibold ${getResponseColor(question.response.selectedOption)}`}
                            >
                              {getResponseText(question.response.selectedOption)}
                            </Badge>
                          </div>

                          {/* Fotos - Desktop */}
                          {question.response.mediaAttachments && question.response.mediaAttachments.length > 0 && (
                            <div className="border-t pt-3 hidden md:block">
                              <div className="flex items-center gap-2 mb-2">
                                <Camera className="h-4 w-4 text-gray-500" />
                                <span className="text-sm font-medium text-gray-700">Fotos Anexadas ({question.response.mediaAttachments.length})</span>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {question.response.mediaAttachments.map((media, idx) => (
                                  <div key={idx} className="space-y-1">
                                    <div className="relative">
                                      <img
                                        src={media.url}
                                        alt={`Foto ${idx + 1}`}
                                        className="w-full h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                                        onClick={() => window.open(media.url, '_blank')}
                                      />
                                      {media.latitude && media.longitude && (
                                        <a
                                          href={`https://www.google.com/maps?q=${media.latitude},${media.longitude}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="absolute bottom-2 right-2 bg-white rounded-full p-1.5 shadow-md hover:bg-gray-100"
                                          title="Ver localização no mapa"
                                        >
                                          <MapPin className="h-3 w-3 text-blue-600" />
                                        </a>
                                      )}
                                    </div>
                                    {media.latitude && media.longitude && media.latitude !== 0 && (
                                      <div className="text-xs text-green-600 flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        <span className="truncate">
                                          {media.latitude.toFixed(6)}, {media.longitude.toFixed(6)}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Comentário do Usuário */}
                          {question.response.userComment && (
                            <div className="border-t pt-3">
                              <div className="flex items-center gap-2 mb-2">
                                <MessageSquare className="h-4 w-4 text-blue-500" />
                                <span className="text-sm font-medium text-gray-700">Comentário</span>
                              </div>
                              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                                <p className="text-sm text-gray-800">{question.response.userComment}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {question.response.userCommentBy} • {question.response.userCommentDate ? new Date(question.response.userCommentDate).toLocaleString('pt-BR') : ''}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Orientação da IA */}
                          {question.response.aiGuidance && (
                            <div className="border-t pt-3">
                              <div className="flex items-center gap-2 mb-2">
                                <Sparkles className="h-4 w-4 text-purple-500" />
                                <span className="text-sm font-medium text-gray-700">Orientação da IA</span>
                              </div>
                              <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                                <p className="text-sm text-gray-800 whitespace-pre-wrap">{question.response.aiGuidance}</p>
                              </div>
                            </div>
                          )}

                          {/* Situação Atual */}
                          {question.response.currentSituation && (
                            <div className="border-t pt-3">
                              <div className="flex items-center gap-2 mb-2">
                                <AlertCircle className="h-4 w-4 text-amber-500" />
                                <span className="text-sm font-medium text-gray-700">Situação Atual</span>
                              </div>
                              <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                                <p className="text-sm text-gray-800">{question.response.currentSituation}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
                          <p className="text-sm">Esta pergunta ainda não foi respondida</p>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>Nenhuma pergunta cadastrada para esta NC</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  Selecione uma NC na sidebar para visualizar seu conteúdo
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Drawer de Mídias da NC (Mobile) */}
      <Sheet open={mediaDrawerOpen} onOpenChange={setMediaDrawerOpen}>
        <SheetContent side="left" className="w-[90vw] sm:w-96 p-0 top-14 bottom-0 h-auto [&>button]:hidden flex flex-col">
          <SheetHeader className="p-4 border-b bg-blue-50 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-blue-600" />
              <SheetTitle>Mídias da NC</SheetTitle>
            </div>
            {currentNC && (
              <p className="text-sm text-gray-600 text-left mt-2">
                {currentNC.ncTitulo}
              </p>
            )}
          </SheetHeader>
          
          <div className="flex-1 p-4 overflow-y-auto min-h-0">
            {currentNC && currentNC.perguntas && (() => {
              // Coletar todas as mídias da NC
              const allMedias: Array<{
                media: any;
                pergunta: string;
                idx: number;
              }> = [];
              
              currentNC.perguntas.forEach(q => {
                if (q.response?.mediaAttachments && q.response.mediaAttachments.length > 0) {
                  q.response.mediaAttachments.forEach((media, idx) => {
                    allMedias.push({
                      media,
                      pergunta: q.text,
                      idx
                    });
                  });
                }
              });
              
              if (allMedias.length === 0) {
                return (
                  <div className="text-center py-8 text-gray-500">
                    <Camera className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>Nenhuma mídia anexada nesta NC</p>
                  </div>
                );
              }
              
              return (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">
                    {allMedias.length} foto(s) anexada(s):
                  </h4>
                  
                  {allMedias.map((item, globalIdx) => (
                    <div key={globalIdx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      {/* Foto à esquerda - 100x100px */}
                      <div className="relative rounded-lg overflow-hidden border border-gray-200 w-[100px] h-[100px] flex-shrink-0">
                        <img 
                          src={item.media.url}
                          alt={`Foto ${globalIdx + 1}`}
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => window.open(item.media.url, '_blank')}
                        />
                      </div>
                      
                      {/* Informações à direita */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Camera className="h-4 w-4" />
                            <span className="text-sm">Foto {globalIdx + 1}</span>
                          </div>
                          
                          {/* Dropdown de ações */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                                <MoreVertical className="h-4 w-4 text-gray-600" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => window.open(item.media.url, '_blank')}>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Abrir em Nova Aba
                              </DropdownMenuItem>
                              {item.media.latitude && item.media.longitude && (
                                <DropdownMenuItem
                                  onClick={() => window.open(`https://www.google.com/maps?q=${item.media.latitude},${item.media.longitude}`, '_blank')}
                                >
                                  <MapPin className="h-4 w-4 mr-2" />
                                  Ver no Mapa
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        
                        {item.media.latitude && item.media.latitude !== 0 && (
                          <div className="text-xs text-green-600 mb-2">
                            📍 GPS: {item.media.latitude.toFixed(6)}, {item.media.longitude.toFixed(6)}
                          </div>
                        )}
                        
                        <div className="text-xs text-gray-400">
                          {new Date(item.media.createdAt).toLocaleString('pt-BR')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default ProjectView;

