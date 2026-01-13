import React from 'react';
import { Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const Navbar = () => {
  return (
    <nav className="fixed w-full z-50 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 backdrop-blur-md shadow-2xl border-b border-white/10 py-3">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Logo variant="default" showText={true} />
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#sobre" className="font-semibold text-white hover:text-cerrado-green3 transition-colors">
              Quem Somos
            </a>
            <a href="#diferenciais" className="font-semibold text-white hover:text-cerrado-green3 transition-colors">
              Por que Nos Escolher
            </a>
            <a href="#servicos" className="font-semibold text-white hover:text-cerrado-green3 transition-colors">
              Serviços
            </a>
            <Link to="/portfolio2" className="font-semibold text-white hover:text-cerrado-green3 transition-colors">
              Portfólio
            </Link>
            <a href="#contato" className="font-semibold text-white hover:text-cerrado-green3 transition-colors">
              Contato
            </a>
            
            <Link to="/login">
              <Button className="bg-cerrado-green3 hover:bg-transparent text-white hover:text-cerrado-green3 border-2 border-cerrado-green3 font-semibold transition-all duration-300">
                <span>Login</span>
              </Button>
            </Link>
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <button className="focus:outline-none text-white">
                  <Menu size={24} />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="p-0 w-3/4 h-full">
                <div className="flex flex-col h-full bg-background">
                  <div className="flex justify-between items-center p-4 border-b border-border">
                    <Logo variant="dark" showText={false} />
                    <SheetTrigger asChild>
                      <button className="text-foreground focus:outline-none">
                        <X size={24} />
                      </button>
                    </SheetTrigger>
                  </div>
                  
                  <div className="flex flex-col p-4 space-y-4">
                    <a 
                      href="#sobre" 
                      className="py-3 px-4 text-foreground hover:text-cerrado-green2 font-semibold text-lg border-b border-border"
                    >
                      Quem Somos
                    </a>
                    <a 
                      href="#diferenciais" 
                      className="py-3 px-4 text-foreground hover:text-cerrado-green2 font-semibold text-lg border-b border-border"
                    >
                      Por que Nos Escolher
                    </a>
                    <a 
                      href="#servicos" 
                      className="py-3 px-4 text-foreground hover:text-cerrado-green2 font-semibold text-lg border-b border-border"
                    >
                      Serviços
                    </a>
                    <Link 
                      to="/portfolio2"
                      className="py-3 px-4 text-foreground hover:text-cerrado-green2 font-semibold text-lg border-b border-border"
                    >
                      Portfólio
                    </Link>
                    <a 
                      href="#contato" 
                      className="py-3 px-4 text-foreground hover:text-cerrado-green2 font-semibold text-lg border-b border-border"
                    >
                      Contato
                    </a>
                    <Link 
                      to="/login"
                      className="mt-4"
                    >
                      <Button className="w-full bg-cerrado-green3 hover:bg-cerrado-green2 text-white rounded-lg font-semibold">
                        Login
                      </Button>
                    </Link>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
