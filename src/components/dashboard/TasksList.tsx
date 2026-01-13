
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Task {
  id: string;
  title: string;
  priority: string;
  status: string;
  dueDate: Date;
  assignedToName: string;
}

interface TasksListProps {
  tasks: Task[];
  title: string;
  className?: string;
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "Urgente":
      return "bg-red-500 hover:bg-red-600";
    case "Alta":
      return "bg-orange-500 hover:bg-orange-600";
    case "Média":
      return "bg-yellow-500 hover:bg-yellow-600";
    case "Baixa":
      return "bg-green-500 hover:bg-green-600";
    default:
      return "bg-slate-500 hover:bg-slate-600";
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "Concluída":
      return "bg-green-500 text-white";
    case "Em andamento":
      return "bg-blue-500 text-white";
    case "Pendente":
      return "bg-yellow-500 text-white";
    case "Bloqueada":
      return "bg-red-500 text-white";
    default:
      return "bg-slate-500 text-white";
  }
};

const TasksList: React.FC<TasksListProps> = ({ tasks, title, className }) => {
  return (
    <Card className={`shadow-sm hover:shadow-md transition-shadow ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tasks.length === 0 ? (
            <p className="text-sm text-center text-muted-foreground">Nenhuma tarefa encontrada</p>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start space-x-3 bg-background p-3 rounded-md border"
              >
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{task.title}</h4>
                  <div className="flex items-center mt-2 space-x-2">
                    <Badge variant="outline" className={getStatusColor(task.status)}>
                      {task.status}
                    </Badge>
                    <Badge variant="outline" className={getPriorityColor(task.priority)}>
                      {task.priority}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center">
                      <CalendarDays className="h-3 w-3 mr-1" />
                      {format(task.dueDate, "dd/MM", { locale: ptBR })}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-cerrado-green1 font-medium">
                  {task.assignedToName}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TasksList;
