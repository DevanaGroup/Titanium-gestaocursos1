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
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, setDoc, query, orderBy } from "firebase/firestore";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { useNavigate } from "react-router-dom";

interface Course {
  id: string;
  title: string;
  description: string;
  duration?: string;
  instructor?: string;
  price?: number;
  status: 'active' | 'inactive' | 'draft';
  createdAt: Date;
  updatedAt: Date;
}

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
  
  const [newCourse, setNewCourse] = useState<Omit<Course, 'id' | 'createdAt' | 'updatedAt'>>({
    title: "",
    description: "",
    duration: "",
    instructor: "",
    price: 0,
    status: 'draft'
  });

  useEffect(() => {
    fetchCourses();
  }, []);

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
    course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (course.instructor && course.instructor.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewCourse(prev => ({ 
      ...prev, 
      [name]: name === 'price' ? parseFloat(value) || 0 : value 
    }));
  };

  const handleStatusChange = (status: 'active' | 'inactive' | 'draft') => {
    setNewCourse(prev => ({ ...prev, status }));
  };

  const handleCreateCourse = async () => {
    if (!newCourse.title.trim()) {
      toast.error("O título do curso é obrigatório");
      return;
    }

    try {
      const courseData = {
        ...newCourse,
        deletedAt: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, "courses"), courseData);
      toast.success("Curso criado com sucesso!");
      setIsAddDialogOpen(false);
      setNewCourse({
        title: "",
        description: "",
        duration: "",
        instructor: "",
        price: 0,
        status: 'draft'
      });
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
        status: 'draft'
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
      status: course.status
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Gerenciamento de Cursos
              </CardTitle>
              <CardDescription>
                Crie e gerencie os cursos disponíveis no sistema
              </CardDescription>
            </div>
            <Button 
              onClick={() => setIsAddDialogOpen(true)}
              className="bg-red-500 hover:bg-red-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Curso
            </Button>
          </div>
        </CardHeader>
        <CardContent className="h-[600px] overflow-y-auto">
          <div className="mb-4">
            <div className="flex flex-col lg:flex-row gap-3 lg:justify-end">
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
          </div>

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
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">Título</TableHead>
                  <TableHead className="text-center">Descrição</TableHead>
                  <TableHead className="text-center">Duração</TableHead>
                  <TableHead className="text-center">Instrutor</TableHead>
                  <TableHead className="text-center">Preço</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCourses.map((course) => (
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
                    <TableCell className="text-center">{course.instructor || "-"}</TableCell>
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
        </CardContent>
      </Card>

      {/* Dialog de Criar Curso */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Novo Curso</DialogTitle>
            <DialogDescription>
              Preencha as informações do curso
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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
            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="instructor">Instrutor</Label>
                <Input
                  id="instructor"
                  name="instructor"
                  value={newCourse.instructor}
                  onChange={handleInputChange}
                  placeholder="Nome do instrutor"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Preço (R$)</Label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                value={newCourse.price}
                onChange={handleInputChange}
                placeholder="0.00"
              />
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
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateCourse} className="bg-red-500 hover:bg-red-600">
              Criar Curso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Editar Curso */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Curso</DialogTitle>
            <DialogDescription>
              Atualize as informações do curso
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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
            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="edit-instructor">Instrutor</Label>
                <Input
                  id="edit-instructor"
                  name="instructor"
                  value={newCourse.instructor}
                  onChange={handleInputChange}
                  placeholder="Nome do instrutor"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-price">Preço (R$)</Label>
              <Input
                id="edit-price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                value={newCourse.price}
                onChange={handleInputChange}
                placeholder="0.00"
              />
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
