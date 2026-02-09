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
import { Search, Edit, Trash2, Plus, BookOpen, MoreVertical, Copy, Info } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/config/firebase";
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, setDoc, query, orderBy, getDoc, where } from "firebase/firestore";
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
  professorId?: string; // ID do professor (users.uid)
  professorPaymentValue?: number; // Valor a pagar pelo professor nesta aula
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

interface TeacherOption {
  id: string;
  uid: string;
  fullName: string;
  defaultPaymentValue?: number;
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
  
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
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
    professorId: "",
    professorPaymentValue: undefined,
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

  // Opções de modelos de implante por tema
  const implantModelOptionsFaseCirurgica = [
    "e-fix (Groove e Silver)",
    "e-fix (Profile)",
    "i-fix",
    "b-fix (cilindrico)",
    "b-fix (Profile)"
  ];
  const implantModelOptionsCirurgiaGuiada = ["b-fix (Profile)"];
  const implantModelOptionsZigomatico = ["Profile", "Flat"];

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

  // Função para calcular materiais automaticamente (Fase Cirúrgica, Cirurgia Guiada, Zigomático)
  const calculateMaterials = useCallback(() => {
    if (newLesson.hasHandsOn !== "Sim") return undefined;

    const numberOfStudents = parseInt(newLesson.numberOfStudents) || 0;
    if (numberOfStudents <= 0) return undefined;

    const theme = newLesson.lessonTheme;
    const implantModels = newLesson.implantModels || [];
    const motorsNeeded = Math.ceil(numberOfStudents / 2);

    // Fase Cirúrgica
    if (theme === "Fase Cirúrgica" && implantModels.length > 0) {
      const maxillasPerStudent = 1;
      const hasOnlyProfile =
        implantModels.length === 1 &&
        (implantModels[0] === "e-fix (Profile)" || implantModels[0] === "b-fix (Profile)");
      const implantsPerStudent = hasOnlyProfile
        ? 2
        : Math.min(Math.max(implantModels.length, 2), 4);
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
    }

    // Cirurgia Guiada: 1 modelo (mandíbula) por aluno, 4 implantes por aluno (Titaniumfix), 1 kit por motor
    if (theme === "Cirurgia Guiada" && implantModels.length > 0) {
      const maxillasPerStudent = 1;
      const implantsPerStudent = 4;
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
    }

    // Zigomático: 1 crânio por aluno, 1 implante de cada modelo por aluno, 1 kit por motor
    if (theme === "Zigomático" && implantModels.length > 0) {
      const maxillasPerStudent = 1; // crânios
      const implantsPerStudent = implantModels.length; // 1 de cada modelo
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
    }

    return undefined;
  }, [newLesson.hasHandsOn, newLesson.lessonTheme, newLesson.implantModels, newLesson.numberOfStudents]);

  // Handler para troca de tema (limpa implantModels ao mudar; Zigomático vem com Profile e Flat pré-selecionados)
  const handleThemeChange = (theme: string, prefix = "") => {
    setNewLesson((prev) => {
      const next = { ...prev, lessonTheme: theme, implantModels: [] as string[] };
      if (theme === "Zigomático") {
        next.implantModels = ["Profile", "Flat"];
      }
      return next;
    });
  };

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
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const usersCollection = collection(db, "users");
      const teachersQuery = query(usersCollection, where("hierarchyLevel", "==", "Nível 6"));
      const teachersSnapshot = await getDocs(teachersQuery);
      const teachersList: TeacherOption[] = teachersSnapshot.docs.map((d) => {
        const data = d.data();
        const fullName = data.fullName || data.displayName || `${data.firstName || ""} ${data.lastName || ""}`.trim();
        return {
          id: d.id,
          uid: data.uid || d.id,
          fullName: fullName || "Professor",
          defaultPaymentValue: data.paymentData?.defaultValue ?? undefined
        };
      });
      setTeachers(teachersList);
    } catch (error) {
      console.error("Erro ao buscar professores:", error);
    }
  };

  const fetchCourses = async () => {
    try {
      const coursesCollection = collection(db, "courses");
      const coursesQuery = query(coursesCollection, orderBy("createdAt", "desc"));
      const coursesSnapshot = await getDocs(coursesQuery);
      
      const coursesList = coursesSnapshot.docs
        .filter(d => !d.data().deletedAt)
        .map(d => ({
        id: d.id,
        title: d.data().title || ""
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
      
      const lessonsList = await Promise.all(lessonsSnapshot.docs
        .filter(d => !d.data().deletedAt)
        .map(async (lessonDoc) => {
        const data = lessonDoc.data();
        let courseTitle = "";
        
        if (data.courseId) {
          try {
            const courseDocRef = doc(db, "courses", data.courseId);
            const courseDoc = await getDoc(courseDocRef);
            if (courseDoc.exists()) {
              const courseData = courseDoc.data();
              courseTitle = (courseData?.title as string) || "";
            }
          } catch (error) {
            console.error("Erro ao buscar curso:", error);
          }
        }
        
        return {
          id: lessonDoc.id,
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
          professorId: data.professorId || "",
          professorPaymentValue: data.professorPaymentValue ?? undefined,
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
    if ((newLesson.needsProfessor === "Não" || newLesson.needsProfessor === "Outro") && !newLesson.professorId) {
      toast.error("É necessário selecionar o professor quando a resposta for Não ou Outro");
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
      const themesRequiringImplant = ["Fase Cirúrgica", "Cirurgia Guiada", "Zigomático"];
      if (
        themesRequiringImplant.includes(newLesson.lessonTheme) &&
        (!newLesson.implantModels || newLesson.implantModels.length === 0)
      ) {
        toast.error("É necessário selecionar pelo menos um modelo de implante para este tema");
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
        deletedAt: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      // Firestore não aceita undefined - remover campos undefined
      const cleanData = Object.fromEntries(
        Object.entries(lessonData).filter(([, v]) => v !== undefined)
      ) as typeof lessonData;

      await addDoc(collection(db, "lessons"), cleanData);
      toast.success("Aula criada com sucesso!");
      setIsAddDialogOpen(false);
      setNewLesson({
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
        professorId: "",
        professorPaymentValue: undefined,
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
    if ((newLesson.needsProfessor === "Não" || newLesson.needsProfessor === "Outro") && !newLesson.professorId) {
      toast.error("É necessário selecionar o professor quando a resposta for Não ou Outro");
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
      const themesRequiringImplant = ["Fase Cirúrgica", "Cirurgia Guiada", "Zigomático"];
      if (
        themesRequiringImplant.includes(newLesson.lessonTheme) &&
        (!newLesson.implantModels || newLesson.implantModels.length === 0)
      ) {
        toast.error("É necessário selecionar pelo menos um modelo de implante para este tema");
        return;
      }
    }
    if (!newLesson.courseId) {
      toast.error("Selecione um curso");
      return;
    }

    try {
      const lessonRef = doc(db, "lessons", selectedLesson.id);
      const updateData = {
        ...newLesson,
        deletedAt: null,
        updatedAt: serverTimestamp()
      };
      // Firestore não aceita undefined - remover campos undefined
      const cleanData = Object.fromEntries(
        Object.entries(updateData).filter(([, v]) => v !== undefined)
      ) as typeof updateData;

      await setDoc(lessonRef, cleanData, { merge: true });

      toast.success("Aula atualizada com sucesso!");
      setIsEditDialogOpen(false);
      setSelectedLesson(null);
      setNewLesson({
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
        professorId: "",
        professorPaymentValue: undefined,
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
      await updateDoc(doc(db, "lessons", selectedLessonForDeletion), {
        deletedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
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
      professorId: lesson.professorId || "",
      professorPaymentValue: lesson.professorPaymentValue ?? undefined,
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
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground">
                    <Info className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p>Consultores sem acesso podem solicitar aula pelo link externo:</p>
                </TooltipContent>
              </Tooltip>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0 text-primary"
                onClick={() => {
                  const url = `${window.location.origin}/lessons/solicitar`;
                  void navigator.clipboard.writeText(url);
                  toast.success("Link copiado! Envie para os consultores.");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                className="bg-red-500 hover:bg-red-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Aula
              </Button>
            </div>
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
                  <TableHead className="text-center">Solicitante</TableHead>
                  <TableHead className="text-center">Consultor</TableHead>
                  <TableHead className="text-center">Curso</TableHead>
                  <TableHead className="text-center">Data</TableHead>
                  <TableHead className="text-center">Local</TableHead>
                  <TableHead className="text-center">Duração</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLessons.map((lesson) => (
                  <TableRow
                    key={lesson.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openEditDialog(lesson)}
                  >
                    <TableCell className="text-center font-medium">{lesson.requesterName || "-"}</TableCell>
                    <TableCell className="text-center">{lesson.consultantName || "-"}</TableCell>
                    <TableCell className="text-center">
                      {lesson.courseTitle ? (
                        <div 
                          className="truncate max-w-[15ch] mx-auto" 
                          title={lesson.courseTitle}
                        >
                          {lesson.courseTitle.length > 15 
                            ? `${lesson.courseTitle.substring(0, 15)}...` 
                            : lesson.courseTitle}
                        </div>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      {lesson.lessonDate ? new Date(lesson.lessonDate).toLocaleDateString('pt-BR') : "-"}
                      {lesson.lessonStartTime && ` ${lesson.lessonStartTime}`}
                    </TableCell>
                    <TableCell className="text-center max-w-[200px] truncate">{lesson.locationName || "-"}</TableCell>
                    <TableCell className="text-center whitespace-nowrap">{lesson.lessonDuration || lesson.customDuration || "-"}</TableCell>
                    <TableCell className="text-center">{getStatusBadge(lesson.status)}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(lesson)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openDeleteDialog(lesson.id)}
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
                onValueChange={(value) => setNewLesson(prev => ({ 
                  ...prev, 
                  needsProfessor: value
                }))}
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
              <div className="mt-2 space-y-2">
                <Label>
                  {newLesson.needsProfessor === "Sim" 
                    ? "Vincular a um professor disponível (opcional)" 
                    : "Professor que irá ministrar a aula"}
                  {(newLesson.needsProfessor === "Não" || newLesson.needsProfessor === "Outro") && <span className="text-red-500"> *</span>}
                </Label>
                <Select
                  value={newLesson.professorId || (newLesson.needsProfessor === "Sim" ? "__none__" : "")}
                  onValueChange={(value) => {
                    if (value === "__none__") {
                      setNewLesson(prev => ({
                        ...prev,
                        professorId: "",
                        professorName: "",
                        professorPaymentValue: undefined
                      }));
                      return;
                    }
                    const teacher = teachers.find(t => t.uid === value || t.id === value);
                    setNewLesson(prev => ({
                      ...prev,
                      professorId: value,
                      professorName: teacher?.fullName || "",
                      professorPaymentValue: teacher?.defaultPaymentValue ?? prev.professorPaymentValue ?? 0
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={teachers.length > 0 ? "Selecione o professor" : "Nenhum professor disponível"} />
                  </SelectTrigger>
                  <SelectContent>
                    {newLesson.needsProfessor === "Sim" && <SelectItem value="__none__">Nenhum</SelectItem>}
                    {teachers.filter((t) => t.uid && t.id).map((t) => (
                      <SelectItem key={t.id} value={t.uid}>
                        {t.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {newLesson.professorId && (
                  <div className="grid gap-2">
                    <Label htmlFor="professorPaymentValue">Valor a pagar ao professor (R$)</Label>
                    <Input
                      id="professorPaymentValue"
                      type="number"
                      placeholder="0,00"
                      min={0}
                      step={0.01}
                      value={newLesson.professorPaymentValue ?? ""}
                      onChange={(e) => setNewLesson(prev => ({
                        ...prev,
                        professorPaymentValue: parseFloat(e.target.value) || undefined
                      }))}
                    />
                  </div>
                )}
              </div>
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
                    onValueChange={handleThemeChange}
                  >
                    {lessonThemes.map((theme) => (
                      <div key={theme} className="flex items-center space-x-2">
                        <RadioGroupItem value={theme} id={`theme-${theme.replace(/\s+/g, "-")}`} />
                        <Label htmlFor={`theme-${theme.replace(/\s+/g, "-")}`} className="cursor-pointer">
                          {theme}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {/* Conteúdo condicional por tema */}
                {newLesson.lessonTheme === "Fase Cirúrgica" && (
                  <div className="space-y-2">
                    <Label>Favor selecionar quais modelos de implante serão utilizados no curso: <span className="text-red-500">*</span></Label>
                    <div className="space-y-2">
                      {implantModelOptionsFaseCirurgica.map((model) => (
                        <div key={model} className="flex items-center space-x-2">
                          <Checkbox
                            id={`implant-${model.replace(/\s+/g, "-")}`}
                            checked={newLesson.implantModels?.includes(model) || false}
                            onCheckedChange={(checked) => {
                              setNewLesson((prev) => {
                                const currentModels = prev.implantModels || [];
                                if (checked) return { ...prev, implantModels: [...currentModels, model] };
                                return { ...prev, implantModels: currentModels.filter((m) => m !== model) };
                              });
                            }}
                          />
                          <Label htmlFor={`implant-${model.replace(/\s+/g, "-")}`} className="cursor-pointer">{model}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {newLesson.lessonTheme === "Fluxo Protético" && (
                  <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border">
                    <p className="text-sm">Será enviado um macro modelo do nosso sistema.</p>
                  </div>
                )}

                {newLesson.lessonTheme === "Cirurgia Guiada" && (
                  <div className="space-y-4">
                    <div className="bg-red-500 text-white font-bold py-2 px-4 rounded-t-lg">
                      Orientações para Hands-on de Cirurgia Guiada
                    </div>
                    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border space-y-2 text-sm">
                      <p>
                        Cada aluno (ou o curso) deve arcar com o preço de custo do modelo (mandíbula edêntula Nacional Ossos) e das guias cirúrgicas*. A Titaniumfix fornece os implantes (4 por aluno de acordo com a preferência do professor que irá ministrar a aula).
                      </p>
                      <p className="text-xs text-muted-foreground">
                        *Há a possibilidade do curso solicitante fazer parceria com um planning center local para redução do custo de produção das guias (parceiros locais costumam doar as guias para captação de clientes), neste caso as anilhas são bonificadas pela Titaniumfix.
                      </p>
                    </div>
                    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border space-y-2">
                      <Label className="font-semibold">Favor selecionar quais modelos de implante serão utilizados no curso:</Label>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="implant-cirurgia-bfix-profile"
                          checked={newLesson.implantModels?.includes("b-fix (Profile)") || false}
                          onCheckedChange={(checked) => {
                            setNewLesson((prev) =>
                              checked
                                ? { ...prev, implantModels: ["b-fix (Profile)"] }
                                : { ...prev, implantModels: [] }
                            );
                          }}
                        />
                        <Label htmlFor="implant-cirurgia-bfix-profile" className="cursor-pointer">b-fix (Profile)</Label>
                      </div>
                    </div>
                    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border">
                      <p className="font-semibold text-sm">Os materiais contra-ângulo e motor de implante são responsabilidade do curso/alunos!</p>
                    </div>
                  </div>
                )}

                {newLesson.lessonTheme === "Digital-Fix: Solução Protética do Analógico ao Digital" && (
                  <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border">
                    {/* Opções em definição */}
                  </div>
                )}

                {newLesson.lessonTheme === "Zigomático" && (
                  <div className="space-y-4">
                    <div className="bg-red-500 text-white font-bold py-2 px-4 rounded-t-lg uppercase">
                      Hands-on Zigomático
                    </div>
                    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border space-y-2 text-sm">
                      <p className="font-medium">Os materiais enviados pela Titaniumfix para essa atividade serão:</p>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>1 crânio por aluno (cobrado o valor de R$ 147,00 por aluno)</li>
                        <li>1 implante de cada modelo utilizado pelo curso (profile ou Flat)</li>
                        <li>1 kit cirúrgico para cada motor disponível no curso.</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border space-y-2">
                      <Label>Favor selecionar quais modelos de implante serão utilizados no curso: <span className="text-red-500">*</span></Label>
                      <div className="space-y-2">
                        {implantModelOptionsZigomatico.map((model) => (
                          <div key={model} className="flex items-center space-x-2">
                            <Checkbox
                              id={`implant-zig-${model}`}
                              checked={newLesson.implantModels?.includes(model) || false}
                              onCheckedChange={(checked) => {
                                setNewLesson((prev) => {
                                  const currentModels = prev.implantModels || [];
                                  if (checked) return { ...prev, implantModels: [...currentModels, model] };
                                  return { ...prev, implantModels: currentModels.filter((m) => m !== model) };
                                });
                              }}
                            />
                            <Label htmlFor={`implant-zig-${model}`} className="cursor-pointer">{model}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Materiais Calculados - Fase Cirúrgica, Cirurgia Guiada, Zigomático */}
                {["Fase Cirúrgica", "Cirurgia Guiada", "Zigomático"].includes(newLesson.lessonTheme) && newLesson.calculatedMaterials && (
                  <div className="mt-4 p-4 bg-white dark:bg-gray-900 rounded-lg border">
                    <div className="font-semibold mb-3">Materiais Calculados Automaticamente:</div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">
                          {newLesson.lessonTheme === "Zigomático" ? "Crânios:" : newLesson.lessonTheme === "Cirurgia Guiada" ? "Modelo (mandíbula):" : "Maxilas:"}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400 ml-2">
                          {newLesson.calculatedMaterials.maxillasPerStudent} por aluno
                          {newLesson.numberOfStudents && parseInt(newLesson.numberOfStudents) > 0 && (
                            <> = {newLesson.calculatedMaterials.totalMaxillas} unidades ({newLesson.numberOfStudents} alunos)</>
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Implantes:</span>
                        <span className="text-gray-600 dark:text-gray-400 ml-2">
                          {newLesson.lessonTheme === "Zigomático" ? "1 de cada modelo por aluno" : `${newLesson.calculatedMaterials.implantsPerStudent} por aluno`}
                          {newLesson.numberOfStudents && parseInt(newLesson.numberOfStudents) > 0 && (
                            <> = {newLesson.calculatedMaterials.totalImplants} unidades ({newLesson.numberOfStudents} alunos)</>
                          )}
                        </span>
                        {newLesson.calculatedMaterials.implantTypes?.length > 0 && (
                          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1 ml-4">
                            Tipos: {newLesson.calculatedMaterials.implantTypes.join(", ")}
                          </div>
                        )}
                      </div>
                      <div>
                        <span className="font-medium">Motores:</span>
                        <span className="text-gray-600 dark:text-gray-400 ml-2">
                          (1 motor por dupla)
                          {newLesson.numberOfStudents && parseInt(newLesson.numberOfStudents) > 0 && (
                            <> = {newLesson.calculatedMaterials.motorsNeeded} unidades</>
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Kits cirúrgicos:</span>
                        <span className="text-gray-600 dark:text-gray-400 ml-2">
                          (1 kit por motor)
                          {newLesson.numberOfStudents && parseInt(newLesson.numberOfStudents) > 0 && (
                            <> = {newLesson.calculatedMaterials.totalSurgicalKits} unidades</>
                          )}
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
                  {courses.filter((c) => c.id).map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={newLesson.status} onValueChange={(value: 'active' | 'inactive' | 'draft') => setNewLesson(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
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
                onValueChange={(value) => setNewLesson(prev => ({ 
                  ...prev, 
                  needsProfessor: value
                }))}
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
              <div className="mt-2 space-y-2">
                <Label>
                  {newLesson.needsProfessor === "Sim" 
                    ? "Vincular a um professor disponível (opcional)" 
                    : "Professor que irá ministrar a aula"}
                  {(newLesson.needsProfessor === "Não" || newLesson.needsProfessor === "Outro") && <span className="text-red-500"> *</span>}
                </Label>
                <Select
                  value={newLesson.professorId || (newLesson.needsProfessor === "Sim" ? "__none__" : "")}
                  onValueChange={(value) => {
                    if (value === "__none__") {
                      setNewLesson(prev => ({
                        ...prev,
                        professorId: "",
                        professorName: "",
                        professorPaymentValue: undefined
                      }));
                      return;
                    }
                    const teacher = teachers.find(t => t.uid === value || t.id === value);
                    setNewLesson(prev => ({
                      ...prev,
                      professorId: value,
                      professorName: teacher?.fullName || "",
                      professorPaymentValue: teacher?.defaultPaymentValue ?? prev.professorPaymentValue ?? 0
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={teachers.length > 0 ? "Selecione o professor" : "Nenhum professor disponível"} />
                  </SelectTrigger>
                  <SelectContent>
                    {newLesson.needsProfessor === "Sim" && <SelectItem value="__none__">Nenhum</SelectItem>}
                    {teachers.filter((t) => t.uid && t.id).map((t) => (
                      <SelectItem key={t.id} value={t.uid}>
                        {t.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {newLesson.professorId && (
                  <div className="grid gap-2">
                    <Label htmlFor="edit-professorPaymentValue">Valor a pagar ao professor (R$)</Label>
                    <Input
                      id="edit-professorPaymentValue"
                      type="number"
                      placeholder="0,00"
                      min={0}
                      step={0.01}
                      value={newLesson.professorPaymentValue ?? ""}
                      onChange={(e) => setNewLesson(prev => ({
                        ...prev,
                        professorPaymentValue: parseFloat(e.target.value) || undefined
                      }))}
                    />
                  </div>
                )}
              </div>
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
                    onValueChange={handleThemeChange}
                  >
                    {lessonThemes.map((theme) => (
                      <div key={theme} className="flex items-center space-x-2">
                        <RadioGroupItem value={theme} id={`edit-theme-${theme.replace(/\s+/g, "-")}`} />
                        <Label htmlFor={`edit-theme-${theme.replace(/\s+/g, "-")}`} className="cursor-pointer">
                          {theme}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {/* Conteúdo condicional por tema */}
                {newLesson.lessonTheme === "Fase Cirúrgica" && (
                  <div className="space-y-2">
                    <Label>Favor selecionar quais modelos de implante serão utilizados no curso: <span className="text-red-500">*</span></Label>
                    <div className="space-y-2">
                      {implantModelOptionsFaseCirurgica.map((model) => (
                        <div key={model} className="flex items-center space-x-2">
                          <Checkbox
                            id={`edit-implant-${model.replace(/\s+/g, "-")}`}
                            checked={newLesson.implantModels?.includes(model) || false}
                            onCheckedChange={(checked) => {
                              setNewLesson((prev) => {
                                const currentModels = prev.implantModels || [];
                                if (checked) return { ...prev, implantModels: [...currentModels, model] };
                                return { ...prev, implantModels: currentModels.filter((m) => m !== model) };
                              });
                            }}
                          />
                          <Label htmlFor={`edit-implant-${model.replace(/\s+/g, "-")}`} className="cursor-pointer">{model}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {newLesson.lessonTheme === "Fluxo Protético" && (
                  <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border">
                    <p className="text-sm">Será enviado um macro modelo do nosso sistema.</p>
                  </div>
                )}

                {newLesson.lessonTheme === "Cirurgia Guiada" && (
                  <div className="space-y-4">
                    <div className="bg-red-500 text-white font-bold py-2 px-4 rounded-t-lg">
                      Orientações para Hands-on de Cirurgia Guiada
                    </div>
                    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border space-y-2 text-sm">
                      <p>
                        Cada aluno (ou o curso) deve arcar com o preço de custo do modelo (mandíbula edêntula Nacional Ossos) e das guias cirúrgicas*. A Titaniumfix fornece os implantes (4 por aluno de acordo com a preferência do professor que irá ministrar a aula).
                      </p>
                      <p className="text-xs text-muted-foreground">
                        *Há a possibilidade do curso solicitante fazer parceria com um planning center local para redução do custo de produção das guias (parceiros locais costumam doar as guias para captação de clientes), neste caso as anilhas são bonificadas pela Titaniumfix.
                      </p>
                    </div>
                    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border space-y-2">
                      <Label className="font-semibold">Favor selecionar quais modelos de implante serão utilizados no curso:</Label>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="edit-implant-cirurgia-bfix-profile"
                          checked={newLesson.implantModels?.includes("b-fix (Profile)") || false}
                          onCheckedChange={(checked) => {
                            setNewLesson((prev) =>
                              checked ? { ...prev, implantModels: ["b-fix (Profile)"] } : { ...prev, implantModels: [] }
                            );
                          }}
                        />
                        <Label htmlFor="edit-implant-cirurgia-bfix-profile" className="cursor-pointer">b-fix (Profile)</Label>
                      </div>
                    </div>
                    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border">
                      <p className="font-semibold text-sm">Os materiais contra-ângulo e motor de implante são responsabilidade do curso/alunos!</p>
                    </div>
                  </div>
                )}

                {newLesson.lessonTheme === "Digital-Fix: Solução Protética do Analógico ao Digital" && (
                  <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border">
                    {/* Opções em definição */}
                  </div>
                )}

                {newLesson.lessonTheme === "Zigomático" && (
                  <div className="space-y-4">
                    <div className="bg-red-500 text-white font-bold py-2 px-4 rounded-t-lg uppercase">
                      Hands-on Zigomático
                    </div>
                    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border space-y-2 text-sm">
                      <p className="font-medium">Os materiais enviados pela Titaniumfix para essa atividade serão:</p>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>1 crânio por aluno (cobrado o valor de R$ 147,00 por aluno)</li>
                        <li>1 implante de cada modelo utilizado pelo curso (profile ou Flat)</li>
                        <li>1 kit cirúrgico para cada motor disponível no curso.</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border space-y-2">
                      <Label>Favor selecionar quais modelos de implante serão utilizados no curso: <span className="text-red-500">*</span></Label>
                      <div className="space-y-2">
                        {implantModelOptionsZigomatico.map((model) => (
                          <div key={model} className="flex items-center space-x-2">
                            <Checkbox
                              id={`edit-implant-zig-${model}`}
                              checked={newLesson.implantModels?.includes(model) || false}
                              onCheckedChange={(checked) => {
                                setNewLesson((prev) => {
                                  const currentModels = prev.implantModels || [];
                                  if (checked) return { ...prev, implantModels: [...currentModels, model] };
                                  return { ...prev, implantModels: currentModels.filter((m) => m !== model) };
                                });
                              }}
                            />
                            <Label htmlFor={`edit-implant-zig-${model}`} className="cursor-pointer">{model}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Materiais Calculados - Fase Cirúrgica, Cirurgia Guiada, Zigomático */}
                {["Fase Cirúrgica", "Cirurgia Guiada", "Zigomático"].includes(newLesson.lessonTheme) && newLesson.calculatedMaterials && (
                  <div className="mt-4 p-4 bg-white dark:bg-gray-900 rounded-lg border">
                    <div className="font-semibold mb-3">Materiais Calculados Automaticamente:</div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">
                          {newLesson.lessonTheme === "Zigomático" ? "Crânios:" : newLesson.lessonTheme === "Cirurgia Guiada" ? "Modelo (mandíbula):" : "Maxilas:"}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400 ml-2">
                          {newLesson.calculatedMaterials.maxillasPerStudent} por aluno
                          {newLesson.numberOfStudents && parseInt(newLesson.numberOfStudents) > 0 && (
                            <> = {newLesson.calculatedMaterials.totalMaxillas} unidades ({newLesson.numberOfStudents} alunos)</>
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Implantes:</span>
                        <span className="text-gray-600 dark:text-gray-400 ml-2">
                          {newLesson.lessonTheme === "Zigomático" ? "1 de cada modelo por aluno" : `${newLesson.calculatedMaterials.implantsPerStudent} por aluno`}
                          {newLesson.numberOfStudents && parseInt(newLesson.numberOfStudents) > 0 && (
                            <> = {newLesson.calculatedMaterials.totalImplants} unidades ({newLesson.numberOfStudents} alunos)</>
                          )}
                        </span>
                        {newLesson.calculatedMaterials.implantTypes?.length > 0 && (
                          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1 ml-4">
                            Tipos: {newLesson.calculatedMaterials.implantTypes.join(", ")}
                          </div>
                        )}
                      </div>
                      <div>
                        <span className="font-medium">Motores:</span>
                        <span className="text-gray-600 dark:text-gray-400 ml-2">
                          (1 motor por dupla)
                          {newLesson.numberOfStudents && parseInt(newLesson.numberOfStudents) > 0 && (
                            <> = {newLesson.calculatedMaterials.motorsNeeded} unidades</>
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Kits cirúrgicos:</span>
                        <span className="text-gray-600 dark:text-gray-400 ml-2">
                          (1 kit por motor)
                          {newLesson.numberOfStudents && parseInt(newLesson.numberOfStudents) > 0 && (
                            <> = {newLesson.calculatedMaterials.totalSurgicalKits} unidades</>
                          )}
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
                  {courses.filter((c) => c.id).map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select value={newLesson.status} onValueChange={(value: 'active' | 'inactive' | 'draft') => setNewLesson(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
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
