import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { createAccountPayable, updateAccountPayable } from "@/services/financialCoreService";
import { AccountsPayable, PaymentInstallment } from "@/types/financial";
import { Loader2, Receipt } from "lucide-react";
import { addMonths, format } from "date-fns";

interface GeneralExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: AccountsPayable | null;
}

export const GeneralExpenseFormModal = ({ isOpen, onClose, onSuccess, initialData }: GeneralExpenseFormModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isInstallment, setIsInstallment] = useState(false);
  
  const [formData, setFormData] = useState({
    supplierName: "", // Nome livre, não vínculo com fornecedor cadastrado
    description: "",
    totalAmount: "",
    dueDate: "",
    costCenterId: "001", // Valor padrão
    accountId: "001", // Valor padrão - Plano de contas
    categoryId: "OPERATIONAL", // Valor padrão
    installmentCount: 1,
    attachments: [] as string[],
    createdBy: "current-user" // Será substituído pelo usuário logado
  });

  // Efeito para preencher formulário quando há dados iniciais (edição)
  useEffect(() => {
    if (initialData) {
      setFormData({
        supplierName: initialData.supplierName || "",
        description: initialData.description || "",
        totalAmount: initialData.totalAmount.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }),
        dueDate: initialData.dueDate.toISOString().split('T')[0],
        costCenterId: initialData.costCenterId || "001",
        accountId: initialData.accountId || "001",
        categoryId: initialData.categoryId || "OPERATIONAL",
        installmentCount: initialData.installments?.length || 1,
        attachments: initialData.attachments || [],
        createdBy: initialData.createdBy || "current-user"
      });

      // Definir se é parcelado
      setIsInstallment((initialData.installments?.length || 0) > 1);
    } else {
      // Reset form para criação
      setFormData({
        supplierName: "",
        description: "",
        totalAmount: "",
        dueDate: "",
        costCenterId: "001",
        accountId: "001",
        categoryId: "OPERATIONAL",
        installmentCount: 1,
        attachments: [],
        createdBy: "current-user"
      });
      setIsInstallment(false);
    }
  }, [initialData, isOpen]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatCurrency = (value: string) => {
    // Remove tudo que não é dígito
    const numbers = value.replace(/\D/g, '');
    
    // Converte para número e formata
    const numberValue = parseFloat(numbers) / 100;
    
    return numberValue.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const parseCurrency = (value: string): number => {
    const numbers = value.replace(/\D/g, '');
    return parseFloat(numbers) / 100;
  };

  const generateInstallments = (totalAmount: number, dueDate: Date, count: number): PaymentInstallment[] => {
    const installmentAmount = totalAmount / count;
    const installments: PaymentInstallment[] = [];

    for (let i = 0; i < count; i++) {
      const installmentDueDate = addMonths(dueDate, i);
      installments.push({
        id: `temp-${i + 1}`,
        installmentNumber: i + 1,
        amount: installmentAmount,
        dueDate: installmentDueDate,
        status: 'PENDENTE',
        notes: `Parcela ${i + 1}/${count}`
      });
    }

    return installments;
  };

  const validateForm = () => {
    if (!formData.description.trim()) {
      toast.error("Descrição é obrigatória");
      return false;
    }

    if (!formData.totalAmount || parseCurrency(formData.totalAmount) <= 0) {
      toast.error("Valor deve ser maior que zero");
      return false;
    }

    if (!formData.dueDate) {
      toast.error("Data de vencimento é obrigatória");
      return false;
    }

    const dueDate = new Date(formData.dueDate);
    if (dueDate < new Date()) {
      toast.error("Data de vencimento deve ser futura");
      return false;
    }

    if (isInstallment && formData.installmentCount < 2) {
      toast.error("Parcelamento deve ter pelo menos 2 parcelas");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const totalAmount = parseCurrency(formData.totalAmount);
      const dueDate = new Date(formData.dueDate);
      
      // Gerar parcelas se parcelado
      let installments: PaymentInstallment[] = [];
      
      if (isInstallment) {
        installments = generateInstallments(totalAmount, dueDate, formData.installmentCount);
      } else {
        // Conta única
        installments = [{
          id: 'temp-1',
          installmentNumber: 1,
          amount: totalAmount,
          dueDate: dueDate,
          status: 'PENDENTE',
          notes: 'Pagamento único'
        }];
      }

      const accountData: Omit<AccountsPayable, 'id' | 'createdAt' | 'updatedAt'> = {
        supplierId: "general-expense", // ID especial para despesas gerais
        supplierName: formData.supplierName.trim() || "Despesa Geral da Empresa",
        description: formData.description.trim(),
        totalAmount,
        dueDate,
        status: 'PENDENTE',
        costCenterId: formData.costCenterId,
        accountId: formData.accountId,
        categoryId: formData.categoryId,
        installments,
        attachments: formData.attachments,
        createdBy: formData.createdBy
      };

      const isEditing = !!initialData;
      
      if (isEditing) {
        // Atualizar despesa existente
        await updateAccountPayable(initialData.id, accountData);
      } else {
        // Criar nova despesa
        await createAccountPayable(accountData);
      }
      
      toast.success(
        isEditing 
          ? "Despesa atualizada com sucesso!"
          : isInstallment 
            ? `Despesa parcelada criada com sucesso! ${formData.installmentCount} parcelas.`
            : "Despesa geral criada com sucesso!"
      );
      
      onSuccess();
      onClose();
      
      // Reset form
      setFormData({
        supplierName: "",
        description: "",
        totalAmount: "",
        dueDate: "",
        costCenterId: "001",
        accountId: "001",
        categoryId: "OPERATIONAL",
        installmentCount: 1,
        attachments: [],
        createdBy: "current-user"
      });
      setIsInstallment(false);
      
    } catch (error) {
      console.error("Erro ao criar despesa geral:", error);
      toast.error("Erro ao criar despesa geral. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            {initialData ? "Editar Despesa" : "Nova Despesa Geral"}
          </DialogTitle>
          <DialogDescription>
            {initialData 
              ? "Altere os dados da despesa conforme necessário."
              : "Cadastre uma despesa geral da empresa (aluguel, energia, internet, etc.)."
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Fornecedor/Empresa (opcional) */}
          <div className="space-y-2">
            <Label htmlFor="supplierName">Empresa/Fornecedor (opcional)</Label>
            <Input
              id="supplierName"
              value={formData.supplierName}
              onChange={(e) => handleInputChange('supplierName', e.target.value)}
              placeholder="Ex: Companhia de Energia, Imobiliária XYZ..."
            />
            <p className="text-xs text-gray-500">
              Deixe em branco para despesas gerais da empresa
            </p>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição da Despesa *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Ex: Aluguel do escritório, Conta de energia, Internet..."
              rows={3}
              required
            />
          </div>

          {/* Valor e Data */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="totalAmount">Valor Total *</Label>
              <Input
                id="totalAmount"
                value={formData.totalAmount}
                onChange={(e) => handleInputChange('totalAmount', formatCurrency(e.target.value))}
                placeholder="R$ 0,00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Data de Vencimento *</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => handleInputChange('dueDate', e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
                required
              />
            </div>
          </div>

          {/* Parcelamento */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isInstallment"
                checked={isInstallment}
                onCheckedChange={(checked) => setIsInstallment(!!checked)}
              />
              <Label htmlFor="isInstallment">Parcelar pagamento</Label>
            </div>

            {isInstallment && (
              <div className="p-4 border rounded-lg bg-blue-50">
                <div className="space-y-2">
                  <Label htmlFor="installmentCount">Número de Parcelas</Label>
                  <Select 
                    value={formData.installmentCount.toString()} 
                    onValueChange={(value) => handleInputChange('installmentCount', value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 2).map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          {num}x
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-600">
                    Valor por parcela: {formData.totalAmount && parseCurrency(formData.totalAmount) > 0 
                      ? (parseCurrency(formData.totalAmount) / formData.installmentCount).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        })
                      : "R$ 0,00"
                    }
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Categoria e Centro de Custo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select 
                value={formData.categoryId} 
                onValueChange={(value) => handleInputChange('categoryId', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPERATIONAL">Operacional</SelectItem>
                  <SelectItem value="ADMINISTRATIVE">Administrativo</SelectItem>
                  <SelectItem value="FINANCIAL">Financeiro</SelectItem>
                  <SelectItem value="IT">Tecnologia</SelectItem>
                  <SelectItem value="FACILITIES">Infraestrutura</SelectItem>
                  <SelectItem value="UTILITIES">Utilidades (Energia, Água, etc.)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="costCenter">Centro de Custo</Label>
              <Select 
                value={formData.costCenterId} 
                onValueChange={(value) => handleInputChange('costCenterId', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="001">Administração</SelectItem>
                  <SelectItem value="002">Projetos</SelectItem>
                  <SelectItem value="003">Comercial</SelectItem>
                  <SelectItem value="004">Operacional</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Exemplos de Despesas Gerais */}
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            <p><strong>Exemplos de despesas gerais:</strong></p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Aluguel do escritório</li>
              <li>Contas de energia elétrica, água, gás</li>
              <li>Internet e telefonia</li>
              <li>Material de escritório</li>
              <li>Software e licenças</li>
              <li>Manutenção e limpeza</li>
            </ul>
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData 
              ? "Salvar Alterações"
              : isInstallment 
                ? `Criar ${formData.installmentCount} Parcelas` 
                : 'Criar Despesa'
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 