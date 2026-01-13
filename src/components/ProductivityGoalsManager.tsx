import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Target,
  Plus,
  Edit,
  Trash2,
  Calendar,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { ProductivityService } from '@/services/productivityService';
import { ProductivityGoals, Collaborator } from '@/types';
import { format, addDays, addWeeks, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface ProductivityGoalsManagerProps {
  collaboratorId?: string;
  collaborators?: Collaborator[];
  showTeamGoals?: boolean;
}

export const ProductivityGoalsManager: React.FC<ProductivityGoalsManagerProps> = ({
  collaboratorId,
  collaborators = [],
  showTeamGoals = false
}) => {
  const [goals, setGoals] = useState<ProductivityGoals[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<ProductivityGoals | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    collaboratorId: collaboratorId || '',
    period: 'weekly' as 'daily' | 'weekly' | 'monthly' | 'quarterly',
    startDate: new Date(),
    endDate: new Date(),
    tasksGoal: 10,
    hoursGoal: 40,
    qualityScoreGoal: 80
  });

  useEffect(() => {
    loadGoals();
  }, [collaboratorId]);

  useEffect(() => {
    // Auto-calculate end date based on period
    const startDate = formData.startDate;
    let endDate: Date;

    switch (formData.period) {
      case 'daily':
        endDate = addDays(startDate, 1);
        break;
      case 'weekly':
        endDate = addDays(startDate, 7);
        break;
      case 'monthly':
        endDate = addMonths(startDate, 1);
        break;
      case 'quarterly':
        endDate = addMonths(startDate, 3);
        break;
      default:
        endDate = addDays(startDate, 7);
    }

    setFormData(prev => ({ ...prev, endDate }));
  }, [formData.period, formData.startDate]);

  const loadGoals = async () => {
    setIsLoading(true);
    try {
      if (collaboratorId) {
        const collaboratorGoals = await ProductivityService.getProductivityGoalsByCollaborator(collaboratorId);
        setGoals(collaboratorGoals);
      } else if (showTeamGoals) {
        // Load goals for all collaborators
        let allGoals: ProductivityGoals[] = [];
        for (const collaborator of collaborators) {
          try {
            const collabGoals = await ProductivityService.getProductivityGoalsByCollaborator(collaborator.id);
            allGoals = [...allGoals, ...collabGoals];
          } catch (error) {
            console.warn(`Erro ao carregar metas do colaborador ${collaborator.id}:`, error);
          }
        }
        setGoals(allGoals);
      }
    } catch (error) {
      console.error('Erro ao carregar metas:', error);
      toast.error('Erro ao carregar metas de produtividade');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGoal = async () => {
    try {
      setIsLoading(true);

      const newGoal: Omit<ProductivityGoals, 'id'> = {
        collaboratorId: formData.collaboratorId,
        period: formData.period,
        startDate: formData.startDate,
        endDate: formData.endDate,
        tasksGoal: formData.tasksGoal,
        hoursGoal: formData.hoursGoal,
        qualityScoreGoal: formData.qualityScoreGoal,
        tasksCompleted: 0,
        hoursWorked: 0,
        currentQualityScore: 0,
        status: 'Em andamento',
        createdBy: 'current-user', // Substituir pelo usuário atual
        createdByName: 'Usuário Atual',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const goalId = await ProductivityService.createProductivityGoal(newGoal);
      
      toast.success('Meta criada com sucesso!');
      setIsCreateDialogOpen(false);
      
      // Reset form
      setFormData({
        collaboratorId: collaboratorId || '',
        period: 'weekly',
        startDate: new Date(),
        endDate: new Date(),
        tasksGoal: 10,
        hoursGoal: 40,
        qualityScoreGoal: 80
      });

      loadGoals();
    } catch (error) {
      console.error('Erro ao criar meta:', error);
      toast.error('Erro ao criar meta de produtividade');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateGoal = async () => {
    if (!selectedGoal) return;

    try {
      setIsLoading(true);

      await ProductivityService.updateProductivityGoal(selectedGoal.id, {
        tasksGoal: formData.tasksGoal,
        hoursGoal: formData.hoursGoal,
        qualityScoreGoal: formData.qualityScoreGoal,
        updatedAt: new Date()
      });

      toast.success('Meta atualizada com sucesso!');
      setIsEditDialogOpen(false);
      setSelectedGoal(null);
      loadGoals();
    } catch (error) {
      console.error('Erro ao atualizar meta:', error);
      toast.error('Erro ao atualizar meta');
    } finally {
      setIsLoading(false);
    }
  };

  const getGoalStatusBadge = (goal: ProductivityGoals) => {
    switch (goal.status) {
      case 'Atingida':
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Atingida</Badge>;
      case 'Perdida':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Perdida</Badge>;
      case 'Cancelada':
        return <Badge variant="secondary"><Trash2 className="h-3 w-3 mr-1" />Cancelada</Badge>;
      default:
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Em andamento</Badge>;
    }
  };

  const getCollaboratorName = (collaboratorId: string): string => {
    const collaborator = collaborators.find(c => c.id === collaboratorId);
    return collaborator ? `${collaborator.firstName} ${collaborator.lastName}` : 'Colaborador Desconhecido';
  };

  const calculateProgress = (goal: ProductivityGoals) => {
    const tasksProgress = goal.tasksGoal > 0 ? (goal.tasksCompleted / goal.tasksGoal) * 100 : 0;
    const hoursProgress = goal.hoursGoal > 0 ? (goal.hoursWorked / goal.hoursGoal) * 100 : 0;
    const qualityProgress = goal.qualityScoreGoal > 0 ? (goal.currentQualityScore / goal.qualityScoreGoal) * 100 : 0;
    
    return {
      tasks: Math.min(tasksProgress, 100),
      hours: Math.min(hoursProgress, 100),
      quality: Math.min(qualityProgress, 100),
      overall: Math.min((tasksProgress + hoursProgress + qualityProgress) / 3, 100)
    };
  };

  const periodLabels = {
    daily: 'Diária',
    weekly: 'Semanal',
    monthly: 'Mensal',
    quarterly: 'Trimestral'
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold">Metas de Produtividade</h3>
          <p className="text-muted-foreground">
            Defina e acompanhe metas para aumentar a produtividade
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Meta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Criar Nova Meta</DialogTitle>
              <DialogDescription>
                Defina uma nova meta de produtividade
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {!collaboratorId && (
                <div className="space-y-2">
                  <Label htmlFor="collaborator">Colaborador</Label>
                  <Select 
                    value={formData.collaboratorId} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, collaboratorId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um colaborador" />
                    </SelectTrigger>
                    <SelectContent>
                      {collaborators.map((collaborator) => (
                        <SelectItem key={collaborator.id} value={collaborator.id}>
                          {collaborator.firstName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="period">Período</Label>
                <Select 
                  value={formData.period} 
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, period: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diária</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="quarterly">Trimestral</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">Data de Início</Label>
                <DatePicker
                  date={formData.startDate}
                  onDateChange={(date) => date && setFormData(prev => ({ ...prev, startDate: date }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tasksGoal">Meta de Tarefas</Label>
                  <Input
                    type="number"
                    value={formData.tasksGoal}
                    onChange={(e) => setFormData(prev => ({ ...prev, tasksGoal: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hoursGoal">Meta de Horas</Label>
                  <Input
                    type="number"
                    value={formData.hoursGoal}
                    onChange={(e) => setFormData(prev => ({ ...prev, hoursGoal: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="qualityGoal">Meta de Qualidade (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.qualityScoreGoal}
                  onChange={(e) => setFormData(prev => ({ ...prev, qualityScoreGoal: parseInt(e.target.value) || 0 }))}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateGoal} disabled={isLoading}>
                  {isLoading ? 'Criando...' : 'Criar Meta'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de metas */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : goals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-16 w-16 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mt-4">Nenhuma meta encontrada</h3>
            <p className="text-muted-foreground text-center mt-2">
              Crie sua primeira meta de produtividade para começar a acompanhar o progresso
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {goals.map((goal) => {
            const progress = calculateProgress(goal);
            
            return (
              <Card key={goal.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        Meta {periodLabels[goal.period]}
                        {showTeamGoals && (
                          <span className="text-sm font-normal text-muted-foreground">
                            - {getCollaboratorName(goal.collaboratorId)}
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {format(goal.startDate, 'dd/MM/yyyy', { locale: ptBR })} até{' '}
                        {format(goal.endDate, 'dd/MM/yyyy', { locale: ptBR })}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {getGoalStatusBadge(goal)}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedGoal(goal);
                          setFormData({
                            collaboratorId: goal.collaboratorId,
                            period: goal.period,
                            startDate: goal.startDate,
                            endDate: goal.endDate,
                            tasksGoal: goal.tasksGoal,
                            hoursGoal: goal.hoursGoal,
                            qualityScoreGoal: goal.qualityScoreGoal
                          });
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Progress geral */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium">Progresso Geral</span>
                        <span>{progress.overall.toFixed(1)}%</span>
                      </div>
                      <Progress value={progress.overall} className="h-2" />
                    </div>

                    {/* Métricas individuais */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Tarefas</span>
                          <span>{goal.tasksCompleted} / {goal.tasksGoal}</span>
                        </div>
                        <Progress value={progress.tasks} />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Horas</span>
                          <span>{goal.hoursWorked.toFixed(1)} / {goal.hoursGoal}</span>
                        </div>
                        <Progress value={progress.hours} />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Qualidade</span>
                          <span>{goal.currentQualityScore}% / {goal.qualityScoreGoal}%</span>
                        </div>
                        <Progress value={progress.quality} />
                      </div>
                    </div>

                    {/* Análise do progresso */}
                    <div className="text-sm text-muted-foreground">
                      {progress.overall >= 100 ? (
                        <span className="text-green-600 font-medium">🎉 Meta atingida! Parabéns!</span>
                      ) : progress.overall >= 80 ? (
                        <span className="text-blue-600 font-medium">🔥 Muito perto da meta!</span>
                      ) : progress.overall >= 50 ? (
                        <span className="text-yellow-600 font-medium">📈 Bom progresso, continue assim!</span>
                      ) : (
                        <span className="text-orange-600 font-medium">⚡ Vamos acelerar o ritmo!</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog de edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Meta</DialogTitle>
            <DialogDescription>
              Ajuste os valores da meta de produtividade
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tasksGoal">Meta de Tarefas</Label>
                <Input
                  type="number"
                  value={formData.tasksGoal}
                  onChange={(e) => setFormData(prev => ({ ...prev, tasksGoal: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hoursGoal">Meta de Horas</Label>
                <Input
                  type="number"
                  value={formData.hoursGoal}
                  onChange={(e) => setFormData(prev => ({ ...prev, hoursGoal: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="qualityGoal">Meta de Qualidade (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.qualityScoreGoal}
                onChange={(e) => setFormData(prev => ({ ...prev, qualityScoreGoal: parseInt(e.target.value) || 0 }))}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdateGoal} disabled={isLoading}>
                {isLoading ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}; 