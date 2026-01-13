import { useState, useEffect, useRef } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Leaf, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DifferentialsSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

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

  const projects = [
    {
      title: "Hidrelétrica Sustentável",
      location: "Região Centro-Oeste",
      description: "Projeto de licenciamento ambiental para usina hidrelétrica com foco em preservação da fauna aquática"
    },
    {
      title: "Linha de Transmissão Ecológica",
      location: "Estado de Goiás",
      description: "Implementação de sistema de transmissão com mínimo impacto ambiental e recuperação de áreas degradadas"
    },
    {
      title: "Monitoramento de Biodiversidade",
      location: "Cerrado Brasileiro", 
      description: "Programa de monitoramento e conservação da fauna e flora nativa do bioma cerrado"
    },
    {
      title: "Ecossistema Aquático",
      location: "Bacia do Rio Tocantins",
      description: "Estudos ictiológicos e preservação de espécies endêmicas em ecossistemas aquáticos"
    }
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % projects.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + projects.length) % projects.length);
  };

  // Auto-slide
  useEffect(() => {
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section 
      id="diferenciais" 
      className="py-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-black dark:via-slate-900 dark:to-black relative overflow-hidden"
    >
      <div 
        ref={sectionRef}
        className={`container mx-auto px-4 sm:px-6 lg:px-8 animate-on-scroll ${isVisible ? 'visible' : ''} relative z-10`}
      >
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
            Projetos focados em <span className="text-cerrado-green3">sustentabilidade</span>
          </h2>
          <p className="text-lg text-white/80 max-w-4xl mx-auto leading-relaxed">
            Nosso propósito é proporcionar mudanças significativas e duradouras, respeitando os valores, 
            a ética e a excelência ambiental.
          </p>
        </div>

        {/* Projects Carousel */}
        <div className="relative max-w-6xl mx-auto mb-16">
          <div className="flex overflow-hidden rounded-2xl shadow-2xl">
            {projects.map((project, index) => (
              <div
                key={index}
                className={`min-w-full transition-transform duration-700 ease-in-out ${
                  index === currentSlide ? 'transform translate-x-0' : 
                  index < currentSlide ? 'transform -translate-x-full' : 
                  'transform translate-x-full'
                }`}
                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
              >
                <div className="relative overflow-hidden rounded-2xl">
                  {/* Background Gradient - Cor padrão do sistema Cerrado */}
                  <div className="absolute inset-0 bg-gradient-to-br from-cerrado-dark via-cerrado-green1 to-cerrado-green2 opacity-90"></div>
                  
                  {/* Project Info */}
                  <div className="relative bg-white/5 backdrop-blur-sm p-8 lg:p-12 flex flex-col justify-center min-h-[400px]">
                    <div className="flex items-center mb-4">
                      <Leaf className="w-5 h-5 text-cerrado-green3 mr-2" />
                      <span className="text-cerrado-green3 font-semibold uppercase tracking-wide text-xs">
                        Projeto Sustentável
                      </span>
                    </div>
                    
                    <h3 className="text-2xl font-bold text-white mb-4 leading-tight">
                      {project.title}
                    </h3>
                    
                    <div className="flex items-center mb-6">
                      <MapPin className="w-4 h-4 text-white/60 mr-2" />
                      <span className="text-white/80 font-medium text-sm">{project.location}</span>
                    </div>
                    
                    <p className="text-white/90 text-base leading-relaxed mb-8">
                      {project.description}
                    </p>
                    
                    <Button 
                      className="bg-cerrado-green3 hover:bg-cerrado-green2 text-white font-bold self-start transition-all duration-300 hover:scale-105 shadow-lg"
                      onClick={() => document.getElementById('contato')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                      Saiba Mais
                      <ArrowRight className="ml-2" size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation Arrows */}
          <button 
            onClick={prevSlide}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-3 transition-all duration-300 hover:scale-110"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          
          <button 
            onClick={nextSlide}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-3 transition-all duration-300 hover:scale-110"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>

          {/* Dots Indicator */}
          <div className="flex justify-center mt-6 space-x-2">
            {projects.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentSlide 
                    ? 'bg-cerrado-green3 scale-125' 
                    : 'bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <Button 
            size="lg"
            className="bg-cerrado-green3 hover:bg-cerrado-green2 text-white font-bold text-base px-8 py-3 rounded-xl shadow-2xl transition-all duration-300 hover:scale-105"
            onClick={() => document.getElementById('servicos')?.scrollIntoView({ behavior: 'smooth' })}
          >
            CONHEÇA NOSSOS PROJETOS
            <ArrowRight className="ml-2" size={20} />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default DifferentialsSection;
