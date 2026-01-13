import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ThemeToggleProps {
  variant?: 'default' | 'header' | 'dashboard';
  size?: 'sm' | 'md' | 'lg';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  variant = 'default', 
  size = 'md' 
}) => {
  const { theme, toggleTheme } = useTheme();
  
  const getButtonStyles = () => {
    switch (variant) {
      case 'header':
        return 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-none hover:shadow-none backdrop-blur-sm';
      case 'dashboard':
        return 'bg-transparent hover:bg-cerrado-green1/10 text-cerrado-green1 shadow-none hover:shadow-none';
      default:
        return 'bg-transparent hover:bg-accent/50 text-foreground shadow-none hover:shadow-none';
    }
  };

  const getSize = () => {
    switch (size) {
      case 'sm':
        return 'h-8 w-8';
      case 'lg':
        return 'h-12 w-12';
      default:
        return 'h-10 w-10';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'h-3.5 w-3.5';
      case 'lg':
        return 'h-5 w-5';
      default:
        return 'h-4 w-4';
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className={`${getButtonStyles()} ${getSize()} border-0 !border-0 outline-none !outline-none ring-0 !ring-0 focus:ring-0 !focus:ring-0 focus-visible:ring-0 !focus-visible:ring-0 shadow-none hover:shadow-none transition-all duration-300 ease-in-out hover:scale-105 active:scale-95`}
          >
            {theme === 'light' ? (
              <Moon 
                className={`${getIconSize()} transition-all duration-300 ease-in-out transform ${
                  theme === 'light' ? 'rotate-0 scale-100' : 'rotate-180 scale-0'
                }`} 
              />
            ) : (
              <Sun 
                className={`${getIconSize()} transition-all duration-300 ease-in-out transform ${
                  theme === 'dark' ? 'rotate-0 scale-100' : 'rotate-180 scale-0'
                }`} 
              />
            )}
            <span className="sr-only">Alternar tema</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-popover text-popover-foreground border border-border">
          <p className="text-sm font-medium">
            {theme === 'light' ? 'Ativar tema escuro' : 'Ativar tema claro'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}; 