import { Link } from "react-router-dom";
import { Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
            <Scissors className="w-12 h-12 text-muted-foreground" />
          </div>
        </div>

        {/* Error code */}
        <div>
          <h1 className="text-7xl font-bold text-foreground">404</h1>
          <p className="text-xl text-muted-foreground mt-2">Página no encontrada</p>
        </div>

        {/* Message */}
        <p className="text-muted-foreground">
          Lo sentimos, la página que buscas no existe o ha sido movida.
        </p>

        {/* Action */}
        <Button asChild className="mt-4">
          <Link to="/">
            Volver al inicio
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
