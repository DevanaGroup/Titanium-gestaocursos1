import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { redirectToWhatsApp, WHATSAPP_MESSAGES } from '@/utils/whatsappUtils';

const Hero = () => {
  return (
    <div className="relative min-h-screen flex items-center pt-20">
      {/* Background Image with Dark Overlay */}
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-fixed"
          style={{
            backgroundImage: 'url("/lovable-uploads/3fe7d4d1-d7f8-41e0-8d9d-0cfd2df82a5d.png")',
            filter: 'sepia(20%) hue-rotate(80deg) saturate(1.2) brightness(0.6)',
          }}
        ></div>
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/70 to-black/55 dark:from-black/95 dark:via-black/80 dark:to-black/70"></div>
        
        {/* Dotted Pattern Overlay */}
        <div className="absolute inset-0 opacity-30">
          <div 
            className="w-full h-full"
            style={{
              backgroundImage: `radial-gradient(circle, #97BF41 1px, transparent 1px)`,
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 10px 10px'
            }}
          ></div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl">
          {/* Main Title */}
          <h1 className="text-white text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 tracking-tight">
            <span 
              className="text-white block"
              style={{
                animation: 'slideInUp 1s ease-out 0.2s both'
              }}
            >
              Superando Desafios
            </span>
            <span 
              className="text-cerrado-green3 drop-shadow-lg inline-block"
              style={{
                animation: 'slideInUp 1s ease-out 0.5s both'
              }}
            >
              Ambientais
            </span>{' '}
            <span 
              className="text-white inline-block"
              style={{
                animation: 'slideInUp 1s ease-out 0.7s both'
              }}
            >
              com
            </span>
            <br/>
            <span 
              className="text-white block"
              style={{
                animation: 'slideInUp 1s ease-out 0.9s both'
              }}
            >
              Compromisso, Inovação e
            </span>
            <span 
              className="text-cerrado-green3 drop-shadow-lg block"
              style={{
                animation: 'slideInUp 1s ease-out 1.1s both'
              }}
            >
              Sustentabilidade
            </span>
          </h1>
          
          {/* Subtitle */}
          <div
            style={{
              animation: 'fadeInUp 1.2s ease-out 1.4s both'
            }}
          >
            <p className="text-white/90 text-lg sm:text-xl md:text-2xl mb-10 leading-relaxed font-medium max-w-3xl">
              A <span className="font-bold text-cerrado-green3">Cerrado Engenharia</span>, desde 2004 atua no mercado desenvolvendo 
              <span className="font-semibold"> soluções ambientais sustentáveis e seguras</span> para licenciar projetos de infraestrutura e Industriais.
            </p>
          </div>
          
          {/* Call to Action Buttons */}
          <div 
            className="flex flex-col sm:flex-row gap-4 mb-12"
            style={{
              animation: 'fadeInUp 1s ease-out 1.8s both'
            }}
          >
            <Button 
              size="lg"
              className="bg-cerrado-green3 hover:bg-cerrado-green2 text-white font-bold text-base px-8 py-3 rounded-xl shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-green-500/25" 
              onClick={() => redirectToWhatsApp(WHATSAPP_MESSAGES.SPECIALIST)}
            >
              Fale com um especialista
              <ArrowRight className="ml-2" size={20} />
            </Button>
            
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => document.getElementById('sobre')?.scrollIntoView({ behavior: 'smooth' })} 
              className="border-2 border-white/80 text-white font-semibold text-base px-8 py-3 rounded-xl bg-white/10 backdrop-blur-sm hover:bg-white/20 hover:border-white transition-all duration-300 hover:scale-105"
            >
              Conheça nossa história
            </Button>
          </div>

          {/* Statistics or highlights */}
          <div 
            className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl"
            style={{
              animation: 'fadeInUp 1s ease-out 2.2s both'
            }}
          >
            <div className="text-center sm:text-left">
              <div className="text-3xl font-bold text-cerrado-green3 mb-2">20+</div>
              <div className="text-white/80 text-sm font-medium">Anos de Experiência</div>
            </div>
            <div className="text-center sm:text-left">
              <div className="text-3xl font-bold text-cerrado-green3 mb-2">500+</div>
              <div className="text-white/80 text-sm font-medium">Projetos Realizados</div>
            </div>
            <div className="text-center sm:text-left">
              <div className="text-3xl font-bold text-cerrado-green3 mb-2">100%</div>
              <div className="text-white/80 text-sm font-medium">Compromisso Ambiental</div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Down Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 cursor-pointer group">
        <div 
          className="transition-all duration-300 group-hover:scale-110" 
          onClick={() => document.getElementById('sobre')?.scrollIntoView({ behavior: 'smooth' })}
          style={{
            animation: 'gentle-bounce 3s ease-in-out infinite 2.5s both'
          }}
        >
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center group-hover:bg-white/30 transition-all duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </div>
        </div>
      </div>


    </div>
  );
};

export default Hero;