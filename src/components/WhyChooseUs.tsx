
import { useState, useEffect, useRef } from 'react';
import { Award, Users, Lightbulb, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const WhyChooseUs = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

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

  return (
    <section id="diferenciais" className="section-padding bg-cerrado-dark text-white">
      <div 
        ref={sectionRef}
        className={`container mx-auto animate-on-scroll ${isVisible ? 'visible' : ''}`}
      >
        <h2 className="text-cerrado-cream text-3xl sm:text-4xl font-bold mb-12 text-center">
          Por que escolher a Cerrado Engenharia?
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-cerrado-dark/50 border border-cerrado-green3/30 rounded-lg p-8 hover:transform hover:scale-105 transition-transform duration-300">
            <div className="flex justify-center mb-6">
              <Award size={60} className="text-cerrado-green3" />
            </div>
            <h3 className="text-xl font-semibold text-cerrado-green3 mb-4 text-center">Experiência Comprovada</h3>
            <p className="text-center text-gray-300">
              15 anos atuando em diversos setores, do varejo a grandes indústrias, com projetos bem-sucedidos e reconhecidos.
            </p>
          </div>
          
          <div className="bg-cerrado-dark/50 border border-cerrado-green3/30 rounded-lg p-8 hover:transform hover:scale-105 transition-transform duration-300">
            <div className="flex justify-center mb-6">
              <Users size={60} className="text-cerrado-green3" />
            </div>
            <h3 className="text-xl font-semibold text-cerrado-green3 mb-4 text-center">Equipe Especializada</h3>
            <p className="text-center text-gray-300">
              Profissionais altamente qualificados, com formação específica e alinhados às melhores práticas do setor ambiental.
            </p>
          </div>
          
          <div className="bg-cerrado-dark/50 border border-cerrado-green3/30 rounded-lg p-8 hover:transform hover:scale-105 transition-transform duration-300">
            <div className="flex justify-center mb-6">
              <Lightbulb size={60} className="text-cerrado-green3" />
            </div>
            <h3 className="text-xl font-semibold text-cerrado-green3 mb-4 text-center">Soluções Inovadoras</h3>
            <p className="text-center text-gray-300">
              Projetos personalizados para cada cliente, sempre com foco em eficiência, sustentabilidade e resultados práticos.
            </p>
          </div>
        </div>
        
        <div className="text-center">
          <Button 
            className="bg-cerrado-green3 hover:bg-cerrado-green2 text-cerrado-dark font-semibold px-8 py-6 text-lg"
            onClick={() => document.getElementById('contato')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Solicite um Orçamento
            <ArrowRight className="ml-2" size={20} />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;
