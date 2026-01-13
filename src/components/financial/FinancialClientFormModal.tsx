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
import { toast } from "sonner";
import { FinancialClient } from "@/types";
import { Loader2, Users, Lock } from "lucide-react";
import { createFinancialClient, updateFinancialClient } from "@/services/financialService";

interface FinancialClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: FinancialClient | null;
}

export const FinancialClientFormModal = ({ isOpen, onClose, onSuccess, initialData }: FinancialClientFormModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    project: "",
    monthlyValue: "",
    dueDate: 10,
    contractType: "Recorrente" as "Recorrente" | "Pontual",
    contractTerm: "1 ano" as "1 mês" | "3 meses" | "6 meses" | "1 ano" | "2 anos" | "5 anos",
    billingType: "Mensal" as "Mensal" | "Anual" | "Trimestral" | "Semestral" | "Único",
    status: "Ativo" as "Ativo" | "Inativo" | "Inadimplente" | "Suspenso",
    invoiceRequired: false,
    contactInfo: {
      email: "",
      phone: "",
      address: ""
    }
  });

  // Efeito para preencher formulário quando há dados iniciais (edição)
  useEffect(() => {
    if (initialData) {
              setFormData({
        name: initialData.name || "",
        project: initialData.project || "",
        monthlyValue: initialData.monthlyValue ? 
          initialData.monthlyValue.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }) : "",
        dueDate: initialData.dueDate || 10,
        contractType: (initialData.contractType as "Recorrente" | "Pontual") || "Recorrente",
        contractTerm: (initialData.contractTerm as "1 mês" | "3 meses" | "6 meses" | "1 ano" | "2 anos" | "5 anos") || "1 ano",
        billingType: (initialData.billingType as "Mensal" | "Anual" | "Trimestral" | "Semestral" | "Único") || "Mensal",
        status: (initialData.status as "Ativo" | "Inativo" | "Inadimplente" | "Suspenso") || "Ativo",
        invoiceRequired: initialData.invoiceRequired || false,
        contactInfo: {
          email: initialData.contactInfo?.email || "",
          phone: initialData.contactInfo?.phone || "",
          address: initialData.contactInfo?.address || ""
        }
      });
    } else {
      // Reset form para criação
      setFormData({
        name: "",
        project: "",
        monthlyValue: "",
        dueDate: 10,
        contractType: "Recorrente",
        contractTerm: "1 ano",
        billingType: "Mensal",
        status: "Ativo",
        invoiceRequired: false,
        contactInfo: {
          email: "",
          phone: "",
          address: ""
        }
      });
    }
  }, [initialData, isOpen]);

  const handleInputChange = (field: string, value: string | number | boolean) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev] as any,
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
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
    if (!formData.name.trim() && !initialData) {
      toast.error("Nome é obrigatório");
      return false;
    }

    if (!formData.monthlyValue.trim()) {
      toast.error("Valor mensal é obrigatório");
      return false;
    }

    const monthlyValue = parseCurrency(formData.monthlyValue);
    if (monthlyValue <= 0) {
      toast.error("Valor mensal deve ser maior que zero");
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
      const monthlyValue = parseCurrency(formData.monthlyValue);
      
      if (initialData) {
        // Edição: Atualizar dados financeiros existentes
        const updates = {
          monthlyValue,
          dueDate: formData.dueDate,
          contractType: formData.contractType,
          contractTerm: formData.contractTerm,
          billingType: formData.billingType,
          status: formData.status,
          invoiceRequired: formData.invoiceRequired,
          contactInfo: {
            ...formData.contactInfo
          }
        };

        await updateFinancialClient(initialData.id, updates);
        toast.success("Dados financeiros atualizados com sucesso!");
      } else {
        // Criação: Criar novo cliente financeiro
        const newClientData = {
          name: formData.name,
          project: formData.project,
          monthlyValue,
          dueDate: formData.dueDate,
          contractStartDate: new Date(),
          contractType: formData.contractType,
          contractTerm: formData.contractTerm,
          billingType: formData.billingType,
          status: formData.status,
          invoiceRequired: formData.invoiceRequired,
          assignedTo: "",
          originalClientId: "",
          contactInfo: {
            ...formData.contactInfo
          },
          clientStatus: "Ativo",
          contactName: formData.name,
          cpf: "",
          cnpj: "",
          lastPaymentDate: undefined,
          contractEndDate: undefined
        };

        await createFinancialClient(newClientData);
        toast.success("Cliente financeiro criado com sucesso!");
      }
      
      onSuccess(); // Chama callback para atualizar a lista
      onClose(); // Fecha o modal
      
    } catch (error) {
      console.error("Erro ao salvar cliente financeiro:", error);
      toast.error("Erro ao salvar cliente financeiro. Tente novamente.");
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
            <Users className="w-5 h-5" />
            {isEditing ? "Editar Dados Financeiros" : "Novo Cliente Financeiro"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Atualize apenas as informações financeiras do cliente" 
              : "Preencha os dados para criar um novo cliente financeiro"
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas - Readonly quando editando */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              Informações do Cliente
              {isEditing && <Lock className="w-4 h-4 text-gray-400" />}
            </h3>
            
            {isEditing && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                <p className="font-medium">ℹ️ Informações protegidas</p>
                <p>Nome, projeto e dados de contato são gerenciados no cadastro de clientes.</p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome {!isEditing && "*"}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Nome do cliente"
                  required={!isEditing}
                  disabled={isEditing}
                  className={isEditing ? "bg-gray-50 text-gray-600" : ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project">Projeto</Label>
                <Input
                  id="project"
                  value={formData.project}
                  onChange={(e) => handleInputChange('project', e.target.value)}
                  placeholder="Nome do projeto"
                  disabled={isEditing}
                  className={isEditing ? "bg-gray-50 text-gray-600" : ""}
                />
              </div>
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
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Inativo">Inativo</SelectItem>
                  <SelectItem value="Inadimplente">Inadimplente</SelectItem>
                  <SelectItem value="Suspenso">Suspenso</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Informações Financeiras - Sempre editáveis */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Configurações Financeiras</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monthlyValue">Valor Mensal *</Label>
                <Input
                  id="monthlyValue"
                  value={formData.monthlyValue}
                  onChange={(e) => handleInputChange('monthlyValue', formatCurrency(e.target.value))}
                  placeholder="R$ 0,00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Dia do Vencimento</Label>
                <Select 
                  value={formData.dueDate.toString()} 
                  onValueChange={(value) => handleInputChange('dueDate', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Dia" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                      <SelectItem key={day} value={day.toString()}>
                        Dia {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="billingType">Tipo de Cobrança</Label>
                <Select 
                  value={formData.billingType} 
                  onValueChange={(value) => handleInputChange('billingType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mensal">Mensal</SelectItem>
                    <SelectItem value="Trimestral">Trimestral</SelectItem>
                    <SelectItem value="Semestral">Semestral</SelectItem>
                    <SelectItem value="Anual">Anual</SelectItem>
                    <SelectItem value="Único">Único</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contractType">Tipo de Contrato</Label>
              <Select 
                value={formData.contractType} 
                onValueChange={(value) => handleInputChange('contractType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de contrato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Recorrente">Recorrente</SelectItem>
                  <SelectItem value="Pontual">Pontual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contractTerm">Prazo de Contrato</Label>
              <Select 
                value={formData.contractTerm} 
                onValueChange={(value) => handleInputChange('contractTerm', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o prazo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1 mês">1 mês</SelectItem>
                  <SelectItem value="3 meses">3 meses</SelectItem>
                  <SelectItem value="6 meses">6 meses</SelectItem>
                  <SelectItem value="1 ano">1 ano</SelectItem>
                  <SelectItem value="2 anos">2 anos</SelectItem>
                  <SelectItem value="5 anos">5 anos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoiceRequired">Nota Fiscal</Label>
              <Select 
                value={formData.invoiceRequired ? "true" : "false"} 
                onValueChange={(value) => handleInputChange('invoiceRequired', value === "true")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Requer nota fiscal?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Sim</SelectItem>
                  <SelectItem value="false">Não</SelectItem>
                </SelectContent>
              </Select>
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
              {isEditing ? "Atualizar Dados Financeiros" : "Criar"} Cliente
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}; 