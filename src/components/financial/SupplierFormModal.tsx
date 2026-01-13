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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { createSupplier, updateSupplier } from "@/services/financialCoreService";
import { Supplier } from "@/types/financial";
import { Loader2, Building } from "lucide-react";

interface SupplierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Supplier | null;
}

export const SupplierFormModal = ({ isOpen, onClose, onSuccess, initialData }: SupplierFormModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    cnpj: "",
    cpf: "",
    email: "",
    phone: "",
    services: "",
    monthlyValue: "",
    paymentDay: 1,
    hasRecurrence: false,
    address: {
      street: "",
      city: "",
      state: "",
      zipCode: ""
    },
    bankData: {
      bank: "",
      agency: "",
      account: "",
      accountType: "CORRENTE" as "CORRENTE" | "POUPANCA"
    },
    hasBankData: false,
    isActive: true
  });

  const [personType, setPersonType] = useState<"PF" | "PJ">("PJ");

  // Efeito para preencher formulário quando há dados iniciais (edição)
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        cnpj: initialData.cnpj || "",
        cpf: initialData.cpf || "",
        email: initialData.email || "",
        phone: initialData.phone || "",
        services: initialData.services || "",
        monthlyValue: initialData.monthlyValue ? 
          initialData.monthlyValue.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }) : "",
        paymentDay: initialData.paymentDay || 1,
        hasRecurrence: initialData.hasRecurrence || false,
        address: {
          street: initialData.address?.street || "",
          city: initialData.address?.city || "",
          state: initialData.address?.state || "",
          zipCode: initialData.address?.zipCode || ""
        },
        bankData: {
          bank: initialData.bankData?.bank || "",
          agency: initialData.bankData?.agency || "",
          account: initialData.bankData?.account || "",
          accountType: (initialData.bankData?.accountType as "CORRENTE" | "POUPANCA") || "CORRENTE"
        },
        hasBankData: !!initialData.bankData,
        isActive: initialData.isActive !== undefined ? initialData.isActive : true
      });

      // Definir tipo de pessoa baseado nos dados
      if (initialData.cnpj) {
        setPersonType("PJ");
      } else if (initialData.cpf) {
        setPersonType("PF");
      }
    } else {
      // Reset form para criação
      setFormData({
        name: "",
        cnpj: "",
        cpf: "",
        email: "",
        phone: "",
        services: "",
        monthlyValue: "",
        paymentDay: 1,
        hasRecurrence: false,
        address: {
          street: "",
          city: "",
          state: "",
          zipCode: ""
        },
        bankData: {
          bank: "",
          agency: "",
          account: "",
          accountType: "CORRENTE" as "CORRENTE" | "POUPANCA"
        },
        hasBankData: false,
        isActive: true
      });
      setPersonType("PJ");
    }
  }, [initialData, isOpen]);

  const handleInputChange = (field: string, value: string) => {
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

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const formatZipCode = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{5})(\d{3})/, '$1-$2');
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
    if (!formData.name.trim()) {
      toast.error("Nome é obrigatório");
      return false;
    }

    if (!formData.services.trim()) {
      toast.error("Descrição dos serviços é obrigatória");
      return false;
    }

    if (!formData.email.trim()) {
      toast.error("Email é obrigatório");
      return false;
    }

    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      toast.error("Email inválido");
      return false;
    }

    if (!formData.phone.trim()) {
      toast.error("Telefone é obrigatório");
      return false;
    }

    if (personType === "PJ") {
      if (!formData.cnpj.trim()) {
        toast.error("CNPJ é obrigatório para pessoa jurídica");
        return false;
      }
      if (formData.cnpj.replace(/\D/g, '').length !== 14) {
        toast.error("CNPJ deve ter 14 dígitos");
        return false;
      }
    } else {
      if (!formData.cpf.trim()) {
        toast.error("CPF é obrigatório para pessoa física");
        return false;
      }
      if (formData.cpf.replace(/\D/g, '').length !== 11) {
        toast.error("CPF deve ter 11 dígitos");
        return false;
      }
    }

    // Validar recorrência
    if (formData.hasRecurrence) {
      if (!formData.monthlyValue || parseCurrency(formData.monthlyValue) <= 0) {
        toast.error("Valor mensal deve ser maior que zero para cobrança recorrente");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // Preparar dados base sem campos undefined
      const supplierData: any = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone,
        // Novos campos
        services: formData.services.trim(),
        address: {
          street: formData.address.street.trim(),
          city: formData.address.city.trim(),
          state: formData.address.state.trim(),
          zipCode: formData.address.zipCode
        },
        isActive: formData.isActive
      };

      // Adicionar CPF ou CNPJ apenas se preenchidos
      if (personType === "PJ" && formData.cnpj) {
        supplierData.cnpj = formData.cnpj;
      }
      
      if (personType === "PF" && formData.cpf) {
        supplierData.cpf = formData.cpf;
      }

      // Adicionar valor mensal e recorrência se habilitado
      if (formData.hasRecurrence && formData.monthlyValue) {
        supplierData.monthlyValue = parseCurrency(formData.monthlyValue);
        supplierData.paymentDay = formData.paymentDay;
        supplierData.hasRecurrence = true;
      }

      // Adicionar dados bancários apenas se habilitados e preenchidos
      if (formData.hasBankData && formData.bankData.bank && formData.bankData.agency && formData.bankData.account) {
        supplierData.bankData = {
          bank: formData.bankData.bank.trim(),
          agency: formData.bankData.agency.trim(),
          account: formData.bankData.account.trim(),
          accountType: formData.bankData.accountType
        };
      }

      const isEditing = !!initialData;
      
      if (isEditing) {
        // Atualizar fornecedor existente
        await updateSupplier(initialData.id, supplierData);
      } else {
        // Criar novo fornecedor
        await createSupplier(supplierData);
      }
      
      toast.success(isEditing ? "Fornecedor atualizado com sucesso!" : "Fornecedor cadastrado com sucesso!");
      onSuccess();
      onClose();
      
      // Reset form
      setFormData({
        name: "",
        cnpj: "",
        cpf: "",
        email: "",
        phone: "",
        services: "",
        monthlyValue: "",
        paymentDay: 1,
        hasRecurrence: false,
        address: {
          street: "",
          city: "",
          state: "",
          zipCode: ""
        },
        bankData: {
          bank: "",
          agency: "",
          account: "",
          accountType: "CORRENTE" as "CORRENTE" | "POUPANCA"
        },
        hasBankData: false,
        isActive: true
      });
      setPersonType("PJ");
      
    } catch (error) {
      console.error("Erro ao cadastrar fornecedor:", error);
      toast.error("Erro ao cadastrar fornecedor. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            {initialData ? "Editar Fornecedor" : "Cadastrar Novo Fornecedor"}
          </DialogTitle>
          <DialogDescription>
            {initialData 
              ? "Altere os dados do fornecedor conforme necessário."
              : "Preencha os dados do fornecedor para realizar o cadastro no sistema."
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tipo de Pessoa */}
          <div className="space-y-2">
            <Label>Tipo de Pessoa</Label>
            <Select value={personType} onValueChange={(value: "PF" | "PJ") => setPersonType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PJ">Pessoa Jurídica (CNPJ)</SelectItem>
                <SelectItem value="PF">Pessoa Física (CPF)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dados Básicos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome/Razão Social *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Digite o nome do fornecedor"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="document">
                {personType === "PJ" ? "CNPJ *" : "CPF *"}
              </Label>
              <Input
                id="document"
                value={personType === "PJ" ? formData.cnpj : formData.cpf}
                onChange={(e) => {
                  const formatted = personType === "PJ" 
                    ? formatCNPJ(e.target.value)
                    : formatCPF(e.target.value);
                  handleInputChange(personType === "PJ" ? 'cnpj' : 'cpf', formatted);
                }}
                placeholder={personType === "PJ" ? "00.000.000/0000-00" : "000.000.000-00"}
                maxLength={personType === "PJ" ? 18 : 14}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="email@exemplo.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', formatPhone(e.target.value))}
                placeholder="(00) 00000-0000"
                maxLength={15}
                required
              />
            </div>
          </div>

          {/* Serviços e Valores */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Serviços e Valores</h3>
            
            <div className="space-y-2">
              <Label htmlFor="services">O que este fornecedor oferece? *</Label>
              <Input
                id="services"
                value={formData.services}
                onChange={(e) => handleInputChange('services', e.target.value)}
                placeholder="Ex: Desenvolvimento de software, Consultoria, Material de escritório..."
                required
              />
              <p className="text-xs text-gray-500">
                Descreva brevemente os produtos ou serviços oferecidos
              </p>
            </div>

            {/* Recorrência */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasRecurrence"
                  checked={formData.hasRecurrence}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, hasRecurrence: !!checked }))}
                />
                <Label htmlFor="hasRecurrence">Cobrança recorrente mensal</Label>
              </div>

              {formData.hasRecurrence && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-blue-50">
                  <div className="space-y-2">
                    <Label htmlFor="monthlyValue">Valor Mensal *</Label>
                    <Input
                      id="monthlyValue"
                      value={formData.monthlyValue}
                      onChange={(e) => handleInputChange('monthlyValue', formatCurrency(e.target.value))}
                      placeholder="R$ 0,00"
                      required={formData.hasRecurrence}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paymentDay">Dia do Vencimento</Label>
                    <Select 
                      value={formData.paymentDay.toString()} 
                      onValueChange={(value) => handleInputChange('paymentDay', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                          <SelectItem key={day} value={day.toString()}>
                            Dia {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-2">
                    <p className="text-sm text-blue-700 bg-blue-100 p-2 rounded">
                      💡 Com a recorrência ativada, o sistema irá lembrá-lo mensalmente no dia {formData.paymentDay} de efetuar o pagamento de {formData.monthlyValue || "R$ 0,00"}.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Endereço */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Endereço</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="street">Logradouro</Label>
                <Input
                  id="street"
                  value={formData.address.street}
                  onChange={(e) => handleInputChange('address.street', e.target.value)}
                  placeholder="Rua, Avenida, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={formData.address.city}
                  onChange={(e) => handleInputChange('address.city', e.target.value)}
                  placeholder="Nome da cidade"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  value={formData.address.state}
                  onChange={(e) => handleInputChange('address.state', e.target.value)}
                  placeholder="UF"
                  maxLength={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zipCode">CEP</Label>
                <Input
                  id="zipCode"
                  value={formData.address.zipCode}
                  onChange={(e) => handleInputChange('address.zipCode', formatZipCode(e.target.value))}
                  placeholder="00000-000"
                  maxLength={9}
                />
              </div>
            </div>
          </div>

          {/* Dados Bancários */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasBankData"
                checked={formData.hasBankData}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, hasBankData: !!checked }))}
              />
              <Label htmlFor="hasBankData">Incluir dados bancários</Label>
            </div>

            {formData.hasBankData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-gray-50">
                <div className="space-y-2">
                  <Label htmlFor="bank">Banco</Label>
                  <Input
                    id="bank"
                    value={formData.bankData.bank}
                    onChange={(e) => handleInputChange('bankData.bank', e.target.value)}
                    placeholder="Nome do banco"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="agency">Agência</Label>
                  <Input
                    id="agency"
                    value={formData.bankData.agency}
                    onChange={(e) => handleInputChange('bankData.agency', e.target.value)}
                    placeholder="0000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="account">Conta</Label>
                  <Input
                    id="account"
                    value={formData.bankData.account}
                    onChange={(e) => handleInputChange('bankData.account', e.target.value)}
                    placeholder="00000-0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountType">Tipo de Conta</Label>
                  <Select 
                    value={formData.bankData.accountType} 
                    onValueChange={(value: "CORRENTE" | "POUPANCA") => handleInputChange('bankData.accountType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CORRENTE">Conta Corrente</SelectItem>
                      <SelectItem value="POUPANCA">Poupança</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Status */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: !!checked }))}
            />
            <Label htmlFor="isActive">Fornecedor ativo</Label>
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? "Salvar Alterações" : "Cadastrar Fornecedor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 