import { useState } from 'react';
import Footer from '@/components/Footer';
import Logo from '@/components/Logo';
import { ServicesGlobe, services } from '@/components/portfolio2/ServicesGlobe';
import { ChooseUsSection } from '@/components/portfolio2/ChooseUsSection';
import { DifferentialsCarousel } from '@/components/portfolio2/DifferentialsCarousel';
import { TestimonialsCarousel } from '@/components/portfolio2/TestimonialsCarousel';
import { CallToAction } from '@/components/portfolio2/CallToAction';
import { FileText, Download, Printer } from 'lucide-react';

const Portfolio2 = () => {
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  
  const handlePrint = () => {
    window.print();
  };
  
  return (
    <div className="bg-gradient-to-br from-cerrado-dark to-cerrado-dark/90 print:bg-white">
      {/* Barra de ferramentas (visível apenas na tela, não na impressão) */}
      <div className="fixed top-4 right-4 z-50 print:hidden flex gap-2">
        <button 
          onClick={() => setShowPrintOptions(!showPrintOptions)}
          className="bg-cerrado-green3 text-white p-2 rounded-full shadow-lg hover:bg-cerrado-green1 transition-colors"
          title="Opções de exportação"
        >
          <FileText className="w-5 h-5" />
        </button>
        
        {showPrintOptions && (
          <div className="absolute top-full right-0 mt-2 bg-white shadow-xl rounded-lg p-3 w-48 animate-fade-in">
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 w-full text-left p-2 hover:bg-cerrado-green1/10 rounded-md text-cerrado-green1"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / PDF</span>
            </button>
            <a 
              href="#" 
              className="flex items-center gap-2 w-full text-left p-2 hover:bg-cerrado-green1/10 rounded-md text-cerrado-green1"
            >
              <Download className="w-4 h-4" />
              <span>Baixar portfólio</span>
            </a>
          </div>
        )}
      </div>

      {/* Header com aspecto de capa de PDF */}
      <div className="relative h-[30vh] bg-gradient-to-r from-cerrado-green1 to-cerrado-green3 shadow-lg">
        <div className="absolute inset-0 bg-[url('/lovable-uploads/abstract-pattern.png')] bg-cover opacity-20"></div>
        <div className="absolute top-0 left-0 w-full h-full flex flex-col justify-center items-center text-white p-8">
          <div className="mb-6 transform scale-150">
            <Logo variant="default" showText={true} />
          </div>
          <span className="mb-4 text-lg md:text-xl font-semibold text-center" style={{color: '#181818', textShadow: '0 2px 8px rgba(0,0,0,0.18)'}}>Resultado eficiente, Respeito ao meio ambiente.</span>
          <h1 className="text-2xl font-bold tracking-tight mb-2 text-center">Portfólio de Serviços</h1>
        </div>
        
        {/* Decoração gráfica */}
        <div className="absolute bottom-0 left-0 w-full h-16 bg-cerrado-dark" style={{ 
          clipPath: 'polygon(0 100%, 100% 100%, 100% 0, 0 100%)' 
        }}></div>
      </div>

      {/* Conteúdo principal em formato de páginas */}
      <div className="max-w-[1000px] mx-auto bg-white/5 backdrop-blur-sm my-8 rounded-lg shadow-2xl print:shadow-none print:bg-white">
        {/* Número de página e data (estilo PDF) */}
        <div className="text-right text-xs text-white/50 p-4 print:text-gray-500">
          <p>Cerrado Engenharia © {new Date().getFullYear()}</p>
          <p>Atualizado em: {new Date().toLocaleDateString('pt-BR')}</p>
        </div>
        
        <div className="p-8">
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-cerrado-green3 mb-4 border-b border-cerrado-green3/30 pb-2 flex items-center">
              <span className="bg-cerrado-green3 text-white w-8 h-8 rounded-full inline-flex items-center justify-center mr-2 text-sm">1</span>
              Sobre a Cerrado Engenharia
            </h2>
            <p className="text-white/80 mb-4 print:text-gray-800">
              A Cerrado Engenharia Ambiental é uma empresa especializada em soluções ambientais 
              integradas, focada em fornecer serviços de alta qualidade que atendam às necessidades
              específicas de cada cliente, sempre em conformidade com a legislação vigente.
            </p>
            <p className="text-white/80 print:text-gray-800">
              Com uma equipe altamente qualificada e multidisciplinar, desenvolvemos projetos
              que combinam eficiência técnica, viabilidade econômica e responsabilidade ambiental.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <div className="bg-cerrado-green1/10 p-4 rounded-lg">
                <h3 className="text-cerrado-green3 font-semibold mb-2">Missão</h3>
                <p className="text-white/80 text-sm print:text-gray-700">
                  Proporcionar soluções ambientais inovadoras e sustentáveis, contribuindo para o
                  desenvolvimento responsável dos nossos clientes e da sociedade.
                </p>
              </div>
              <div className="bg-cerrado-green1/10 p-4 rounded-lg">
                <h3 className="text-cerrado-green3 font-semibold mb-2">Visão</h3>
                <p className="text-white/80 text-sm print:text-gray-700">
                  Ser referência nacional em consultoria ambiental, reconhecida pela excelência técnica
                  e compromisso com a sustentabilidade em todos os projetos.
                </p>
              </div>
              <div className="bg-cerrado-green1/10 p-4 rounded-lg">
                <h3 className="text-cerrado-green3 font-semibold mb-2">Valores</h3>
                <p className="text-white/80 text-sm print:text-gray-700">
                  Ética, responsabilidade, inovação, compromisso com resultados e respeito ao meio ambiente
                  e às comunidades onde atuamos.
                </p>
              </div>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-cerrado-green3 mb-4 border-b border-cerrado-green3/30 pb-2 flex items-center">
              <span className="bg-cerrado-green3 text-white w-8 h-8 rounded-full inline-flex items-center justify-center mr-2 text-sm">2</span>
              Nossos Serviços
            </h2>
            <p className="text-white/80 mb-6 print:text-gray-800">
              A Cerrado Engenharia oferece uma ampla gama de serviços ambientais para atender 
              às diversas necessidades de empresas, indústrias, empreendimentos e propriedades 
              rurais. Conheça nossos principais serviços:
            </p>
            
            <ServicesGlobe />
          </div>
        </div>

        <div className="p-8 bg-cerrado-green1/5">
          <h2 className="text-2xl font-semibold text-cerrado-green3 mb-4 border-b border-cerrado-green3/30 pb-2 flex items-center">
            <span className="bg-cerrado-green3 text-white w-8 h-8 rounded-full inline-flex items-center justify-center mr-2 text-sm">3</span>
            Por que escolher a Cerrado Engenharia?
          </h2>
          <ChooseUsSection />
        </div>
        
        <div className="p-8">
          <h2 className="text-2xl font-semibold text-cerrado-green3 mb-4 border-b border-cerrado-green3/30 pb-2 flex items-center">
            <span className="bg-cerrado-green3 text-white w-8 h-8 rounded-full inline-flex items-center justify-center mr-2 text-sm">4</span>
            Nossos Diferenciais
          </h2>
          <DifferentialsCarousel />
        </div>
        
        <div className="p-8 bg-cerrado-green1/5">
          <h2 className="text-2xl font-semibold text-cerrado-green3 mb-4 border-b border-cerrado-green3/30 pb-2 flex items-center">
            <span className="bg-cerrado-green3 text-white w-8 h-8 rounded-full inline-flex items-center justify-center mr-2 text-sm">5</span>
            O que nossos clientes dizem
          </h2>
          <TestimonialsCarousel />
        </div>
        
        <div className="p-8">
          <h2 className="text-2xl font-semibold text-cerrado-green3 mb-4 border-b border-cerrado-green3/30 pb-2 flex items-center">
            <span className="bg-cerrado-green3 text-white w-8 h-8 rounded-full inline-flex items-center justify-center mr-2 text-sm">6</span>
            Fale Conosco
          </h2>
          <CallToAction />
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Portfolio2;
