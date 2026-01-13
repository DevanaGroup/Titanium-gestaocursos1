import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  File, 
  X, 
  FileText, 
  Image, 
  FileSpreadsheet,
  FileVideo,
  FileImage
} from 'lucide-react';
import { toast } from 'sonner';

interface FileUpload {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  preview?: string;
}

interface FileUploaderProps {
  files: FileUpload[];
  onFilesChange: (files: FileUpload[]) => void;
  maxFiles?: number;
  maxSize?: number; // em MB
  acceptedTypes?: string[];
  className?: string;
}

export default function FileUploader({
  files,
  onFilesChange,
  maxFiles = 5,
  maxSize = 10, // 10MB por arquivo
  acceptedTypes = [
    'image/*',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ],
  className = ""
}: FileUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Verificar limite de arquivos
    if (files.length + acceptedFiles.length > maxFiles) {
      toast.error(`Máximo de ${maxFiles} arquivos permitidos`);
      return;
    }

    const newFiles: FileUpload[] = acceptedFiles.map(file => {
      // Verificar tamanho do arquivo
      if (file.size > maxSize * 1024 * 1024) {
        toast.error(`Arquivo ${file.name} excede o limite de ${maxSize}MB`);
        return null;
      }

      return {
        id: Math.random().toString(36).substr(2, 9),
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
      };
    }).filter(Boolean) as FileUpload[];

    onFilesChange([...files, ...newFiles]);
  }, [files, maxFiles, maxSize, onFilesChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes.reduce((acc, type) => {
      acc[type] = [];
      return acc;
    }, {} as Record<string, string[]>),
    onDragEnter: () => setIsDragOver(true),
    onDragLeave: () => setIsDragOver(false),
    onDropAccepted: () => setIsDragOver(false),
    onDropRejected: () => setIsDragOver(false)
  });

  const removeFile = (fileId: string) => {
    const updatedFiles = files.filter(file => file.id !== fileId);
    onFilesChange(updatedFiles);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <FileImage className="h-4 w-4" />;
    if (type === 'application/pdf') return <FileText className="h-4 w-4" />;
    if (type.includes('spreadsheet') || type.includes('excel')) return <FileSpreadsheet className="h-4 w-4" />;
    if (type.startsWith('video/')) return <FileVideo className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  return (
    <div className={className}>
      {/* Área de Upload */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragActive || isDragOver 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' 
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
          }
        `}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <p className="font-medium">
            {isDragActive ? 'Solte os arquivos aqui' : 'Clique ou arraste arquivos aqui'}
          </p>
          <p className="mt-1">
            Máximo {maxFiles} arquivos, até {maxSize}MB cada
          </p>
          <p className="text-xs mt-1 text-gray-500">
            PDF, DOC, DOCX, XLS, XLSX, TXT, Imagens
          </p>
        </div>
      </div>

      {/* Lista de Arquivos */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Arquivos Anexados ({files.length})
          </h4>
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border"
              >
                {/* Ícone do arquivo */}
                <div className="flex-shrink-0">
                  {getFileIcon(file.type)}
                </div>

                {/* Informações do arquivo */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFileSize(file.size)}
                  </p>
                </div>

                {/* Preview para imagens */}
                {file.preview && (
                  <div className="flex-shrink-0">
                    <img
                      src={file.preview}
                      alt={file.name}
                      className="h-10 w-10 object-cover rounded"
                    />
                  </div>
                )}

                {/* Botão de remover */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(file.id)}
                  className="flex-shrink-0 h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 