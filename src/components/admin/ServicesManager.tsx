import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { useServices, useCreateService, useUpdateService, useDeleteService, type Service } from '@/hooks/useServices';
import { formatPrice } from '@/lib/constants';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Scissors } from 'lucide-react';

export function ServicesManager() {
  const { data: services = [], isLoading } = useServices();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingService, setDeletingService] = useState<Service | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    duration: 40,
    active: true,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: 0,
      duration: 40,
      active: true,
    });
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreating(true);
  };

  const handleOpenEdit = (service: Service) => {
    setFormData({
      name: service.name,
      description: service.description,
      price: service.price,
      duration: service.duration || 40,
      active: service.active ?? true,
    });
    setEditingService(service);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }
    if (formData.price <= 0) {
      toast.error('El precio debe ser mayor a 0');
      return;
    }

    try {
      if (editingService) {
        await updateService.mutateAsync({
          ...editingService,
          ...formData,
        });
        toast.success('Servicio actualizado');
        setEditingService(null);
      } else {
        await createService.mutateAsync(formData);
        toast.success('Servicio creado');
        setIsCreating(false);
      }
      resetForm();
    } catch (error) {
      toast.error('Error al guardar el servicio');
    }
  };

  const handleDelete = async () => {
    if (!deletingService) return;
    try {
      await deleteService.mutateAsync(deletingService.id);
      toast.success('Servicio eliminado');
    } catch (error) {
      toast.error('Error al eliminar el servicio');
    } finally {
      setDeletingService(null);
    }
  };

  const handleToggleActive = async (service: Service) => {
    try {
      await updateService.mutateAsync({
        ...service,
        active: !service.active,
      });
      toast.success(service.active ? 'Servicio desactivado' : 'Servicio activado');
    } catch (error) {
      toast.error('Error al actualizar el servicio');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Scissors className="w-5 h-5" />
          Gestión de Servicios
        </CardTitle>
        <Button onClick={handleOpenCreate} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Servicio
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-center py-8">Cargando servicios...</p>
        ) : services.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No hay servicios configurados</p>
        ) : (
          <div className="space-y-3">
            {services.map((service) => (
              <div
                key={service.id}
                className="flex items-center justify-between p-4 rounded-xl border bg-muted/30"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{service.name}</span>
                    <span className="text-sm px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {formatPrice(service.price)}
                    </span>
                    {!service.active && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        Inactivo
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{service.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Duración: {service.duration || 40} min
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={service.active ?? true}
                    onCheckedChange={() => handleToggleActive(service)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenEdit(service)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeletingService(service)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog 
          open={isCreating || !!editingService} 
          onOpenChange={(open) => {
            if (!open) {
              setIsCreating(false);
              setEditingService(null);
              resetForm();
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingService ? 'Editar Servicio' : 'Nuevo Servicio'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del servicio</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Corte clásico"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe el servicio..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Precio (ARS)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: Number(e.target.value) }))}
                    min={0}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duración (min)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration: Number(e.target.value) }))}
                    min={10}
                    step={5}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="active">Servicio activo</Label>
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsCreating(false);
                  setEditingService(null);
                  resetForm();
                }}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSave}
                disabled={createService.isPending || updateService.isPending}
              >
                {editingService ? 'Guardar Cambios' : 'Crear Servicio'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deletingService} onOpenChange={(open) => !open && setDeletingService(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar servicio?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará el servicio "{deletingService?.name}". 
                Las citas existentes con este servicio no se verán afectadas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
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
