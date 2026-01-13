import { useState, useEffect, useRef } from 'react';
import { ArrowRight, Award, Users, TreePine, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

const AboutSection = () => {
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
    <section id="sobre" className="py-20 bg-background dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-800">
      <div 
        ref={sectionRef}
        className={`container mx-auto px-4 sm:px-6 lg:px-8 animate-on-scroll ${isVisible ? 'visible' : ''}`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Image Section */}
          <div className="relative group overflow-hidden rounded-2xl shadow-2xl">
            <img 
              src="/lovable-uploads/3fe7d4d1-d7f8-41e0-8d9d-0cfd2df82a5d.png"
              alt="Projeto de hidrelétrica da Ambiental"
              className="w-full h-[500px] object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-cerrado-green1/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </div>

          {/* Content Section */}
          <div className="space-y-8">
            {/* Header */}
            <div>
              <p className="text-cerrado-green3 font-semibold text-base mb-2 uppercase tracking-wide">Sobre Nós</p>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-6 leading-tight">
                Cerrado Engenharia, <span className="text-cerrado-green3">referência há 21 Anos</span>, em Soluções Ambientais e <span className="text-cerrado-green3">Sustentabilidade!</span>
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                É por isso que utilizamos a tecnologia e a ciência em busca de soluções que resolvam 
                problemas em projetos, empresas e comunidades.
              </p>
            </div>

            {/* CTA Button */}
            <div>
              <Button 
                size="lg"
                className="bg-cerrado-green3 hover:bg-cerrado-green2 text-white font-bold text-base px-8 py-3 rounded-xl shadow-lg transition-all duration-300 hover:scale-105"
                onClick={() => document.getElementById('diferenciais')?.scrollIntoView({ behavior: 'smooth' })}
              >
                CONHEÇA A AMBIENTAL
                <ArrowRight className="ml-2" size={20} />
              </Button>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-4 pt-6">
              <div className="text-center p-4 rounded-xl bg-card dark:bg-slate-800/50 border border-border hover:shadow-lg transition-all duration-300 hover:scale-105 card-3d">
                <Award className="w-10 h-10 text-cerrado-green3 mx-auto mb-3 icon-bounce" />
                <h4 className="text-base font-bold text-foreground mb-2">Excelência</h4>
                <p className="text-xs text-muted-foreground">20+ anos de experiência comprovada</p>
              </div>
              
              <div className="text-center p-4 rounded-xl bg-card dark:bg-slate-800/50 border border-border hover:shadow-lg transition-all duration-300 hover:scale-105 card-3d">
                <Users className="w-10 h-10 text-cerrado-green3 mx-auto mb-3 icon-bounce" />
                <h4 className="text-base font-bold text-foreground mb-2">Equipe</h4>
                <p className="text-xs text-muted-foreground">Profissionais especializados</p>
              </div>
              
              <div className="text-center p-4 rounded-xl bg-card dark:bg-slate-800/50 border border-border hover:shadow-lg transition-all duration-300 hover:scale-105 card-3d">
                <TreePine className="w-10 h-10 text-cerrado-green3 mx-auto mb-3 icon-bounce" />
                <h4 className="text-base font-bold text-foreground mb-2">Sustentabilidade</h4>
                <p className="text-xs text-muted-foreground">Compromisso ambiental total</p>
              </div>
              
              <div className="text-center p-4 rounded-xl bg-card dark:bg-slate-800/50 border border-border hover:shadow-lg transition-all duration-300 hover:scale-105 card-3d">
                <Zap className="w-10 h-10 text-cerrado-green3 mx-auto mb-3 icon-bounce" />
                <h4 className="text-base font-bold text-foreground mb-2">Inovação</h4>
                <p className="text-xs text-muted-foreground">Tecnologia de ponta aplicada</p>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Section */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="text-center p-6 bg-gradient-to-br from-cerrado-green1 to-cerrado-green2 rounded-2xl text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="text-3xl font-bold mb-2">500+</div>
            <div className="text-base font-medium">Projetos Realizados</div>
          </div>
          
          <div className="text-center p-6 bg-gradient-to-br from-cerrado-green2 to-cerrado-green3 rounded-2xl text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="text-3xl font-bold mb-2">21</div>
            <div className="text-base font-medium">Anos de Mercado</div>
          </div>
          
          <div className="text-center p-6 bg-gradient-to-br from-cerrado-green3 to-cerrado-green2 rounded-2xl text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="text-3xl font-bold mb-2">100%</div>
            <div className="text-base font-medium">Licenças Aprovadas</div>
          </div>
          
          <div className="text-center p-6 bg-gradient-to-br from-cerrado-green2 to-cerrado-green1 rounded-2xl text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="text-3xl font-bold mb-2">50+</div>
            <div className="text-base font-medium">Colaboradores</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
