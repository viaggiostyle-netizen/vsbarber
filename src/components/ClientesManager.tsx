import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useClientes, useDeleteCliente, useUpdateClienteNotas } from '@/hooks/useClientes';
import { Users, Check, UserMinus, UserX, Ban, Trash2, Search, Pencil } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export function ClientesManager() {
  const { data: clientes = [], isLoading, isError } = useClientes();
  const deleteCliente = useDeleteCliente();
  const updateNotas = useUpdateClienteNotas();
  
  const [clienteToDelete, setClienteToDelete] = useState<{ id: string; nombre: string } | null>(null);
  const [editingNotas, setEditingNotas] = useState<{ id: string; nombre: string; notas: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredClientes = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return clientes;
    
    return clientes.filter(c => 
      c.nombre.toLowerCase().includes(query) || 
      c.telefono.includes(query)
    );
  }, [clientes, searchQuery]);

  const sortedClientes = useMemo(() => {
    return [...filteredClientes].sort((a, b) => b.citas_completadas - a.citas_completadas);
  }, [filteredClientes]);

  const stats = useMemo(() => {
    return {
      total: clientes.length,
      activos: clientes.filter(c => c.citas_completadas > 0).length,
      recurrentes: clientes.filter(c => c.citas_completadas > 1).length,
    };
  }, [clientes]);

  const handleDeleteConfirm = async () => {
    if (!clienteToDelete) return;
    
    try {
      await deleteCliente.mutateAsync(clienteToDelete.id);
      toast({
        title: "Cliente eliminado",
        description: `${clienteToDelete.nombre} fue eliminado correctamente.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el cliente.",
        variant: "destructive",
      });
    } finally {
      setClienteToDelete(null);
    }
  };

  const handleSaveNotas = async () => {
    if (!editingNotas) return;
    
    try {
      await updateNotas.mutateAsync({ 
        clienteId: editingNotas.id, 
        notas: editingNotas.notas 
      });
      toast({
        title: "Notas guardadas",
        description: `Las notas de ${editingNotas.nombre} fueron actualizadas.`,
      });
      setEditingNotas(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron guardar las notas.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Cargando clientes...
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-destructive">
          Error al cargar clientes
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          <h2 className="text-lg font-semibold">Clientes</h2>
        </div>
      </div>

      {/* Search Filter */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o teléfono..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="py-3 text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <div className="text-2xl font-bold">{stats.activos}</div>
            <div className="text-xs text-muted-foreground">Atendidos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <div className="text-2xl font-bold">{stats.recurrentes}</div>
            <div className="text-xs text-muted-foreground">Recurrentes</div>
          </CardContent>
        </Card>
      </div>

      {sortedClientes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {searchQuery ? 'No se encontraron clientes' : 'No hay clientes registrados'}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-center">
                      <Check className="w-4 h-4 inline" />
                    </TableHead>
                    <TableHead className="text-center">
                      <UserMinus className="w-4 h-4 inline" />
                    </TableHead>
                    <TableHead className="text-center">
                      <UserX className="w-4 h-4 inline" />
                    </TableHead>
                    <TableHead className="text-center">
                      <Ban className="w-4 h-4 inline" />
                    </TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedClientes.map((cliente) => (
                    <TableRow key={cliente.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{cliente.nombre}</div>
                          <div className="text-xs text-muted-foreground">{cliente.telefono}</div>
                          {cliente.notas && (
                            <div className="text-xs text-muted-foreground italic truncate max-w-[150px]">
                              {cliente.notas}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {cliente.citas_completadas > 0 && (
                          <Badge variant="outline" className="border-primary/50 text-primary">
                            {cliente.citas_completadas}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {cliente.citas_ausente_aviso > 0 && (
                          <Badge variant="secondary">
                            {cliente.citas_ausente_aviso}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {cliente.citas_no_show > 0 && (
                          <Badge variant="secondary" className="bg-muted text-muted-foreground">
                            {cliente.citas_no_show}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {cliente.citas_canceladas > 0 && (
                          <Badge variant="destructive">
                            {cliente.citas_canceladas}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setEditingNotas({
                              id: cliente.id,
                              nombre: cliente.nombre,
                              notas: cliente.notas || '',
                            })}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setClienteToDelete({ id: cliente.id, nombre: cliente.nombre })}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Check className="w-3 h-3" /> Completadas
        </span>
        <span className="flex items-center gap-1">
          <UserMinus className="w-3 h-3" /> Avisó
        </span>
        <span className="flex items-center gap-1">
          <UserX className="w-3 h-3" /> No avisó
        </span>
        <span className="flex items-center gap-1">
          <Ban className="w-3 h-3" /> Canceladas
        </span>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!clienteToDelete} onOpenChange={(open) => !open && setClienteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar cliente</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro que querés eliminar a {clienteToDelete?.nombre}? Esta acción no se puede deshacer.
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

      {/* Edit Notes Dialog */}
      <Dialog open={!!editingNotas} onOpenChange={(open) => !open && setEditingNotas(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notas de {editingNotas?.nombre}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Agregar notas sobre el cliente..."
              value={editingNotas?.notas || ''}
              onChange={(e) => setEditingNotas(prev => prev ? { ...prev, notas: e.target.value } : null)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingNotas(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveNotas} disabled={updateNotas.isPending}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
