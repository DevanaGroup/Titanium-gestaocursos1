import React, { useState } from 'react';
import { ArrowLeft, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AssistantSelection from './AssistantSelection';
import ChatbotGPT from './ChatbotGPT';
import CustomChatInterface from './CustomChatInterface';

const ChatbotManager: React.FC = () => {
  const [selectedAssistant, setSelectedAssistant] = useState<string | null>(null);
  const [assistantName, setAssistantName] = useState<string>('');
  const [assistantData, setAssistantData] = useState<{
    id: string;
    name: string;
    aiModel?: string;
  } | null>(null);

  const handleSelectAssistant = (assistantId: string, assistantName?: string, aiModel?: string) => {
    // Usar o nome fornecido ou mapear os assistentes para seus nomes
    let name = assistantName;
    if (!name) {
      const assistantNames: Record<string, string> = {
        'chatbot-principal': 'ChatBot Principal'
      };
      name = assistantNames[assistantId] || 'Assistente Personalizado';
    }
    
    setAssistantName(name);
    setSelectedAssistant(assistantId);
    setAssistantData({
      id: assistantId,
      name: name,
      aiModel: aiModel || 'GPT-4 Turbo'
    });
  };

  const handleBackToSelection = () => {
    setSelectedAssistant(null);
    setAssistantName('');
    setAssistantData(null);
  };

  const handleCreateNewAssistant = () => {
    // Esta função será chamada quando um novo assistente for criado
    // Por enquanto, apenas mantemos a funcionalidade existente
  };

  if (selectedAssistant) {
    return (
      <div className="flex flex-col h-full">
        {/* Header do chat com botão voltar */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToSelection}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-cerrado-green1 dark:hover:text-cerrado-green1 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Voltar</span>
          </Button>
          

        </div>
        
        {/* Chat Component */}
        <div className="flex-1">
          {selectedAssistant === 'chatbot-principal' ? (
            <ChatbotGPT />
          ) : (
            assistantData && (
              <CustomChatInterface 
                assistantId={assistantData.id}
                assistantName={assistantData.name}
                aiModel={assistantData.aiModel}
              />
            )
          )}
        </div>
      </div>
    );
  }

  return (
    <AssistantSelection 
      onSelectAssistant={handleSelectAssistant}
      onCreateNewAssistant={handleCreateNewAssistant}
    />
  );
};

export default ChatbotManager; 