import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useClientes } from '@/hooks/useClientes';
import { Users, Check, UserMinus, UserX, Ban } from 'lucide-react';

export function ClientesManager() {
  const { data: clientes = [], isLoading, isError } = useClientes();

  const sortedClientes = useMemo(() => {
    return [...clientes].sort((a, b) => b.citas_completadas - a.citas_completadas);
  }, [clientes]);

  const stats = useMemo(() => {
    return {
      total: clientes.length,
      activos: clientes.filter(c => c.citas_completadas > 0).length,
      recurrentes: clientes.filter(c => c.citas_completadas > 1).length,
    };
  }, [clientes]);

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
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5" />
        <h2 className="text-lg font-semibold">Clientes</h2>
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
            No hay clientes registrados
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedClientes.map((cliente) => (
                    <TableRow key={cliente.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{cliente.nombre}</div>
                          <div className="text-xs text-muted-foreground">{cliente.telefono}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {cliente.citas_completadas > 0 && (
                          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            {cliente.citas_completadas}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {cliente.citas_ausente_aviso > 0 && (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                            {cliente.citas_ausente_aviso}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {cliente.citas_no_show > 0 && (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                            {cliente.citas_no_show}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {cliente.citas_canceladas > 0 && (
                          <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                            {cliente.citas_canceladas}
                          </Badge>
                        )}
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
    </div>
  );
}
