
import { Check } from 'lucide-react';

export const ChooseUsSection = () => {
  return (
    <section className="py-24 bg-[#F1F0FB]">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-cerrado-green3 mb-6">
            POR QUE ESCOLHER A CERRADO ENGENHARIA?
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Uma história construída com excelência e resultados consistentes
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-8 md:gap-16 items-stretch">
          <div className="md:w-1/2 relative p-8 bg-white/70 rounded-2xl backdrop-blur-sm border border-cerrado-green1/20 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
            <div className="absolute -top-6 -left-6 bg-cerrado-green3 text-white w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold shadow-md">
              1
            </div>
            <h3 className="text-2xl font-bold text-cerrado-green3 mb-6">História de Sucesso</h3>
            <ul className="space-y-6">
              <li className="flex items-start">
                <Check className="text-cerrado-green3 mr-3 h-6 w-6 mt-1 flex-shrink-0" />
                <p className="text-gray-700">Ao longo de 15 anos, consolidamos projetos em licenciamento ambiental para centenas de clientes em todo o país.</p>
              </li>
              <li className="flex items-start">
                <Check className="text-cerrado-green3 mr-3 h-6 w-6 mt-1 flex-shrink-0" />
                <p className="text-gray-700">Atuamos em diferentes segmentos, desde loteamentos residenciais, grandes indústrias químicas e alimentícias até o varejo e serviços.</p>
              </li>
              <li className="flex items-start">
                <Check className="text-cerrado-green3 mr-3 h-6 w-6 mt-1 flex-shrink-0" />
                <p className="text-gray-700">Nosso time especializado traz a combinação ideal de experiência técnica e inovação.</p>
              </li>
            </ul>
          </div>
          
          <div className="md:w-1/2 relative p-8 bg-white/70 rounded-2xl backdrop-blur-sm border border-cerrado-green1/20 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
            <div className="absolute -top-6 -left-6 bg-cerrado-green3 text-white w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold shadow-md">
              2
            </div>
            <h3 className="text-2xl font-bold text-cerrado-green3 mb-6">Soluções Completas</h3>
            <ul className="space-y-6">
              <li className="flex items-start">
                <Check className="text-cerrado-green3 mr-3 h-6 w-6 mt-1 flex-shrink-0" />
                <p className="text-gray-700">Desenvolvemos e implantamos sistemas de tratamento físico-químico e biológico, ajustados à realidade de cada cliente.</p>
              </li>
              <li className="flex items-start">
                <Check className="text-cerrado-green3 mr-3 h-6 w-6 mt-1 flex-shrink-0" />
                <p className="text-gray-700">Acompanhamos todo o processo, desde a concepção do projeto até o start-up e o monitoramento dos resultados.</p>
              </li>
              <li className="flex items-start">
                <Check className="text-cerrado-green3 mr-3 h-6 w-6 mt-1 flex-shrink-0" />
                <p className="text-gray-700">Focamos em sustentabilidade e eficiência, garantindo compliance com a legislação e redução de custos operacionais.</p>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};
