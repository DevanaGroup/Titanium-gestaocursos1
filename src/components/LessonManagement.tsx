import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Search, Edit, Trash2, Plus, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/config/firebase";
import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, setDoc, query, orderBy, getDoc } from "firebase/firestore";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Phone } from "lucide-react";

interface Lesson {
  id: string;
  // Campos do formulário
  email: string;
  requesterName: string;
  consultantName: string;
  courseResponsibleName: string;
  courseResponsiblePhone: string; // Telefone com código do país
  courseResponsiblePhoneCountryCode: string; // Código do país (ex: "BR", "US")
  courseResponsibleEmail: string; // E-mail do responsável
  lessonDate: string;
  lessonStartTime: string; // formato HH:mm
  locationName: string;
  locationAddress: string;
  needsProfessor: string; // "Sim" | "Não" | "Outro"
  professorName?: string; // se needsProfessor for "Não" ou "Outro"
  numberOfStudents: string;
  lessonDuration: string; // "4 horas" | "8 horas" | "Outro"
  customDuration?: string; // se lessonDuration for "Outro"
  needsFolder: string; // "Sim" | "Não"
  hasHandsOn: string; // "Sim" | "Não"
  // Campos condicionais para hands-on
  lessonTheme?: string; // "Fase Cirúrgica" | "Fluxo Protético" | "Cirurgia Guiada" | "Digital-Fix: Solução Protética do Analógico ao Digital" | "Zigomático"
  implantModels?: string[]; // ["e-fix (Groove e Silver)", "e-fix (Profile)", "i-fix", "b-fix (cilindrico)", "b-fix (Profile)"]
  calculatedMaterials?: {
    maxillasPerStudent: number;
    implantsPerStudent: number;
    implantTypes: string[];
    surgicalKitsPerMotor: number;
    motorsNeeded?: number;
    totalMaxillas?: number;
    totalImplants?: number;
    totalSurgicalKits?: number;
  };
  // Campos originais (mantidos para compatibilidade)
  title?: string;
  description?: string;
  courseId: string;
  courseTitle?: string;
  duration?: string;
  order?: number;
  videoUrl?: string;
  materials?: string[];
  status: 'active' | 'inactive' | 'draft';
  createdAt: Date;
  updatedAt: Date;
}

interface Course {
  id: string;
  title: string;
}

export const LessonManagement = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedLessonForDeletion, setSelectedLessonForDeletion] = useState<string | null>(null);
  
  const [newLesson, setNewLesson] = useState<Omit<Lesson, 'id' | 'createdAt' | 'updatedAt'>>({
    email: "",
    requesterName: "",
    consultantName: "",
    courseResponsibleName: "",
    courseResponsiblePhone: "",
    courseResponsiblePhoneCountryCode: "BR",
    courseResponsibleEmail: "",
    lessonDate: "",
    lessonStartTime: "",
    locationName: "",
    locationAddress: "",
    needsProfessor: "",
    professorName: "",
    numberOfStudents: "",
    lessonDuration: "",
    customDuration: "",
    needsFolder: "",
    hasHandsOn: "",
    lessonTheme: "",
    implantModels: [],
    calculatedMaterials: undefined,
    courseId: "",
    status: 'draft'
  });

  // Opções de temas para hands-on
  const lessonThemes = [
    "Fase Cirúrgica",
    "Fluxo Protético",
    "Cirurgia Guiada",
    "Digital-Fix: Solução Protética do Analógico ao Digital",
    "Zigomático"
  ];

  // Opções de modelos de implante
  const implantModelOptions = [
    "e-fix (Groove e Silver)",
    "e-fix (Profile)",
    "i-fix",
    "b-fix (cilindrico)",
    "b-fix (Profile)"
  ];

  // Opções de países com código
  const countryOptions = [
    { code: "BR", name: "Brasil", dialCode: "+55", flag: "🇧🇷" },
    { code: "US", name: "Estados Unidos", dialCode: "+1", flag: "🇺🇸" },
    { code: "AR", name: "Argentina", dialCode: "+54", flag: "🇦🇷" },
    { code: "CL", name: "Chile", dialCode: "+56", flag: "🇨🇱" },
    { code: "CO", name: "Colômbia", dialCode: "+57", flag: "🇨🇴" },
    { code: "MX", name: "México", dialCode: "+52", flag: "🇲🇽" },
    { code: "PT", name: "Portugal", dialCode: "+351", flag: "🇵🇹" },
    { code: "ES", name: "Espanha", dialCode: "+34", flag: "🇪🇸" },
    { code: "FR", name: "França", dialCode: "+33", flag: "🇫🇷" },
    { code: "DE", name: "Alemanha", dialCode: "+49", flag: "🇩🇪" },
    { code: "GB", name: "Reino Unido", dialCode: "+44", flag: "🇬🇧" },
  ];

  // Função para formatar telefone brasileiro
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setNewLesson(prev => ({ ...prev, courseResponsiblePhone: formatted }));
  };

  // Função para calcular materiais automaticamente
  const calculateMaterials = useCallback(() => {
    if (newLesson.hasHandsOn !== "Sim" || !newLesson.lessonTheme || !newLesson.implantModels || newLesson.implantModels.length === 0) {
      return undefined;
    }

    const numberOfStudents = parseInt(newLesson.numberOfStudents) || 0;
    const implantModels = newLesson.implantModels;
    
    // Regra: 1 maxila por aluno
    const maxillasPerStudent = 1;
    
    // Regra: 2 a 4 implantes por aluno (dependendo dos modelos selecionados)
    // Se o curso utilizar apenas Profile, serão enviados 2 implantes por aluno
    // Caso contrário, 1 implante de cada modelo selecionado (mínimo 2, máximo 4)
    const hasOnlyProfile = implantModels.length === 1 && 
      (implantModels[0] === "e-fix (Profile)" || implantModels[0] === "b-fix (Profile)");
    
    // Se apenas Profile: 2 implantes por aluno
    // Caso contrário: quantidade de modelos selecionados (limitado entre 2 e 4)
    let implantsPerStudent;
    if (hasOnlyProfile) {
      implantsPerStudent = 2;
    } else {
      // Se selecionou 1 modelo (não Profile): mínimo 2 implantes
      // Se selecionou 2-4 modelos: 1 implante de cada (2 a 4 implantes)
      // Se selecionou mais de 4 modelos: limitar a 4 implantes
      implantsPerStudent = Math.min(Math.max(implantModels.length, 2), 4);
    }
    
    // Regra: 1 motor por dupla (1 motor para cada 2 alunos)
    const motorsNeeded = Math.ceil(numberOfStudents / 2);
    const surgicalKitsPerMotor = 1;

    return {
      maxillasPerStudent,
      implantsPerStudent,
      implantTypes: implantModels,
      surgicalKitsPerMotor,
      motorsNeeded,
      totalMaxillas: maxillasPerStudent * numberOfStudents,
      totalImplants: implantsPerStudent * numberOfStudents,
      totalSurgicalKits: surgicalKitsPerMotor * motorsNeeded
    };
  }, [newLesson.hasHandsOn, newLesson.lessonTheme, newLesson.implantModels, newLesson.numberOfStudents]);

  // Atualizar materiais calculados quando campos relevantes mudarem
  useEffect(() => {
    const materials = calculateMaterials();
    if (materials) {
      setNewLesson(prev => ({ ...prev, calculatedMaterials: materials }));
    } else {
      setNewLesson(prev => ({ ...prev, calculatedMaterials: undefined }));
    }
  }, [calculateMaterials]);

  useEffect(() => {
    fetchCourses();
    fetchLessons();
  }, []);

  const fetchCourses = async () => {
    try {
      const coursesCollection = collection(db, "courses");
      const coursesQuery = query(coursesCollection, orderBy("createdAt", "desc"));
      const coursesSnapshot = await getDocs(coursesQuery);
      
      const coursesList = coursesSnapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title || ""
      }));
      
      setCourses(coursesList);
    } catch (error) {
      console.error("Erro ao buscar cursos:", error);
      toast.error("Não foi possível carregar os cursos");
    }
  };

  const fetchLessons = async () => {
    setIsLoading(true);
    try {
      const lessonsCollection = collection(db, "lessons");
      const lessonsQuery = query(lessonsCollection, orderBy("createdAt", "desc"));
      const lessonsSnapshot = await getDocs(lessonsQuery);
      
      const lessonsList = await Promise.all(lessonsSnapshot.docs.map(async (doc) => {
        const data = doc.data();
        let courseTitle = "";
        
        if (data.courseId) {
          try {
            const courseDoc = await getDoc(doc(db, "courses", data.courseId));
            if (courseDoc.exists()) {
              courseTitle = courseDoc.data().title || "";
            }
          } catch (error) {
            console.error("Erro ao buscar curso:", error);
          }
        }
        
        return {
          id: doc.id,
          email: data.email || "",
          requesterName: data.requesterName || "",
          consultantName: data.consultantName || "",
          courseResponsibleName: data.courseResponsibleName || "",
          courseResponsiblePhone: data.courseResponsiblePhone || "",
          courseResponsiblePhoneCountryCode: data.courseResponsiblePhoneCountryCode || "BR",
          courseResponsibleEmail: data.courseResponsibleEmail || "",
          lessonDate: data.lessonDate || "",
          lessonStartTime: data.lessonStartTime || "",
          locationName: data.locationName || "",
          locationAddress: data.locationAddress || "",
          needsProfessor: data.needsProfessor || "",
          professorName: data.professorName || "",
          numberOfStudents: data.numberOfStudents || "",
          lessonDuration: data.lessonDuration || "",
          customDuration: data.customDuration || "",
          needsFolder: data.needsFolder || "",
          hasHandsOn: data.hasHandsOn || "",
          lessonTheme: data.lessonTheme || "",
          implantModels: data.implantModels || [],
          calculatedMaterials: data.calculatedMaterials,
          courseId: data.courseId || "",
          courseTitle: courseTitle,
          status: data.status || 'draft',
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date()
        };
      }));
      
      setLessons(lessonsList);
    } catch (error) {
      console.error("Erro ao buscar aulas:", error);
      toast.error("Não foi possível carregar as aulas");
      setLessons([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLessons = lessons.filter(lesson => 
    lesson.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    lesson.consultantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lesson.locationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (lesson.courseTitle && lesson.courseTitle.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewLesson(prev => ({ 
      ...prev, 
      [name]: name === 'order' ? parseInt(value) || 0 : value 
    }));
  };

  const handleStatusChange = (status: 'active' | 'inactive' | 'draft') => {
    setNewLesson(prev => ({ ...prev, status }));
  };

  const handleCreateLesson = async () => {
    // Validações obrigatórias
    if (!newLesson.email.trim()) {
      toast.error("O e-mail é obrigatório");
      return;
    }
    if (!newLesson.requesterName.trim()) {
      toast.error("O nome do solicitante é obrigatório");
      return;
    }
    if (!newLesson.consultantName.trim()) {
      toast.error("O nome do consultor é obrigatório");
      return;
    }
    if (!newLesson.courseResponsibleName.trim()) {
      toast.error("O nome do responsável pelo curso é obrigatório");
      return;
    }
    if (!newLesson.courseResponsiblePhone.trim()) {
      toast.error("O telefone do responsável pelo curso é obrigatório");
      return;
    }
    if (!newLesson.courseResponsibleEmail.trim()) {
      toast.error("O e-mail do responsável pelo curso é obrigatório");
      return;
    }
    if (!newLesson.lessonDate) {
      toast.error("A data da aula é obrigatória");
      return;
    }
    if (!newLesson.lessonStartTime) {
      toast.error("O horário de início da aula é obrigatório");
      return;
    }
    if (!newLesson.locationName.trim()) {
      toast.error("O nome do local é obrigatório");
      return;
    }
    if (!newLesson.locationAddress.trim()) {
      toast.error("O endereço do local é obrigatório");
      return;
    }
    if (!newLesson.needsProfessor) {
      toast.error("É necessário informar se será necessário solicitar professor");
      return;
    }
    if (!newLesson.numberOfStudents.trim()) {
      toast.error("O número de alunos é obrigatório");
      return;
    }
    if (!newLesson.lessonDuration) {
      toast.error("O tempo de aula é obrigatório");
      return;
    }
    if (!newLesson.hasHandsOn) {
      toast.error("É necessário informar se a aula contém hands-on");
      return;
    }
    // Validações condicionais para hands-on
    if (newLesson.hasHandsOn === "Sim") {
      if (!newLesson.lessonTheme) {
        toast.error("É necessário selecionar o tema da aula quando hands-on está marcado");
        return;
      }
      if (!newLesson.implantModels || newLesson.implantModels.length === 0) {
        toast.error("É necessário selecionar pelo menos um modelo de implante quando hands-on está marcado");
        return;
      }
    }
    if (!newLesson.courseId) {
      toast.error("Selecione um curso");
      return;
    }

    try {
      const lessonData = {
        ...newLesson,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, "lessons"), lessonData);
      toast.success("Aula criada com sucesso!");
      setIsAddDialogOpen(false);
      setNewLesson({
        email: "",
        requesterName: "",
        consultantName: "",
        courseResponsibleName: "",
        courseResponsibleContact: "",
        lessonDate: "",
        lessonStartTime: "",
        locationName: "",
        locationAddress: "",
        needsProfessor: "",
        professorName: "",
        numberOfStudents: "",
        lessonDuration: "",
        customDuration: "",
        needsFolder: "",
        hasHandsOn: "",
        lessonTheme: "",
        implantModels: [],
        calculatedMaterials: undefined,
        courseId: "",
        status: 'draft'
      });
      fetchLessons();
    } catch (error) {
      console.error("Erro ao criar aula:", error);
      toast.error("Não foi possível criar a aula");
    }
  };

  const handleEditLesson = async () => {
    if (!selectedLesson) {
      toast.error("Nenhuma aula selecionada");
      return;
    }
    
    // Validações obrigatórias (mesmas do create)
    if (!newLesson.email.trim()) {
      toast.error("O e-mail é obrigatório");
      return;
    }
    if (!newLesson.requesterName.trim()) {
      toast.error("O nome do solicitante é obrigatório");
      return;
    }
    if (!newLesson.consultantName.trim()) {
      toast.error("O nome do consultor é obrigatório");
      return;
    }
    if (!newLesson.courseResponsibleName.trim()) {
      toast.error("O nome do responsável pelo curso é obrigatório");
      return;
    }
    if (!newLesson.courseResponsiblePhone.trim()) {
      toast.error("O telefone do responsável pelo curso é obrigatório");
      return;
    }
    if (!newLesson.courseResponsibleEmail.trim()) {
      toast.error("O e-mail do responsável pelo curso é obrigatório");
      return;
    }
    if (!newLesson.lessonDate) {
      toast.error("A data da aula é obrigatória");
      return;
    }
    if (!newLesson.lessonStartTime) {
      toast.error("O horário de início da aula é obrigatório");
      return;
    }
    if (!newLesson.locationName.trim()) {
      toast.error("O nome do local é obrigatório");
      return;
    }
    if (!newLesson.locationAddress.trim()) {
      toast.error("O endereço do local é obrigatório");
      return;
    }
    if (!newLesson.needsProfessor) {
      toast.error("É necessário informar se será necessário solicitar professor");
      return;
    }
    if (!newLesson.numberOfStudents.trim()) {
      toast.error("O número de alunos é obrigatório");
      return;
    }
    if (!newLesson.lessonDuration) {
      toast.error("O tempo de aula é obrigatório");
      return;
    }
    if (!newLesson.hasHandsOn) {
      toast.error("É necessário informar se a aula contém hands-on");
      return;
    }
    // Validações condicionais para hands-on
    if (newLesson.hasHandsOn === "Sim") {
      if (!newLesson.lessonTheme) {
        toast.error("É necessário selecionar o tema da aula quando hands-on está marcado");
        return;
      }
      if (!newLesson.implantModels || newLesson.implantModels.length === 0) {
        toast.error("É necessário selecionar pelo menos um modelo de implante quando hands-on está marcado");
        return;
      }
    }
    if (!newLesson.courseId) {
      toast.error("Selecione um curso");
      return;
    }

    try {
      const lessonRef = doc(db, "lessons", selectedLesson.id);
      await setDoc(lessonRef, {
        ...newLesson,
        updatedAt: serverTimestamp()
      }, { merge: true });

      toast.success("Aula atualizada com sucesso!");
      setIsEditDialogOpen(false);
      setSelectedLesson(null);
      setNewLesson({
        email: "",
        requesterName: "",
        consultantName: "",
        courseResponsibleName: "",
        courseResponsibleContact: "",
        lessonDate: "",
        lessonStartTime: "",
        locationName: "",
        locationAddress: "",
        needsProfessor: "",
        professorName: "",
        numberOfStudents: "",
        lessonDuration: "",
        customDuration: "",
        needsFolder: "",
        hasHandsOn: "",
        lessonTheme: "",
        implantModels: [],
        calculatedMaterials: undefined,
        courseId: "",
        status: 'draft'
      });
      fetchLessons();
    } catch (error) {
      console.error("Erro ao atualizar aula:", error);
      toast.error("Não foi possível atualizar a aula");
    }
  };

  const handleDeleteLesson = async () => {
    if (!selectedLessonForDeletion) return;

    try {
      await deleteDoc(doc(db, "lessons", selectedLessonForDeletion));
      toast.success("Aula excluída com sucesso!");
      setIsDeleteConfirmOpen(false);
      setSelectedLessonForDeletion(null);
      fetchLessons();
    } catch (error) {
      console.error("Erro ao excluir aula:", error);
      toast.error("Não foi possível excluir a aula");
    }
  };

  const openEditDialog = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setNewLesson({
      email: lesson.email || "",
      requesterName: lesson.requesterName || "",
      consultantName: lesson.consultantName || "",
      courseResponsibleName: lesson.courseResponsibleName || "",
      courseResponsiblePhone: lesson.courseResponsiblePhone || "",
      courseResponsiblePhoneCountryCode: lesson.courseResponsiblePhoneCountryCode || "BR",
      courseResponsibleEmail: lesson.courseResponsibleEmail || "",
      lessonDate: lesson.lessonDate || "",
      lessonStartTime: lesson.lessonStartTime || "",
      locationName: lesson.locationName || "",
      locationAddress: lesson.locationAddress || "",
      needsProfessor: lesson.needsProfessor || "",
      professorName: lesson.professorName || "",
      numberOfStudents: lesson.numberOfStudents || "",
      lessonDuration: lesson.lessonDuration || "",
      customDuration: lesson.customDuration || "",
      needsFolder: lesson.needsFolder || "",
      hasHandsOn: lesson.hasHandsOn || "",
      lessonTheme: lesson.lessonTheme || "",
      implantModels: lesson.implantModels || [],
      calculatedMaterials: lesson.calculatedMaterials,
      courseId: lesson.courseId,
      status: lesson.status
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (lessonId: string) => {
    setSelectedLessonForDeletion(lessonId);
    setIsDeleteConfirmOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: "Ativa", className: "bg-green-100 text-green-800" },
      inactive: { label: "Inativa", className: "bg-gray-100 text-gray-800" },
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Gerenciamento de Aulas
              </CardTitle>
              <CardDescription>
                Crie e gerencie as aulas dos cursos disponíveis no sistema
              </CardDescription>
            </div>
            <Button 
              onClick={() => setIsAddDialogOpen(true)}
              className="bg-red-500 hover:bg-red-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Aula
            </Button>
          </div>
        </CardHeader>
        <CardContent className="h-[600px] overflow-y-auto">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por solicitante, consultor, local ou curso..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Carregando aulas...</p>
            </div>
          ) : filteredLessons.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm ? "Nenhuma aula encontrada" : "Nenhuma aula cadastrada"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Consultor</TableHead>
                  <TableHead>Curso</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLessons.map((lesson) => (
                  <TableRow key={lesson.id}>
                    <TableCell className="font-medium">{lesson.requesterName || "-"}</TableCell>
                    <TableCell>{lesson.consultantName || "-"}</TableCell>
                    <TableCell>{lesson.courseTitle || "-"}</TableCell>
                    <TableCell>
                      {lesson.lessonDate ? new Date(lesson.lessonDate).toLocaleDateString('pt-BR') : "-"}
                      {lesson.lessonStartTime && ` ${lesson.lessonStartTime}`}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{lesson.locationName || "-"}</TableCell>
                    <TableCell>{lesson.lessonDuration || lesson.customDuration || "-"}</TableCell>
                    <TableCell>{getStatusBadge(lesson.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(lesson)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog(lesson.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Criar Aula */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Solicitação de Aulas</DialogTitle>
            <DialogDescription>
              Preencha todas as informações obrigatórias para solicitar uma nova aula
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* E-mail */}
            <div className="space-y-2">
              <Label htmlFor="email">E-mail <span className="text-red-500">*</span></Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={newLesson.email}
                onChange={handleInputChange}
                placeholder="Seu e-mail"
                required
              />
            </div>

            {/* Nome do Solicitante */}
            <div className="space-y-2">
              <Label htmlFor="requesterName">Seu nome <span className="text-red-500">*</span></Label>
              <Input
                id="requesterName"
                name="requesterName"
                value={newLesson.requesterName}
                onChange={handleInputChange}
                placeholder="Seu nome"
                required
              />
            </div>

            {/* Consultor */}
            <div className="space-y-2">
              <Label htmlFor="consultantName">Qual seu consultor TitaniumFix? <span className="text-red-500">*</span></Label>
              <Input
                id="consultantName"
                name="consultantName"
                value={newLesson.consultantName}
                onChange={handleInputChange}
                placeholder="Nome do consultor"
                required
              />
            </div>

            {/* Responsável pelo Curso */}
            <div className="space-y-2">
              <Label htmlFor="courseResponsibleName">Nome do responsável pelo curso <span className="text-red-500">*</span></Label>
              <Input
                id="courseResponsibleName"
                name="courseResponsibleName"
                value={newLesson.courseResponsibleName}
                onChange={handleInputChange}
                placeholder="Nome do responsável"
                required
              />
            </div>

            {/* Telefone do Responsável */}
            <div className="space-y-2">
              <Label htmlFor="courseResponsiblePhone">Telefone do responsável pelo curso <span className="text-red-500">*</span></Label>
              <div className="flex gap-2 w-full">
                <Select
                  value={newLesson.courseResponsiblePhoneCountryCode || "BR"}
                  onValueChange={(value) => setNewLesson(prev => ({ ...prev, courseResponsiblePhoneCountryCode: value }))}
                >
                  <SelectTrigger className="w-[110px]">
                    <SelectValue>
                      {countryOptions.find(c => c.code === (newLesson.courseResponsiblePhoneCountryCode || "BR"))?.flag} {countryOptions.find(c => c.code === (newLesson.courseResponsiblePhoneCountryCode || "BR"))?.dialCode}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {countryOptions.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.flag} {country.name} {country.dialCode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="courseResponsiblePhone"
                    name="courseResponsiblePhone"
                    type="tel"
                    value={newLesson.courseResponsiblePhone}
                    onChange={handlePhoneChange}
                    placeholder="(11) 99999-9999"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>

            {/* E-mail do Responsável */}
            <div className="space-y-2">
              <Label htmlFor="courseResponsibleEmail">E-mail do responsável pelo curso <span className="text-red-500">*</span></Label>
              <Input
                id="courseResponsibleEmail"
                name="courseResponsibleEmail"
                type="email"
                value={newLesson.courseResponsibleEmail}
                onChange={handleInputChange}
                placeholder="email@exemplo.com"
                required
              />
            </div>

            {/* Data da Aula */}
            <div className="space-y-2">
              <Label htmlFor="lessonDate">Data da Aula <span className="text-red-500">*</span></Label>
              <Input
                id="lessonDate"
                name="lessonDate"
                type="date"
                value={newLesson.lessonDate}
                onChange={handleInputChange}
                required
              />
            </div>

            {/* Horário de Início */}
            <div className="space-y-2">
              <Label>Horário de início da aula <span className="text-red-500">*</span></Label>
              <Input
                id="lessonStartTime"
                name="lessonStartTime"
                type="time"
                value={newLesson.lessonStartTime}
                onChange={handleInputChange}
                required
              />
            </div>

            {/* Nome do Local */}
            <div className="space-y-2">
              <Label htmlFor="locationName">Nome do local <span className="text-red-500">*</span></Label>
              <Textarea
                id="locationName"
                name="locationName"
                value={newLesson.locationName}
                onChange={handleInputChange}
                placeholder="Nome do local"
                rows={2}
                required
              />
            </div>

            {/* Endereço do Local */}
            <div className="space-y-2">
              <Label htmlFor="locationAddress">Endereço do local (Rua, nº, bairro e cidade) <span className="text-red-500">*</span></Label>
              <Textarea
                id="locationAddress"
                name="locationAddress"
                value={newLesson.locationAddress}
                onChange={handleInputChange}
                placeholder="Rua, número, bairro e cidade"
                rows={3}
                required
              />
            </div>

            {/* Necessita Professor */}
            <div className="space-y-2">
              <Label>Será necessário solicitar professor para essa aula? Responder sim ou não. Se não, indicar o professor que irá ministrar a aula. <span className="text-red-500">*</span></Label>
              <RadioGroup 
                value={newLesson.needsProfessor} 
                onValueChange={(value) => setNewLesson(prev => ({ ...prev, needsProfessor: value }))}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Sim" id="needsProfessor-sim" />
                  <Label htmlFor="needsProfessor-sim" className="cursor-pointer">Sim</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Não" id="needsProfessor-nao" />
                  <Label htmlFor="needsProfessor-nao" className="cursor-pointer">Não</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Outro" id="needsProfessor-outro" />
                  <Label htmlFor="needsProfessor-outro" className="cursor-pointer">Outro</Label>
                </div>
              </RadioGroup>
              {(newLesson.needsProfessor === "Não" || newLesson.needsProfessor === "Outro") && (
                <Input
                  name="professorName"
                  value={newLesson.professorName}
                  onChange={handleInputChange}
                  placeholder="Nome do professor"
                  className="mt-2"
                />
              )}
            </div>

            {/* Quantos Alunos */}
            <div className="space-y-2">
              <Label htmlFor="numberOfStudents">Quantos alunos? <span className="text-red-500">*</span></Label>
              <Input
                id="numberOfStudents"
                name="numberOfStudents"
                value={newLesson.numberOfStudents}
                onChange={handleInputChange}
                placeholder="Número de alunos"
                required
              />
            </div>

            {/* Tempo de Aula */}
            <div className="space-y-2">
              <Label>Qual o tempo de aula? <span className="text-red-500">*</span></Label>
              <RadioGroup 
                value={newLesson.lessonDuration} 
                onValueChange={(value) => setNewLesson(prev => ({ ...prev, lessonDuration: value }))}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="4 horas" id="duration-4h" />
                  <Label htmlFor="duration-4h" className="cursor-pointer">4 horas</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="8 horas" id="duration-8h" />
                  <Label htmlFor="duration-8h" className="cursor-pointer">8 horas</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Outro" id="duration-outro" />
                  <Label htmlFor="duration-outro" className="cursor-pointer">Outro</Label>
                </div>
              </RadioGroup>
              {newLesson.lessonDuration === "Outro" && (
                <Input
                  name="customDuration"
                  value={newLesson.customDuration}
                  onChange={handleInputChange}
                  placeholder="Especifique o tempo"
                  className="mt-2"
                />
              )}
            </div>

            {/* Folder de Divulgação */}
            <div className="space-y-2">
              <Label>Será necessário folder de divulgação do curso?</Label>
              <RadioGroup 
                value={newLesson.needsFolder} 
                onValueChange={(value) => setNewLesson(prev => ({ ...prev, needsFolder: value }))}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Sim" id="folder-sim" />
                  <Label htmlFor="folder-sim" className="cursor-pointer">Sim</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Não" id="folder-nao" />
                  <Label htmlFor="folder-nao" className="cursor-pointer">Não</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Hands-on */}
            <div className="space-y-2">
              <Label>A aula contém hands-on (workshop)? <span className="text-red-500">*</span></Label>
              <RadioGroup 
                value={newLesson.hasHandsOn} 
                onValueChange={(value) => {
                  setNewLesson(prev => ({ 
                    ...prev, 
                    hasHandsOn: value,
                    // Limpar campos condicionais se hands-on for "Não"
                    ...(value === "Não" ? { lessonTheme: "", implantModels: [], calculatedMaterials: undefined } : {})
                  }));
                }}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Sim" id="handson-sim" />
                  <Label htmlFor="handson-sim" className="cursor-pointer">Sim</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Não" id="handson-nao" />
                  <Label htmlFor="handson-nao" className="cursor-pointer">Não</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Seção Condicional: Com hands-on (Workshop) */}
            {newLesson.hasHandsOn === "Sim" && (
              <div className="space-y-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                <div className="font-semibold text-lg mb-4">Com hands-on (Workshop)</div>
                
                {/* Tema da Aula */}
                <div className="space-y-2">
                  <Label>Qual o tema da Aula? <span className="text-red-500">*</span></Label>
                  <RadioGroup 
                    value={newLesson.lessonTheme || ""} 
                    onValueChange={(value) => setNewLesson(prev => ({ ...prev, lessonTheme: value }))}
                  >
                    {lessonThemes.map((theme) => (
                      <div key={theme} className="flex items-center space-x-2">
                        <RadioGroupItem value={theme} id={`theme-${theme.replace(/\s+/g, '-')}`} />
                        <Label htmlFor={`theme-${theme.replace(/\s+/g, '-')}`} className="cursor-pointer">
                          {theme}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {/* Modelos de Implante */}
                {newLesson.lessonTheme && (
                  <div className="space-y-2">
                    <Label>Favor selecionar quais modelos de implante serão utilizados no curso: <span className="text-red-500">*</span></Label>
                    <div className="space-y-2">
                      {implantModelOptions.map((model) => (
                        <div key={model} className="flex items-center space-x-2">
                          <Checkbox
                            id={`implant-${model.replace(/\s+/g, '-')}`}
                            checked={newLesson.implantModels?.includes(model) || false}
                            onCheckedChange={(checked) => {
                              setNewLesson(prev => {
                                const currentModels = prev.implantModels || [];
                                if (checked) {
                                  return { ...prev, implantModels: [...currentModels, model] };
                                } else {
                                  return { ...prev, implantModels: currentModels.filter(m => m !== model) };
                                }
                              });
                            }}
                          />
                          <Label htmlFor={`implant-${model.replace(/\s+/g, '-')}`} className="cursor-pointer">
                            {model}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Materiais Calculados */}
                {newLesson.calculatedMaterials && newLesson.numberOfStudents && parseInt(newLesson.numberOfStudents) > 0 && (
                  <div className="mt-4 p-4 bg-white dark:bg-gray-900 rounded-lg border">
                    <div className="font-semibold mb-3">Materiais Calculados Automaticamente:</div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Maxilas:</span> {newLesson.calculatedMaterials.totalMaxillas} unidades 
                        <span className="text-gray-600 dark:text-gray-400 ml-2">
                          ({newLesson.calculatedMaterials.maxillasPerStudent} por aluno × {newLesson.numberOfStudents} alunos)
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Implantes:</span> {newLesson.calculatedMaterials.totalImplants} unidades 
                        <span className="text-gray-600 dark:text-gray-400 ml-2">
                          ({newLesson.calculatedMaterials.implantsPerStudent} por aluno × {newLesson.numberOfStudents} alunos)
                        </span>
                        <div className="text-xs text-gray-500 dark:text-gray-500 mt-1 ml-4">
                          Tipos: {newLesson.calculatedMaterials.implantTypes.join(", ")}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">Motores:</span> {newLesson.calculatedMaterials.motorsNeeded} unidades 
                        <span className="text-gray-600 dark:text-gray-400 ml-2">
                          (1 motor por dupla)
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Kits cirúrgicos:</span> {newLesson.calculatedMaterials.totalSurgicalKits} unidades 
                        <span className="text-gray-600 dark:text-gray-400 ml-2">
                          (1 kit por motor)
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Curso */}
            <div className="space-y-2">
              <Label htmlFor="courseId">Curso <span className="text-red-500">*</span></Label>
              <Select value={newLesson.courseId} onValueChange={(value) => setNewLesson(prev => ({ ...prev, courseId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um curso" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateLesson} className="bg-red-500 hover:bg-red-600">
              Criar Solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Editar Aula */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Solicitação de Aula</DialogTitle>
            <DialogDescription>
              Atualize as informações da solicitação de aula
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* E-mail */}
            <div className="space-y-2">
              <Label htmlFor="edit-email">E-mail <span className="text-red-500">*</span></Label>
              <Input
                id="edit-email"
                name="email"
                type="email"
                value={newLesson.email}
                onChange={handleInputChange}
                placeholder="Seu e-mail"
                required
              />
            </div>

            {/* Nome do Solicitante */}
            <div className="space-y-2">
              <Label htmlFor="edit-requesterName">Seu nome <span className="text-red-500">*</span></Label>
              <Input
                id="edit-requesterName"
                name="requesterName"
                value={newLesson.requesterName}
                onChange={handleInputChange}
                placeholder="Seu nome"
                required
              />
            </div>

            {/* Consultor */}
            <div className="space-y-2">
              <Label htmlFor="edit-consultantName">Qual seu consultor TitaniumFix? <span className="text-red-500">*</span></Label>
              <Input
                id="edit-consultantName"
                name="consultantName"
                value={newLesson.consultantName}
                onChange={handleInputChange}
                placeholder="Nome do consultor"
                required
              />
            </div>

            {/* Responsável pelo Curso */}
            <div className="space-y-2">
              <Label htmlFor="edit-courseResponsibleName">Nome do responsável pelo curso <span className="text-red-500">*</span></Label>
              <Input
                id="edit-courseResponsibleName"
                name="courseResponsibleName"
                value={newLesson.courseResponsibleName}
                onChange={handleInputChange}
                placeholder="Nome do responsável"
                required
              />
            </div>

            {/* Telefone do Responsável */}
            <div className="space-y-2">
              <Label htmlFor="edit-courseResponsiblePhone">Telefone do responsável pelo curso <span className="text-red-500">*</span></Label>
              <div className="flex gap-2 w-full">
                <Select
                  value={newLesson.courseResponsiblePhoneCountryCode || "BR"}
                  onValueChange={(value) => setNewLesson(prev => ({ ...prev, courseResponsiblePhoneCountryCode: value }))}
                >
                  <SelectTrigger className="w-[110px]">
                    <SelectValue>
                      {countryOptions.find(c => c.code === (newLesson.courseResponsiblePhoneCountryCode || "BR"))?.flag} {countryOptions.find(c => c.code === (newLesson.courseResponsiblePhoneCountryCode || "BR"))?.dialCode}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {countryOptions.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.flag} {country.name} {country.dialCode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="edit-courseResponsiblePhone"
                    name="courseResponsiblePhone"
                    type="tel"
                    value={newLesson.courseResponsiblePhone}
                    onChange={handlePhoneChange}
                    placeholder="(11) 99999-9999"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>

            {/* E-mail do Responsável */}
            <div className="space-y-2">
              <Label htmlFor="edit-courseResponsibleEmail">E-mail do responsável pelo curso <span className="text-red-500">*</span></Label>
              <Input
                id="edit-courseResponsibleEmail"
                name="courseResponsibleEmail"
                type="email"
                value={newLesson.courseResponsibleEmail}
                onChange={handleInputChange}
                placeholder="email@exemplo.com"
                required
              />
            </div>

            {/* Data da Aula */}
            <div className="space-y-2">
              <Label htmlFor="edit-lessonDate">Data da Aula <span className="text-red-500">*</span></Label>
              <Input
                id="edit-lessonDate"
                name="lessonDate"
                type="date"
                value={newLesson.lessonDate}
                onChange={handleInputChange}
                required
              />
            </div>

            {/* Horário de Início */}
            <div className="space-y-2">
              <Label>Horário de início da aula <span className="text-red-500">*</span></Label>
              <Input
                id="edit-lessonStartTime"
                name="lessonStartTime"
                type="time"
                value={newLesson.lessonStartTime}
                onChange={handleInputChange}
                required
              />
            </div>

            {/* Nome do Local */}
            <div className="space-y-2">
              <Label htmlFor="edit-locationName">Nome do local <span className="text-red-500">*</span></Label>
              <Textarea
                id="edit-locationName"
                name="locationName"
                value={newLesson.locationName}
                onChange={handleInputChange}
                placeholder="Nome do local"
                rows={2}
                required
              />
            </div>

            {/* Endereço do Local */}
            <div className="space-y-2">
              <Label htmlFor="edit-locationAddress">Endereço do local (Rua, nº, bairro e cidade) <span className="text-red-500">*</span></Label>
              <Textarea
                id="edit-locationAddress"
                name="locationAddress"
                value={newLesson.locationAddress}
                onChange={handleInputChange}
                placeholder="Rua, número, bairro e cidade"
                rows={3}
                required
              />
            </div>

            {/* Necessita Professor */}
            <div className="space-y-2">
              <Label>Será necessário solicitar professor para essa aula? Responder sim ou não. Se não, indicar o professor que irá ministrar a aula. <span className="text-red-500">*</span></Label>
              <RadioGroup 
                value={newLesson.needsProfessor} 
                onValueChange={(value) => setNewLesson(prev => ({ ...prev, needsProfessor: value }))}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Sim" id="edit-needsProfessor-sim" />
                  <Label htmlFor="edit-needsProfessor-sim" className="cursor-pointer">Sim</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Não" id="edit-needsProfessor-nao" />
                  <Label htmlFor="edit-needsProfessor-nao" className="cursor-pointer">Não</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Outro" id="edit-needsProfessor-outro" />
                  <Label htmlFor="edit-needsProfessor-outro" className="cursor-pointer">Outro</Label>
                </div>
              </RadioGroup>
              {(newLesson.needsProfessor === "Não" || newLesson.needsProfessor === "Outro") && (
                <Input
                  name="professorName"
                  value={newLesson.professorName}
                  onChange={handleInputChange}
                  placeholder="Nome do professor"
                  className="mt-2"
                />
              )}
            </div>

            {/* Quantos Alunos */}
            <div className="space-y-2">
              <Label htmlFor="edit-numberOfStudents">Quantos alunos? <span className="text-red-500">*</span></Label>
              <Input
                id="edit-numberOfStudents"
                name="numberOfStudents"
                value={newLesson.numberOfStudents}
                onChange={handleInputChange}
                placeholder="Número de alunos"
                required
              />
            </div>

            {/* Tempo de Aula */}
            <div className="space-y-2">
              <Label>Qual o tempo de aula? <span className="text-red-500">*</span></Label>
              <RadioGroup 
                value={newLesson.lessonDuration} 
                onValueChange={(value) => setNewLesson(prev => ({ ...prev, lessonDuration: value }))}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="4 horas" id="edit-duration-4h" />
                  <Label htmlFor="edit-duration-4h" className="cursor-pointer">4 horas</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="8 horas" id="edit-duration-8h" />
                  <Label htmlFor="edit-duration-8h" className="cursor-pointer">8 horas</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Outro" id="edit-duration-outro" />
                  <Label htmlFor="edit-duration-outro" className="cursor-pointer">Outro</Label>
                </div>
              </RadioGroup>
              {newLesson.lessonDuration === "Outro" && (
                <Input
                  name="customDuration"
                  value={newLesson.customDuration}
                  onChange={handleInputChange}
                  placeholder="Especifique o tempo"
                  className="mt-2"
                />
              )}
            </div>

            {/* Folder de Divulgação */}
            <div className="space-y-2">
              <Label>Será necessário folder de divulgação do curso?</Label>
              <RadioGroup 
                value={newLesson.needsFolder} 
                onValueChange={(value) => setNewLesson(prev => ({ ...prev, needsFolder: value }))}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Sim" id="edit-folder-sim" />
                  <Label htmlFor="edit-folder-sim" className="cursor-pointer">Sim</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Não" id="edit-folder-nao" />
                  <Label htmlFor="edit-folder-nao" className="cursor-pointer">Não</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Hands-on */}
            <div className="space-y-2">
              <Label>A aula contém hands-on (workshop)? <span className="text-red-500">*</span></Label>
              <RadioGroup 
                value={newLesson.hasHandsOn} 
                onValueChange={(value) => {
                  setNewLesson(prev => ({ 
                    ...prev, 
                    hasHandsOn: value,
                    // Limpar campos condicionais se hands-on for "Não"
                    ...(value === "Não" ? { lessonTheme: "", implantModels: [], calculatedMaterials: undefined } : {})
                  }));
                }}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Sim" id="edit-handson-sim" />
                  <Label htmlFor="edit-handson-sim" className="cursor-pointer">Sim</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Não" id="edit-handson-nao" />
                  <Label htmlFor="edit-handson-nao" className="cursor-pointer">Não</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Seção Condicional: Com hands-on (Workshop) */}
            {newLesson.hasHandsOn === "Sim" && (
              <div className="space-y-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                <div className="font-semibold text-lg mb-4">Com hands-on (Workshop)</div>
                
                {/* Tema da Aula */}
                <div className="space-y-2">
                  <Label>Qual o tema da Aula? <span className="text-red-500">*</span></Label>
                  <RadioGroup 
                    value={newLesson.lessonTheme || ""} 
                    onValueChange={(value) => setNewLesson(prev => ({ ...prev, lessonTheme: value }))}
                  >
                    {lessonThemes.map((theme) => (
                      <div key={theme} className="flex items-center space-x-2">
                        <RadioGroupItem value={theme} id={`edit-theme-${theme.replace(/\s+/g, '-')}`} />
                        <Label htmlFor={`edit-theme-${theme.replace(/\s+/g, '-')}`} className="cursor-pointer">
                          {theme}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {/* Modelos de Implante */}
                {newLesson.lessonTheme && (
                  <div className="space-y-2">
                    <Label>Favor selecionar quais modelos de implante serão utilizados no curso: <span className="text-red-500">*</span></Label>
                    <div className="space-y-2">
                      {implantModelOptions.map((model) => (
                        <div key={model} className="flex items-center space-x-2">
                          <Checkbox
                            id={`edit-implant-${model.replace(/\s+/g, '-')}`}
                            checked={newLesson.implantModels?.includes(model) || false}
                            onCheckedChange={(checked) => {
                              setNewLesson(prev => {
                                const currentModels = prev.implantModels || [];
                                if (checked) {
                                  return { ...prev, implantModels: [...currentModels, model] };
                                } else {
                                  return { ...prev, implantModels: currentModels.filter(m => m !== model) };
                                }
                              });
                            }}
                          />
                          <Label htmlFor={`edit-implant-${model.replace(/\s+/g, '-')}`} className="cursor-pointer">
                            {model}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Materiais Calculados */}
                {newLesson.calculatedMaterials && newLesson.numberOfStudents && parseInt(newLesson.numberOfStudents) > 0 && (
                  <div className="mt-4 p-4 bg-white dark:bg-gray-900 rounded-lg border">
                    <div className="font-semibold mb-3">Materiais Calculados Automaticamente:</div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Maxilas:</span> {newLesson.calculatedMaterials.totalMaxillas} unidades 
                        <span className="text-gray-600 dark:text-gray-400 ml-2">
                          ({newLesson.calculatedMaterials.maxillasPerStudent} por aluno × {newLesson.numberOfStudents} alunos)
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Implantes:</span> {newLesson.calculatedMaterials.totalImplants} unidades 
                        <span className="text-gray-600 dark:text-gray-400 ml-2">
                          ({newLesson.calculatedMaterials.implantsPerStudent} por aluno × {newLesson.numberOfStudents} alunos)
                        </span>
                        <div className="text-xs text-gray-500 dark:text-gray-500 mt-1 ml-4">
                          Tipos: {newLesson.calculatedMaterials.implantTypes.join(", ")}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">Motores:</span> {newLesson.calculatedMaterials.motorsNeeded} unidades 
                        <span className="text-gray-600 dark:text-gray-400 ml-2">
                          (1 motor por dupla)
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Kits cirúrgicos:</span> {newLesson.calculatedMaterials.totalSurgicalKits} unidades 
                        <span className="text-gray-600 dark:text-gray-400 ml-2">
                          (1 kit por motor)
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Curso */}
            <div className="space-y-2">
              <Label htmlFor="edit-courseId">Curso <span className="text-red-500">*</span></Label>
              <Select value={newLesson.courseId} onValueChange={(value) => setNewLesson(prev => ({ ...prev, courseId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um curso" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditLesson} className="bg-red-500 hover:bg-red-600">
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <ConfirmationDialog
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        onConfirm={handleDeleteLesson}
        title="Excluir Aula"
        description="Tem certeza que deseja excluir esta aula? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
      />
    </div>
  );
};
