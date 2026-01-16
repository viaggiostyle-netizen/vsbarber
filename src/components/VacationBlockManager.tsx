import { useState } from 'react';
import { format, parseISO, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useVacationBlocks, useCreateVacationBlock, useDeleteVacationBlock } from '@/hooks/useVacationBlocks';
import { toast } from 'sonner';
import { Palmtree, Trash2, Plus, CalendarRange } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

export function VacationBlockManager() {
  const [open, setOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [motivo, setMotivo] = useState('');
  
  const { data: vacationBlocks = [], isLoading } = useVacationBlocks();
  const createBlock = useCreateVacationBlock();
  const deleteBlock = useDeleteVacationBlock();

  const handleCreate = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast.error('Selecciona un rango de fechas');
      return;
    }

    try {
      await createBlock.mutateAsync({
        fecha_inicio: dateRange.from,
        fecha_fin: dateRange.to,
        motivo: motivo || undefined,
      });
      toast.success('Vacaciones bloqueadas correctamente');
      setOpen(false);
      setDateRange(undefined);
      setMotivo('');
    } catch (error) {
      toast.error('Error al bloquear vacaciones');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este bloqueo de vacaciones?')) return;
    
    try {
      await deleteBlock.mutateAsync(id);
      toast.success('Bloqueo eliminado');
    } catch (error) {
      toast.error('Error al eliminar bloqueo');
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palmtree className="w-5 h-5" />
            Bloqueo de Vacaciones
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Agregar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Bloquear Vacaciones</DialogTitle>
                <DialogDescription>
                  Selecciona el rango de fechas que deseas bloquear
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="flex justify-center">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    disabled={(date) => isBefore(date, today)}
                    locale={es}
                    numberOfMonths={1}
                    className="rounded-md border pointer-events-auto"
                  />
                </div>

                {dateRange?.from && dateRange?.to && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
                    <CalendarRange className="w-4 h-4" />
                    {format(dateRange.from, "d MMM", { locale: es })} - {format(dateRange.to, "d MMM yyyy", { locale: es })}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="motivo">Motivo (opcional)</Label>
                  <Input
                    id="motivo"
                    placeholder="Ej: Vacaciones de verano"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleCreate} 
                  disabled={!dateRange?.from || !dateRange?.to || createBlock.isPending}
                >
                  Bloquear fechas
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-muted-foreground text-center py-4">Cargando...</p>
        ) : vacationBlocks.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No hay vacaciones bloqueadas
          </p>
        ) : (
          <div className="space-y-2">
            {vacationBlocks.map((block) => {
              const isPast = isBefore(parseISO(block.fecha_fin), today);
              
              return (
                <div
                  key={block.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border",
                    isPast ? "opacity-50" : ""
                  )}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-medium">
                      <Palmtree className="w-4 h-4" />
                      {format(parseISO(block.fecha_inicio), "d MMM", { locale: es })} - {format(parseISO(block.fecha_fin), "d MMM yyyy", { locale: es })}
                    </div>
                    {block.motivo && (
                      <p className="text-sm text-muted-foreground">{block.motivo}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(block.id)}
                    disabled={deleteBlock.isPending}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
