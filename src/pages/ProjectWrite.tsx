import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { db, storage } from "@/config/firebase";
import { doc, getDoc, updateDoc, collection, getDocs, setDoc } from "firebase/firestore";
import { ArrowLeft, Camera, Clock, X, Plus, Trash2, Paperclip, MessageCircle, Save, FileText, ChevronRight, ChevronLeft, Sparkles, MoreVertical, CheckCircle, MapPin } from "lucide-react";
import { HierarchicalProjectSidebar } from "@/components/HierarchicalProjectSidebar";
import { ProjectModule, NC, ResponseOption, RESPONSE_VALUES, WeightedQuestion, Relatorio, RelatorioItem, MediaAttachment } from "@/types/checklist";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuthContext } from '@/contexts/AuthContext';
import { usePageTitle } from '@/contexts/PageTitleContext';
import { useHeaderActions } from '@/contexts/HeaderActionsContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useGeolocation } from '@/hooks/useGeolocation';

// Configurações da OpenAI (use variáveis de ambiente)
const OPENAI_ASSISTANT_ID = import.meta.env.VITE_OPENAI_ASSISTANT_ID || "";
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || "";

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
  customAccordions?: Array<{
    id: string;
    title: string;
    items: any[];
  }>;
}

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

const ProjectWrite = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { userData } = useAuthContext();
  const { setPageTitle } = usePageTitle();
  const { setRightAction } = useHeaderActions();
  const isMobile = useIsMobile();
  const { location: gpsLocation } = useGeolocation();
  
  const [projectDetails, setProjectDetails] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Estados para novo sistema de avaliação ponderada
  const [modules, setModules] = useState<ProjectModule[]>([]);
  const [currentModuleId, setCurrentModuleId] = useState<string>("");
  const [currentItemId, setCurrentItemId] = useState<string>("");
  const [currentNcId, setCurrentNcId] = useState<string>("");
  const [questionPhotos, setQuestionPhotos] = useState<Record<string, any>>({});
  const [questionPhotoUploading, setQuestionPhotoUploading] = useState<Record<string, boolean>>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [photoDrawerOpen, setPhotoDrawerOpen] = useState<string | null>(null);
  const [generatingGuidance, setGeneratingGuidance] = useState<Record<string, boolean>>({});
  const [showSituacaoAtual, setShowSituacaoAtual] = useState<Record<string, boolean>>({});
  const [showPhotosDesktop, setShowPhotosDesktop] = useState<Record<string, boolean>>({});
  const [floatingButtonTop, setFloatingButtonTop] = useState<number>(200);
  const [deleteNCModal, setDeleteNCModal] = useState<{ open: boolean; ncId: string; ncTitle: string }>({ open: false, ncId: '', ncTitle: '' });
  
  // Estados para importação de preset
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [availablePresets, setAvailablePresets] = useState<any[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  const [loadingPresets, setLoadingPresets] = useState(false);
  const [importingPreset, setImportingPreset] = useState(false);

  // Função para calcular progresso baseado em áreas (módulos) e NCs
  const calculateProgress = useCallback((projectModules: ProjectModule[]) => {
    if (!projectModules || projectModules.length === 0) return 0;

    // Contar total de áreas (módulos)
    const totalAreas = projectModules.length;
    
    // Contar áreas completadas (todas as perguntas de todos os NCs respondidas)
    const completedAreas = projectModules.filter(module => {
      const totalQuestions = module.itens.reduce(
        (itemSum, item) => itemSum + item.ncs.reduce((ncSum, nc) => ncSum + nc.perguntas.length, 0),
        0
      );
      const answeredQuestions = module.itens.reduce(
        (itemSum, item) => itemSum + item.ncs.reduce(
          (ncSum, nc) => ncSum + nc.perguntas.filter((q) => q.response !== null).length,
          0
        ),
        0
      );
      return totalQuestions > 0 && answeredQuestions === totalQuestions;
    }).length;

    // Calcular progresso baseado em áreas completadas
    const areaProgress = totalAreas > 0 ? (completedAreas / totalAreas) * 100 : 0;

    // Contar total de NCs em todo o projeto
    const totalNCs = projectModules.reduce(
      (sum, module) => sum + module.itens.reduce((itemSum, item) => itemSum + item.ncs.length, 0),
      0
    );

    // Contar NCs completados (todas as perguntas respondidas)
    const completedNCs = projectModules.reduce(
      (sum, module) => sum + module.itens.reduce(
        (itemSum, item) => itemSum + item.ncs.filter(nc => {
          return nc.perguntas.length > 0 && nc.perguntas.every(q => q.response !== null);
        }).length,
        0
      ),
      0
    );

    // Calcular progresso baseado em NCs completados
    const ncProgress = totalNCs > 0 ? (completedNCs / totalNCs) * 100 : 0;

    // Usar a média ponderada: 60% baseado em NCs, 40% baseado em áreas
    const finalProgress = (ncProgress * 0.6) + (areaProgress * 0.4);

    return Math.round(finalProgress);
  }, []);

  useEffect(() => {
    if (!id) {
      navigate("/dashboard", { state: { activeTab: 'projetos' } });
      return;
    }
    loadProject();
    // eslint-disable-next-line
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

  // useEffect para recalcular progresso automaticamente quando módulos mudarem
  useEffect(() => {
    if (modules.length > 0 && projectDetails) {
      const newProgress = calculateProgress(modules);
      if (newProgress !== projectDetails.progresso) {
        setProjectDetails(prev => prev ? { ...prev, progresso: newProgress } : null);
      }
    }
  }, [modules, calculateProgress, projectDetails?.progresso]);

  // Função de salvar para uso no header
  const handleSaveProjectFromHeader = useCallback(async () => {
    if (!projectDetails || !id) return;
    try {
      setSaving(true);
      
      // Usar a nova função de cálculo de progresso
      const progresso = calculateProgress(modules);

      const now = new Date();
      await updateDoc(doc(db, "projetos", id), {
        modules: modules,
        progresso,
        nome: projectDetails.nome,
        atualizadoEm: now,
        updatedAt: now, // Mantido para compatibilidade
        ultimaAtualizacao: now.toISOString(),
        atualizadoPor: userData?.uid || ''
      });
      toast.success("Projeto salvo com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar projeto");
    } finally {
      setSaving(false);
    }
  }, [projectDetails, id, modules]);

  // Adicionar botão de salvar no header (mobile)
  useEffect(() => {
    if (isMobile) {
      const saveButton = (
        <Button 
          onClick={handleSaveProjectFromHeader} 
          disabled={saving} 
          variant="ghost"
          size="icon" 
          className="h-9 w-9"
        >
          <Save className="h-5 w-5" />
        </Button>
      );
      
      setRightAction(saveButton);
    } else {
      setRightAction(null);
    }
    
    return () => {
      setRightAction(null);
    };
  }, [saving, handleSaveProjectFromHeader, isMobile]); // Adicionado isMobile nas dependências

  // Calcular posição do botão flutuante
  useEffect(() => {
    if (!isMobile) return;
    const updateFloatingButtonPosition = () => {
      const actionsDiv = document.getElementById('nc-actions-buttons');
      if (actionsDiv) {
        const rect = actionsDiv.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const topPosition = rect.top + scrollTop;
        setFloatingButtonTop(topPosition);
      }
    };

    updateFloatingButtonPosition();
    const observer = new MutationObserver(updateFloatingButtonPosition);
    const targetNode = document.body;
    observer.observe(targetNode, { childList: true, subtree: true });
    window.addEventListener('resize', updateFloatingButtonPosition);
    window.addEventListener('scroll', updateFloatingButtonPosition);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateFloatingButtonPosition);
      window.removeEventListener('scroll', updateFloatingButtonPosition);
    };
  }, [isMobile, currentNcId, currentItemId, currentModuleId]);

  const loadProject = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const projectRef = doc(db, "projetos", id);
      const projectSnap = await getDoc(projectRef);
      if (projectSnap.exists()) {
        const data = projectSnap.data();
        const projectData: ProjectDetail = {
          id: projectSnap.id,
          nome: data.nome || "",
          status: data.status || "em_andamento",
          progresso: data.progresso || 0,
          dataInicio: data.dataInicio || "",
          previsaoConclusao: data.previsaoConclusao,
          consultor: data.consultor,
          cliente: data.cliente,
          observacoes: data.observacoes,
          customAccordions: data.customAccordions || []
        };
        setProjectDetails(projectData);
        
        const modulesData = data.modules || data.weightedModules;
        if (modulesData) {
          const sanitizedModules = sanitizeDuplicateIds(modulesData);
          setModules(sanitizedModules);
          
          if (modulesData.length > 0) {
            const firstModule = modulesData[0];
            if (firstModule.itens.length > 0) {
              const firstItem = firstModule.itens[0];
              if (firstItem.ncs.length > 0) {
                setCurrentModuleId(firstModule.id);
                setCurrentItemId(firstItem.id);
                setCurrentNcId(firstItem.ncs[0].id);
              }
            }
          }
        } else {
          loadHierarchicalStructure(projectData);
        }
      } else {
        toast.error("Projeto não encontrado");
        navigate("/dashboard", { state: { activeTab: 'projetos' } });
      }
    } catch (error) {
      console.error("Erro ao carregar projeto:", error);
      toast.error("Erro ao carregar projeto");
    } finally {
      setLoading(false);
    }
  };

  const loadHierarchicalStructure = (project: ProjectDetail) => {
    const hierarchicalModules: ProjectModule[] = [];
    const itemsByCategory = new Map<string, any[]>();
    
    if (project.customAccordions) {
      project.customAccordions.forEach((accordion) => {
        accordion.items.forEach((item) => {
          const category = item.category || accordion.title || 'SEM CATEGORIA';
          if (!itemsByCategory.has(category)) {
            itemsByCategory.set(category, []);
          }
          itemsByCategory.get(category)!.push(item);
        });
      });

      let moduleIndex = 0;
      itemsByCategory.forEach((items, categoryName) => {
        const module: ProjectModule = {
          id: `module_${moduleIndex}`,
          titulo: categoryName,
          ordem: moduleIndex,
          itens: []
        };
        items.forEach((item, itemIndex) => {
          const hierItem: any = {
            id: `item_${moduleIndex}_${itemIndex}`,
            titulo: item.title,
            descricao: item.category,
            ordem: itemIndex,
            ncs: [],
            pontuacaoAtual: 0,
            pontuacaoMaxima: 0
          };
          
          if (item.ncs && Array.isArray(item.ncs) && item.ncs.length > 0) {
            hierItem.ncs = item.ncs;
            hierItem.pontuacaoMaxima = item.ncs.reduce((sum: number, nc: NC) => sum + nc.pontuacaoMaxima, 0);
          } else {
            (item.subItems || []).forEach((subItem: any, ncIndex: number) => {
              let selectedOption: any = null;
              let score = 0;
              
              if (subItem.evaluation) {
                switch (subItem.evaluation.toLowerCase()) {
                  case 'nc':
                    selectedOption = 'very_bad';
                    score = 0;
                    break;
                  case 'r':
                    selectedOption = 'good';
                    score = 15;
                    break;
                  case 'na':
                    selectedOption = 'na';
                    score = 0;
                    break;
                }
              }
              
              const mediaAttachments = [];
              if (subItem.photos && Array.isArray(subItem.photos)) {
                mediaAttachments.push(...subItem.photos.map((photo: any) => ({
                  type: 'photo' as const,
                  url: photo.url,
                  timestamp: photo.createdAt || new Date().toISOString(),
                  uploadedBy: 'legacy',
                  location: (photo.latitude && photo.longitude) ? {
                    latitude: photo.latitude,
                    longitude: photo.longitude,
                    timestamp: photo.createdAt || new Date().toISOString()
                  } : undefined
                })));
              }
              
              const currentSituation = subItem.currentSituation || '';
              const aiGuidance = subItem.clientGuidance || subItem.adminFeedback || '';
              
              const nc: NC = {
                id: `nc_${moduleIndex}_${itemIndex}_${ncIndex}`,
                numero: ncIndex + 1,
                ncTitulo: `NC ${ncIndex + 1}`,
                descricao: `Não Conformidade ${ncIndex + 1}`,
                perguntas: [{
                  id: `question_${moduleIndex}_${itemIndex}_${ncIndex}_0`,
                  text: subItem.title,
                  weight: 2,
                  required: true,
                  responseOptions: ['na', 'very_bad', 'good'] as ResponseOption[],
                  response: selectedOption ? {
                    selectedOption,
                    score,
                    respondedAt: new Date().toISOString(),
                    respondedBy: 'legacy',
                    mediaAttachments,
                    currentSituation,
                    aiGuidance
                  } as any : null,
                  order: 0
                }],
                pontuacaoAtual: score,
                pontuacaoMaxima: 2 * 10,
                status: selectedOption ? 'completed' : 'pending' as const
              };
              
              hierItem.ncs.push(nc);
            });
            
            hierItem.pontuacaoMaxima = hierItem.ncs.reduce((sum: number, nc: NC) => sum + nc.pontuacaoMaxima, 0);
          }
          
          module.itens.push(hierItem);
        });
        hierarchicalModules.push(module);
        moduleIndex++;
      });
    }
    
    const sanitizedModules = sanitizeDuplicateIds(hierarchicalModules);
    setModules(sanitizedModules);
    
    if (sanitizedModules.length > 0 && sanitizedModules[0].itens.length > 0) {
      setCurrentModuleId(sanitizedModules[0].id);
      setCurrentItemId(sanitizedModules[0].itens[0].id);
      setCurrentNcId(sanitizedModules[0].itens[0].ncs[0].id);
    }
  };

  const handleNavigate = (moduleId: string, itemId: string, ncId: string) => {
    setCurrentModuleId(moduleId);
    setCurrentItemId(itemId);
    setCurrentNcId(ncId);
  };

  const handleWeightedResponseChange = (questionId: string, option: ResponseOption) => {
    setModules(prevModules =>
      prevModules.map(module => ({
        ...module,
        itens: module.itens.map(item => ({
          ...item,
          ncs: item.ncs.map(nc => {
            const updatedPerguntas = nc.perguntas.map(q => {
              if (q.id === questionId) {
                const score = RESPONSE_VALUES[option] * q.weight;
                return {
                  ...q,
                  response: {
                    ...q.response,
                    selectedOption: option,
                    score: score,
                    timestamp: new Date().toISOString(),
                    answeredBy: userData?.uid || '',
                    answeredByName: userData?.displayName || 'Usuário',
                    mediaAttachments: q.response?.mediaAttachments || [],
                    comments: q.response?.comments || []
                  }
                };
              }
              return q;
            });

            const ncPontuacaoAtual = updatedPerguntas.reduce(
              (sum, q) => sum + ((q.response as any)?.score || 0),
              0
            );
            const ncPontuacaoMaxima = updatedPerguntas.reduce(
              (sum, q) => sum + (q.weight * 10),
              0
            );
            return {
              ...nc,
              perguntas: updatedPerguntas,
              pontuacaoAtual: ncPontuacaoAtual,
              pontuacaoMaxima: ncPontuacaoMaxima,
              status: updatedPerguntas.every(q => q.response) ? 'completed' : 'in_progress'
            };
          })
        }))
      }))
    );
  };

  const addNC = (moduleId: string, itemId: string) => {
    setModules(prevModules =>
      prevModules.map(module => {
        if (module.id === moduleId) {
          return {
            ...module,
            itens: module.itens.map(item => {
              if (item.id === itemId) {
                const ncNumber = item.ncs.length + 1;
                const firstNc = item.ncs[0];
                
                const newNC: NC = {
                  id: generateUniqueId('nc'),
                  numero: ncNumber,
                  ncTitulo: `NC ${ncNumber}`,
                  descricao: `Não Conformidade ${ncNumber}`,
                  perguntas: firstNc ? firstNc.perguntas.map(q => ({
                    ...q,
                    id: generateUniqueId('question'),
                    response: null
                  })) : [],
                  pontuacaoAtual: 0,
                  pontuacaoMaxima: firstNc?.pontuacaoMaxima || 0,
                  status: 'pending'
                };
                
                return {
                  ...item,
                  ncs: [...item.ncs, newNC]
                };
              }
              return item;
            })
          };
        }
        return module;
      })
    );
    toast.success("NC adicionada!");
  };

  const removeNC = (moduleId: string, itemId: string, ncId: string) => {
    setModules(prevModules =>
      prevModules.map(module => {
        if (module.id === moduleId) {
          return {
            ...module,
            itens: module.itens.map(item => {
              if (item.id === itemId) {
                // Encontrar o NC que será removido
                const ncToRemove = item.ncs.find(nc => nc.id === ncId);
                const remainingNCs = item.ncs.filter(nc => nc.id !== ncId);
                
                if (!ncToRemove || remainingNCs.length === 0) {
                  // Se não há NC para remover ou não sobram NCs, apenas filtra
                  return {
                    ...item,
                    ncs: remainingNCs
                  };
                }
                
                // Coletar perguntas únicas do NC removido (que não existem nos NCs restantes)
                const uniqueQuestions = ncToRemove.perguntas.filter(removedQuestion => {
                  // Verificar se esta pergunta existe em algum dos NCs restantes
                  return !remainingNCs.some(remainingNC => 
                    remainingNC.perguntas.some(existingQuestion => 
                      existingQuestion.text === removedQuestion.text
                    )
                  );
                });
                
                // Se há perguntas únicas, redistribuí-las entre os NCs restantes
                if (uniqueQuestions.length > 0) {
                  const updatedNCs = remainingNCs.map((nc, index) => {
                    // Distribuir perguntas únicas de forma equilibrada
                    const questionsForThisNC = uniqueQuestions.filter((_, qIndex) => 
                      qIndex % remainingNCs.length === index
                    );
                    
                    if (questionsForThisNC.length > 0) {
                      // Criar novas perguntas com IDs únicos e sem respostas
                      const newQuestions = questionsForThisNC.map(q => ({
                        ...q,
                        id: generateUniqueId('question'),
                        response: null // Resetar resposta para que possa ser respondida novamente
                      }));
                      
                      return {
                        ...nc,
                        perguntas: [...nc.perguntas, ...newQuestions],
                        pontuacaoMaxima: nc.pontuacaoMaxima + newQuestions.reduce((sum, q) => sum + (q.weight * 10), 0)
                      };
                    }
                    
                    return nc;
                  });
                  
                  return {
                    ...item,
                    ncs: updatedNCs
                  };
                }
                
                // Se não há perguntas únicas, apenas remove o NC
                return {
                  ...item,
                  ncs: remainingNCs
                };
              }
              return item;
            })
          };
        }
        return module;
      })
    );
    toast.success("NC removida e perguntas redistribuídas!");
  };

  const handleQuestionPhoto = async (questionId: string, file: File) => {
    if (!projectDetails) return;
    
    setQuestionPhotoUploading(prev => ({ ...prev, [questionId]: true }));
    
    try {
      if (!file.type.startsWith('image/')) {
        toast.error('Arquivo deve ser uma imagem');
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Máximo 10MB');
        return;
      }

      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          if (result.startsWith('data:image/')) {
            resolve(result);
          } else {
            reject(new Error('Falha na conversão para base64'));
          }
        };
        reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
        reader.readAsDataURL(file);
      });

      let location = { latitude: 0, longitude: 0 };
      
      if (gpsLocation && gpsLocation.latitude !== 0 && gpsLocation.longitude !== 0) {
        location = {
          latitude: gpsLocation.latitude,
          longitude: gpsLocation.longitude
        };
      } else {
        location = await new Promise<{ latitude: number; longitude: number }>((resolve) => {
          if (!navigator.geolocation) {
            resolve({ latitude: 0, longitude: 0 });
            return;
          }
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              });
            },
            () => {
              resolve({ latitude: 0, longitude: 0 });
            },
            { timeout: 5000, enableHighAccuracy: false, maximumAge: 300000 }
          );
        });
      }

      let firebaseUrl = '';
      try {
        const storageRef = ref(storage, `projetos/${projectDetails.id}/perguntas/${questionId}/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        firebaseUrl = await getDownloadURL(storageRef);
      } catch (error) {
        console.warn('⚠️ Erro no backup do Firebase:', error);
      }

      const mediaAttachment: MediaAttachment = {
        id: Date.now().toString(),
        url: firebaseUrl || base64Data,
        type: 'photo',
        createdAt: new Date().toISOString(),
        uploadedBy: userData?.displayName || 'Usuário',
      };
      
      if (location.latitude !== 0) {
        mediaAttachment.latitude = location.latitude;
      }
      if (location.longitude !== 0) {
        mediaAttachment.longitude = location.longitude;
      }
      
      setModules(prevModules =>
        prevModules.map(module => ({
          ...module,
          itens: module.itens.map(item => ({
            ...item,
            ncs: item.ncs.map(nc => ({
              ...nc,
              perguntas: nc.perguntas.map(q => {
                if (q.id === questionId) {
                  const currentAttachments = q.response?.mediaAttachments || [];
                  return {
                    ...q,
                    response: {
                      ...q.response,
                      mediaAttachments: [...currentAttachments, mediaAttachment]
                    }
                  };
                }
                return q;
              })
            }))
          }))
        }))
      );
      
      if (location.latitude !== 0 && location.longitude !== 0) {
        toast.success('✅ Foto salva com localização GPS!');
      } else {
        toast.success('✅ Foto salva (sem localização GPS)');
      }
    } catch (error) {
      console.error('❌ Erro no processamento da foto:', error);
      toast.error('Erro ao processar foto');
    } finally {
      setQuestionPhotoUploading(prev => ({ ...prev, [questionId]: false }));
    }
  };

  const handleGenerateGuidance = async (questionId: string) => {
    let currentSituation = '';
    for (const module of modules) {
      for (const item of module.itens) {
        for (const nc of item.ncs) {
          const question = nc.perguntas.find(q => q.id === questionId);
          if (question) {
            currentSituation = question.response?.currentSituation || '';
            break;
          }
        }
      }
    }
    if (!currentSituation.trim()) {
      toast.error('Descreva a situação atual antes de gerar orientação');
      return;
    }

    try {
      setGeneratingGuidance(prev => ({ ...prev, [questionId]: true }));
      toast.info('Gerando orientação com IA...');
      
      // Implementação simplificada - você pode melhorar isso depois
      const assistantResponse = await fetch(`https://api.openai.com/v1/assistants/${OPENAI_ASSISTANT_ID}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "assistants=v2"
        }
      });

      if (!assistantResponse.ok) {
        throw new Error('Erro ao acessar assistente');
      }

      const assistantData = await assistantResponse.json();
      const threadResponse = await fetch("https://api.openai.com/v1/threads", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "assistants=v2"
        },
        body: JSON.stringify({})
      });

      const threadData = await threadResponse.json();
      const threadId = threadData.id;

      await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "assistants=v2"
        },
        body: JSON.stringify({
          role: "user",
          content: currentSituation
        })
      });

      const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "assistants=v2"
        },
        body: JSON.stringify({
          assistant_id: OPENAI_ASSISTANT_ID,
          instructions: assistantData.instructions,
          model: assistantData.model || "gpt-4-turbo-preview"
        })
      });

      const runData = await runResponse.json();
      const runId = runData.id;

      let status = runData.status;
      let attempts = 0;
      const maxAttempts = 60;
      while (!['completed', 'failed', 'cancelled', 'expired'].includes(status) && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        attempts++;
        const checkResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "OpenAI-Beta": "assistants=v2"
          }
        });
        const checkData = await checkResponse.json();
        status = checkData.status;
      }

      if (status !== 'completed') {
        throw new Error('Timeout ao gerar orientação');
      }

      const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "OpenAI-Beta": "assistants=v2"
        }
      });

      const messagesData = await messagesResponse.json();
      const assistantMessage = messagesData.data.find((msg: any) => msg.role === 'assistant');
      const textContent = assistantMessage.content.find((item: any) => item.type === 'text');
      const orientacao = textContent.text.value.trim();

      setModules(prevModules =>
        prevModules.map(module => ({
          ...module,
          itens: module.itens.map(item => ({
            ...item,
            ncs: item.ncs.map(nc => ({
              ...nc,
              perguntas: nc.perguntas.map(q => {
                if (q.id === questionId) {
                  return {
                    ...q,
                    response: {
                      ...q.response,
                      aiGuidance: orientacao
                    }
                  };
                }
                return q;
              })
            }))
          }))
        }))
      );

      toast.success('Orientação gerada com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar orientação:', error);
      toast.error('Erro ao gerar orientação. Tente novamente.');
    } finally {
      setGeneratingGuidance(prev => ({ ...prev, [questionId]: false }));
    }
  };

  const handleSaveProject = async () => {
    if (!projectDetails || !id) return;
    try {
      setSaving(true);
      
      // Usar a nova função de cálculo de progresso
      const progresso = calculateProgress(modules);

      const now = new Date();
      await updateDoc(doc(db, "projetos", id), {
        nome: projectDetails.nome,
        modules: modules,
        progresso: progresso,
        atualizadoEm: now,
        updatedAt: now, // Mantido para compatibilidade
        ultimaAtualizacao: now.toISOString(),
        atualizadoPor: userData?.uid || ''
      });

      try {
        await updateRelatorioAfterProjectSave(id, modules);
      } catch (error) {
        console.error('⚠️ Erro ao atualizar relatório:', error);
      }

      toast.success("Projeto salvo com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar projeto");
    } finally {
      setSaving(false);
    }
  };

  const updateRelatorioAfterProjectSave = async (projectId: string, modules: ProjectModule[]) => {
    try {
      const projectDocSnap = await getDoc(doc(db, 'projetos', projectId));
      if (!projectDocSnap.exists()) return;
      
      const projectData = projectDocSnap.data() as any;
      const itensRelatorio: RelatorioItem[] = [];
      
      modules.forEach((module, modIndex) => {
        if (module.itens && Array.isArray(module.itens)) {
          module.itens.forEach((item, itemIndex) => {
            if (item.ncs && Array.isArray(item.ncs)) {
              item.ncs.forEach((nc, ncIndex) => {
                const itemId = `mod${modIndex}_item${itemIndex}_nc${ncIndex}`;
                
                let currentSituation = '';
                let clientGuidance = '';
                let photos: string[] = [];
                
                if (nc.perguntas && Array.isArray(nc.perguntas)) {
                  const situacoes = nc.perguntas
                    .map(p => p.response?.currentSituation)
                    .filter(s => s && s.trim() !== '');
                  currentSituation = situacoes.join(' | ');
                  
                  const orientacoes = nc.perguntas
                    .map(p => p.response?.aiGuidance)
                    .filter(g => g && g.trim() !== '');
                  clientGuidance = orientacoes.join(' | ');
                  
                  nc.perguntas.forEach(pergunta => {
                    if (pergunta.response?.mediaAttachments && Array.isArray(pergunta.response.mediaAttachments)) {
                      pergunta.response.mediaAttachments.forEach(media => {
                        if (media.url) {
                          photos.push(media.url);
                        }
                      });
                    }
                  });
                }
                
                itensRelatorio.push({
                  id: itemId,
                  category: module.titulo || `Módulo ${modIndex + 1}`,
                  itemTitle: item.titulo || `Item ${itemIndex + 1}`,
                  subItemId: nc.id || itemId,
                  subItemTitle: nc.ncTitulo || `NC ${nc.numero}`,
                  local: (nc as any).local || 'A definir',
                  currentSituation: currentSituation,
                  clientGuidance: clientGuidance,
                  responsible: '',
                  whatWasDone: '',
                  startDate: '',
                  endDate: '',
                  status: nc.status || 'pending',
                  evaluation: '',
                  photos: photos,
                  adequacyReported: false,
                  adequacyStatus: (nc.status === 'completed' ? 'completed' : 'pending') as 'pending' | 'completed' | 'not_applicable',
                  adequacyDetails: '',
                  adequacyImages: [],
                  adequacyDate: '',
                  changesDescription: '',
                  treatmentDeadline: '',
                  updatedAt: new Date().toISOString(),
                  updatedBy: userData?.uid || ''
                });
              });
            }
          });
        }
      });
      
      const statistics = {
        totalItems: itensRelatorio.length,
        completedItems: itensRelatorio.filter(item => item.status === 'completed').length,
        pendingItems: itensRelatorio.filter(item => item.status === 'pending').length,
        inProgressItems: itensRelatorio.filter(item => item.status === 'in_progress').length
      };

      const relatorioDoc: Relatorio = {
        id: projectId,
        projectId,
        projectName: projectData.nome || 'Projeto sem nome',
        clientId: projectData.clienteId || '',
        clientName: projectData.cliente?.nome || 'Cliente não informado',
        clientEmail: projectData.cliente?.email || '',
        itens: itensRelatorio,
        statistics,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: userData?.uid || '',
        updatedBy: userData?.uid || ''
      };

      await setDoc(doc(db, 'relatorios', projectId), relatorioDoc);
    } catch (error) {
      console.error('❌ Erro ao sincronizar relatório:', error);
      throw error;
    }
  };

  const handleCompleteProject = async () => {
    if (!projectDetails || !id) return;
    if (projectDetails.progresso !== 100) {
      toast.error("O projeto precisa estar 100% completo para ser concluído");
      return;
    }
    try {
      setSaving(true);
      
      const now = new Date();
      await updateDoc(doc(db, "projetos", id), {
        status: 'Concluído' as const,
        dataFinalizacao: now.toISOString(),
        finalizadoPor: userData?.uid || '',
        atualizadoEm: now,
        updatedAt: now, // Mantido para compatibilidade
        ultimaAtualizacao: now.toISOString()
      });
      toast.success("Projeto concluído com sucesso! 🎉");
      
      setTimeout(() => {
        navigate('/dashboard', { state: { activeTab: 'projetos' } });
      }, 1500);
    } catch (error) {
      console.error("Erro ao concluir projeto:", error);
      toast.error("Erro ao concluir projeto");
    } finally {
      setSaving(false);
    }
  };

  const loadPresets = async () => {
    try {
      setLoadingPresets(true);
      const presetsRef = collection(db, 'presets');
      const presetsSnap = await getDocs(presetsRef);
      const presetsList = presetsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAvailablePresets(presetsList);
    } catch (error) {
      console.error('❌ Erro ao carregar presets:', error);
      toast.error('Erro ao carregar presets');
    } finally {
      setLoadingPresets(false);
    }
  };

  const handleImportPreset = async () => {
    if (!selectedPresetId) {
      toast.error('Selecione um preset');
      return;
    }

    try {
      setImportingPreset(true);
      const selectedPreset = availablePresets.find(p => p.id === selectedPresetId);
      
      if (!selectedPreset) {
        toast.error('Preset não encontrado');
        return;
      }

      const newModules: ProjectModule[] = [];
      
      if (selectedPreset.areas && Array.isArray(selectedPreset.areas)) {
        selectedPreset.areas.forEach((area: any, mIdx: number) => {
          const moduleId = generateUniqueId('module');
          const moduleItems: any[] = [];
          
          if (area.items && Array.isArray(area.items)) {
            area.items.forEach((item: any, iIdx: number) => {
              const itemId = generateUniqueId('item');
              const ncId = generateUniqueId('nc');
              
              const weightedQuestion: WeightedQuestion = {
                id: generateUniqueId('question'),
                text: item.description || item.title || 'Pergunta sem título',
                weight: 2,
                required: false,
                responseOptions: ['na', 'very_bad', 'good'],
                response: null,
                order: iIdx + 1
              };
              
              const nc: NC = {
                id: ncId,
                numero: 1,
                ncTitulo: `NC 1`,
                perguntas: [weightedQuestion],
                pontuacaoAtual: 0,
                pontuacaoMaxima: RESPONSE_VALUES.good * weightedQuestion.weight,
                status: 'pending'
              };
              
              moduleItems.push({
                id: itemId,
                titulo: item.title || 'Item sem título',
                descricao: item.description,
                ordem: item.order || iIdx + 1,
                ncs: [nc],
                pontuacaoAtual: 0,
                pontuacaoMaxima: RESPONSE_VALUES.good * weightedQuestion.weight
              });
            });
          }
          
          if (moduleItems.length > 0) {
            newModules.push({
              id: moduleId,
              titulo: area.name || `Módulo ${mIdx + 1}`,
              ordem: area.order || mIdx + 1,
              itens: moduleItems
            });
          }
        });
      }
      
      if (newModules.length === 0) {
        toast.error('Preset vazio ou sem conteúdo válido');
        return;
      }
      
      const sanitizedModules = sanitizeDuplicateIds(newModules);
      setModules(sanitizedModules);
      
      if (sanitizedModules.length > 0 && sanitizedModules[0].itens.length > 0) {
        setCurrentModuleId(sanitizedModules[0].id);
        setCurrentItemId(sanitizedModules[0].itens[0].id);
        setCurrentNcId(sanitizedModules[0].itens[0].ncs[0].id);
      }
      
      setShowPresetModal(false);
      setSelectedPresetId('');
      toast.success('Preset importado com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao importar preset:', error);
      toast.error('Erro ao importar preset');
    } finally {
      setImportingPreset(false);
    }
  };

  const handleOpenPresetModal = () => {
    setShowPresetModal(true);
    loadPresets();
  };

  const currentModule = modules.find(m => m.id === currentModuleId);
  const currentWeightedItem = currentModule?.itens.find(i => i.id === currentItemId);
  const currentNC = currentWeightedItem?.ncs.find(nc => nc.id === currentNcId);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cerrado-green1 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando projeto...</p>
        </div>
      </div>
    );
  }

  if (!projectDetails) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Projeto não encontrado</p>
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
        className="h-full flex-shrink-0"
        showMobileButton={true}
        isOpen={isSidebarOpen}
        onOpenChange={setIsSidebarOpen}
      />

      <div className="flex-1 overflow-hidden w-full flex flex-col">
        <div className="flex-1 px-4 pt-2 pb-4 md:p-6 md:m-4 md:border md:border-gray-350 md:rounded-lg md:shadow-md bg-white overflow-y-auto">
          {currentNC ? (
            <div className="max-w-4xl mx-auto">
              {currentWeightedItem && (
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
                        {currentWeightedItem.titulo}
                      </h2>
                    </div>
                  </div>
                </div>
              )}

              {/* Botão Flutuante da Estrutura do Projeto - Removido pois está no HierarchicalProjectSidebar */}

              <div className="hidden md:block bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4">
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
                    <div className="flex-1 max-w-md">
                      <Input
                        value={projectDetails.nome}
                        onChange={(e) => setProjectDetails({ ...projectDetails, nome: e.target.value })}
                        placeholder="Digite o nome do projeto..."
                        className="text-xl font-bold border-none p-0 h-auto bg-transparent focus-visible:ring-0 shadow-none"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-700">Progresso Geral</div>
                      <div className="text-2xl font-bold text-blue-600">{projectDetails.progresso}%</div>
                    </div>
                    <Progress value={projectDetails.progresso} className="w-32" />
                    <div className="flex items-center gap-2">
                      <Button onClick={handleSaveProject} disabled={saving} size="icon">
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button 
                        onClick={handleCompleteProject}
                        className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                        disabled={saving || projectDetails.progresso !== 100}
                        size="icon"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {currentModule && currentWeightedItem && (
                <div className="hidden md:block mb-4 bg-gradient-to-r from-cerrado-green1 to-cerrado-green2 rounded-lg p-4 shadow-md text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                      Módulo
                    </Badge>
                    <h3 className="text-lg font-bold uppercase">{currentModule.titulo}</h3>
                  </div>
                  <div className="flex items-start gap-3 mt-3 pl-4 border-l-2 border-white/30">
                    <FileText className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{currentWeightedItem.titulo}</div>
                      {currentWeightedItem.descricao && (
                        <div className="text-xs text-white/80 mt-1">{currentWeightedItem.descricao}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div id="nc-actions-buttons" className="mb-6 flex gap-2 justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => addNC(currentModuleId, currentItemId)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {currentNC.perguntas && currentNC.perguntas.length > 0 && (
                <div className="space-y-4">
                  {currentNC.perguntas.map((question: WeightedQuestion, index: number) => (
                    <Card key={question.id} className="shadow-sm relative">
                      {currentWeightedItem && currentWeightedItem.ncs.length > 1 && (
                        <div className="absolute top-4 right-4 z-10">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setDeleteNCModal({ open: true, ncId: currentNcId, ncTitle: currentNC.ncTitulo })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      
                      <CardHeader className="pb-4">
                        <Input
                          value={currentNC.ncTitulo}
                          onChange={(e) => {
                            setModules(prevModules =>
                              prevModules.map(module => ({
                                ...module,
                                itens: module.itens.map(item => ({
                                  ...item,
                                  ncs: item.ncs.map(nc => 
                                    nc.id === currentNcId ? { ...nc, ncTitulo: e.target.value } : nc
                                  )
                                }))
                              }))
                            );
                          }}
                          placeholder="Título da NC..."
                          className="text-lg font-semibold border-none p-0 h-auto bg-transparent focus-visible:ring-0 shadow-none mb-2 hover:bg-gray-50 px-2 py-1 -mx-2 rounded transition-colors"
                        />
                        
                        <Input
                          value={currentNC.local || ''}
                          onChange={(e) => {
                            setModules(prevModules =>
                              prevModules.map(module => ({
                                ...module,
                                itens: module.itens.map(item => ({
                                  ...item,
                                  ncs: item.ncs.map(nc => 
                                    nc.id === currentNcId ? { ...nc, local: e.target.value } : nc
                                  )
                                }))
                              }))
                            );
                          }}
                          placeholder="📍 Local (ex: Portaria Principal, Setor A, Câmera 5...)"
                          className="text-sm text-gray-600 border-none p-0 h-auto bg-transparent focus-visible:ring-0 shadow-none mb-3 hover:bg-gray-50 px-2 py-1 -mx-2 rounded transition-colors"
                        />
                        
                        <div className="text-sm text-gray-600 font-normal">
                          {question.text}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label className="text-sm text-gray-600 mb-3 block">
                            Selecione uma resposta:
                          </Label>
                          <div className="flex gap-3 flex-wrap justify-center">
                            <Button
                              variant={question.response?.selectedOption === 'very_bad' ? 'default' : 'outline'}
                              size="lg"
                              onClick={() => handleWeightedResponseChange(question.id, 'very_bad')}
                              className={question.response?.selectedOption === 'very_bad' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
                            >
                              NC
                            </Button>
                            <Button
                              variant={question.response?.selectedOption === 'good' ? 'default' : 'outline'}
                              size="lg"
                              onClick={() => handleWeightedResponseChange(question.id, 'good')}
                              className={question.response?.selectedOption === 'good' ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : ''}
                            >
                              R
                            </Button>
                            <Button
                              variant={question.response?.selectedOption === 'na' ? 'default' : 'outline'}
                              size="lg"
                              onClick={() => handleWeightedResponseChange(question.id, 'na')}
                              className={question.response?.selectedOption === 'na' ? 'bg-gray-600 hover:bg-gray-700 text-white' : ''}
                            >
                              N/A
                            </Button>
                          </div>
                        </div>

                        {showSituacaoAtual[question.id] === true && (
                          <>
                            <div className="mt-4">
                              <div className="flex items-center justify-between mb-2">
                                <Label className="text-sm font-medium text-gray-700">Situação Atual</Label>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleGenerateGuidance(question.id)}
                                  disabled={generatingGuidance[question.id] || !question.response?.currentSituation?.trim()}
                                  className="h-8 w-8"
                                >
                                  {generatingGuidance[question.id] ? (
                                    <Clock className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Sparkles className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                              <Textarea
                                id={`situacao-atual-${question.id}`}
                                value={question.response?.currentSituation || ''}
                                onChange={(e) => {
                                  setModules(prevModules =>
                                    prevModules.map(module => ({
                                      ...module,
                                      itens: module.itens.map(item => ({
                                        ...item,
                                        ncs: item.ncs.map(nc => ({
                                          ...nc,
                                          perguntas: nc.perguntas.map(q => {
                                            if (q.id === question.id) {
                                              return {
                                                ...q,
                                                response: {
                                                  ...q.response,
                                                  currentSituation: e.target.value
                                                }
                                              };
                                            }
                                            return q;
                                          })
                                        }))
                                      }))
                                    }))
                                  );
                                }}
                                placeholder="Descreva a situação atual encontrada..."
                                className="min-h-[80px] bg-amber-50 border-amber-200"
                              />
                            </div>
                            {question.response?.aiGuidance && (
                              <div className="mt-4">
                                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                                  <div className="flex items-start gap-2">
                                    <Sparkles className="h-4 w-4 text-purple-600 mt-0.5" />
                                    <div className="flex-1">
                                      <p className="text-xs font-medium text-purple-900 mb-1">Orientação (IA)</p>
                                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{question.response.aiGuidance}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {!isMobile && showPhotosDesktop[question.id] && (
                          <div className="pt-4 border-t border-gray-200">
                            <div className="flex items-center gap-2 mb-3">
                              <Camera className="h-4 w-4 text-gray-600" />
                              <span className="text-sm font-medium text-gray-700">
                                {question.response?.mediaAttachments?.length ? 
                                  `${question.response.mediaAttachments.length} foto(s) anexada(s)` : 
                                  'Anexar fotos'
                                }
                              </span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              {question.response?.mediaAttachments?.map((media, idx) => (
                                <div key={idx} className="relative group">
                                  <img
                                    src={media.url}
                                    alt={`Foto ${idx + 1}`}
                                    className="w-full h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => window.open(media.url, '_blank')}
                                  />
                                  {media.latitude && media.longitude && (
                                    <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-[10px]">
                                      📍 GPS
                                    </div>
                                  )}
                                </div>
                              ))}
                              <button
                                onClick={() => document.getElementById(`file-${question.id}`)?.click()}
                                className="w-full h-32 rounded-lg border-2 border-dashed border-gray-300 hover:border-cerrado-green1 hover:bg-cerrado-green1/5 transition-colors flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-cerrado-green1"
                              >
                                <Plus className="h-8 w-8" />
                                <span className="text-xs">Adicionar</span>
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2 pt-4 border-t border-gray-200 justify-center">
                          <input
                            type="file"
                            id={`file-${question.id}`}
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleQuestionPhoto(question.id, file);
                            }}
                          />
                          
                          <Button
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              if (isMobile) {
                                setPhotoDrawerOpen(question.id);
                              } else {
                                const newPhotoState = !showPhotosDesktop[question.id];
                                setShowPhotosDesktop(prev => ({
                                  ...prev,
                                  [question.id]: newPhotoState
                                }));
                                if (newPhotoState) {
                                  setShowSituacaoAtual(prev => ({ ...prev, [question.id]: false }));
                                }
                              }
                            }}
                            disabled={questionPhotoUploading[question.id]}
                          >
                            {questionPhotoUploading[question.id] ? (
                              <>
                                <Clock className="h-4 w-4 mr-2 animate-spin" />
                                Processando...
                              </>
                            ) : (
                              <>
                                <Paperclip className="h-4 w-4 mr-2" />
                                {!isMobile && showPhotosDesktop[question.id] ? 'Ocultar Fotos' : 'Anexar Foto'}
                              </>
                            )}
                          </Button>
                          
                          <Button
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              const newCommentState = !showSituacaoAtual[question.id];
                              setShowSituacaoAtual(prev => ({ ...prev, [question.id]: newCommentState }));
                              
                              if (newCommentState) {
                                setShowPhotosDesktop(prev => ({ ...prev, [question.id]: false }));
                                
                                setTimeout(() => {
                                  const situacaoAtualField = document.getElementById(`situacao-atual-${question.id}`);
                                  if (situacaoAtualField) {
                                    situacaoAtualField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    setTimeout(() => situacaoAtualField.focus(), 300);
                                  }
                                }, 100);
                              }
                            }}
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            {showSituacaoAtual[question.id] === true ? 'Ocultar' : 'Comentar'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : modules.length === 0 ? (
            <div className="max-w-2xl mx-auto text-center py-12">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Projeto Vazio</h3>
              <p className="text-gray-500 mb-6">
                Comece importando um preset ou adicione artigos manualmente para estruturar seu projeto.
              </p>
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={handleOpenPresetModal}
                  className="bg-cerrado-green1 hover:bg-cerrado-green2"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Importar Preset
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    toast.info("Funcionalidade de adicionar artigos manualmente em desenvolvimento");
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Artigo
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">Selecione uma NC na sidebar para começar</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showPresetModal} onOpenChange={setShowPresetModal}>
        <DialogContent className="w-[90vw] max-w-[400px] sm:max-w-[450px] rounded-2xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Importar Preset</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Selecione um preset para importar a estrutura de avaliação
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-3 sm:py-4">
            {loadingPresets ? (
              <div className="flex items-center justify-center py-6 sm:py-8">
                <Clock className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-cerrado-green1" />
              </div>
            ) : availablePresets.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-gray-500">
                <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm">Nenhum preset disponível</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                <Label htmlFor="preset-select" className="text-sm">Selecione um preset:</Label>
                <Select value={selectedPresetId} onValueChange={setSelectedPresetId}>
                  <SelectTrigger id="preset-select" className="h-9 sm:h-10">
                    <SelectValue placeholder="Escolha um preset..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePresets.map((preset) => (
                      <SelectItem key={preset.id} value={preset.id} className="text-sm">
                        {preset.nome || preset.title || 'Preset sem nome'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowPresetModal(false);
                setSelectedPresetId('');
              }}
              className="h-9 text-sm"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleImportPreset}
              disabled={!selectedPresetId || importingPreset}
              className="bg-cerrado-green1 hover:bg-cerrado-green2 h-9 text-sm"
            >
              {importingPreset ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Importar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={photoDrawerOpen !== null} onOpenChange={(open) => !open && setPhotoDrawerOpen(null)}>
        <SheetContent side="right" className="w-[90vw] sm:w-96 p-0 top-14 bottom-0 h-auto [&>button]:hidden flex flex-col">
          <SheetHeader className="p-4 border-b bg-blue-50 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-blue-600" />
              <SheetTitle>Fotos Anexadas</SheetTitle>
            </div>
          </SheetHeader>
          
          <div className="flex-1 p-4 overflow-y-auto min-h-0">
            {photoDrawerOpen && (() => {
              let currentQuestion: WeightedQuestion | null = null;
              for (const module of modules) {
                for (const item of module.itens) {
                  for (const nc of item.ncs) {
                    const found = nc.perguntas.find(q => q.id === photoDrawerOpen);
                    if (found) {
                      currentQuestion = found;
                      break;
                    }
                  }
                }
              }
              
              if (!currentQuestion || !currentQuestion.response?.mediaAttachments) {
                return (
                  <div className="text-center py-8 text-gray-500">
                    <Camera className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>Nenhuma foto anexada ainda</p>
                  </div>
                );
              }
              
              return (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">
                      {currentQuestion.response.mediaAttachments.length} foto(s) anexada(s):
                    </h4>
                    
                    {currentQuestion.response.mediaAttachments.map((media, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="relative rounded-lg overflow-hidden border border-gray-200 w-[100px] h-[100px] flex-shrink-0">
                          <img 
                            src={media.url} 
                            alt={`Foto ${idx + 1}`}
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => window.open(media.url, '_blank')}
                          />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-gray-600">
                              <Camera className="h-4 w-4" />
                              <span className="text-sm">Foto {idx + 1}</span>
                            </div>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                                  <MoreVertical className="h-4 w-4 text-gray-600" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => window.open(media.url, '_blank')}>
                                  <FileText className="h-4 w-4 mr-2" />
                                  Abrir em Nova Aba
                                </DropdownMenuItem>
                                {media.latitude && media.longitude && (
                                  <DropdownMenuItem
                                    onClick={() => window.open(`https://www.google.com/maps?q=${media.latitude},${media.longitude}`, '_blank')}
                                  >
                                    <MapPin className="h-4 w-4 mr-2" />
                                    Ver no Mapa
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          
                          {media.latitude && media.latitude !== 0 && (
                            <div className="text-xs text-green-600 mb-2">
                              📍 GPS: {media.latitude.toFixed(6)}, {media.longitude.toFixed(6)}
                            </div>
                          )}
                          
                          <div className="text-xs text-gray-400">
                            {new Date(media.createdAt).toLocaleString('pt-BR')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-center mt-4">
                    <Button
                      size="lg"
                      className="rounded-full h-16 w-16 bg-cerrado-green1 hover:bg-cerrado-green2"
                      onClick={() => {
                        if (photoDrawerOpen) {
                          document.getElementById(`file-${photoDrawerOpen}`)?.click();
                        }
                      }}
                      disabled={photoDrawerOpen ? questionPhotoUploading[photoDrawerOpen] : false}
                    >
                      {photoDrawerOpen && questionPhotoUploading[photoDrawerOpen] ? (
                        <Clock className="h-8 w-8 animate-spin" />
                      ) : (
                        <Plus className="h-8 w-8" />
                      )}
                    </Button>
                  </div>
                </div>
              );
            })()}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={deleteNCModal.open} onOpenChange={(open) => !open && setDeleteNCModal({ open: false, ncId: '', ncTitle: '' })}>
        <DialogContent className="w-[90vw] max-w-md sm:w-full rounded-lg">
          <DialogHeader className="space-y-3">
            <DialogTitle className="flex items-center justify-center sm:justify-start gap-2 text-red-600 text-xl">
              <Trash2 className="h-6 w-6" />
              Remover NC
            </DialogTitle>
            <DialogDescription className="text-left pt-2 text-base leading-relaxed">
              Tem certeza que deseja remover a NC <strong className="text-foreground">"{deleteNCModal.ncTitle}"</strong>?
              <br />
              <br />
              <span className="text-sm text-muted-foreground">
                Esta ação não pode ser desfeita e todas as informações associadas serão perdidas.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteNCModal({ open: false, ncId: '', ncTitle: '' })}
              className="w-full sm:w-auto order-2 sm:order-1 h-11"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                removeNC(currentModuleId, currentItemId, deleteNCModal.ncId);
                setDeleteNCModal({ open: false, ncId: '', ncTitle: '' });
                toast.success('NC removida com sucesso!');
              }}
              className="w-full sm:w-auto order-1 sm:order-2 h-11"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remover NC
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectWrite;

