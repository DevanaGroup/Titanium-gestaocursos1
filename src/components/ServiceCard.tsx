import { LucideIcon } from 'lucide-react';
import { useState } from 'react';

interface ServiceCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  position: {
    top: string;
    left: string;
    transform?: string;
  };
  onClick: () => void;
}

const ServiceCard = ({ icon: Icon, title, description, position, onClick }: ServiceCardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="cursor-pointer z-20"
      style={{
        top: position.top,
        left: position.left,
        transform: position.transform || 'none',
      }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative">
        <div 
          className={`bg-cerrado-green3 text-white p-2 rounded-full
            flex items-center justify-center w-[48px] h-[48px]
            shadow-lg hover:shadow-cerrado-green3/25 hover:scale-110
            print:shadow-none print:w-[36px] print:h-[36px]`}
        >
          <Icon size={24} className="print:w-5 print:h-5" />
        </div>

        {/* Informações do serviço - visível ao passar o mouse e na impressão */}
        {(isHovered || typeof window !== 'undefined' && window.matchMedia('print').matches) && (
          <>
            <div 
              className="absolute bottom-0 left-1/2 w-px h-8 bg-cerrado-green3/50 print:hidden"
              style={{ transform: 'translateX(-50%)' }}
            />
            
            <div 
              className="absolute bottom-12 left-1/2 transform -translate-x-1/2 
                bg-cerrado-green4/90 backdrop-blur-sm p-3 rounded-lg 
                shadow-xl w-48 text-left z-30 
                print:bg-transparent print:shadow-none print:hidden"
            >
              <h4 className="font-semibold text-white text-sm">{title}</h4>
              <p className="text-white/80 text-xs mt-1">{description}</p>
            </div>
          </>
        )}
        
        {/* Versão específica para impressão */}
        <div className="hidden print:block absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-32 text-center">
          <h4 className="font-semibold text-cerrado-green3 text-[8pt]">{title}</h4>
        </div>
      </div>
    </div>
  );
};

export default ServiceCard;
