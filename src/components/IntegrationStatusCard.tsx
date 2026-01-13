import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, ArrowRight, Zap, Send, Bot } from 'lucide-react';

interface IntegrationStatusCardProps {
  hasFormData: boolean;
  dataSubmitted: boolean;
  webhookConnected: boolean;
  messagesCount: number;
}

const IntegrationStatusCard: React.FC<IntegrationStatusCardProps> = ({
  hasFormData,
  dataSubmitted,
  webhookConnected,
  messagesCount
}) => {
  const steps = [
    {
      id: 1,
      title: "Dados Coletados",
      description: "Formulário preenchido com dados do projeto",
      completed: hasFormData,
      icon: Circle
    },
    {
      id: 2,
      title: "Dados Enviados",
      description: "Informações enviadas para processamento",
      completed: dataSubmitted,
      icon: Send
    },
    {
      id: 3,
      title: "Webhook Conectado",
      description: "Integração com n8n estabelecida",
      completed: webhookConnected,
      icon: Zap
    },
    {
      id: 4,
      title: "Conversa Ativa",
      description: "Sistema de chat operacional",
      completed: messagesCount > 0,
      icon: Bot
    }
  ];

  const completedSteps = steps.filter(step => step.completed).length;
  const progress = (completedSteps / steps.length) * 100;

  return (
    <Card className="w-full bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-blue-900 dark:text-blue-100">
            Status da Integração
          </CardTitle>
          <Badge 
            variant={progress === 100 ? "default" : "secondary"}
            className={progress === 100 ? "bg-green-500 hover:bg-green-600" : ""}
          >
            {completedSteps}/{steps.length} etapas
          </Badge>
        </div>
        
        {/* Barra de progresso */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
          <div 
            className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-4">
          {steps.map((step, index) => {
            const Icon = step.completed ? CheckCircle : step.icon;
            
            return (
              <div key={step.id} className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <Icon 
                    className={`h-5 w-5 ${
                      step.completed 
                        ? 'text-green-500' 
                        : 'text-gray-400 dark:text-gray-500'
                    }`} 
                  />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${
                      step.completed 
                        ? 'text-green-800 dark:text-green-200' 
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {step.title}
                    </span>
                  </div>
                  
                  <p className={`text-xs ${
                    step.completed 
                      ? 'text-green-600 dark:text-green-300' 
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {step.description}
                  </p>
                </div>
                
                {index < steps.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-gray-300 dark:text-gray-600 mt-0.5" />
                )}
              </div>
            );
          })}
        </div>
        
        {/* Estatísticas */}
        <div className="mt-6 pt-4 border-t border-blue-200 dark:border-blue-800">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="space-y-1">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {messagesCount}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Mensagens
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {Math.round(progress)}%
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Progresso
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default IntegrationStatusCard; 