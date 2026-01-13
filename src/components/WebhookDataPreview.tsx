import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Eye, Code, Send } from 'lucide-react';

interface WebhookDataPreviewProps {
  data: any;
  title?: string;
  onSend?: () => void;
}

const WebhookDataPreview: React.FC<WebhookDataPreviewProps> = ({ 
  data, 
  title = "Dados para Webhook",
  onSend
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'formatted' | 'json'>('formatted');

  const renderValue = (value: any, key: string) => {
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        return (
          <div className="space-y-2">
            {value.map((item, index) => (
              <div key={index} className="p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                {typeof item === 'object' && item.name ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-blue-600">{item.name}</span>
                      <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                        {item.size ? `${(item.size / 1024 / 1024).toFixed(2)} MB` : 'N/A'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">
                      Tipo: {item.type || 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500">
                      Conteúdo: {item.content ? 'Base64 carregado' : 'Não carregado'}
                    </div>
                  </div>
                ) : (
                  typeof item === 'object' ? JSON.stringify(item, null, 2) : item
                )}
              </div>
            ))}
          </div>
        );
      } else if (value.name && value.content) {
        // Arquivo único
        return (
          <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-blue-600">{value.name}</span>
              <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                {value.size ? `${(value.size / 1024 / 1024).toFixed(2)} MB` : 'N/A'}
              </span>
            </div>
            <div className="text-xs text-gray-600">
              Tipo: {value.type || 'N/A'}
            </div>
            <div className="text-xs text-gray-500">
              Conteúdo: {value.content ? 'Base64 carregado' : 'Não carregado'}
            </div>
          </div>
        );
      } else {
        return (
          <div className="space-y-2">
            {Object.entries(value).map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{k}:</span>
                <span className="text-sm">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
              </div>
            ))}
          </div>
        );
      }
    }
    
    return <span className="text-sm">{String(value)}</span>;
  };

  const dataEntries = Object.entries(data || {});
  const totalFields = dataEntries.length;

  return (
    <Card className="w-full bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg text-blue-900 dark:text-blue-100">
              {title}
            </CardTitle>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {totalFields} campos
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'formatted' ? 'json' : 'formatted')}
              className="text-xs"
            >
              <Code className="h-3 w-3 mr-1" />
              {viewMode === 'formatted' ? 'JSON' : 'Formatado'}
            </Button>
            {onSend && (
              <Button
                onClick={onSend}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Send className="h-3 w-3 mr-1" />
                Enviar
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between p-0 h-auto text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-transparent"
            >
              <span>Visualizar dados que serão enviados</span>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="mt-4">
            {viewMode === 'formatted' ? (
              <div className="space-y-3">
                {dataEntries.map(([key, value]) => (
                  <div key={key} className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-2">
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {key}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        {renderValue(value, key)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm font-mono overflow-x-auto">
                <pre>{JSON.stringify(data, null, 2)}</pre>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};

export default WebhookDataPreview; 