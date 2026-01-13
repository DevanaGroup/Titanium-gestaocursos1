import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { LucideIcon, Check } from "lucide-react";

interface ServiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  service: {
    icon: LucideIcon;
    title: string;
    description: string;
    details: string;
    image: string;
  } | null;
}

const ServiceDialog = ({ isOpen, onClose, service }: ServiceDialogProps) => {
  if (!service) return null;

  // Dividir os detalhes em bullet points para uma melhor apresentação
  const detailPoints = service.details.split('. ').filter(point => point.trim().length > 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-to-br from-white/90 to-cerrado-cream/90 backdrop-blur-xl border-cerrado-green1 max-w-3xl rounded-xl shadow-2xl">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-cerrado-green3 flex items-center gap-2 text-2xl">
            <div className="bg-cerrado-green1/10 p-2 rounded-full">
              <service.icon className="w-8 h-8 text-cerrado-green3" />
            </div>
            <span className="font-bold">{service.title}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div className="space-y-4">
            <p className="text-gray-700 text-lg font-medium italic border-l-4 border-cerrado-green3 pl-3 py-1">
              {service.description}
            </p>
            
            <div className="space-y-2">
              <h3 className="font-semibold text-cerrado-green1 text-lg">Detalhes do Serviço</h3>
              <ul className="space-y-2">
                {detailPoints.map((point, index) => (
                  <li key={index} className="flex items-start gap-2 text-gray-700">
                    <Check className="w-5 h-5 text-cerrado-green3 mt-0.5 flex-shrink-0" />
                    <span>{point}{point.endsWith('.') ? '' : '.'}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div>
            <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-lg">
              <div className="absolute inset-0 bg-cerrado-green1/20"></div>
              <img 
                src={service.image} 
                alt={service.title}
                className="object-cover w-full h-full"
              />
            </div>
            
            <div className="mt-4 bg-cerrado-green1/10 rounded-lg p-3">
              <h3 className="font-semibold text-cerrado-green1 mb-2">Por que escolher este serviço?</h3>
              <p className="text-gray-700 text-sm">
                A Cerrado Engenharia oferece {service.title.toLowerCase()} com excelência técnica e compromisso 
                com resultados sustentáveis. Nossa equipe altamente qualificada garante soluções 
                personalizadas e em conformidade com todas as normas vigentes.
              </p>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-cerrado-green3 text-white rounded-lg hover:bg-cerrado-green1 transition-colors"
          >
            Fechar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceDialog;
