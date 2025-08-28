
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Logo from "@/components/Logo";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md px-4">
        <Logo size="md" />
        <h1 className="text-4xl font-bold text-on-dark mt-8 mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-6">
          Oops! A página que você está procurando não foi encontrada.
        </p>
        <Link to="/">
          <Button className="on-button py-6 text-lg">
            Voltar para a Página Inicial
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
