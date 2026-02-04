import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, GraduationCap, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { db } from "@/config/firebase";
import { collection, getDocs, query, orderBy, doc, getDoc } from "firebase/firestore";

interface TeacherPaymentItem {
  id: string;
  lessonId: string;
  professorId: string;
  professorName: string;
  courseTitle: string;
  lessonDate: string;
  amount: number;
  reference: string;
  status: "PENDENTE" | "PAGO";
  paymentData?: {
    bank?: string;
    agency?: string;
    account?: string;
    pix?: string;
  };
}

export const TeacherPaymentsModule = () => {
  const [payments, setPayments] = useState<TeacherPaymentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchTeacherPayments();
  }, []);

  const fetchTeacherPayments = async () => {
    setIsLoading(true);
    try {
      const lessonsCol = collection(db, "lessons");
      const lessonsQuery = query(lessonsCol, orderBy("createdAt", "desc"));
      const lessonsSnapshot = await getDocs(lessonsQuery);

      const items: TeacherPaymentItem[] = [];

      for (const lessonDoc of lessonsSnapshot.docs) {
        const data = lessonDoc.data();
        const professorId = data.professorId;
        const professorPaymentValue = data.professorPaymentValue;

        if (!professorId || professorPaymentValue == null) continue;

        let professorName = data.professorName || "";
        let courseTitle = "";
        let paymentData: TeacherPaymentItem["paymentData"] = {};

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
            paymentData = userData.paymentData || {};
          }
        } catch {
          // ignore
        }

        items.push({
          id: lessonDoc.id,
          lessonId: lessonDoc.id,
          professorId,
          professorName: professorName || "Professor",
          courseTitle: courseTitle || data.courseId || "-",
          lessonDate: data.lessonDate || "-",
          amount: typeof professorPaymentValue === "number" ? professorPaymentValue : 0,
          reference: "Aula aplicada",
          status: "PENDENTE",
          paymentData,
        });
      }

      setPayments(items);
    } catch (error) {
      console.error("Erro ao buscar pagamentos de professores:", error);
      setPayments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPayments = payments.filter(
    (p) =>
      p.professorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.courseTitle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPendente = filteredPayments
    .filter((p) => p.status === "PENDENTE")
    .reduce((acc, p) => acc + p.amount, 0);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <GraduationCap className="h-8 w-8" />
          Pagamentos a Professores
        </h1>
        <p className="text-muted-foreground mt-1">
          Consulta de valores devidos a professores referentes a aulas aplicadas
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Pendente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(totalPendente)}
            </div>
            <p className="text-xs text-muted-foreground">
              Valores a pagar por aulas ministradas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Aulas com Professor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredPayments.length}</div>
            <p className="text-xs text-muted-foreground">
              Aulas com professor vinculado
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listagem</CardTitle>
          <CardDescription>
            Referente: Aula aplicada pelo professor. Dados para pagamento disponíveis no cadastro do professor.
          </CardDescription>
          <div className="relative pt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por professor ou curso..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchTerm
                ? "Nenhum pagamento encontrado com os filtros aplicados"
                : "Nenhuma aula com professor vinculado. Vincule um professor nas aulas para consultar os pagamentos."}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Professor</TableHead>
                    <TableHead>Curso / Aula</TableHead>
                    <TableHead>Data da Aula</TableHead>
                    <TableHead className="text-right">Valor (R$)</TableHead>
                    <TableHead>Referente</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.professorName}</TableCell>
                      <TableCell>{item.courseTitle}</TableCell>
                      <TableCell>
                        {item.lessonDate !== "-"
                          ? format(new Date(item.lessonDate + "T12:00:00"), "dd/MM/yyyy", {
                              locale: ptBR,
                            })
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(item.amount)}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <FileText className="h-4 w-4" />
                          Aula aplicada
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={item.status === "PAGO" ? "default" : "secondary"}
                          className={
                            item.status === "PENDENTE"
                              ? "bg-amber-100 text-amber-800 hover:bg-amber-100"
                              : ""
                          }
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
