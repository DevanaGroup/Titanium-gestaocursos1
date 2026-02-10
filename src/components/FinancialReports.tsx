import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Download,
  Calendar,
  FileText,
  GraduationCap,
  Filter,
  X
} from "lucide-react";
import { format, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { db } from "@/config/firebase";
import { collection, getDocs, query, orderBy, doc, getDoc } from "firebase/firestore";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface TeacherPayment {
  id: string;
  professorName: string;
  courseTitle: string;
  lessonDate: string;
  amount: number;
}

interface Income {
  id: string;
  description: string;
  amount: number;
  date: string;
  status: string;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  status: string;
  category: string;
}

export const FinancialReports = () => {
  const [startDate, setStartDate] = useState<string>(
    format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState<string>(
    format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), "yyyy-MM-dd")
  );
  const [reportType, setReportType] = useState<string>("summary");
  const [isLoading, setIsLoading] = useState(true);
  
  // Dados financeiros
  const [teacherPayments, setTeacherPayments] = useState<TeacherPayment[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  
  // Totais calculados
  const [totalIncomes, setTotalIncomes] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalTeacherPayments, setTotalTeacherPayments] = useState(0);

  useEffect(() => {
    fetchAllFinancialData();
  }, []);

  useEffect(() => {
    calculateTotals();
  }, [startDate, endDate, teacherPayments, incomes, expenses]);

  const fetchAllFinancialData = async () => {
    setIsLoading(true);
    console.log("🔍 Iniciando busca de dados financeiros...");
    try {
      await Promise.all([
        fetchTeacherPayments(),
        fetchIncomes(),
        fetchExpenses()
      ]);
      console.log("✅ Dados financeiros carregados com sucesso");
    } catch (error) {
      console.error("❌ Erro ao buscar dados financeiros:", error);
      toast.error("Erro ao carregar dados financeiros");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeacherPayments = async () => {
    try {
      console.log("📚 Buscando pagamentos de professores...");
      const lessonsCol = collection(db, "lessons");
      const lessonsQuery = query(lessonsCol, orderBy("createdAt", "desc"));
      const lessonsSnapshot = await getDocs(lessonsQuery);

      console.log(`📊 Total de aulas encontradas: ${lessonsSnapshot.size}`);

      const payments: TeacherPayment[] = [];
      let skippedCount = 0;
      let processedCount = 0;

      for (const lessonDoc of lessonsSnapshot.docs) {
        const data = lessonDoc.data();
        const professorId = data.professorId;
        const professorPaymentValue = data.professorPaymentValue;

        console.log(`Aula ${lessonDoc.id}:`, {
          professorId,
          professorPaymentValue,
          lessonDate: data.lessonDate
        });

        if (!professorId || professorPaymentValue == null) {
          skippedCount++;
          continue;
        }

        processedCount++;

        let professorName = data.professorName || "";
        let courseTitle = "";

        if (data.courseId) {
          try {
            const courseDoc = await getDoc(doc(db, "courses", data.courseId));
            if (courseDoc.exists()) {
              courseTitle = (courseDoc.data()?.title as string) || "";
            }
          } catch {
            // ignore
          }
        }

        try {
          const userDoc = await getDoc(doc(db, "users", professorId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            professorName =
              userData.fullName ||
              userData.displayName ||
              `${userData.firstName || ""} ${userData.lastName || ""}`.trim();
          }
        } catch {
          // ignore
        }

        payments.push({
          id: lessonDoc.id,
          professorName: professorName || "Professor",
          courseTitle: courseTitle || data.courseId || "-",
          lessonDate: data.lessonDate || "",
          amount: typeof professorPaymentValue === "number" ? professorPaymentValue : 0,
        });
      }

      console.log(`📊 Resumo:`);
      console.log(`  - Total de aulas: ${lessonsSnapshot.size}`);
      console.log(`  - Aulas processadas: ${processedCount}`);
      console.log(`  - Aulas ignoradas (sem professor ou valor): ${skippedCount}`);
      console.log(`💰 Total de pagamentos de professores: ${payments.length}`);
      if (payments.length > 0) {
        console.log("Datas das aulas com pagamento:", payments.map(p => p.lessonDate));
      }
      console.log("Pagamentos:", payments);
      setTeacherPayments(payments);
    } catch (error) {
      console.error("❌ Erro ao buscar pagamentos de professores:", error);
    }
  };

  const fetchIncomes = async () => {
    try {
      // TODO: Implementar quando a coleção de incomes estiver criada
      // Por enquanto, retorna array vazio
      setIncomes([]);
    } catch (error) {
      console.error("Erro ao buscar entradas:", error);
    }
  };

  const fetchExpenses = async () => {
    try {
      // TODO: Implementar quando a coleção de expenses estiver criada
      // Por enquanto, retorna array vazio
      setExpenses([]);
    } catch (error) {
      console.error("Erro ao buscar saídas:", error);
    }
  };

  const calculateTotals = () => {
    console.log("🧮 Calculando totais...");
    console.log("Período:", startDate, "até", endDate);
    console.log("Teacher Payments:", teacherPayments.length);
    
    const start = parseISO(startDate + "T00:00:00");
    const end = parseISO(endDate + "T23:59:59");

    // Filtrar e somar pagamentos de professores
    const filteredTeacherPayments = teacherPayments.filter((payment) => {
      if (!payment.lessonDate) return false;
      try {
        const paymentDate = parseISO(payment.lessonDate + "T12:00:00");
        const isInInterval = isWithinInterval(paymentDate, { start, end });
        console.log(`Data: ${payment.lessonDate}, No período: ${isInInterval}`);
        return isInInterval;
      } catch (error) {
        console.error("Erro ao parsear data:", payment.lessonDate, error);
        return false;
      }
    });
    
    console.log("Pagamentos filtrados:", filteredTeacherPayments.length);
    
    const totalTeacher = filteredTeacherPayments.reduce((acc, p) => acc + p.amount, 0);
    console.log("Total pagamentos professores:", totalTeacher);
    setTotalTeacherPayments(totalTeacher);

    // Filtrar e somar entradas
    const filteredIncomes = incomes.filter((income) => {
      if (!income.date) return false;
      try {
        const incomeDate = parseISO(income.date);
        return isWithinInterval(incomeDate, { start, end });
      } catch {
        return false;
      }
    });
    const totalInc = filteredIncomes.reduce((acc, i) => acc + i.amount, 0);
    setTotalIncomes(totalInc);

    // Filtrar e somar despesas (incluindo pagamentos de professores)
    const filteredExpenses = expenses.filter((expense) => {
      if (!expense.date) return false;
      try {
        const expenseDate = parseISO(expense.date);
        return isWithinInterval(expenseDate, { start, end });
      } catch {
        return false;
      }
    });
    const totalExp = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
    const totalExpensesWithTeachers = totalExp + totalTeacher;
    console.log("Total despesas (com professores):", totalExpensesWithTeachers);
    setTotalExpenses(totalExpensesWithTeachers);
  };

  const getFilteredTeacherPayments = () => {
    const start = parseISO(startDate + "T00:00:00");
    const end = parseISO(endDate + "T23:59:59");
    
    return teacherPayments.filter((payment) => {
      if (!payment.lessonDate) return false;
      try {
        const paymentDate = parseISO(payment.lessonDate + "T12:00:00");
        return isWithinInterval(paymentDate, { start, end });
      } catch {
        return false;
      }
    });
  };

  const getFilteredIncomes = () => {
    const start = parseISO(startDate + "T00:00:00");
    const end = parseISO(endDate + "T23:59:59");
    
    return incomes.filter((income) => {
      if (!income.date) return false;
      try {
        const incomeDate = parseISO(income.date);
        return isWithinInterval(incomeDate, { start, end });
      } catch {
        return false;
      }
    });
  };

  const getFilteredExpenses = () => {
    const start = parseISO(startDate + "T00:00:00");
    const end = parseISO(endDate + "T23:59:59");
    
    return expenses.filter((expense) => {
      if (!expense.date) return false;
      try {
        const expenseDate = parseISO(expense.date);
        return isWithinInterval(expenseDate, { start, end });
      } catch {
        return false;
      }
    });
  };

  const netBalance = totalIncomes - totalExpenses;
  const profitMargin = totalIncomes > 0 ? ((netBalance / totalIncomes) * 100).toFixed(1) : "0.0";

  const handleExport = () => {
    try {
      // Preparar dados para exportação
      const exportData = [];
      
      // Cabeçalho do relatório
      exportData.push(['RELATÓRIO FINANCEIRO']);
      exportData.push([`Período: ${format(parseISO(startDate), "dd/MM/yyyy", { locale: ptBR })} até ${format(parseISO(endDate), "dd/MM/yyyy", { locale: ptBR })}`]);
      exportData.push(['']);
      
      // Resumo
      exportData.push(['RESUMO GERAL']);
      exportData.push(['Total de Entradas', `R$ ${totalIncomes.toFixed(2).replace('.', ',')}`]);
      exportData.push(['Total de Saídas', `R$ ${totalExpenses.toFixed(2).replace('.', ',')}`]);
      exportData.push(['  - Pagamentos a Professores', `R$ ${totalTeacherPayments.toFixed(2).replace('.', ',')}`]);
      exportData.push(['  - Outras Despesas', `R$ ${(totalExpenses - totalTeacherPayments).toFixed(2).replace('.', ',')}`]);
      exportData.push(['Saldo Líquido', `R$ ${netBalance.toFixed(2).replace('.', ',')}`]);
      exportData.push(['Margem de Lucro', `${profitMargin}%`]);
      exportData.push(['']);
      
      // Pagamentos de Professores
      const filteredTeacherPayments = getFilteredTeacherPayments();
      if (filteredTeacherPayments.length > 0) {
        exportData.push(['PAGAMENTOS A PROFESSORES']);
        exportData.push(['Data da Aula', 'Professor', 'Curso', 'Valor']);
        filteredTeacherPayments.forEach(payment => {
          exportData.push([
            format(parseISO(payment.lessonDate + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR }),
            payment.professorName,
            payment.courseTitle,
            `R$ ${payment.amount.toFixed(2).replace('.', ',')}`
          ]);
        });
        exportData.push(['']);
      }
      
      // Entradas
      const filteredIncomes = getFilteredIncomes();
      if (filteredIncomes.length > 0) {
        exportData.push(['ENTRADAS']);
        exportData.push(['Data', 'Descrição', 'Valor', 'Status']);
        filteredIncomes.forEach(income => {
          exportData.push([
            format(parseISO(income.date), "dd/MM/yyyy", { locale: ptBR }),
            income.description,
            `R$ ${income.amount.toFixed(2).replace('.', ',')}`,
            income.status
          ]);
        });
        exportData.push(['']);
      }
      
      // Despesas
      const filteredExpenses = getFilteredExpenses();
      if (filteredExpenses.length > 0) {
        exportData.push(['OUTRAS DESPESAS']);
        exportData.push(['Data', 'Descrição', 'Categoria', 'Valor']);
        filteredExpenses.forEach(expense => {
          exportData.push([
            format(parseISO(expense.date), "dd/MM/yyyy", { locale: ptBR }),
            expense.description,
            expense.category,
            `R$ ${expense.amount.toFixed(2).replace('.', ',')}`
          ]);
        });
      }
      
      // Converter para CSV
      const csvContent = exportData.map(row => row.join(';')).join('\n');
      
      // Criar blob e fazer download
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      const fileName = `relatorio_financeiro_${format(parseISO(startDate), "yyyy-MM-dd")}_${format(parseISO(endDate), "yyyy-MM-dd")}.csv`;
      
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Relatório exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar relatório:", error);
      toast.error("Erro ao exportar relatório");
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios Financeiros</h1>
          <p className="text-muted-foreground">
            Visualize e exporte relatórios financeiros detalhados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
              >
                <Filter className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">Filtros de Período</h4>
                </div>

                <div className="space-y-3">
                  {/* Filtro de Data Inicial */}
                  <div className="space-y-2">
                    <Label htmlFor="startDate" className="text-xs font-medium">
                      Data Inicial
                    </Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-9"
                    />
                  </div>

                  {/* Filtro de Data Final */}
                  <div className="space-y-2">
                    <Label htmlFor="endDate" className="text-xs font-medium">
                      Data Final
                    </Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="h-9"
                    />
                  </div>

                  {/* Filtro de Tipo de Relatório */}
                  <div className="space-y-2">
                    <Label htmlFor="reportType" className="text-xs font-medium">
                      Tipo de Relatório
                    </Label>
                    <Select value={reportType} onValueChange={setReportType}>
                      <SelectTrigger id="reportType" className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="summary">Resumo Geral</SelectItem>
                        <SelectItem value="incomes">Entradas</SelectItem>
                        <SelectItem value="expenses">Saídas</SelectItem>
                        <SelectItem value="teachers">Pagamentos Professores</SelectItem>
                        <SelectItem value="cashflow">Fluxo de Caixa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Exportar Relatório
          </Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Entradas</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(totalIncomes)}
                </div>
                <p className="text-xs text-muted-foreground">
                  No período selecionado
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Saídas</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(totalExpenses)}
                </div>
                <p className="text-xs text-muted-foreground">
                  No período selecionado
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Saldo Líquido</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(netBalance)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Entradas - Saídas
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Margem</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${parseFloat(profitMargin) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {profitMargin}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Margem de lucro
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Abas de Relatórios */}
          <Card className="min-h-[600px]">
            <CardHeader>
              <CardTitle>Relatórios Detalhados</CardTitle>
              <CardDescription>
                Selecione o tipo de relatório para visualizar
              </CardDescription>
            </CardHeader>
            <CardContent className="max-h-[500px] overflow-y-auto">
              <Tabs defaultValue="summary" value={reportType} onValueChange={setReportType}>
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="summary">Resumo</TabsTrigger>
                  <TabsTrigger value="incomes">Entradas</TabsTrigger>
                  <TabsTrigger value="expenses">Saídas</TabsTrigger>
                  <TabsTrigger value="teachers">Professores</TabsTrigger>
                  <TabsTrigger value="cashflow">Fluxo</TabsTrigger>
                </TabsList>
                
                <TabsContent value="summary" className="mt-4">
                  <div className="space-y-4">
                    <div className="rounded-lg border p-6">
                      <h3 className="font-semibold mb-4">Resumo Geral do Período</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-muted-foreground">Total de Entradas:</span>
                          <span className="font-semibold text-green-600">
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(totalIncomes)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-muted-foreground">Total de Saídas:</span>
                          <span className="font-semibold text-red-600">
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(totalExpenses)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-muted-foreground pl-4">• Pagamentos a Professores:</span>
                          <span className="font-semibold text-amber-600">
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(totalTeacherPayments)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-muted-foreground pl-4">• Outras Despesas:</span>
                          <span className="font-semibold text-red-600">
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(totalExpenses - totalTeacherPayments)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-3 bg-muted/50 px-3 rounded-md mt-4">
                          <span className="font-semibold">Saldo Líquido:</span>
                          <span className={`font-bold text-lg ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(netBalance)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="incomes" className="mt-4">
                  <div className="space-y-4">
                    {getFilteredIncomes().length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhuma entrada registrada no período</p>
                        <p className="text-sm mt-2">
                          As entradas aparecerão aqui quando forem cadastradas
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Data</TableHead>
                              <TableHead>Descrição</TableHead>
                              <TableHead className="text-right">Valor</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {getFilteredIncomes().map((income) => (
                              <TableRow key={income.id}>
                                <TableCell>
                                  {format(parseISO(income.date), "dd/MM/yyyy", { locale: ptBR })}
                                </TableCell>
                                <TableCell>{income.description}</TableCell>
                                <TableCell className="text-right font-medium">
                                  {new Intl.NumberFormat("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  }).format(income.amount)}
                                </TableCell>
                                <TableCell>{income.status}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="expenses" className="mt-4">
                  <div className="space-y-4">
                    {getFilteredExpenses().length === 0 && getFilteredTeacherPayments().length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <TrendingDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhuma saída registrada no período</p>
                        <p className="text-sm mt-2">
                          As saídas e pagamentos de professores aparecerão aqui
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Data</TableHead>
                              <TableHead>Descrição</TableHead>
                              <TableHead>Categoria</TableHead>
                              <TableHead className="text-right">Valor</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {getFilteredExpenses().map((expense) => (
                              <TableRow key={expense.id}>
                                <TableCell>
                                  {format(parseISO(expense.date), "dd/MM/yyyy", { locale: ptBR })}
                                </TableCell>
                                <TableCell>{expense.description}</TableCell>
                                <TableCell>{expense.category}</TableCell>
                                <TableCell className="text-right font-medium">
                                  {new Intl.NumberFormat("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  }).format(expense.amount)}
                                </TableCell>
                              </TableRow>
                            ))}
                            {getFilteredTeacherPayments().map((payment) => (
                              <TableRow key={payment.id} className="bg-amber-50/30">
                                <TableCell>
                                  {format(parseISO(payment.lessonDate), "dd/MM/yyyy", { locale: ptBR })}
                                </TableCell>
                                <TableCell>
                                  Pagamento - {payment.professorName}
                                  <span className="text-xs text-muted-foreground block">
                                    {payment.courseTitle}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <span className="inline-flex items-center gap-1">
                                    <GraduationCap className="h-3 w-3" />
                                    Professor
                                  </span>
                                </TableCell>
                                <TableCell className="text-right font-medium text-amber-600">
                                  {new Intl.NumberFormat("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  }).format(payment.amount)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="teachers" className="mt-4">
                  <div className="space-y-4">
                    {getFilteredTeacherPayments().length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhum pagamento a professor no período</p>
                        <p className="text-sm mt-2">
                          Vincule professores às aulas para gerar pagamentos
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Data da Aula</TableHead>
                              <TableHead>Professor</TableHead>
                              <TableHead>Curso</TableHead>
                              <TableHead className="text-right">Valor</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {getFilteredTeacherPayments().map((payment) => (
                              <TableRow key={payment.id}>
                                <TableCell>
                                  {format(parseISO(payment.lessonDate), "dd/MM/yyyy", { locale: ptBR })}
                                </TableCell>
                                <TableCell className="font-medium">{payment.professorName}</TableCell>
                                <TableCell>{payment.courseTitle}</TableCell>
                                <TableCell className="text-right font-medium text-amber-600">
                                  {new Intl.NumberFormat("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  }).format(payment.amount)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="cashflow" className="mt-4">
                  <div className="space-y-4">
                    <div className="rounded-lg border p-6">
                      <h3 className="font-semibold mb-4">Análise de Fluxo de Caixa</h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                            <div className="text-sm text-muted-foreground mb-1">Entradas</div>
                            <div className="text-2xl font-bold text-green-600">
                              {new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              }).format(totalIncomes)}
                            </div>
                          </div>
                          <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                            <div className="text-sm text-muted-foreground mb-1">Saídas</div>
                            <div className="text-2xl font-bold text-red-600">
                              {new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              }).format(totalExpenses)}
                            </div>
                          </div>
                        </div>
                        <div className="p-4 rounded-lg bg-muted">
                          <div className="text-sm text-muted-foreground mb-1">Fluxo Líquido</div>
                          <div className={`text-3xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(netBalance)}
                          </div>
                          <div className="text-xs text-muted-foreground mt-2">
                            Margem: {profitMargin}%
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
