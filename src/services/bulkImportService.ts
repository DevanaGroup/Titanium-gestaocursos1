import { db, auth } from "@/config/firebase";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
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

// Função auxiliar para validar email
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Função auxiliar para validar data
const parseDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
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

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      onProgress({
        current: i + 1,
        total,
        currentItem: `${row.firstName || ""} ${row.lastName || ""}`.trim(),
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
export const importTeachersFromCSV = async (
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

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      onProgress({
        current: i + 1,
        total,
        currentItem: row.name || "",
        success: result.success,
        failed: result.failed,
        errors: result.errors,
        warnings: result.warnings,
      });

      try {
        if (!row.name) {
          throw new Error("Nome é obrigatório");
        }

        if (!row.email || !isValidEmail(row.email)) {
          throw new Error("Email inválido");
        }

        // Verificar se já existe
        const existingQuery = query(
          collection(db, "teachers"),
          where("email", "==", row.email)
        );
        const existingDocs = await getDocs(existingQuery);
        
        if (!existingDocs.empty) {
          result.warnings.push(`Linha ${i + 1}: Email ${row.email} já existe`);
          result.failed++;
          continue;
        }

        await addDoc(collection(db, "teachers"), {
          name: row.name.trim(),
          email: row.email.trim().toLowerCase(),
          phone: row.phone || "",
          specialty: row.specialty || "",
          hourlyRate: parseFloat(row.hourlyRate) || 0,
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

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      onProgress({
        current: i + 1,
        total,
        currentItem: row.name || "",
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

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      onProgress({
        current: i + 1,
        total,
        currentItem: row.title || "",
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

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      onProgress({
        current: i + 1,
        total,
        currentItem: row.title || "",
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

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      onProgress({
        current: i + 1,
        total,
        currentItem: row.title || "",
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
