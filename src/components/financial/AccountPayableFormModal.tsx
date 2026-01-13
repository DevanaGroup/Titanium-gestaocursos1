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
import { createAccountPayable, getAllSuppliers } from "@/services/financialCoreService";
import { AccountsPayable, Supplier, PaymentInstallment } from "@/types/financial";
import { Loader2, CreditCard, Plus, Trash2 } from "lucide-react";
import { addMonths, format } from "date-fns";

interface AccountPayableFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AccountPayableFormModal = ({ isOpen, onClose, onSuccess }: AccountPayableFormModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isInstallment, setIsInstallment] = useState(false);
  
  const [formData, setFormData] = useState({
    supplierId: "",
    supplierName: "",
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

  // Carregar fornecedores quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      loadSuppliers();
    }
  }, [isOpen]);

  const loadSuppliers = async () => {
    setLoadingSuppliers(true);
    try {
      const suppliersData = await getAllSuppliers();
      setSuppliers(suppliersData);
    } catch (error) {
      console.error("Erro ao carregar fornecedores:", error);
      toast.error("Erro ao carregar fornecedores");
    } finally {
      setLoadingSuppliers(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSupplierChange = (supplierId: string) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    setFormData(prev => ({
      ...prev,
      supplierId,
      supplierName: supplier?.name || ""
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
    if (!formData.supplierId) {
      toast.error("Selecione um fornecedor");
      return false;
    }

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
        supplierId: formData.supplierId,
        supplierName: formData.supplierName,
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

      await createAccountPayable(accountData);
      
      toast.success(
        isInstallment 
          ? `Conta parcelada criada com sucesso! ${formData.installmentCount} parcelas.`
          : "Conta a pagar criada com sucesso!"
      );
      
      onSuccess();
      onClose();
      
      // Reset form
      setFormData({
        supplierId: "",
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
      console.error("Erro ao criar conta a pagar:", error);
      toast.error("Erro ao criar conta a pagar. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Nova Conta a Pagar
          </DialogTitle>
          <DialogDescription>
            Cadastre uma nova conta a pagar no sistema.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Fornecedor */}
          <div className="space-y-2">
            <Label htmlFor="supplier">Fornecedor *</Label>
            <Select 
              value={formData.supplierId} 
              onValueChange={handleSupplierChange}
              disabled={loadingSuppliers}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingSuppliers ? "Carregando..." : "Selecione um fornecedor"} />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name} {supplier.cnpj && `(${supplier.cnpj})`}
                  </SelectItem>
                ))}
                {suppliers.length === 0 && !loadingSuppliers && (
                  <SelectItem value="none" disabled>
                    Nenhum fornecedor cadastrado
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {suppliers.length === 0 && !loadingSuppliers && (
              <p className="text-sm text-gray-500">
                <button 
                  type="button"
                  className="text-blue-600 hover:underline"
                  onClick={() => {}}
                >
                  Cadastre um fornecedor primeiro
                </button>
              </p>
            )}
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Descreva o serviço ou produto..."
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
                  <SelectItem value="MARKETING">Marketing</SelectItem>
                  <SelectItem value="ADMINISTRATIVE">Administrativo</SelectItem>
                  <SelectItem value="FINANCIAL">Financeiro</SelectItem>
                  <SelectItem value="IT">Tecnologia</SelectItem>
                  <SelectItem value="HR">Recursos Humanos</SelectItem>
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

          {/* Observações */}
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            <p><strong>Informações importantes:</strong></p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>A conta será criada com status "PENDENTE"</li>
              <li>Você poderá anexar documentos após a criação</li>
              <li>Parcelamentos criam várias parcelas com vencimentos mensais</li>
              <li>O fornecedor receberá notificação por email (se configurado)</li>
            </ul>
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || suppliers.length === 0}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isInstallment ? `Criar ${formData.installmentCount} Parcelas` : 'Criar Conta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 