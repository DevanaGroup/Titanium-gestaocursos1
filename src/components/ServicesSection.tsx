import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Leaf, Building, Factory, TreePine, Zap, Shield, Award, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { redirectToWhatsApp, WHATSAPP_MESSAGES } from '@/utils/whatsappUtils';

const ServicesSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredService, setHoveredService] = useState<number | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      {
        threshold: 0.1,
      }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  const mainServices = [
    {
      icon: <Factory className="w-8 h-8" />,
      title: "Usinas Hidrelétricas",
      subtitle: "Licenciamento e Impacto Ambiental",
      description: "Desenvolvimento de estudos ambientais completos para usinas hidrelétricas, seguindo rigorosamente os padrões do CONAMA e priorizando a eficiência energética sustentável.",
      features: ["EIA/RIMA", "Monitoramento Aquático", "Licença de Operação"]
    },
    {
      icon: <Building className="w-8 h-8" />,
      title: "Linhas de Transmissão",
      subtitle: "Infraestrutura Energética Sustentável",
      description: "Licenciamento ambiental especializado para linhas de transmissão, fundamentado em legislação específica e princípios de precaução e inovação tecnológica.",
      features: ["Estudos de Viabilidade", "Compensação Ambiental", "Gestão de Impactos"]
    },
    {
      icon: <TreePine className="w-8 h-8" />,
      title: "Monitoramento de Fauna e Flora",
      subtitle: "Conservação da Biodiversidade",
      description: "Programas abrangentes de monitoramento da biodiversidade, envolvendo estudos científicos especializados para avaliar impactos e direcionar medidas de conservação eficazes.",
      features: ["Inventário Biológico", "Programa de Salvamento", "Análise de Impactos"]
    },
    {
      icon: <Leaf className="w-8 h-8" />,
      title: "Estudos de Ictiofauna",
      subtitle: "Ecossistemas Aquáticos",
      description: "Estudos especializados de ictiofauna e ictioplâncton, fundamentais para compreensão da biologia aquática e controle sustentável de estoques pesqueiros.",
      features: ["Identificação de Espécies", "Análise Populacional", "Monitoramento Reprodutivo"]
    }
  ];

  const additionalServices = [
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Consultoria Especializada",
      description: "Adequação à legislação ambiental, gestão de passivos e auditorias completas"
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Projetos de Engenharia",
      description: "Tratamento de efluentes, gestão de resíduos e controle de emissões"
    },
    {
      icon: <Award className="w-6 h-6" />,
      title: "Gestão Ambiental",
      description: "Implementação de sistemas de gestão ISO 14001 e certificações ambientais"
    }
  ];

  return (
    <section id="servicos" className="py-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2397BF41' fill-opacity='0.3'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
      </div>

      <div 
        ref={sectionRef}
        className={`container mx-auto px-4 sm:px-6 lg:px-8 animate-on-scroll ${isVisible ? 'visible' : ''} relative z-10`}
      >
        {/* Header */}
        <div className="text-center mb-20">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
            Nossos <span className="text-cerrado-green3">Serviços</span>
          </h2>
          <p className="text-xl text-white/80 max-w-4xl mx-auto leading-relaxed">
            Soluções ambientais completas e sustentáveis para licenciamento, monitoramento e gestão de projetos de infraestrutura
          </p>
        </div>
        
        {/* Main Services - Enhanced Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-20">
          {mainServices.map((service, index) => (
            <div 
              key={index}
              className="group relative overflow-hidden rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-cerrado-green3/50 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-cerrado-green3/10"
              onMouseEnter={() => setHoveredService(index)}
              onMouseLeave={() => setHoveredService(null)}
            >
              {/* Background Gradient - Cor padrão do sistema Cerrado */}
              <div className="absolute inset-0 bg-gradient-to-br from-cerrado-dark via-cerrado-green1 to-cerrado-green2 opacity-90 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
              
              {/* Content */}
              <div className="relative z-10 p-8 h-full min-h-[450px] flex flex-col">
                {/* Icon and Badge */}
                <div className="flex items-center justify-between mb-6">
                  <div className="bg-cerrado-green3 p-3 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                    {service.icon}
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full">
                    <span className="text-cerrado-green3 text-xs font-semibold uppercase tracking-wide">Especializado</span>
                  </div>
                </div>
                
                {/* Title and Subtitle */}
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2 leading-tight group-hover:text-cerrado-green3 transition-colors duration-300">
                    {service.title}
                  </h3>
                  <p className="text-cerrado-green3 font-semibold text-sm uppercase tracking-wide">
                    {service.subtitle}
                  </p>
                </div>
                
                {/* Description */}
                <p className="text-white/90 text-base leading-relaxed mb-6 flex-grow">
                  {service.description}
                </p>
                
                {/* Features List */}
                <div className="mb-6">
                  <div className="grid grid-cols-1 gap-2">
                    {service.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center">
                        <div className="w-2 h-2 bg-cerrado-green3 rounded-full mr-3"></div>
                        <span className="text-white/80 text-sm font-medium">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Action Button */}
                <Button 
                  className="bg-cerrado-green3 hover:bg-cerrado-green2 text-white font-bold px-6 py-3 rounded-2xl self-start transition-all duration-300 hover:scale-105 shadow-lg group-hover:shadow-cerrado-green3/25"
                  onClick={() => document.getElementById('contato')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Solicitar Orçamento
                  <ArrowRight className="ml-2" size={16} />
                </Button>
              </div>
            </div>
          ))}
        </div>
        
        {/* Additional Services - Compact Cards */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-white mb-8 text-center">Serviços Complementares</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {additionalServices.map((service, index) => (
              <div 
                key={index}
                className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-cerrado-green3/50 transition-all duration-300 hover:scale-105 hover:bg-white/10 group"
              >
                <div className="flex items-start mb-4">
                  <div className="bg-cerrado-green3/20 p-3 rounded-xl mr-4 group-hover:bg-cerrado-green3 group-hover:scale-110 transition-all duration-300">
                    <div className="text-cerrado-green3 group-hover:text-white transition-colors duration-300">
                      {service.icon}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-white mb-2 group-hover:text-cerrado-green3 transition-colors duration-300">
                      {service.title}
                    </h4>
                    <p className="text-white/80 text-sm leading-relaxed">
                      {service.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center text-cerrado-green3 group-hover:translate-x-2 transition-transform duration-300">
                  <span className="text-sm font-semibold">Saiba mais</span>
                  <ChevronRight className="ml-1" size={16} />
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Call to Action Section */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-cerrado-green3/20 to-cerrado-green2/20 rounded-3xl p-12 backdrop-blur-sm border border-white/10 max-w-4xl mx-auto">
            <h3 className="text-3xl font-bold text-white mb-4">
              Pronto para Licenciar seu Projeto?
            </h3>
            <p className="text-white/80 text-lg mb-8 leading-relaxed">
              Nossa equipe especializada está preparada para desenvolver a melhor estratégia ambiental para seu empreendimento
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/portfolio2">
                <Button 
                  size="lg"
                  className="bg-cerrado-green3 hover:bg-cerrado-green2 text-white font-bold text-base px-8 py-4 rounded-2xl shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-cerrado-green3/25"
                >
                  Ver Portfólio Completo
                  <ArrowRight className="ml-2" size={20} />
                </Button>
              </Link>
              <Button 
                variant="outline" 
                size="lg"
                className="border-2 border-white/60 text-white hover:bg-white hover:text-slate-900 font-bold text-base px-8 py-4 rounded-2xl transition-all duration-300 hover:scale-105"
                onClick={() => redirectToWhatsApp(WHATSAPP_MESSAGES.SPECIALIST)}
              >
                Fale com Especialista
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
