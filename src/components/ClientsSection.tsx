
import React, { useEffect } from 'react';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';

const ClientsSection = () => {
  const clientLogos = [
    { name: 'Grupo Kelldrin', src: '/images/kelldrin.jpg' },
    { name: 'Manzoni Motors', src: '/images/manzoni.jpg' },
    { name: 'Outlet Premium', src: '/images/outlet.png' },
    { name: 'Dolce Mix Sorvetes', src: '/images/dolcemix.png' },
    { name: 'Chocolaterie', src: '/images/choucolatere.png' },
    { name: 'Deck Mambo', src: '/images/mambo.jpg' },
    { name: 'GSE Soluções Ambientais', src: '/images/gse.png' },
    { name: 'Geolab', src: '/images/geolab.png' },
    { name: 'Grupo Luiz Höhl', src: '/images/luiz.jpg' },
    { name: 'AMEC Amazonas Eco Company', src: '/images/amec.jpg' },
    { name: 'Ecoblending', src: '/images/ecoblending.jpg' },
    { name: 'Cencil Couros', src: '/images/cencil.png' },
    { name: 'Curtpol', src: '/images/curtpol.png' },
  ];

  // Create duplicate logos for seamless infinite carousel effect
  const duplicatedLogos = [...clientLogos, ...clientLogos];

  useEffect(() => {
    // Auto-scrolling animation for the carousel
    const interval = setInterval(() => {
      const scrollContainer = document.querySelector('.client-carousel-container');
      if (scrollContainer) {
        const scrollAmount = 1; // pixels to scroll per interval
        scrollContainer.scrollLeft += scrollAmount;
        
        // Reset scroll position when reaching the end to create an infinite loop effect
        if (scrollContainer.scrollLeft >= (scrollContainer.scrollWidth / 2)) {
          scrollContainer.scrollLeft = 0;
        }
      }
    }, 20); // adjust speed by changing interval time

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-16 bg-cerrado-cream/10 overflow-hidden">
      <div className="container mx-auto px-4 mb-12">
        <h2 className="text-cerrado-dark text-3xl sm:text-4xl font-bold mb-12 text-center animate-on-scroll">
          Nossos Clientes
        </h2>
        
        <p className="text-center text-gray-700 max-w-3xl mx-auto mb-12 animate-on-scroll">
          Empresas e organizações que confiam no trabalho da Cerrado Engenharia para suas soluções e projetos ambientais.
        </p>
      </div>
      
      <div className="relative w-full overflow-hidden">
        <div className="client-carousel-container flex overflow-x-scroll no-scrollbar">
          <div className="flex animate-on-scroll whitespace-nowrap">
            {duplicatedLogos.map((logo, index) => (
              <div 
                key={index} 
                className="inline-flex items-center justify-center mx-8 h-24 flex-shrink-0"
              >
                <img 
                  src={logo.src} 
                  alt={logo.name} 
                  className="max-h-full max-w-[160px] object-contain filter transition-all duration-300"
                />
              </div>
            ))}
          </div>
        </div>
        
        {/* Gradient overlays for smooth fade effect */}
        <div className="absolute top-0 left-0 h-full w-24 bg-gradient-to-r from-white to-transparent z-10"></div>
        <div className="absolute top-0 right-0 h-full w-24 bg-gradient-to-l from-white to-transparent z-10"></div>
      </div>
    </section>
  );
};

export default ClientsSection;
