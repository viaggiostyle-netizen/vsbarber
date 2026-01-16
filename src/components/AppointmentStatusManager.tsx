import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Clock, X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppointmentStatusManagerProps {
  reserva: {
    id: string;
    nombre: string;
    servicio: string;
    fecha: string;
    hora: string;
    precio: number;
    estado: string;
  };
  onClose?: () => void;
}

type EstadoCita = 'completada' | 'ausente_con_aviso' | 'no_show' | 'cancelada';

const STATUS_OPTIONS: { value: EstadoCita; label: string; icon: React.ReactNode; color: string }[] = [
  { 
    value: 'completada', 
    label: 'Completada', 
    icon: <Check className="w-5 h-5" />,
    color: 'bg-green-500/20 border-green-500/50 text-green-400 hover:bg-green-500/30'
  },
  { 
    value: 'ausente_con_aviso', 
    label: 'Ausente con aviso', 
    icon: <Clock className="w-5 h-5" />,
    color: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/30'
  },
  { 
    value: 'no_show', 
    label: 'No vino (No-show)', 
    icon: <AlertTriangle className="w-5 h-5" />,
    color: 'bg-orange-500/20 border-orange-500/50 text-orange-400 hover:bg-orange-500/30'
  },
  { 
    value: 'cancelada', 
    label: 'Cancelar', 
    icon: <X className="w-5 h-5" />,
    color: 'bg-destructive/20 border-destructive/50 text-destructive hover:bg-destructive/30'
  },
];

export function AppointmentStatusManager({ reserva, onClose }: AppointmentStatusManagerProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: async (estado: EstadoCita) => {
      const { error } = await supabase
        .from('reservas')
        .update({ estado })
        .eq('id', reserva.id);
      
      if (error) throw error;
    },
    onSuccess: (_, estado) => {
      queryClient.invalidateQueries({ queryKey: ['reservas'] });
      queryClient.invalidateQueries({ queryKey: ['today-stats'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-stats'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['reservas-availability'] });
      
      const statusLabel = STATUS_OPTIONS.find(s => s.value === estado)?.label || estado;
      toast.success(`Cita marcada como "${statusLabel}"`);
      setOpen(false);
      onClose?.();
    },
    onError: () => {
      toast.error('Error al actualizar el estado de la cita');
    },
  });

  const handleStatusChange = (estado: EstadoCita) => {
    if (estado === 'cancelada') {
      if (!confirm('¿Estás seguro de que deseas cancelar esta cita? El horario quedará disponible nuevamente.')) {
        return;
      }
    }
    updateStatus.mutate(estado);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="border-primary/50 text-primary hover:bg-primary/10"
      >
        Gestionar
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gestionar Cita</DialogTitle>
            <DialogDescription>
              {reserva.nombre} - {reserva.servicio}
              <br />
              {reserva.hora.substring(0, 5)}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 py-4">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleStatusChange(option.value)}
                disabled={updateStatus.isPending || reserva.estado === option.value}
                className={cn(
                  'flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  option.color,
                  reserva.estado === option.value && 'ring-2 ring-offset-2 ring-offset-background'
                )}
              >
                {option.icon}
                <span className="text-sm font-medium text-center">{option.label}</span>
              </button>
            ))}
          </div>

          {reserva.estado !== 'pendiente' && (
            <p className="text-xs text-muted-foreground text-center">
              Estado actual: <span className="font-medium capitalize">{reserva.estado.replace('_', ' ')}</span>
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
