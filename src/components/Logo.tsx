import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/config/firebase';

interface LogoProps {
  variant?: 'default' | 'dark';
  showText?: boolean;
}

const Logo = ({ variant = 'default', showText }: LogoProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
    });

    return () => unsubscribe();
  }, []);

  const logoSrc = '/logo.png';

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <a href="#" onClick={handleClick} className="flex items-center cursor-pointer max-w-full">
      <img 
        src={logoSrc} 
        alt="Titanium Logo" 
        className="h-8 md:h-12 w-auto max-h-full object-contain block" 
        style={{ backgroundRepeat: 'no-repeat', backgroundSize: 'contain' }}
      />
    </a>
  );
};

export default Logo;
