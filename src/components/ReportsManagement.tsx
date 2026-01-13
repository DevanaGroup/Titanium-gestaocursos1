import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  FileText, Download, Calendar, Users, DollarSign, 
  TrendingUp, BarChart3, Clock, Target, AlertTriangle,
  Building2, CheckCircle, XCircle, Loader2, Filter
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ReportsService, DashboardData } from "@/services/reportsService";

const CHART_COLORS = {
  primary: "#1E5128",
  secondary: "#4E9F3D", 
  accent: "#D8E9A8",
  warning: "#F59E0B",
  danger: "#EF4444",
  success: "#10B981",
  info: "#3B82F6"
};

const TASK_STATUS_COLORS = {
  "Pendente": CHART_COLORS.warning,
  "Em andamento": CHART_COLORS.info,
  "Concluída": CHART_COLORS.success,
  "Bloqueada": CHART_COLORS.danger
};

const PRIORITY_COLORS = {
  "Baixa": CHART_COLORS.success,
  "Média": CHART_COLORS.warning,
  "Alta": CHART_COLORS.danger,
  "Urgente": "#DC2626"
};

export const ReportsManagement = () => {
  const [activeReport, setActiveReport] = useState("dashboard");
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filterBy, setFilterBy] = useState("all");

  const reportCategories = [
    {
      id: "dashboard",
      title: "Dashboard Executivo",
      description: "Visão geral com principais KPIs",
      icon: <BarChart3 className="w-5 h-5" />,
      color: "bg-blue-500"
    },
    {
      id: "productivity",
      title: "Produtividade",
      description: "Desempenho da equipe e projetos",
      icon: <Target className="w-5 h-5" />,
      color: "bg-green-500"
    },
    {
      id: "financial",
      title: "Financeiro",
      description: "Receitas, despesas e inadimplência",
      icon: <DollarSign className="w-5 h-5" />,
      color: "bg-yellow-500"
    },
    {
      id: "resources",
      title: "Recursos",
      description: "Carga de trabalho e utilização",
      icon: <Users className="w-5 h-5" />,
      color: "bg-purple-500"
    }
  ];

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    setIsLoading(true);
    try {
      const data = await ReportsService.getDashboardData();
      setDashboardData(data);
    } catch (error) {
      console.error("Erro ao carregar dados dos relatórios:", error);
      toast.error("Erro ao carregar dados dos relatórios");
    } finally {
      setIsLoading(false);
    }
  };

  const generateReport = async (reportType: string) => {
    setIsLoading(true);
    try {
      let report;
      switch (reportType) {
        case 'productivity':
          report = await ReportsService.generateProductivityReport();
          break;
        case 'financial':
          report = await ReportsService.generateFinancialReport(new Date(), new Date());
          break;
        case 'resources':
          report = await ReportsService.generateResourceReport();
          break;
        default:
          throw new Error("Tipo de relatório não suportado");
      }
      
      toast.success(`Relatório de ${reportType} gerado com sucesso!`);
    } catch (error) {
      toast.error("Erro ao gerar relatório");
    } finally {
      setIsLoading(false);
    }
  };

  const exportReport = async (format: 'pdf' | 'excel') => {
    if (!dashboardData) {
      toast.error("Nenhum dado disponível para exportação");
      return;
    }

    try {
      setIsLoading(true);
      
      if (format === 'pdf') {
        await ReportsService.exportToPDF(dashboardData);
      } else {
        await ReportsService.exportToExcel(dashboardData);
      }
      
      toast.success(`Relatório exportado em ${format.toUpperCase()} com sucesso!`);
    } catch (error) {
      toast.error("Erro ao exportar relatório");
    } finally {
      setIsLoading(false);
    }
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 80) return "text-green-600";
    if (efficiency >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getEfficiencyBadge = (efficiency: number) => {
    if (efficiency >= 80) return <Badge className="bg-green-100 text-green-800">Excelente</Badge>;
    if (efficiency >= 60) return <Badge className="bg-yellow-100 text-yellow-800">Bom</Badge>;
    return <Badge className="bg-red-100 text-red-800">Precisa Melhorar</Badge>;
  };

  if (isLoading && !dashboardData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Carregando relatórios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Relatórios</h2>
          <p className="text-muted-foreground">
            Visão completa da operação e desempenho da empresa
          </p>
        </div>

      </div>

      <Tabs value={activeReport} onValueChange={setActiveReport} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          {reportCategories.map((category) => (
            <TabsTrigger key={category.id} value={category.id} className="flex items-center gap-2">
              {category.icon}
              <span className="hidden sm:inline">{category.title}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Dashboard Executivo */}
        <TabsContent value="dashboard" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Dashboard Executivo
              </CardTitle>
              <CardDescription>
                Principais indicadores de desempenho da empresa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Projetos Ativos</p>
                      <p className="text-2xl font-bold">{dashboardData?.metrics.activeProjects || 0}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="flex items-center mt-2">
                    <span className="text-sm text-muted-foreground">
                      {dashboardData?.metrics.totalProjects || 0} total
                    </span>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Receita Mensal</p>
                      <p className="text-2xl font-bold">
                        R$ {(dashboardData?.metrics.monthlyRevenue || 0).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-sm text-green-600">Clientes ativos</span>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Score de Qualidade</p>
                      <p className="text-2xl font-bold">{dashboardData?.metrics.averageQualityScore || 0}%</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <Target className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                  <div className="flex items-center mt-2">
                    <span className="text-sm text-muted-foreground">
                      Média da equipe
                    </span>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Horas Trabalhadas</p>
                      <p className="text-2xl font-bold">{Math.round(dashboardData?.metrics.totalHoursWorked || 0)}h</p>
                    </div>
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                      <Clock className="w-6 h-6 text-indigo-600" />
                    </div>
                  </div>
                  <div className="flex items-center mt-2">
                    <span className="text-sm text-muted-foreground">
                      Este mês
                    </span>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Tarefas Concluídas</p>
                      <p className="text-2xl font-bold">{dashboardData?.metrics.completedTasks || 0}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                  <div className="flex items-center mt-2">
                    <span className="text-sm text-muted-foreground">
                      {dashboardData?.metrics.totalCollaborators || 0} colaboradores
                    </span>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Metas Ativas</p>
                      <p className="text-2xl font-bold">{dashboardData?.metrics.activeGoals || 0}</p>
                    </div>
                    <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                      <Target className="w-6 h-6 text-yellow-600" />
                    </div>
                  </div>
                  <div className="flex items-center mt-2">
                    <span className="text-sm text-muted-foreground">
                      {dashboardData?.metrics.achievedGoals || 0} atingidas
                    </span>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Alertas Ativos</p>
                      <p className="text-2xl font-bold text-orange-600">{dashboardData?.metrics.totalAlerts || 0}</p>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                  <div className="mt-2">
                    {(dashboardData?.metrics.criticalAlerts || 0) > 0 ? (
                      <Badge variant="destructive">{dashboardData?.metrics.criticalAlerts} críticos</Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-800">Tudo bem</Badge>
                    )}
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Tarefas em Atraso</p>
                      <p className="text-2xl font-bold text-orange-600">{dashboardData?.metrics.overdueTasks || 0}</p>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                  <div className="mt-2">
                    {(dashboardData?.metrics.overdueTasks || 0) > 0 ? (
                      <Badge variant="destructive">Atenção</Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-800">Em dia</Badge>
                    )}
                  </div>
                </Card>
              </div>

              {/* Gráficos do Dashboard */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Status dos Projetos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={dashboardData?.charts.projectsByStatus || []}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {(dashboardData?.charts.projectsByStatus || []).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Evolução Financeira</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={dashboardData?.charts.monthlyRevenueData || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, '']}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="revenue" 
                          stroke={CHART_COLORS.success} 
                          strokeWidth={2}
                          name="Receita"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="expenses" 
                          stroke={CHART_COLORS.danger} 
                          strokeWidth={2}
                          name="Despesas"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Relatórios de Produtividade */}
        <TabsContent value="productivity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Relatórios de Produtividade
              </CardTitle>
              <CardDescription>
                Análise detalhada do desempenho da equipe e projetos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Distribuição de Tarefas por Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={dashboardData?.charts.tasksByStatus || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" name="Quantidade">
                          {(dashboardData?.charts.tasksByStatus || []).map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={TASK_STATUS_COLORS[entry.name as keyof typeof TASK_STATUS_COLORS] || CHART_COLORS.primary} 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Tarefas por Prioridade</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={dashboardData?.charts.tasksByPriority || []}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {(dashboardData?.charts.tasksByPriority || []).map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={PRIORITY_COLORS[entry.name as keyof typeof PRIORITY_COLORS] || CHART_COLORS.primary}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Tendências de Produtividade</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={dashboardData?.charts.productivityTrends || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="qualityScore" 
                          stroke={CHART_COLORS.primary}
                          strokeWidth={2}
                          name="Score de Qualidade (%)"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="efficiency" 
                          stroke={CHART_COLORS.secondary}
                          strokeWidth={2}
                          name="Eficiência (%)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Distribuição de Tempo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={dashboardData?.charts.timeDistribution || []}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="hours"
                          nameKey="name"
                          label={({ name, percentage }) => `${name}: ${percentage}%`}
                        >
                          {(dashboardData?.charts.timeDistribution || []).map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={index === 0 ? CHART_COLORS.success : CHART_COLORS.warning}
                            />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [`${value}h`, '']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Top Performers</CardTitle>
                    <CardDescription>Colaboradores com melhor desempenho</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Colaborador</TableHead>
                          <TableHead>Tarefas Concluídas</TableHead>
                          <TableHead>Score de Qualidade</TableHead>
                          <TableHead>Horas Trabalhadas</TableHead>
                          <TableHead>Eficiência</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(dashboardData?.lists.topPerformers || []).slice(0, 10).map((performer, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{performer.name}</TableCell>
                            <TableCell>{performer.completedTasks}</TableCell>
                            <TableCell>
                              <span className={getEfficiencyColor(performer.qualityScore)}>
                                {performer.qualityScore}%
                              </span>
                            </TableCell>
                            <TableCell>{Math.round(performer.hoursWorked)}h</TableCell>
                            <TableCell>
                              {getEfficiencyBadge(performer.efficiency)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Tarefas Urgentes</CardTitle>
                    <CardDescription>Necessitam atenção imediata</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(dashboardData?.lists.urgentTasks || []).length > 0 ? (
                        (dashboardData?.lists.urgentTasks || []).map((task) => (
                          <div key={task.id} className="p-3 border border-red-200 bg-red-50 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-red-800">{task.title}</p>
                                <p className="text-sm text-red-600">
                                  Prazo: {format(new Date(task.dueDate), 'dd/MM/yyyy', { locale: ptBR })}
                                </p>
                              </div>
                              <Badge variant="destructive">Urgente</Badge>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4">
                          <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                          <p className="text-muted-foreground">Nenhuma tarefa urgente!</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-lg">Produtividade por Colaborador</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Colaborador</TableHead>
                        <TableHead>Tarefas Concluídas</TableHead>
                        <TableHead>Tarefas Pendentes</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Eficiência</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(dashboardData?.charts.collaboratorProductivity || []).map((collab, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{collab.name}</TableCell>
                          <TableCell>{collab.completed}</TableCell>
                          <TableCell>{collab.pending}</TableCell>
                          <TableCell>{collab.total}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress 
                                value={collab.total > 0 ? (collab.completed / collab.total) * 100 : 0} 
                                className="w-16"
                              />
                              <span className="text-sm">
                                {collab.total > 0 ? Math.round((collab.completed / collab.total) * 100) : 0}%
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Relatórios Financeiros */}
        <TabsContent value="financial" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Relatórios Financeiros
              </CardTitle>
              <CardDescription>
                Análise completa da situação financeira da empresa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Card className="p-4 border-l-4 border-l-emerald-500">
                  <h3 className="font-semibold">Receitas Mensais</h3>
                  <p className="text-2xl font-bold text-emerald-600">
                    R$ {(dashboardData?.metrics.monthlyRevenue || 0).toLocaleString('pt-BR')}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Receita recorrente mensal
                  </p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => generateReport('financial')}>
                    <FileText className="w-4 h-4 mr-2" />
                    Gerar Relatório
                  </Button>
                </Card>

                <Card className="p-4 border-l-4 border-l-red-500">
                  <h3 className="font-semibold">Inadimplência</h3>
                  <p className="text-2xl font-bold text-red-600">0</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Clientes em atraso
                  </p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => generateReport('financial')}>
                    <FileText className="w-4 h-4 mr-2" />
                    Gerar Relatório
                  </Button>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Evolução Financeira - Últimos 6 Meses</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={dashboardData?.charts.monthlyRevenueData || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, '']}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke={CHART_COLORS.success} 
                        strokeWidth={3}
                        name="Receita"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="expenses" 
                        stroke={CHART_COLORS.danger} 
                        strokeWidth={3}
                        name="Despesas"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Relatórios de Recursos */}
        <TabsContent value="resources" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Gestão de Recursos
              </CardTitle>
              <CardDescription>
                Análise da utilização e distribuição de recursos da empresa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Card className="p-4 border-l-4 border-l-purple-500">
                  <h3 className="font-semibold">Carga de Trabalho</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Distribuição de tarefas por colaborador
                  </p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => generateReport('resources')}>
                    <FileText className="w-4 h-4 mr-2" />
                    Gerar Relatório
                  </Button>
                </Card>

                <Card className="p-4 border-l-4 border-l-indigo-500">
                  <h3 className="font-semibold">Agenda Executiva</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Compromissos e reuniões
                  </p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => generateReport('resources')}>
                    <Calendar className="w-4 h-4 mr-2" />
                    Gerar Relatório
                  </Button>
                </Card>

                <Card className="p-4 border-l-4 border-l-teal-500">
                  <h3 className="font-semibold">Utilização de Recursos</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Aproveitamento da equipe
                  </p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => generateReport('resources')}>
                    <FileText className="w-4 h-4 mr-2" />
                    Gerar Relatório
                  </Button>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Distribuição da Carga de Trabalho</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart 
                      data={dashboardData?.charts.collaboratorProductivity || []}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={100}
                      />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="completed" stackId="a" fill={CHART_COLORS.success} name="Concluídas" />
                      <Bar dataKey="pending" stackId="a" fill={CHART_COLORS.warning} name="Pendentes" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}; 