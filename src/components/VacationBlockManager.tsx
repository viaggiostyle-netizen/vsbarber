import { useState } from 'react';
import { format, isBefore, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useVacationBlocks, useCreateVacationBlock, useDeleteVacationBlock } from '@/hooks/useVacationBlocks';
import { getMinDate } from '@/lib/constants';
import { toast } from 'sonner';
import { CalendarOff, Plus, Trash2 } from 'lucide-react';
import { DateRange } from 'react-day-picker';

export function VacationBlockManager() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [motivo, setMotivo] = useState('');
  const [blockToDelete, setBlockToDelete] = useState<{ id: string; fechas: string } | null>(null);
  
  const { data: vacationBlocks = [], isLoading } = useVacationBlocks();
  const createBlock = useCreateVacationBlock();
  const deleteBlock = useDeleteVacationBlock();

  const handleCreateBlock = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast.error('Seleccioná un rango de fechas');
      return;
    }

    try {
      await createBlock.mutateAsync({
        fecha_inicio: format(dateRange.from, 'yyyy-MM-dd'),
        fecha_fin: format(dateRange.to, 'yyyy-MM-dd'),
        motivo: motivo || 'Vacaciones',
      });
      toast.success('Bloqueo de fechas creado');
      setDateRange(undefined);
      setMotivo('');
    } catch (error) {
      toast.error('Error al crear el bloqueo');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!blockToDelete) return;
    
    try {
      await deleteBlock.mutateAsync(blockToDelete.id);
      toast.success('Bloqueo eliminado');
    } catch (error) {
      toast.error('Error al eliminar el bloqueo');
    } finally {
      setBlockToDelete(null);
    }
  };

  const formatDateRange = (inicio: string, fin: string) => {
    const startDate = new Date(inicio + 'T12:00:00');
    const endDate = new Date(fin + 'T12:00:00');
    return `${format(startDate, "d 'de' MMM", { locale: es })} - ${format(endDate, "d 'de' MMM yyyy", { locale: es })}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarOff className="w-5 h-5" />
          Bloqueo de Días (Vacaciones)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Calendar for selecting range */}
          <div className="flex justify-center">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={setDateRange}
              disabled={(date) => isBefore(date, getMinDate())}
              locale={es}
              numberOfMonths={1}
              className="rounded-md border pointer-events-auto"
            />
          </div>

          {/* Form and list */}
          <div className="flex-1 space-y-4">
            {/* Create form */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="motivo">Motivo (opcional)</Label>
                <Input
                  id="motivo"
                  placeholder="Ej: Vacaciones de verano"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                />
              </div>
              
              {dateRange?.from && dateRange?.to && (
                <p className="text-sm text-muted-foreground">
                  Rango seleccionado: {formatDateRange(
                    format(dateRange.from, 'yyyy-MM-dd'),
                    format(dateRange.to, 'yyyy-MM-dd')
                  )}
                </p>
              )}

              <Button
                onClick={handleCreateBlock}
                disabled={!dateRange?.from || !dateRange?.to || createBlock.isPending}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Bloquear Fechas
              </Button>
            </div>

            {/* Existing blocks */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Bloqueos activos</h4>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Cargando...</p>
              ) : vacationBlocks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay bloqueos activos</p>
              ) : (
                <div className="space-y-2">
                  {vacationBlocks.map((block) => (
                    <div
                      key={block.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {formatDateRange(block.fecha_inicio, block.fecha_fin)}
                        </p>
                        {block.motivo && (
                          <p className="text-xs text-muted-foreground">{block.motivo}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setBlockToDelete({
                          id: block.id,
                          fechas: formatDateRange(block.fecha_inicio, block.fecha_fin),
                        })}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Delete confirmation */}
        <AlertDialog open={!!blockToDelete} onOpenChange={(open) => !open && setBlockToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar bloqueo</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Estás seguro que querés eliminar el bloqueo del {blockToDelete?.fechas}?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Volver</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

