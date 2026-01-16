import { useState } from 'react';
import { format, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Palmtree, Trash2, Plus } from 'lucide-react';
import { DateRange } from 'react-day-picker';

interface VacationBlock {
  id: string;
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string | null;
  created_at: string;
}

export function VacationBlockManager() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [motivo, setMotivo] = useState('');
  const queryClient = useQueryClient();

  const { data: vacations = [], isLoading } = useQuery({
    queryKey: ['vacation-blocks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vacation_blocks')
        .select('*')
        .order('fecha_inicio', { ascending: true });
      
      if (error) throw error;
      return data as VacationBlock[];
    },
  });

  const createVacation = useMutation({
    mutationFn: async ({ fecha_inicio, fecha_fin, motivo }: { fecha_inicio: string; fecha_fin: string; motivo?: string }) => {
      const { error } = await supabase
        .from('vacation_blocks')
        .insert({ fecha_inicio, fecha_fin, motivo });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacation-blocks'] });
      queryClient.invalidateQueries({ queryKey: ['blocked-hours'] });
      setDateRange(undefined);
      setMotivo('');
      toast.success('Vacaciones bloqueadas correctamente');
    },
    onError: () => {
      toast.error('Error al bloquear las vacaciones');
    },
  });

  const deleteVacation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vacation_blocks')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacation-blocks'] });
      queryClient.invalidateQueries({ queryKey: ['blocked-hours'] });
      toast.success('Bloqueo de vacaciones eliminado');
    },
    onError: () => {
      toast.error('Error al eliminar el bloqueo');
    },
  });

  const handleCreateVacation = () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast.error('Selecciona un rango de fechas');
      return;
    }

    createVacation.mutate({
      fecha_inicio: format(dateRange.from, 'yyyy-MM-dd'),
      fecha_fin: format(dateRange.to, 'yyyy-MM-dd'),
      motivo: motivo || undefined,
    });
  };

  const today = startOfDay(new Date());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palmtree className="w-5 h-5" />
          Bloqueo de Vacaciones
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Create new vacation block */}
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex justify-center">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                disabled={(date) => isBefore(date, today)}
                locale={es}
                className="rounded-md border pointer-events-auto"
                numberOfMonths={1}
              />
            </div>

            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="motivo">Motivo (opcional)</Label>
                <Input
                  id="motivo"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ej: Vacaciones de verano"
                  className="bg-card"
                />
              </div>

              {dateRange?.from && dateRange?.to && (
                <div className="p-3 rounded-lg bg-muted text-sm">
                  <p className="font-medium">Rango seleccionado:</p>
                  <p className="text-muted-foreground">
                    {format(dateRange.from, "d 'de' MMMM", { locale: es })} - {format(dateRange.to, "d 'de' MMMM, yyyy", { locale: es })}
                  </p>
                </div>
              )}

              <Button
                onClick={handleCreateVacation}
                disabled={!dateRange?.from || !dateRange?.to || createVacation.isPending}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Bloquear período
              </Button>
            </div>
          </div>
        </div>

        {/* Existing vacation blocks */}
        <div className="space-y-3">
          <h3 className="font-medium text-sm text-muted-foreground">Períodos bloqueados</h3>
          
          {isLoading ? (
            <p className="text-muted-foreground text-center py-4">Cargando...</p>
          ) : vacations.length === 0 ? (
            <p className="text-muted-foreground text-center py-4 text-sm">
              No hay períodos de vacaciones bloqueados
            </p>
          ) : (
            <div className="space-y-2">
              {vacations.map((vacation) => (
                <div
                  key={vacation.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                >
                  <div>
                    <p className="font-medium text-sm">
                      {format(new Date(vacation.fecha_inicio), "d MMM", { locale: es })} - {format(new Date(vacation.fecha_fin), "d MMM yyyy", { locale: es })}
                    </p>
                    {vacation.motivo && (
                      <p className="text-xs text-muted-foreground">{vacation.motivo}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteVacation.mutate(vacation.id)}
                    disabled={deleteVacation.isPending}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
