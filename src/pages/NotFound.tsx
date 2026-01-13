
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-md">
        <h1 className="text-7xl font-bold text-cerrado-green1 mb-4">404</h1>
        <p className="text-2xl text-cerrado-dark mb-6">Oops! Página não encontrada</p>
        <p className="text-gray-600 mb-8">
          A página que você está procurando pode ter sido removida, renomeada ou está temporariamente indisponível.
        </p>
        <Link to="/">
          <Button className="bg-cerrado-green2 hover:bg-cerrado-green1 text-white">
            <Home className="mr-2 h-4 w-4" /> Voltar para a Home
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
