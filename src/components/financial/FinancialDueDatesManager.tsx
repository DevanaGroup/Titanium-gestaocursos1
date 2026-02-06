import React, { useState, useEffect, useMemo } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, isSameYear, differenceInDays, isToday, isTomorrow, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Download, FileText, Filter, Search, Upload, X, Check, Clock, AlertTriangle, DollarSign, Users, TrendingUp, Eye, Edit, Trash2, Plus, File, Paperclip, Send, RefreshCw, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getAllFinancialDues, updateFinancialDueStatus, FinancialDue, isOverdue } from '@/services/financialDueDatesService';

interface FinancialAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedAt: Date;
  uploadedBy: string;
  description?: string;
}

// Componente para visualização mensal
interface MonthlyViewProps {
  dueDates: FinancialDue[];
  loading: boolean;
  formatCurrency: (value: number) => string;
  getStatusColor: (status: string) => string;
  markAsPaid: (dueId: string) => void;
  markAsPending: (dueId: string) => void;
  openEditModal: (due: FinancialDue) => void;
  exportMonthlyToExcel: (year: number) => void;
}

const MonthlyView: React.FC<MonthlyViewProps> = ({ 
  dueDates, 
  loading, 
  formatCurrency, 
  getStatusColor, 
  markAsPaid, 
  markAsPending, 
  openEditModal,
  exportMonthlyToExcel 
}) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  // Organizar vencimentos por mês
  const organizeDuesByMonth = (dues: FinancialDue[]) => {
    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      monthName: format(new Date(2024, i, 1), 'MMMM', { locale: ptBR }),
      dues: [] as FinancialDue[],
      totalReceivable: 0,
      totalPayable: 0,
      totalPaid: 0,
      totalReceived: 0
    }));

    dues.forEach(due => {
      const dueMonth = due.dueDate.getMonth() + 1;
      const dueYear = due.dueDate.getFullYear();
      
      if (dueYear === selectedYear) {
        const monthIndex = dueMonth - 1;
        if (monthIndex >= 0 && monthIndex < 12) {
          monthlyData[monthIndex].dues.push(due);
          
          if (due.type === 'RECEIVABLE') {
            monthlyData[monthIndex].totalReceivable += due.amount;
            if (due.status === 'RECEIVED') {
              monthlyData[monthIndex].totalReceived += due.amount;
            }
          } else {
            monthlyData[monthIndex].totalPayable += due.amount;
            if (due.status === 'PAID') {
              monthlyData[monthIndex].totalPaid += due.amount;
            }
          }
        }
      }
    });

    return monthlyData;
  };

  const monthlyData = organizeDuesByMonth(dueDates);
  const selectedMonthData = monthlyData.find(m => m.month === selectedMonth);

  if (loading) {
    return (
      <div className="text-center py-8">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
        <p>Carregando vencimentos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controles de Ano e Mês */}
      <Card>
        <CardHeader>
          <CardTitle>Controles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Ano</label>
              <select
                className="w-full mt-1 px-3 py-2 border rounded-md"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - 2 + i;
                  return (
                    <option key={year} value={year}>{year}</option>
                  );
                })}
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Mês</label>
              <select
                className="w-full mt-1 px-3 py-2 border rounded-md"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
              >
                {monthlyData.map(month => (
                  <option key={month.month} value={month.month}>
                    {month.monthName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumo Anual */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Resumo Anual - {selectedYear}</CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => exportMonthlyToExcel(selectedYear)}
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar {selectedYear}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 p-2 text-left">Mês</th>
                  <th className="border border-gray-300 p-2 text-right">A Receber</th>
                  <th className="border border-gray-300 p-2 text-right">Recebido</th>
                  <th className="border border-gray-300 p-2 text-right">A Pagar</th>
                  <th className="border border-gray-300 p-2 text-right">Pago</th>
                  <th className="border border-gray-300 p-2 text-right">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map(month => {
                  const balance = (month.totalReceivable - month.totalPayable);
                  return (
                    <tr key={month.month} className="hover:bg-gray-50">
                      <td className="border border-gray-300 p-2 font-medium">
                        {month.monthName}
                      </td>
                      <td className="border border-gray-300 p-2 text-right">
                        {formatCurrency(month.totalReceivable)}
                      </td>
                      <td className="border border-gray-300 p-2 text-right text-green-600">
                        {formatCurrency(month.totalReceived)}
                      </td>
                      <td className="border border-gray-300 p-2 text-right">
                        {formatCurrency(month.totalPayable)}
                      </td>
                      <td className="border border-gray-300 p-2 text-right text-red-600">
                        {formatCurrency(month.totalPaid)}
                      </td>
                      <td className={`border border-gray-300 p-2 text-right font-medium ${
                        balance >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(balance)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Detalhes do Mês Selecionado */}
      {selectedMonthData && (
        <Card>
          <CardHeader>
            <CardTitle>
              Detalhes - {selectedMonthData.monthName} {selectedYear}
            </CardTitle>
            <CardDescription>
              {selectedMonthData.dues.length} vencimentos neste mês
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedMonthData.dues.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum vencimento neste mês</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 p-2 text-left">Data</th>
                      <th className="border border-gray-300 p-2 text-left">Descrição</th>
                      <th className="border border-gray-300 p-2 text-left">Tipo</th>
                      <th className="border border-gray-300 p-2 text-right">Valor</th>
                      <th className="border border-gray-300 p-2 text-center">Status</th>
                      <th className="border border-gray-300 p-2 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedMonthData.dues
                      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
                      .map(due => (
                        <tr key={due.id} className="hover:bg-gray-50">
                          <td className="border border-gray-300 p-2">
                            {format(due.dueDate, 'dd/MM/yyyy', { locale: ptBR })}
                          </td>
                          <td className="border border-gray-300 p-2">
                            <div>
                              <p className="font-medium">{due.description}</p>
                              <p className="text-sm text-gray-500">
                                {due.clientName || due.supplierName}
                              </p>
                            </div>
                          </td>
                          <td className="border border-gray-300 p-2">
                            <div className="flex items-center gap-2">
                              {due.type === 'RECEIVABLE' ? (
                                <TrendingUp className="w-4 h-4 text-green-600" />
                              ) : (
                                <TrendingUp className="w-4 h-4 text-red-600" />
                              )}
                              <span className="text-sm">
                                {due.type === 'RECEIVABLE' ? 'Receber' : 'Pagar'}
                              </span>
                            </div>
                          </td>
                          <td className="border border-gray-300 p-2 text-right font-medium">
                            {formatCurrency(due.amount)}
                          </td>
                          <td className="border border-gray-300 p-2 text-center">
                            <Badge variant="outline" className={getStatusColor(due.status)}>
                              {due.status === 'PENDING' ? 'Pendente' : 
                               due.status === 'OVERDUE' ? 'Em Atraso' :
                               due.status === 'PAID' ? 'Pago' : 'Recebido'}
                            </Badge>
                          </td>
                          <td className="border border-gray-300 p-2 text-center">
                            <div className="flex justify-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {due.status === 'PENDING' || due.status === 'OVERDUE' ? (
                                    <DropdownMenuItem onClick={() => markAsPaid(due.id)}>
                                      <Check className="mr-2 h-4 w-4" />
                                      {due.type === 'RECEIVABLE' ? 'Marcar como Recebido' : 'Marcar como Pago'}
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem onClick={() => markAsPending(due.id)}>
                                      <Clock className="mr-2 h-4 w-4" />
                                      Marcar como Pendente
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => openEditModal(due)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Editar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export const FinancialDueDatesManager: React.FC = () => {
  const [dueDates, setDueDates] = useState<FinancialDue[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedDues, setSelectedDues] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const [filters, setFilters] = useState({
    type: 'ALL',
    status: 'ALL',
    priority: 'ALL',
    dateRange: 'MONTH_FROM_START'
  });
  
  // Estados para modal de edição
  const [selectedDue, setSelectedDue] = useState<FinancialDue | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editForm, setEditForm] = useState({
    status: '',
    paymentDate: '',
    paymentAmount: '',
    paymentMethod: '',
    observations: ''
  });
  
  const { toast } = useToast();

  useEffect(() => {
    loadDueDates();
  }, []); // Remover dependência de filters para evitar recarregamento desnecessário

  // Validar dados quando carregados
  useEffect(() => {
    if (dueDates.length > 0) {
      validateDuesData();
    }
  }, [dueDates]);

  const loadDueDates = async () => {
    try {
      console.log(`🔄 [loadDueDates] INICIANDO carregamento de vencimentos...`);
      setLoading(true);
      
      // Buscar vencimentos reais do sistema
      console.log(`📋 [loadDueDates] Chamando getAllFinancialDues...`);
      const realDues = await getAllFinancialDues();
      
      console.log(`✅ [loadDueDates] getAllFinancialDues concluído`);
      console.log(`📊 [loadDueDates] Total de vencimentos carregados: ${realDues.length}`);
      
      // Log detalhado dos vencimentos carregados
      realDues.forEach((due, index) => {
        console.log(`📋 [loadDueDates] Vencimento ${index + 1}:`, {
          id: due.id,
          description: due.description,
          status: due.status,
          type: due.type,
          source: due.source,
          amount: due.amount
        });
      });
      
      setDueDates(realDues);
      console.log(`✅ [loadDueDates] Estado local atualizado com ${realDues.length} vencimentos`);
      
    } catch (error) {
      console.error('❌ [loadDueDates] Erro ao carregar vencimentos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os vencimentos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      console.log(`🏁 [loadDueDates] Carregamento concluído`);
    }
  };

  // Função para recarregar dados manualmente
  const refreshData = async () => {
    console.log("🔄 [refreshData] Recarregando dados manualmente...");
    await loadDueDates();
    toast({
      title: "Dados atualizados",
      description: "Vencimentos recarregados com sucesso",
    });
  };



  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Função para exportar vencimentos para Excel (CSV)
  const exportToExcel = () => {
    try {
      const headers = [
        'Data de Vencimento',
        'Descrição',
        'Tipo',
        'Cliente/Fornecedor',
        'Valor',
        'Status',
        'Prioridade',
        'Data de Pagamento',
        'Valor Pago',
        'Método de Pagamento',
        'Observações',
        'Fonte',
        'Parcela',
        'Dias até Vencimento'
      ];

      const csvData = filteredDueDates.map(due => [
        format(due.dueDate, 'dd/MM/yyyy', { locale: ptBR }),
        due.description,
        due.type === 'RECEIVABLE' ? 'A Receber' : 'A Pagar',
        due.clientName || due.supplierName || '',
        due.amount.toFixed(2).replace('.', ','),
        due.status === 'PENDING' ? 'Pendente' : 
        due.status === 'OVERDUE' ? 'Em Atraso' :
        due.status === 'PAID' ? 'Pago' : 'Recebido',
        due.priority,
        due.paymentDate ? format(due.paymentDate, 'dd/MM/yyyy', { locale: ptBR }) : '',
        due.paymentAmount ? due.paymentAmount.toFixed(2).replace('.', ',') : '',
        due.paymentMethod || '',
        due.observations || '',
        due.source === 'ACCOUNT_PAYABLE' ? 'Conta a Pagar' :
        due.source === 'ACCOUNT_RECEIVABLE' ? 'Conta a Receber' :
        due.source === 'SUPPLIER_RECURRING' ? 'Fornecedor Recorrente' :
        'Cliente Recorrente',
        due.installmentNumber && due.totalInstallments 
          ? `${due.installmentNumber}/${due.totalInstallments}` 
          : '',
        getDaysUntilDue(due.dueDate).toString()
      ]);

      const csvContent = [headers, ...csvData]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `vencimentos_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Exportação concluída",
        description: "Arquivo CSV gerado com sucesso",
      });
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast({
        title: "Erro",
        description: "Não foi possível exportar os dados",
        variant: "destructive"
      });
    }
  };

  // Função para exportar visualização mensal para Excel
  const exportMonthlyToExcel = (year: number) => {
    try {
      const monthlyData = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        monthName: format(new Date(2024, i, 1), 'MMMM', { locale: ptBR }),
        dues: [] as FinancialDue[],
        totalReceivable: 0,
        totalPayable: 0,
        totalPaid: 0,
        totalReceived: 0
      }));

      dueDates.forEach(due => {
        const dueMonth = due.dueDate.getMonth() + 1;
        const dueYear = due.dueDate.getFullYear();
        
        if (dueYear === year) {
          const monthIndex = dueMonth - 1;
          if (monthIndex >= 0 && monthIndex < 12) {
            monthlyData[monthIndex].dues.push(due);
            
            if (due.type === 'RECEIVABLE') {
              monthlyData[monthIndex].totalReceivable += due.amount;
              if (due.status === 'RECEIVED') {
                monthlyData[monthIndex].totalReceived += due.amount;
              }
            } else {
              monthlyData[monthIndex].totalPayable += due.amount;
              if (due.status === 'PAID') {
                monthlyData[monthIndex].totalPaid += due.amount;
              }
            }
          }
        }
      });

      const headers = [
        'Mês',
        'A Receber',
        'Recebido',
        'A Pagar',
        'Pago',
        'Saldo'
      ];

      const csvData = monthlyData.map(month => {
        const balance = month.totalReceivable - month.totalPayable;
        return [
          month.monthName,
          month.totalReceivable.toFixed(2).replace('.', ','),
          month.totalReceived.toFixed(2).replace('.', ','),
          month.totalPayable.toFixed(2).replace('.', ','),
          month.totalPaid.toFixed(2).replace('.', ','),
          balance.toFixed(2).replace('.', ',')
        ];
      });

      const csvContent = [headers, ...csvData]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `resumo_mensal_${year}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Exportação concluída",
        description: `Resumo mensal ${year} exportado com sucesso`,
      });
    } catch (error) {
      console.error('Erro ao exportar resumo mensal:', error);
      toast({
        title: "Erro",
        description: "Não foi possível exportar o resumo mensal",
        variant: "destructive"
      });
    }
  };

  const getDaysUntilDue = (dueDate: Date) => {
    return differenceInDays(dueDate, new Date());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OVERDUE':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'PAID':
      case 'RECEIVED':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-500 text-white';
      case 'HIGH':
        return 'bg-orange-500 text-white';
      case 'MEDIUM':
        return 'bg-yellow-500 text-white';
      case 'LOW':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getDateDescription = (date: Date) => {
    if (isToday(date)) return 'Hoje';
    if (isTomorrow(date)) return 'Amanhã';
    if (isYesterday(date)) return 'Ontem';
    
    const days = getDaysUntilDue(date);
    if (days < 0) return `${Math.abs(days)} dias em atraso`;
    if (days === 0) return 'Hoje';
    return `Em ${days} dias`;
  };



  const markAsPaid = async (dueId: string) => {
    try {
      console.log(`🚀 [markAsPaid] INICIANDO processo para vencimento ${dueId}`);
      
      const due = dueDates.find(d => d.id === dueId);
      if (!due) {
        console.error(`❌ [markAsPaid] Vencimento ${dueId} não encontrado no estado local`);
        toast({
          title: "Erro",
          description: "Vencimento não encontrado",
          variant: "destructive"
        });
        return;
      }

      console.log(`📋 [markAsPaid] Dados do vencimento:`, {
        id: due.id,
        description: due.description,
        amount: due.amount,
        currentStatus: due.status,
        type: due.type,
        source: due.source
      });

      const newStatus = due.type === 'RECEIVABLE' ? 'RECEIVED' : 'PAID';
      console.log(`🔄 [markAsPaid] Marcando vencimento ${dueId} como ${newStatus}`);

      // Atualizar no banco de dados
      console.log(`💾 [markAsPaid] Chamando updateFinancialDueStatus...`);
      await updateFinancialDueStatus(dueId, newStatus, {
        paymentDate: new Date(),
        paymentAmount: due.amount,
        paymentMethod: 'N/A',
        observations: 'Marcado como pago via sistema'
      });

      console.log(`✅ [markAsPaid] updateFinancialDueStatus concluído com sucesso`);

      // Recarregar dados do Firestore para garantir sincronização
      console.log(`🔄 [markAsPaid] Recarregando dados do Firestore...`);
      await loadDueDates();
      
      console.log(`✅ [markAsPaid] Dados recarregados do Firestore`);
      
      // Se chegou até aqui sem erro, a atualização foi bem-sucedida
      console.log(`✅ [markAsPaid] CONFIRMAÇÃO: Atualização concluída com sucesso`);
      toast({
        title: "Status atualizado",
        description: `Marcado como ${due.type === 'RECEIVABLE' ? 'recebido' : 'pago'} com sucesso`,
      });
      
    } catch (error) {
      console.error('❌ [markAsPaid] Erro durante o processo:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status no banco de dados",
        variant: "destructive"
      });
    }
  };

  const markAsPending = async (dueId: string) => {
    try {
      console.log(`🚀 [markAsPending] INICIANDO processo para vencimento ${dueId}`);
      
      const due = dueDates.find(d => d.id === dueId);
      if (!due) {
        console.error(`❌ [markAsPending] Vencimento ${dueId} não encontrado no estado local`);
        toast({
          title: "Erro",
          description: "Vencimento não encontrado",
          variant: "destructive"
        });
        return;
      }

      console.log(`📋 [markAsPending] Dados do vencimento:`, {
        id: due.id,
        description: due.description,
        amount: due.amount,
        currentStatus: due.status,
        type: due.type,
        source: due.source
      });

      console.log(`🔄 [markAsPending] Marcando vencimento ${dueId} como PENDING`);

      // Atualizar no banco de dados
      console.log(`💾 [markAsPending] Chamando updateFinancialDueStatus...`);
      await updateFinancialDueStatus(dueId, 'PENDING', {
        observations: 'Marcado como pendente via sistema'
      });

      console.log(`✅ [markAsPending] updateFinancialDueStatus concluído com sucesso`);

      // Recarregar dados do Firestore para garantir sincronização
      console.log(`🔄 [markAsPending] Recarregando dados do Firestore...`);
      await loadDueDates();
      
      console.log(`✅ [markAsPending] Dados recarregados do Firestore`);
      
      // Se chegou até aqui sem erro, a atualização foi bem-sucedida
      console.log(`✅ [markAsPending] CONFIRMAÇÃO: Atualização concluída com sucesso`);
      toast({
        title: "Status atualizado",
        description: "Marcado como pendente com sucesso",
      });
      
    } catch (error) {
      console.error('❌ [markAsPending] Erro durante o processo:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status no banco de dados",
        variant: "destructive"
      });
    }
  };

  const openEditModal = (due: FinancialDue) => {
    setSelectedDue(due);
    setEditForm({
      status: due.status,
      paymentDate: due.paymentDate ? format(due.paymentDate, 'yyyy-MM-dd') : '',
      paymentAmount: due.paymentAmount?.toString() || '',
      paymentMethod: due.paymentMethod || '',
      observations: due.observations || ''
    });
    setIsEditModalOpen(true);
  };

  const saveEditForm = async () => {
    if (!selectedDue) return;

    try {
      // Preparar dados de pagamento (apenas campos não vazios)
      const paymentData: any = {};
      if (editForm.paymentDate) paymentData.paymentDate = new Date(editForm.paymentDate);
      if (editForm.paymentAmount) paymentData.paymentAmount = parseFloat(editForm.paymentAmount);
      if (editForm.paymentMethod) paymentData.paymentMethod = editForm.paymentMethod;
      if (editForm.observations) paymentData.observations = editForm.observations;

      // Atualizar no banco de dados
      await updateFinancialDueStatus(
        selectedDue.id,
        editForm.status as 'PENDING' | 'PAID' | 'RECEIVED',
        Object.keys(paymentData).length > 0 ? paymentData : undefined
      );

      // Atualizar estado local
      const updatedDue = {
        ...selectedDue,
        status: editForm.status as FinancialDue['status'],
        paymentDate: editForm.paymentDate ? new Date(editForm.paymentDate) : undefined,
        paymentAmount: editForm.paymentAmount ? parseFloat(editForm.paymentAmount) : undefined,
        paymentMethod: editForm.paymentMethod || undefined,
        observations: editForm.observations || undefined,
        updatedAt: new Date(),
        updatedBy: 'current-user' // Substituir pela sessão do usuário
      };

      const updatedDueDates = dueDates.map(due => 
        due.id === selectedDue.id ? updatedDue : due
      );
      setDueDates(updatedDueDates);

      setIsEditModalOpen(false);
      setSelectedDue(null);
      
      toast({
        title: "Vencimento atualizado",
        description: "Informações salvas com sucesso no banco de dados",
      });
    } catch (error) {
      console.error('Erro ao salvar alterações:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as alterações no banco de dados",
        variant: "destructive"
      });
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!selectedDue) return;

    try {
      setUploading(true);
      
      // Simular upload - aqui você integraria com seu serviço de upload
      const newAttachment: FinancialAttachment = {
        id: Date.now().toString(),
        fileName: file.name,
        fileUrl: URL.createObjectURL(file), // Temporary URL
        fileType: file.type,
        fileSize: file.size,
        uploadedAt: new Date(),
        uploadedBy: 'current-user', // Substituir pela sessão do usuário
        description: ''
      };

      const updatedDue = {
        ...selectedDue,
        attachments: [...(selectedDue.attachments || []), newAttachment],
        updatedAt: new Date(),
        updatedBy: 'current-user'
      };

      const updatedDueDates = dueDates.map(due => 
        due.id === selectedDue.id ? updatedDue : due
      );
      setDueDates(updatedDueDates);
      setSelectedDue(updatedDue);

      toast({
        title: "Arquivo anexado",
        description: "Comprovante carregado com sucesso",
      });
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast({
        title: "Erro",
        description: "Não foi possível fazer o upload do arquivo",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (attachmentId: string) => {
    if (!selectedDue) return;

    const updatedDue = {
      ...selectedDue,
      attachments: selectedDue.attachments?.filter(att => att.id !== attachmentId) || [],
      updatedAt: new Date(),
      updatedBy: 'current-user'
    };

    const updatedDueDates = dueDates.map(due => 
      due.id === selectedDue.id ? updatedDue : due
    );
    setDueDates(updatedDueDates);
    setSelectedDue(updatedDue);

    toast({
      title: "Arquivo removido",
      description: "Anexo foi removido com sucesso",
    });
  };

  const filteredDueDates = dueDates.filter(due => {
    if (filters.type !== 'ALL' && due.type !== filters.type) return false;
    if (filters.status !== 'ALL' && due.status !== filters.status) return false;
    if (filters.priority !== 'ALL' && due.priority !== filters.priority) return false;
    
    // Lógica de filtro por data
    const days = getDaysUntilDue(due.dueDate);
    
    if (filters.dateRange === 'OVERDUE' && days >= 0) return false;
    if (filters.dateRange === 'TODAY' && !isToday(due.dueDate)) return false;
    if (filters.dateRange === 'NEXT_7_DAYS' && (days < 0 || days > 7)) return false;
    if (filters.dateRange === 'NEXT_30_DAYS' && (days < 0 || days > 30)) return false;
    
    if (filters.dateRange === 'MONTH_FROM_START') {
      // Mostrar vencimentos do mês atual completo (do dia 1 até o último dia)
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      
      const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
      const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
      const dueDate = new Date(due.dueDate);
      
      // Normalizar as datas para comparação (sem horário)
      firstDayOfMonth.setHours(0, 0, 0, 0);
      lastDayOfMonth.setHours(23, 59, 59, 999);
      dueDate.setHours(0, 0, 0, 0);
      
      return dueDate >= firstDayOfMonth && dueDate <= lastDayOfMonth;
    }
    

    
    return true;
  });

  const getOverviewStats = () => {
    const today = new Date();
    const overdue = dueDates.filter(due => due.status === 'OVERDUE');
    const dueToday = dueDates.filter(due => isToday(due.dueDate) && due.status === 'PENDING');
    const dueThisWeek = dueDates.filter(due => {
      const days = getDaysUntilDue(due.dueDate);
      return days >= 0 && days <= 7 && due.status === 'PENDING';
    });
    
    const receivables = dueDates.filter(due => due.type === 'RECEIVABLE' && due.status === 'PENDING');
    const payables = dueDates.filter(due => due.type === 'PAYABLE' && due.status === 'PENDING');
    
    // Métricas avançadas
    const totalReceivables = dueDates.filter(due => due.type === 'RECEIVABLE');
    const totalPayables = dueDates.filter(due => due.type === 'PAYABLE');
    const paidReceivables = dueDates.filter(due => due.type === 'RECEIVABLE' && due.status === 'RECEIVED');
    const paidPayables = dueDates.filter(due => due.type === 'PAYABLE' && due.status === 'PAID');
    
    // Taxa de inadimplência
    const overdueReceivables = dueDates.filter(due => due.type === 'RECEIVABLE' && due.status === 'OVERDUE');
    const totalReceivableAmount = totalReceivables.reduce((sum, due) => sum + due.amount, 0);
    const overdueReceivableAmount = overdueReceivables.reduce((sum, due) => sum + due.amount, 0);
    const defaultRate = totalReceivableAmount > 0 ? (overdueReceivableAmount / totalReceivableAmount) * 100 : 0;
    
    // Fluxo de caixa projetado (próximos 30 dias)
    const next30Days = new Date();
    next30Days.setDate(next30Days.getDate() + 30);
    
    const upcomingReceivables = dueDates.filter(due => 
      due.type === 'RECEIVABLE' && 
      due.status === 'PENDING' && 
      due.dueDate <= next30Days
    );
    const upcomingPayables = dueDates.filter(due => 
      due.type === 'PAYABLE' && 
      due.status === 'PENDING' && 
      due.dueDate <= next30Days
    );
    
    const projectedIncome = upcomingReceivables.reduce((sum, due) => sum + due.amount, 0);
    const projectedExpenses = upcomingPayables.reduce((sum, due) => sum + due.amount, 0);
    const projectedCashFlow = projectedIncome - projectedExpenses;
    
    // Taxa de recebimento
    const receivedAmount = paidReceivables.reduce((sum, due) => sum + due.amount, 0);
    const collectionRate = totalReceivableAmount > 0 ? (receivedAmount / totalReceivableAmount) * 100 : 0;
    
    // Taxa de pagamento
    const paidAmount = paidPayables.reduce((sum, due) => sum + due.amount, 0);
    const totalPayableAmount = totalPayables.reduce((sum, due) => sum + due.amount, 0);
    const paymentRate = totalPayableAmount > 0 ? (paidAmount / totalPayableAmount) * 100 : 0;
    
    const calculatedStats = {
      overdue: {
        count: overdue.length,
        amount: overdue.reduce((sum, due) => sum + due.amount, 0)
      },
      dueToday: {
        count: dueToday.length,
        amount: dueToday.reduce((sum, due) => sum + due.amount, 0)
      },
      dueThisWeek: {
        count: dueThisWeek.length,
        amount: dueThisWeek.reduce((sum, due) => sum + due.amount, 0)
      },
      receivables: {
        count: receivables.length,
        amount: receivables.reduce((sum, due) => sum + due.amount, 0)
      },
      payables: {
        count: payables.length,
        amount: payables.reduce((sum, due) => sum + due.amount, 0)
      },
      // Métricas avançadas
      defaultRate,
      projectedCashFlow,
      projectedIncome,
      projectedExpenses,
      collectionRate,
      paymentRate,
      totalReceivableAmount,
      totalPayableAmount,
      receivedAmount,
      paidAmount
    };

    // Debug das estatísticas (apenas em desenvolvimento)
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 [FinancialDueDatesManager] Estatísticas calculadas:', {
        totalDues: dueDates.length,
        overdue: calculatedStats.overdue,
        receivables: calculatedStats.receivables,
        payables: calculatedStats.payables,
        rates: {
          defaultRate: calculatedStats.defaultRate,
          collectionRate: calculatedStats.collectionRate,
          paymentRate: calculatedStats.paymentRate
        }
      });
    }

    return calculatedStats;
  };

  // Função para validar se os dados estão sendo carregados corretamente
  const validateDuesData = () => {
    console.log("🔍 [FinancialDueDatesManager] Validando dados de vencimentos:", {
      totalDues: dueDates.length,
      byType: {
        receivable: dueDates.filter(d => d.type === 'RECEIVABLE').length,
        payable: dueDates.filter(d => d.type === 'PAYABLE').length
      },
      byStatus: {
        pending: dueDates.filter(d => d.status === 'PENDING').length,
        overdue: dueDates.filter(d => d.status === 'OVERDUE').length,
        paid: dueDates.filter(d => d.status === 'PAID').length,
        received: dueDates.filter(d => d.status === 'RECEIVED').length
      },
      bySource: {
        accountPayable: dueDates.filter(d => d.source === 'ACCOUNT_PAYABLE').length,
        accountReceivable: dueDates.filter(d => d.source === 'ACCOUNT_RECEIVABLE').length,
        supplierRecurring: dueDates.filter(d => d.source === 'SUPPLIER_RECURRING').length,
        clientRecurring: dueDates.filter(d => d.source === 'CLIENT_RECURRING').length
      }
    });
  };

  // Funções para seleção em lote
  const toggleDueSelection = (dueId: string) => {
    setSelectedDues(prev => 
      prev.includes(dueId) 
        ? prev.filter(id => id !== dueId)
        : [...prev, dueId]
    );
  };

  const toggleSelectAll = () => {
    const filteredIds = filteredDueDates.map(due => due.id);
    if (selectedDues.length === filteredIds.length) {
      setSelectedDues([]);
    } else {
      setSelectedDues(filteredIds);
    }
  };

  const clearSelection = () => {
    setSelectedDues([]);
  };

  // Ações em lote
  const bulkMarkAsPaid = async () => {
    if (selectedDues.length === 0) return;
    
    setBulkActionLoading(true);
    let successCount = 0;
    let errorCount = 0;
    
    try {
      for (const dueId of selectedDues) {
        try {
          const due = dueDates.find(d => d.id === dueId);
          if (!due) continue;
          
          await updateFinancialDueStatus(dueId, due.type === 'RECEIVABLE' ? 'RECEIVED' : 'PAID', {
            paymentDate: new Date(),
            paymentAmount: due.amount,
            paymentMethod: 'N/A',
            observations: 'Marcado como pago em lote'
          });
          successCount++;
        } catch (error) {
          console.error(`Erro ao marcar vencimento ${dueId} como pago:`, error);
          errorCount++;
        }
      }
      
      // Recarregar dados do Firestore para garantir sincronização
      console.log(`🔄 [bulkMarkAsPaid] Recarregando dados do Firestore...`);
      await loadDueDates();
      
      clearSelection();
      
      toast({
        title: "Ação em lote concluída",
        description: `${successCount} vencimentos marcados como pagos. ${errorCount > 0 ? `${errorCount} erros.` : ''}`,
        variant: errorCount > 0 ? "destructive" : "default"
      });
      
    } catch (error) {
      console.error('Erro na ação em lote:', error);
      toast({
        title: "Erro",
        description: "Erro ao executar ação em lote",
        variant: "destructive"
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const bulkMarkAsPending = async () => {
    if (selectedDues.length === 0) return;
    
    setBulkActionLoading(true);
    let successCount = 0;
    let errorCount = 0;
    
    try {
      for (const dueId of selectedDues) {
        try {
          await updateFinancialDueStatus(dueId, 'PENDING', {
            observations: 'Marcado como pendente em lote'
          });
          successCount++;
        } catch (error) {
          console.error(`Erro ao marcar vencimento ${dueId} como pendente:`, error);
          errorCount++;
        }
      }
      
      // Recarregar dados do Firestore para garantir sincronização
      console.log(`🔄 [bulkMarkAsPending] Recarregando dados do Firestore...`);
      await loadDueDates();
      
      clearSelection();
      
      toast({
        title: "Ação em lote concluída",
        description: `${successCount} vencimentos marcados como pendentes. ${errorCount > 0 ? `${errorCount} erros.` : ''}`,
        variant: errorCount > 0 ? "destructive" : "default"
      });
      
    } catch (error) {
      console.error('Erro na ação em lote:', error);
      toast({
        title: "Erro",
        description: "Erro ao executar ação em lote",
        variant: "destructive"
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const stats = getOverviewStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button variant="outline" size="sm" onClick={exportToExcel}>
          <Download className="w-4 h-4 mr-2" />
          Exportar
        </Button>
      </div>

      {/* Cards de Resumo - Vencimentos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-300">Em Atraso</p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-400">{stats.overdue.count}</p>
                <p className="text-xs text-red-600 dark:text-red-400">
                  {formatCurrency(stats.overdue.amount)}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Vence Hoje</p>
                <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{stats.dueToday.count}</p>
                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                  {formatCurrency(stats.dueToday.amount)}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Próximos 7 Dias</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{stats.dueThisWeek.count}</p>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  {formatCurrency(stats.dueThisWeek.amount)}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Métricas Financeiras Consolidadas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-300">Recebimentos</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {stats.collectionRate.toFixed(1)}%
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  {formatCurrency(stats.receivedAmount)} de {formatCurrency(stats.totalReceivableAmount)} • {stats.receivables.count} pendentes
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-800 dark:text-purple-300">Pagamentos</p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                  {stats.paymentRate.toFixed(1)}%
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-400">
                  {formatCurrency(stats.paidAmount)} de {formatCurrency(stats.totalPayableAmount)} • {stats.payables.count} pendentes
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className={`${stats.projectedCashFlow >= 0 ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${stats.projectedCashFlow >= 0 ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
                  Fluxo de Caixa (30 dias)
                </p>
                <p className={`text-2xl font-bold ${stats.projectedCashFlow >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                  {formatCurrency(stats.projectedCashFlow)}
                </p>
                <p className={`text-xs ${stats.projectedCashFlow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  Entrada: {formatCurrency(stats.projectedIncome)} | Saída: {formatCurrency(stats.projectedExpenses)}
                </p>
              </div>
              <DollarSign className={`w-8 h-8 ${stats.projectedCashFlow >= 0 ? 'text-green-500' : 'text-red-500'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="monthly">Visão Mensal</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium">Tipo</label>
                  <select 
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    value={filters.type}
                    onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                  >
                    <option value="ALL">Todos</option>
                    <option value="RECEIVABLE">A Receber</option>
                    <option value="PAYABLE">A Pagar</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <select 
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="ALL">Todos</option>
                    <option value="PENDING">Pendente</option>
                    <option value="OVERDUE">Em Atraso</option>
                    <option value="PAID">Pago</option>
                    <option value="RECEIVED">Recebido</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Prioridade</label>
                  <select 
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    value={filters.priority}
                    onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                  >
                    <option value="ALL">Todas</option>
                    <option value="URGENT">Urgente</option>
                    <option value="HIGH">Alta</option>
                    <option value="MEDIUM">Média</option>
                    <option value="LOW">Baixa</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Período</label>
                  <select 
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    value={filters.dateRange}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                  >
                    <option value="MONTH_FROM_START">Mês Atual Completo</option>
                    <option value="TODAY">Hoje</option>
                    <option value="OVERDUE">Em Atraso</option>
                    <option value="NEXT_7_DAYS">Próximos 7 Dias</option>
                    <option value="NEXT_30_DAYS">Próximos 30 Dias</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabela de Vencimentos */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Vencimentos</CardTitle>
                  <CardDescription>
                    {filteredDueDates.length} vencimentos encontrados
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={refreshData}
                    disabled={loading}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Atualizar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Controles de seleção em lote */}
              {filteredDueDates.length > 0 && (
                <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedDues.length === filteredDueDates.length}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <label className="text-sm font-medium">
                        Selecionar todos ({filteredDueDates.length})
                      </label>
                    </div>
                    
                    {selectedDues.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">
                          {selectedDues.length} selecionados
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={clearSelection}
                          className="text-gray-600"
                        >
                          <X className="w-4 h-4" />
                          Limpar
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {/* Ações em lote */}
                  {selectedDues.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={bulkMarkAsPaid}
                        disabled={bulkActionLoading}
                        className="bg-green-50 hover:bg-green-100 text-green-700"
                      >
                        {bulkActionLoading ? (
                          <RefreshCw className="w-4 h-4 animate-spin mr-1" />
                        ) : (
                          <Check className="w-4 h-4 mr-1" />
                        )}
                        Marcar como Pago/Recebido
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={bulkMarkAsPending}
                        disabled={bulkActionLoading}
                        className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700"
                      >
                        {bulkActionLoading ? (
                          <RefreshCw className="w-4 h-4 animate-spin mr-1" />
                        ) : (
                          <Clock className="w-4 h-4 mr-1" />
                        )}
                        Marcar como Pendente
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Tabela estilo planilha */}
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
                  <p>Carregando vencimentos...</p>
                </div>
              ) : filteredDueDates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum vencimento encontrado</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 p-2 text-center w-12">
                          <input
                            type="checkbox"
                            checked={selectedDues.length === filteredDueDates.length}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          />
                        </th>
                        <th className="border border-gray-300 p-2 text-left">Data</th>
                        <th className="border border-gray-300 p-2 text-left">Descrição</th>
                        <th className="border border-gray-300 p-2 text-left">Cliente/Fornecedor</th>
                        <th className="border border-gray-300 p-2 text-center">Tipo</th>
                        <th className="border border-gray-300 p-2 text-right">Valor</th>
                        <th className="border border-gray-300 p-2 text-center">Status</th>
                        <th className="border border-gray-300 p-2 text-center">Parcela</th>
                        <th className="border border-gray-300 p-2 text-center">Dias</th>
                        <th className="border border-gray-300 p-2 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDueDates
                        .sort((a, b) => {
                          // Ordenar por data de vencimento
                          return a.dueDate.getTime() - b.dueDate.getTime();
                        })
                        .map((due) => (
                          <tr key={due.id} className={`hover:bg-gray-50 ${due.status === 'OVERDUE' ? 'bg-red-50' : ''}`}>
                            <td className="border border-gray-300 p-2 text-center">
                              <input
                                type="checkbox"
                                checked={selectedDues.includes(due.id)}
                                onChange={() => toggleDueSelection(due.id)}
                                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                              />
                            </td>
                            <td className="border border-gray-300 p-2">
                              <div className="text-sm">
                                <div className="font-medium">
                                  {format(due.dueDate, 'dd/MM/yyyy', { locale: ptBR })}
                                </div>
                                <div className={`text-xs ${getDaysUntilDue(due.dueDate) < 0 ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                                  {getDateDescription(due.dueDate)}
                                </div>
                              </div>
                            </td>
                            <td className="border border-gray-300 p-2">
                              <div className="text-sm">
                                <div className="font-medium">{due.description}</div>
                                <div className="flex items-center gap-1 mt-1">
                                  {due.attachments && due.attachments.length > 0 && (
                                    <div className="flex items-center gap-1 text-xs text-blue-600">
                                      <Paperclip className="w-3 h-3" />
                                      <span>{due.attachments.length}</span>
                                    </div>
                                  )}
                                  {due.observations && (
                                    <div className="flex items-center text-xs text-gray-500">
                                      <FileText className="w-3 h-3" />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="border border-gray-300 p-2">
                              <div className="text-sm font-medium">
                                {due.clientName || due.supplierName}
                              </div>
                              <div className="text-xs text-gray-500">
                                {due.source === 'ACCOUNT_PAYABLE' ? 'Conta a Pagar' :
                                 due.source === 'ACCOUNT_RECEIVABLE' ? 'Conta a Receber' :
                                 due.source === 'SUPPLIER_RECURRING' ? 'Fornecedor Recorrente' :
                                 'Cliente Recorrente'}
                              </div>
                            </td>
                            <td className="border border-gray-300 p-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {due.type === 'RECEIVABLE' ? (
                                  <TrendingUp className="w-4 h-4 text-green-600" />
                                ) : (
                                  <TrendingUp className="w-4 h-4 text-red-600" />
                                )}
                                <span className="text-sm">
                                  {due.type === 'RECEIVABLE' ? 'Receber' : 'Pagar'}
                                </span>
                              </div>
                            </td>
                            <td className="border border-gray-300 p-2 text-right">
                              <div className="font-medium">
                                {formatCurrency(due.amount)}
                              </div>
                              {due.paymentDate && due.paymentAmount && (
                                <div className="text-xs text-green-600">
                                  Pago: {formatCurrency(due.paymentAmount)}
                                </div>
                              )}
                            </td>
                            <td className="border border-gray-300 p-2 text-center">
                              <Badge variant="outline" className={getStatusColor(due.status)}>
                                {due.status === 'PENDING' ? 'Pendente' : 
                                 due.status === 'OVERDUE' ? 'Em Atraso' :
                                 due.status === 'PAID' ? 'Pago' : 'Recebido'}
                              </Badge>
                              {due.paymentDate && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {format(due.paymentDate, 'dd/MM/yy', { locale: ptBR })}
                                </div>
                              )}
                            </td>
                            <td className="border border-gray-300 p-2 text-center">
                              {due.installmentNumber && due.totalInstallments ? (
                                <Badge variant="outline">
                                  {due.installmentNumber}/{due.totalInstallments}
                                </Badge>
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                            </td>
                            <td className="border border-gray-300 p-2 text-center">
                              <div className={`text-sm font-medium ${getDaysUntilDue(due.dueDate) < 0 ? 'text-red-600' : getDaysUntilDue(due.dueDate) <= 7 ? 'text-orange-600' : 'text-green-600'}`}>
                                {getDaysUntilDue(due.dueDate) < 0 ? 
                                  Math.abs(getDaysUntilDue(due.dueDate)) :
                                  getDaysUntilDue(due.dueDate)
                                }
                              </div>
                              <div className="text-xs text-gray-500">
                                {getDaysUntilDue(due.dueDate) < 0 ? 'atraso' : 'dias'}
                              </div>
                            </td>
                            <td className="border border-gray-300 p-2 text-center">
                              <div className="flex justify-center">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {due.status === 'PENDING' || due.status === 'OVERDUE' ? (
                                      <DropdownMenuItem onClick={() => markAsPaid(due.id)}>
                                        <Check className="mr-2 h-4 w-4" />
                                        {due.type === 'RECEIVABLE' ? 'Marcar como Recebido' : 'Marcar como Pago'}
                                      </DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem onClick={() => markAsPending(due.id)}>
                                        <Clock className="mr-2 h-4 w-4" />
                                        Marcar como Pendente
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={() => openEditModal(due)}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      Editar
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly" className="space-y-4">
          <MonthlyView 
            dueDates={dueDates} 
            loading={loading} 
            formatCurrency={formatCurrency} 
            getStatusColor={getStatusColor} 
            markAsPaid={markAsPaid} 
            markAsPending={markAsPending} 
            openEditModal={openEditModal} 
            exportMonthlyToExcel={exportMonthlyToExcel}
          />
        </TabsContent>
      </Tabs>

      {/* Modal de Edição */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Vencimento</DialogTitle>
            <DialogDescription>
              Atualize as informações do vencimento, anexe comprovantes e adicione observações
            </DialogDescription>
          </DialogHeader>
          
          {selectedDue && (
            <div className="space-y-6">
              {/* Informações básicas */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Informações Básicas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={editForm.status} onValueChange={(value) => setEditForm(prev => ({ ...prev, status: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PENDING">Pendente</SelectItem>
                        <SelectItem value="OVERDUE">Em Atraso</SelectItem>
                        <SelectItem value={selectedDue.type === 'RECEIVABLE' ? 'RECEIVED' : 'PAID'}>
                          {selectedDue.type === 'RECEIVABLE' ? 'Recebido' : 'Pago'}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="paymentDate">Data de Pagamento</Label>
                    <Input
                      id="paymentDate"
                      type="date"
                      value={editForm.paymentDate}
                      onChange={(e) => setEditForm(prev => ({ ...prev, paymentDate: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Observações */}
              <div>
                <Label htmlFor="observations">Observações</Label>
                <Textarea
                  id="observations"
                  placeholder="Adicione observações sobre este vencimento..."
                  value={editForm.observations}
                  onChange={(e) => setEditForm(prev => ({ ...prev, observations: e.target.value }))}
                  rows={3}
                />
              </div>

              {/* Anexos */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Comprovantes</h3>
                
                {/* Upload de arquivo */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleFileUpload(file);
                      }
                    }}
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Upload className="w-5 h-5 mr-2" />
                    {uploading ? 'Enviando...' : 'Anexar Comprovante'}
                  </label>
                  <p className="text-sm text-gray-500 mt-2">
                    PDF, JPG, PNG, DOC ou DOCX até 10MB
                  </p>
                </div>

                {/* Lista de anexos */}
                {selectedDue.attachments && selectedDue.attachments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {selectedDue.attachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-gray-500" />
                          <div>
                            <p className="text-sm font-medium">{attachment.fileName}</p>
                            <p className="text-xs text-gray-500">
                              {(attachment.fileSize / 1024).toFixed(1)} KB • {format(attachment.uploadedAt, 'dd/MM/yyyy HH:mm')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(attachment.fileUrl, '_blank')}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAttachment(attachment.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Histórico de Pagamentos */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Histórico de Pagamentos</h3>
                <div className="space-y-3">
                  {selectedDue.paymentDate && (
                    <div className="border rounded-lg p-3 bg-green-50">
                      <div className="flex items-center gap-2 mb-2">
                        <Check className="w-5 h-5 text-green-600" />
                        <span className="font-medium text-green-800">
                          {selectedDue.type === 'RECEIVABLE' ? 'Recebido' : 'Pago'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Data:</span>
                          <p className="font-medium">
                            {format(selectedDue.paymentDate, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Valor:</span>
                          <p className="font-medium">
                            {selectedDue.paymentAmount ? formatCurrency(selectedDue.paymentAmount) : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Método:</span>
                          <p className="font-medium">{selectedDue.paymentMethod || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Responsável:</span>
                          <p className="font-medium">{selectedDue.updatedBy || 'Sistema'}</p>
                        </div>
                      </div>
                      {selectedDue.observations && (
                        <div className="mt-2">
                          <span className="text-gray-600 text-sm">Observações:</span>
                          <p className="text-sm bg-white p-2 rounded border mt-1">
                            {selectedDue.observations}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Histórico de alterações */}
                  <div className="border rounded-lg p-3 bg-gray-50">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-5 h-5 text-gray-600" />
                      <span className="font-medium text-gray-800">Alterações</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Criado em:</span>
                        <span className="font-medium">
                          {format(selectedDue.dueDate, 'dd/MM/yyyy', { locale: ptBR })} (Data de vencimento)
                        </span>
                      </div>
                      {selectedDue.updatedAt && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Última atualização:</span>
                          <span className="font-medium">
                            {format(selectedDue.updatedAt, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status atual:</span>
                        <Badge variant="outline" className={getStatusColor(selectedDue.status)}>
                          {selectedDue.status === 'PENDING' ? 'Pendente' : 
                           selectedDue.status === 'OVERDUE' ? 'Em Atraso' :
                           selectedDue.status === 'PAID' ? 'Pago' : 'Recebido'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Informações adicionais */}
                  <div className="border rounded-lg p-3 bg-blue-50">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-5 h-5 text-blue-600" />
                      <span className="font-medium text-blue-800">Informações Financeiras</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Valor original:</span>
                        <p className="font-medium text-lg">{formatCurrency(selectedDue.amount)}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Prioridade:</span>
                        <Badge className={getPriorityColor(selectedDue.priority)}>
                          {selectedDue.priority}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-gray-600">Fonte:</span>
                        <p className="font-medium">
                          {selectedDue.source === 'ACCOUNT_PAYABLE' ? 'Conta a Pagar' :
                           selectedDue.source === 'ACCOUNT_RECEIVABLE' ? 'Conta a Receber' :
                           selectedDue.source === 'SUPPLIER_RECURRING' ? 'Fornecedor Recorrente' :
                           'Cliente Recorrente'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Dias até vencimento:</span>
                        <p className={`font-medium ${getDaysUntilDue(selectedDue.dueDate) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {getDaysUntilDue(selectedDue.dueDate) < 0 ? 
                            `${Math.abs(getDaysUntilDue(selectedDue.dueDate))} dias em atraso` :
                            `${getDaysUntilDue(selectedDue.dueDate)} dias`
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botões de ação */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={saveEditForm}>
                  Salvar Alterações
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}; 