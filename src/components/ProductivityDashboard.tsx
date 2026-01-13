import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar
} from 'recharts';
import {
  Clock,
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  AlertTriangle,
  CheckCircle,
  Timer,
  BarChart3,
  PieChart as PieChartIcon,
  Award,
  Zap,
  Calendar,
  PlayCircle,
  PauseCircle,
  StopCircle
} from 'lucide-react';
import { ProductivityService } from '@/services/productivityService';
import { 
  ProductivityMetrics, 
  ProductivityGoals, 
  ProductivityAlert,
  TimeTracking,
  Collaborator
} from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface ProductivityDashboardProps {
  collaboratorId?: string;
  showTeamView?: boolean;
  showIndividualView?: boolean;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const ProductivityDashboard: React.FC<ProductivityDashboardProps> = ({
  collaboratorId,
  showTeamView = true,
  showIndividualView = true
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month' | 'quarter'>('week');
  const [selectedCollaborator, setSelectedCollaborator] = useState<string>(collaboratorId || '');
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    to: new Date()
  });

  // Estados para dados
  const [metrics, setMetrics] = useState<ProductivityMetrics[]>([]);
  const [goals, setGoals] = useState<ProductivityGoals[]>([]);
  const [alerts, setAlerts] = useState<ProductivityAlert[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Estados para time tracking
  const [activeTracking, setActiveTracking] = useState<TimeTracking | null>(null);
  const [trackingTime, setTrackingTime] = useState(0);

  useEffect(() => {
    loadDashboardData();
  }, [selectedPeriod, selectedCollaborator, dateRange]);

  // Timer para o time tracking ativo
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (activeTracking) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - activeTracking.startTime.getTime()) / 1000);
        setTrackingTime(elapsed);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTracking]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Se for visão individual
      if (selectedCollaborator) {
        const individualMetrics = await ProductivityService.calculateProductivityMetrics(
          selectedCollaborator,
          selectedPeriod,
          dateRange.from,
          dateRange.to
        );
        setMetrics([individualMetrics]);

        const individualGoals = await ProductivityService.getProductivityGoalsByCollaborator(selectedCollaborator);
        setGoals(individualGoals);

        const individualAlerts = await ProductivityService.checkProductivityAlerts(selectedCollaborator);
        setAlerts(individualAlerts);
      }
      
      // Se for visão de equipe
      if (showTeamView && !selectedCollaborator) {
        const report = await ProductivityService.generateProductivityReport(
          'team',
          {
            start: dateRange.from,
            end: dateRange.to,
            type: selectedPeriod
          }
        );
        setMetrics(report.collaboratorMetrics);
      }

    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      toast.error('Erro ao carregar dados de produtividade');
    } finally {
      setIsLoading(false);
    }
  };

  const startTimeTracking = async (taskId: string) => {
    try {
      const trackingId = await ProductivityService.startTimeTracking(
        taskId, 
        selectedCollaborator
      );
      
      const newTracking: TimeTracking = {
        id: trackingId,
        taskId,
        collaboratorId: selectedCollaborator,
        startTime: new Date(),
        pausedTime: 0,
        activeTime: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      setActiveTracking(newTracking);
      toast.success('Time tracking iniciado!');
    } catch (error) {
      console.error('Erro ao iniciar time tracking:', error);
      toast.error('Erro ao iniciar cronômetro');
    }
  };

  const stopTimeTracking = async () => {
    if (!activeTracking) return;
    
    try {
      await ProductivityService.stopTimeTracking(activeTracking.id);
      setActiveTracking(null);
      setTrackingTime(0);
      toast.success('Time tracking finalizado!');
      
      // Recarregar dados
      loadDashboardData();
    } catch (error) {
      console.error('Erro ao finalizar time tracking:', error);
      toast.error('Erro ao finalizar cronômetro');
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentMetrics = metrics[0] || null;
  const teamMetrics = metrics.length > 1 ? metrics : [];

  return (
    <div className="w-full space-y-6">
      {/* Header com controles */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-3xl font-bold">Dashboard de Produtividade</h2>
          <p className="text-muted-foreground">
            Acompanhe métricas, metas e performance em tempo real
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <Select value={selectedPeriod} onValueChange={(value: any) => setSelectedPeriod(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Dia</SelectItem>
              <SelectItem value="week">Semana</SelectItem>
              <SelectItem value="month">Mês</SelectItem>
              <SelectItem value="quarter">Trimestre</SelectItem>
            </SelectContent>
          </Select>
          
          <DatePickerWithRange
            date={dateRange}
            onDateChange={(range) => {
              if (range?.from && range?.to) {
                setDateRange({ from: range.from, to: range.to });
              }
            }}
          />
        </div>
      </div>

      {/* Time Tracking Card */}
      {selectedCollaborator && (
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              Time Tracking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                {activeTracking ? (
                  <>
                    <div className="text-3xl font-mono font-bold text-primary">
                      {formatTime(trackingTime)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Cronômetro ativo desde {format(activeTracking.startTime, 'HH:mm', { locale: ptBR })}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-muted-foreground">
                      00:00:00
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Nenhum cronômetro ativo
                    </p>
                  </>
                )}
              </div>
              
              <div className="flex gap-2">
                {activeTracking ? (
                  <Button onClick={stopTimeTracking} variant="destructive">
                    <StopCircle className="h-4 w-4 mr-2" />
                    Parar
                  </Button>
                ) : (
                  <Button onClick={() => startTimeTracking('manual')} className="bg-green-600 hover:bg-green-700">
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Iniciar
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cards de métricas principais */}
      {currentMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Score de Qualidade</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentMetrics.qualityScore}%</div>
              <p className="text-xs text-muted-foreground">
                +{currentMetrics.improvementPercentage}% vs período anterior
              </p>
              <Progress value={currentMetrics.qualityScore} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Horas Trabalhadas</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentMetrics.totalHoursWorked.toFixed(1)}h</div>
              <p className="text-xs text-muted-foreground">
                {currentMetrics.averageHoursPerDay.toFixed(1)}h por dia em média
              </p>
              {currentMetrics.overtimeHours > 0 && (
                <Badge variant="destructive" className="mt-2">
                  +{currentMetrics.overtimeHours.toFixed(1)}h extras
                </Badge>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tarefas Concluídas</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentMetrics.tasksCompleted}</div>
              <p className="text-xs text-muted-foreground">
                de {currentMetrics.tasksCreated} tarefas criadas
              </p>
              <Progress 
                value={currentMetrics.tasksCreated > 0 ? (currentMetrics.tasksCompleted / currentMetrics.tasksCreated) * 100 : 0} 
                className="mt-2" 
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Posição no Ranking</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">#{currentMetrics.rankingPosition || 'N/A'}</div>
              <p className="text-xs text-muted-foreground">
                Horário mais produtivo: {currentMetrics.mostProductiveHour}h
              </p>
              <Badge variant="outline" className="mt-2">
                {currentMetrics.mostProductiveDay}
              </Badge>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alertas */}
      {alerts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
              Alertas de Produtividade ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div>
                    <h4 className="font-medium text-amber-900">{alert.title}</h4>
                    <p className="text-sm text-amber-700">{alert.description}</p>
                  </div>
                  <Badge 
                    variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}
                  >
                    {alert.severity}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs para diferentes visões */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="trends">Tendências</TabsTrigger>
          <TabsTrigger value="goals">Metas</TabsTrigger>
          <TabsTrigger value="team">Equipe</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de produtividade por período */}
            <Card>
              <CardHeader>
                <CardTitle>Evolução da Produtividade</CardTitle>
                <CardDescription>Score de qualidade ao longo do tempo</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="periodStart" 
                      tickFormatter={(value) => format(new Date(value), 'dd/MM')}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => format(new Date(value), 'dd/MM/yyyy')}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="qualityScore" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Distribuição de tempo */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Tarefas</CardTitle>
                <CardDescription>Status das tarefas no período</CardDescription>
              </CardHeader>
              <CardContent>
                {currentMetrics && (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Concluídas', value: currentMetrics.tasksCompleted, color: '#00C49F' },
                          { name: 'Em Progresso', value: currentMetrics.tasksInProgress, color: '#FFBB28' },
                          { name: 'Pendentes', value: currentMetrics.tasksCreated - currentMetrics.tasksCompleted - currentMetrics.tasksInProgress, color: '#FF8042' }
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {[
                          { name: 'Concluídas', value: currentMetrics.tasksCompleted, color: '#00C49F' },
                          { name: 'Em Progresso', value: currentMetrics.tasksInProgress, color: '#FFBB28' },
                          { name: 'Pendentes', value: currentMetrics.tasksCreated - currentMetrics.tasksCompleted - currentMetrics.tasksInProgress, color: '#FF8042' }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Análise de Padrões</CardTitle>
              <CardDescription>Identificação de tendências de produtividade</CardDescription>
            </CardHeader>
            <CardContent>
              {currentMetrics && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{currentMetrics.mostProductiveHour}h</div>
                    <p className="text-sm text-muted-foreground">Horário mais produtivo</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{currentMetrics.mostProductiveDay}</div>
                    <p className="text-sm text-muted-foreground">Dia mais produtivo</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{currentMetrics.averageTaskDuration.toFixed(1)}h</div>
                    <p className="text-sm text-muted-foreground">Tempo médio por tarefa</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Metas de Produtividade</CardTitle>
              <CardDescription>Acompanhe o progresso das metas estabelecidas</CardDescription>
            </CardHeader>
            <CardContent>
              {goals.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="h-16 w-16 mx-auto text-muted-foreground/50" />
                  <p className="mt-4 text-muted-foreground">Nenhuma meta definida</p>
                  <Button className="mt-4">
                    Criar Nova Meta
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {goals.map((goal, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium">{goal.period}</h4>
                        <Badge variant={goal.status === 'Atingida' ? 'default' : 'secondary'}>
                          {goal.status}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Tarefas: {goal.tasksCompleted} / {goal.tasksGoal}</span>
                          <span>{Math.round((goal.tasksCompleted / goal.tasksGoal) * 100)}%</span>
                        </div>
                        <Progress value={(goal.tasksCompleted / goal.tasksGoal) * 100} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          {showTeamView && (
            <Card>
              <CardHeader>
                <CardTitle>Performance da Equipe</CardTitle>
                <CardDescription>Comparativo de produtividade entre colaboradores</CardDescription>
              </CardHeader>
              <CardContent>
                {teamMetrics.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={teamMetrics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="collaboratorId" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="qualityScore" fill="#8884d8" />
                      <Bar dataKey="totalHoursWorked" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-16 w-16 mx-auto text-muted-foreground/50" />
                    <p className="mt-4 text-muted-foreground">Dados da equipe não disponíveis</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {isLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span>Carregando dados de produtividade...</span>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}; 