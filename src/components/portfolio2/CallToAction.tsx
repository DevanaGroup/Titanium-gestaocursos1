
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const CallToAction = () => {
  return (
    <section className="py-24 bg-gradient-to-r from-cerrado-green3 to-cerrado-green1 text-white">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-8">Pronto para transformar seu projeto em realidade?</h2>
          <p className="text-xl mb-10 opacity-90">
            Nossa equipe está preparada para ajudar sua empresa a superar desafios ambientais 
            com soluções personalizadas e inovadoras.
          </p>
          <Button size="lg" className="bg-white text-cerrado-dark hover:bg-cerrado-cream px-8 py-6 text-lg shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 rounded-full">
            Solicitar uma proposta
            <ArrowRight size={20} className="ml-2" />
          </Button>
        </div>
      </div>
    </section>
  );
};
