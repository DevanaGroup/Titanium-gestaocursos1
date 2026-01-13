import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
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
  MessageCircle, 
  Send, 
  Paperclip, 
  X, 
  EyeOff, 
  Eye,
  FileText,
  Upload
} from 'lucide-react';
import { toast } from 'sonner';
import { supportTicketService } from '@/services/supportTicketService';

const commentSchema = z.object({
  message: z.string().min(1, 'O comentário não pode estar vazio'),
  isInternal: z.boolean().default(false)
});

type CommentFormData = z.infer<typeof commentSchema>;

interface TicketCommentFormProps {
  ticketId: string;
  onCommentAdded: () => void;
  showInternalOption: boolean; // Mostrar opção de comentário interno apenas para admins
}

export const TicketCommentForm: React.FC<TicketCommentFormProps> = ({
  ticketId,
  onCommentAdded,
  showInternalOption
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const form = useForm<CommentFormData>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      message: '',
      isInternal: false
    }
  });

  const watchIsInternal = form.watch('isInternal');

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      // Validar tamanho (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} é muito grande. Máximo 10MB.`);
        return false;
      }
      return true;
    });

    setAttachments(prev => [...prev, ...validFiles].slice(0, 5)); // Máximo 5 arquivos
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const onSubmit = async (data: CommentFormData) => {
    try {
      setIsSubmitting(true);

      // Validar se há conteúdo (mensagem ou anexos)
      if (!data.message.trim() && attachments.length === 0) {
        toast.error('Adicione uma mensagem ou anexo');
        return;
      }

      console.log('💬 Adicionando comentário ao ticket:', ticketId);

      // Adicionar update com comentário
      await supportTicketService.addUpdate(ticketId, {
        type: 'comment',
        message: data.message,
        authorId: 'current_user', // Será preenchido pelo serviço
        authorName: 'Usuário Atual', // Será preenchido pelo serviço
        authorRole: showInternalOption ? 'support' : 'requester',
        isInternal: data.isInternal,
        attachments: attachments.length > 0 ? [] : undefined // TODO: Implementar upload de anexos em comentários
      });

      toast.success(
        data.isInternal 
          ? '✅ Comentário interno adicionado!'
          : '✅ Comentário adicionado!'
      );

      // Resetar formulário
      form.reset();
      setAttachments([]);
      
      // Callback de sucesso
      onCommentAdded();

    } catch (error) {
      console.error('❌ Erro ao adicionar comentário:', error);
      toast.error('Erro ao adicionar comentário. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="border-t pt-6">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold">Adicionar Comentário</h3>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          
          {/* Campo de mensagem */}
          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mensagem</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder={
                      watchIsInternal 
                        ? "Comentário interno (visível apenas para a equipe de suporte)..."
                        : "Digite sua mensagem..."
                    }
                    className="min-h-[120px] resize-none"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  {watchIsInternal 
                    ? "Este comentário será visível apenas para a equipe de suporte"
                    : "Este comentário será visível para todos os envolvidos no ticket"
                  }
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Opção de comentário interno (apenas para admins) */}
          {showInternalOption && (
            <FormField
              control={form.control}
              name="isInternal"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="flex items-center gap-2">
                      {watchIsInternal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      Comentário interno
                    </FormLabel>
                    <FormDescription>
                      Comentários internos são visíveis apenas para a equipe de suporte
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          )}

          {/* Upload de anexos */}
          <div className="space-y-3">
            <Label>Anexos (Opcional)</Label>
            
            {/* Área de drop */}
            <div 
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragOver 
                  ? 'border-blue-400 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="comment-attachments"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg"
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
              />
              <label 
                htmlFor="comment-attachments" 
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="w-8 h-8 text-muted-foreground" />
                <div className="text-sm">
                  <span className="font-medium text-blue-600">Clique para enviar</span>
                  <span className="text-muted-foreground"> ou arraste arquivos aqui</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  PDF, DOC, XLS, TXT, PNG, JPG - Máximo 10MB por arquivo
                </div>
              </label>
            </div>

            {/* Lista de anexos */}
            {attachments.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">
                  Arquivos selecionados ({attachments.length}/5):
                </div>
                <div className="space-y-1">
                  {attachments.map((file, index) => (
                    <div 
                      key={index}
                      className="flex items-center gap-2 p-2 bg-gray-50 rounded border"
                    >
                      <FileText className="w-4 h-4 text-gray-600" />
                      <span className="flex-1 text-sm truncate">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(index)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Botões de ação */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                form.reset();
                setAttachments([]);
              }}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {watchIsInternal ? 'Adicionar Comentário Interno' : 'Adicionar Comentário'}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}; 