import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { AccountsReceivable } from "@/types/financial";
import { Loader2, Receipt } from "lucide-react";
import { createAccountReceivable, updateAccountReceivable } from "@/services/financialCoreService";

interface ReceivableFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: AccountsReceivable | null;
}

export const ReceivableFormModal = ({ isOpen, onClose, onSuccess, initialData }: ReceivableFormModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    clientName: "",
    description: "",
    totalAmount: "",
    dueDate: "",
    status: "PENDENTE"
  });

  // Efeito para preencher formulário quando há dados iniciais (edição)
  useEffect(() => {
    if (initialData) {
      setFormData({
        clientName: initialData.clientName || "",
        description: initialData.description || "",
        totalAmount: initialData.totalAmount ? 
          initialData.totalAmount.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }) : "",
        dueDate: initialData.dueDate ? 
          new Date(initialData.dueDate).toISOString().split('T')[0] : "",
        status: initialData.status || "PENDENTE"
      });
    } else {
      // Reset form para criação
      setFormData({
        clientName: "",
        description: "",
        totalAmount: "",
        dueDate: "",
        status: "PENDENTE"
      });
    }
  }, [initialData, isOpen]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatCurrency = (value: string) => {
    const numbers = value.replace(/\D/g, '');
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

  const validateForm = () => {
    if (!formData.clientName.trim()) {
      toast.error("Nome do cliente é obrigatório");
      return false;
    }

    if (!formData.description.trim()) {
      toast.error("Descrição é obrigatória");
      return false;
    }

    if (!formData.totalAmount.trim()) {
      toast.error("Valor total é obrigatório");
      return false;
    }

    const totalAmount = parseCurrency(formData.totalAmount);
    if (totalAmount <= 0) {
      toast.error("Valor total deve ser maior que zero");
      return false;
    }

    if (!formData.dueDate) {
      toast.error("Data de vencimento é obrigatória");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      const receivableData = {
        clientId: "avulso", // ID especial para receitas avulsas
        clientName: formData.clientName.trim(),
        description: formData.description.trim(),
        totalAmount: parseCurrency(formData.totalAmount),
        dueDate: new Date(formData.dueDate),
        status: formData.status as 'PENDENTE' | 'RECEBIDO' | 'VENCIDO' | 'CANCELADO',
        costCenterId: "default", // Centro de custo padrão
        accountId: "receitas-servicos", // Conta contábil padrão para receitas de serviços
        categoryId: "servicos-avulsos", // Categoria padrão
        installments: [], // Sem parcelamento para receitas avulsas
        attachments: [], // Sem anexos iniciais
        invoiceNumber: null, // Campo opcional como null
        createdBy: "sistema" // Usuário do sistema
      };

      if (initialData) {
        console.log("✏️ [ReceivableModal] Atualizando conta a receber:", initialData.id);
        await updateAccountReceivable(initialData.id, receivableData);
        toast.success("Conta a receber atualizada com sucesso!");
      } else {
        console.log("💰 [ReceivableModal] Criando nova conta a receber");
        await createAccountReceivable(receivableData);
        toast.success("Receita avulsa registrada com sucesso!");
      }
      
      onSuccess();
      onClose();
      
    } catch (error) {
      console.error("Erro ao salvar conta a receber:", error);
      toast.error("Erro ao salvar receita avulsa");
    } finally {
      setIsLoading(false);
    }
  };

  const isEditing = !!initialData;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            {isEditing ? "Editar Conta a Receber" : "Nova Receita Avulsa"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Atualize as informações da conta a receber" 
              : "Registre uma receita de serviço pontual sem criar um cliente completo"
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações da Conta */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Informações da Receita</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">Cliente/Empresa *</Label>
                <Input
                  id="clientName"
                  value={formData.clientName}
                  onChange={(e) => handleInputChange('clientName', e.target.value)}
                  placeholder="Ex: João Silva, Empresa XYZ"
                  required
                />
                <p className="text-xs text-gray-500">Nome simples, sem precisar cadastrar cliente completo</p>
              </div>

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
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição do Serviço *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Ex: Desenvolvimento de site, Consultoria, Manutenção..."
                required
                rows={3}
              />
            </div>
          </div>

          {/* Informações de Vencimento */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Vencimento e Status</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dueDate">Data de Vencimento *</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => handleInputChange('dueDate', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => handleInputChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDENTE">Pendente</SelectItem>
                    <SelectItem value="RECEBIDO">Recebido</SelectItem>
                    <SelectItem value="VENCIDO">Vencido</SelectItem>
                    <SelectItem value="CANCELADO">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? "Atualizar" : "Registrar"} Receita
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}; 