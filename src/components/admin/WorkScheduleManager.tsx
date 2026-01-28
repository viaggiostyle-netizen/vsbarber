import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { useWorkSchedule, useUpdateDaySchedule, useResetSchedule, type DaySchedule, type TimeBlock } from '@/hooks/useWorkSchedule';
import { toast } from 'sonner';
import { Clock, Pencil, Plus, Trash2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

export function WorkScheduleManager() {
  const { data: schedule = [], isLoading } = useWorkSchedule();
  const updateDay = useUpdateDaySchedule();
  const resetSchedule = useResetSchedule();

  const [editingDay, setEditingDay] = useState<DaySchedule | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [tempBlocks, setTempBlocks] = useState<TimeBlock[]>([]);

  const handleOpenEdit = (day: DaySchedule) => {
    setTempBlocks([...day.blocks]);
    setEditingDay(day);
  };

  const handleToggleDay = async (day: DaySchedule) => {
    try {
      await updateDay.mutateAsync({
        ...day,
        enabled: !day.enabled,
      });
      toast.success(day.enabled ? `${day.dayName} desactivado` : `${day.dayName} activado`);
    } catch (error) {
      toast.error('Error al actualizar');
    }
  };

  const handleAddBlock = () => {
    setTempBlocks(prev => [...prev, { start: '09:00', end: '13:00' }]);
  };

  const handleRemoveBlock = (index: number) => {
    setTempBlocks(prev => prev.filter((_, i) => i !== index));
  };

  const handleBlockChange = (index: number, field: 'start' | 'end', value: string) => {
    setTempBlocks(prev => prev.map((block, i) => 
      i === index ? { ...block, [field]: value } : block
    ));
  };

  const handleSave = async () => {
    if (!editingDay) return;

    // Validate blocks
    for (const block of tempBlocks) {
      if (block.start >= block.end) {
        toast.error('La hora de inicio debe ser menor a la hora de fin');
        return;
      }
    }

    try {
      await updateDay.mutateAsync({
        ...editingDay,
        blocks: tempBlocks,
      });
      toast.success(`Horario de ${editingDay.dayName} actualizado`);
      setEditingDay(null);
    } catch (error) {
      toast.error('Error al guardar');
    }
  };

  const handleReset = async () => {
    try {
      await resetSchedule.mutateAsync();
      toast.success('Horarios restaurados a valores predeterminados');
    } catch (error) {
      toast.error('Error al restaurar');
    } finally {
      setShowResetConfirm(false);
    }
  };

  const formatBlocks = (blocks: TimeBlock[]) => {
    if (blocks.length === 0) return 'Sin horarios';
    return blocks.map(b => `${b.start} - ${b.end}`).join(' | ');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Horarios de Trabajo
        </CardTitle>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setShowResetConfirm(true)}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Restaurar
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-center py-8">Cargando horarios...</p>
        ) : (
          <div className="space-y-2">
            {schedule.map((day) => (
              <div
                key={day.dayOfWeek}
                className={cn(
                  'flex items-center justify-between p-4 rounded-xl border transition-colors',
                  day.enabled ? 'bg-muted/30' : 'bg-muted/10 opacity-60'
                )}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold w-24">{day.dayName}</span>
                    {day.enabled ? (
                      <span className="text-sm text-muted-foreground">
                        {formatBlocks(day.blocks)}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground italic">
                        Cerrado
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={day.enabled}
                    onCheckedChange={() => handleToggleDay(day)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenEdit(day)}
                    disabled={!day.enabled}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog 
          open={!!editingDay} 
          onOpenChange={(open) => !open && setEditingDay(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Horario - {editingDay?.dayName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Configura los bloques horarios para este día. Puedes agregar pausas (ej: almuerzo) creando bloques separados.
              </p>
              
              {tempBlocks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay bloques horarios configurados
                </p>
              ) : (
                <div className="space-y-3">
                  {tempBlocks.map((block, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Inicio</Label>
                          <Input
                            type="time"
                            value={block.start}
                            onChange={(e) => handleBlockChange(index, 'start', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Fin</Label>
                          <Input
                            type="time"
                            value={block.end}
                            onChange={(e) => handleBlockChange(index, 'end', e.target.value)}
                          />
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive shrink-0"
                        onClick={() => handleRemoveBlock(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={handleAddBlock}
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar Bloque Horario
              </Button>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setEditingDay(null)}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSave}
                disabled={updateDay.isPending}
              >
                Guardar Cambios
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reset Confirmation */}
        <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Restaurar horarios?</AlertDialogTitle>
              <AlertDialogDescription>
                Esto restaurará todos los horarios a los valores predeterminados. 
                Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleReset}>
                Restaurar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
