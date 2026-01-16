import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Cliente, useClienteReservas, useUpdateCliente, useToggleBloqueoCliente } from '@/hooks/useClientes';
import { ESTADO_LABELS, EstadoCita } from '@/hooks/useReservaStatus';
import { formatPrice } from '@/lib/constants';
import { toast } from 'sonner';
import { User, History, Edit, Ban, CheckCircle, MessageCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClienteDetailDialogProps {
  cliente: Cliente | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClienteDetailDialog({ cliente, open, onOpenChange }: ClienteDetailDialogProps) {
  const [editMode, setEditMode] = useState(false);
  const [editedNombre, setEditedNombre] = useState('');
  const [editedNotas, setEditedNotas] = useState('');
  const [motivoBloqueo, setMotivoBloqueo] = useState('');

  const { data: reservas = [], isLoading: loadingReservas } = useClienteReservas(
    cliente?.email ?? null,
    cliente?.telefono ?? null
  );
  const updateCliente = useUpdateCliente();
  const toggleBloqueo = useToggleBloqueoCliente();

  const handleEdit = () => {
    if (cliente) {
      setEditedNombre(cliente.nombre);
      setEditedNotas(cliente.notas || '');
      setEditMode(true);
    }
  };

  const handleSave = async () => {
    if (!cliente) return;

    try {
      await updateCliente.mutateAsync({
        id: cliente.id,
        nombre: editedNombre,
        notas: editedNotas || null,
      });
      toast.success('Cliente actualizado');
      setEditMode(false);
    } catch (error) {
      toast.error('Error al actualizar cliente');
    }
  };

  const handleToggleBloqueo = async () => {
    if (!cliente) return;

    const newBloqueado = !cliente.bloqueado;
    
    if (newBloqueado && !motivoBloqueo.trim()) {
      toast.error('Ingresa un motivo para bloquear');
      return;
    }

    try {
      await toggleBloqueo.mutateAsync({
        id: cliente.id,
        bloqueado: newBloqueado,
        motivo_bloqueo: motivoBloqueo,
      });
      toast.success(newBloqueado ? 'Cliente bloqueado' : 'Cliente desbloqueado');
      setMotivoBloqueo('');
    } catch (error) {
      toast.error('Error al cambiar estado de bloqueo');
    }
  };

  const generateWhatsAppLink = (telefono: string) => {
    const cleanPhone = telefono.replace(/[\s\-\+]/g, '');
    return `https://wa.me/${cleanPhone}`;
  };

  const getEstadoStyle = (estado: string) => {
    switch (estado as EstadoCita) {
      case 'completada':
        return 'bg-green-500/20 text-green-400';
      case 'ausente_con_aviso':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'no_show':
        return 'bg-destructive/20 text-destructive';
      case 'pendiente':
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (!cliente) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {cliente.nombre}
            {cliente.citas_no_show > 2 && (
              <AlertTriangle className="w-5 h-5 text-destructive" />
            )}
            {cliente.bloqueado && (
              <Badge variant="destructive">Bloqueado</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            <a
              href={generateWhatsAppLink(cliente.telefono)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[#25D366] hover:underline"
            >
              <MessageCircle className="w-4 h-4" />
              {cliente.telefono}
            </a>
            <span className="mx-2">•</span>
            {cliente.email}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">Información</TabsTrigger>
            <TabsTrigger value="historial">Historial</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center p-3 rounded-lg bg-muted">
                <p className="text-2xl font-bold">{cliente.total_citas}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-green-500/10">
                <p className="text-2xl font-bold text-green-400">{cliente.citas_completadas}</p>
                <p className="text-xs text-muted-foreground">Completadas</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-yellow-500/10">
                <p className="text-2xl font-bold text-yellow-400">{cliente.citas_ausente_aviso}</p>
                <p className="text-xs text-muted-foreground">Con aviso</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-destructive/10">
                <p className="text-2xl font-bold text-destructive">{cliente.citas_no_show}</p>
                <p className="text-xs text-muted-foreground">No-show</p>
              </div>
            </div>

            {/* Edit form */}
            {editMode ? (
              <div className="space-y-4 p-4 rounded-lg border">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input
                    id="nombre"
                    value={editedNombre}
                    onChange={(e) => setEditedNombre(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notas">Notas</Label>
                  <Textarea
                    id="notas"
                    value={editedNotas}
                    onChange={(e) => setEditedNotas(e.target.value)}
                    placeholder="Agregar notas sobre el cliente..."
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={updateCliente.isPending}>
                    Guardar
                  </Button>
                  <Button variant="outline" onClick={() => setEditMode(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {cliente.notas && (
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-sm font-medium mb-1">Notas:</p>
                    <p className="text-sm text-muted-foreground">{cliente.notas}</p>
                  </div>
                )}

                {cliente.bloqueado && cliente.motivo_bloqueo && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                    <p className="text-sm font-medium text-destructive mb-1">Motivo de bloqueo:</p>
                    <p className="text-sm text-muted-foreground">{cliente.motivo_bloqueo}</p>
                  </div>
                )}
              </div>
            )}

            {/* Block section */}
            {!editMode && (
              <div className="space-y-3 p-4 rounded-lg border">
                <p className="text-sm font-medium">
                  {cliente.bloqueado ? 'Desbloquear cliente' : 'Bloquear cliente'}
                </p>
                
                {!cliente.bloqueado && (
                  <Input
                    placeholder="Motivo del bloqueo..."
                    value={motivoBloqueo}
                    onChange={(e) => setMotivoBloqueo(e.target.value)}
                  />
                )}
                
                <Button
                  variant={cliente.bloqueado ? "default" : "destructive"}
                  onClick={handleToggleBloqueo}
                  disabled={toggleBloqueo.isPending}
                  className="w-full"
                >
                  {cliente.bloqueado ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Desbloquear
                    </>
                  ) : (
                    <>
                      <Ban className="w-4 h-4 mr-2" />
                      Bloquear cliente
                    </>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="historial" className="mt-4">
            {loadingReservas ? (
              <p className="text-muted-foreground text-center py-8">Cargando historial...</p>
            ) : reservas.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Sin historial de citas</p>
            ) : (
              <div className="rounded-md border overflow-hidden max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Servicio</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reservas.map((reserva: any) => (
                      <TableRow key={reserva.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium capitalize">
                              {format(parseISO(reserva.fecha), "EEE d MMM", { locale: es })}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {reserva.hora.substring(0, 5)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{reserva.servicio}</TableCell>
                        <TableCell>{formatPrice(reserva.precio)}</TableCell>
                        <TableCell>
                          <Badge className={cn("text-xs", getEstadoStyle(reserva.estado))}>
                            {ESTADO_LABELS[reserva.estado as EstadoCita] || 'Pendiente'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          {!editMode && (
            <Button variant="outline" onClick={handleEdit}>
              <Edit className="w-4 h-4 mr-2" />
              Editar datos
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
