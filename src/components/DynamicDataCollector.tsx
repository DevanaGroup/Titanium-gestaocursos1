import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileText, Upload, X, AlertCircle, Send, ArrowRight } from 'lucide-react';
import { DynamicField } from '@/services/assistantService';
import { toast } from 'sonner';

interface DynamicDataCollectorProps {
  fields: DynamicField[];
  assistantName: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

interface FormData {
  [key: string]: any;
}

const DynamicDataCollector: React.FC<DynamicDataCollectorProps> = ({
  fields,
  assistantName,
  isOpen,
  onClose,
  onSubmit
}) => {
  const [formData, setFormData] = useState<FormData>({});
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [uploadedFiles, setUploadedFiles] = useState<{ [key: string]: File[] }>({});

  const handleInputChange = useCallback((fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
    
    // Limpar erro do campo se existir
    if (errors[fieldId]) {
      setErrors(prev => ({
        ...prev,
        [fieldId]: ''
      }));
    }
  }, [errors]);

  const handleFileUpload = useCallback((fieldId: string, files: FileList | null, field: DynamicField) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    fileArray.forEach(file => {
      // Verificar tipo de arquivo
      if (field.validation?.fileTypes) {
        const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
        if (!field.validation.fileTypes.includes(fileExtension)) {
          invalidFiles.push(`${file.name} (tipo não permitido)`);
          return;
        }
      }

      // Verificar tamanho do arquivo
      if (field.validation?.maxFileSize) {
        const maxSizeBytes = field.validation.maxFileSize * 1024 * 1024; // MB para bytes
        if (file.size > maxSizeBytes) {
          invalidFiles.push(`${file.name} (muito grande)`);
          return;
        }
      }

      validFiles.push(file);
    });

    if (invalidFiles.length > 0) {
      toast.error(`Arquivos inválidos: ${invalidFiles.join(', ')}`);
    }

    if (validFiles.length > 0) {
      setUploadedFiles(prev => ({
        ...prev,
        [fieldId]: field.type === 'multiple-files' ? [...(prev[fieldId] || []), ...validFiles] : validFiles
      }));
      
      setFormData(prev => ({
        ...prev,
        [fieldId]: field.type === 'multiple-files' ? [...(prev[fieldId] || []), ...validFiles] : validFiles
      }));
    }
  }, []);

  const removeFile = useCallback((fieldId: string, fileIndex: number) => {
    setUploadedFiles(prev => {
      const newFiles = [...(prev[fieldId] || [])];
      newFiles.splice(fileIndex, 1);
      return {
        ...prev,
        [fieldId]: newFiles
      };
    });
    
    setFormData(prev => {
      const newFiles = [...(prev[fieldId] || [])];
      newFiles.splice(fileIndex, 1);
      return {
        ...prev,
        [fieldId]: newFiles
      };
    });
  }, []);

  const validateForm = useCallback(() => {
    const newErrors: { [key: string]: string } = {};

    fields.forEach(field => {
      const value = formData[field.id];
      
      if (field.required && (!value || (Array.isArray(value) && value.length === 0))) {
        newErrors[field.id] = `${field.label} é obrigatório`;
      }

      if (field.type === 'text' && value && field.validation?.minLength) {
        if (value.length < field.validation.minLength) {
          newErrors[field.id] = `${field.label} deve ter pelo menos ${field.validation.minLength} caracteres`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, fields]);

  const handleSubmit = useCallback(() => {
    if (!validateForm()) {
      toast.error('Por favor, corrija os erros no formulário');
      return;
    }

    // Preparar dados para envio
    const preparedData = { ...formData };
    
    // Converter arquivos para informações serializáveis
    Object.keys(uploadedFiles).forEach(fieldId => {
      if (uploadedFiles[fieldId] && uploadedFiles[fieldId].length > 0) {
        preparedData[fieldId] = uploadedFiles[fieldId].map(file => ({
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified
        }));
      }
    });

    onSubmit(preparedData);
    
    // Limpar formulário
    setFormData({});
    setUploadedFiles({});
    setErrors({});
  }, [formData, uploadedFiles, validateForm, onSubmit]);

  const handleCancel = useCallback(() => {
    setFormData({});
    setUploadedFiles({});
    setErrors({});
    onClose();
  }, [onClose]);

  const renderField = (field: DynamicField) => {
    const hasError = !!errors[field.id];
    const fieldValue = formData[field.id];

    switch (field.type) {
      case 'text':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id} className="text-sm font-medium">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-xs text-gray-500">{field.description}</p>
            )}
            <Input
              id={field.id}
              placeholder={field.placeholder}
              value={fieldValue || ''}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              className={hasError ? 'border-red-500' : ''}
            />
            {hasError && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors[field.id]}
              </p>
            )}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id} className="text-sm font-medium">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-xs text-gray-500">{field.description}</p>
            )}
            <Textarea
              id={field.id}
              placeholder={field.placeholder}
              value={fieldValue || ''}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              className={hasError ? 'border-red-500' : ''}
              rows={3}
            />
            {hasError && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors[field.id]}
              </p>
            )}
          </div>
        );

      case 'dropdown':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id} className="text-sm font-medium">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-xs text-gray-500">{field.description}</p>
            )}
            <Select
              value={fieldValue || ''}
              onValueChange={(value) => handleInputChange(field.id, value)}
            >
              <SelectTrigger className={hasError ? 'border-red-500' : ''}>
                <SelectValue placeholder="Selecione uma opção..." />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option, index) => (
                  <SelectItem key={index} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasError && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors[field.id]}
              </p>
            )}
          </div>
        );

      case 'file':
      case 'multiple-files':
        const files = uploadedFiles[field.id] || [];
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id} className="text-sm font-medium">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-xs text-gray-500">{field.description}</p>
            )}
            
            {/* Área de upload */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
              <input
                type="file"
                id={field.id}
                multiple={field.type === 'multiple-files'}
                accept={field.validation?.fileTypes?.join(',')}
                onChange={(e) => handleFileUpload(field.id, e.target.files, field)}
                className="hidden"
              />
              <label htmlFor={field.id} className="cursor-pointer">
                <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600">
                  Clique para selecionar {field.type === 'multiple-files' ? 'arquivos' : 'arquivo'}
                </p>
                {field.validation?.fileTypes && (
                  <p className="text-xs text-gray-500 mt-1">
                    Tipos aceitos: {field.validation.fileTypes.join(', ')}
                  </p>
                )}
                {field.validation?.maxFileSize && (
                  <p className="text-xs text-gray-500">
                    Tamanho máximo: {field.validation.maxFileSize}MB
                  </p>
                )}
              </label>
            </div>

            {/* Lista de arquivos */}
            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <span className="text-sm truncate">{file.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {(file.size / 1024 / 1024).toFixed(1)}MB
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(field.id, index)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {hasError && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors[field.id]}
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Send className="h-5 w-5 text-blue-600" />
            Configurar Dados Iniciais
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Preencha as informações necessárias para iniciar uma conversa com <strong>{assistantName}</strong>.
            Estes dados serão enviados junto com sua primeira mensagem.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {fields.map(renderField)}
        </div>
        
        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button
            variant="outline"
            onClick={handleCancel}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            Iniciar Conversa
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DynamicDataCollector; 