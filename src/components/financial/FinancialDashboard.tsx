import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  AlertTriangle,
  Target,
  PieChart,
  BarChart3
} from "lucide-react";
import { FinancialDashboardData } from "@/types/financial";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FinancialDashboardProps {
  data: FinancialDashboardData | null;
}

export const FinancialDashboard = ({ data }: FinancialDashboardProps) => {
  if (!data) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Carregando Dashboard</h3>
        <p className="text-gray-500 dark:text-gray-400">
          Aguarde enquanto carregamos seus dados financeiros...
        </p>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getRevenueProgress = () => {
    return (data.monthlyRevenue / data.monthlyRevenueTarget) * 100;
  };

  const getCashTrend = () => {
    const diff = data.cashProjection7Days - data.currentCash;
    return {
      value: diff,
      percentage: ((diff / data.currentCash) * 100).toFixed(1),
      isPositive: diff >= 0
    };
  };

  const cashTrend = getCashTrend();
  const revenueProgress = getRevenueProgress();

  return (
    <div className="space-y-6">
      {/* Indicadores Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Caixa Atual */}
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-300 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Caixa Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
              {formatCurrency(data.currentCash)}
            </div>
            <div className="flex items-center mt-2">
              {cashTrend.isPositive ? (
                <ArrowUpRight className="w-4 h-4 text-green-600 dark:text-green-400" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-red-600 dark:text-red-400" />
              )}
              <span className={`text-sm ml-1 ${
                cashTrend.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {cashTrend.percentage}% próximos 7 dias
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Receita Mensal */}
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-800 dark:text-green-300 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Receita Mensal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">
              {formatCurrency(data.monthlyRevenue)}
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-green-600 dark:text-green-400">
                Meta: {formatCurrency(data.monthlyRevenueTarget)}
              </span>
              <Badge className={`text-xs ${
                revenueProgress >= 90 ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
              }`}>
                {revenueProgress.toFixed(1)}%
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Contas Vencidas */}
        <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-800 dark:text-red-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Em Atraso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-lg font-bold text-red-700 dark:text-red-400">
                {formatCurrency(data.overdueReceivables + data.overduePayables)}
              </div>
              <div className="text-xs text-red-600 dark:text-red-400">
                Receber: {formatCurrency(data.overdueReceivables)}
              </div>
              <div className="text-xs text-red-600 dark:text-red-400">
                Pagar: {formatCurrency(data.overduePayables)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Margem Bruta */}
        <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-800 dark:text-purple-300 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Margem Bruta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
              {data.grossMargin.toFixed(1)}%
            </div>
            <div className="text-sm text-purple-600 dark:text-purple-400 mt-1">
              Rentabilidade atual
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas de Vencimentos */}
      {data.upcomingDues.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Próximos Vencimentos</h3>
          {data.upcomingDues.map((due, index) => (
            <Alert key={index} className={`${
              due.type === 'RECEIVABLE' 
                ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20' 
                : 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20'
            }`}>
              <Calendar className={`h-4 w-4 ${
                due.type === 'RECEIVABLE' ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'
              }`} />
              <AlertDescription className={
                due.type === 'RECEIVABLE' ? 'text-green-800 dark:text-green-200' : 'text-orange-800 dark:text-orange-200'
              }>
                <div className="flex items-center justify-between">
                  <div>
                    <strong>{due.type === 'RECEIVABLE' ? 'A Receber' : 'A Pagar'}:</strong> {due.description}
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatCurrency(due.amount)}</div>
                    <div className="text-xs">
                      {format(due.dueDate, "dd/MM/yyyy", { locale: ptBR })}
                    </div>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Clientes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Top Clientes por Receita
            </CardTitle>
            <CardDescription>
              Maiores fontes de receita do mês atual
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.topClients.length > 0 ? (
              <div className="space-y-3">
                {data.topClients.map((client, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-green-700 dark:text-green-400">
                          {index + 1}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{client.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Cliente</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(client.revenue)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>Nenhum dado de cliente disponível</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Projetos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Top Projetos por Lucratividade
            </CardTitle>
            <CardDescription>
              Projetos mais rentáveis em andamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.topProjects.length > 0 ? (
              <div className="space-y-3">
                {data.topProjects.map((project, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-blue-700 dark:text-blue-400">
                          {index + 1}
                        </span>
                      </div>
                                             <div>
                         <p className="font-medium text-gray-900 dark:text-gray-100">{project.name}</p>
                         <p className="text-sm text-gray-500 dark:text-gray-400">
                           Margem: {project.profitability.toFixed(1)}%
                         </p>
                       </div>
                     </div>
                     <div className="text-right">
                       <p className="font-bold text-blue-600 dark:text-blue-400">
                         {project.profitability.toFixed(1)}%
                       </p>
                     </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>Nenhum projeto em andamento</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}; 