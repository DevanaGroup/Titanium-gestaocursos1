
import { Award } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";

export const DifferentialsCarousel = () => {
  return (
    <section className="py-24 bg-[#F1F1F1]">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <div className="inline-block p-2 px-4 rounded-full bg-cerrado-green3/10 text-cerrado-green3 font-semibold mb-4 shadow-sm">
            <Award className="inline-block mr-2" size={20} />
            Diferencial
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-cerrado-green3 mb-6">
            O Que Nos Torna Únicos
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Conheça os diferenciais que fazem da Cerrado Engenharia a escolha certa para seu negócio
          </p>
        </div>
        
        <div className="px-4 sm:px-8 md:px-16 max-w-5xl mx-auto">
          <Carousel className="w-full">
            <CarouselContent>
              <CarouselItem className="md:basis-1/1 lg:basis-1/2">
                <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl overflow-hidden border border-cerrado-green1/30 hover:border-cerrado-green3 transition-all h-full p-1 hover:scale-105 duration-300">
                  <div className="bg-gradient-to-br from-cerrado-green1/5 to-transparent rounded-xl p-8 h-full">
                    <div className="mb-6 inline-block bg-cerrado-green3/20 p-4 rounded-xl shadow-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cerrado-green3"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
                    </div>
                    <h3 className="text-2xl font-semibold text-cerrado-green3 mb-4">Equipamentos de Última Geração</h3>
                    <p className="text-gray-700">
                      Recentemente adquirimos equipamentos de última geração para análise de caldeiras e fontes fixas, tornando o processo de
                      medição e emissão de relatórios ainda mais eficaz.
                    </p>
                  </div>
                </div>
              </CarouselItem>
              
              <CarouselItem className="md:basis-1/1 lg:basis-1/2">
                <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl overflow-hidden border border-cerrado-green1/30 hover:border-cerrado-green3 transition-all h-full p-1 hover:scale-105 duration-300">
                  <div className="bg-gradient-to-br from-cerrado-green1/5 to-transparent rounded-xl p-8 h-full">
                    <div className="mb-6 inline-block bg-cerrado-green3/20 p-4 rounded-xl shadow-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cerrado-green3"><path d="m21 16-4 4-4-4" /><path d="M17 20V4" /><path d="m3 8 4-4 4 4" /><path d="M7 4v16" /></svg>
                    </div>
                    <h3 className="text-2xl font-semibold text-cerrado-green3 mb-4">Dedetização Industrial e Comercial</h3>
                    <p className="text-gray-700">
                      Expandimos nossa área de atuação para dedetização em ambientes industriais e comerciais, oferecendo soluções inovadoras e únicas no mercado.
                    </p>
                  </div>
                </div>
              </CarouselItem>
            </CarouselContent>
            <div className="hidden md:block">
              <CarouselPrevious className="left-0 bg-cerrado-green3/10 text-cerrado-green3 hover:bg-cerrado-green3 hover:text-white border-none" />
              <CarouselNext className="right-0 bg-cerrado-green3/10 text-cerrado-green3 hover:bg-cerrado-green3 hover:text-white border-none" />
            </div>
          </Carousel>
        </div>
      </div>
    </section>
  );
};
