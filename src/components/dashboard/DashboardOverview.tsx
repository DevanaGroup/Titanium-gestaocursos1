import { useDashboardData } from "@/hooks/useDashboardData";
import StatCard from "./StatCard";
import ChartCard from "./ChartCard";
import TasksList from "./TasksList";
import EventsList from "./EventsList";
import { 
  Users, BarChart3, CheckSquare, AlertTriangle, 
  LineChart, PieChart, Clock, User, BookOpen, GraduationCap
} from "lucide-react";
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent 
} from "@/components/ui/chart";
import { 
  BarChart, 
  Bar, 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell, 
  LineChart as RechartsLineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer, 
  Tooltip, 
  Legend 
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = ["#1E5128", "#4E9F3D", "#D8E9A8", "#9DC08B", "#8D99AE", "#EDF2F4"];
const PRIORITY_COLORS = {
  "Baixa": "#4E9F3D",
  "Média": "#D8E9A8",
  "Alta": "#FF8B13",
  "Urgente": "#FF0032"
};

const STATUS_COLORS = {
  "Pendente": "#FFC93C",
  "Em andamento": "#03C988",
  "Concluída": "#0079FF",
  "Bloqueada": "#FF0032"
};

const CLIENT_STATUS_COLORS = {
  "Em andamento": "#03C988",
  "Concluído": "#0079FF",
  "Em análise": "#FFC93C",
  "Aguardando documentos": "#FF8B13"
};

const DashboardOverview = () => {
  const { data, isLoading, error } = useDashboardData();

  if (error) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Erro ao carregar dados</CardTitle>
          <CardDescription>
            Não foi possível carregar os dados do dashboard. Por favor, tente novamente mais tarde.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array(8).fill(0).map((_, i) => (
          <Card key={i} className="shadow-sm">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-[150px]" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-[100px]" />
              <Skeleton className="h-4 w-[200px] mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight mb-4">Dashboard</h2>
      
      {/* Primeira linha - Estatísticas gerais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total de Cursos" 
          value={data.coursesCount || 0} 
          icon={<BookOpen size={24} />} 
          description={`${data.coursesCount || 0} cursos cadastrados`}
        />
        <StatCard 
          title="Total de Aulas" 
          value={data.lessonsCount || 0} 
          icon={<GraduationCap size={24} />} 
          description={`${data.lessonsCount || 0} aulas cadastradas`}
        />
        <StatCard 
          title="Tarefas" 
          value={data.tasksCount} 
          icon={<CheckSquare size={24} />} 
          description={`${data.completionRate}% concluídas`}
        />
        <StatCard 
          title="Colaboradores" 
          value={data.collaboratorsCount} 
          icon={<Users size={24} />} 
          description="Equipe ativa"
        />
      </div>

      {/* Segunda linha - Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Tarefas por Status">
          <ChartContainer
            config={{
              "Pendente": { color: STATUS_COLORS.Pendente },
              "Em andamento": { color: STATUS_COLORS["Em andamento"] },
              "Concluída": { color: STATUS_COLORS.Concluída },
              "Bloqueada": { color: STATUS_COLORS.Bloqueada },
            }}
            className="h-[300px]"
          >
            <BarChart 
              data={data.tasksByStatus}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" name="Quantidade" barSize={40}>
                {data.tasksByStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS] || COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </ChartCard>

        <ChartCard title="Clientes por Status">
          <ChartContainer
            config={{
              "Em andamento": { color: CLIENT_STATUS_COLORS["Em andamento"] },
              "Concluído": { color: CLIENT_STATUS_COLORS.Concluído },
              "Em análise": { color: CLIENT_STATUS_COLORS["Em análise"] },
              "Aguardando documentos": { color: CLIENT_STATUS_COLORS["Aguardando documentos"] },
            }}
            className="h-[300px]"
          >
            <RechartsPieChart>
              <Pie
                data={data.clientsByStatus}
                cx="50%"
                cy="50%"
                labelLine={true}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {data.clientsByStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CLIENT_STATUS_COLORS[entry.name as keyof typeof CLIENT_STATUS_COLORS] || COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </RechartsPieChart>
          </ChartContainer>
        </ChartCard>
      </div>

      {/* Terceira linha - Mais gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Tarefas por Prioridade">
          <ChartContainer
            config={{
              "Baixa": { color: PRIORITY_COLORS.Baixa },
              "Média": { color: PRIORITY_COLORS.Média },
              "Alta": { color: PRIORITY_COLORS.Alta },
              "Urgente": { color: PRIORITY_COLORS.Urgente },
            }}
            className="h-[300px]"
          >
            <RechartsPieChart>
              <Pie
                data={data.tasksByPriority}
                cx="50%"
                cy="50%"
                labelLine={true}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {data.tasksByPriority.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.name as keyof typeof PRIORITY_COLORS] || COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </RechartsPieChart>
          </ChartContainer>
        </ChartCard>

        <ChartCard title="Conclusão de Tarefas (12 meses)">
          <ChartContainer
            config={{
              completionTrend: { color: "#1E5128" },
            }}
            className="h-[300px]"
          >
            <RechartsLineChart
              data={data.monthlyTaskCompletion}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="value"
                name="Tarefas concluídas"
                stroke="#1E5128"
                activeDot={{ r: 8 }}
                strokeWidth={2}
              />
            </RechartsLineChart>
          </ChartContainer>
        </ChartCard>
      </div>

      {/* Quarta linha - Tarefas e eventos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TasksList 
          tasks={data.urgentTasks} 
          title="Tarefas Prioritárias"
        />
        
        <EventsList 
          events={data.upcomingEvents} 
          title="Próximos Eventos"
        />
      </div>
    </div>
  );
};

export default DashboardOverview;
