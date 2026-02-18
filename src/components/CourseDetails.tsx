import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, BookOpen, Calendar, Users, DollarSign, Package, Search, Filter, Info } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCourseDetails } from "@/hooks/useCourseDetails";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const TABLE_MIN_HEIGHT = "min-h-[420px]";
const TABLE_CONTAINER_HEIGHT = "max-h-[420px]";

export const CourseDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    course,
    lessons,
    professors,
    professorsByLesson,
    materials,
    totalMaterialsCount,
    materialsByLesson,
    eventos,
    eventosCount,
    totalCost,
    loading,
  } = useCourseDetails(id);

  const [showDetails, setShowDetails] = useState(false);
  const [searchAulas, setSearchAulas] = useState("");
  const [filterAulasLocal, setFilterAulasLocal] = useState<string>("all");
  const [filterAulasTema, setFilterAulasTema] = useState<string>("all");
  const [filterAulasProfessor, setFilterAulasProfessor] = useState<string>("all");

  const [searchProfessores, setSearchProfessores] = useState("");
  const [filterProfessoresValor, setFilterProfessoresValor] = useState<string>("all");

  const [searchMateriais, setSearchMateriais] = useState("");
  const [filterMateriaisTipo, setFilterMateriaisTipo] = useState<string>("all");
  const [filterMateriaisTema, setFilterMateriaisTema] = useState<string>("all");

  const [searchEventos, setSearchEventos] = useState("");
  const [filterEventosLocal, setFilterEventosLocal] = useState<string>("all");
  const [filterEventosMaterial, setFilterEventosMaterial] = useState<string>("all");

  const filteredLessons = useMemo(() => {
    return lessons.filter((l) => {
      const searchLower = searchAulas.toLowerCase();
      const matchSearch = !searchLower || [
        l.lessonDate,
        l.lessonStartTime,
        l.locationName,
        l.lessonTheme,
        l.numberOfStudents,
        l.professorName,
      ].some((v) => (v || "").toString().toLowerCase().includes(searchLower));
      const matchLocal = filterAulasLocal === "all" || l.locationName === filterAulasLocal;
      const matchTema = filterAulasTema === "all" || l.lessonTheme === filterAulasTema;
      const matchProfessor = filterAulasProfessor === "all" || l.professorName === filterAulasProfessor;
      return matchSearch && matchLocal && matchTema && matchProfessor;
    });
  }, [lessons, searchAulas, filterAulasLocal, filterAulasTema, filterAulasProfessor]);

  const filteredProfessors = useMemo(() => {
    return professors.filter((p) => {
      const matchSearch = !searchProfessores || p.professorName.toLowerCase().includes(searchProfessores.toLowerCase());
      const matchValor = filterProfessoresValor === "all" || (filterProfessoresValor === "com" ? p.totalValue > 0 : p.totalValue === 0);
      return matchSearch && matchValor;
    });
  }, [professors, searchProfessores, filterProfessoresValor]);

  const filteredProfessorsByLesson = useMemo(() => {
    return professorsByLesson.filter((row) => {
      const matchSearch = !searchProfessores || row.professorName.toLowerCase().includes(searchProfessores.toLowerCase());
      const matchValor = filterProfessoresValor === "all" || (filterProfessoresValor === "com" ? row.professorPaymentValue > 0 : row.professorPaymentValue === 0);
      return matchSearch && matchValor;
    });
  }, [professorsByLesson, searchProfessores, filterProfessoresValor]);

  const filteredMateriais = useMemo(() => {
    return materialsByLesson.filter((row) => {
      const matchSearch = !searchMateriais || [
        row.material,
        row.aulaData,
        row.aulaHorario,
        row.aulaTema,
      ].some((v) => (v || "").toString().toLowerCase().includes(searchMateriais.toLowerCase()));
      const matchTipo = filterMateriaisTipo === "all" || row.material === filterMateriaisTipo;
      const matchTema = filterMateriaisTema === "all" || row.aulaTema === filterMateriaisTema;
      return matchSearch && matchTipo && matchTema;
    });
  }, [materialsByLesson, searchMateriais, filterMateriaisTipo, filterMateriaisTema]);

  const filteredEventos = useMemo(() => {
    return eventos.filter((e) => {
      const searchLower = searchEventos.toLowerCase();
      const matchSearch = !searchLower || [
        e.title,
        e.description,
        e.location,
        e.material,
        e.time,
        e.createdByName,
      ].some((v) => (v || "").toString().toLowerCase().includes(searchLower));
      const matchLocal = filterEventosLocal === "all" || e.location === filterEventosLocal;
      const matchMaterial = filterEventosMaterial === "all" || e.material === filterEventosMaterial;
      return matchSearch && matchLocal && matchMaterial;
    });
  }, [eventos, searchEventos, filterEventosLocal, filterEventosMaterial]);

  const aulasLocais = useMemo(() => [...new Set(lessons.map((l) => l.locationName).filter(Boolean))].sort(), [lessons]);
  const aulasTemas = useMemo(() => [...new Set(lessons.map((l) => l.lessonTheme).filter(Boolean))].sort(), [lessons]);
  const aulasProfessores = useMemo(() => [...new Set(lessons.map((l) => l.professorName).filter(Boolean))].sort(), [lessons]);
  const materiaisTemas = useMemo(() => [...new Set(materialsByLesson.map((r) => r.aulaTema).filter(Boolean))].sort(), [materialsByLesson]);
  const eventosLocais = useMemo(() => [...new Set(eventos.map((e) => e.location).filter(Boolean))].sort(), [eventos]);
  const eventosMateriais = useMemo(() => [...new Set(eventos.map((e) => e.material).filter(Boolean))].sort(), [eventos]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/courses", { state: { activeTab: "courses" } })}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Curso não encontrado.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/courses")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar aos Cursos
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-2xl">{course.title}</CardTitle>
              {course.description && (
                <CardDescription>{course.description}</CardDescription>
              )}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowDetails(!showDetails)}
            >
              <Info className="h-4 w-4 mr-2" />
              {showDetails ? "Ocultar Detalhes" : "Ver Detalhes Completos"}
            </Button>
          </div>
        </CardHeader>
        {showDetails && (
          <CardContent>
            <Accordion type="single" collapsible defaultValue="course-info" className="w-full">
              <AccordionItem value="course-info">
                <AccordionTrigger>Informações do Curso</AccordionTrigger>
                <AccordionContent>
                  <div className="mt-4 space-y-4 pt-4 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Título */}
                      <div>
                        <Label className="text-sm font-semibold text-muted-foreground">Título do Curso</Label>
                        <p className="mt-1">{course.title || "—"}</p>
                      </div>

                      {/* Descrição */}
                      <div>
                        <Label className="text-sm font-semibold text-muted-foreground">Descrição</Label>
                        <p className="mt-1">{course.description || "—"}</p>
                      </div>

                      {/* Tipo de Curso */}
                      {course.courseType && course.courseType.length > 0 && (
                        <div>
                          <Label className="text-sm font-semibold text-muted-foreground">Tipo de Curso</Label>
                          <p className="mt-1">
                            {course.courseType.join(", ")}
                            {course.courseType.includes('OUTRO') && course.courseTypeOther && (
                              <span className="text-muted-foreground"> ({course.courseTypeOther})</span>
                            )}
                          </p>
                        </div>
                      )}

                      {/* Nome da Instituição */}
                      {course.institutionName && (
                        <div>
                          <Label className="text-sm font-semibold text-muted-foreground">Nome da Instituição</Label>
                          <p className="mt-1">{course.institutionName}</p>
                        </div>
                      )}

                      {/* Nome do Coordenador */}
                      {course.coordinatorName && (
                        <div>
                          <Label className="text-sm font-semibold text-muted-foreground">Nome do Coordenador</Label>
                          <p className="mt-1">{course.coordinatorName}</p>
                        </div>
                      )}

                      {/* Contato do Coordenador */}
                      {course.coordinatorContact && (
                        <div>
                          <Label className="text-sm font-semibold text-muted-foreground">Contato do Coordenador</Label>
                          <p className="mt-1">{course.coordinatorContact}</p>
                        </div>
                      )}

                      {/* Consultor Responsável */}
                      {course.consultantName && (
                        <div>
                          <Label className="text-sm font-semibold text-muted-foreground">Consultor Responsável</Label>
                          <p className="mt-1">{course.consultantName}</p>
                        </div>
                      )}

                      {/* Quantidade de Turmas */}
                      {course.numberOfClasses !== undefined && (
                        <div>
                          <Label className="text-sm font-semibold text-muted-foreground">Quantidade de Turmas</Label>
                          <p className="mt-1">{course.numberOfClasses}</p>
                        </div>
                      )}

                      {/* Professor Assistente */}
                      {course.assistantProfessor && (
                        <div>
                          <Label className="text-sm font-semibold text-muted-foreground">Professor Assistente</Label>
                          <p className="mt-1">{course.assistantProfessor}</p>
                        </div>
                      )}

                      {/* Duração */}
                      {course.duration && (
                        <div>
                          <Label className="text-sm font-semibold text-muted-foreground">Duração</Label>
                          <p className="mt-1">{course.duration}</p>
                        </div>
                      )}

                      {/* Preço */}
                      {course.price !== undefined && course.price > 0 && (
                        <div>
                          <Label className="text-sm font-semibold text-muted-foreground">Preço</Label>
                          <p className="mt-1">
                            R$ {course.price.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      )}

                      {/* Status */}
                      {course.status && (
                        <div>
                          <Label className="text-sm font-semibold text-muted-foreground">Status</Label>
                          <p className="mt-1 capitalize">{course.status}</p>
                        </div>
                      )}
                    </div>

                    {/* Observação */}
                    {course.observation && (
                      <div>
                        <Label className="text-sm font-semibold text-muted-foreground">Observação</Label>
                        <p className="mt-1 whitespace-pre-wrap">{course.observation}</p>
                      </div>
                    )}

                    {/* Turmas */}
                    {course.classes && course.classes.length > 0 && (
                      <div>
                        <Label className="text-sm font-semibold text-muted-foreground mb-2 block">Turmas</Label>
                        <div className="space-y-3">
                          {course.classes.map((classItem, index) => (
                            <div key={index} className="border rounded-lg p-4 space-y-2">
                              <h4 className="font-semibold">Turma {index + 1}</h4>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Alunos: </span>
                                  <span>{classItem.numberOfStudents}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Turno: </span>
                                  <span className="capitalize">{classItem.shift}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Início: </span>
                                  <span>
                                    {classItem.startDate?.toDate 
                                      ? format(classItem.startDate.toDate(), "dd/MM/yyyy", { locale: ptBR })
                                      : classItem.startDate instanceof Date
                                      ? format(classItem.startDate, "dd/MM/yyyy", { locale: ptBR })
                                      : "—"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Término: </span>
                                  <span>
                                    {classItem.endDate?.toDate 
                                      ? format(classItem.endDate.toDate(), "dd/MM/yyyy", { locale: ptBR })
                                      : classItem.endDate instanceof Date
                                      ? format(classItem.endDate, "dd/MM/yyyy", { locale: ptBR })
                                      : "—"}
                                  </span>
                                </div>
                                <div className="col-span-2">
                                  <span className="text-muted-foreground">Uso Titaniumfix: </span>
                                  <span>
                                    {classItem.usesTitaniumfix}
                                    {classItem.usesTitaniumfix === 'Outro' && classItem.usesTitaniumfixOther && (
                                      <span className="text-muted-foreground"> ({classItem.usesTitaniumfixOther})</span>
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aulas</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lessons.length}</div>
            <p className="text-xs text-muted-foreground">aulas vinculadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Material enviado</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMaterialsCount}</div>
            <p className="text-xs text-muted-foreground">
              maxilas: {materials.totalMaxillas} · implantes: {materials.totalImplants} · kits: {materials.totalSurgicalKits}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eventos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{eventosCount}</div>
            <p className="text-xs text-muted-foreground">eventos relacionados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Professores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{professors.length}</div>
            <p className="text-xs text-muted-foreground">professores que lecionaram</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custo total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {totalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">valor professores</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="aulas" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="aulas">
            <BookOpen className="h-4 w-4 mr-2" />
            Aulas ({lessons.length})
          </TabsTrigger>
          <TabsTrigger value="eventos">
            <Calendar className="h-4 w-4 mr-2" />
            Eventos ({eventosCount})
          </TabsTrigger>
          <TabsTrigger value="professores">
            <Users className="h-4 w-4 mr-2" />
            Professores ({professors.length})
          </TabsTrigger>
          <TabsTrigger value="materiais">
            <Package className="h-4 w-4 mr-2" />
            Materiais ({totalMaterialsCount})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="aulas" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Aulas</CardTitle>
                  <CardDescription>Lista de aulas vinculadas a este curso</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-48 sm:w-56">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar..."
                      value={searchAulas}
                      onChange={(e) => setSearchAulas(e.target.value)}
                      className="pl-8 h-9"
                    />
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
                        <Filter className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-64">
                      <div className="space-y-3">
                        <Label>Local</Label>
                        <Select value={filterAulasLocal} onValueChange={setFilterAulasLocal}>
                          <SelectTrigger>
                            <SelectValue placeholder="Todos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            {aulasLocais.map((loc) => (
                              <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Label>Tema</Label>
                        <Select value={filterAulasTema} onValueChange={setFilterAulasTema}>
                          <SelectTrigger>
                            <SelectValue placeholder="Todos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            {aulasTemas.map((t) => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Label>Professor</Label>
                        <Select value={filterAulasProfessor} onValueChange={setFilterAulasProfessor}>
                          <SelectTrigger>
                            <SelectValue placeholder="Todos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            {aulasProfessores.map((prof) => (
                              <SelectItem key={prof} value={prof}>{prof}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className={`rounded-md border overflow-hidden ${TABLE_MIN_HEIGHT}`}>
                {lessons.length === 0 ? (
                  <div className="flex items-center justify-center py-16 text-muted-foreground">
                    Nenhuma aula vinculada a este curso.
                  </div>
                ) : filteredLessons.length === 0 ? (
                  <div className="flex items-center justify-center py-16 text-muted-foreground">
                    Nenhum resultado encontrado com os filtros aplicados.
                  </div>
                ) : (
                  <div className={`overflow-y-auto ${TABLE_CONTAINER_HEIGHT}`}>
                    <Table>
                      <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80">
                        <TableRow>
                          <TableHead className="text-center">Data</TableHead>
                          <TableHead className="text-center">Horário</TableHead>
                          <TableHead className="text-center">Local</TableHead>
                          <TableHead className="text-center">Tema</TableHead>
                          <TableHead className="text-center">Alunos</TableHead>
                          <TableHead className="text-center">Professor</TableHead>
                          <TableHead className="text-center">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLessons.map((l) => (
                          <TableRow key={l.id}>
                            <TableCell className="text-center">
                              {l.lessonDate
                                ? format(new Date(l.lessonDate + "T12:00:00"), "dd/MM/yyyy", {
                                    locale: ptBR,
                                  })
                                : "—"}
                            </TableCell>
                            <TableCell className="text-center">{l.lessonStartTime || "—"}</TableCell>
                            <TableCell className="text-center">{l.locationName || "—"}</TableCell>
                            <TableCell className="text-center">{l.lessonTheme || "—"}</TableCell>
                            <TableCell className="text-center">{l.numberOfStudents || "—"}</TableCell>
                            <TableCell className="text-center">{l.professorName || "—"}</TableCell>
                            <TableCell className="text-center">
                              {l.professorPaymentValue != null
                                ? `R$ ${l.professorPaymentValue.toLocaleString("pt-BR", {
                                    minimumFractionDigits: 2,
                                  })}`
                                : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="eventos" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Eventos</CardTitle>
                  <CardDescription>
                    Eventos vinculados a este curso
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-48 sm:w-56">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar..."
                      value={searchEventos}
                      onChange={(e) => setSearchEventos(e.target.value)}
                      className="pl-8 h-9"
                    />
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
                        <Filter className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-64">
                      <div className="space-y-3">
                        <Label>Local</Label>
                        <Select value={filterEventosLocal} onValueChange={setFilterEventosLocal}>
                          <SelectTrigger>
                            <SelectValue placeholder="Todos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            {eventosLocais.map((loc) => (
                              <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Label>Material</Label>
                        <Select value={filterEventosMaterial} onValueChange={setFilterEventosMaterial}>
                          <SelectTrigger>
                            <SelectValue placeholder="Todos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            {eventosMateriais.map((mat) => (
                              <SelectItem key={mat} value={mat}>{mat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className={`rounded-md border overflow-hidden ${TABLE_MIN_HEIGHT}`}>
                {eventos.length === 0 ? (
                  <div className="flex items-center justify-center py-16 text-muted-foreground">
                    Nenhum evento vinculado a este curso.
                  </div>
                ) : filteredEventos.length === 0 ? (
                  <div className="flex items-center justify-center py-16 text-muted-foreground">
                    Nenhum resultado encontrado com os filtros aplicados.
                  </div>
                ) : (
                  <div className={`overflow-y-auto ${TABLE_CONTAINER_HEIGHT}`}>
                    <Table>
                      <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80">
                        <TableRow>
                          <TableHead className="text-center">Título</TableHead>
                          <TableHead className="text-center">Data</TableHead>
                          <TableHead className="text-center">Horário</TableHead>
                          <TableHead className="text-center">Local</TableHead>
                          <TableHead className="text-center">Material</TableHead>
                          <TableHead className="text-center max-w-[200px]">Descrição</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEventos.map((e) => (
                          <TableRow key={e.id}>
                            <TableCell className="text-center font-medium">{e.title}</TableCell>
                            <TableCell className="text-center">
                              {e.date
                                ? format(e.date, "dd/MM/yyyy", { locale: ptBR })
                                : "—"}
                            </TableCell>
                            <TableCell className="text-center">{e.time || "—"}</TableCell>
                            <TableCell className="text-center">{e.location || "—"}</TableCell>
                            <TableCell className="text-center max-w-[120px] truncate">{e.material || "—"}</TableCell>
                            <TableCell className="text-center max-w-[200px] truncate" title={e.description}>{e.description || "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="professores" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Professores</CardTitle>
                  <CardDescription>
                    Professores que lecionaram para este curso, com datas e valores
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-48 sm:w-56">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar professor..."
                      value={searchProfessores}
                      onChange={(e) => setSearchProfessores(e.target.value)}
                      className="pl-8 h-9"
                    />
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
                        <Filter className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-64">
                      <div className="space-y-3">
                        <Label>Valor</Label>
                        <Select value={filterProfessoresValor} onValueChange={setFilterProfessoresValor}>
                          <SelectTrigger>
                            <SelectValue placeholder="Todos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="com">Com valor</SelectItem>
                            <SelectItem value="sem">Sem valor</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className={`rounded-md border overflow-hidden ${TABLE_MIN_HEIGHT}`}>
                {professorsByLesson.length === 0 ? (
                  <div className="flex items-center justify-center py-16 text-muted-foreground">
                    Nenhum professor identificado nas aulas.
                  </div>
                ) : filteredProfessorsByLesson.length === 0 ? (
                  <div className="flex items-center justify-center py-16 text-muted-foreground">
                    Nenhum resultado encontrado com os filtros aplicados.
                  </div>
                ) : (
                  <div className={`overflow-y-auto ${TABLE_CONTAINER_HEIGHT}`}>
                    <Table>
                      <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80">
                        <TableRow>
                          <TableHead className="text-center">Professor</TableHead>
                          <TableHead className="text-center">Data/Hora</TableHead>
                          <TableHead className="text-center">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProfessorsByLesson.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="text-center font-medium">{row.professorName}</TableCell>
                            <TableCell className="text-center">
                              <span className="text-sm">
                                {row.lessonDate
                                  ? format(new Date(row.lessonDate + "T12:00:00"), "dd/MM/yyyy", {
                                      locale: ptBR,
                                    })
                                  : "—"}{" "}
                                {row.lessonTime || ""}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              R${" "}
                              {row.professorPaymentValue.toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                              })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="materiais" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Materiais</CardTitle>
                  <CardDescription>
                    Materiais utilizados no curso — quantidade e aula de destino
                  </CardDescription>
                  <div className="pt-2 flex gap-4 text-sm">
                    <span className="text-muted-foreground">
                      Total: {totalMaterialsCount} itens (Maxilas: {materials.totalMaxillas} · Implantes: {materials.totalImplants} · Kits: {materials.totalSurgicalKits})
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-48 sm:w-56">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar..."
                      value={searchMateriais}
                      onChange={(e) => setSearchMateriais(e.target.value)}
                      className="pl-8 h-9"
                    />
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
                        <Filter className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-64">
                      <div className="space-y-3">
                        <Label>Tipo de material</Label>
                        <Select value={filterMateriaisTipo} onValueChange={setFilterMateriaisTipo}>
                          <SelectTrigger>
                            <SelectValue placeholder="Todos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="Maxilas">Maxilas</SelectItem>
                            <SelectItem value="Modelo (mandíbula)">Modelo (mandíbula)</SelectItem>
                            <SelectItem value="Crânios">Crânios</SelectItem>
                            <SelectItem value="Implantes">Implantes</SelectItem>
                            <SelectItem value="Kits Cirúrgicos">Kits Cirúrgicos</SelectItem>
                          </SelectContent>
                        </Select>
                        <Label>Tema da aula</Label>
                        <Select value={filterMateriaisTema} onValueChange={setFilterMateriaisTema}>
                          <SelectTrigger>
                            <SelectValue placeholder="Todos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            {materiaisTemas.map((t) => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className={`rounded-md border overflow-hidden ${TABLE_MIN_HEIGHT}`}>
                {materialsByLesson.length === 0 ? (
                  <div className="flex items-center justify-center py-16 text-muted-foreground">
                    Nenhum material registrado nas aulas deste curso.
                  </div>
                ) : filteredMateriais.length === 0 ? (
                  <div className="flex items-center justify-center py-16 text-muted-foreground">
                    Nenhum resultado encontrado com os filtros aplicados.
                  </div>
                ) : (
                  <div className={`overflow-y-auto ${TABLE_CONTAINER_HEIGHT}`}>
                    <Table>
                      <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80">
                        <TableRow>
                          <TableHead className="text-center">Material</TableHead>
                          <TableHead className="text-center">Quantidade</TableHead>
                          <TableHead className="text-center">Data da Aula</TableHead>
                          <TableHead className="text-center">Horário</TableHead>
                          <TableHead className="text-center">Tema da Aula</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredMateriais.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="text-center font-medium">{row.material}</TableCell>
                            <TableCell className="text-center">{row.quantidade}</TableCell>
                            <TableCell className="text-center">{row.aulaData}</TableCell>
                            <TableCell className="text-center">{row.aulaHorario}</TableCell>
                            <TableCell className="text-center">{row.aulaTema}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
