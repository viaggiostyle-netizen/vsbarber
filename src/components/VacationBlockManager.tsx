import { useState } from 'react';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useVacationBlocks, useCreateVacationBlock, useDeleteVacationBlock } from '@/hooks/useVacationBlocks';
import { toast } from 'sonner';
import { CalendarOff, Plus, Trash2 } from 'lucide-react';
import { DateRange } from 'react-day-picker';

export function VacationBlockManager() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [motivo, setMotivo] = useState('');
  
  const { data: vacationBlocks = [], isLoading } = useVacationBlocks();
  const createBlock = useCreateVacationBlock();
  const deleteBlock = useDeleteVacationBlock();

  const handleCreateBlock = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast.error('Selecciona un rango de fechas');
      return;
    }

    try {
      await createBlock.mutateAsync({
        fecha_inicio: format(dateRange.from, 'yyyy-MM-dd'),
        fecha_fin: format(dateRange.to, 'yyyy-MM-dd'),
        motivo: motivo || 'Vacaciones/Ausencia',
      });
      toast.success('Días bloqueados correctamente');
      setDateRange(undefined);
      setMotivo('');
    } catch (error) {
      toast.error('Error al bloquear días');
    }
  };

  const handleDeleteBlock = async (id: string) => {
    try {
      await deleteBlock.mutateAsync(id);
      toast.success('Bloqueo eliminado');
    } catch (error) {
      toast.error('Error al eliminar bloqueo');
    }
  };

  const today = startOfDay(new Date());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarOff className="w-5 h-5" />
          Bloquear Días (Vacaciones/Ausencias)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Calendar for range selection */}
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

          {/* Form and list */}
          <div className="flex-1 space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Rango seleccionado</Label>
                <p className="text-sm text-muted-foreground">
                  {dateRange?.from && dateRange?.to ? (
                    <>
                      <span className="font-medium text-foreground capitalize">
                        {format(dateRange.from, "d 'de' MMMM", { locale: es })}
                      </span>
                      {' → '}
                      <span className="font-medium text-foreground capitalize">
                        {format(dateRange.to, "d 'de' MMMM, yyyy", { locale: es })}
                      </span>
                    </>
                  ) : (
                    'Selecciona fecha inicio y fin'
                  )}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="motivo">Motivo (opcional)</Label>
                <Input
                  id="motivo"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ej: Vacaciones, Evento personal..."
                  className="bg-card"
                />
              </div>

              <Button
                onClick={handleCreateBlock}
                disabled={!dateRange?.from || !dateRange?.to || createBlock.isPending}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                {createBlock.isPending ? 'Bloqueando...' : 'Bloquear días'}
              </Button>
            </div>

            {/* List of existing blocks */}
            <div className="space-y-2 pt-4 border-t">
              <Label>Días bloqueados</Label>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Cargando...</p>
              ) : vacationBlocks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay días bloqueados</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {vacationBlocks.map((block) => (
                    <div
                      key={block.id}
                      className="flex items-center justify-between bg-destructive/10 border border-destructive/20 rounded-lg p-3"
                    >
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium capitalize">
                          {format(parseISO(block.fecha_inicio), "d MMM", { locale: es })} 
                          {' → '}
                          {format(parseISO(block.fecha_fin), "d MMM yyyy", { locale: es })}
                        </p>
                        {block.motivo && (
                          <p className="text-xs text-muted-foreground">{block.motivo}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteBlock(block.id)}
                        disabled={deleteBlock.isPending}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
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
      </CardContent>
    </Card>
  );
}
