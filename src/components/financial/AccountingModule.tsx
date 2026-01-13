import { Calculator } from "lucide-react";

export const AccountingModule = () => {
  return (
    <div className="text-center py-12">
      <Calculator className="w-12 h-12 mx-auto text-gray-400 mb-4" />
      <h3 className="text-lg font-semibold text-gray-700 mb-2">Contabilidade</h3>
      <p className="text-gray-500">
        Módulo de plano de contas e lançamentos contábeis em desenvolvimento
      </p>
    </div>
  );
}; 