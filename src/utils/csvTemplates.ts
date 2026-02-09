// Função auxiliar para criar e baixar CSV
const downloadCSV = (filename: string, content: string) => {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Escapa um valor para CSV (coloca entre aspas se tiver vírgula, quebra de linha ou aspas)
const escapeCSVCell = (value: string): string => {
  const s = String(value ?? "");
  if (s.includes(",") || s.includes("\n") || s.includes('"')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

// ============= COLABORADORES =============
export const downloadCollaboratorsTemplate = () => {
  const headers = [
    "firstName",
    "lastName",
    "email",
    "birthDate",
    "hierarchyLevel",
    "phone",
    "whatsapp",
    "address",
  ];

  const exampleRow = [
    "João",
    "Silva",
    "joao.silva@email.com",
    "1990-01-15",
    "Nível 3",
    "11999999999",
    "11999999999",
    "Rua Exemplo, 123 - São Paulo/SP",
  ];

  const csv = [headers.join(","), exampleRow.join(",")].join("\n");
  downloadCSV("modelo_colaboradores.csv", csv);
};

// ============= PROFESSORES =============
export const downloadTeachersTemplate = () => {
  const headers = [
    "fullName",
    "birthDate",
    "cro",
    "cpf",
    "phone",
    "email",
    "street",
    "number",
    "neighborhood",
    "city",
    "state",
    "cep",
    "travelAvailability",
    "availableOutsideBrazil",
    "languages",
    "noticePeriodDays",
    "miniCurriculo",
    "observation",
    "lgpdConsent",
  ];

  const exampleRow = [
    "Maria Santos",
    "15/03/1985",
    "123456-SP",
    "12345678900",
    "11988887777",
    "maria.santos@email.com",
    "Rua Exemplo",
    "100",
    "Centro",
    "São Paulo",
    "SP",
    "01310100",
    "Brasil todo",
    "Sim",
    "Português,Inglês,Espanhol",
    "30",
    "Especialização X; Mestrado Y; Título 3; Título 4; Título 5",
    "Observações gerais",
    "Sim",
  ];

  const headerLine = headers.join(",");
  const dataLine = exampleRow.map(escapeCSVCell).join(",");
  const csv = [headerLine, dataLine].join("\n");
  downloadCSV("modelo_professores.csv", csv);
};

// ============= CURSOS =============
export const downloadCoursesTemplate = () => {
  const headers = [
    "name",
    "description",
    "duration",
    "price",
    "category",
    "status",
  ];

  const exampleRow = [
    "Curso de React",
    "Aprenda React do zero ao avançado",
    "40",
    "1500",
    "Programação",
    "Ativo",
  ];

  const csv = [headers.join(","), exampleRow.join(",")].join("\n");
  downloadCSV("modelo_cursos.csv", csv);
};

// ============= AULAS =============
export const downloadLessonsTemplate = () => {
  const headers = [
    "courseId",
    "title",
    "description",
    "duration",
    "order",
    "videoUrl",
  ];

  const exampleRow = [
    "curso123",
    "Introdução ao React",
    "Primeira aula do curso",
    "60",
    "1",
    "https://youtube.com/watch?v=exemplo",
  ];

  const csv = [headers.join(","), exampleRow.join(",")].join("\n");
  downloadCSV("modelo_aulas.csv", csv);
};

// ============= EVENTOS =============
export const downloadEventsTemplate = () => {
  const headers = [
    "title",
    "description",
    "type",
    "startDate",
    "endDate",
    "allDay",
    "location",
    "priority",
  ];

  const exampleRow = [
    "Reunião Geral",
    "Reunião mensal da equipe",
    "Reunião",
    "2025-02-15 09:00",
    "2025-02-15 11:00",
    "false",
    "Sala de Reuniões 1",
    "Alta",
  ];

  const csv = [headers.join(","), exampleRow.join(",")].join("\n");
  downloadCSV("modelo_eventos.csv", csv);
};

// ============= TAREFAS =============
export const downloadTasksTemplate = () => {
  const headers = [
    "title",
    "description",
    "status",
    "priority",
    "assignedTo",
    "assignedToName",
    "clientId",
    "clientName",
    "dueDate",
  ];

  const exampleRow = [
    "Desenvolver feature X",
    "Implementar nova funcionalidade",
    "Pendente",
    "Alta",
    "user@email.com",
    "João Silva",
    "client123",
    "Cliente ABC",
    "2025-03-01",
  ];

  const csv = [headers.join(","), exampleRow.join(",")].join("\n");
  downloadCSV("modelo_tarefas.csv", csv);
};
