
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const TestimonialsCarousel = () => {
  return (
    <section className="py-24 bg-[#eee]">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-cerrado-green3 mb-6">
            Depoimentos de Clientes
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            A satisfação de nossos clientes é nosso maior patrimônio
          </p>
        </div>
        
        <div className="px-4 sm:px-8 md:px-16 max-w-5xl mx-auto">
          <Carousel className="w-full">
            <CarouselContent>
              <CarouselItem className="md:basis-1/2 lg:basis-1/3">
                <div className="flex justify-center">
                  <Card className="border-none shadow-none bg-transparent w-full max-w-md">
                    <CardContent className="p-8 text-center bg-white/80 backdrop-blur-sm rounded-xl border border-cerrado-green1/10">
                      <div className="flex flex-col items-center mb-6">
                        <Avatar className="h-20 w-20 mb-4 border-2 border-cerrado-green1 shadow-md">
                          <AvatarImage src="/images/cencil.png" alt="Cencil Urbanismo" className="object-contain p-1" />
                          <AvatarFallback>CU</AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-semibold text-cerrado-dark text-lg">Luiz Fernando</h4>
                          <p className="text-sm text-gray-600">Diretor, Cencil Urbanismo</p>
                        </div>
                      </div>
                      <div className="mb-6 text-center">
                        {[1, 2, 3, 4, 5].map(star => <span key={star} className="text-yellow-400 text-xl">★</span>)}
                      </div>
                      <p className="text-gray-700 italic">
                        "A equipe da Cerrado Engenharia foi fundamental para a aprovação de nosso loteamento em tempo recorde. 
                        Profissionalismo e eficiência desde o primeiro contato."
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
              
              <CarouselItem className="md:basis-1/2 lg:basis-1/3">
                <div className="flex justify-center">
                  <Card className="border-none shadow-none bg-transparent w-full max-w-md">
                    <CardContent className="p-8 text-center bg-white/80 backdrop-blur-sm rounded-xl border border-cerrado-green1/10">
                      <div className="flex flex-col items-center mb-6">
                        <Avatar className="h-20 w-20 mb-4 border-2 border-cerrado-green1 shadow-md">
                          <AvatarImage src="/images/dolcemix.png" alt="DolceMix Alimentos" className="object-contain p-1" />
                          <AvatarFallback>DM</AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-semibold text-cerrado-dark text-lg">Carla Mendes</h4>
                          <p className="text-sm text-gray-600">Gerente, DolceMix Alimentos</p>
                        </div>
                      </div>
                      <div className="mb-6 text-center">
                        {[1, 2, 3, 4, 5].map(star => <span key={star} className="text-yellow-400 text-xl">★</span>)}
                      </div>
                      <p className="text-gray-700 italic">
                        "O sistema de tratamento de efluentes projetado pela Cerrado superou todas as expectativas. 
                        Além de atender às normas, ainda conseguimos reduzir custos operacionais."
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>

              <CarouselItem className="md:basis-1/2 lg:basis-1/3">
                <div className="flex justify-center">
                  <Card className="border-none shadow-none bg-transparent w-full max-w-md">
                    <CardContent className="p-8 text-center bg-white/80 backdrop-blur-sm rounded-xl border border-cerrado-green1/10">
                      <div className="flex flex-col items-center mb-6">
                        <Avatar className="h-20 w-20 mb-4 border-2 border-cerrado-green1 shadow-md">
                          <AvatarImage src="/images/kelldrin.jpg" alt="KellDrin Química" className="object-contain p-1" />
                          <AvatarFallback>KD</AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-semibold text-cerrado-dark text-lg">Paulo Santos</h4>
                          <p className="text-sm text-gray-600">Diretor Técnico, KellDrin Química</p>
                        </div>
                      </div>
                      <div className="mb-6 text-center">
                        {[1, 2, 3, 4, 5].map(star => <span key={star} className="text-yellow-400 text-xl">★</span>)}
                      </div>
                      <p className="text-gray-700 italic">
                        "A expertise da Cerrado em licenciamento ambiental foi crucial para nossa expansão. 
                        Sua equipe nos guiou por todo o processo com excelência e comprometimento."
                      </p>
                    </CardContent>
                  </Card>
                </div>
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
  );
};
