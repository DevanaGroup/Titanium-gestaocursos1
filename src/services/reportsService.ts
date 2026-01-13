import { db } from "@/config/firebase";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { Client, Task, Collaborator, FinancialClient, TaskStatus, TaskPriority, ProductivityMetrics, ProductivityGoals, ProductivityAlert } from "@/types";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ProductivityService } from "./productivityService";

export interface ReportMetrics {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  monthlyRevenue: number;
  completedTasks: number;
  overdueTasks: number;
  totalCollaborators: number;
  efficiency: number;
  averageQualityScore: number;
  totalHoursWorked: number;
  overtimeCollaborators: number;
  activeGoals: number;
  achievedGoals: number;
  totalAlerts: number;
  criticalAlerts: number;
}

export interface ChartData {
  projectsByStatus: Array<{ name: string; value: number; color: string }>;
  tasksByStatus: Array<{ name: string; value: number }>;
  tasksByPriority: Array<{ name: string; value: number }>;
  monthlyRevenueData: Array<{ month: string; revenue: number; expenses: number }>;
  collaboratorProductivity: Array<{ name: string; completed: number; pending: number; total: number; qualityScore: number; hoursWorked: number }>;
  productivityTrends: Array<{ month: string; qualityScore: number; efficiency: number }>;
  goalAchievementRate: Array<{ name: string; achieved: number; total: number; rate: number }>;
  timeDistribution: Array<{ name: string; hours: number; percentage: number }>;
  alertsByType: Array<{ name: string; value: number; severity: string }>;
}

export interface ReportLists {
  recentProjects: Client[];
  urgentTasks: Task[];
  topPerformers: Array<{ name: string; completedTasks: number; efficiency: number; qualityScore: number; hoursWorked: number }>;
  overdueProjects: Client[];
  lowPerformanceAlerts: ProductivityAlert[];
  topGoalAchievers: Array<{ name: string; achievedGoals: number; totalGoals: number; rate: number }>;
  overtimeWorkers: Array<{ name: string; overtimeHours: number; totalHours: number }>;
}

export interface DashboardData {
  metrics: ReportMetrics;
  charts: ChartData;
  lists: ReportLists;
}

const STATUS_COLORS = {
  "Em andamento": "#3B82F6",
  "Concluído": "#10B981",
  "Em análise": "#F59E0B",
  "Aguardando documentos": "#EF4444"
};

export class ReportsService {
  
  static async getDashboardData(): Promise<DashboardData> {
    try {
      // Buscar dados das coleções principais
      const [clientsSnapshot, tasksSnapshot, financialSnapshot] = await Promise.all([
        getDocs(collection(db, "clients")),
        getDocs(collection(db, "tasks")),
        getDocs(collection(db, "financeiro_financialClients"))
      ]);

      // Buscar colaboradores da coleção unificada primeiro
      let collaborators: Collaborator[] = [];
      
      try {
        const unifiedSnapshot = await getDocs(collection(db, "collaborators_unified"));
        collaborators = unifiedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Collaborator[];
        console.log(`✅ Reports: Usando coleção unificada - ${collaborators.length} colaboradores`);
      } catch (error) {
        console.log('⚠️ Reports: Fallback para coleção antiga');
        const collaboratorsSnapshot = await getDocs(collection(db, "collaborators_unified"));
        collaborators = collaboratorsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Collaborator[];
      }

      const clients = clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Client[];
      const tasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Task[];
      const financialClients = financialSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as FinancialClient[];

      // Buscar dados de produtividade
      const [productivityMetricsSnapshot, productivityGoalsSnapshot, productivityAlertsSnapshot] = await Promise.all([
        getDocs(collection(db, "productivityMetrics")),
        getDocs(collection(db, "productivityGoals")),
        getDocs(collection(db, "productivityAlerts"))
      ]);

      const productivityMetrics = productivityMetricsSnapshot.docs.map(doc => ({ 
        ...doc.data(), 
        periodStart: doc.data().periodStart?.toDate() || new Date(),
        periodEnd: doc.data().periodEnd?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as ProductivityMetrics[];

      const productivityGoals = productivityGoalsSnapshot.docs.map(doc => ({ 
        id: doc.id,
        ...doc.data(),
        startDate: doc.data().startDate?.toDate() || new Date(),
        endDate: doc.data().endDate?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as ProductivityGoals[];

      const productivityAlerts = productivityAlertsSnapshot.docs.map(doc => ({ 
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        acknowledgedAt: doc.data().acknowledgedAt?.toDate(),
        resolvedAt: doc.data().resolvedAt?.toDate()
      })) as ProductivityAlert[];

      // Calcular métricas principais incluindo produtividade
      const metrics = this.calculateMetrics(clients, tasks, collaborators, financialClients, productivityMetrics, productivityGoals, productivityAlerts);
      
      // Gerar dados para gráficos incluindo dados de produtividade
      const charts = this.generateChartData(clients, tasks, collaborators, financialClients, productivityMetrics, productivityGoals, productivityAlerts, metrics.monthlyRevenue);
      
      // Gerar listas incluindo dados de produtividade
      const lists = this.generateLists(clients, tasks, collaborators, productivityGoals, productivityAlerts, productivityMetrics);

      return { metrics, charts, lists };
      
    } catch (error) {
      console.error("Erro ao buscar dados do dashboard:", error);
      throw new Error("Falha ao carregar dados dos relatórios");
    }
  }

  private static calculateMetrics(
    clients: Client[], 
    tasks: Task[], 
    collaborators: Collaborator[],
    financialClients: FinancialClient[],
    productivityMetrics: ProductivityMetrics[],
    productivityGoals: ProductivityGoals[],
    productivityAlerts: ProductivityAlert[]
  ): ReportMetrics {
    const totalProjects = clients.length;
    const activeProjects = clients.filter(c => c.status === "Em andamento").length;
    const completedProjects = clients.filter(c => c.status === "Concluído").length;
    
    const monthlyRevenue = financialClients
      .filter(fc => fc.status === "Ativo")
      .reduce((sum, fc) => sum + fc.monthlyValue, 0);

    const completedTasks = tasks.filter(t => t.status === TaskStatus.Concluída).length;
    const overdueTasks = tasks.filter(t => {
      if (t.status === TaskStatus.Concluída) return false;
      return new Date(t.dueDate) < new Date();
    }).length;

    const efficiency = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

    // Calcular métricas de produtividade
    const averageQualityScore = productivityMetrics.length > 0 
      ? Math.round(productivityMetrics.reduce((sum, m) => sum + m.qualityScore, 0) / productivityMetrics.length)
      : 0;

    const totalHoursWorked = productivityMetrics.reduce((sum, m) => sum + m.totalHoursWorked, 0);

    const overtimeCollaborators = productivityMetrics.filter(m => m.overtimeHours > 5).length;

    const activeGoals = productivityGoals.filter(g => g.status === 'Em andamento').length;
    const achievedGoals = productivityGoals.filter(g => g.status === 'Atingida').length;

    const totalAlerts = productivityAlerts.filter(a => a.status === 'active').length;
    const criticalAlerts = productivityAlerts.filter(a => a.severity === 'critical' && a.status === 'active').length;

    return {
      totalProjects,
      activeProjects,
      completedProjects,
      monthlyRevenue,
      completedTasks,
      overdueTasks,
      totalCollaborators: collaborators.length,
      efficiency,
      averageQualityScore,
      totalHoursWorked,
      overtimeCollaborators,
      activeGoals,
      achievedGoals,
      totalAlerts,
      criticalAlerts
    };
  }

  private static generateChartData(
    clients: Client[], 
    tasks: Task[], 
    collaborators: Collaborator[],
    financialClients: FinancialClient[],
    productivityMetrics: ProductivityMetrics[],
    productivityGoals: ProductivityGoals[],
    productivityAlerts: ProductivityAlert[],
    monthlyRevenue: number
  ): ChartData {
    // Dados por status de projeto
    const projectStatusCounts = clients.reduce((acc, client) => {
      acc[client.status] = (acc[client.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const projectsByStatus = Object.entries(projectStatusCounts).map(([name, value]) => ({
      name,
      value,
      color: STATUS_COLORS[name as keyof typeof STATUS_COLORS] || "#1E5128"
    }));

    // Dados por status de tarefa
    const taskStatusCounts = tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const tasksByStatus = Object.entries(taskStatusCounts).map(([name, value]) => ({ name, value }));

    // Dados por prioridade de tarefa
    const taskPriorityCounts = tasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const tasksByPriority = Object.entries(taskPriorityCounts).map(([name, value]) => ({ name, value }));

    // Produtividade por colaborador (com dados de produtividade)
    const collaboratorProductivity = collaborators.map(collab => {
      const collabTasks = tasks.filter(t => t.assignedTo === collab.id);
      const completed = collabTasks.filter(t => t.status === TaskStatus.Concluída).length;
      const pending = collabTasks.filter(t => t.status !== TaskStatus.Concluída).length;
      const total = collabTasks.length;
      
      // Buscar métricas de produtividade do colaborador
      const collabMetrics = productivityMetrics.find(m => m.collaboratorId === collab.id);
      
      return {
        name: `${collab.firstName} ${collab.lastName}`,
        completed,
        pending,
        total,
        qualityScore: collabMetrics?.qualityScore || 0,
        hoursWorked: collabMetrics?.totalHoursWorked || 0
      };
    }).sort((a, b) => b.qualityScore - a.qualityScore);

    // Tendências de produtividade (últimos 6 meses)
    const productivityTrends = Array.from({ length: 6 }, (_, i) => {
      const date = subMonths(new Date(), 5 - i);
      const monthName = format(date, 'MMM', { locale: ptBR });
      
      // Buscar métricas do mês
      const monthMetrics = productivityMetrics.filter(m => {
        const metricMonth = format(m.periodStart, 'MMM', { locale: ptBR });
        return metricMonth === monthName;
      });
      
      const avgQuality = monthMetrics.length > 0 
        ? Math.round(monthMetrics.reduce((sum, m) => sum + m.qualityScore, 0) / monthMetrics.length)
        : 0;
        
      const avgEfficiency = monthMetrics.length > 0
        ? Math.round(monthMetrics.reduce((sum, m) => sum + (m.tasksCompleted / Math.max(m.tasksCreated, 1)) * 100, 0) / monthMetrics.length)
        : 0;
      
      return {
        month: monthName,
        qualityScore: avgQuality,
        efficiency: avgEfficiency
      };
    });

    // Taxa de cumprimento de metas
    const goalAchievementRate = collaborators.map(collab => {
      const collabGoals = productivityGoals.filter(g => g.collaboratorId === collab.id);
      const achieved = collabGoals.filter(g => g.status === 'Atingida').length;
      const total = collabGoals.length;
      const rate = total > 0 ? Math.round((achieved / total) * 100) : 0;
      
      return {
        name: `${collab.firstName} ${collab.lastName}`,
        achieved,
        total,
        rate
      };
    }).filter(item => item.total > 0).sort((a, b) => b.rate - a.rate);

    // Distribuição de tempo
    const totalHours = productivityMetrics.reduce((sum, m) => sum + m.totalHoursWorked, 0);
    const timeDistribution = [
      {
        name: 'Tempo Regular',
        hours: Math.round(totalHours - productivityMetrics.reduce((sum, m) => sum + m.overtimeHours, 0)),
        percentage: 0
      },
      {
        name: 'Horas Extras',
        hours: Math.round(productivityMetrics.reduce((sum, m) => sum + m.overtimeHours, 0)),
        percentage: 0
      }
    ];
    
    // Calcular percentuais
    timeDistribution.forEach(item => {
      item.percentage = totalHours > 0 ? Math.round((item.hours / totalHours) * 100) : 0;
    });

    // Alertas por tipo
    const alertTypeCounts = productivityAlerts.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const alertsByType = Object.entries(alertTypeCounts).map(([name, value]) => {
      const alert = productivityAlerts.find(a => a.type === name);
      return {
        name: name.replace('_', ' ').toUpperCase(),
        value: value as number,
        severity: alert?.severity || 'info'
      };
    });

    // Dados de receita mensal simulados
    const monthlyRevenueData = Array.from({ length: 6 }, (_, i) => {
      const date = subMonths(new Date(), 5 - i);
      const monthName = format(date, 'MMM', { locale: ptBR });
      
      const revenue = Math.round(monthlyRevenue * (0.8 + Math.random() * 0.4));
      const expenses = Math.round(revenue * (0.3 + Math.random() * 0.2));
      
      return {
        month: monthName,
        revenue,
        expenses
      };
    });

    return {
      projectsByStatus,
      tasksByStatus,
      tasksByPriority,
      monthlyRevenueData,
      collaboratorProductivity,
      productivityTrends,
      goalAchievementRate,
      timeDistribution,
      alertsByType
    };
  }

  private static generateLists(
    clients: Client[], 
    tasks: Task[], 
    collaborators: Collaborator[],
    productivityGoals: ProductivityGoals[],
    productivityAlerts: ProductivityAlert[],
    productivityMetrics: ProductivityMetrics[]
  ): ReportLists {
    // Projetos recentes
    const recentProjects = clients
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);

    // Tarefas urgentes
    const urgentTasks = tasks
      .filter(t => t.priority === TaskPriority.Urgente && t.status !== TaskStatus.Concluída)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5);

    // Top performers
    const collaboratorStats = collaborators.map(collab => {
      const collabTasks = tasks.filter(t => t.assignedTo === collab.id);
      const completed = collabTasks.filter(t => t.status === TaskStatus.Concluída).length;
      const total = collabTasks.length;
      
      return {
        name: `${collab.firstName} ${collab.lastName}`,
        completedTasks: completed,
        efficiency: total > 0 ? Math.round((completed / total) * 100) : 0,
        qualityScore: 0,
        hoursWorked: 0
      };
    });

    const topPerformers = collaboratorStats
      .sort((a, b) => b.efficiency - a.efficiency)
      .slice(0, 5);

    // Projetos em atraso (implementar lógica específica se necessário)
    const overdueProjects = clients.filter(c => {
      if (c.status === "Concluído") return false;
      // Adicionar lógica de prazo aqui se disponível
      return false;
    });

    return {
      recentProjects,
      urgentTasks,
      topPerformers,
      overdueProjects,
      lowPerformanceAlerts: [],
      topGoalAchievers: [],
      overtimeWorkers: []
    };
  }

  static async generateProductivityReport(collaboratorId?: string): Promise<any> {
    try {
      const now = new Date();
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      if (collaboratorId) {
        // Relatório individual
        const report = await ProductivityService.generateProductivityReport(
          'individual',
          {
            start: monthAgo,
            end: now,
            type: 'month'
          },
          [collaboratorId]
        );
        
        return {
          type: 'productivity',
          scope: 'individual',
          collaboratorId,
          data: report,
          generatedAt: new Date()
        };
      } else {
        // Relatório da equipe
        const report = await ProductivityService.generateProductivityReport(
          'team',
          {
            start: monthAgo,
            end: now,
            type: 'month'
          }
        );
        
        return {
          type: 'productivity',
          scope: 'team',
          data: report,
          generatedAt: new Date()
        };
      }
    } catch (error) {
      console.error('Erro ao gerar relatório de produtividade:', error);
      throw error;
    }
  }

  static async generateFinancialReport(startDate: Date, endDate: Date): Promise<any> {
    // Implementar geração de relatório financeiro
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          type: 'financial',
          period: { startDate, endDate },
          data: {},
          generatedAt: new Date()
        });
      }, 1000);
    });
  }

  static async generateResourceReport(): Promise<any> {
    // Implementar geração de relatório de recursos
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          type: 'resources',
          data: {},
          generatedAt: new Date()
        });
      }, 1000);
    });
  }

  static async exportToPDF(reportData: any): Promise<void> {
    // Implementar exportação para PDF
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log("Exportando para PDF:", reportData);
        resolve();
      }, 2000);
    });
  }

  static async exportToExcel(reportData: any): Promise<void> {
    // Implementar exportação para Excel
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log("Exportando para Excel:", reportData);
        resolve();
      }, 2000);
    });
  }
} 