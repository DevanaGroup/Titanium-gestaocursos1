import { useState, useEffect, useCallback } from 'react';
import { ProductivityService } from '@/services/productivityService';
import { 
  ProductivityMetrics, 
  ProductivityGoals, 
  ProductivityAlert,
  TimeTracking 
} from '@/types';

interface UseProductivityTrackerOptions {
  collaboratorId: string;
  autoRefreshInterval?: number; // em minutos
  enableAlerts?: boolean;
}

interface ProductivityData {
  metrics: ProductivityMetrics | null;
  goals: ProductivityGoals[];
  alerts: ProductivityAlert[];
  activeTracking: TimeTracking | null;
  isLoading: boolean;
  error: string | null;
}

export const useProductivityTracker = ({
  collaboratorId,
  autoRefreshInterval = 30, // 30 minutos por padrão
  enableAlerts = true
}: UseProductivityTrackerOptions) => {
  const [data, setData] = useState<ProductivityData>({
    metrics: null,
    goals: [],
    alerts: [],
    activeTracking: null,
    isLoading: false,
    error: null
  });

  // Função para carregar todas as informações de produtividade
  const loadProductivityData = useCallback(async () => {
    setData(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      // Carregar métricas da semana atual
      const metrics = await ProductivityService.calculateProductivityMetrics(
        collaboratorId,
        'week',
        weekAgo,
        now
      );

      // Carregar metas do colaborador
      const goals = await ProductivityService.getProductivityGoalsByCollaborator(collaboratorId);

      // Verificar alertas se habilitado
      let alerts: ProductivityAlert[] = [];
      if (enableAlerts) {
        alerts = await ProductivityService.checkProductivityAlerts(collaboratorId);
      }

      // Buscar time tracking ativo (se houver)
      const timeTrackings = await ProductivityService.getTimeTrackingByCollaborator(
        collaboratorId,
        new Date(now.getTime() - 24 * 60 * 60 * 1000), // últimas 24 horas
        now
      );
      
      const activeTracking = timeTrackings.find(t => !t.endTime) || null;

      setData({
        metrics,
        goals,
        alerts,
        activeTracking,
        isLoading: false,
        error: null
      });

    } catch (error) {
      console.error('Erro ao carregar dados de produtividade:', error);
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }));
    }
  }, [collaboratorId, enableAlerts]);

  // Função para iniciar time tracking
  const startTimeTracking = useCallback(async (taskId: string, description?: string) => {
    try {
      const trackingId = await ProductivityService.startTimeTracking(taskId, collaboratorId, description);
      
      // Recarregar dados para obter o time tracking ativo
      await loadProductivityData();
      
      return trackingId;
    } catch (error) {
      console.error('Erro ao iniciar time tracking:', error);
      throw error;
    }
  }, [collaboratorId, loadProductivityData]);

  // Função para parar time tracking
  const stopTimeTracking = useCallback(async () => {
    if (!data.activeTracking) {
      throw new Error('Nenhum time tracking ativo encontrado');
    }

    try {
      await ProductivityService.stopTimeTracking(data.activeTracking.id);
      
      // Recarregar dados para atualizar métricas
      await loadProductivityData();
    } catch (error) {
      console.error('Erro ao parar time tracking:', error);
      throw error;
    }
  }, [data.activeTracking, loadProductivityData]);

  // Função para pausar time tracking
  const pauseTimeTracking = useCallback(async (pauseMinutes: number) => {
    if (!data.activeTracking) {
      throw new Error('Nenhum time tracking ativo encontrado');
    }

    try {
      await ProductivityService.pauseTimeTracking(data.activeTracking.id, pauseMinutes);
      
      // Recarregar dados
      await loadProductivityData();
    } catch (error) {
      console.error('Erro ao pausar time tracking:', error);
      throw error;
    }
  }, [data.activeTracking, loadProductivityData]);

  // Função para criar uma nova meta
  const createGoal = useCallback(async (goal: Omit<ProductivityGoals, 'id'>) => {
    try {
      await ProductivityService.createProductivityGoal(goal);
      
      // Recarregar metas
      await loadProductivityData();
    } catch (error) {
      console.error('Erro ao criar meta:', error);
      throw error;
    }
  }, [loadProductivityData]);

  // Função para atualizar uma meta
  const updateGoal = useCallback(async (goalId: string, updates: Partial<ProductivityGoals>) => {
    try {
      await ProductivityService.updateProductivityGoal(goalId, updates);
      
      // Recarregar metas
      await loadProductivityData();
    } catch (error) {
      console.error('Erro ao atualizar meta:', error);
      throw error;
    }
  }, [loadProductivityData]);

  // Função para calcular tempo decorrido do tracking ativo
  const getActiveTrackingTime = useCallback(() => {
    if (!data.activeTracking) return 0;
    
    const now = Date.now();
    const start = data.activeTracking.startTime.getTime();
    const elapsed = Math.floor((now - start) / 1000); // em segundos
    
    return elapsed - (data.activeTracking.pausedTime * 60); // subtrair tempo pausado
  }, [data.activeTracking]);

  // Função para obter resumo de produtividade
  const getProductivitySummary = useCallback(() => {
    if (!data.metrics) return null;

    const completionRate = data.metrics.tasksCreated > 0 
      ? (data.metrics.tasksCompleted / data.metrics.tasksCreated) * 100 
      : 0;

    const onTimeRate = (data.metrics.tasksCompletedOnTime + data.metrics.tasksCompletedLate) > 0
      ? (data.metrics.tasksCompletedOnTime / (data.metrics.tasksCompletedOnTime + data.metrics.tasksCompletedLate)) * 100
      : 100;

    const activeGoals = data.goals.filter(g => g.status === 'Em andamento').length;
    const achievedGoals = data.goals.filter(g => g.status === 'Atingida').length;

    return {
      qualityScore: data.metrics.qualityScore,
      completionRate: Math.round(completionRate),
      onTimeRate: Math.round(onTimeRate),
      totalHours: data.metrics.totalHoursWorked,
      averageHoursPerDay: data.metrics.averageHoursPerDay,
      overtimeHours: data.metrics.overtimeHours,
      activeGoals,
      achievedGoals,
      totalAlerts: data.alerts.length,
      criticalAlerts: data.alerts.filter(a => a.severity === 'critical').length,
      hasActiveTracking: !!data.activeTracking,
      mostProductiveHour: data.metrics.mostProductiveHour,
      mostProductiveDay: data.metrics.mostProductiveDay
    };
  }, [data.metrics, data.goals, data.alerts, data.activeTracking]);

  // Carregar dados iniciais
  useEffect(() => {
    if (collaboratorId) {
      loadProductivityData();
    }
  }, [collaboratorId, loadProductivityData]);

  // Auto-refresh periódico
  useEffect(() => {
    if (!autoRefreshInterval || autoRefreshInterval <= 0) return;

    const interval = setInterval(() => {
      loadProductivityData();
    }, autoRefreshInterval * 60 * 1000); // converter para milissegundos

    return () => clearInterval(interval);
  }, [autoRefreshInterval, loadProductivityData]);

  return {
    // Dados
    ...data,
    
    // Métodos de controle
    refresh: loadProductivityData,
    startTimeTracking,
    stopTimeTracking,
    pauseTimeTracking,
    createGoal,
    updateGoal,
    
    // Utilitários
    getActiveTrackingTime,
    getProductivitySummary,
    
    // Estados computados
    hasAlerts: data.alerts.length > 0,
    hasCriticalAlerts: data.alerts.some(a => a.severity === 'critical'),
    hasActiveGoals: data.goals.some(g => g.status === 'Em andamento'),
    overallProductivityScore: data.metrics?.qualityScore || 0
  };
}; 