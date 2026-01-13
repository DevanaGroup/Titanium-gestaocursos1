import { Factory, TestTube, TreeDeciduous, Cloud, Bug, Home, Satellite, FileText, Ruler, Wind, Shovel } from 'lucide-react';
import GlobeVisualization from '../GlobeVisualization';
import ServiceCard from '../ServiceCard';
import ServiceDialog from '../ServiceDialog';
import { useState, useEffect } from 'react';

// Mantendo a exportação de services separada para evitar problemas de HMR
const servicesList = [{
  icon: Factory,
  title: "Licenciamento Ambiental",
  description: "Processo completo de licenciamento para diversos segmentos.",
  details: "Elaboração de EIA/RIMA, RAP, EIV/RIV e estudos específicos. Intermediação junto aos órgãos ambientais. Agilidade e segurança para aprovação de projetos.",
  image: "/lovable-uploads/2f9bb61a-7bba-4e01-b43a-49f8e7bffcdc.png"
}, {
  icon: TestTube,
  title: "Tratamento de Efluentes",
  description: "Projetos de sistemas físico-químicos e biológicos.",
  details: "Do projeto ao monitoramento, com foco em sustentabilidade e redução de custos.",
  image: "/lovable-uploads/3a284e72-d594-4bf6-ba8b-c1f1468a98b8.png"
}, {
  icon: TreeDeciduous,
  title: "Manejo Florestal",
  description: "Supressão Vegetal e manejo florestal autorizado.",
  details: "Planejamento e execução de desmatamento autorizado conforme normas vigentes.",
  image: "/lovable-uploads/4abadaba-c264-42d7-ad8b-3dd6e68d347e.png"
}, {
  icon: Cloud,
  title: "Controle de Emissões",
  description: "Laudos técnicos e monitoramento atmosférico.",
  details: "Laudos técnicos com medição de particulados, gases, ruídos e vibrações. Equipamentos próprios para maior agilidade e precisão.",
  image: "/lovable-uploads/24840462-f34f-4b3b-874e-cdba7b0a9f21.png"
}, {
  icon: Bug,
  title: "Dedetização Industrial",
  description: "Métodos inovadores e sustentáveis.",
  details: "Métodos inovadores, seguros e sustentáveis para controle de pragas em ambientes industriais e comerciais.",
  image: "/lovable-uploads/2fa8130f-210e-41c9-8c79-d060626e37d7.png"
}, {
  icon: Home,
  title: "REURB",
  description: "Regularização Fundiária Urbana.",
  details: "Planejamento e execução de projetos de regularização fundiária, conforme a Lei Federal nº 13.465/2017. Consultoria e assessoria técnica para regularização de loteamentos urbanos.",
  image: "/lovable-uploads/527e0abb-c43c-4899-805a-63b9893376dd.png"
}, {
  icon: Satellite,
  title: "Topografia",
  description: "Levantamentos topográficos e batimetria.",
  details: "Levantamentos topográficos para projetos, batimetria para represas e levantamento com drone em 3D para análises precisas.",
  image: "/lovable-uploads/4cddec3f-4cae-4dae-a85e-4aa0eb5649dc.png"
}, {
  icon: FileText,
  title: "Consultoria Ambiental",
  description: "Assessoria técnica especializada.",
  details: "Consultoria ambiental estratégica para adequação à legislação e otimização de processos produtivos com foco em sustentabilidade.",
  image: "/lovable-uploads/ad088880-2d43-47b4-ba8b-d1021ef6ae38.png"
}, {
  icon: Ruler,
  title: "Projetos de Engenharia",
  description: "Soluções técnicas customizadas.",
  details: "Desenvolvimento de projetos de engenharia ambiental, civil e sanitária com foco em sustentabilidade e eficiência operacional.",
  image: "/lovable-uploads/54b3289e-fce5-4706-88e8-991aed955f1e.png"
}, {
  icon: Wind,
  title: "Dispersão Atmosférica AERMOD",
  description: "Estudos de qualidade do ar e modelagem atmosférica.",
  details: "Análise detalhada da dispersão de poluentes atmosféricos provenientes de fontes industriais (caldeiras, chaminés, ETEs). Modelagem de cenários com dados meteorológicos atualizados. Avaliação de impacto e propostas para mitigação e controle das emissões atmosféricas.",
  image: "/lovable-uploads/24840462-f34f-4b3b-874e-cdba7b0a9f21.png"
}, {
  icon: Shovel,
  title: "Sondagem Direct Push",
  description: "Investigação ambiental conforme normas NBR 15515.",
  details: "Sondagens ambientais pelo método Direct Push, atendendo às normas ABNT NBR 15515-1, 15515-2 e 15515-3. Amostragem de solo e água subterrânea, caracterização de contaminantes e avaliação ambiental preliminar e confirmatória.",
  image: "/lovable-uploads/3a284e72-d594-4bf6-ba8b-c1f1468a98b8.png"
}];

export const services = servicesList;

export const ServicesGlobe = () => {
  const [selectedService, setSelectedService] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [visibleServices, setVisibleServices] = useState<number[]>([]);
  const [angles, setAngles] = useState<number[]>([]);
  
  // Configurações do círculo
  const CIRCLE_SIZE = 350; // Tamanho do círculo em pixels
  const CIRCLE_RADIUS_PERCENT = 43; // Raio exato em percentagem para alinhar com a borda
  
  // Inicializar os ângulos para cada serviço de forma perfeitamente distribuída
  useEffect(() => {
    // Inicializar ângulos - distribuídos uniformemente em um círculo perfeito
    const initialAngles = servicesList.map((_, index) => {
      // Começar do topo (π/2) e distribuir uniformemente
      return (Math.PI / 2) + (index / servicesList.length) * 2 * Math.PI;
    });
    setAngles(initialAngles);
    
    // Mostrar serviços sequencialmente
    servicesList.forEach((_, index) => {
      setTimeout(() => {
        setVisibleServices(prev => [...prev, index]);
      }, index * 100);
    });
  }, []);
  
  // Obter posição baseada no ângulo
  const getPosition = (index: number) => {
    if (!angles[index] && angles[index] !== 0) return { top: '50%', left: '50%' };
    
    // Calcular posição exata na circunferência
    const angle = angles[index];
    const x = 50 + CIRCLE_RADIUS_PERCENT * Math.cos(angle);
    const y = 50 + CIRCLE_RADIUS_PERCENT * Math.sin(angle);
    
    return {
      top: `${y}%`,
      left: `${x}%`,
      transform: 'translate(-50%, -50%)',
      angle: angle
    };
  };

  // Texto simples para o lado de fora do círculo
  const getTextPosition = (angle: number) => {
    // Calcular com base no quadrante para garantir texto do lado externo
    const isRightSide = Math.cos(angle) > 0;
    
    if (isRightSide) {
      return "ml-2 text-left";
    } else {
      return "mr-2 text-right order-first";
    }
  };

  const handleServiceClick = service => {
    setSelectedService(service);
    setIsDialogOpen(true);
  };

  return (
    <div className="w-full mx-auto pb-12">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-cerrado-green3 mb-2">Nossos Serviços</h2>
        <p className="text-white/80 max-w-2xl mx-auto px-4 print:text-gray-800">
          Oferecemos soluções ambientais completas e integradas para empresas e organizações.
          Clique nos ícones para conhecer mais sobre cada serviço.
        </p>
      </div>
      
      <div className="relative w-full h-[600px] mx-auto print:h-[800px]">
        {/* Círculo de referência exato */}
        <div 
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cerrado-green3"
          style={{ width: `${CIRCLE_SIZE}px`, height: `${CIRCLE_SIZE}px` }}
        ></div>
        
        {/* Globo centralizado */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 flex items-center justify-center">
          <GlobeVisualization />
        </div>
        
        {servicesList.map((service, index) => {
          const position = getPosition(index);
          // Ajuste manual para os serviços específicos
          let customStyle = { ...position };
          if (service.title === "Tratamento de Efluentes") {
            // Move um pouco para a esquerda e acima
            customStyle.left = `calc(${position.left} - 30px)`;
            customStyle.top = `calc(${position.top} - 20px)`;
          }
          if (service.title === "Sondagem Direct Push") {
            // Move um pouco para a direita e acima
            customStyle.left = `calc(${position.left} + 30px)`;
            customStyle.top = `calc(${position.top} - 20px)`;
          }
          return (
            <div 
              key={service.title}
              className={`transition-opacity duration-500 ${
                visibleServices.includes(index) 
                  ? 'opacity-100' 
                  : 'opacity-0'
              }`}
            >
              {/* Container para cada serviço na linha do círculo */}
              <div style={customStyle} className="absolute">
                <div className="flex flex-col items-center">
                  <ServiceCard 
                    icon={service.icon} 
                    title={service.title} 
                    description={service.description} 
                    position={{ top: '0', left: '0' }} 
                    onClick={() => handleServiceClick(service)} 
                  />
                  {/* Nome do serviço abaixo do ícone */}
                  <div className="mt-2 bg-cerrado-green3 bg-opacity-80 px-2 py-1 rounded-lg text-white whitespace-nowrap text-xs font-semibold shadow-md text-center">
                    {service.title}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <ServiceDialog 
        isOpen={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)} 
        service={selectedService} 
      />
    </div>
  );
};
