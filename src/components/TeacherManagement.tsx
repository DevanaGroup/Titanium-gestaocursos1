import { useState, useEffect } from "react";
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
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Search, Edit, Trash2, UserCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { db, auth, FUNCTIONS_BASE_URL } from "@/config/firebase";
import { collection, getDocs, deleteDoc, doc, serverTimestamp, setDoc, updateDoc, query, where } from "firebase/firestore";
import { HierarchyLevel } from "@/types";
import { getDoc } from "firebase/firestore";
import { User } from "@/types";
import { getHierarchyColor } from "@/utils/hierarchyUtils";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

interface TeacherAddress {
  cep: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
}

interface TeacherAvailability {
  availableOutsideBrazil: boolean;
  travelAvailability: string; // "Dentro do estado" | "Fora do estado" | "Brasil todo" | "Internacional"
  languages: string[];
  noticePeriodDays: number;
}

interface TeacherData extends User {
  id: string;
  fullName?: string;
  cpf?: string;
  birthDate?: Date;
  cro?: string;
  address?: TeacherAddress;
  availability?: TeacherAvailability;
}

const enableAdministrativeMode = () => {
  (window as any).administrativeOperation = true;
  (window as any).collaboratorCreationInProgress = true;
  (window as any).intentionalLogout = true;
  console.log('🔒 Modo administrativo ativado - logout automático desabilitado');
};

const disableAdministrativeMode = () => {
  setTimeout(() => {
    (window as any).administrativeOperation = false;
    (window as any).collaboratorCreationInProgress = false;
    (window as any).intentionalLogout = false;
    console.log('🔓 Modo administrativo desativado - logout automático reativado');
  }, 1000);
};

// Lista de idiomas disponíveis
const AVAILABLE_LANGUAGES = [
  "Português",
  "Inglês",
  "Espanhol",
  "Francês",
  "Alemão",
  "Italiano",
  "Mandarim",
  "Japonês",
  "Russo",
  "Árabe",
  "Coreano",
  "Holandês",
  "Sueco",
  "Norueguês",
  "Dinamarquês",
  "Polonês",
  "Grego",
  "Turco",
  "Hebraico",
  "Hindi"
];

// Função para buscar CEP na API ViaCEP
const fetchCEP = async (cep: string): Promise<TeacherAddress | null> => {
  try {
    const cleanCEP = cep.replace(/\D/g, '');
    if (cleanCEP.length !== 8) return null;
    
    const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
    const data = await response.json();
    
    if (data.erro) {
      toast.error("CEP não encontrado");
      return null;
    }
    
    return {
      cep: cleanCEP,
      street: data.logradouro || '',
      number: '',
      neighborhood: data.bairro || '',
      city: data.localidade || '',
      state: data.uf || ''
    };
  } catch (error) {
    console.error("Erro ao buscar CEP:", error);
    toast.error("Erro ao buscar CEP");
    return null;
  }
};

// Função para formatar CPF
const formatCPF = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
};

// Função para formatar CEP
const formatCEP = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 5) return numbers;
  return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
};

// Função para formatar telefone
const formatPhone = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
};

// Função para formatar data (dd/MM/yyyy)
const formatDateInput = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
  return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
};

// Função para parsear data do formato dd/MM/yyyy
const parseDateInput = (value: string): Date | undefined => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length !== 8) return undefined;
  
  const day = parseInt(numbers.slice(0, 2), 10);
  const month = parseInt(numbers.slice(2, 4), 10) - 1; // Mês é 0-indexed
  const year = parseInt(numbers.slice(4, 8), 10);
  
  if (day < 1 || day > 31 || month < 0 || month > 11 || year < 1900 || year > 2100) {
    return undefined;
  }
  
  const date = new Date(year, month, day);
  if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
    return undefined; // Data inválida
  }
  
  return date;
};

// Função para processar e redimensionar imagem
const processImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 200;
      const MAX_HEIGHT = 200;
      
      let width = img.width;
      let height = img.height;
      
      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Erro ao criar contexto do canvas'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      const base64Image = canvas.toDataURL('image/jpeg', 0.7);
      resolve(base64Image);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Erro ao processar a imagem'));
    };
    
    img.src = objectUrl;
  });
};

export const TeacherManagement = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [teachers, setTeachers] = useState<TeacherData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherData | null>(null);
  const [currentUserData, setCurrentUserData] = useState<User | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedUserForDeletion, setSelectedUserForDeletion] = useState<string | null>(null);
  const [isLoadingCEP, setIsLoadingCEP] = useState(false);
  const [birthDate, setBirthDate] = useState<Date | undefined>(undefined);
  const [editBirthDate, setEditBirthDate] = useState<Date | undefined>(undefined);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);
  const [birthDateInput, setBirthDateInput] = useState<string>("");
  const [editBirthDateInput, setEditBirthDateInput] = useState<string>("");
  
  const [newTeacher, setNewTeacher] = useState({
    fullName: "",
    cpf: "",
    birthDate: undefined as Date | undefined,
    email: "",
    phone: "",
    cro: "",
    password: "",
    photoURL: null as string | null,
    address: {
      cep: "",
      street: "",
      number: "",
      neighborhood: "",
      city: "",
      state: ""
    } as TeacherAddress,
    availability: {
      availableOutsideBrazil: false,
      travelAvailability: "Dentro do estado",
      languages: [] as string[],
      noticePeriodDays: 30
    } as TeacherAvailability
  });

  const fetchTeachers = async () => {
    setIsLoading(true);
    try {
      console.log("🔍 TeacherManagement - Buscando professores...");
      
      const usersCollection = collection(db, "users");
      const usersSnapshot = await getDocs(usersCollection);
      
      const teachersList = usersSnapshot.docs
        .map(doc => {
          const data = doc.data();
          const uid = data.uid || doc.id;
          
          // Separar nome completo em firstName e lastName para compatibilidade
          const fullName = data.fullName || data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim();
          const nameParts = fullName.split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          
          return {
            id: doc.id,
            uid: uid,
            email: data.email || "",
            firstName: firstName,
            lastName: lastName,
            displayName: fullName,
            fullName: fullName,
            hierarchyLevel: data.hierarchyLevel as HierarchyLevel,
            photoURL: data.photoURL || null,
            phoneNumber: data.phone || data.phoneNumber || "",
            cpf: data.cpf || "",
            birthDate: data.birthDate?.toDate ? data.birthDate.toDate() : (data.birthDate ? new Date(data.birthDate) : undefined),
            cro: data.cro || "",
            address: data.address || undefined,
            availability: data.availability || undefined,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date()),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : new Date()),
          };
        })
        .filter(teacher => teacher.hierarchyLevel === "Nível 6");
      
      console.log("✅ TeacherManagement - Professores carregados:", teachersList.length);
      setTeachers(teachersList);
    } catch (error) {
      console.error("❌ TeacherManagement - Erro ao buscar professores:", error);
      toast.error("Não foi possível carregar os professores");
      setTeachers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  useEffect(() => {
    const fetchCurrentUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          setCurrentUserData(userData);
        }
      }
    };
    fetchCurrentUserData();
  }, []);

  const handleCEPBlur = async () => {
    if (!newTeacher.address.cep) return;
    setIsLoadingCEP(true);
    const address = await fetchCEP(newTeacher.address.cep);
    if (address) {
      setNewTeacher({
        ...newTeacher,
        address: {
          ...newTeacher.address,
          ...address,
          cep: formatCEP(address.cep)
        }
      });
    }
    setIsLoadingCEP(false);
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }
    
    try {
      toast.loading('Processando imagem...');
      const base64Image = await processImage(file);
      
      if (isEdit && selectedTeacher) {
        setEditPhotoPreview(base64Image);
        setSelectedTeacher({ ...selectedTeacher, photoURL: base64Image });
      } else {
        setPhotoPreview(base64Image);
        setNewTeacher({ ...newTeacher, photoURL: base64Image });
      }
      
      toast.dismiss();
      toast.success('Imagem processada com sucesso!');
    } catch (error) {
      toast.dismiss();
      toast.error('Erro ao processar a imagem');
      console.error('Erro ao processar imagem:', error);
    }
    
    // Limpar o input para permitir selecionar o mesmo arquivo novamente
    e.target.value = '';
  };

  const handleAddTeacher = async () => {
    try {
      setIsLoading(true);
      
      // 🔒 ATIVAR MODO ADMINISTRATIVO - DESABILITAR LOGOUT AUTOMÁTICO COMPLETAMENTE
      enableAdministrativeMode();
      toast.info("Iniciando criação do professor...");

      // Verificar se o usuário atual tem permissão
      const currentUser = auth.currentUser;
      if (!currentUser) {
        toast.error("Você precisa estar logado para realizar esta ação!");
        setIsLoading(false);
        disableAdministrativeMode();
        return;
      }

      if (!newTeacher.fullName || !newTeacher.cpf || !newTeacher.birthDate || !newTeacher.email || !newTeacher.phone || !newTeacher.cro) {
        toast.error("Por favor, preencha todos os campos obrigatórios");
        setIsLoading(false);
        disableAdministrativeMode();
        return;
      }

      if (!newTeacher.password || newTeacher.password.length < 6) {
        toast.error("A senha deve ter no mínimo 6 caracteres");
        setIsLoading(false);
        disableAdministrativeMode();
        return;
      }

      // Verificar se o email já existe
      const emailQuery = query(
        collection(db, 'users'),
        where('email', '==', newTeacher.email)
      );
      const emailSnapshot = await getDocs(emailQuery);
      
      if (!emailSnapshot.empty) {
        toast.error("Este e-mail já está sendo usado por outro usuário. Por favor, use um e-mail diferente.");
        setIsLoading(false);
        disableAdministrativeMode();
        return;
      }

      // Separar nome completo
      const nameParts = newTeacher.fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      // Se não houver sobrenome, usar o primeiro nome como sobrenome também
      const lastName = nameParts.slice(1).join(' ') || firstName || 'Professor';

      // Validar campos antes de enviar
      if (!firstName || !lastName) {
        toast.error("Nome completo inválido. Por favor, verifique o nome do professor.");
        setIsLoading(false);
        disableAdministrativeMode();
        return;
      }

      // 📡 Chamar função serverless para criar usuário no Auth
      console.log('🚀 Chamando função serverless para criar usuário...');
      console.log('📧 Email:', newTeacher.email);
      console.log('👤 Nome:', firstName, lastName);
      console.log('📊 Nível: Nível 6');
      console.log('🔑 Password presente:', !!newTeacher.password);
      
      const requestBody = {
        email: newTeacher.email,
        password: newTeacher.password,
        firstName: firstName,
        lastName: lastName,
        hierarchyLevel: "Nível 6"
      };
      
      console.log('📦 Body da requisição:', {
        email: requestBody.email,
        hasPassword: !!requestBody.password,
        firstName: requestBody.firstName,
        lastName: requestBody.lastName,
        hierarchyLevel: requestBody.hierarchyLevel
      });
      
      toast.info("Criando usuário no sistema de autenticação...");
      
      const token = await currentUser.getIdToken();
      console.log('🔑 Token obtido, fazendo requisição...');
      
      let createUserResponse;
      try {
        createUserResponse = await fetch(`${FUNCTIONS_BASE_URL}/createUserAuth`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(requestBody)
        });
        
        console.log('📡 Resposta recebida:', {
          status: createUserResponse.status,
          statusText: createUserResponse.statusText,
          ok: createUserResponse.ok
        });
      } catch (fetchError: any) {
        console.error('❌ Erro na requisição fetch:', fetchError);
        throw new Error(`Erro de conexão: ${fetchError.message || 'Não foi possível conectar ao servidor'}`);
      }

      if (!createUserResponse.ok) {
        let errorMessage = `Erro ${createUserResponse.status}: ${createUserResponse.statusText}`;
        try {
          const errorData = await createUserResponse.json();
          errorMessage = errorData.error || errorMessage;
          console.error('❌ Erro da função serverless:', errorData);
        } catch (parseError) {
          // Se não conseguir parsear JSON, tentar ler como texto
          try {
            const errorText = await createUserResponse.text();
            console.error('❌ Erro da função serverless (texto):', errorText);
            errorMessage = errorText || errorMessage;
          } catch (textError) {
            console.error('❌ Não foi possível ler a resposta de erro');
          }
        }
        throw new Error(errorMessage);
      }

      let authResult;
      try {
        authResult = await createUserResponse.json();
        console.log('✅ Resposta JSON recebida:', authResult);
      } catch (parseError) {
        console.error('❌ Erro ao parsear resposta JSON:', parseError);
        throw new Error('Resposta inválida do servidor');
      }
      
      const newUserId = authResult.uid;
      if (!newUserId) {
        console.error('❌ UID não encontrado na resposta:', authResult);
        throw new Error('UID do usuário não foi retornado pelo servidor');
      }
      
      console.log('✅ Usuário criado com sucesso no Auth:', newUserId);
      toast.success("Usuário criado no sistema de autenticação!");

      // ✅ SALVAR DADOS NA COLEÇÃO USERS
      console.log('💾 Salvando dados na coleção users...');
      toast.info("Salvando dados do professor...");
      
      await setDoc(doc(db, "users", newUserId), {
        uid: newUserId,
        email: newTeacher.email,
        firstName: firstName,
        lastName: lastName,
        displayName: newTeacher.fullName,
        fullName: newTeacher.fullName,
        hierarchyLevel: "Nível 6",
        photoURL: newTeacher.photoURL || null,
        phone: newTeacher.phone,
        phoneNumber: newTeacher.phone,
        cpf: newTeacher.cpf.replace(/\D/g, ''),
        birthDate: serverTimestamp(),
        cro: newTeacher.cro,
        address: newTeacher.address,
        availability: newTeacher.availability,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      toast.success("✅ Professor criado com sucesso! O usuário já pode fazer login.");
      setIsAddDialogOpen(false);
      
      // Limpar o formulário
      setNewTeacher({
        fullName: "",
        cpf: "",
        birthDate: undefined,
        email: "",
        phone: "",
        cro: "",
        password: "",
        photoURL: null,
        address: {
          cep: "",
          street: "",
          number: "",
          neighborhood: "",
          city: "",
          state: ""
        },
        availability: {
          availableOutsideBrazil: false,
          travelAvailability: "Dentro do estado",
          languages: [],
          noticePeriodDays: 30
        }
      });
      setBirthDate(undefined);
      setBirthDateInput("");
      setPhotoPreview(null);
      
      await fetchTeachers();
      
      console.log('✅ Processo de criação de professor concluído com sucesso!');
      
    } catch (error: any) {
      console.error('❌ Erro geral ao criar professor:', error);
      
      if (error.message && error.message.includes('email já está sendo usado')) {
        toast.error("Este e-mail já está sendo usado por outro usuário.");
      } else {
        toast.error(`Erro ao criar professor: ${error.message || "Erro desconhecido"}`);
      }
    } finally {
      // 🔓 SEMPRE DESATIVAR MODO ADMINISTRATIVO NO FINAL
      disableAdministrativeMode();
      
      setIsLoading(false);
    }
  };

  const handleEditTeacher = async () => {
    if (!selectedTeacher) return;

    try {
      enableAdministrativeMode();

      const nameParts = (selectedTeacher.fullName || selectedTeacher.displayName || '').trim().split(' ');
      const firstName = nameParts[0] || '';
      // Se não houver sobrenome, usar o primeiro nome como sobrenome também
      const lastName = nameParts.slice(1).join(' ') || firstName || 'Professor';

      await updateDoc(doc(db, "users", selectedTeacher.uid), {
        firstName: firstName,
        lastName: lastName,
        displayName: selectedTeacher.fullName || selectedTeacher.displayName,
        fullName: selectedTeacher.fullName || selectedTeacher.displayName,
        phone: selectedTeacher.phoneNumber,
        phoneNumber: selectedTeacher.phoneNumber,
        cpf: selectedTeacher.cpf ? selectedTeacher.cpf.replace(/\D/g, '') : undefined,
        birthDate: selectedTeacher.birthDate ? serverTimestamp() : undefined,
        cro: selectedTeacher.cro,
        photoURL: selectedTeacher.photoURL || null,
        address: selectedTeacher.address,
        availability: selectedTeacher.availability,
        updatedAt: serverTimestamp()
      });

      toast.success("Professor atualizado com sucesso!");
      setIsEditDialogOpen(false);
      setSelectedTeacher(null);
      setEditBirthDate(undefined);
      setEditBirthDateInput("");
      
      await fetchTeachers();
      
      disableAdministrativeMode();
    } catch (error: any) {
      console.error("Erro ao atualizar professor:", error);
      disableAdministrativeMode();
      toast.error("Erro ao atualizar professor: " + (error.message || "Erro desconhecido"));
    }
  };

  const handleDeleteTeacher = async () => {
    if (!selectedUserForDeletion) return;

    try {
      enableAdministrativeMode();

      const userDoc = await getDoc(doc(db, "users", selectedUserForDeletion));
      if (!userDoc.exists()) {
        toast.error("Professor não encontrado");
        setIsDeleteConfirmOpen(false);
        setSelectedUserForDeletion(null);
        disableAdministrativeMode();
        return;
      }
      
      await deleteDoc(doc(db, "users", selectedUserForDeletion));

      toast.success("Professor removido com sucesso!");
      setIsDeleteConfirmOpen(false);
      setSelectedUserForDeletion(null);
      
      await fetchTeachers();
      
      disableAdministrativeMode();
    } catch (error: any) {
      console.error("Erro ao deletar professor:", error);
      disableAdministrativeMode();
      toast.error("Erro ao deletar professor: " + (error.message || "Erro desconhecido"));
    }
  };

  const filteredTeachers = teachers.filter(teacher => {
    const searchLower = searchTerm.toLowerCase();
    const fullName = teacher.fullName || teacher.displayName || '';
    return (
      fullName.toLowerCase().includes(searchLower) ||
      teacher.email.toLowerCase().includes(searchLower) ||
      (teacher.cpf || '').includes(searchLower) ||
      (teacher.cro || '').toLowerCase().includes(searchLower)
    );
  });

  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserCircle className="h-5 w-5" />
                Gerenciar Professores
              </CardTitle>
              <CardDescription>
                Gerencie os professores cadastrados na plataforma
              </CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-red-500 text-white hover:bg-red-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Professor
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Adicionar Novo Professor</DialogTitle>
                  <DialogDescription>
                    Crie uma nova conta de professor (Nível 6)
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  {/* Foto do Perfil */}
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                      <Avatar className="h-24 w-24 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => document.getElementById('photo-upload')?.click()}>
                        <AvatarImage src={photoPreview || undefined} />
                        <AvatarFallback>
                          <UserCircle className="h-12 w-12" />
                        </AvatarFallback>
                      </Avatar>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
                        onClick={() => document.getElementById('photo-upload')?.click()}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <input
                        type="file"
                        id="photo-upload"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handlePhotoChange(e, false)}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Clique na foto para alterar
                    </p>
                  </div>

                  {/* Dados Pessoais */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm">Dados Pessoais</h3>
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="fullName">Nome Completo *</Label>
                        <Input
                          id="fullName"
                          placeholder="Nome completo"
                          value={newTeacher.fullName}
                          onChange={(e) => setNewTeacher({ ...newTeacher, fullName: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="cpf">CPF *</Label>
                          <Input
                            id="cpf"
                            placeholder="000.000.000-00"
                            value={formatCPF(newTeacher.cpf)}
                            onChange={(e) => setNewTeacher({ ...newTeacher, cpf: e.target.value })}
                            maxLength={14}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="birthDate">Data de Nascimento *</Label>
                          <div className="flex gap-2">
                            <Input
                              id="birthDate"
                              placeholder="dd/MM/yyyy"
                              value={birthDateInput}
                              onChange={(e) => {
                                const formatted = formatDateInput(e.target.value);
                                setBirthDateInput(formatted);
                                
                                if (formatted.replace(/\D/g, '').length === 8) {
                                  const parsed = parseDateInput(formatted);
                                  if (parsed) {
                                    setBirthDate(parsed);
                                    setNewTeacher({ ...newTeacher, birthDate: parsed });
                                  }
                                }
                              }}
                              maxLength={10}
                              className="flex-1"
                            />
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="shrink-0"
                                >
                                  <CalendarIcon className="h-4 w-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <Calendar
                                  mode="single"
                                  selected={birthDate}
                                  onSelect={(date) => {
                                    setBirthDate(date);
                                    setNewTeacher({ ...newTeacher, birthDate: date });
                                    if (date) {
                                      setBirthDateInput(format(date, "dd/MM/yyyy", { locale: ptBR }));
                                    }
                                  }}
                                  locale={ptBR}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="email">Email *</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="email@exemplo.com"
                            value={newTeacher.email}
                            onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="phone">Telefone *</Label>
                          <Input
                            id="phone"
                            placeholder="(00) 00000-0000"
                            value={formatPhone(newTeacher.phone)}
                            onChange={(e) => setNewTeacher({ ...newTeacher, phone: e.target.value })}
                            maxLength={15}
                          />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="cro">CRO *</Label>
                        <Input
                          id="cro"
                          placeholder="00000-PR"
                          value={newTeacher.cro}
                          onChange={(e) => setNewTeacher({ ...newTeacher, cro: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Endereço */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm">Endereço</h3>
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="cep">CEP</Label>
                        <div className="flex gap-2">
                          <Input
                            id="cep"
                            placeholder="00000-000"
                            value={formatCEP(newTeacher.address.cep)}
                            onChange={(e) => setNewTeacher({ 
                              ...newTeacher, 
                              address: { ...newTeacher.address, cep: e.target.value }
                            })}
                            onBlur={handleCEPBlur}
                            maxLength={9}
                          />
                          {isLoadingCEP && <Loader2 className="h-4 w-4 animate-spin" />}
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="street">Rua</Label>
                        <Input
                          id="street"
                          placeholder="Nome da rua"
                          value={newTeacher.address.street}
                          onChange={(e) => setNewTeacher({ 
                            ...newTeacher, 
                            address: { ...newTeacher.address, street: e.target.value }
                          })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="number">Número</Label>
                        <Input
                          id="number"
                          placeholder="Número"
                          value={newTeacher.address.number}
                          onChange={(e) => setNewTeacher({ 
                            ...newTeacher, 
                            address: { ...newTeacher.address, number: e.target.value }
                          })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="neighborhood">Bairro</Label>
                        <Input
                          id="neighborhood"
                          placeholder="Nome do bairro"
                          value={newTeacher.address.neighborhood}
                          onChange={(e) => setNewTeacher({ 
                            ...newTeacher, 
                            address: { ...newTeacher.address, neighborhood: e.target.value }
                          })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="city">Cidade</Label>
                          <Input
                            id="city"
                            placeholder="Cidade"
                            value={newTeacher.address.city}
                            onChange={(e) => setNewTeacher({ 
                              ...newTeacher, 
                              address: { ...newTeacher.address, city: e.target.value }
                            })}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="state">Estado</Label>
                          <Input
                            id="state"
                            placeholder="UF"
                            value={newTeacher.address.state}
                            onChange={(e) => setNewTeacher({ 
                              ...newTeacher, 
                              address: { ...newTeacher.address, state: e.target.value }
                            })}
                            maxLength={2}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Disponibilidade */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm">Disponibilidade</h3>
                    <div className="grid gap-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="availableOutsideBrazil"
                          checked={newTeacher.availability.availableOutsideBrazil}
                          onChange={(e) => setNewTeacher({
                            ...newTeacher,
                            availability: {
                              ...newTeacher.availability,
                              availableOutsideBrazil: e.target.checked
                            }
                          })}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="availableOutsideBrazil" className="font-normal cursor-pointer">
                          Disponibilidade Fora do Brasil
                        </Label>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="travelAvailability">Disponibilidade para viagem</Label>
                        <Select
                          value={newTeacher.availability.travelAvailability}
                          onValueChange={(value) => setNewTeacher({
                            ...newTeacher,
                            availability: {
                              ...newTeacher.availability,
                              travelAvailability: value
                            }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Dentro do estado">Dentro do estado</SelectItem>
                            <SelectItem value="Fora do estado">Fora do estado</SelectItem>
                            <SelectItem value="Brasil todo">Brasil todo</SelectItem>
                            <SelectItem value="Internacional">Internacional</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Idiomas que tem domínio</Label>
                        <div className="grid grid-cols-2 gap-3 p-3 border rounded-md max-h-48 overflow-y-auto">
                          {AVAILABLE_LANGUAGES.map((language) => (
                            <div key={language} className="flex items-center space-x-2">
                              <Checkbox
                                id={`language-${language}`}
                                checked={newTeacher.availability.languages.includes(language)}
                                onCheckedChange={(checked) => {
                                  setNewTeacher({
                                    ...newTeacher,
                                    availability: {
                                      ...newTeacher.availability,
                                      languages: checked
                                        ? [...newTeacher.availability.languages, language]
                                        : newTeacher.availability.languages.filter(l => l !== language)
                                    }
                                  });
                                }}
                              />
                              <Label 
                                htmlFor={`language-${language}`} 
                                className="text-sm font-normal cursor-pointer"
                              >
                                {language}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="noticePeriod">Prazo para solicitação de aula (dias)</Label>
                        <Input
                          id="noticePeriod"
                          type="number"
                          placeholder="30"
                          value={newTeacher.availability.noticePeriodDays}
                          onChange={(e) => setNewTeacher({
                            ...newTeacher,
                            availability: {
                              ...newTeacher.availability,
                              noticePeriodDays: parseInt(e.target.value) || 30
                            }
                          })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Senha */}
                  <div className="grid gap-2">
                    <Label htmlFor="password">Senha *</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={newTeacher.password}
                      onChange={(e) => setNewTeacher({ ...newTeacher, password: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddTeacher} className="bg-red-500 text-white hover:bg-red-600">
                    Criar Professor
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar professores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredTeachers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "Nenhum professor encontrado" : "Nenhum professor cadastrado"}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">Professor</TableHead>
                    <TableHead className="text-center">Email</TableHead>
                    <TableHead className="text-center">CPF</TableHead>
                    <TableHead className="text-center">CRO</TableHead>
                    <TableHead className="text-center">Telefone</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeachers.map((teacher) => (
                    <TableRow key={teacher.id}>
                      <TableCell>
                        <div className="flex items-center justify-center gap-3">
                          <Avatar>
                            <AvatarImage src={teacher.photoURL || undefined} />
                            <AvatarFallback>
                              {getInitials(teacher.fullName || teacher.displayName || '')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div 
                              className="font-medium truncate max-w-[20ch]" 
                              title={teacher.fullName || teacher.displayName || ''}
                            >
                              {teacher.fullName || teacher.displayName}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div 
                          className="truncate max-w-[15ch]" 
                          title={teacher.email}
                        >
                          {teacher.email && teacher.email.length > 15 
                            ? `${teacher.email.substring(0, 15)}...` 
                            : teacher.email}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{teacher.cpf ? formatCPF(teacher.cpf) : "-"}</TableCell>
                      <TableCell className="text-center">{teacher.cro || "-"}</TableCell>
                      <TableCell className="text-center whitespace-nowrap">{teacher.phoneNumber || "-"}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedTeacher(teacher);
                              setEditBirthDate(teacher.birthDate);
                              setEditBirthDateInput(teacher.birthDate ? format(teacher.birthDate, "dd/MM/yyyy", { locale: ptBR }) : "");
                              setEditPhotoPreview(null);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedUserForDeletion(teacher.uid);
                              setIsDeleteConfirmOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Professor</DialogTitle>
            <DialogDescription>
              Atualize as informações do professor
            </DialogDescription>
          </DialogHeader>
          {selectedTeacher && (
            <div className="grid gap-4 py-4">
              {/* Foto do Perfil */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <Avatar className="h-24 w-24 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => document.getElementById('edit-photo-upload')?.click()}>
                    <AvatarImage src={editPhotoPreview || selectedTeacher.photoURL || undefined} />
                    <AvatarFallback>
                      {getInitials(selectedTeacher.fullName || selectedTeacher.displayName || '')}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
                    onClick={() => document.getElementById('edit-photo-upload')?.click()}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <input
                    type="file"
                    id="edit-photo-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handlePhotoChange(e, true)}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Clique na foto para alterar
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="editFullName">Nome Completo *</Label>
                <Input
                  id="editFullName"
                  placeholder="Nome completo"
                  value={selectedTeacher.fullName || selectedTeacher.displayName || ''}
                  onChange={(e) => setSelectedTeacher({ 
                    ...selectedTeacher, 
                    fullName: e.target.value,
                    displayName: e.target.value
                  })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="editCPF">CPF *</Label>
                  <Input
                    id="editCPF"
                    placeholder="000.000.000-00"
                    value={selectedTeacher.cpf ? formatCPF(selectedTeacher.cpf) : ''}
                    onChange={(e) => setSelectedTeacher({ 
                      ...selectedTeacher, 
                      cpf: e.target.value
                    })}
                    maxLength={14}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="editBirthDate">Data de Nascimento *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="editBirthDate"
                      placeholder="dd/MM/yyyy"
                      value={editBirthDateInput}
                      onChange={(e) => {
                        const formatted = formatDateInput(e.target.value);
                        setEditBirthDateInput(formatted);
                        
                        if (formatted.replace(/\D/g, '').length === 8) {
                          const parsed = parseDateInput(formatted);
                          if (parsed) {
                            setEditBirthDate(parsed);
                            setSelectedTeacher({ ...selectedTeacher, birthDate: parsed });
                          }
                        }
                      }}
                      maxLength={10}
                      className="flex-1"
                    />
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="shrink-0"
                        >
                          <CalendarIcon className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={editBirthDate}
                          onSelect={(date) => {
                            setEditBirthDate(date);
                            setSelectedTeacher({ ...selectedTeacher, birthDate: date });
                            if (date) {
                              setEditBirthDateInput(format(date, "dd/MM/yyyy", { locale: ptBR }));
                            }
                          }}
                          locale={ptBR}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="editEmail">Email</Label>
                  <Input
                    id="editEmail"
                    type="email"
                    value={selectedTeacher.email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">O email não pode ser alterado</p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="editPhone">Telefone *</Label>
                  <Input
                    id="editPhone"
                    placeholder="(00) 00000-0000"
                    value={formatPhone(selectedTeacher.phoneNumber || '')}
                    onChange={(e) => setSelectedTeacher({ 
                      ...selectedTeacher, 
                      phoneNumber: e.target.value
                    })}
                    maxLength={15}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="editCRO">CRO *</Label>
                <Input
                  id="editCRO"
                  placeholder="00000-PR"
                  value={selectedTeacher.cro || ''}
                  onChange={(e) => setSelectedTeacher({ 
                    ...selectedTeacher, 
                    cro: e.target.value
                  })}
                />
              </div>
              
              {/* Endereço */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Endereço</h3>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="editCEP">CEP</Label>
                    <Input
                      id="editCEP"
                      placeholder="00000-000"
                      value={formatCEP(selectedTeacher.address?.cep || '')}
                      onChange={(e) => setSelectedTeacher({ 
                        ...selectedTeacher, 
                        address: { ...(selectedTeacher.address || { cep: '', street: '', number: '', neighborhood: '', city: '', state: '' }), cep: e.target.value }
                      })}
                      maxLength={9}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="editStreet">Rua</Label>
                    <Input
                      id="editStreet"
                      placeholder="Nome da rua"
                      value={selectedTeacher.address?.street || ''}
                      onChange={(e) => setSelectedTeacher({ 
                        ...selectedTeacher, 
                        address: { ...(selectedTeacher.address || { cep: '', street: '', number: '', neighborhood: '', city: '', state: '' }), street: e.target.value }
                      })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="editNumber">Número</Label>
                    <Input
                      id="editNumber"
                      placeholder="Número"
                      value={selectedTeacher.address?.number || ''}
                      onChange={(e) => setSelectedTeacher({ 
                        ...selectedTeacher, 
                        address: { ...(selectedTeacher.address || { cep: '', street: '', number: '', neighborhood: '', city: '', state: '' }), number: e.target.value }
                      })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="editNeighborhood">Bairro</Label>
                    <Input
                      id="editNeighborhood"
                      placeholder="Nome do bairro"
                      value={selectedTeacher.address?.neighborhood || ''}
                      onChange={(e) => setSelectedTeacher({ 
                        ...selectedTeacher, 
                        address: { ...(selectedTeacher.address || { cep: '', street: '', number: '', neighborhood: '', city: '', state: '' }), neighborhood: e.target.value }
                      })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="editCity">Cidade</Label>
                      <Input
                        id="editCity"
                        placeholder="Cidade"
                        value={selectedTeacher.address?.city || ''}
                        onChange={(e) => setSelectedTeacher({ 
                          ...selectedTeacher, 
                          address: { ...(selectedTeacher.address || { cep: '', street: '', number: '', neighborhood: '', city: '', state: '' }), city: e.target.value }
                        })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="editState">Estado</Label>
                      <Input
                        id="editState"
                        placeholder="UF"
                        value={selectedTeacher.address?.state || ''}
                        onChange={(e) => setSelectedTeacher({ 
                          ...selectedTeacher, 
                          address: { ...(selectedTeacher.address || { cep: '', street: '', number: '', neighborhood: '', city: '', state: '' }), state: e.target.value }
                        })}
                        maxLength={2}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Disponibilidade */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Disponibilidade</h3>
                <div className="grid gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="editAvailableOutsideBrazil"
                      checked={selectedTeacher.availability?.availableOutsideBrazil || false}
                      onChange={(e) => setSelectedTeacher({
                        ...selectedTeacher,
                        availability: {
                          ...(selectedTeacher.availability || { availableOutsideBrazil: false, travelAvailability: "Dentro do estado", languages: [], noticePeriodDays: 30 }),
                          availableOutsideBrazil: e.target.checked
                        }
                      })}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="editAvailableOutsideBrazil" className="font-normal cursor-pointer">
                      Disponibilidade Fora do Brasil
                    </Label>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="editTravelAvailability">Disponibilidade para viagem</Label>
                    <Select
                      value={selectedTeacher.availability?.travelAvailability || "Dentro do estado"}
                      onValueChange={(value) => setSelectedTeacher({
                        ...selectedTeacher,
                        availability: {
                          ...(selectedTeacher.availability || { availableOutsideBrazil: false, travelAvailability: "Dentro do estado", languages: [], noticePeriodDays: 30 }),
                          travelAvailability: value
                        }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Dentro do estado">Dentro do estado</SelectItem>
                        <SelectItem value="Fora do estado">Fora do estado</SelectItem>
                        <SelectItem value="Brasil todo">Brasil todo</SelectItem>
                        <SelectItem value="Internacional">Internacional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Idiomas que tem domínio</Label>
                    <div className="grid grid-cols-2 gap-3 p-3 border rounded-md max-h-48 overflow-y-auto">
                      {AVAILABLE_LANGUAGES.map((language) => (
                        <div key={language} className="flex items-center space-x-2">
                          <Checkbox
                            id={`edit-language-${language}`}
                            checked={(selectedTeacher.availability?.languages || []).includes(language)}
                            onCheckedChange={(checked) => {
                              const currentLanguages = selectedTeacher.availability?.languages || [];
                              setSelectedTeacher({
                                ...selectedTeacher,
                                availability: {
                                  ...(selectedTeacher.availability || { availableOutsideBrazil: false, travelAvailability: "Dentro do estado", languages: [], noticePeriodDays: 30 }),
                                  languages: checked
                                    ? [...currentLanguages, language]
                                    : currentLanguages.filter(l => l !== language)
                                }
                              });
                            }}
                          />
                          <Label 
                            htmlFor={`edit-language-${language}`} 
                            className="text-sm font-normal cursor-pointer"
                          >
                            {language}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="editNoticePeriod">Prazo para solicitação de aula (dias)</Label>
                    <Input
                      id="editNoticePeriod"
                      type="number"
                      placeholder="30"
                      value={selectedTeacher.availability?.noticePeriodDays || 30}
                      onChange={(e) => setSelectedTeacher({
                        ...selectedTeacher,
                        availability: {
                          ...(selectedTeacher.availability || { availableOutsideBrazil: false, travelAvailability: "Dentro do estado", languages: [], noticePeriodDays: 30 }),
                          noticePeriodDays: parseInt(e.target.value) || 30
                        }
                      })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditTeacher}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <ConfirmationDialog
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        title="Confirmar Exclusão"
        description="Tem certeza que deseja remover este professor? Esta ação não pode ser desfeita."
        confirmText="Remover"
        cancelText="Cancelar"
        onConfirm={handleDeleteTeacher}
        variant="destructive"
      />
    </div>
  );
};
