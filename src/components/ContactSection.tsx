import { useState, useEffect, useRef } from 'react';
import { Phone, Mail, MapPin, ArrowRight, Clock, CheckCircle, Star, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { redirectToWhatsApp, WHATSAPP_MESSAGES } from '@/utils/whatsappUtils';

const ContactSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Mensagem enviada com sucesso! Em breve entraremos em contato.');
    setFormData({
      name: '',
      email: '',
      phone: '',
      subject: '',
      message: ''
    });
  };

  const handleWhatsApp = () => {
    redirectToWhatsApp(WHATSAPP_MESSAGES.GENERAL);
  };

  return (
    <section 
      id="contato" 
      className="py-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
      </div>

      <div 
        ref={sectionRef}
        className={`container mx-auto px-4 sm:px-6 lg:px-8 animate-on-scroll ${isVisible ? 'visible' : ''} relative z-10`}
      >
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
            Vamos Conversar sobre seu <span className="text-cerrado-green3">Projeto</span>
          </h2>
          <p className="text-lg text-white/80 max-w-3xl mx-auto leading-relaxed">
            Nossa equipe de especialistas está pronta para encontrar a melhor solução ambiental para sua empresa. 
            Entre em contato e descubra como podemos ajudar.
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 max-w-7xl mx-auto">
          
          {/* Contact Information */}
          <div className="lg:col-span-1 space-y-8">
            {/* Contact Methods */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                <MessageCircle className="w-6 h-6 text-cerrado-green3 mr-3" />
                Formas de Contato
              </h3>
              
              <div className="space-y-6">
                <div className="group hover:bg-white/5 p-4 rounded-xl transition-all duration-300">
                  <div className="flex items-start">
                    <div className="bg-cerrado-green3 p-3 rounded-full mr-4 group-hover:scale-110 transition-transform duration-300">
                      <Phone className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-lg mb-1">Telefone</h4>
                      <p className="text-cerrado-green3 font-semibold text-lg">(61) 99864-5245</p>
                      <p className="text-gray-400 text-sm">Segunda a Sexta, 8h às 18h</p>
                    </div>
                  </div>
                </div>
                
                <div className="group hover:bg-white/5 p-4 rounded-xl transition-all duration-300">
                  <div className="flex items-start">
                    <div className="bg-cerrado-green3 p-3 rounded-full mr-4 group-hover:scale-110 transition-transform duration-300">
                      <Mail className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-lg mb-1">E-mail</h4>
                      <p className="text-cerrado-green3 font-semibold">carloscerradogo@gmail.com</p>
                      <p className="text-gray-400 text-sm">Resposta em até 24h</p>
                    </div>
                  </div>
                </div>
                
                <div className="group hover:bg-white/5 p-4 rounded-xl transition-all duration-300">
                  <div className="flex items-start">
                    <div className="bg-cerrado-green3 p-3 rounded-full mr-4 group-hover:scale-110 transition-transform duration-300">
                      <MapPin className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-lg mb-1">Endereço</h4>
                      <p className="text-gray-300">
                        Avenida D, 419 - Qd G11, Lt 01, 4º Andar<br />
                        St. Marista, Goiânia - GO<br />
                        <span className="text-cerrado-green3">CEP: 74150-040</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-gradient-to-r from-cerrado-green3/20 to-cerrado-green2/20 rounded-2xl p-6 backdrop-blur-sm border border-white/10">
              <h4 className="text-xl font-bold text-white mb-4 flex items-center">
                <Star className="w-5 h-5 text-cerrado-green3 mr-2" />
                Por que nos escolher?
              </h4>
              <div className="space-y-3">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-cerrado-green3 mr-3 flex-shrink-0" />
                  <span className="text-white/90 text-sm">21+ anos de experiência</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-cerrado-green3 mr-3 flex-shrink-0" />
                  <span className="text-white/90 text-sm">500+ projetos realizados</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-cerrado-green3 mr-3 flex-shrink-0" />
                  <span className="text-white/90 text-sm">Equipe especializada</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-cerrado-green3 mr-3 flex-shrink-0" />
                  <span className="text-white/90 text-sm">Soluções sustentáveis</span>
                </div>
              </div>
            </div>


          </div>
          
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-2xl">
              <h3 className="text-2xl font-bold text-white mb-2">Envie sua mensagem</h3>
              <p className="text-gray-300 mb-8">Preencha o formulário abaixo e nossa equipe entrará em contato em breve.</p>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-white font-semibold">Nome Completo</Label>
                    <Input 
                      id="name" 
                      name="name" 
                      value={formData.name} 
                      onChange={handleChange} 
                      placeholder="Seu nome completo" 
                      required 
                      className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-cerrado-green3 focus:ring-cerrado-green3 py-3"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white font-semibold">E-mail</Label>
                    <Input 
                      id="email" 
                      name="email" 
                      type="email" 
                      value={formData.email} 
                      onChange={handleChange} 
                      placeholder="seu.email@exemplo.com" 
                      required 
                      className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-cerrado-green3 focus:ring-cerrado-green3 py-3"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-white font-semibold">Telefone</Label>
                    <Input 
                      id="phone" 
                      name="phone" 
                      value={formData.phone} 
                      onChange={handleChange} 
                      placeholder="(00) 00000-0000" 
                      className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-cerrado-green3 focus:ring-cerrado-green3 py-3"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="subject" className="text-white font-semibold">Assunto</Label>
                    <Input 
                      id="subject" 
                      name="subject" 
                      value={formData.subject} 
                      onChange={handleChange} 
                      placeholder="Assunto da mensagem" 
                      required 
                      className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-cerrado-green3 focus:ring-cerrado-green3 py-3"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="message" className="text-white font-semibold">Mensagem</Label>
                  <Textarea 
                    id="message" 
                    name="message" 
                    value={formData.message} 
                    onChange={handleChange} 
                    placeholder="Conte-nos sobre seu projeto ou necessidade. Quanto mais detalhes, melhor poderemos ajudá-lo..." 
                    rows={6} 
                    required 
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-cerrado-green3 focus:ring-cerrado-green3 resize-none"
                  />
                </div>
                
                <div className="flex items-center space-x-4 pt-4">
                  <Button 
                    type="submit" 
                    className="flex-1 bg-cerrado-green3 hover:bg-cerrado-green2 text-white font-bold py-4 text-lg rounded-xl shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-cerrado-green3/25"
                  >
                    Enviar Mensagem
                    <ArrowRight className="ml-2" size={20} />
                  </Button>
                </div>
              </form>

              {/* Response Time */}
              <div className="mt-6 p-4 bg-cerrado-green3/20 rounded-xl border border-cerrado-green3/30">
                <div className="flex items-center">
                  <Clock className="w-5 h-5 text-cerrado-green3 mr-3" />
                  <div>
                    <p className="text-white font-semibold text-sm">Tempo de Resposta</p>
                    <p className="text-gray-300 text-sm">Retornamos em até 24 horas em dias úteis</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="bg-gradient-to-r from-cerrado-green3/20 to-cerrado-green2/20 rounded-2xl p-8 backdrop-blur-sm border border-white/10 max-w-4xl mx-auto">
            <h4 className="text-2xl font-bold text-white mb-4">
              Pronto para começar seu projeto ambiental?
            </h4>
            <p className="text-white/80 mb-6 text-lg">
              Nossa equipe está preparada para desenvolver a melhor solução para sua empresa.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={handleWhatsApp}
                className="bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-3 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg"
              >
                WhatsApp Direto
                <MessageCircle className="ml-2" size={18} />
              </Button>
              <Button 
                onClick={() => document.getElementById('servicos')?.scrollIntoView({ behavior: 'smooth' })}
                variant="outline"
                className="border-2 border-white/60 text-white hover:bg-white hover:text-slate-900 font-bold px-8 py-3 rounded-xl transition-all duration-300 hover:scale-105"
              >
                Ver Nossos Serviços
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;