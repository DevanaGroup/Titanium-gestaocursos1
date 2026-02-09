import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Database,
  Users,
  GraduationCap,
  BookOpen,
  CalendarDays,
  KanbanSquare,
  Upload,
  Download,
  Trash2,
  Grid3x3,
  List,
  Loader2,
  Copy,
  UserCircle,
  Eye,
  EyeOff,
  Menu,
} from "lucide-react";
import { SidebarProvider } from "@/contexts/SidebarContext";
import CustomSidebar from "@/components/CustomSidebar";
import { auth, db } from "@/config/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { getLevelNumber } from "@/utils/hierarchyUtils";
import { HierarchyLevel } from "@/types";
import { ImportProgressDialog, ImportProgress } from "@/components/database/ImportProgressDialog";
import {
  importCollaboratorsFromCSV,
  importTeachersFromCSV,
  importCoursesFromCSV,
  importLessonsFromCSV,
  importEventsFromCSV,
  importTasksFromCSV,
  ImportResult,
} from "@/services/bulkImportService";
import {
  downloadCollaboratorsTemplate,
  downloadTeachersTemplate,
  downloadCoursesTemplate,
  downloadLessonsTemplate,
  downloadEventsTemplate,
  downloadTasksTemplate,
} from "@/utils/csvTemplates";

const AdminDatabase = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<HierarchyLevel>("Nível 5");
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("collaborators");
  const [isImporting, setIsImporting] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "table">("table");

  // Estado do progresso de importação
  const [importProgress, setImportProgress] = useState<ImportProgress>({
    current: 0,
    total: 0,
    currentItem: "",
    success: 0,
    failed: 0,
    errors: [],
    warnings: [],
  });
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [isImportComplete, setIsImportComplete] = useState(false);
  const [teacherDefaultPassword, setTeacherDefaultPassword] = useState("");
  const [showTeacherPassword, setShowTeacherPassword] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Verificar permissão de acesso
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setIsLoading(true);
      try {
        if (!currentUser) {
          navigate("/dashboard");
          return;
        }

        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const role = userData.hierarchyLevel || "Nível 5";
          setUserRole(role);

          // Apenas Nível 0 pode acessar
          const levelNum = getLevelNumber(role);
          if (levelNum !== 0) {
            toast({
              variant: "destructive",
              title: "Acesso Negado",
              description: "Você não tem permissão para acessar esta página.",
            });
            navigate("/dashboard");
            return;
          }
        } else {
          navigate("/dashboard");
        }
      } catch (error) {
        console.error("Erro ao verificar acesso:", error);
        navigate("/dashboard");
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate, toast]);

  const [currentImportType, setCurrentImportType] = useState<string>("");

  // Handler para importação de CSV
  const handleCSVImport = async (file: File, type: string) => {
    setIsImporting(true);
    setCurrentImportType(type);
    setShowProgressDialog(true);
    setIsImportComplete(false);
    setImportProgress({
      current: 0,
      total: 0,
      currentItem: "Abrindo arquivo...",
      success: 0,
      failed: 0,
      errors: [],
      warnings: [],
    });

    try {
      let result: ImportResult;

      switch (type) {
        case "collaborators":
          result = await importCollaboratorsFromCSV(file, (progress) => {
            setImportProgress(progress);
          });
          break;
        case "teachers":
          result = await importTeachersFromCSV(
            file,
            (progress) => setImportProgress(progress),
            { defaultPassword: teacherDefaultPassword.trim() || undefined }
          );
          break;
        case "courses":
          result = await importCoursesFromCSV(file, (progress) => {
            setImportProgress(progress);
          });
          break;
        case "lessons":
          result = await importLessonsFromCSV(file, (progress) => {
            setImportProgress(progress);
          });
          break;
        case "events":
          result = await importEventsFromCSV(file, (progress) => {
            setImportProgress(progress);
          });
          break;
        case "tasks":
          result = await importTasksFromCSV(file, (progress) => {
            setImportProgress(progress);
          });
          break;
        default:
          throw new Error("Tipo de importação inválido");
      }

      setIsImportComplete(true);
      
      if (result.success > 0) {
        toast({
          title: "Importação Concluída",
          description: `${result.success} registro(s) importado(s) com sucesso.`,
        });
      }

      if (result.failed > 0) {
        toast({
          variant: "destructive",
          title: "Alguns registros falharam",
          description: `${result.failed} registro(s) não foram importados.`,
        });
      }
    } catch (error: any) {
      console.error("Erro na importação:", error);
      toast({
        variant: "destructive",
        title: "Erro na Importação",
        description: error.message || "Ocorreu um erro ao importar os dados.",
      });
      setIsImportComplete(true);
    } finally {
      setIsImporting(false);
    }
  };

  // Handler para download de template
  const handleDownloadTemplate = (type: string) => {
    try {
      switch (type) {
        case "collaborators":
          downloadCollaboratorsTemplate();
          break;
        case "teachers":
          downloadTeachersTemplate();
          break;
        case "courses":
          downloadCoursesTemplate();
          break;
        case "lessons":
          downloadLessonsTemplate();
          break;
        case "events":
          downloadEventsTemplate();
          break;
        case "tasks":
          downloadTasksTemplate();
          break;
        default:
          throw new Error("Tipo de template inválido");
      }

      toast({
        title: "Template Baixado",
        description: "O arquivo modelo foi baixado com sucesso.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao Baixar Template",
        description: error.message,
      });
    }
  };

  if (isLoading) {
    return (
      <SidebarProvider>
        <div className="flex h-screen w-full overflow-hidden">
          <CustomSidebar 
            activeTab="database" 
            onTabChange={() => {}}
            mobileOpen={mobileSidebarOpen}
            onMobileOpenChange={setMobileSidebarOpen}
          />
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <CustomSidebar 
          activeTab="database" 
          onTabChange={(tab) => navigate(`/${tab}`)}
          mobileOpen={mobileSidebarOpen}
          onMobileOpenChange={setMobileSidebarOpen}
        />
        
        <div className="flex-1 flex flex-col min-h-screen md:h-screen w-full">
          {/* Header Mobile */}
          <header className="bg-white text-gray-900 p-2 md:p-3 h-14 md:h-[80px] shadow-md z-30 border-b border-gray-200 flex-shrink-0 md:hidden">
            <div className="flex items-center h-full">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileSidebarOpen(true)}
                className="text-gray-900 hover:bg-gray-100 h-10 w-10"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <h1 className="ml-3 text-lg font-semibold truncate">Banco de Dados</h1>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 p-2 sm:p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
              {/* Header Desktop */}
              <div className="mb-6 hidden md:block">
                <div className="flex items-center gap-3 mb-2">
                  <Database className="h-8 w-8 text-primary" />
                  <h1 className="text-3xl font-bold text-gray-900">Gerenciar Banco de Dados</h1>
                </div>
                <p className="text-gray-600">
                  Cadastre e importe dados em massa via CSV. Gerencie colaboradores, professores, cursos e mais.
                </p>
              </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid grid-cols-6 w-full">
                <TabsTrigger value="collaborators" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Colaboradores</span>
                </TabsTrigger>
                <TabsTrigger value="teachers" className="flex items-center gap-2">
                  <UserCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Professores</span>
                </TabsTrigger>
                <TabsTrigger value="courses" className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  <span className="hidden sm:inline">Cursos</span>
                </TabsTrigger>
                <TabsTrigger value="lessons" className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  <span className="hidden sm:inline">Aulas</span>
                </TabsTrigger>
                <TabsTrigger value="events" className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  <span className="hidden sm:inline">Eventos</span>
                </TabsTrigger>
                <TabsTrigger value="tasks" className="flex items-center gap-2">
                  <KanbanSquare className="h-4 w-4" />
                  <span className="hidden sm:inline">Tarefas</span>
                </TabsTrigger>
              </TabsList>

              {/* Collaborators Tab */}
              <TabsContent value="collaborators">
                <ImportTabContent
                  title="Colaboradores"
                  description="Importe colaboradores em massa via CSV"
                  type="collaborators"
                  onImport={handleCSVImport}
                  onDownloadTemplate={handleDownloadTemplate}
                  isImporting={isImporting}
                />
              </TabsContent>

              {/* Teachers Tab */}
              <TabsContent value="teachers">
                <ImportTabContent
                  title="Professores"
                  description="Importe professores em massa via CSV"
                  type="teachers"
                  onImport={handleCSVImport}
                  onDownloadTemplate={handleDownloadTemplate}
                  isImporting={isImporting}
                  columns={TEACHERS_CSV_COLUMNS}
                  extraContent={
                    <div className="space-y-2">
                      <Label htmlFor="teacher-default-password">Senha padrão (obrigatória para importar)</Label>
                      <div className="relative max-w-xs">
                        <Input
                          id="teacher-default-password"
                          type={showTeacherPassword ? "text" : "password"}
                          placeholder="Mín. 6 caracteres"
                          value={teacherDefaultPassword}
                          onChange={(e) => setTeacherDefaultPassword(e.target.value)}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowTeacherPassword((v) => !v)}
                          aria-label={showTeacherPassword ? "Ocultar senha" : "Mostrar senha"}
                        >
                          {showTeacherPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Cada professor é cadastrado como usuário (Nível 6) no Firebase Auth e em Firestore. A senha padrão é obrigatória para a importação.
                      </p>
                    </div>
                  }
                />
              </TabsContent>

              {/* Courses Tab */}
              <TabsContent value="courses">
                <ImportTabContent
                  title="Cursos"
                  description="Importe cursos em massa via CSV"
                  type="courses"
                  onImport={handleCSVImport}
                  onDownloadTemplate={handleDownloadTemplate}
                  isImporting={isImporting}
                />
              </TabsContent>

              {/* Lessons Tab */}
              <TabsContent value="lessons">
                <ImportTabContent
                  title="Aulas"
                  description="Importe aulas em massa via CSV"
                  type="lessons"
                  onImport={handleCSVImport}
                  onDownloadTemplate={handleDownloadTemplate}
                  isImporting={isImporting}
                />
              </TabsContent>

              {/* Events Tab */}
              <TabsContent value="events">
                <ImportTabContent
                  title="Eventos"
                  description="Importe eventos em massa via CSV"
                  type="events"
                  onImport={handleCSVImport}
                  onDownloadTemplate={handleDownloadTemplate}
                  isImporting={isImporting}
                />
              </TabsContent>

              {/* Tasks Tab */}
              <TabsContent value="tasks">
                <ImportTabContent
                  title="Tarefas"
                  description="Importe tarefas em massa via CSV"
                  type="tasks"
                  onImport={handleCSVImport}
                  onDownloadTemplate={handleDownloadTemplate}
                  isImporting={isImporting}
                />
              </TabsContent>
            </Tabs>

            {/* Progress Dialog */}
            <ImportProgressDialog
              open={showProgressDialog}
              onOpenChange={setShowProgressDialog}
              progress={importProgress}
              isComplete={isImportComplete}
              importType={currentImportType}
            />
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

// Colunas esperadas no CSV de professores (para exibir na aba Professores)
const TEACHERS_CSV_COLUMNS: { name: string; description: string }[] = [
  { name: "fullName", description: "Nome completo" },
  { name: "birthDate", description: "Data de nascimento (dd/MM/yyyy)" },
  { name: "cro", description: "CRO-Estado (ex: 000000-SP)" },
  { name: "cpf", description: "CPF sem pontuação" },
  { name: "phone", description: "Telefone/WhatsApp com DDD (ex: 11 98888-7777)" },
  { name: "email", description: "E-mail (obrigatório)" },
  { name: "street", description: "Endereço (rua)" },
  { name: "number", description: "Número" },
  { name: "neighborhood", description: "Bairro" },
  { name: "city", description: "Cidade" },
  { name: "state", description: "Estado (UF)" },
  { name: "cep", description: "CEP" },
  { name: "travelAvailability", description: "Disponibilidade de deslocamento (Dentro do estado / Fora do estado / Brasil todo / Internacional)" },
  { name: "availableOutsideBrazil", description: "Disponibilidade para treinamentos fora do Brasil (Sim/Não)" },
  { name: "languages", description: "Idiomas (separados por vírgula, ex: Português,Inglês,Espanhol)" },
  { name: "noticePeriodDays", description: "Prazo mínimo de antecedência para solicitar aulas (dias)" },
  { name: "miniCurriculo", description: "Mini currículo com os 5 principais títulos" },
  { name: "observation", description: "Observação" },
  { name: "lgpdConsent", description: "Consentimento LGPD (Sim/Não)" },
];

// Componente reutilizável para cada tab
interface ImportTabContentProps {
  title: string;
  description: string;
  type: string;
  onImport: (file: File, type: string) => void;
  onDownloadTemplate: (type: string) => void;
  isImporting: boolean;
  columns?: { name: string; description: string }[];
  extraContent?: React.ReactNode;
}

const ImportTabContent: React.FC<ImportTabContentProps> = ({
  title,
  description,
  type,
  onImport,
  onDownloadTemplate,
  isImporting,
  columns,
  extraContent,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleImportClick = () => {
    if (selectedFile) {
      onImport(selectedFile, type);
      setSelectedFile(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Importação em Massa */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Importação em Massa (CSV)</h3>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
                <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <Label htmlFor={`file-${type}`} className="cursor-pointer">
                  <span className="text-sm text-gray-600">
                    {selectedFile ? selectedFile.name : "Clique para selecionar arquivo CSV"}
                  </span>
                  <Input
                    id={`file-${type}`}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={isImporting}
                  />
                </Label>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => onDownloadTemplate(type)}
                  variant="outline"
                  className="flex-1"
                  disabled={isImporting}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Modelo
                </Button>
                <Button
                  onClick={handleImportClick}
                  disabled={!selectedFile || isImporting}
                  className="flex-1"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Importar
                    </>
                  )}
                </Button>
              </div>

              <p className="text-xs text-gray-500">
                Planilha normal (Excel, Google Sheets). Aceita vírgula (,) ou ponto e vírgula (;).
                Se houver cabeçalho, use a coluna correspondente.
              </p>

              {extraContent}
            </div>

            {/* Informações */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Instruções</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                <p className="text-sm text-blue-900">
                  <strong>1.</strong> Baixe o modelo CSV clicando em "Baixar Modelo"
                </p>
                <p className="text-sm text-blue-900">
                  <strong>2.</strong> Preencha os dados no arquivo
                </p>
                <p className="text-sm text-blue-900">
                  <strong>3.</strong> Selecione o arquivo preenchido
                </p>
                <p className="text-sm text-blue-900">
                  <strong>4.</strong> Clique em "Importar" para processar
                </p>
              </div>

              {columns && columns.length > 0 && (
                <>
                  <h3 className="text-lg font-semibold">Colunas do CSV</h3>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-xs text-gray-600 mb-3">
                      Use exatamente estes nomes na primeira linha do arquivo:
                    </p>
                    <ul className="space-y-1.5 text-sm">
                      {columns.map((col) => (
                        <li key={col.name} className="flex gap-2">
                          <code className="font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0">
                            {col.name}
                          </code>
                          <span className="text-gray-700">— {col.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDatabase;
