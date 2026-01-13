
import React from 'react';
import { Button } from '@/components/ui/button';

const SpecialInvitation: React.FC = () => {
  return (
    <section className="bg-cerrado-cream py-20">
      <div className="container mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-cerrado-dark mb-6">
          Precisa de consultoria ambiental especializada?
        </h2>
        <p className="text-cerrado-dark text-lg max-w-3xl mx-auto mb-10">
          Nossa equipe está pronta para oferecer as melhores soluções para seu empreendimento, garantindo conformidade ambiental e desenvolvimento sustentável.
        </p>
        <Button className="bg-cerrado-green2 hover:bg-cerrado-green1 text-white font-semibold px-8 py-6 text-lg">
          Fale com um Especialista
        </Button>
      </div>
    </section>
  );
};

export default SpecialInvitation;
