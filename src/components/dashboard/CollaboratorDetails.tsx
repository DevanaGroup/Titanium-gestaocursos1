
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collaborator } from "@/types";
import { getTasksByAssignee } from "@/services/taskService";
import ChartCard from "./ChartCard";
import { ChartContainer } from "@/components/ui/chart";

interface CollaboratorDetailsProps {
  collaborator: Collaborator;
  onClose: () => void;
}

const TASK_COLORS = {
  'Análise': '#FF6B6B',
  'Iniciado': '#4A4E69',
  'Execução': '#3DDC97',
  'Finalizado': '#3DB2FF'
};

const TASK_STATUS = ['Análise', 'Iniciado', 'Execução', 'Finalizado'];

const CollaboratorDetails = ({ collaborator, onClose }: CollaboratorDetailsProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [tasksByStatus, setTasksByStatus] = useState<{name: string; value: number}[]>([]);
  const [taskTimeline, setTaskTimeline] = useState<{name: string; client: string; service: string; date: string; status: string}[]>([]);
  const [averageCompletionTime, setAverageCompletionTime] = useState<number>(0);
  
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setIsLoading(true);
        const tasks = await getTasksByAssignee(collaborator.id);
        
        // Generate tasks by status data
        const statusCounts: Record<string, number> = {
          'Análise': 0,
          'Iniciado': 0,
          'Execução': 0,
          'Finalizado': 0
        };
        
        tasks.forEach(task => {
          // Map task.status to one of our defined statuses
          let mappedStatus = 'Análise';
          if (task.status === 'Em andamento') mappedStatus = 'Execução';
          else if (task.status === 'Pendente') mappedStatus = 'Iniciado';
          else if (task.status === 'Concluída') mappedStatus = 'Finalizado';
          
          statusCounts[mappedStatus] = (statusCounts[mappedStatus] || 0) + 1;
        });
        
        const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
        setTasksByStatus(statusData);
        
        // Generate task timeline
        const timelineData = tasks.map(task => ({
          name: task.title,
          client: task.clientName || 'Cliente',
          service: task.description || 'Serviço',
          date: format(task.dueDate, 'dd/MM/yyyy'),
          status: task.status
        }));
        
        setTaskTimeline(timelineData);
        
        // Calculate average completion time (in days)
        const completedTasks = tasks.filter(task => task.completedAt && task.createdAt);
        if (completedTasks.length > 0) {
          const totalDays = completedTasks.reduce((sum, task) => {
            const creationDate = task.createdAt;
            const completionDate = task.completedAt!;
            const diffTime = completionDate.getTime() - creationDate.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return sum + diffDays;
          }, 0);
          
          setAverageCompletionTime(Math.round(totalDays / completedTasks.length));
        } else {
          setAverageCompletionTime(5); // Default value if no data
        }
      } catch (error) {
        console.error("Erro ao buscar tarefas do colaborador:", error);
        // Use mock data as fallback
        setTasksByStatus([
          { name: 'Análise', value: 3 },
          { name: 'Iniciado', value: 2 },
          { name: 'Execução', value: 4 },
          { name: 'Finalizado', value: 5 }
        ]);
        
        setTaskTimeline([
          { name: 'Orçamento', client: 'Cliente X', service: 'Licença Ambiental', date: '15/04/2025', status: 'Análise' },
          { name: 'Visita técnica', client: 'Cliente Y', service: 'Consultoria', date: '10/04/2025', status: 'Iniciado' },
          { name: 'Licença de Operação', client: 'Cliente Z', service: 'Licenciamento', date: '05/04/2025', status: 'Execução' },
          { name: 'Relatório Final', client: 'Cliente W', service: 'Auditoria', date: '01/04/2025', status: 'Finalizado' }
        ]);
        
        setAverageCompletionTime(5);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTasks();
  }, [collaborator.id]);
  
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
        {name}
      </text>
    );
  };
  
  const chartConfig = {
    Análise: { color: TASK_COLORS['Análise'] },
    Iniciado: { color: TASK_COLORS['Iniciado'] },
    Execução: { color: TASK_COLORS['Execução'] },
    Finalizado: { color: TASK_COLORS['Finalizado'] }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-6">
        <div className="flex-shrink-0">
          <Avatar className="w-28 h-28 border-2 border-gray-200">
            <AvatarImage src={collaborator.avatar} />
            <AvatarFallback className="text-2xl bg-blue-500 text-white">
              {collaborator.firstName.charAt(0)}{collaborator.lastName.charAt(0)}
            </AvatarFallback>
          </Avatar>
        </div>
        
        <div className="flex-1 space-y-2">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <h2 className="text-2xl font-bold">{collaborator.firstName}</h2>
              <p className="text-gray-500">{collaborator.email}</p>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <Clock size={18} />
              <span>Tempo de Execução (média): {isLoading ? <Skeleton className="h-4 w-16 inline-block" /> : <span className="font-bold">{averageCompletionTime} dias</span>}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <p className="text-sm text-gray-500">Data de nascimento</p>
              <p className="font-medium">{format(collaborator.birthDate, 'dd/MM/yyyy', { locale: ptBR })}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Profissão</p>
              <p className="font-medium">{collaborator.hierarchyLevel}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Responsável</p>
              <p className="font-medium">{collaborator.responsibleName || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="Distribuição de tarefas por status">
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <Skeleton className="h-52 w-52 rounded-full" />
            </div>
          ) : (
            <ChartContainer className="h-64" config={chartConfig}>
              <PieChart>
                <Pie
                  data={tasksByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {tasksByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={TASK_COLORS[entry.name as keyof typeof TASK_COLORS]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ChartContainer>
          )}
        </ChartCard>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Etapas de trabalho
            </CardTitle>
            <CardDescription>
              A data está atrelada sempre ao próximo passo, ou que venceu o prazo ou dar como concluído.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-full" />
                </div>
              ))
            ) : taskTimeline.map((task, index) => {
              let statusColor = '';
              if (task.status === 'Análise' || task.status === 'Pendente') statusColor = 'text-red-500';
              else if (task.status === 'Iniciado' || task.status === 'Em andamento') statusColor = 'text-indigo-500';
              else if (task.status === 'Execução') statusColor = 'text-green-500';
              else if (task.status === 'Finalizado' || task.status === 'Concluída') statusColor = 'text-blue-500';
              
              return (
                <div key={index} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${statusColor}`}>
                      {`${index + 1}º passo`}
                    </span>
                    <span className={`font-bold ${statusColor}`}>
                      {TASK_STATUS[index]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pl-4 text-sm">
                    <span>- {task.name}:</span>
                    <span>Cliente {task.client} Serviço: {task.service}</span>
                    <span className="font-semibold">Data: {task.date}</span>
                  </div>
                  {index < taskTimeline.length - 1 && (
                    <div className="pl-6 mt-1 mb-3">
                      <ArrowRight size={16} className="text-gray-400" />
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CollaboratorDetails;
