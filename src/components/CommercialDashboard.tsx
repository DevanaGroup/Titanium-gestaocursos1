import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  Target, 
  Users, 
  DollarSign, 
  PhoneCall, 
  Calendar,
  BarChart3,
  Award,
  Clock
} from 'lucide-react';
import { auth, db } from '@/config/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  startAfter,
  Timestamp 
} from 'firebase/firestore';
import { Prospect, CommercialTarget, ProspectActivity } from '@/types';
import { toast } from 'sonner';

interface CommercialDashboardProps {
  userId: string;
  userName: string;
  userRole?: string;
}

export const CommercialDashboard: React.FC<CommercialDashboardProps> = ({ 
  userId, 
  userName,
  userRole = 'Comercial'
}) => {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [activities, setActivities] = useState<ProspectActivity[]>([]);
  const [targets, setTargets] = useState<CommercialTarget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('month');

  useEffect(() => {
    loadDashboardData();
  }, [userId, selectedPeriod]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadProspects(),
        loadActivities(),
        loadTargets()
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const loadProspects = async () => {
    try {
      // Diretor de TI e Diretor Comercial veem todos os prospects
      const canViewAllProspects = ['Diretor de TI', 'Diretor Comercial'].includes(userRole);
      
      let q;
      if (canViewAllProspects) {
        // Buscar todos os prospects
        q = query(collection(db, 'prospects'), orderBy('updatedAt', 'desc'));
      } else {
        // Buscar apenas prospects atribuídos ao usuário
        q = query(
          collection(db, 'prospects'),
          where('assignedTo', '==', userId),
          orderBy('updatedAt', 'desc')
        );
      }
      
      const snapshot = await getDocs(q);
      const prospectsData = snapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          lastContactDate: data.lastContactDate?.toDate(),
          nextContactDate: data.nextContactDate?.toDate(),
        };
      }) as Prospect[];
      
      setProspects(prospectsData);
    } catch (error) {
      console.error('Erro ao carregar prospects:', error);
    }
  };

  const loadActivities = async () => {
    try {
      // Diretor de TI e Diretor Comercial veem todas as atividades
      const canViewAllActivities = ['Diretor de TI', 'Diretor Comercial'].includes(userRole);
      
      let q;
      if (canViewAllActivities) {
        // Buscar todas as atividades
        q = query(
          collection(db, 'prospect_activities'),
          orderBy('createdAt', 'desc'),
          limit(10)
        );
      } else {
        // Buscar apenas atividades criadas pelo usuário
        q = query(
          collection(db, 'prospect_activities'),
          where('createdBy', '==', userId),
          orderBy('createdAt', 'desc'),
          limit(10)
        );
      }
      
      const snapshot = await getDocs(q);
      const activitiesData = snapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          scheduledFor: data.scheduledFor?.toDate(),
        };
      }) as ProspectActivity[];
      
      setActivities(activitiesData);
    } catch (error) {
      console.error('Erro ao carregar atividades:', error);
    }
  };

  const loadTargets = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const q = query(
        collection(db, 'commercial_targets'),
        where('collaboratorId', '==', userId),
        where('year', '==', currentYear)
      );
      
      const snapshot = await getDocs(q);
      const targetsData = snapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
      }) as CommercialTarget[];
      
      setTargets(targetsData);
    } catch (error) {
      console.error('Erro ao carregar metas:', error);
    }
  };

  // Cálculos de métricas
  const calculateMetrics = () => {
    const now = new Date();
    const periodStart = new Date();
    
    switch (selectedPeriod) {
      case 'week':
        periodStart.setDate(now.getDate() - 7);
        break;
      case 'month':
        periodStart.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        periodStart.setMonth(now.getMonth() - 3);
        break;
    }

    const periodProspects = prospects.filter(p => p.createdAt >= periodStart);
    const qualifiedLeads = periodProspects.filter(p => 
      ['Qualified', 'Proposal', 'Negotiation'].includes(p.status)
    );
    const closedWon = periodProspects.filter(p => p.status === 'Closed-Won');
    const totalValue = closedWon.reduce((sum, p) => sum + (p.expectedValue || 0), 0);
    const conversionRate = periodProspects.length > 0 
      ? (closedWon.length / periodProspects.length) * 100 
      : 0;

    return {
      totalProspects: periodProspects.length,
      qualifiedLeads: qualifiedLeads.length,
      closedWon: closedWon.length,
      totalValue,
      conversionRate,
      averageTicket: closedWon.length > 0 ? totalValue / closedWon.length : 0
    };
  };

  const metrics = calculateMetrics();
  const currentTarget = targets.find(t => t.period === 'monthly' && t.month === new Date().getMonth() + 1);

  const getStatusDisplayName = (status: string) => {
    switch (status) {
      case 'Closed-Won': return 'Won';
      case 'Closed-Lost': return 'Lost';
      case 'Qualified': return 'Qualified';
      case 'Negotiation': return 'Negotiation';
      case 'Proposal': return 'Proposal';
      case 'Hot': return 'Hot';
      case 'Warm': return 'Warm';
      case 'Cold': return 'Cold';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Cold': return 'bg-blue-100 text-blue-800';
      case 'Warm': return 'bg-yellow-100 text-yellow-800';
      case 'Hot': return 'bg-orange-100 text-orange-800';
      case 'Qualified': return 'bg-green-100 text-green-800';
      case 'Proposal': return 'bg-purple-100 text-purple-800';
      case 'Negotiation': return 'bg-indigo-100 text-indigo-800';
      case 'Closed-Won': return 'bg-emerald-100 text-emerald-800';
      case 'Closed-Lost': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'Call': return <PhoneCall className="h-4 w-4" />;
      case 'Meeting': return <Calendar className="h-4 w-4" />;
      case 'Email': return <TrendingUp className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Comercial</h1>
          <p className="text-muted-foreground">Olá, {userName}! Aqui está sua performance comercial.</p>
        </div>
        <Tabs value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as any)}>
          <TabsList>
            <TabsTrigger value="week">Semana</TabsTrigger>
            <TabsTrigger value="month">Mês</TabsTrigger>
            <TabsTrigger value="quarter">Trimestre</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Cartões de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Prospects</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalProspects}</div>
            <p className="text-xs text-muted-foreground">
              {selectedPeriod === 'week' ? 'últimos 7 dias' : 
               selectedPeriod === 'month' ? 'último mês' : 'último trimestre'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads Qualificados</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.qualifiedLeads}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.totalProspects > 0 
                ? `${((metrics.qualifiedLeads / metrics.totalProspects) * 100).toFixed(1)}% do total`
                : 'Nenhum prospect ainda'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas Fechadas</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.closedWon}</div>
            <p className="text-xs text-muted-foreground">
              Taxa de conversão: {metrics.conversionRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(metrics.totalValue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Ticket médio: {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(metrics.averageTicket)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Metas vs Realizações */}
        {currentTarget && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Metas do Mês
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Valor de Vendas</span>
                  <span>{new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  }).format(currentTarget.currentValue)} / {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  }).format(currentTarget.targetValue)}</span>
                </div>
                <Progress 
                  value={(currentTarget.currentValue / currentTarget.targetValue) * 100} 
                  className="h-2"
                />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Leads Gerados</span>
                  <span>{currentTarget.currentLeads} / {currentTarget.targetLeads}</span>
                </div>
                <Progress 
                  value={(currentTarget.currentLeads / currentTarget.targetLeads) * 100} 
                  className="h-2"
                />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Conversões</span>
                  <span>{currentTarget.currentConversions} / {currentTarget.targetConversions}</span>
                </div>
                <Progress 
                  value={(currentTarget.currentConversions / currentTarget.targetConversions) * 100} 
                  className="h-2"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Atividades Recentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Atividades Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                  <div className="flex-shrink-0">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.createdAt.toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <Badge 
                    variant={activity.completed ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {activity.completed ? 'Concluído' : 'Pendente'}
                  </Badge>
                </div>
              ))}
              {activities.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma atividade recente
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Prospects por Status */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline de Vendas</CardTitle>
          <CardDescription>Distribuição dos prospects por status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            {['Cold', 'Warm', 'Hot', 'Qualified', 'Proposal', 'Negotiation', 'Closed-Won', 'Closed-Lost'].map((status) => {
              const count = prospects.filter(p => p.status === status).length;
              return (
                <div key={status} className="text-center">
                  <Badge className={`${getStatusColor(status)} mb-1 text-xs w-20 justify-center`}>
                    {getStatusDisplayName(status)}
                  </Badge>
                  <div className="text-lg font-bold">{count}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 