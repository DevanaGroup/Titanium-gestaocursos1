
import { useRef, useEffect, useState } from 'react';
import { ArrowRight, ArrowDown, Check, Building, Briefcase, Award, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProjectCard from '@/components/ProjectCard';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious
} from '@/components/ui/carousel';

const Portfolio = () => {
  const [activeSection, setActiveSection] = useState('');
  const sectionRefs = {
    hero: useRef<HTMLElement>(null),
    history: useRef<HTMLElement>(null),
    services: useRef<HTMLElement>(null),
    projects: useRef<HTMLElement>(null),
    differentials: useRef<HTMLElement>(null),
    testimonials: useRef<HTMLElement>(null),
  };

  const getImageBasedOnTags = (tags: string[]) => {
    // Imagens de alta qualidade relacionadas aos tipos de serviço
    if (tags.includes("licenciamento") && tags.includes("indústria")) {
      return "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80"; // Imagem industrial/tecnológica
    } else if (tags.includes("licenciamento") && tags.includes("logística")) {
      return "https://images.unsplash.com/photo-1487887235947-a955ef187fcc?auto=format&fit=crop&w=800&q=80"; // Imagem de drone/inspeção
    } else if (tags.includes("estudos") && tags.includes("urbanismo")) {
      return "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80"; // Imagem de paisagem natural
    } else if (tags.includes("efluentes") || tags.includes("tratamento")) {
      return "https://images.unsplash.com/photo-1482938289607-e9573fc25ebb?auto=format&fit=crop&w=800&q=80"; // Imagem de rio/água
    } else if (tags.includes("resíduos") && tags.includes("indústria")) {
      return "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=800&q=80"; // Imagem industrial/tecnológica
    } else if (tags.includes("estudos") && tags.includes("indústria")) {
      return "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80"; // Imagem ambiental
    } else if (tags.includes("resíduos")) {
      return "https://images.unsplash.com/photo-1426604966848-d7adac402bff?auto=format&fit=crop&w=800&q=80"; // Imagem de natureza
    } else {
      return "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80"; // Imagem default de natureza
    }
  };

  const projects = [
    {
      title: "Licenciamento Ambiental - Indústria Têxtil",
      description: "Processo completo de licenciamento para ampliação de indústria têxtil, incluindo sistema de tratamento de efluentes.",
      tags: ["licenciamento", "efluentes", "indústria"],
      clientName: "Indústria Têxtil Goiás",
      clientLogo: "/images/curtpol.png"
    },
    {
      title: "Estudo de Impacto Ambiental - Loteamento",
      description: "EIA/RIMA para implantação de loteamento urbano com 500 lotes em área de expansão urbana.",
      tags: ["estudos", "urbanismo"],
      clientName: "Cencil Urbanismo",
      clientLogo: "/images/cencil.png"
    },
    {
      title: "Tratamento de Efluentes Industriais",
      description: "Projeto e implantação de sistema de tratamento físico-químico para indústria alimentícia.",
      tags: ["tratamento", "efluentes", "indústria"],
      clientName: "DolceMix Alimentos",
      clientLogo: "/images/dolcemix.png"
    },
    {
      title: "Licença de Operação - Complexo Logístico",
      description: "Regularização ambiental e obtenção de licença de operação para complexo logístico de grande porte.",
      tags: ["licenciamento", "logística"],
      clientName: "GSE Logística",
      clientLogo: "/images/gse.png"
    },
    {
      title: "Relatório Ambiental Preliminar - Indústria Química",
      description: "Elaboração de RAP para ampliação de indústria química, incluindo tratamento de resíduos perigosos.",
      tags: ["estudos", "indústria", "resíduos"],
      clientName: "KellDrin Química",
      clientLogo: "/images/kelldrin.jpg"
    },
    {
      title: "Sistema de Gestão de Resíduos Sólidos",
      description: "Implementação de PGRS para indústria de confecção de grande porte, reduzindo custos de descarte em 40%.",
      tags: ["resíduos", "indústria"],
      clientName: "CurtPol Têxtil",
      clientLogo: "/images/curtpol.png"
    }
  ];

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100;
      
      Object.entries(sectionRefs).forEach(([section, ref]) => {
        if (ref.current) {
          const offsetTop = ref.current.offsetTop;
          const offsetHeight = ref.current.offsetHeight;
          
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section);
          }
        }
      });
    };

    Object.entries(sectionRefs).forEach(([, ref]) => {
      if (ref.current) {
        const observer = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('animate-in');
            }
          },
          { threshold: 0.2 }
        );
        
        observer.observe(ref.current);
        observers.push(observer);
      }
    });

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      observers.forEach((observer) => observer.disconnect());
    };
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Navbar />

      <section 
        ref={sectionRefs.hero} 
        className="relative h-screen overflow-hidden flex items-center pt-20"
      >
        <div 
          className="absolute inset-0 bg-cover bg-center transform scale-110"
          style={{
            backgroundImage: 'url("/lovable-uploads/3fe7d4d1-d7f8-41e0-8d9d-0cfd2df82a5d.png")',
            transform: 'scale(1.1)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-cerrado-dark/90 to-cerrado-dark/70"></div>
        </div>
        
        <div className="container relative z-10 mx-auto px-4">
          <div className="max-w-4xl animate-slide-in-left">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Transformando <span className="text-cerrado-green3">ideias</span> em <span className="text-cerrado-green3">soluções ambientais</span>
            </h1>
            <p className="text-xl md:text-2xl text-white max-w-2xl mb-8">
              Excelência em engenharia ambiental há mais de 15 anos, com projetos que combinam sustentabilidade e resultados.
            </p>
            
            <div className="flex flex-wrap gap-4 mt-10">
              <Button 
                size="lg" 
                className="group bg-cerrado-green3 hover:bg-cerrado-green2 text-cerrado-dark hover:text-white font-semibold px-8 py-7 text-lg"
                onClick={() => sectionRefs.services.current?.scrollIntoView({ behavior: 'smooth' })}
              >
                Conheça nossos serviços
                <ArrowDown className="ml-2 group-hover:translate-y-1 transition-transform" size={20} />
              </Button>
              
              <Button 
                variant="outline" 
                size="lg"
                className="border-cerrado-green3 text-cerrado-green3 hover:bg-cerrado-green3/10 font-semibold px-8 py-7 text-lg"
              >
                Fale com um especialista
              </Button>
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-10 left-0 right-0 flex justify-center animate-bounce">
          <Button 
            variant="ghost" 
            size="sm" 
            className="rounded-full w-12 h-12 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            onClick={() => sectionRefs.history.current?.scrollIntoView({ behavior: 'smooth' })}
          >
            <ArrowDown size={20} />
          </Button>
        </div>
      </section>

      <section 
        ref={sectionRefs.history}
        className="py-24 bg-gradient-to-b from-cerrado-dark to-cerrado-dark/95 text-white"
      >
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-cerrado-green3 mb-4">
              POR QUE ESCOLHER A CERRADO ENGENHARIA?
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Uma história construída com excelência e resultados consistentes
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-16 items-stretch">
            <div className="md:w-1/2 relative p-8 bg-white/5 rounded-2xl backdrop-blur-sm border border-cerrado-green1/20 transform hover:scale-105 transition-all duration-300">
              <div className="absolute -top-6 -left-6 bg-cerrado-green2 text-white w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold">
                1
              </div>
              <h3 className="text-2xl font-bold text-cerrado-green3 mb-4">História de Sucesso</h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <Check className="text-cerrado-green3 mr-3 h-6 w-6 mt-1 flex-shrink-0" />
                  <p>Ao longo de 15 anos, consolidamos projetos em licenciamento ambiental para centenas de clientes em todo o país.</p>
                </li>
                <li className="flex items-start">
                  <Check className="text-cerrado-green3 mr-3 h-6 w-6 mt-1 flex-shrink-0" />
                  <p>Atuamos em diferentes segmentos, desde loteamentos residenciais, grandes indústrias químicas e alimentícias até o varejo e serviços.</p>
                </li>
                <li className="flex items-start">
                  <Check className="text-cerrado-green3 mr-3 h-6 w-6 mt-1 flex-shrink-0" />
                  <p>Nosso time especializado traz a combinação ideal de experiência técnica e inovação.</p>
                </li>
              </ul>
            </div>
            
            <div className="md:w-1/2 relative p-8 bg-white/5 rounded-2xl backdrop-blur-sm border border-cerrado-green1/20 transform hover:scale-105 transition-all duration-300">
              <div className="absolute -top-6 -left-6 bg-cerrado-green2 text-white w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold">
                2
              </div>
              <h3 className="text-2xl font-bold text-cerrado-green3 mb-4">Soluções Completas</h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <Check className="text-cerrado-green3 mr-3 h-6 w-6 mt-1 flex-shrink-0" />
                  <p>Desenvolvemos e implantamos sistemas de tratamento físico-químico e biológico, ajustados à realidade de cada cliente.</p>
                </li>
                <li className="flex items-start">
                  <Check className="text-cerrado-green3 mr-3 h-6 w-6 mt-1 flex-shrink-0" />
                  <p>Acompanhamos todo o processo, desde a concepção do projeto até o start-up e o monitoramento dos resultados.</p>
                </li>
                <li className="flex items-start">
                  <Check className="text-cerrado-green3 mr-3 h-6 w-6 mt-1 flex-shrink-0" />
                  <p>Focamos em sustentabilidade e eficiência, garantindo compliance com a legislação e redução de custos operacionais.</p>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="mt-20 flex justify-center">
            <a href="#services" className="inline-block">
              <Button 
                size="lg" 
                className="group bg-cerrado-green1 hover:bg-cerrado-green2 text-white font-semibold px-8 py-6 text-lg"
                onClick={() => sectionRefs.services.current?.scrollIntoView({ behavior: 'smooth' })}
              >
                <span>Conheça nossos serviços</span>
                <ArrowDown className="ml-2 group-hover:translate-y-1 transition-transform" size={20} />
              </Button>
            </a>
          </div>
        </div>
      </section>
      
      <section 
        id="services"
        ref={sectionRefs.services}
        className="py-24 relative overflow-hidden bg-cerrado-cream/10"
      >
        <div className="absolute inset-0 z-0 opacity-5">
          <div className="absolute inset-0" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23577343\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")', backgroundSize: '60px' }}></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-block p-2 px-4 rounded-full bg-cerrado-green1/10 text-cerrado-green1 font-semibold mb-4">
              <Briefcase className="inline-block mr-2" size={20} />
              Nossos Serviços
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-cerrado-dark mb-4">
              Soluções Ambientais Completas
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Oferecemos um portfólio abrangente de serviços para atender às necessidades ambientais do seu negócio
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all p-8 border-t-4 border-cerrado-green1 transform hover:-translate-y-1 duration-300">
              <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-xl bg-cerrado-green1/10 text-cerrado-green1">
                <Building size={32} />
              </div>
              <h3 className="text-2xl font-bold text-cerrado-dark mb-4">Licenciamento Ambiental Completo</h3>
              <ul className="space-y-4">
                <li className="flex items-start group">
                  <div className="mr-3 mt-1 flex-shrink-0">
                    <div className="w-6 h-6 rounded-full border-2 border-cerrado-green1 flex items-center justify-center group-hover:bg-cerrado-green1 transition-colors">
                      <ChevronRight size={14} className="text-cerrado-green1 group-hover:text-white" />
                    </div>
                  </div>
                  <p className="text-gray-700">Elaboração de EIA/RIMA, RAP, EIV/RIV e estudos específicos para cada demanda.</p>
                </li>
                <li className="flex items-start group">
                  <div className="mr-3 mt-1 flex-shrink-0">
                    <div className="w-6 h-6 rounded-full border-2 border-cerrado-green1 flex items-center justify-center group-hover:bg-cerrado-green1 transition-colors">
                      <ChevronRight size={14} className="text-cerrado-green1 group-hover:text-white" />
                    </div>
                  </div>
                  <p className="text-gray-700">Todo licenciamento ambiental completo com todos os estudos necessários.</p>
                </li>
                <li className="flex items-start group">
                  <div className="mr-3 mt-1 flex-shrink-0">
                    <div className="w-6 h-6 rounded-full border-2 border-cerrado-green1 flex items-center justify-center group-hover:bg-cerrado-green1 transition-colors">
                      <ChevronRight size={14} className="text-cerrado-green1 group-hover:text-white" />
                    </div>
                  </div>
                  <p className="text-gray-700">Intermediação junto aos órgãos ambientais, conferindo segurança e agilidade para que seu projeto seja aprovado no menor tempo possível.</p>
                </li>
              </ul>
            </div>
            
            <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all p-8 border-t-4 border-cerrado-green1 transform hover:-translate-y-1 duration-300">
              <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-xl bg-cerrado-green1/10 text-cerrado-green1">
                <Award size={32} />
              </div>
              <h3 className="text-2xl font-bold text-cerrado-dark mb-4">Serviços Abrangentes para Loteamentos e Indústrias</h3>
              <ul className="space-y-4">
                <li className="flex items-start group">
                  <div className="mr-3 mt-1 flex-shrink-0">
                    <div className="w-6 h-6 rounded-full border-2 border-cerrado-green1 flex items-center justify-center group-hover:bg-cerrado-green1 transition-colors">
                      <ChevronRight size={14} className="text-cerrado-green1 group-hover:text-white" />
                    </div>
                  </div>
                  <p className="text-gray-700">Análise e viabilidade ambiental de áreas de expansão imobiliária.</p>
                </li>
                <li className="flex items-start group">
                  <div className="mr-3 mt-1 flex-shrink-0">
                    <div className="w-6 h-6 rounded-full border-2 border-cerrado-green1 flex items-center justify-center group-hover:bg-cerrado-green1 transition-colors">
                      <ChevronRight size={14} className="text-cerrado-green1 group-hover:text-white" />
                    </div>
                  </div>
                  <p className="text-gray-700">Planejamento e execução de manejo florestal e desmatamento seguindo normas vigentes.</p>
                </li>
                <li className="flex items-start group">
                  <div className="mr-3 mt-1 flex-shrink-0">
                    <div className="w-6 h-6 rounded-full border-2 border-cerrado-green1 flex items-center justify-center group-hover:bg-cerrado-green1 transition-colors">
                      <ChevronRight size={14} className="text-cerrado-green1 group-hover:text-white" />
                    </div>
                  </div>
                  <p className="text-gray-700">Adequações legais para indústrias de todos os portes, desde a instalação até a operação contínua.</p>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section 
        ref={sectionRefs.projects}
        className="py-24 bg-white"
      >
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-block p-2 px-4 rounded-full bg-cerrado-green1/10 text-cerrado-green1 font-semibold mb-4">
              <Building className="inline-block mr-2" size={20} />
              Nossos Projetos
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-cerrado-dark mb-4">
              Soluções que Transformam
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Conheça alguns dos projetos que demonstram nossa expertise e comprometimento com resultados
            </p>
          </div>
          
          <Tabs defaultValue="todos" className="w-full">
            <div className="flex justify-center mb-12">
              <TabsList className="bg-cerrado-cream/20 p-1 rounded-full">
                <TabsTrigger value="todos" className="rounded-full px-8">Todos os Projetos</TabsTrigger>
                <TabsTrigger value="licenciamento" className="rounded-full px-8">Licenciamento</TabsTrigger>
                <TabsTrigger value="tratamento" className="rounded-full px-8">Tratamento de Efluentes</TabsTrigger>
                <TabsTrigger value="estudos" className="rounded-full px-8">Estudos Ambientais</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="todos" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {projects.map((project, index) => (
                  <ProjectCard 
                    key={index}
                    title={project.title}
                    description={project.description}
                    image={getImageBasedOnTags(project.tags)}
                    tags={project.tags}
                    clientName={project.clientName}
                    clientLogo={project.clientLogo}
                  />
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="licenciamento">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {projects
                  .filter(project => project.tags.includes('licenciamento'))
                  .map((project, index) => (
                    <ProjectCard 
                      key={index}
                      title={project.title}
                      description={project.description}
                      image={getImageBasedOnTags(project.tags)}
                      tags={project.tags}
                      clientName={project.clientName}
                      clientLogo={project.clientLogo}
                    />
                  ))}
              </div>
            </TabsContent>
            
            <TabsContent value="tratamento">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {projects
                  .filter(project => project.tags.includes('tratamento') || project.tags.includes('efluentes'))
                  .map((project, index) => (
                    <ProjectCard 
                      key={index}
                      title={project.title}
                      description={project.description}
                      image={getImageBasedOnTags(project.tags)}
                      tags={project.tags}
                      clientName={project.clientName}
                      clientLogo={project.clientLogo}
                    />
                  ))}
              </div>
            </TabsContent>
            
            <TabsContent value="estudos">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {projects
                  .filter(project => project.tags.includes('estudos'))
                  .map((project, index) => (
                    <ProjectCard 
                      key={index}
                      title={project.title}
                      description={project.description}
                      image={getImageBasedOnTags(project.tags)}
                      tags={project.tags}
                      clientName={project.clientName}
                      clientLogo={project.clientLogo}
                    />
                  ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      <section 
        ref={sectionRefs.differentials}
        className="py-24 bg-cerrado-dark text-white"
      >
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-block p-2 px-4 rounded-full bg-cerrado-green3/10 text-cerrado-green3 font-semibold mb-4">
              <Award className="inline-block mr-2" size={20} />
              Diferencial
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-cerrado-green3 mb-4">
              O Que Nos Torna Únicos
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Conheça os diferenciais que fazem da Cerrado Engenharia a escolha certa para seu negócio
            </p>
          </div>
          
          <div className="px-4 sm:px-8 md:px-16">
            <Carousel className="w-full">
              <CarouselContent>
                <CarouselItem className="md:basis-1/1 lg:basis-1/2">
                  <div className="bg-cerrado-dark/50 rounded-2xl overflow-hidden border border-cerrado-green1/30 hover:border-cerrado-green3 transition-all h-full p-1">
                    <div className="bg-gradient-to-br from-cerrado-green1/10 to-transparent rounded-xl p-8 h-full">
                      <div className="mb-6 inline-block bg-cerrado-green3/20 p-4 rounded-xl">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cerrado-green3"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                      </div>
                      <h3 className="text-2xl font-semibold text-cerrado-green3 mb-3">Equipamentos de Última Geração</h3>
                      <p className="text-gray-300 mb-4">
                        Recentemente adquirimos equipamentos de última geração para análise de caldeiras e fontes fixas, tornando o processo de
                        medição e emissão de relatórios ainda mais eficaz.
                      </p>
                      <p className="text-gray-300 mb-4">
                        Com instrumentos próprios, realizamos laudos de emissões atmosféricas (particulados, gases de combustão), além de
                        medições de ruídos, vibrações e odores.
                      </p>
                      <p className="text-gray-300">
                        Essa autonomia garante rapidez e confiabilidade nos resultados, reduzindo burocracia e tempo de espera para nossos clientes.
                      </p>
                    </div>
                  </div>
                </CarouselItem>
                
                <CarouselItem className="md:basis-1/1 lg:basis-1/2">
                  <div className="bg-cerrado-dark/50 rounded-2xl overflow-hidden border border-cerrado-green1/30 hover:border-cerrado-green3 transition-all h-full p-1">
                    <div className="bg-gradient-to-br from-cerrado-green1/10 to-transparent rounded-xl p-8 h-full">
                      <div className="mb-6 inline-block bg-cerrado-green3/20 p-4 rounded-xl">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cerrado-green3"><path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/></svg>
                      </div>
                      <h3 className="text-2xl font-semibold text-cerrado-green3 mb-3">Dedetização Industrial e Comercial</h3>
                      <p className="text-gray-300 mb-4">
                        Expandimos nossa área de atuação para dedetização em ambientes industriais e comerciais, 
                        oferecendo soluções inovadoras e únicas no mercado.
                      </p>
                      <p className="text-gray-300">
                        Utilizamos produtos e métodos seguros, protegendo a saúde das pessoas e 
                        respeitando o meio ambiente.
                      </p>
                    </div>
                  </div>
                </CarouselItem>
                
                <CarouselItem className="md:basis-1/1 lg:basis-1/2">
                  <div className="bg-cerrado-dark/50 rounded-2xl overflow-hidden border border-cerrado-green1/30 hover:border-cerrado-green3 transition-all h-full p-1">
                    <div className="bg-gradient-to-br from-cerrado-green1/10 to-transparent rounded-xl p-8 h-full">
                      <div className="mb-6 inline-block bg-cerrado-green3/20 p-4 rounded-xl">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cerrado-green3"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/><circle cx="12" cy="12" r="4"/></svg>
                      </div>
                      <h3 className="text-2xl font-semibold text-cerrado-green3 mb-3">Monitoramento Contínuo</h3>
                      <p className="text-gray-300 mb-4">
                        Oferecemos serviços de monitoramento contínuo para empresas que precisam acompanhar seus 
                        indicadores ambientais de forma regular.
                      </p>
                      <p className="text-gray-300">
                        Com relatórios detalhados e acompanhamento personalizado, garantimos que sua 
                        empresa esteja sempre em conformidade com as exigências legais.
                      </p>
                    </div>
                  </div>
                </CarouselItem>
              </CarouselContent>
              <div className="hidden md:block">
                <CarouselPrevious className="left-0 bg-cerrado-green3/20 text-cerrado-green3 hover:bg-cerrado-green3 hover:text-white border-none" />
                <CarouselNext className="right-0 bg-cerrado-green3/20 text-cerrado-green3 hover:bg-cerrado-green3 hover:text-white border-none" />
              </div>
            </Carousel>
          </div>
        </div>
      </section>

      <section 
        ref={sectionRefs.testimonials}
        className="py-24 bg-gradient-to-b from-cerrado-cream/10 to-white"
      >
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-block p-2 px-4 rounded-full bg-cerrado-green1/10 text-cerrado-green1 font-semibold mb-4">
              O Que Dizem Sobre Nós
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-cerrado-dark mb-4">
              Depoimentos de Clientes
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              A satisfação de nossos clientes é nosso maior patrimônio
            </p>
          </div>
          
          <div className="px-4 sm:px-8 md:px-16">
            <Carousel className="w-full">
              <CarouselContent>
                <CarouselItem className="md:basis-1/2 lg:basis-1/3">
                  <Card className="border-none shadow-lg hover:shadow-xl transition-all">
                    <CardContent className="p-8">
                      <div className="flex items-center mb-6">
                        <Avatar className="h-16 w-16 mr-4 border-2 border-cerrado-green1">
                          <AvatarImage src="/images/cencil.png" alt="Cencil Urbanismo" className="object-contain p-1" />
                          <AvatarFallback>CU</AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-semibold text-cerrado-dark">Luiz Fernando</h4>
                          <p className="text-sm text-gray-600">Diretor, Cencil Urbanismo</p>
                        </div>
                      </div>
                      <div className="mb-4">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span key={star} className="text-yellow-400">★</span>
                        ))}
                      </div>
                      <p className="text-gray-700 italic">
                        "A equipe da Cerrado Engenharia foi fundamental para a aprovação de nosso loteamento em tempo recorde. 
                        Profissionalismo e eficiência desde o primeiro contato."
                      </p>
                    </CardContent>
                  </Card>
                </CarouselItem>
                
                <CarouselItem className="md:basis-1/2 lg:basis-1/3">
                  <Card className="border-none shadow-lg hover:shadow-xl transition-all">
                    <CardContent className="p-8">
                      <div className="flex items-center mb-6">
                        <Avatar className="h-16 w-16 mr-4 border-2 border-cerrado-green1">
                          <AvatarImage src="/images/dolcemix.png" alt="DolceMix Alimentos" className="object-contain p-1" />
                          <AvatarFallback>DM</AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-semibold text-cerrado-dark">Carla Mendes</h4>
                          <p className="text-sm text-gray-600">Gerente, DolceMix Alimentos</p>
                        </div>
                      </div>
                      <div className="mb-4">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span key={star} className="text-yellow-400">★</span>
                        ))}
                      </div>
                      <p className="text-gray-700 italic">
                        "O sistema de tratamento de efluentes projetado pela Cerrado superou todas as expectativas. 
                        Além de atender às normas, ainda conseguimos reduzir custos operacionais."
                      </p>
                    </CardContent>
                  </Card>
                </CarouselItem>
                
                <CarouselItem className="md:basis-1/2 lg:basis-1/3">
                  <Card className="border-none shadow-lg hover:shadow-xl transition-all">
                    <CardContent className="p-8">
                      <div className="flex items-center mb-6">
                        <Avatar className="h-16 w-16 mr-4 border-2 border-cerrado-green1">
                          <AvatarImage src="/images/gse.png" alt="GSE Logística" className="object-contain p-1" />
                          <AvatarFallback>GSE</AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-semibold text-cerrado-dark">Roberto Alves</h4>
                          <p className="text-sm text-gray-600">CEO, GSE Logística</p>
                        </div>
                      </div>
                      <div className="mb-4">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span key={star} className="text-yellow-400">★</span>
                        ))}
                      </div>
                      <p className="text-gray-700 italic">
                        "Quando achávamos que a regularização seria impossível, a Cerrado nos mostrou soluções viáveis e 
                        conduziu todo o processo com maestria. Recomendo sem hesitar!"
                      </p>
                    </CardContent>
                  </Card>
                </CarouselItem>
              </CarouselContent>
              <div className="hidden md:block">
                <CarouselPrevious className="left-0 bg-white text-cerrado-green1 hover:bg-cerrado-green1 hover:text-white border-cerrado-green1" />
                <CarouselNext className="right-0 bg-white text-cerrado-green1 hover:bg-cerrado-green1 hover:text-white border-cerrado-green1" />
              </div>
            </Carousel>
          </div>
        </div>
      </section>

      <section className="py-24 bg-gradient-to-r from-cerrado-green1 to-cerrado-green2 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6">Pronto para transformar seu projeto em realidade?</h2>
            <p className="text-xl mb-8">
              Nossa equipe está preparada para ajudar sua empresa a superar desafios ambientais 
              com soluções personalizadas e inovadoras.
            </p>
            <Button size="lg" className="bg-white text-cerrado-dark hover:bg-cerrado-cream px-8 py-6 text-lg shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
              Solicitar uma proposta
              <ArrowRight size={20} className="ml-2" />
            </Button>
          </div>
        </div>
      </section>

      <Footer />
      
      <div className="fixed right-8 top-1/2 transform -translate-y-1/2 z-50 hidden lg:block">
        <div className="flex flex-col space-y-4">
          {Object.entries(sectionRefs).map(([key, ref]) => (
            <button
              key={key}
              className={`w-3 h-3 rounded-full border border-cerrado-green3 transition-all duration-300 ${
                activeSection === key ? 'bg-cerrado-green3 scale-150' : 'bg-transparent'
              }`}
              onClick={() => ref.current?.scrollIntoView({ behavior: 'smooth' })}
              aria-label={`Scroll to ${key} section`}
            />
          ))}
        </div>
      </div>
      
      <button 
        className="fixed bottom-8 right-8 z-50 bg-cerrado-green1 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:bg-cerrado-green2 transition-all hover:scale-110"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
      </button>
    </div>
  );
};

export default Portfolio;
