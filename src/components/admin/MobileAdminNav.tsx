import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  LayoutGrid, 
  DollarSign, 
  Users, 
  Clock, 
  Shield, 
  Settings,
  Menu,
  X,
  Sun,
  Moon,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import vsLogo from '@/assets/vs-logo-new.jpg';

interface MobileAdminNavProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onSignOut: () => void;
}

const menuItems = [
  { id: 'reservas', label: 'Reservas', icon: LayoutGrid },
  { id: 'ingresos', label: 'Ingresos', icon: DollarSign },
  { id: 'clientes', label: 'Clientes', icon: Users },
  { id: 'horarios', label: 'Horarios', icon: Clock },
  { id: 'admins', label: 'Admins', icon: Shield },
  { id: 'organizacion', label: 'Organización', icon: Settings },
];

export function MobileAdminNav({ activeSection, onSectionChange, onSignOut }: MobileAdminNavProps) {
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const handleSectionChange = (section: string) => {
    onSectionChange(section);
    setOpen(false);
  };

  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border flex items-center justify-between px-4 z-50">
      <Link to="/" className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full overflow-hidden">
          <img src={vsLogo} alt="ViaggioStyle" className="w-full h-full object-cover" />
        </div>
        <span className="font-bold">ViaggioStyle</span>
      </Link>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-72 p-0">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden">
                  <img src={vsLogo} alt="ViaggioStyle" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h1 className="font-bold text-lg">ViaggioStyle</h1>
                  <p className="text-xs text-muted-foreground">Panel de Control</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSectionChange(item.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                      isActive 
                        ? 'bg-primary text-primary-foreground' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* Footer Actions */}
            <div className="p-4 border-t border-border space-y-1">
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-5 h-5" />
                    Modo Claro
                  </>
                ) : (
                  <>
                    <Moon className="w-5 h-5" />
                    Modo Oscuro
                  </>
                )}
              </button>
              
              <button
                onClick={onSignOut}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
              >
                <LogOut className="w-5 h-5" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
