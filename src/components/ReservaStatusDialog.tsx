import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useUpdateReservaStatus, EstadoCita, ESTADO_LABELS } from '@/hooks/useReservaStatus';
import { toast } from 'sonner';
import { Settings2, CheckCircle, AlertCircle, XCircle, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReservaStatusDialogProps {
  reservaId: string;
  currentStatus: EstadoCita;
  onStatusChange?: () => void;
}

const STATUS_OPTIONS: { value: EstadoCita; label: string; icon: React.ReactNode; description: string; color: string }[] = [
  {
    value: 'completada',
    label: 'Completada',
    icon: <CheckCircle className="w-5 h-5" />,
    description: 'El cliente asistió y se realizó el servicio',
    color: 'text-green-400 hover:bg-green-500/20 border-green-500/50',
  },
  {
    value: 'ausente_con_aviso',
    label: 'Ausente con aviso',
    icon: <AlertCircle className="w-5 h-5" />,
    description: 'El cliente avisó que no podía asistir',
    color: 'text-yellow-400 hover:bg-yellow-500/20 border-yellow-500/50',
  },
  {
    value: 'no_show',
    label: 'No vino (No-show)',
    icon: <XCircle className="w-5 h-5" />,
    description: 'El cliente no se presentó sin avisar',
    color: 'text-destructive hover:bg-destructive/20 border-destructive/50',
  },
  {
    value: 'cancelada',
    label: 'Cancelar cita',
    icon: <Ban className="w-5 h-5" />,
    description: 'Eliminar la cita y liberar el horario',
    color: 'text-muted-foreground hover:bg-muted border-muted-foreground/50',
  },
];

export function ReservaStatusDialog({ reservaId, currentStatus, onStatusChange }: ReservaStatusDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<EstadoCita | null>(null);
  const updateStatus = useUpdateReservaStatus();

  const handleConfirm = async () => {
    if (!selectedStatus) return;

    try {
      await updateStatus.mutateAsync({ id: reservaId, estado: selectedStatus });
      
      if (selectedStatus === 'cancelada') {
        toast.success('Cita cancelada y horario liberado');
      } else {
        toast.success(`Estado actualizado a: ${ESTADO_LABELS[selectedStatus]}`);
      }
      
      setOpen(false);
      setSelectedStatus(null);
      onStatusChange?.();
    } catch (error) {
      toast.error('Error al actualizar el estado');
    }
  };

  // Don't show dialog for already processed appointments
  if (currentStatus !== 'pendiente') {
    return (
      <span className={cn(
        "text-xs px-2 py-1 rounded-full",
        currentStatus === 'completada' && "bg-green-500/20 text-green-400",
        currentStatus === 'ausente_con_aviso' && "bg-yellow-500/20 text-yellow-400",
        currentStatus === 'no_show' && "bg-destructive/20 text-destructive",
      )}>
        {ESTADO_LABELS[currentStatus]}
      </span>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="border-primary/50 text-primary hover:bg-primary/10"
        >
          <Settings2 className="w-4 h-4 mr-2" />
          Gestionar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gestionar Estado de Cita</DialogTitle>
          <DialogDescription>
            Selecciona el resultado de esta cita
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedStatus(option.value)}
              className={cn(
                "w-full flex items-start gap-3 p-3 rounded-lg border transition-all text-left",
                selectedStatus === option.value 
                  ? `${option.color} border-2` 
                  : "border-border hover:border-muted-foreground/30"
              )}
            >
              <div className={cn(
                "mt-0.5",
                selectedStatus === option.value ? option.color.split(' ')[0] : "text-muted-foreground"
              )}>
                {option.icon}
              </div>
              <div>
                <p className="font-medium">{option.label}</p>
                <p className="text-sm text-muted-foreground">{option.description}</p>
              </div>
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!selectedStatus || updateStatus.isPending}
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
