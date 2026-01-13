import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { 
  Upload, 
  X, 
  Camera, 
  FileText, 
  AlertCircle,
  CheckCircle,
  Loader2,
  Info
} from 'lucide-react';
import { 
  SUPPORT_CATEGORIES, 
  SUPPORT_PRIORITIES,
  SupportCategory,
  SupportPriority,
  TicketCreationData
} from '@/types/support';
import { supportTicketService } from '@/services/supportTicketService';

// Schema de validação
const supportTicketSchema = z.object({
  title: z.string()
    .min(5, 'Título deve ter pelo menos 5 caracteres')
    .max(100, 'Título deve ter no máximo 100 caracteres'),
  description: z.string()
    .min(10, 'Descrição deve ter pelo menos 10 caracteres')
    .max(2000, 'Descrição deve ter no máximo 2000 caracteres'),
  category: z.enum([
    'Acesso/Login',
    'Funcionalidade', 
    'Bug/Erro',
    'Performance',
    'Relatórios',
    'Navegação',
    'Dados',
    'Integração',
    'Mobile',
    'Outros'
  ] as const),
  priority: z.enum(['Baixa', 'Média', 'Alta', 'Urgente'] as const),
  pageUrl: z.string().optional()
});

type FormData = z.infer<typeof supportTicketSchema>;

interface SupportTicketFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const SupportTicketForm: React.FC<SupportTicketFormProps> = ({
  open,
  onOpenChange,
  onSuccess
}) => {
  const [attachments, setAttachments] = useState<File[]>([]);
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(supportTicketSchema),
    defaultValues: {
      title: '',
      description: '',
      category: undefined,
      priority: 'Média',
      pageUrl: typeof window !== 'undefined' ? window.location.href : ''
    }
  });

  // Detectar informações da página atual
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      form.setValue('pageUrl', window.location.href);
    }
  }, [form]);

  const handleFileUpload = (files: FileList | null, type: 'attachment' | 'screenshot') => {
    if (!files) return;

    const validFiles: File[] = [];
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = {
      attachment: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain'],
      screenshot: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    };

    Array.from(files).forEach(file => {
      // Verificar tamanho
      if (file.size > maxSize) {
        toast.error(`Arquivo "${file.name}" é muito grande. Máximo 10MB.`);
        return;
      }

      // Verificar tipo
      if (!allowedTypes[type].includes(file.type)) {
        toast.error(`Tipo de arquivo não suportado: ${file.name}`);
        return;
      }

      validFiles.push(file);
    });

    if (validFiles.length > 0) {
      if (type === 'attachment') {
        setAttachments(prev => [...prev, ...validFiles]);
      } else {
        setScreenshots(prev => [...prev, ...validFiles]);
      }
      toast.success(`${validFiles.length} arquivo(s) adicionado(s)`);
    }
  };

  const removeFile = (index: number, type: 'attachment' | 'screenshot') => {
    if (type === 'attachment') {
      setAttachments(prev => prev.filter((_, i) => i !== index));
    } else {
      setScreenshots(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent, type: 'attachment' | 'screenshot') => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files, type);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);
      
      console.log('📝 Enviando ticket de suporte:', data);

      const ticketData: TicketCreationData = {
        title: data.title,
        description: data.description,
        category: data.category,
        priority: data.priority,
        pageUrl: data.pageUrl,
        attachments: attachments.length > 0 ? attachments : undefined,
        screenshots: screenshots.length > 0 ? screenshots : undefined
      };

      const ticket = await supportTicketService.createTicket(ticketData);
      
      toast.success(
        `✅ Ticket criado com sucesso!`,
        {
          description: `Protocolo: ${ticket.protocol}`,
          duration: 5000
        }
      );

      // Resetar formulário
      form.reset();
      setAttachments([]);
      setScreenshots([]);
      
      // Fechar modal
      onOpenChange(false);
      
      // Callback de sucesso
      onSuccess?.();

    } catch (error) {
      console.error('❌ Erro ao criar ticket:', error);
      toast.error('Erro ao criar ticket de suporte. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryInfo = (category: SupportCategory) => {
    return SUPPORT_CATEGORIES.find(cat => cat.value === category);
  };

  const getPriorityInfo = (priority: SupportPriority) => {
    return SUPPORT_PRIORITIES.find(p => p.value === priority);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            Abrir Ticket de Suporte Web
          </DialogTitle>
          <DialogDescription>
            Relate problemas, bugs ou dúvidas sobre o sistema. Nossa equipe de TI analisará e resolverá seu chamado.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Título */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título do Problema *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: Erro ao salvar dados do cliente"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Descreva o problema de forma clara e objetiva
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Categoria e Prioridade */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SUPPORT_CATEGORIES.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            <div className="flex items-center gap-2">
                              <span>{category.icon}</span>
                              <div>
                                <div className="font-medium">{category.label}</div>
                                <div className="text-xs text-muted-foreground">
                                  {category.description}
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a prioridade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SUPPORT_PRIORITIES.map((priority) => (
                          <SelectItem key={priority.value} value={priority.value}>
                            <div className="flex items-center gap-2">
                              <span>{priority.icon}</span>
                              <Badge className={priority.color}>
                                {priority.label}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Descrição */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição Detalhada *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descreva o problema em detalhes:
- O que você estava fazendo quando o problema ocorreu?
- Qual era o resultado esperado?
- O que aconteceu de diferente?
- Consegue reproduzir o problema?"
                      className="min-h-[120px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Quanto mais detalhes, melhor poderemos ajudar você
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Upload de Screenshots */}
            <div className="space-y-3">
              <Label>Capturas de Tela (Opcional)</Label>
              <div 
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  dragOver 
                    ? 'border-blue-400 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, 'screenshot')}
              >
                <Camera className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600 mb-2">
                  Arraste capturas de tela aqui ou clique para selecionar
                </p>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  id="screenshot-upload"
                  onChange={(e) => handleFileUpload(e.target.files, 'screenshot')}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('screenshot-upload')?.click()}
                >
                  Selecionar Imagens
                </Button>
                <p className="text-xs text-gray-500 mt-2">
                  PNG, JPG, GIF até 10MB cada
                </p>
              </div>

              {/* Lista de Screenshots */}
              {screenshots.length > 0 && (
                <div className="space-y-2">
                  <Label>Screenshots Adicionadas:</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {screenshots.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-green-50 p-2 rounded border">
                        <div className="flex items-center gap-2">
                          <Camera className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium">{file.name}</span>
                          <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index, 'screenshot')}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Upload de Anexos */}
            <div className="space-y-3">
              <Label>Documentos Anexos (Opcional)</Label>
              <div 
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  dragOver 
                    ? 'border-blue-400 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, 'attachment')}
              >
                <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600 mb-2">
                  Arraste documentos aqui ou clique para selecionar
                </p>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                  className="hidden"
                  id="attachment-upload"
                  onChange={(e) => handleFileUpload(e.target.files, 'attachment')}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('attachment-upload')?.click()}
                >
                  Selecionar Documentos
                </Button>
                <p className="text-xs text-gray-500 mt-2">
                  PDF, DOC, XLS, TXT até 10MB cada
                </p>
              </div>

              {/* Lista de Anexos */}
              {attachments.length > 0 && (
                <div className="space-y-2">
                  <Label>Documentos Anexados:</Label>
                  <div className="space-y-2">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-blue-50 p-2 rounded border">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium">{file.name}</span>
                          <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index, 'attachment')}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Botões de Ação */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="sm:w-auto"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="sm:flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando Ticket...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Criar Ticket de Suporte
                  </>
                )}
              </Button>
            </div>

            {/* Informações de Rodapé */}
            <div className="bg-gray-50 p-4 rounded-lg border">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-gray-600 mt-0.5" />
                <div className="text-sm text-gray-600">
                  <p className="font-medium mb-1">O que acontece após enviar?</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Você receberá um protocolo único para acompanhamento</li>
                    <li>• Nossa equipe de TI será notificada automaticamente</li>
                    <li>• Você pode acompanhar o progresso no menu "Suporte Web"</li>
                    <li>• Resposta esperada: até 24h para tickets normais, até 4h para urgentes</li>
                  </ul>
                </div>
              </div>
            </div>

          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}; 