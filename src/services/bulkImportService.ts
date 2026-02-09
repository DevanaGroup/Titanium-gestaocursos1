import { db, auth, FUNCTIONS_BASE_URL } from "@/config/firebase";
import { collection, addDoc, serverTimestamp, query, where, getDocs, setDoc, doc } from "firebase/firestore";
import Papa from "papaparse";
import { ImportProgress } from "@/components/database/ImportProgressDialog";

export interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
  warnings: string[];
}

// Função auxiliar para parsear CSV
const parseCSV = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve(results.data);
      },
      error: (error) => {
        reject(error);
      },
    });
  });
};

// Remove BOM e normaliza chaves do CSV (Excel/export podem gerar \ufeff na primeira coluna)
const normalizeRowKeys = (row: Record<string, unknown>): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    const k = (key || "").replace(/^\ufeff/, "").trim();
    out[k] = value != null ? String(value).trim() : "";
  }
  return out;
};

// Mapeamento de cabeçalhos alternativos (PT ou com BOM) para o nome esperado no import de professores
const TEACHER_ROW_ALIASES: Record<string, string> = {
  "Nome completo": "fullName",
  "nome completo": "fullName",
  "Nome": "fullName",
  "nome": "fullName",
  "Data de nascimento": "birthDate",
  "data de nascimento": "birthDate",
  "CRO-Estado": "cro",
  "CRO": "cro",
  "cro": "cro",
  "CPF": "cpf",
  "CPF (sem pontuação)": "cpf",
  "CPF sem pontuação": "cpf",
  "CPF(sem pontuação)": "cpf",
  "cpf": "cpf",
  "Telefone/WhatsApp": "phone",
  "Telefone/WhatsApp (com DDD)": "phone",
  "Telefone": "phone",
  "telefone": "phone",
  "phone": "phone",
  "E-mail": "email",
  "E-mail *": "email",
  "e-mail": "email",
  "Email": "email",
  "email": "email",
  "Endereço": "street",
  "Rua": "street",
  "street": "street",
  "Número": "number",
  "number": "number",
  "Bairro": "neighborhood",
  "neighborhood": "neighborhood",
  "Cidade": "city",
  "city": "city",
  "Estado": "state",
  "state": "state",
  "CEP": "cep",
  "cep": "cep",
  "Disponibilidade de deslocamento": "travelAvailability",
  "travelAvailability": "travelAvailability",
  "Disponibilidade fora do Brasil": "availableOutsideBrazil",
  "availableOutsideBrazil": "availableOutsideBrazil",
  "Idiomas": "languages",
  "languages": "languages",
  "Prazo mínimo": "noticePeriodDays",
  "noticePeriodDays": "noticePeriodDays",
  "noticePeriod": "noticePeriodDays",
  "Mini currículo": "miniCurriculo",
  "miniCurriculo": "miniCurriculo",
  "Observação": "observation",
  "observation": "observation",
  "LGPD": "lgpdConsent",
  "Consentimento LGPD": "lgpdConsent",
  "Consentimento": "lgpdConsent",
  "lgpdConsent": "lgpdConsent",
};

// Normaliza nome de coluna para matching flexível (remove * e trechos entre parênteses, trim, lowercase)
const normalizeHeaderForMatch = (key: string): string => {
  return key
    .replace(/\s*\*?\s*$/, "")
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
};

const normalizeTeacherRow = (row: Record<string, unknown>): Record<string, string> => {
  const normalized = normalizeRowKeys(row);
  const out: Record<string, string> = {};
  const inferCanonical = (k: string, norm: string): string => {
    if (TEACHER_ROW_ALIASES[k] !== undefined) return TEACHER_ROW_ALIASES[k];
    if (TEACHER_ROW_ALIASES[norm] !== undefined) return TEACHER_ROW_ALIASES[norm];
    if (/^nome\s*(completo)?$/.test(norm) || norm === "nome") return "fullName";
    if (norm === "cpf" || norm.includes("cpf")) return "cpf";
    if (norm.includes("email") || norm.includes("e-mail") || norm.includes("mail")) return "email";
    if (norm.includes("data") && norm.includes("nascimento")) return "birthDate";
    if (norm.includes("telefone") || norm.includes("whatsapp") || norm.includes("phone")) return "phone";
    if (norm.includes("cro")) return "cro";
    if (norm.includes("rua") || norm.includes("endereço") || norm === "street") return "street";
    if (norm === "número" || norm === "number") return "number";
    if (norm.includes("bairro") || norm === "neighborhood") return "neighborhood";
    if (norm.includes("cidade") || norm === "city") return "city";
    if (norm.includes("estado") || norm === "state") return "state";
    if (norm === "cep") return "cep";
    return k;
  };

  for (const [key, value] of Object.entries(normalized)) {
    const n = normalizeHeaderForMatch(key);
    const canonical = inferCanonical(key, n);
    if (out[canonical] === undefined || out[canonical] === "") out[canonical] = value;
  }
  return out;
};

// Função auxiliar para validar email (aceita após trim e remove caracteres de controle)
const isValidEmail = (email: string): boolean => {
  const cleaned = (email || "").replace(/\s/g, "").replace(/[\u200B-\u200D\uFEFF]/g, "").trim().toLowerCase();
  if (!cleaned) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(cleaned);
};

const cleanEmail = (email: string): string => {
  return (email || "")
    .replace(/\s/g, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\x00-\x1F\x7F]/g, "") // caracteres de controle
    .replace(/^["'\s]+|["'\s]+$/g, "")
    .trim()
    .toLowerCase();
};

// Valida CPF: 11 dígitos e dígitos verificadores
const isValidCPF = (cpfRaw: string): boolean => {
  const digits = cpfRaw.replace(/\D/g, "");
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false; // rejeita 111.111.111-11 etc
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i], 10) * (10 - i);
  let rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  if (rest !== parseInt(digits[9], 10)) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i], 10) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  if (rest !== parseInt(digits[10], 10)) return false;
  return true;
};

// Função auxiliar para validar data
const parseDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
};

// Data no formato dd/MM/yyyy ou yyyy-MM-dd
const parseBirthDate = (dateStr: string): Date | null => {
  if (!dateStr || !String(dateStr).trim()) return null;
  const s = String(dateStr).trim();
  const ddmmyyyy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmmyyyy) {
    const day = parseInt(ddmmyyyy[1], 10);
    const month = parseInt(ddmmyyyy[2], 10) - 1;
    const year = parseInt(ddmmyyyy[3], 10);
    const date = new Date(year, month, day);
    return isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(s);
  return isNaN(date.getTime()) ? null : date;
};

// ============= COLABORADORES =============
export const importCollaboratorsFromCSV = async (
  file: File,
  onProgress: (progress: ImportProgress) => void
): Promise<ImportResult> => {
  const result: ImportResult = {
    success: 0,
    failed: 0,
    errors: [],
    warnings: [],
  };

  try {
    const data = await parseCSV(file);
    const total = data.length;

    onProgress({
      current: 0,
      total,
      currentItem: total > 0 ? "Iniciando importação..." : "Nenhum registro no arquivo.",
      success: 0,
      failed: 0,
      errors: result.errors,
      warnings: result.warnings,
    });

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      onProgress({
        current: i + 1,
        total,
        currentItem: `${row.firstName || ""} ${row.lastName || ""}`.trim() || `Linha ${i + 1}`,
        success: result.success,
        failed: result.failed,
        errors: result.errors,
        warnings: result.warnings,
      });

      try {
        // Validações
        if (!row.firstName || !row.lastName) {
          throw new Error("Nome e sobrenome são obrigatórios");
        }

        if (!row.email || !isValidEmail(row.email)) {
          throw new Error("Email inválido");
        }

        // Verificar se já existe
        const existingQuery = query(
          collection(db, "collaborators_unified"),
          where("email", "==", row.email)
        );
        const existingDocs = await getDocs(existingQuery);
        
        if (!existingDocs.empty) {
          result.warnings.push(`Linha ${i + 1}: Email ${row.email} já existe`);
          result.failed++;
          continue;
        }

        const birthDate = parseDate(row.birthDate);
        if (!birthDate) {
          result.warnings.push(`Linha ${i + 1}: Data de nascimento inválida`);
        }

        // Criar colaborador
        await addDoc(collection(db, "collaborators_unified"), {
          firstName: row.firstName.trim(),
          lastName: row.lastName.trim(),
          email: row.email.trim().toLowerCase(),
          birthDate: birthDate || new Date(),
          hierarchyLevel: row.hierarchyLevel || "Nível 5",
          phone: row.phone || "",
          whatsapp: row.whatsapp || row.phone || "",
          address: row.address || "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          source: "bulk_import",
        });

        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push(`Linha ${i + 1}: ${error.message}`);
      }
    }
  } catch (error: any) {
    result.errors.push(`Erro ao processar arquivo: ${error.message}`);
  }

  return result;
};

// ============= PROFESSORES =============
const TRAVEL_OPTIONS = ["Dentro do estado", "Fora do estado", "Brasil todo", "Internacional"];

export interface ImportTeachersOptions {
  /** Obrigatória para importar: cria usuário no Firebase Auth e documento em Firestore "users" (role Nível 6). Mín. 6 caracteres. Não usamos mais a coleção "teachers". */
  defaultPassword?: string;
}

export const importTeachersFromCSV = async (
  file: File,
  onProgress: (progress: ImportProgress) => void,
  options?: ImportTeachersOptions
): Promise<ImportResult> => {
  const result: ImportResult = {
    success: 0,
    failed: 0,
    errors: [],
    warnings: [],
  };
  const createInAuthAndUsers = Boolean(options?.defaultPassword && options.defaultPassword.length >= 6);

  try {
    const data = await parseCSV(file);
    const total = data.length;

    if (total > 0 && !createInAuthAndUsers) {
      result.errors.push("Para importar professores é necessário informar a senha padrão (mín. 6 caracteres) para criação de acesso no sistema. Os professores são cadastrados como usuários (role Nível 6), não na coleção separada.");
      result.failed = total;
      onProgress({ current: total, total, currentItem: "Importação cancelada.", success: 0, failed: result.failed, errors: result.errors, warnings: result.warnings });
      return result;
    }

    onProgress({
      current: 0,
      total,
      currentItem: total > 0 ? "Iniciando importação..." : "Nenhum registro no arquivo.",
      success: 0,
      failed: 0,
      errors: result.errors,
      warnings: result.warnings,
    });

    for (let i = 0; i < data.length; i++) {
      const row = normalizeTeacherRow(data[i] as Record<string, unknown>);
      const name = (row.fullName || row.name || "").trim();
      const email = cleanEmail(row.email || "");

      onProgress({
        current: i + 1,
        total,
        currentItem: name || email || `Linha ${i + 1}`,
        success: result.success,
        failed: result.failed,
        errors: result.errors,
        warnings: result.warnings,
      });

      try {
        if (!name) {
          throw new Error("Nome completo é obrigatório");
        }

        if (!email || !isValidEmail(email)) {
          throw new Error("E-mail inválido");
        }

        const cpfRaw = (row.cpf || "").replace(/\D/g, "").trim();
        if (cpfRaw && !isValidCPF(cpfRaw)) {
          throw new Error("CPF inválido");
        }
        let doCreateInAuthAndUsers = createInAuthAndUsers;
        if (createInAuthAndUsers && !cpfRaw) {
          result.warnings.push(`Linha ${i + 1}: CPF vazio — é obrigatório para criar acesso. Professor não foi cadastrado.`);
          result.failed++;
          continue;
        }

        const existingUsersQuery = query(
          collection(db, "users"),
          where("email", "==", email)
        );
        const existingUsers = await getDocs(existingUsersQuery);
        if (!existingUsers.empty) {
          result.errors.push(`Linha ${i + 1}: E-mail ${email} já cadastrado no sistema`);
          result.failed++;
          continue;
        }

        const lgpdValue = (row.lgpdConsent || "").trim().toLowerCase();
        const lgpdConsent =
          lgpdValue === "sim" || lgpdValue === "s" || lgpdValue === "true" || lgpdValue === "1" ||
          lgpdValue === "yes" || lgpdValue === "y" || lgpdValue === "x" || lgpdValue === "ok" ||
          lgpdValue === "concordo" || lgpdValue === "aceito" || lgpdValue === "verdadeiro";
        if (!lgpdConsent) {
          result.warnings.push(`Linha ${i + 1}: Consentimento LGPD não informado ou não marcado como Sim para ${email}`);
        }

        const birthDate = parseBirthDate(row.birthDate || "") || null;
        const travelRaw = (row.travelAvailability || "").trim();
        const travelAvailability = TRAVEL_OPTIONS.includes(travelRaw) ? travelRaw : "Dentro do estado";
        const availableOutsideRaw = (row.availableOutsideBrazil || "").trim().toLowerCase();
        const availableOutsideBrazil = availableOutsideRaw === "sim" || availableOutsideRaw === "true" || availableOutsideRaw === "1" || availableOutsideRaw === "yes";
        const languagesStr = (row.languages || "").trim();
        const languages = languagesStr ? languagesStr.split(/[,;]/).map((l: string) => l.trim()).filter(Boolean) : [];
        const noticePeriodDays = parseInt(String(row.noticePeriodDays || row.noticePeriod || "30").trim(), 10) || 30;

        const address = {
          street: (row.street || "").trim(),
          number: (row.number || "").trim(),
          neighborhood: (row.neighborhood || "").trim(),
          city: (row.city || "").trim(),
          state: (row.state || "").trim(),
          cep: (row.cep || "").replace(/\D/g, "").trim(),
        };

        const phone = (row.phone || "").trim();
        const availability = {
          availableOutsideBrazil,
          travelAvailability,
          languages,
          noticePeriodDays,
        };
        const paymentData = {
          bank: "",
          bankCode: "",
          agency: "",
          account: "",
          defaultValue: 0,
          reference: "Aula ministrada",
          paymentName: "",
          cnpj: "",
          pix: "",
        };

        if (doCreateInAuthAndUsers) {
          try {
            const currentUser = auth.currentUser;
            if (!currentUser) {
              throw new Error("É necessário estar logado para importar professores com criação de conta. Faça login e tente novamente.");
            }
            const token = await currentUser.getIdToken();
            const nameParts = name.split(" ");
            const firstName = nameParts[0] || name;
            const lastName = nameParts.slice(1).join(" ") || firstName;

            const createRes = await fetch(`${FUNCTIONS_BASE_URL}/createUserAuth`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                email,
                password: options!.defaultPassword,
                firstName,
                lastName,
                hierarchyLevel: "Nível 6",
              }),
            });

            if (!createRes.ok) {
              const errData = await createRes.json().catch(() => ({}));
              const msg = errData.error || createRes.statusText || "Erro ao criar usuário no Auth";
              throw new Error(msg);
            }

            const authResult = await createRes.json();
            const newUserId = authResult.uid;
            if (!newUserId) throw new Error("Resposta do servidor sem UID");

            await setDoc(doc(db, "users", newUserId), {
              uid: newUserId,
              deletedAt: null,
              email,
              firstName,
              lastName,
              displayName: name,
              fullName: name,
              hierarchyLevel: "Nível 6",
              photoURL: null,
              phone,
              phoneNumber: phone,
              cpf: cpfRaw,
              birthDate: birthDate ?? null,
              cro: (row.cro || "").trim(),
              address,
              availability,
              paymentData,
              miniCurriculo: (row.miniCurriculo || "").trim(),
              observation: (row.observation || "").trim(),
              lgpdConsent,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          } catch (authError: any) {
            const isCorsOrNetwork =
              authError?.message?.includes("Failed to fetch") ||
              authError?.message?.includes("NetworkError") ||
              authError?.name === "TypeError" ||
              (typeof authError?.code !== "undefined" && authError?.code === "ERR_FAILED");
            if (isCorsOrNetwork) {
              result.warnings.push(
                `Linha ${i + 1} (${email}): Não foi possível criar conta — erro de rede/CORS (ex.: localhost). Faça o deploy da Cloud Function com CORS ou use em produção.`
              );
              result.failed++;
              continue;
            } else {
              throw authError;
            }
          }
        }

        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push(`Linha ${i + 1}: ${error.message}`);
      }
    }
  } catch (error: any) {
    result.errors.push(`Erro ao processar arquivo: ${error.message}`);
  }

  return result;
};

// ============= CURSOS =============
export const importCoursesFromCSV = async (
  file: File,
  onProgress: (progress: ImportProgress) => void
): Promise<ImportResult> => {
  const result: ImportResult = {
    success: 0,
    failed: 0,
    errors: [],
    warnings: [],
  };

  try {
    const data = await parseCSV(file);
    const total = data.length;

    onProgress({
      current: 0,
      total,
      currentItem: total > 0 ? "Iniciando importação..." : "Nenhum registro no arquivo.",
      success: 0,
      failed: 0,
      errors: result.errors,
      warnings: result.warnings,
    });

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      onProgress({
        current: i + 1,
        total,
        currentItem: (row.name || "").toString().trim() || `Linha ${i + 1}`,
        success: result.success,
        failed: result.failed,
        errors: result.errors,
        warnings: result.warnings,
      });

      try {
        if (!row.name) {
          throw new Error("Nome do curso é obrigatório");
        }

        // Verificar se já existe
        const existingQuery = query(
          collection(db, "courses"),
          where("name", "==", row.name)
        );
        const existingDocs = await getDocs(existingQuery);
        
        if (!existingDocs.empty) {
          result.warnings.push(`Linha ${i + 1}: Curso ${row.name} já existe`);
          result.failed++;
          continue;
        }

        await addDoc(collection(db, "courses"), {
          name: row.name.trim(),
          description: row.description || "",
          duration: parseInt(row.duration) || 0,
          price: parseFloat(row.price) || 0,
          category: row.category || "Geral",
          status: row.status || "Ativo",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push(`Linha ${i + 1}: ${error.message}`);
      }
    }
  } catch (error: any) {
    result.errors.push(`Erro ao processar arquivo: ${error.message}`);
  }

  return result;
};

// ============= AULAS =============
export const importLessonsFromCSV = async (
  file: File,
  onProgress: (progress: ImportProgress) => void
): Promise<ImportResult> => {
  const result: ImportResult = {
    success: 0,
    failed: 0,
    errors: [],
    warnings: [],
  };

  try {
    const data = await parseCSV(file);
    const total = data.length;

    onProgress({
      current: 0,
      total,
      currentItem: total > 0 ? "Iniciando importação..." : "Nenhum registro no arquivo.",
      success: 0,
      failed: 0,
      errors: result.errors,
      warnings: result.warnings,
    });

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      onProgress({
        current: i + 1,
        total,
        currentItem: (row.title || "").toString().trim() || `Linha ${i + 1}`,
        success: result.success,
        failed: result.failed,
        errors: result.errors,
        warnings: result.warnings,
      });

      try {
        if (!row.courseId) {
          throw new Error("ID do curso é obrigatório");
        }

        if (!row.title) {
          throw new Error("Título da aula é obrigatório");
        }

        await addDoc(collection(db, "lessons"), {
          courseId: row.courseId.trim(),
          title: row.title.trim(),
          description: row.description || "",
          duration: parseInt(row.duration) || 0,
          order: parseInt(row.order) || 0,
          videoUrl: row.videoUrl || "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push(`Linha ${i + 1}: ${error.message}`);
      }
    }
  } catch (error: any) {
    result.errors.push(`Erro ao processar arquivo: ${error.message}`);
  }

  return result;
};

// ============= EVENTOS =============
export const importEventsFromCSV = async (
  file: File,
  onProgress: (progress: ImportProgress) => void
): Promise<ImportResult> => {
  const result: ImportResult = {
    success: 0,
    failed: 0,
    errors: [],
    warnings: [],
  };

  try {
    const data = await parseCSV(file);
    const total = data.length;
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error("Usuário não autenticado");
    }

    onProgress({
      current: 0,
      total,
      currentItem: total > 0 ? "Iniciando importação..." : "Nenhum registro no arquivo.",
      success: 0,
      failed: 0,
      errors: result.errors,
      warnings: result.warnings,
    });

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      onProgress({
        current: i + 1,
        total,
        currentItem: (row.title || "").toString().trim() || `Linha ${i + 1}`,
        success: result.success,
        failed: result.failed,
        errors: result.errors,
        warnings: result.warnings,
      });

      try {
        if (!row.title) {
          throw new Error("Título do evento é obrigatório");
        }

        const startDate = parseDate(row.startDate);
        const endDate = parseDate(row.endDate);

        if (!startDate || !endDate) {
          throw new Error("Datas de início e fim são obrigatórias");
        }

        await addDoc(collection(db, "agenda_events"), {
          title: row.title.trim(),
          description: row.description || "",
          type: row.type || "Outros",
          status: "Agendado",
          startDate,
          endDate,
          allDay: row.allDay === "true" || row.allDay === "1",
          location: row.location || "",
          ownerId: currentUser.uid,
          ownerName: currentUser.displayName || currentUser.email || "Admin",
          priority: row.priority || "Média",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: currentUser.uid,
          createdByName: currentUser.displayName || currentUser.email || "Admin",
        });

        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push(`Linha ${i + 1}: ${error.message}`);
      }
    }
  } catch (error: any) {
    result.errors.push(`Erro ao processar arquivo: ${error.message}`);
  }

  return result;
};

// ============= TAREFAS =============
export const importTasksFromCSV = async (
  file: File,
  onProgress: (progress: ImportProgress) => void
): Promise<ImportResult> => {
  const result: ImportResult = {
    success: 0,
    failed: 0,
    errors: [],
    warnings: [],
  };

  try {
    const data = await parseCSV(file);
    const total = data.length;
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error("Usuário não autenticado");
    }

    onProgress({
      current: 0,
      total,
      currentItem: total > 0 ? "Iniciando importação..." : "Nenhum registro no arquivo.",
      success: 0,
      failed: 0,
      errors: result.errors,
      warnings: result.warnings,
    });

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      onProgress({
        current: i + 1,
        total,
        currentItem: (row.title || "").toString().trim() || `Linha ${i + 1}`,
        success: result.success,
        failed: result.failed,
        errors: result.errors,
        warnings: result.warnings,
      });

      try {
        if (!row.title) {
          throw new Error("Título da tarefa é obrigatório");
        }

        if (!row.assignedTo) {
          throw new Error("Responsável é obrigatório");
        }

        const dueDate = parseDate(row.dueDate);
        if (!dueDate) {
          throw new Error("Data de vencimento inválida");
        }

        await addDoc(collection(db, "tasks"), {
          title: row.title.trim(),
          description: row.description || "",
          status: row.status || "Pendente",
          priority: row.priority || "Média",
          assignedTo: row.assignedTo.trim(),
          assignedToName: row.assignedToName || row.assignedTo,
          clientId: row.clientId || "",
          clientName: row.clientName || "",
          dueDate,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: currentUser.uid,
          createdByName: currentUser.displayName || currentUser.email || "Admin",
          archived: false,
        });

        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push(`Linha ${i + 1}: ${error.message}`);
      }
    }
  } catch (error: any) {
    result.errors.push(`Erro ao processar arquivo: ${error.message}`);
  }

  return result;
};
