import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle
} from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Search, Edit, Trash2, Plus, GraduationCap, Eye, MoreVertical, Filter } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/config/firebase";
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, setDoc, query, orderBy, Timestamp } from "firebase/firestore";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { useNavigate } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface Course {
  id: string;
  title: string;
  description: string;
  duration?: string;
  instructor?: string;
  price?: number;
  status: 'active' | 'inactive' | 'draft';
  // Novos campos
  courseType?: string[]; // ATUALIZAÇÃO, ESPECIALIZAÇÃO, PARCEIRO, OUTRO
  courseTypeOther?: string; // Campo de texto quando OUTRO é selecionado
  institutionName?: string;
  coordinatorName?: string;
  coordinatorContact?: string;
  consultantId?: string;
  consultantName?: string;
  numberOfClasses?: number;
  brandUsage?: '100%' | '50%' | '30%';
  assistantProfessor?: string;
  observation?: string;
  classes?: Class[]; // Array de turmas
  createdAt: Date;
  updatedAt: Date;
}

interface Consultant {
  id: string;
  name: string;
  email?: string;
}

interface Class {
  numberOfStudents: number;
  shift: 'matutino' | 'vespertino' | 'noturno' | 'integral';
  startDate: Date;
  endDate: Date;
  usesTitaniumfix: '100% Titaniumfix' | '50% Titaniumfix' | '10% Titaniumfix' | 'Não usa Titaniumfix' | 'Outro';
  usesTitaniumfixOther?: string; // Campo de texto quando "Outro" é selecionado
}

const COURSE_TYPES = ['ATUALIZAÇÃO', 'ESPECIALIZAÇÃO', 'PARCEIRO', 'OUTRO'] as const;

export const CourseManagement = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedCourseForDeletion, setSelectedCourseForDeletion] = useState<string | null>(null);
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [classes, setClasses] = useState<Class[]>([]);
  const [currentClassIndex, setCurrentClassIndex] = useState(0);
  
  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const [newCourse, setNewCourse] = useState<Omit<Course, 'id' | 'createdAt' | 'updatedAt'>>({
    title: "",
    description: "",
    duration: "",
    instructor: "",
    price: 0,
    status: 'draft',
    courseType: [],
    courseTypeOther: "",
    institutionName: "",
    coordinatorName: "",
    coordinatorContact: "",
    consultantId: "",
    consultantName: "",
    numberOfClasses: 0,
    brandUsage: undefined,
    assistantProfessor: "",
    observation: ""
  });

  useEffect(() => {
    fetchCourses();
    fetchConsultants();
  }, []);

  const fetchConsultants = async () => {
    try {
      const usersCollection = collection(db, "users");
      const usersSnapshot = await getDocs(usersCollection);
      
      const consultantsList: Consultant[] = usersSnapshot.docs.map(doc => {
        const data = doc.data();
        const fullName = data.fullName || data.displayName || `${data.firstName || ""} ${data.lastName || ""}`.trim();
        return {
          id: doc.id,
          name: fullName || "Sem nome",
          email: data.email || ""
        };
      });
      
      setConsultants(consultantsList.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error("Erro ao buscar consultores:", error);
      toast.error("Não foi possível carregar os consultores");
    }
  };

  const fetchCourses = async () => {
    setIsLoading(true);
    try {
      const coursesCollection = collection(db, "courses");
      const coursesQuery = query(coursesCollection, orderBy("createdAt", "desc"));
      const coursesSnapshot = await getDocs(coursesQuery);
      
      const coursesList = coursesSnapshot.docs
        .filter(d => !d.data().deletedAt)
        .map(d => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title,
          description: data.description || "",
          duration: data.duration || "",
          instructor: data.instructor || "",
          price: data.price || 0,
          status: data.status || 'draft',
          courseType: data.courseType || [],
          courseTypeOther: data.courseTypeOther || "",
          institutionName: data.institutionName || "",
          coordinatorName: data.coordinatorName || "",
          coordinatorContact: data.coordinatorContact || "",
          consultantId: data.consultantId || "",
          consultantName: data.consultantName || "",
          numberOfClasses: data.numberOfClasses || 0,
          brandUsage: data.brandUsage,
          assistantProfessor: data.assistantProfessor || "",
          observation: data.observation || "",
          classes: data.classes?.map((c: any) => ({
            ...c,
            startDate: c.startDate?.toDate ? c.startDate.toDate() : (c.startDate ? new Date(c.startDate) : new Date()),
            endDate: c.endDate?.toDate ? c.endDate.toDate() : (c.endDate ? new Date(c.endDate) : new Date())
          })) || [],
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date()
        };
      });
      
      setCourses(coursesList);
    } catch (error) {
      console.error("Erro ao buscar cursos:", error);
      toast.error("Não foi possível carregar os cursos");
      setCourses([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCourses = courses.filter(course => 
    course.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    course.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Cálculos de paginação
  const totalPages = Math.ceil(filteredCourses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCourses = filteredCourses.slice(startIndex, endIndex);

  // Resetar página quando o termo de busca mudar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const formatCurrency = (value: string): string => {
    // Remove tudo que não é dígito
    const numbers = value.replace(/\D/g, '');
    if (!numbers) return '';
    
    // Converte para número e formata
    const numberValue = parseFloat(numbers) / 100;
    
    return numberValue.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const parseCurrency = (value: string): number => {
    // Remove tudo que não é dígito
    const numbers = value.replace(/\D/g, '');
    if (!numbers) return 0;
    
    // Divide por 100 para converter centavos em reais
    return parseFloat(numbers) / 100;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewCourse(prev => ({ 
      ...prev, 
      [name]: name === 'numberOfClasses' ? parseFloat(value) || 0 : value 
    }));
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const numericValue = parseCurrency(inputValue);
    
    // Atualiza o valor numérico
    setNewCourse(prev => ({ 
      ...prev, 
      price: numericValue
    }));
  };

  const getPriceDisplayValue = (price: number): string => {
    if (!price || price === 0) return '';
    // Converte o valor em reais para centavos para formatação
    const cents = Math.round(price * 100).toString();
    return formatCurrency(cents);
  };

  const handleCourseTypeChange = (type: string, checked: boolean) => {
    setNewCourse(prev => {
      const currentTypes = prev.courseType || [];
      if (checked) {
        return {
          ...prev,
          courseType: [...currentTypes, type]
        };
      } else {
        return {
          ...prev,
          courseType: currentTypes.filter(t => t !== type),
          courseTypeOther: type === 'OUTRO' ? "" : prev.courseTypeOther
        };
      }
    });
  };

  const handleConsultantChange = (consultantId: string) => {
    const consultant = consultants.find(c => c.id === consultantId);
    setNewCourse(prev => ({
      ...prev,
      consultantId: consultantId,
      consultantName: consultant?.name || ""
    }));
  };

  const handleStatusChange = (status: 'active' | 'inactive' | 'draft') => {
    setNewCourse(prev => ({ ...prev, status }));
  };

  const resetForm = () => {
    setCurrentStep(1);
    setClasses([]);
    setCurrentClassIndex(0);
    setNewCourse({
      title: "",
      description: "",
      duration: "",
      instructor: "",
      price: 0,
      status: 'draft',
      courseType: [],
      courseTypeOther: "",
      institutionName: "",
      coordinatorName: "",
      coordinatorContact: "",
      consultantId: "",
      consultantName: "",
      numberOfClasses: 0,
      brandUsage: undefined,
      assistantProfessor: "",
      observation: ""
    });
  };

  const handleNextStep = () => {
    if (!newCourse.title.trim()) {
      toast.error("O título do curso é obrigatório");
      return;
    }

    if (!newCourse.numberOfClasses || newCourse.numberOfClasses < 1) {
      toast.error("A quantidade de turmas deve ser pelo menos 1");
      return;
    }

    // Inicializar array de turmas
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    const initialClasses: Class[] = Array.from({ length: newCourse.numberOfClasses }, () => ({
      numberOfStudents: 0,
      shift: 'matutino',
      startDate: new Date(today),
      endDate: new Date(nextMonth),
      usesTitaniumfix: 'Não usa Titaniumfix',
      usesTitaniumfixOther: ""
    }));

    setClasses(initialClasses);
    setCurrentClassIndex(0);
    setCurrentStep(2);
  };

  const handlePreviousStep = () => {
    setCurrentStep(1);
  };

  const handleClassChange = (index: number, field: keyof Class, value: any) => {
    const updatedClasses = [...classes];
    updatedClasses[index] = {
      ...updatedClasses[index],
      [field]: value
    };
    setClasses(updatedClasses);
  };

  const handleNextClass = () => {
    if (currentClassIndex < classes.length - 1) {
      setCurrentClassIndex(currentClassIndex + 1);
    }
  };

  const handlePreviousClass = () => {
    if (currentClassIndex > 0) {
      setCurrentClassIndex(currentClassIndex - 1);
    }
  };

  const handleCreateCourse = async () => {
    if (!newCourse.title.trim()) {
      toast.error("O título do curso é obrigatório");
      return;
    }

    // Validar todas as turmas
    const invalidClass = classes.find((c, index) => {
      if (!c.numberOfStudents || c.numberOfStudents < 1) {
        toast.error(`A turma ${index + 1} deve ter pelo menos 1 aluno`);
        return true;
      }
      if (!c.startDate || !c.endDate) {
        toast.error(`A turma ${index + 1} deve ter data de início e término`);
        return true;
      }
      if (c.endDate < c.startDate) {
        toast.error(`A turma ${index + 1} deve ter data de término posterior à data de início`);
        return true;
      }
      if (c.usesTitaniumfix === 'Outro' && !c.usesTitaniumfixOther?.trim()) {
        toast.error(`A turma ${index + 1} deve especificar o uso da marca quando "Outro" é selecionado`);
        return true;
      }
      return false;
    });

    if (invalidClass) {
      return;
    }

    try {
      const courseData = {
        ...newCourse,
        classes: classes.map(c => ({
          numberOfStudents: c.numberOfStudents,
          shift: c.shift,
          startDate: Timestamp.fromDate(c.startDate),
          endDate: Timestamp.fromDate(c.endDate),
          usesTitaniumfix: c.usesTitaniumfix,
          usesTitaniumfixOther: c.usesTitaniumfixOther || ""
        })),
        deletedAt: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, "courses"), courseData);
      toast.success("Curso criado com sucesso!");
      setIsAddDialogOpen(false);
      resetForm();
      fetchCourses();
    } catch (error) {
      console.error("Erro ao criar curso:", error);
      toast.error("Não foi possível criar o curso");
    }
  };

  const handleEditCourse = async () => {
    if (!selectedCourse || !newCourse.title.trim()) {
      toast.error("O título do curso é obrigatório");
      return;
    }

    try {
      const courseRef = doc(db, "courses", selectedCourse.id);
      await setDoc(courseRef, {
        ...newCourse,
        deletedAt: null,
        updatedAt: serverTimestamp()
      }, { merge: true });

      toast.success("Curso atualizado com sucesso!");
      setIsEditDialogOpen(false);
      setSelectedCourse(null);
      setNewCourse({
        title: "",
        description: "",
        duration: "",
        instructor: "",
        price: 0,
        status: 'draft',
        courseType: [],
        courseTypeOther: "",
        institutionName: "",
        coordinatorName: "",
        coordinatorContact: "",
        consultantId: "",
        consultantName: "",
        numberOfClasses: 0,
        brandUsage: undefined,
        assistantProfessor: "",
        observation: ""
      });
      fetchCourses();
    } catch (error) {
      console.error("Erro ao atualizar curso:", error);
      toast.error("Não foi possível atualizar o curso");
    }
  };

  const handleDeleteCourse = async () => {
    if (!selectedCourseForDeletion) return;

    try {
      await updateDoc(doc(db, "courses", selectedCourseForDeletion), {
        deletedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      toast.success("Curso excluído com sucesso!");
      setIsDeleteConfirmOpen(false);
      setSelectedCourseForDeletion(null);
      fetchCourses();
    } catch (error) {
      console.error("Erro ao excluir curso:", error);
      toast.error("Não foi possível excluir o curso");
    }
  };

  const openEditDialog = (course: Course) => {
    setSelectedCourse(course);
    setNewCourse({
      title: course.title,
      description: course.description,
      duration: course.duration || "",
      instructor: course.instructor || "",
      price: course.price || 0,
      status: course.status,
      courseType: course.courseType || [],
      courseTypeOther: course.courseTypeOther || "",
      institutionName: course.institutionName || "",
      coordinatorName: course.coordinatorName || "",
      coordinatorContact: course.coordinatorContact || "",
      consultantId: course.consultantId || "",
      consultantName: course.consultantName || "",
      numberOfClasses: course.numberOfClasses || 0,
      brandUsage: course.brandUsage,
      assistantProfessor: course.assistantProfessor || "",
      observation: course.observation || ""
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (courseId: string) => {
    setSelectedCourseForDeletion(courseId);
    setIsDeleteConfirmOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: "Ativo", className: "bg-green-100 text-green-800" },
      inactive: { label: "Inativo", className: "bg-gray-100 text-gray-800" },
      draft: { label: "Rascunho", className: "bg-yellow-100 text-yellow-800" }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Gerenciamento de Cursos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Crie e gerencie os cursos disponíveis no sistema
          </p>
        </div>
        <Button 
          onClick={() => setIsAddDialogOpen(true)}
          className="bg-red-500 hover:bg-red-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Curso
        </Button>
      </div>

      {/* Filtros e busca */}
      <div className="mb-4 flex-shrink-0">
        <div className="flex flex-col lg:flex-row gap-3 lg:justify-between lg:items-center">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            {/* Campo de busca */}
            <div className="relative flex-1 max-w-md">
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                <Search className="text-muted-foreground/70 w-3.5 h-3.5" />
              </div>
              <Input
                placeholder="Buscar cursos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            
            {/* Botão de filtro */}
            <Button variant="outline" size="icon" className="h-9 w-9">
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {/* Seleção de limite de registros */}
          <div className="flex items-center gap-2">
            <Label htmlFor="items-per-page" className="text-sm whitespace-nowrap">
              Registros por página:
            </Label>
            <Select value={itemsPerPage.toString()} onValueChange={(value) => {
              setItemsPerPage(Number(value));
              setCurrentPage(1);
            }}>
              <SelectTrigger id="items-per-page" className="w-20 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Tabela com scroll */}
      <div className="flex-1 overflow-hidden flex flex-col border rounded-lg min-h-0">
        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Carregando cursos...</p>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="text-center py-8">
              <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm ? "Nenhum curso encontrado" : "Nenhum curso cadastrado"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80">
                <TableRow>
                  <TableHead className="text-center">Título</TableHead>
                  <TableHead className="text-center">Descrição</TableHead>
                  <TableHead className="text-center">Duração</TableHead>
                  <TableHead className="text-center">Preço</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCourses.map((course) => (
                  <TableRow
                    key={course.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/courses/${course.id}`)}
                  >
                    <TableCell className="text-center font-medium">
                      <div 
                        className="truncate max-w-[15ch] mx-auto" 
                        title={course.title}
                      >
                        {course.title && course.title.length > 15 
                          ? `${course.title.substring(0, 15)}...` 
                          : course.title}
                      </div>
                    </TableCell>
                    <TableCell className="text-center max-w-xs truncate">{course.description}</TableCell>
                    <TableCell className="text-center">{course.duration || "-"}</TableCell>
                    <TableCell className="text-center">
                      {course.price ? `R$ ${course.price.toFixed(2)}` : "Gratuito"}
                    </TableCell>
                    <TableCell className="text-center">{getStatusBadge(course.status)}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/courses/${course.id}`); }}>
                            <Eye className="mr-2 h-4 w-4" />
                            Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditDialog(course); }}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); openDeleteDialog(course.id); }}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Paginação */}
        {!isLoading && filteredCourses.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/50 flex-shrink-0">
            <div className="text-sm text-muted-foreground">
              Mostrando {startIndex + 1} a {Math.min(endIndex, filteredCourses.length)} de {filteredCourses.length} cursos
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Dialog de Criar Curso */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open);
        if (!open) {
          resetForm();
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Criar Novo Curso - Passo {currentStep} de 2
            </DialogTitle>
            <DialogDescription>
              {currentStep === 1 
                ? "Preencha as informações do curso"
                : `Preencha os detalhes da Turma ${currentClassIndex + 1} de ${classes.length}`}
            </DialogDescription>
          </DialogHeader>
          
          {currentStep === 1 ? (
          <div className="space-y-4">
            {/* Título do Curso */}
            <div className="space-y-2">
              <Label htmlFor="title">Título do Curso *</Label>
              <Input
                id="title"
                name="title"
                value={newCourse.title}
                onChange={handleInputChange}
                placeholder="Ex: Introdução à Gestão de Projetos"
                required
              />
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                name="description"
                value={newCourse.description}
                onChange={handleInputChange}
                placeholder="Descreva o conteúdo do curso..."
                rows={4}
              />
            </div>

            {/* CURSO: Múltipla escolha */}
            <div className="space-y-2">
              <Label>CURSO *</Label>
              <div className="space-y-2">
                {COURSE_TYPES.map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={`course-type-${type}`}
                      checked={newCourse.courseType?.includes(type) || false}
                      onCheckedChange={(checked) => handleCourseTypeChange(type, checked as boolean)}
                    />
                    <Label
                      htmlFor={`course-type-${type}`}
                      className="font-normal cursor-pointer"
                    >
                      {type}
                    </Label>
                  </div>
                ))}
                {newCourse.courseType?.includes('OUTRO') && (
                  <div className="ml-6 mt-2">
                    <Input
                      placeholder="Especifique o tipo de curso"
                      value={newCourse.courseTypeOther || ""}
                      onChange={(e) => setNewCourse(prev => ({ ...prev, courseTypeOther: e.target.value }))}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* NOME DA INSTITUIÇÃO */}
            <div className="space-y-2">
              <Label htmlFor="institutionName">NOME DA INSTITUIÇÃO</Label>
              <Input
                id="institutionName"
                name="institutionName"
                value={newCourse.institutionName || ""}
                onChange={handleInputChange}
                placeholder="Nome da instituição"
              />
            </div>

            {/* NOME DO COORDENADOR */}
            <div className="space-y-2">
              <Label htmlFor="coordinatorName">NOME DO COORDENADOR</Label>
              <Input
                id="coordinatorName"
                name="coordinatorName"
                value={newCourse.coordinatorName || ""}
                onChange={handleInputChange}
                placeholder="Nome do coordenador"
              />
            </div>

            {/* CONTATO DO COORDENADOR */}
            <div className="space-y-2">
              <Label htmlFor="coordinatorContact">CONTATO DO COORDENADOR</Label>
              <Input
                id="coordinatorContact"
                name="coordinatorContact"
                value={newCourse.coordinatorContact || ""}
                onChange={handleInputChange}
                placeholder="Telefone ou e-mail do coordenador"
              />
            </div>

            {/* CONSULTOR RESPONSÁVEL */}
            <div className="space-y-2">
              <Label htmlFor="consultantId">CONSULTOR RESPONSÁVEL</Label>
              <Select value={newCourse.consultantId || ""} onValueChange={handleConsultantChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um consultor" />
                </SelectTrigger>
                <SelectContent>
                  {consultants.map((consultant) => (
                    <SelectItem key={consultant.id} value={consultant.id}>
                      {consultant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quantidade de TURMAS */}
            <div className="space-y-2">
              <Label htmlFor="numberOfClasses">Quantidade de TURMAS</Label>
              <Input
                id="numberOfClasses"
                name="numberOfClasses"
                type="number"
                min="0"
                value={newCourse.numberOfClasses || 0}
                onChange={handleInputChange}
                placeholder="0"
              />
            </div>

            {/* Professor Assistente */}
            <div className="space-y-2">
              <Label htmlFor="assistantProfessor">Professor Assistente</Label>
              <Input
                id="assistantProfessor"
                name="assistantProfessor"
                value={newCourse.assistantProfessor || ""}
                onChange={handleInputChange}
                placeholder="Nome do professor assistente"
              />
            </div>

            {/* OBSERVAÇÃO */}
            <div className="space-y-2">
              <Label htmlFor="observation">OBSERVAÇÃO</Label>
              <Textarea
                id="observation"
                name="observation"
                value={newCourse.observation || ""}
                onChange={handleInputChange}
                placeholder="Observações adicionais..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duração</Label>
              <Input
                id="duration"
                name="duration"
                value={newCourse.duration}
                onChange={handleInputChange}
                placeholder="Ex: 40 horas"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Preço</Label>
              <div className="relative">
                <Input
                  id="price"
                  name="price"
                  type="text"
                  value={getPriceDisplayValue(newCourse.price || 0)}
                  onChange={handlePriceChange}
                  placeholder="R$ 0,00"
                  className="pl-8"
                  onBlur={(e) => {
                    const value = parseCurrency(e.target.value);
                    if (value === 0) {
                      setNewCourse(prev => ({ ...prev, price: 0 }));
                    }
                  }}
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none text-sm">
                  R$
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={newCourse.status === 'draft' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleStatusChange('draft')}
                  className={newCourse.status === 'draft' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
                >
                  Rascunho
                </Button>
                <Button
                  type="button"
                  variant={newCourse.status === 'active' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleStatusChange('active')}
                  className={newCourse.status === 'active' ? 'bg-green-500 hover:bg-green-600' : ''}
                >
                  Ativo
                </Button>
                <Button
                  type="button"
                  variant={newCourse.status === 'inactive' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleStatusChange('inactive')}
                  className={newCourse.status === 'inactive' ? 'bg-gray-500 hover:bg-gray-600' : ''}
                >
                  Inativo
                </Button>
              </div>
            </div>
          </div>
          ) : (
          <div className="space-y-4">
            {classes.length > 0 && (
              <>
                {/* Indicador de progresso das turmas */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-2">
                    {classes.map((_, index) => (
                      <div
                        key={index}
                        className={`h-2 flex-1 rounded ${
                          index === currentClassIndex
                            ? 'bg-red-500'
                            : index < currentClassIndex
                            ? 'bg-green-500'
                            : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Formulário da turma atual */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-lg font-semibold">Turma {currentClassIndex + 1}</h3>

                  {/* Quantidade de alunos */}
                  <div className="space-y-2">
                    <Label htmlFor={`class-students-${currentClassIndex}`}>Quantidade de alunos *</Label>
                    <Input
                      id={`class-students-${currentClassIndex}`}
                      type="number"
                      min="1"
                      value={classes[currentClassIndex]?.numberOfStudents || 0}
                      onChange={(e) => handleClassChange(currentClassIndex, 'numberOfStudents', parseInt(e.target.value) || 0)}
                      placeholder="Número de alunos"
                    />
                  </div>

                  {/* Turno */}
                  <div className="space-y-2">
                    <Label>Turno *</Label>
                    <RadioGroup
                      value={classes[currentClassIndex]?.shift || 'matutino'}
                      onValueChange={(value) => handleClassChange(currentClassIndex, 'shift', value)}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="matutino" id={`shift-matutino-${currentClassIndex}`} />
                        <Label htmlFor={`shift-matutino-${currentClassIndex}`} className="font-normal cursor-pointer">Matutino</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="vespertino" id={`shift-vespertino-${currentClassIndex}`} />
                        <Label htmlFor={`shift-vespertino-${currentClassIndex}`} className="font-normal cursor-pointer">Vespertino</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="noturno" id={`shift-noturno-${currentClassIndex}`} />
                        <Label htmlFor={`shift-noturno-${currentClassIndex}`} className="font-normal cursor-pointer">Noturno</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="integral" id={`shift-integral-${currentClassIndex}`} />
                        <Label htmlFor={`shift-integral-${currentClassIndex}`} className="font-normal cursor-pointer">Integral</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Data de Início e Término */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Data de Início *</Label>
                      <DatePicker
                        date={classes[currentClassIndex]?.startDate}
                        onDateChange={(date) => {
                          if (date) {
                            handleClassChange(currentClassIndex, 'startDate', date);
                          }
                        }}
                        placeholder="Selecione a data de início"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Data de Término *</Label>
                      <DatePicker
                        date={classes[currentClassIndex]?.endDate}
                        onDateChange={(date) => {
                          if (date) {
                            handleClassChange(currentClassIndex, 'endDate', date);
                          }
                        }}
                        placeholder="Selecione a data de término"
                      />
                    </div>
                  </div>

                  {/* Curso usa Titaniumfix? */}
                  <div className="space-y-2">
                    <Label>Curso usa Titaniumfix? *</Label>
                    <RadioGroup
                      value={classes[currentClassIndex]?.usesTitaniumfix || 'Não usa Titaniumfix'}
                      onValueChange={(value) => handleClassChange(currentClassIndex, 'usesTitaniumfix', value)}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="100% Titaniumfix" id={`titanium-100-${currentClassIndex}`} />
                        <Label htmlFor={`titanium-100-${currentClassIndex}`} className="font-normal cursor-pointer">100% Titaniumfix</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="50% Titaniumfix" id={`titanium-50-${currentClassIndex}`} />
                        <Label htmlFor={`titanium-50-${currentClassIndex}`} className="font-normal cursor-pointer">50% Titaniumfix</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="10% Titaniumfix" id={`titanium-10-${currentClassIndex}`} />
                        <Label htmlFor={`titanium-10-${currentClassIndex}`} className="font-normal cursor-pointer">10% Titaniumfix</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Não usa Titaniumfix" id={`titanium-no-${currentClassIndex}`} />
                        <Label htmlFor={`titanium-no-${currentClassIndex}`} className="font-normal cursor-pointer">Não usa Titaniumfix</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Outro" id={`titanium-other-${currentClassIndex}`} />
                        <Label htmlFor={`titanium-other-${currentClassIndex}`} className="font-normal cursor-pointer">Outro</Label>
                      </div>
                    </RadioGroup>
                    {classes[currentClassIndex]?.usesTitaniumfix === 'Outro' && (
                      <div className="ml-6 mt-2">
                        <Input
                          placeholder="Especifique o uso da marca"
                          value={classes[currentClassIndex]?.usesTitaniumfixOther || ""}
                          onChange={(e) => handleClassChange(currentClassIndex, 'usesTitaniumfixOther', e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          )}
          
          <DialogFooter>
            <div className="flex justify-between w-full">
              <div>
                {currentStep === 2 && (
                  <Button variant="outline" onClick={handlePreviousStep}>
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Voltar
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => {
                  setIsAddDialogOpen(false);
                  resetForm();
                }}>
                  Cancelar
                </Button>
                {currentStep === 1 ? (
                  <Button onClick={handleNextStep} className="bg-red-500 hover:bg-red-600">
                    Próximo
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    {currentClassIndex > 0 && (
                      <Button variant="outline" onClick={handlePreviousClass}>
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Turma Anterior
                      </Button>
                    )}
                    {currentClassIndex < classes.length - 1 ? (
                      <Button onClick={handleNextClass} className="bg-red-500 hover:bg-red-600">
                        Próxima Turma
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    ) : (
                      <Button onClick={handleCreateCourse} className="bg-red-500 hover:bg-red-600">
                        Criar Curso
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Editar Curso */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Curso</DialogTitle>
            <DialogDescription>
              Atualize as informações do curso
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Título do Curso */}
            <div className="space-y-2">
              <Label htmlFor="edit-title">Título do Curso *</Label>
              <Input
                id="edit-title"
                name="title"
                value={newCourse.title}
                onChange={handleInputChange}
                placeholder="Ex: Introdução à Gestão de Projetos"
                required
              />
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea
                id="edit-description"
                name="description"
                value={newCourse.description}
                onChange={handleInputChange}
                placeholder="Descreva o conteúdo do curso..."
                rows={4}
              />
            </div>

            {/* CURSO: Múltipla escolha */}
            <div className="space-y-2">
              <Label>CURSO *</Label>
              <div className="space-y-2">
                {COURSE_TYPES.map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-course-type-${type}`}
                      checked={newCourse.courseType?.includes(type) || false}
                      onCheckedChange={(checked) => handleCourseTypeChange(type, checked as boolean)}
                    />
                    <Label
                      htmlFor={`edit-course-type-${type}`}
                      className="font-normal cursor-pointer"
                    >
                      {type}
                    </Label>
                  </div>
                ))}
                {newCourse.courseType?.includes('OUTRO') && (
                  <div className="ml-6 mt-2">
                    <Input
                      placeholder="Especifique o tipo de curso"
                      value={newCourse.courseTypeOther || ""}
                      onChange={(e) => setNewCourse(prev => ({ ...prev, courseTypeOther: e.target.value }))}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* NOME DA INSTITUIÇÃO */}
            <div className="space-y-2">
              <Label htmlFor="edit-institutionName">NOME DA INSTITUIÇÃO</Label>
              <Input
                id="edit-institutionName"
                name="institutionName"
                value={newCourse.institutionName || ""}
                onChange={handleInputChange}
                placeholder="Nome da instituição"
              />
            </div>

            {/* NOME DO COORDENADOR */}
            <div className="space-y-2">
              <Label htmlFor="edit-coordinatorName">NOME DO COORDENADOR</Label>
              <Input
                id="edit-coordinatorName"
                name="coordinatorName"
                value={newCourse.coordinatorName || ""}
                onChange={handleInputChange}
                placeholder="Nome do coordenador"
              />
            </div>

            {/* CONTATO DO COORDENADOR */}
            <div className="space-y-2">
              <Label htmlFor="edit-coordinatorContact">CONTATO DO COORDENADOR</Label>
              <Input
                id="edit-coordinatorContact"
                name="coordinatorContact"
                value={newCourse.coordinatorContact || ""}
                onChange={handleInputChange}
                placeholder="Telefone ou e-mail do coordenador"
              />
            </div>

            {/* CONSULTOR RESPONSÁVEL */}
            <div className="space-y-2">
              <Label htmlFor="edit-consultantId">CONSULTOR RESPONSÁVEL</Label>
              <Select value={newCourse.consultantId || ""} onValueChange={handleConsultantChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um consultor" />
                </SelectTrigger>
                <SelectContent>
                  {consultants.map((consultant) => (
                    <SelectItem key={consultant.id} value={consultant.id}>
                      {consultant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quantidade de TURMAS */}
            <div className="space-y-2">
              <Label htmlFor="edit-numberOfClasses">Quantidade de TURMAS</Label>
              <Input
                id="edit-numberOfClasses"
                name="numberOfClasses"
                type="number"
                min="0"
                value={newCourse.numberOfClasses || 0}
                onChange={handleInputChange}
                placeholder="0"
              />
            </div>

            {/* Professor Assistente */}
            <div className="space-y-2">
              <Label htmlFor="edit-assistantProfessor">Professor Assistente</Label>
              <Input
                id="edit-assistantProfessor"
                name="assistantProfessor"
                value={newCourse.assistantProfessor || ""}
                onChange={handleInputChange}
                placeholder="Nome do professor assistente"
              />
            </div>

            {/* OBSERVAÇÃO */}
            <div className="space-y-2">
              <Label htmlFor="edit-observation">OBSERVAÇÃO</Label>
              <Textarea
                id="edit-observation"
                name="observation"
                value={newCourse.observation || ""}
                onChange={handleInputChange}
                placeholder="Observações adicionais..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-duration">Duração</Label>
              <Input
                id="edit-duration"
                name="duration"
                value={newCourse.duration}
                onChange={handleInputChange}
                placeholder="Ex: 40 horas"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-price">Preço</Label>
              <div className="relative">
                <Input
                  id="edit-price"
                  name="price"
                  type="text"
                  value={getPriceDisplayValue(newCourse.price || 0)}
                  onChange={handlePriceChange}
                  placeholder="R$ 0,00"
                  className="pl-8"
                  onBlur={(e) => {
                    const value = parseCurrency(e.target.value);
                    if (value === 0) {
                      setNewCourse(prev => ({ ...prev, price: 0 }));
                    }
                  }}
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none text-sm">
                  R$
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={newCourse.status === 'draft' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleStatusChange('draft')}
                  className={newCourse.status === 'draft' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
                >
                  Rascunho
                </Button>
                <Button
                  type="button"
                  variant={newCourse.status === 'active' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleStatusChange('active')}
                  className={newCourse.status === 'active' ? 'bg-green-500 hover:bg-green-600' : ''}
                >
                  Ativo
                </Button>
                <Button
                  type="button"
                  variant={newCourse.status === 'inactive' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleStatusChange('inactive')}
                  className={newCourse.status === 'inactive' ? 'bg-gray-500 hover:bg-gray-600' : ''}
                >
                  Inativo
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditCourse} className="bg-red-500 hover:bg-red-600">
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <ConfirmationDialog
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        onConfirm={handleDeleteCourse}
        title="Excluir Curso"
        description="Tem certeza que deseja excluir este curso? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
      />
    </div>
  );
};
