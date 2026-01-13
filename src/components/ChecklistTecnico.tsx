import React from 'react';
import { ClipboardCheck, Construction, Wrench, AlertCircle } from 'lucide-react';

const ChecklistTecnico = () => {
  return (
    <div className="h-full flex items-center justify-center flex-col p-8">
      <div className="bg-gradient-to-br from-cerrado-green1/10 to-cerrado-green2/10 border border-cerrado-green1/20 rounded-xl p-12 text-center max-w-2xl">
        <div className="flex justify-center mb-6">
          <div className="bg-cerrado-green1/20 p-4 rounded-full">
            <ClipboardCheck className="h-16 w-16 text-cerrado-green1" />
          </div>
        </div>
        
        <h1 className="text-4xl font-bold text-cerrado-green1 mb-4">
          Check list Técnico
        </h1>
        
        <div className="flex items-center justify-center mb-6">
          <Construction className="h-6 w-6 text-amber-500 mr-2" />
          <Wrench className="h-6 w-6 text-amber-500 mr-2" />
          <AlertCircle className="h-6 w-6 text-amber-500" />
        </div>
        
        <p className="text-lg text-muted-foreground mb-6">
          Estamos desenvolvendo esta funcionalidade para você!
        </p>
        
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-6">
          <div className="flex items-center justify-center mb-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mr-2" />
            <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-300">
              Em Desenvolvimento
            </h3>
          </div>
          <p className="text-amber-700 dark:text-amber-200 text-sm">
            Esta seção estará disponível em breve com funcionalidades completas para 
            gerenciamento de checklists técnicos e inspeções.
          </p>
        </div>
        
        <div className="mt-8 text-sm text-muted-foreground">
          <p>Funcionalidades planejadas:</p>
          <ul className="mt-2 space-y-1 text-left max-w-md mx-auto">
            <li>• Criação de checklists personalizados</li>
            <li>• Inspeções técnicas automatizadas</li>
            <li>• Relatórios de conformidade</li>
            <li>• Integração com projetos</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ChecklistTecnico;
