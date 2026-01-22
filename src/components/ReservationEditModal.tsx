import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Check, UserX, UserMinus, X } from 'lucide-react';
import type { Reserva } from '@/hooks/useReservas';

type EstadoCita = 'completada' | 'ausente_con_aviso' | 'no_show' | 'cancelada';

interface ReservationEditModalProps {
  reserva: Reserva | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateEstado: (id: string, estado: EstadoCita) => Promise<void>;
  isPending: boolean;
}

export function ReservationEditModal({
  reserva,
  open,
  onOpenChange,
  onUpdateEstado,
  isPending,
}: ReservationEditModalProps) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  if (!reserva) return null;

  const handleAction = async (estado: EstadoCita) => {
    if (estado === 'cancelada') {
      setShowCancelConfirm(true);
      return;
    }
    await onUpdateEstado(reserva.id, estado);
    onOpenChange(false);
  };

  const handleConfirmCancel = async () => {
    await onUpdateEstado(reserva.id, 'cancelada');
    setShowCancelConfirm(false);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Reserva</DialogTitle>
            <DialogDescription>
              {reserva.nombre} - {reserva.servicio}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-4">
            <Button
              variant="outline"
              className="justify-start h-auto py-3 px-4"
              onClick={() => handleAction('completada')}
              disabled={isPending}
            >
              <Check className="w-5 h-5 mr-3 text-green-600" />
              <div className="text-left">
                <div className="font-medium">Corte completado</div>
                <div className="text-xs text-muted-foreground">
                  Registra el ingreso y suma al cliente
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="justify-start h-auto py-3 px-4"
              onClick={() => handleAction('ausente_con_aviso')}
              disabled={isPending}
            >
              <UserMinus className="w-5 h-5 mr-3 text-amber-600" />
              <div className="text-left">
                <div className="font-medium">No vino pero avisó</div>
                <div className="text-xs text-muted-foreground">
                  No registra ingreso, pero queda como aviso
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="justify-start h-auto py-3 px-4"
              onClick={() => handleAction('no_show')}
              disabled={isPending}
            >
              <UserX className="w-5 h-5 mr-3 text-orange-600" />
              <div className="text-left">
                <div className="font-medium">No vino y no avisó</div>
                <div className="text-xs text-muted-foreground">
                  No registra ingreso, queda como ausencia
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="justify-start h-auto py-3 px-4 border-destructive/50 hover:bg-destructive/10"
              onClick={() => handleAction('cancelada')}
              disabled={isPending}
            >
              <X className="w-5 h-5 mr-3 text-destructive" />
              <div className="text-left">
                <div className="font-medium text-destructive">Cancelar</div>
                <div className="text-xs text-muted-foreground">
                  Cancela la cita y libera el horario
                </div>
              </div>
            </Button>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Volver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar corte</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro que querés cancelar el corte?
              <br /><br />
              Si lo cancelás, asegurate de avisarle al cliente el motivo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isPending}
            >
              Cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
