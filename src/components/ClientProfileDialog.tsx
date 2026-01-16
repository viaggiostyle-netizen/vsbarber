import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Cliente, useClienteReservas, useUpdateCliente } from '@/hooks/useClientes';
import { formatPrice } from '@/lib/constants';
import { toast } from 'sonner';
import { 
  User, 
  History, 
  MessageCircle, 
  AlertTriangle, 
  Ban,
  Check,
  Clock,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClientProfileDialogProps {
  cliente: Cliente;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ESTADO_STYLES: Record<string, { icon: React.ReactNode; color: string }> = {
  pendiente: { icon: <Clock className="w-3 h-3" />, color: 'text-muted-foreground' },
  completada: { icon: <Check className="w-3 h-3" />, color: 'text-green-400' },
  ausente_con_aviso: { icon: <Clock className="w-3 h-3" />, color: 'text-yellow-400' },
  no_show: { icon: <AlertTriangle className="w-3 h-3" />, color: 'text-orange-400' },
  cancelada: { icon: <X className="w-3 h-3" />, color: 'text-destructive' },
};

export function ClientProfileDialog({ cliente, open, onOpenChange }: ClientProfileDialogProps) {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    nombre: cliente.nombre,
    telefono: cliente.telefono,
    email: cliente.email,
    notas: cliente.notas || '',
    bloqueado: cliente.bloqueado,
    motivo_bloqueo: cliente.motivo_bloqueo || '',
  });

  const { data: reservas = [], isLoading: loadingReservas } = useClienteReservas(
    cliente.email,
    cliente.telefono
  );
  const updateCliente = useUpdateCliente();

  const generateWhatsAppLink = (telefono: string) => {
    const cleanPhone = telefono.replace(/[\s\-\+]/g, '');
    return `https://wa.me/${cleanPhone}`;
  };

  const handleSave = async () => {
    try {
      await updateCliente.mutateAsync({
        id: cliente.id,
        nombre: formData.nombre,
        telefono: formData.telefono,
        email: formData.email,
        notas: formData.notas || null,
        bloqueado: formData.bloqueado,
        motivo_bloqueo: formData.bloqueado ? formData.motivo_bloqueo || null : null,
      });
      toast.success('Cliente actualizado correctamente');
      setEditMode(false);
    } catch (error) {
      toast.error('Error al actualizar el cliente');
    }
  };

  const handleBlockToggle = async (blocked: boolean) => {
    setFormData(prev => ({ ...prev, bloqueado: blocked }));
    if (!editMode) {
      try {
        await updateCliente.mutateAsync({
          id: cliente.id,
          bloqueado: blocked,
          motivo_bloqueo: blocked ? 'Bloqueado manualmente' : null,
        });
        toast.success(blocked ? 'Cliente bloqueado' : 'Cliente desbloqueado');
      } catch (error) {
        toast.error('Error al actualizar el cliente');
        setFormData(prev => ({ ...prev, bloqueado: !blocked }));
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Perfil de Cliente
            {cliente.citas_no_show >= 2 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="w-3 h-3" />
                Alerta
              </Badge>
            )}
            {cliente.bloqueado && (
              <Badge variant="outline" className="gap-1 border-orange-500/50 text-orange-400">
                <Ban className="w-3 h-3" />
                Bloqueado
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info" className="gap-2">
              <User className="w-4 h-4" />
              Información
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="w-4 h-4" />
              Historial
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            {/* Stats Summary */}
            <div className="grid grid-cols-4 gap-2 text-center text-sm">
              <div className="p-2 rounded-lg bg-muted">
                <p className="text-2xl font-bold">{cliente.total_citas}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="p-2 rounded-lg bg-green-500/10">
                <p className="text-2xl font-bold text-green-400">{cliente.citas_completadas}</p>
                <p className="text-xs text-muted-foreground">Completadas</p>
              </div>
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <p className="text-2xl font-bold text-yellow-400">{cliente.citas_ausente_aviso}</p>
                <p className="text-xs text-muted-foreground">Avisó</p>
              </div>
              <div className="p-2 rounded-lg bg-orange-500/10">
                <p className={cn('text-2xl font-bold', cliente.citas_no_show >= 2 ? 'text-destructive' : 'text-orange-400')}>
                  {cliente.citas_no_show}
                </p>
                <p className="text-xs text-muted-foreground">No-shows</p>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                  disabled={!editMode}
                  className="bg-card"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <div className="flex gap-2">
                  <Input
                    id="telefono"
                    value={formData.telefono}
                    onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
                    disabled={!editMode}
                    className="bg-card flex-1"
                  />
                  <a
                    href={generateWhatsAppLink(cliente.telefono)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-3 rounded-md bg-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/30 transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </a>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  disabled={!editMode}
                  className="bg-card"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notas">Notas</Label>
                <Textarea
                  id="notas"
                  value={formData.notas}
                  onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))}
                  disabled={!editMode}
                  placeholder="Notas sobre el cliente..."
                  className="bg-card min-h-[80px]"
                />
              </div>
            </div>

            {/* Block Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2">
                <Ban className="w-4 h-4 text-orange-400" />
                <div>
                  <p className="font-medium text-sm">Bloquear cliente</p>
                  <p className="text-xs text-muted-foreground">
                    No podrá reservar nuevas citas
                  </p>
                </div>
              </div>
              <Switch
                checked={formData.bloqueado}
                onCheckedChange={handleBlockToggle}
              />
            </div>

            {formData.bloqueado && editMode && (
              <div className="space-y-2">
                <Label htmlFor="motivo_bloqueo">Motivo del bloqueo</Label>
                <Input
                  id="motivo_bloqueo"
                  value={formData.motivo_bloqueo}
                  onChange={(e) => setFormData(prev => ({ ...prev, motivo_bloqueo: e.target.value }))}
                  placeholder="Motivo del bloqueo..."
                  className="bg-card"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {editMode ? (
                <>
                  <Button
                    onClick={handleSave}
                    disabled={updateCliente.isPending}
                    className="flex-1"
                  >
                    Guardar cambios
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditMode(false);
                      setFormData({
                        nombre: cliente.nombre,
                        telefono: cliente.telefono,
                        email: cliente.email,
                        notas: cliente.notas || '',
                        bloqueado: cliente.bloqueado,
                        motivo_bloqueo: cliente.motivo_bloqueo || '',
                      });
                    }}
                  >
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setEditMode(true)}
                  className="flex-1"
                >
                  Editar datos
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            {loadingReservas ? (
              <p className="text-center text-muted-foreground py-8">Cargando historial...</p>
            ) : reservas.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No hay citas registradas
              </p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {reservas.map((reserva) => {
                  const estadoStyle = ESTADO_STYLES[reserva.estado] || ESTADO_STYLES.pendiente;
                  
                  return (
                    <Card key={reserva.id}>
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{reserva.servicio}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(parseISO(reserva.fecha), "EEE d MMM yyyy", { locale: es })} - {reserva.hora.substring(0, 5)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatPrice(reserva.precio)}</p>
                            <p className={cn('text-sm flex items-center gap-1 justify-end', estadoStyle.color)}>
                              {estadoStyle.icon}
                              <span className="capitalize">{reserva.estado.replace('_', ' ')}</span>
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
