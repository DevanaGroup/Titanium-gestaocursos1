import { createAgendaEvent } from '@/services/agendaService';
import { AgendaEventType, AgendaEventStatus, TaskPriority } from '@/types';

export const createSampleAgendaEvents = async (userId: string, userName: string) => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const sampleEvents = [
    {
      title: 'Reunião de Equipe',
      description: 'Reunião semanal da equipe para alinhamento de projetos',
      type: AgendaEventType.Reuniao,
      status: AgendaEventStatus.Agendado,
      startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0),
      endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0),
      allDay: false,
      location: 'Sala de Reuniões A',
      ownerId: userId,
      ownerName: userName,
      priority: TaskPriority.Alta,
      createdBy: userId,
      createdByName: userName,
    },
    {
      title: 'Visita Técnica - Obra Centro',
      description: 'Inspeção técnica na obra do centro da cidade',
      type: AgendaEventType.VisitaTecnica,
      status: AgendaEventStatus.Confirmado,
      startDate: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 14, 0),
      endDate: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 16, 0),
      allDay: false,
      location: 'Obra Centro - Rua Principal, 123',
      ownerId: userId,
      ownerName: userName,
      priority: TaskPriority.Urgente,
      createdBy: userId,
      createdByName: userName,
    },
    {
      title: 'Apresentação para Cliente ABC',
      description: 'Apresentação da proposta final para o cliente ABC',
      type: AgendaEventType.Apresentacao,
      status: AgendaEventStatus.Agendado,
      startDate: new Date(nextWeek.getFullYear(), nextWeek.getMonth(), nextWeek.getDate(), 15, 30),
      endDate: new Date(nextWeek.getFullYear(), nextWeek.getMonth(), nextWeek.getDate(), 17, 0),
      allDay: false,
      location: 'Escritório do Cliente',
      ownerId: userId,
      ownerName: userName,
      priority: TaskPriority.Alta,
      createdBy: userId,
      createdByName: userName,
    },
    {
      title: 'Almoço de Negócios',
      description: 'Almoço com potencial parceiro comercial',
      type: AgendaEventType.Almoco,
      status: AgendaEventStatus.Confirmado,
      startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 12, 0),
      endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 14, 0),
      allDay: false,
      location: 'Restaurante Panorama',
      ownerId: userId,
      ownerName: userName,
      priority: TaskPriority.Média,
      createdBy: userId,
      createdByName: userName,
    },
    {
      title: 'Treinamento NR-35',
      description: 'Treinamento de segurança para trabalho em altura',
      type: AgendaEventType.Treinamento,
      status: AgendaEventStatus.Agendado,
      startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5, 8, 0),
      endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5, 17, 0),
      allDay: false,
      location: 'Centro de Treinamento',
      ownerId: userId,
      ownerName: userName,
      priority: TaskPriority.Alta,
      createdBy: userId,
      createdByName: userName,
    }
  ];

  try {
    for (const eventData of sampleEvents) {
      await createAgendaEvent(eventData);
    }
    console.log('Eventos de exemplo criados com sucesso!');
  } catch (error) {
    console.error('Erro ao criar eventos de exemplo:', error);
  }
};

// Função para limpar todos os eventos (apenas para desenvolvimento)
export const clearAllEvents = async () => {
  console.log('Função de limpeza não implementada por segurança');
  // Implementar apenas se necessário para desenvolvimento
}; 