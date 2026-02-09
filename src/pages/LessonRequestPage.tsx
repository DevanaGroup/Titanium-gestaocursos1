import { useState, useEffect } from "react";
import { FUNCTIONS_BASE_URL } from "@/config/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, CheckCircle, Phone } from "lucide-react";

interface CourseOption {
  id: string;
  title: string;
}

// Mesma estrutura do LessonManagement: países com flag
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

// Mesmos temas e opções de implante do LessonManagement
const lessonThemes = [
  "Fase Cirúrgica",
  "Fluxo Protético",
  "Cirurgia Guiada",
  "Digital-Fix: Solução Protética do Analógico ao Digital",
  "Zigomático",
];
const implantModelOptionsFaseCirurgica = [
  "e-fix (Groove e Silver)",
  "e-fix (Profile)",
  "i-fix",
  "b-fix (cilindrico)",
  "b-fix (Profile)",
];
const implantModelOptionsCirurgiaGuiada = ["b-fix (Profile)"];
const implantModelOptionsZigomatico = ["Profile", "Flat"];

export default function LessonRequestPage() {
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
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
    implantModels: [] as string[],
    courseId: "",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${FUNCTIONS_BASE_URL}/getPublicCourses`);
        if (!res.ok) throw new Error("Falha ao carregar cursos");
        const data = await res.json();
        if (!cancelled) setCourses(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) toast.error("Não foi possível carregar a lista de cursos.");
      } finally {
        if (!cancelled) setLoadingCourses(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!form.email?.trim()) { toast.error("E-mail é obrigatório"); return; }
    if (!form.requesterName?.trim()) { toast.error("Seu nome é obrigatório"); return; }
    if (!form.consultantName?.trim()) { toast.error("Qual seu consultor TitaniumFix? é obrigatório"); return; }
    if (!form.courseResponsibleName?.trim()) { toast.error("Nome do responsável pelo curso é obrigatório"); return; }
    if (!form.courseResponsiblePhone?.trim()) { toast.error("Telefone do responsável pelo curso é obrigatório"); return; }
    if (!form.courseResponsibleEmail?.trim()) { toast.error("E-mail do responsável pelo curso é obrigatório"); return; }
    if (!form.lessonDate) { toast.error("Data da Aula é obrigatória"); return; }
    if (!form.lessonStartTime) { toast.error("Horário de início da aula é obrigatório"); return; }
    if (!form.locationName?.trim()) { toast.error("Nome do local é obrigatório"); return; }
    if (!form.locationAddress?.trim()) { toast.error("Endereço do local é obrigatório"); return; }
    if (!form.needsProfessor) { toast.error("Informe se será necessário solicitar professor"); return; }
    if ((form.needsProfessor === "Não" || form.needsProfessor === "Outro") && !form.professorName?.trim()) {
      toast.error("Professor que irá ministrar a aula é obrigatório quando não for solicitar professor");
      return;
    }
    if (!form.numberOfStudents?.trim()) { toast.error("Quantos alunos? é obrigatório"); return; }
    if (!form.lessonDuration) { toast.error("Qual o tempo de aula? é obrigatório"); return; }
    if (!form.needsFolder) { toast.error("Informe se será necessário folder de divulgação"); return; }
    if (!form.hasHandsOn) { toast.error("Informe se a aula contém hands-on (workshop)"); return; }
    if (form.hasHandsOn === "Sim" && !form.lessonTheme) {
      toast.error("Qual o tema da Aula? é obrigatório quando houver hands-on");
      return;
    }
    if (!form.courseId) { toast.error("Curso é obrigatório"); return; }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        professorId: "",
        professorPaymentValue: undefined,
      };
      const res = await fetch(`${FUNCTIONS_BASE_URL}/createLessonRequest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Erro ao enviar solicitação");
        setSubmitting(false);
        return;
      }
      setSuccess(true);
      setSubmitting(false);
      toast.success("Solicitação enviada com sucesso!");
    } catch (err) {
      toast.error("Erro de conexão. Tente novamente.");
      setSubmitting(false);
    }
  };

  const toggleImplant = (value: string) => {
    setForm((prev) => ({
      ...prev,
      implantModels: prev.implantModels.includes(value)
        ? prev.implantModels.filter((m) => m !== value)
        : [...prev.implantModels, value],
    }));
  };

  const getImplantOptionsForTheme = () => {
    if (form.lessonTheme === "Fase Cirúrgica") return implantModelOptionsFaseCirurgica;
    if (form.lessonTheme === "Cirurgia Guiada") return implantModelOptionsCirurgiaGuiada;
    if (form.lessonTheme === "Zigomático") return implantModelOptionsZigomatico;
    return [];
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex flex-col items-center justify-center p-4">
        <div className="flex justify-center mb-6">
          <img src="/logo.png" alt="Titaniumfix" className="h-16 w-auto" />
        </div>
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="h-8 w-8" />
              <CardTitle>Solicitação enviada</CardTitle>
            </div>
            <CardDescription>
              Sua solicitação de aula foi registrada. A equipe entrará em contato em breve.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => setSuccess(false)}>
              Enviar outra solicitação
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Estrutura igual ao Dialog "Solicitação de Aulas" do LessonManagement
  // Scroll APENAS no CardContent (form). Container fixo na viewport para pais nunca rolarem.
  return (
    <div className="fixed inset-0 overflow-hidden flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="flex-shrink-0 flex justify-center mb-4">
        <img src="/logo.png" alt="Titaniumfix" className="h-16 w-auto" />
      </div>
      <Card className="w-full max-w-3xl mx-auto flex-1 min-h-0 flex flex-col overflow-hidden">
        <CardHeader className="flex-shrink-0 text-center sm:text-left">
          <CardTitle className="text-lg font-semibold leading-none tracking-tight">
            Solicitação de Aulas
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Preencha todas as informações obrigatórias para solicitar uma nova aula
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* E-mail */}
            <div className="space-y-2">
              <Label htmlFor="email">E-mail <span className="text-red-500">*</span></Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Seu e-mail"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                required
              />
            </div>

            {/* Seu nome */}
            <div className="space-y-2">
              <Label htmlFor="requesterName">Seu nome <span className="text-red-500">*</span></Label>
              <Input
                id="requesterName"
                name="requesterName"
                placeholder="Seu nome"
                value={form.requesterName}
                onChange={(e) => setForm((p) => ({ ...p, requesterName: e.target.value }))}
                required
              />
            </div>

            {/* Qual seu consultor TitaniumFix? */}
            <div className="space-y-2">
              <Label htmlFor="consultantName">Qual seu consultor TitaniumFix? <span className="text-red-500">*</span></Label>
              <Input
                id="consultantName"
                name="consultantName"
                placeholder="Nome do consultor"
                value={form.consultantName}
                onChange={(e) => setForm((p) => ({ ...p, consultantName: e.target.value }))}
                required
              />
            </div>

            {/* Nome do responsável pelo curso */}
            <div className="space-y-2">
              <Label htmlFor="courseResponsibleName">Nome do responsável pelo curso <span className="text-red-500">*</span></Label>
              <Input
                id="courseResponsibleName"
                name="courseResponsibleName"
                placeholder="Nome do responsável"
                value={form.courseResponsibleName}
                onChange={(e) => setForm((p) => ({ ...p, courseResponsibleName: e.target.value }))}
                required
              />
            </div>

            {/* Telefone do responsável pelo curso */}
            <div className="space-y-2">
              <Label htmlFor="courseResponsiblePhone">Telefone do responsável pelo curso <span className="text-red-500">*</span></Label>
              <div className="flex gap-2 w-full">
                <Select
                  value={form.courseResponsiblePhoneCountryCode || "BR"}
                  onValueChange={(v) => setForm((p) => ({ ...p, courseResponsiblePhoneCountryCode: v }))}
                >
                  <SelectTrigger className="w-[110px]">
                    <SelectValue>
                      {countryOptions.find((c) => c.code === (form.courseResponsiblePhoneCountryCode || "BR"))?.flag}{" "}
                      {countryOptions.find((c) => c.code === (form.courseResponsiblePhoneCountryCode || "BR"))?.dialCode}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {countryOptions.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.flag} {c.name} {c.dialCode}
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
                    placeholder="(11) 99999-9999"
                    value={form.courseResponsiblePhone}
                    onChange={(e) => setForm((p) => ({ ...p, courseResponsiblePhone: e.target.value }))}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>

            {/* E-mail do responsável pelo curso */}
            <div className="space-y-2">
              <Label htmlFor="courseResponsibleEmail">E-mail do responsável pelo curso <span className="text-red-500">*</span></Label>
              <Input
                id="courseResponsibleEmail"
                name="courseResponsibleEmail"
                type="email"
                placeholder="email@exemplo.com"
                value={form.courseResponsibleEmail}
                onChange={(e) => setForm((p) => ({ ...p, courseResponsibleEmail: e.target.value }))}
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
                value={form.lessonDate}
                onChange={(e) => setForm((p) => ({ ...p, lessonDate: e.target.value }))}
                required
              />
            </div>

            {/* Horário de início da aula */}
            <div className="space-y-2">
              <Label>Horário de início da aula <span className="text-red-500">*</span></Label>
              <Input
                id="lessonStartTime"
                name="lessonStartTime"
                type="time"
                value={form.lessonStartTime}
                onChange={(e) => setForm((p) => ({ ...p, lessonStartTime: e.target.value }))}
                required
              />
            </div>

            {/* Nome do local - Textarea como no interno */}
            <div className="space-y-2">
              <Label htmlFor="locationName">Nome do local <span className="text-red-500">*</span></Label>
              <Textarea
                id="locationName"
                name="locationName"
                placeholder="Nome do local"
                rows={2}
                value={form.locationName}
                onChange={(e) => setForm((p) => ({ ...p, locationName: e.target.value }))}
                required
              />
            </div>

            {/* Endereço do local (Rua, nº, bairro e cidade) - Textarea como no interno */}
            <div className="space-y-2">
              <Label htmlFor="locationAddress">Endereço do local (Rua, nº, bairro e cidade) <span className="text-red-500">*</span></Label>
              <Textarea
                id="locationAddress"
                name="locationAddress"
                placeholder="Rua, número, bairro e cidade"
                rows={3}
                value={form.locationAddress}
                onChange={(e) => setForm((p) => ({ ...p, locationAddress: e.target.value }))}
                required
              />
            </div>

            {/* Será necessário solicitar professor...? - RadioGroup como no interno */}
            <div className="space-y-2">
              <Label>
                Será necessário solicitar professor para essa aula? Responder sim ou não. Se não, indicar o professor que irá ministrar a aula. <span className="text-red-500">*</span>
              </Label>
              <RadioGroup
                value={form.needsProfessor}
                onValueChange={(v) => setForm((p) => ({ ...p, needsProfessor: v }))}
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
                  {form.needsProfessor === "Sim"
                    ? "Vincular a um professor disponível (opcional)"
                    : "Professor que irá ministrar a aula"}
                  {(form.needsProfessor === "Não" || form.needsProfessor === "Outro") && <span className="text-red-500"> *</span>}
                </Label>
                {(form.needsProfessor === "Não" || form.needsProfessor === "Outro") ? (
                  <Input
                    placeholder="Nome do professor"
                    value={form.professorName}
                    onChange={(e) => setForm((p) => ({ ...p, professorName: e.target.value }))}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">Na solicitação externa o professor será definido internamente.</p>
                )}
              </div>
            </div>

            {/* Quantos alunos? */}
            <div className="space-y-2">
              <Label htmlFor="numberOfStudents">Quantos alunos? <span className="text-red-500">*</span></Label>
              <Input
                id="numberOfStudents"
                name="numberOfStudents"
                placeholder="Número de alunos"
                value={form.numberOfStudents}
                onChange={(e) => setForm((p) => ({ ...p, numberOfStudents: e.target.value }))}
                required
              />
            </div>

            {/* Qual o tempo de aula? - RadioGroup como no interno */}
            <div className="space-y-2">
              <Label>Qual o tempo de aula? <span className="text-red-500">*</span></Label>
              <RadioGroup
                value={form.lessonDuration}
                onValueChange={(v) => setForm((p) => ({ ...p, lessonDuration: v }))}
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
              {form.lessonDuration === "Outro" && (
                <Input
                  name="customDuration"
                  placeholder="Especifique o tempo"
                  value={form.customDuration}
                  onChange={(e) => setForm((p) => ({ ...p, customDuration: e.target.value }))}
                  className="mt-2"
                />
              )}
            </div>

            {/* Será necessário folder de divulgação do curso? - RadioGroup */}
            <div className="space-y-2">
              <Label>Será necessário folder de divulgação do curso?</Label>
              <RadioGroup
                value={form.needsFolder}
                onValueChange={(v) => setForm((p) => ({ ...p, needsFolder: v }))}
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

            {/* A aula contém hands-on (workshop)? - RadioGroup */}
            <div className="space-y-2">
              <Label>A aula contém hands-on (workshop)? <span className="text-red-500">*</span></Label>
              <RadioGroup
                value={form.hasHandsOn}
                onValueChange={(v) => setForm((p) => ({ ...p, hasHandsOn: v, lessonTheme: "", implantModels: [] }))}
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

            {/* Com hands-on (Workshop) - mesma seção do interno */}
            {form.hasHandsOn === "Sim" && (
              <div className="space-y-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                <div className="font-semibold text-lg mb-4">Com hands-on (Workshop)</div>
                <div className="space-y-2">
                  <Label>Qual o tema da Aula? <span className="text-red-500">*</span></Label>
                  <RadioGroup
                    value={form.lessonTheme}
                    onValueChange={(v) => setForm((p) => ({ ...p, lessonTheme: v, implantModels: [] }))}
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
                {form.lessonTheme === "Fase Cirúrgica" && (
                  <div className="space-y-2">
                    <Label>Favor selecionar quais modelos de implante serão utilizados no curso: <span className="text-red-500">*</span></Label>
                    <div className="space-y-2">
                      {implantModelOptionsFaseCirurgica.map((model) => (
                        <div key={model} className="flex items-center space-x-2">
                          <Checkbox
                            id={`implant-${model.replace(/\s+/g, "-")}`}
                            checked={form.implantModels.includes(model)}
                            onCheckedChange={() => toggleImplant(model)}
                          />
                          <Label htmlFor={`implant-${model.replace(/\s+/g, "-")}`} className="cursor-pointer">{model}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {form.lessonTheme === "Fluxo Protético" && (
                  <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border">
                    <p className="text-sm">Será enviado um macro modelo do nosso sistema.</p>
                  </div>
                )}
                {form.lessonTheme === "Cirurgia Guiada" && (
                  <div className="space-y-2">
                    <Label className="font-semibold">Favor selecionar quais modelos de implante serão utilizados no curso:</Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="implant-cirurgia-bfix-profile"
                        checked={form.implantModels.includes("b-fix (Profile)")}
                        onCheckedChange={() => toggleImplant("b-fix (Profile)")}
                      />
                      <Label htmlFor="implant-cirurgia-bfix-profile" className="cursor-pointer">b-fix (Profile)</Label>
                    </div>
                  </div>
                )}
                {form.lessonTheme === "Zigomático" && (
                  <div className="space-y-2">
                    <Label>Favor selecionar quais modelos de implante serão utilizados no curso: <span className="text-red-500">*</span></Label>
                    <div className="space-y-2">
                      {implantModelOptionsZigomatico.map((model) => (
                        <div key={model} className="flex items-center space-x-2">
                          <Checkbox
                            id={`implant-zig-${model}`}
                            checked={form.implantModels.includes(model)}
                            onCheckedChange={() => toggleImplant(model)}
                          />
                          <Label htmlFor={`implant-zig-${model}`} className="cursor-pointer">{model}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Curso - no final como no interno */}
            <div className="space-y-2">
              <Label htmlFor="courseId">Curso <span className="text-red-500">*</span></Label>
              <Select
                value={form.courseId}
                onValueChange={(v) => setForm((p) => ({ ...p, courseId: v }))}
                disabled={loadingCourses}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingCourses ? "Carregando..." : "Selecione um curso"} />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.title || c.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Footer - mesmo estilo do DialogFooter */}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4">
              <Button type="submit" disabled={submitting || loadingCourses} className="bg-red-500 hover:bg-red-600">
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Criar Solicitação"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
