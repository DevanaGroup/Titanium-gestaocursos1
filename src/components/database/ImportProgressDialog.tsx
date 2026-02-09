import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface ImportProgress {
  current: number;
  total: number;
  currentItem: string;
  success: number;
  failed: number;
  errors: string[];
  warnings: string[];
}

interface ImportProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  progress: ImportProgress;
  isComplete: boolean;
}

export const ImportProgressDialog: React.FC<ImportProgressDialogProps> = ({
  open,
  onOpenChange,
  progress,
  isComplete,
}) => {
  const percentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {!isComplete ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                Importando Dados...
              </>
            ) : (
              <>
                {progress.failed === 0 ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    Importação Concluída
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    Importação Concluída com Avisos
                  </>
                )}
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {!isComplete
              ? "Aguarde enquanto processamos seus dados..."
              : "Veja o resumo da importação abaixo"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Progresso</span>
              <span>
                {progress.current} / {progress.total}
              </span>
            </div>
            <Progress value={percentage} className="h-2" />
            {!isComplete && progress.currentItem && (
              <p className="text-xs text-gray-500">Processando: {progress.currentItem}</p>
            )}
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">Sucesso</span>
              </div>
              <p className="text-2xl font-bold text-green-600 mt-1">{progress.success}</p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-900">Falhas</span>
              </div>
              <p className="text-2xl font-bold text-red-600 mt-1">{progress.failed}</p>
            </div>
          </div>

          {/* Errors */}
          {progress.errors.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-red-900 flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Erros ({progress.errors.length})
              </h4>
              <ScrollArea className="h-32 w-full rounded-md border border-red-200 bg-red-50 p-3">
                <div className="space-y-1">
                  {progress.errors.map((error, index) => (
                    <p key={index} className="text-xs text-red-800">
                      • {error}
                    </p>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Warnings */}
          {progress.warnings.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-yellow-900 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Avisos ({progress.warnings.length})
              </h4>
              <ScrollArea className="h-32 w-full rounded-md border border-yellow-200 bg-yellow-50 p-3">
                <div className="space-y-1">
                  {progress.warnings.map((warning, index) => (
                    <p key={index} className="text-xs text-yellow-800">
                      • {warning}
                    </p>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Close Button */}
          {isComplete && (
            <div className="flex justify-end">
              <Button onClick={() => onOpenChange(false)}>Fechar</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
