import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { 
  TimeTracking, 
  ProductivityGoals, 
  ProductivityMetrics, 
  ProductivityReport, 
  ProductivityAlert,
  WorkPattern,
  Task,
  TaskWithTimeTracking,
  Collaborator
} from '@/types';

export class ProductivityService {
  
  // =================== TIME TRACKING ===================
  
  static async startTimeTracking(taskId: string, collaboratorId: string, description?: string): Promise<string> {
    try {
      const timeTracking: Omit<TimeTracking, 'id'> = {
        taskId,
        collaboratorId,
        startTime: new Date(),
        pausedTime: 0,
        activeTime: 0,
        description,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await addDoc(collection(db, 'timeTracking'), {
        ...timeTracking,
        startTime: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log('⏱️ Time tracking iniciado:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Erro ao iniciar time tracking:', error);
      throw error;
    }
  }

  static async stopTimeTracking(trackingId: string): Promise<void> {
    try {
      const trackingRef = doc(db, 'timeTracking', trackingId);
      const trackingDoc = await getDoc(trackingRef);
      
      if (!trackingDoc.exists()) {
        throw new Error('Time tracking não encontrado');
      }

      const data = trackingDoc.data();
      const startTime = data.startTime.toDate();
      const endTime = new Date();
      const totalMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
      const activeTime = totalMinutes - (data.pausedTime || 0);

      await updateDoc(trackingRef, {
        endTime: serverTimestamp(),
        activeTime,
        updatedAt: serverTimestamp()
      });

      console.log('⏹️ Time tracking finalizado:', trackingId);
    } catch (error) {
      console.error('❌ Erro ao finalizar time tracking:', error);
      throw error;
    }
  }

  static async pauseTimeTracking(trackingId: string, pauseMinutes: number): Promise<void> {
    try {
      const trackingRef = doc(db, 'timeTracking', trackingId);
      const trackingDoc = await getDoc(trackingRef);
      
      if (!trackingDoc.exists()) {
        throw new Error('Time tracking não encontrado');
      }

      const currentPausedTime = trackingDoc.data()?.pausedTime || 0;

      await updateDoc(trackingRef, {
        pausedTime: currentPausedTime + pauseMinutes,
        updatedAt: serverTimestamp()
      });

      console.log('⏸️ Time tracking pausado:', trackingId);
    } catch (error) {
      console.error('❌ Erro ao pausar time tracking:', error);
      throw error;
    }
  }

  static async getTimeTrackingByTask(taskId: string): Promise<TimeTracking[]> {
    try {
      const q = query(
        collection(db, 'timeTracking'),
        where('taskId', '==', taskId),
        orderBy('startTime', 'desc')
      );
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startTime: doc.data().startTime?.toDate() || new Date(),
        endTime: doc.data().endTime?.toDate(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as TimeTracking[];
    } catch (error) {
      console.error('❌ Erro ao buscar time tracking por tarefa:', error);
      throw error;
    }
  }

  static async getTimeTrackingByCollaborator(collaboratorId: string, startDate?: Date, endDate?: Date): Promise<TimeTracking[]> {
    try {
      let q = query(
        collection(db, 'timeTracking'),
        where('collaboratorId', '==', collaboratorId)
      );

      if (startDate) {
        q = query(q, where('startTime', '>=', startDate));
      }
      
      if (endDate) {
        q = query(q, where('startTime', '<=', endDate));
      }

      q = query(q, orderBy('startTime', 'desc'));
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startTime: doc.data().startTime?.toDate() || new Date(),
        endTime: doc.data().endTime?.toDate(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as TimeTracking[];
    } catch (error) {
      console.error('❌ Erro ao buscar time tracking por colaborador:', error);
      throw error;
    }
  }

  // =================== PRODUCTIVITY GOALS ===================

  static async createProductivityGoal(goal: Omit<ProductivityGoals, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'productivityGoals'), {
        ...goal,
        startDate: Timestamp.fromDate(goal.startDate),
        endDate: Timestamp.fromDate(goal.endDate),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log('🎯 Meta de produtividade criada:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Erro ao criar meta de produtividade:', error);
      throw error;
    }
  }

  static async updateProductivityGoal(goalId: string, updates: Partial<ProductivityGoals>): Promise<void> {
    try {
      const goalRef = doc(db, 'productivityGoals', goalId);
      await updateDoc(goalRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });

      console.log('✅ Meta de produtividade atualizada:', goalId);
    } catch (error) {
      console.error('❌ Erro ao atualizar meta de produtividade:', error);
      throw error;
    }
  }

  static async getProductivityGoalsByCollaborator(collaboratorId: string): Promise<ProductivityGoals[]> {
    try {
      const q = query(
        collection(db, 'productivityGoals'),
        where('collaboratorId', '==', collaboratorId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startDate: doc.data().startDate?.toDate() || new Date(),
        endDate: doc.data().endDate?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as ProductivityGoals[];
    } catch (error) {
      console.error('❌ Erro ao buscar metas de produtividade:', error);
      throw error;
    }
  }

  // =================== PRODUCTIVITY METRICS ===================

  static async calculateProductivityMetrics(
    collaboratorId: string, 
    period: 'day' | 'week' | 'month' | 'quarter' | 'year',
    periodStart: Date,
    periodEnd: Date
  ): Promise<ProductivityMetrics> {
    try {
      // Buscar time tracking do período
      const timeTrackings = await this.getTimeTrackingByCollaborator(collaboratorId, periodStart, periodEnd);
      
      // Buscar tarefas do período
      const tasksQuery = query(
        collection(db, 'tasks'),
        where('assignedTo', '==', collaboratorId),
        where('createdAt', '>=', periodStart),
        where('createdAt', '<=', periodEnd)
      );
      const tasksSnapshot = await getDocs(tasksQuery);
      const tasks = tasksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dueDate: doc.data().dueDate?.toDate() || new Date(),
        completedAt: doc.data().completedAt?.toDate(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as Task[];

      // Calcular métricas de tempo
      const totalHoursWorked = timeTrackings.reduce((sum, tracking) => 
        sum + (tracking.activeTime / 60), 0);
      
      const workDays = this.getWorkDaysBetween(periodStart, periodEnd);
      const averageHoursPerDay = workDays > 0 ? totalHoursWorked / workDays : 0;

      // Calcular métricas de tarefas
      const tasksCompleted = tasks.filter(task => task.status === 'Concluída').length;
      const tasksInProgress = tasks.filter(task => task.status === 'Em andamento').length;
      const tasksCreated = tasks.length;

      // Calcular tempo médio de duração das tarefas
      const completedTasks = tasks.filter(task => task.completedAt);
      const averageTaskDuration = completedTasks.length > 0 
        ? completedTasks.reduce((sum, task) => {
            const duration = task.completedAt!.getTime() - task.createdAt.getTime();
            return sum + (duration / (1000 * 60 * 60)); // converter para horas
          }, 0) / completedTasks.length
        : 0;

      // Calcular métricas de qualidade
      const tasksWithDueDate = tasks.filter(task => task.dueDate);
      const tasksCompletedOnTime = tasksWithDueDate.filter(task => 
        task.completedAt && task.completedAt <= task.dueDate).length;
      const tasksCompletedLate = tasksWithDueDate.filter(task => 
        task.completedAt && task.completedAt > task.dueDate).length;
      
      const averageDelayDays = tasksCompletedLate > 0 
        ? tasksWithDueDate.reduce((sum, task) => {
            if (task.completedAt && task.completedAt > task.dueDate) {
              const delay = (task.completedAt.getTime() - task.dueDate.getTime()) / (1000 * 60 * 60 * 24);
              return sum + delay;
            }
            return sum;
          }, 0) / tasksCompletedLate
        : 0;

      // Calcular score de qualidade (0-100)
      const onTimeRate = tasksWithDueDate.length > 0 ? 
        (tasksCompletedOnTime / tasksWithDueDate.length) * 100 : 100;
      const completionRate = tasksCreated > 0 ? (tasksCompleted / tasksCreated) * 100 : 0;
      const qualityScore = Math.round((onTimeRate * 0.6) + (completionRate * 0.4));

      // Análise de padrões de trabalho
      const mostProductiveHour = this.calculateMostProductiveHour(timeTrackings);
      const mostProductiveDay = this.calculateMostProductiveDay(timeTrackings);

      const metrics: ProductivityMetrics = {
        collaboratorId,
        period,
        periodStart,
        periodEnd,
        totalHoursWorked,
        averageHoursPerDay,
        overtimeHours: Math.max(0, totalHoursWorked - (workDays * 8)), // considerando 8h/dia padrão
        tasksCompleted,
        tasksCreated,
        tasksInProgress,
        averageTaskDuration,
        tasksCompletedOnTime,
        tasksCompletedLate,
        averageDelayDays,
        qualityScore,
        teamAverageProductivity: 0, // Será calculado em comparação com a equipe
        rankingPosition: 0, // Será calculado em comparação com a equipe
        improvementPercentage: 0, // Será calculado comparando com período anterior
        mostProductiveHour,
        mostProductiveDay,
        peakProductivityScore: Math.max(qualityScore, 0),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Salvar métricas no banco
      await addDoc(collection(db, 'productivityMetrics'), {
        ...metrics,
        periodStart: Timestamp.fromDate(periodStart),
        periodEnd: Timestamp.fromDate(periodEnd),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return metrics;
    } catch (error) {
      console.error('❌ Erro ao calcular métricas de produtividade:', error);
      throw error;
    }
  }

  // =================== PRODUCTIVITY REPORTS ===================

  static async generateProductivityReport(
    type: 'individual' | 'team' | 'departmental' | 'company',
    period: { start: Date; end: Date; type: 'day' | 'week' | 'month' | 'quarter' | 'year' },
    collaboratorIds?: string[],
    departmentIds?: string[]
  ): Promise<ProductivityReport> {
    try {
      console.log('📊 Gerando relatório de produtividade:', { type, period });

      // Buscar colaboradores relevantes
      let targetCollaborators: string[] = [];
      if (collaboratorIds) {
        targetCollaborators = collaboratorIds;
      } else {
        // Buscar todos os colaboradores se não especificado
        try {
          // Primeiro tentar na coleção unificada
          const unifiedSnapshot = await getDocs(collection(db, 'collaborators_unified'));
          targetCollaborators = unifiedSnapshot.docs.map(doc => doc.id);
          console.log(`✅ Productivity: Usando coleção unificada - ${targetCollaborators.length} colaboradores`);
        } catch (error) {
          console.log('⚠️ Productivity: Fallback para coleção antiga');
          const collaboratorsSnapshot = await getDocs(collection(db, 'collaborators'));
          targetCollaborators = collaboratorsSnapshot.docs.map(doc => doc.id);
        }
      }

      // Calcular métricas para cada colaborador
      const collaboratorMetrics: ProductivityMetrics[] = [];
      
      for (const collaboratorId of targetCollaborators) {
        try {
          const metrics = await this.calculateProductivityMetrics(
            collaboratorId, 
            period.type, 
            period.start, 
            period.end
          );
          collaboratorMetrics.push(metrics);
        } catch (error) {
          console.warn(`⚠️ Erro ao calcular métricas para colaborador ${collaboratorId}:`, error);
        }
      }

      // Calcular summary
      const totalHoursWorked = collaboratorMetrics.reduce((sum, m) => sum + m.totalHoursWorked, 0);
      const totalTasksCompleted = collaboratorMetrics.reduce((sum, m) => sum + m.tasksCompleted, 0);
      const averageProductivity = collaboratorMetrics.length > 0 
        ? collaboratorMetrics.reduce((sum, m) => sum + m.qualityScore, 0) / collaboratorMetrics.length
        : 0;

      // Top e bottom performers
      const sortedByScore = [...collaboratorMetrics]
        .sort((a, b) => b.qualityScore - a.qualityScore);
      
      const topPerformers = sortedByScore.slice(0, 5).map((metrics, index) => ({
        collaboratorId: metrics.collaboratorId,
        collaboratorName: `Colaborador ${metrics.collaboratorId}`, // Buscar nome real depois
        score: metrics.qualityScore
      }));

      const bottomPerformers = sortedByScore.slice(-5).reverse().map((metrics, index) => ({
        collaboratorId: metrics.collaboratorId,
        collaboratorName: `Colaborador ${metrics.collaboratorId}`, // Buscar nome real depois
        score: metrics.qualityScore
      }));

      // Gerar insights automáticos
      const insights = this.generateInsights(collaboratorMetrics);

      const report: Omit<ProductivityReport, 'id'> = {
        title: `Relatório de Produtividade - ${type}`,
        type,
        collaboratorIds: targetCollaborators,
        departmentIds,
        period,
        summary: {
          totalCollaborators: collaboratorMetrics.length,
          totalHoursWorked,
          totalTasksCompleted,
          averageProductivity,
          topPerformers,
          bottomPerformers
        },
        insights,
        collaboratorMetrics,
        generatedBy: 'system', // Pode ser substituído pelo usuário atual
        generatedByName: 'Sistema Automático',
        generatedAt: new Date()
      };

      // Salvar relatório
      const docRef = await addDoc(collection(db, 'productivityReports'), {
        ...report,
        period: {
          ...report.period,
          start: Timestamp.fromDate(report.period.start),
          end: Timestamp.fromDate(report.period.end)
        },
        generatedAt: serverTimestamp()
      });

      console.log('✅ Relatório de produtividade gerado:', docRef.id);
      
      return { id: docRef.id, ...report };
    } catch (error) {
      console.error('❌ Erro ao gerar relatório de produtividade:', error);
      throw error;
    }
  }

  // =================== PRODUCTIVITY ALERTS ===================

  static async checkProductivityAlerts(collaboratorId: string): Promise<ProductivityAlert[]> {
    try {
      const alerts: ProductivityAlert[] = [];
      
      // Buscar métricas recentes do colaborador
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const metrics = await this.calculateProductivityMetrics(
        collaboratorId, 
        'week', 
        weekAgo, 
        now
      );

      // Verificar produtividade baixa
      if (metrics.qualityScore < 50) {
        alerts.push({
          id: `low_prod_${collaboratorId}_${Date.now()}`,
          type: 'low_productivity',
          severity: 'warning',
          collaboratorId,
          collaboratorName: `Colaborador ${collaboratorId}`,
          title: 'Produtividade Baixa Detectada',
          description: `Score de qualidade atual: ${metrics.qualityScore}% (abaixo de 50%)`,
          currentValue: metrics.qualityScore,
          expectedValue: 70,
          threshold: 50,
          status: 'active',
          suggestedActions: [
            'Revisar carga de trabalho atual',
            'Verificar se há bloqueios nas tarefas',
            'Considerar treinamento adicional',
            'Agendar conversa individual'
          ],
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      // Verificar overtime excessivo
      if (metrics.overtimeHours > 10) {
        alerts.push({
          id: `overtime_${collaboratorId}_${Date.now()}`,
          type: 'overtime',
          severity: 'critical',
          collaboratorId,
          collaboratorName: `Colaborador ${collaboratorId}`,
          title: 'Excesso de Horas Extras',
          description: `${metrics.overtimeHours.toFixed(1)} horas extras na semana`,
          currentValue: metrics.overtimeHours,
          expectedValue: 5,
          threshold: 10,
          status: 'active',
          suggestedActions: [
            'Redistribuir carga de trabalho',
            'Verificar eficiência dos processos',
            'Considerar contratação de apoio',
            'Revisar prazos dos projetos'
          ],
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      // Verificar problemas de qualidade (muitas tarefas atrasadas)
      if (metrics.tasksCompletedLate > metrics.tasksCompletedOnTime && metrics.tasksCompletedLate > 3) {
        alerts.push({
          id: `quality_${collaboratorId}_${Date.now()}`,
          type: 'quality_issue',
          severity: 'warning',
          collaboratorId,
          collaboratorName: `Colaborador ${collaboratorId}`,
          title: 'Problemas de Cumprimento de Prazos',
          description: `${metrics.tasksCompletedLate} tarefas entregues com atraso`,
          currentValue: metrics.tasksCompletedLate,
          expectedValue: 2,
          threshold: 3,
          status: 'active',
          suggestedActions: [
            'Revisar estimativas de tempo',
            'Melhorar planejamento de tarefas',
            'Identificar e remover bloqueios',
            'Treinamento em gestão de tempo'
          ],
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      return alerts;
    } catch (error) {
      console.error('❌ Erro ao verificar alertas de produtividade:', error);
      throw error;
    }
  }

  // =================== HELPER METHODS ===================

  private static getWorkDaysBetween(startDate: Date, endDate: Date): number {
    let count = 0;
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Não é domingo (0) nem sábado (6)
        count++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return count;
  }

  private static calculateMostProductiveHour(timeTrackings: TimeTracking[]): number {
    const hourCounts: Record<number, number> = {};
    
    timeTrackings.forEach(tracking => {
      const hour = tracking.startTime.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + tracking.activeTime;
    });

    let maxHour = 9; // padrão 9h
    let maxTime = 0;
    
    Object.entries(hourCounts).forEach(([hour, time]) => {
      if (time > maxTime) {
        maxTime = time;
        maxHour = parseInt(hour);
      }
    });

    return maxHour;
  }

  private static calculateMostProductiveDay(timeTrackings: TimeTracking[]): string {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayCounts: Record<string, number> = {};
    
    timeTrackings.forEach(tracking => {
      const dayName = dayNames[tracking.startTime.getDay()];
      dayCounts[dayName] = (dayCounts[dayName] || 0) + tracking.activeTime;
    });

    let maxDay = 'monday';
    let maxTime = 0;
    
    Object.entries(dayCounts).forEach(([day, time]) => {
      if (time > maxTime) {
        maxTime = time;
        maxDay = day;
      }
    });

    return maxDay;
  }

  private static generateInsights(metrics: ProductivityMetrics[]): {
    trends: string[];
    recommendations: string[];
    alerts: string[];
  } {
    const insights = {
      trends: [] as string[],
      recommendations: [] as string[],
      alerts: [] as string[]
    };

    if (metrics.length === 0) {
      return insights;
    }

    const avgQuality = metrics.reduce((sum, m) => sum + m.qualityScore, 0) / metrics.length;
    const avgHours = metrics.reduce((sum, m) => sum + m.totalHoursWorked, 0) / metrics.length;
    const overtimeCount = metrics.filter(m => m.overtimeHours > 5).length;

    // Trends
    if (avgQuality > 80) {
      insights.trends.push('📈 Equipe apresenta alta performance geral');
    } else if (avgQuality < 60) {
      insights.trends.push('📉 Performance da equipe abaixo do esperado');
    }

    if (avgHours > 45) {
      insights.trends.push('⏰ Carga de trabalho elevada detectada');
    }

    // Recommendations
    if (overtimeCount > metrics.length * 0.3) {
      insights.recommendations.push('Revisar distribuição de carga de trabalho');
      insights.recommendations.push('Considerar contratação de pessoal adicional');
    }

    if (avgQuality < 70) {
      insights.recommendations.push('Implementar programa de treinamento');
      insights.recommendations.push('Revisar processos e ferramentas');
    }

    // Alerts
    if (overtimeCount > metrics.length * 0.5) {
      insights.alerts.push('⚠️ Mais de 50% da equipe em overtime');
    }

    const lowPerformers = metrics.filter(m => m.qualityScore < 50).length;
    if (lowPerformers > metrics.length * 0.2) {
      insights.alerts.push('⚠️ Múltiplos colaboradores com performance baixa');
    }

    return insights;
  }

  // Método removido - estava duplicado
} 