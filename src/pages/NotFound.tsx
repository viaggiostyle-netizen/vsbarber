import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import vsLogo from '@/assets/vs-logo.jpg';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center px-4">
      <div className="text-center space-y-8 max-w-md">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-zinc-800 shadow-2xl">
            <img src={vsLogo} alt="ViaggioStyle" className="w-full h-full object-cover opacity-50" />
          </div>
        </div>

        {/* Error code with glitch effect */}
        <div className="relative">
          <h1 className="text-8xl font-bold text-white tracking-tighter">
            4<span className="text-zinc-600">0</span>4
          </h1>
          <div className="absolute inset-0 flex items-center justify-center opacity-20">
            <h1 className="text-8xl font-bold text-zinc-500 tracking-tighter blur-sm">
              404
            </h1>
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <p className="text-xl text-white font-medium">Página no encontrada</p>
          <p className="text-zinc-500">
            Lo sentimos, la página que buscas no existe o no tienes permisos para acceder.
          </p>
        </div>

        {/* Decorative line */}
        <div className="flex items-center justify-center gap-4">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-zinc-700" />
          <div className="w-2 h-2 rounded-full bg-zinc-700" />
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-zinc-700" />
        </div>

        {/* Action */}
        <Button 
          asChild 
          className="bg-white text-black hover:bg-zinc-200 rounded-full px-8 py-6 text-base font-medium transition-all duration-300 hover:scale-105"
        >
          <Link to="/">
            Volver al inicio
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
