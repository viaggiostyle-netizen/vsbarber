import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutGrid, 
  DollarSign, 
  Users, 
  Clock, 
  Shield, 
  Settings,
  Sun,
  Moon,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import vsLogo from '@/assets/vs-logo-new.jpg';

interface AdminSidebarProps {
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

export function AdminSidebar({ activeSection, onSectionChange, onSignOut }: AdminSidebarProps) {
  const { theme, setTheme } = useTheme();
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border flex flex-col z-50">
      {/* Logo & Title */}
      <div className="p-6 border-b border-border">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden">
            <img src={vsLogo} alt="ViaggioStyle" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="font-bold text-lg">ViaggioStyle</h1>
            <p className="text-xs text-muted-foreground">Panel de Control</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
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
    </aside>
  );
}
