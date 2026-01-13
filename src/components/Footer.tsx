import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone, ArrowUp, Leaf, Award, Users, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2397BF41' fill-opacity='0.3'%3E%3Ccircle cx='20' cy='20' r='1'/%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
      </div>

      {/* Main Footer Content */}
      <div className="container mx-auto px-4 pt-16 pb-8 relative z-10">
        {/* Top Section with Company Info and Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-12">
          {/* Company Info */}
          <div className="lg:col-span-1">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-cerrado-green3 rounded-full flex items-center justify-center mr-4">
                <Leaf className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white">Cerrado Engenharia</h3>
            </div>
            
            <p className="text-gray-300 mb-6 leading-relaxed">
              <strong className="text-cerrado-green3">21 anos</strong> de experiência e inovação em projetos e soluções ambientais sustentáveis. 
              Referência em licenciamento ambiental e preservação do meio ambiente.
            </p>
            
            {/* Social Media */}
            <div className="flex space-x-4">
              <a href="#" className="group bg-white/10 hover:bg-cerrado-green3 p-3 rounded-full transition-all duration-300 hover:scale-110" aria-label="Facebook">
                <Facebook size={20} className="group-hover:text-white" />
              </a>
              <a href="#" className="group bg-white/10 hover:bg-cerrado-green3 p-3 rounded-full transition-all duration-300 hover:scale-110" aria-label="Instagram">
                <Instagram size={20} className="group-hover:text-white" />
              </a>
              <a href="#" className="group bg-white/10 hover:bg-cerrado-green3 p-3 rounded-full transition-all duration-300 hover:scale-110" aria-label="LinkedIn">
                <Linkedin size={20} className="group-hover:text-white" />
              </a>
              <a href="mailto:carloscerradogo@gmail.com" className="group bg-white/10 hover:bg-cerrado-green3 p-3 rounded-full transition-all duration-300 hover:scale-110" aria-label="Email">
                <Mail size={20} className="group-hover:text-white" />
              </a>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="lg:col-span-2">
            <h4 className="text-xl font-bold text-white mb-6">Nossa Experiência</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center hover:bg-white/15 transition-all duration-300 hover:scale-105">
                <Clock className="w-8 h-8 text-cerrado-green3 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">21+</div>
                <div className="text-gray-400 text-sm">Anos</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center hover:bg-white/15 transition-all duration-300 hover:scale-105">
                <Award className="w-8 h-8 text-cerrado-green3 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">500+</div>
                <div className="text-gray-400 text-sm">Projetos</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center hover:bg-white/15 transition-all duration-300 hover:scale-105">
                <Users className="w-8 h-8 text-cerrado-green3 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">100+</div>
                <div className="text-gray-400 text-sm">Clientes</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center hover:bg-white/15 transition-all duration-300 hover:scale-105">
                <Leaf className="w-8 h-8 text-cerrado-green3 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">100%</div>
                <div className="text-gray-400 text-sm">Sustentável</div>
              </div>
            </div>
          </div>
        </div>

        {/* Links Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Navigation */}
          <div>
            <h4 className="text-xl font-bold text-cerrado-green3 mb-4">Navegação</h4>
            <ul className="space-y-3">
              {[
                { name: 'Home', href: '#' },
                { name: 'Quem Somos', href: '#sobre' },
                { name: 'Serviços', href: '#servicos' },
                { name: 'Projetos', href: '#diferenciais' },
                { name: 'Contato', href: '#contato' }
              ].map((link) => (
                <li key={link.name}>
                  <a href={link.href} className="text-gray-300 hover:text-cerrado-green3 transition-colors duration-300 hover:translate-x-1 inline-block">
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-xl font-bold text-cerrado-green3 mb-4">Serviços</h4>
            <ul className="space-y-3">
              {[
                'Licenciamento Ambiental',
                'Usinas Hidrelétricas',
                'Linhas de Transmissão',
                'Monitoramento de Fauna',
                'Estudos de Ictiofauna'
              ].map((service) => (
                <li key={service}>
                  <a href="#servicos" className="text-gray-300 hover:text-cerrado-green3 transition-colors duration-300 hover:translate-x-1 inline-block text-sm">
                    {service}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div className="md:col-span-2">
            <h4 className="text-xl font-bold text-cerrado-green3 mb-4">Informações de Contato</h4>
            <div className="space-y-4">
              <div className="flex items-start group">
                <Phone className="w-5 h-5 text-cerrado-green3 mr-3 mt-1 group-hover:scale-110 transition-transform duration-300" />
                <div>
                  <div className="text-white font-semibold">(61) 99864-5245</div>
                  <div className="text-gray-400 text-sm">Segunda a Sexta, 8h às 18h</div>
                </div>
              </div>
              
              <div className="flex items-start group">
                <Mail className="w-5 h-5 text-cerrado-green3 mr-3 mt-1 group-hover:scale-110 transition-transform duration-300" />
                <div>
                  <div className="text-white font-semibold">carloscerradogo@gmail.com</div>
                  <div className="text-gray-400 text-sm">Resposta em até 24h</div>
                </div>
              </div>
              
              <div className="flex items-start group">
                <MapPin className="w-5 h-5 text-cerrado-green3 mr-3 mt-1 group-hover:scale-110 transition-transform duration-300" />
                <div>
                  <div className="text-white font-semibold">Goiânia - GO</div>
                  <div className="text-gray-400 text-sm">
                    Avenida D, 419 - Qd G11, Lt 01, 4º Andar<br />
                    St. Marista - CEP: 74150-040
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Newsletter Section */}
        <div className="bg-gradient-to-r from-cerrado-green3/20 to-cerrado-green2/20 rounded-2xl p-8 mb-12 backdrop-blur-sm border border-white/10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <h4 className="text-2xl font-bold text-white mb-2">Fique por dentro das novidades</h4>
              <p className="text-gray-300">Receba atualizações sobre legislação ambiental e nossos projetos.</p>
            </div>
            <div>
              <Button 
                className="w-full bg-cerrado-green3 hover:bg-cerrado-green2 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg"
                onClick={() => document.getElementById('contato')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Entre em Contato
                <Mail className="ml-2" size={20} />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Bottom Section */}
        <div className="border-t border-white/20 pt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <p className="text-gray-400">
              &copy; {currentYear} <span className="text-cerrado-green3 font-semibold">Cerrado Engenharia</span>. Todos os direitos reservados.
            </p>
          </div>
          
          <div className="flex items-center space-x-6">
            <a href="#" className="text-gray-400 hover:text-cerrado-green3 transition-colors duration-300 text-sm">
              Termos de Uso
            </a>
            <a href="#" className="text-gray-400 hover:text-cerrado-green3 transition-colors duration-300 text-sm">
              Política de Privacidade
            </a>
            
            {/* Back to Top Button */}
            <Button
              onClick={scrollToTop}
              className="bg-cerrado-green3 hover:bg-cerrado-green2 p-3 rounded-full transition-all duration-300 hover:scale-110 shadow-lg"
              size="sm"
            >
              <ArrowUp size={16} />
            </Button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;