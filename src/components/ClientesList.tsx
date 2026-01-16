import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useClientes, Cliente } from '@/hooks/useClientes';
import { Users, Search, MessageCircle, AlertTriangle, Ban, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ClienteDetailDialog } from './ClienteDetailDialog';

export function ClientesList() {
  const [search, setSearch] = useState('');
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const { data: clientes = [], isLoading } = useClientes();

  const filteredClientes = clientes.filter((c) =>
    c.nombre.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.telefono.includes(search)
  );

  const generateWhatsAppLink = (telefono: string) => {
    const cleanPhone = telefono.replace(/[\s\-\+]/g, '');
    return `https://wa.me/${cleanPhone}`;
  };

  const getReputationStatus = (cliente: Cliente) => {
    if (cliente.bloqueado) return 'blocked';
    if (cliente.citas_no_show > 2) return 'danger';
    if (cliente.citas_no_show > 0) return 'warning';
    return 'good';
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Listado de Clientes
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Cargando clientes...</p>
          ) : filteredClientes.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {search ? 'No se encontraron clientes' : 'Aún no hay clientes registrados'}
            </p>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-center">Asistió</TableHead>
                    <TableHead className="text-center">No vino</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClientes.map((cliente) => {
                    const status = getReputationStatus(cliente);
                    
                    return (
                      <TableRow key={cliente.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{cliente.nombre}</span>
                              {status === 'danger' && (
                                <AlertTriangle className="w-4 h-4 text-destructive" />
                              )}
                              {status === 'blocked' && (
                                <Ban className="w-4 h-4 text-destructive" />
                              )}
                            </div>
                            <a
                              href={generateWhatsAppLink(cliente.telefono)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-[#25D366] hover:underline"
                            >
                              <MessageCircle className="w-3 h-3" />
                              {cliente.telefono}
                            </a>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                            {cliente.citas_completadas}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant="secondary" 
                            className={cn(
                              cliente.citas_no_show > 2 
                                ? "bg-destructive/20 text-destructive" 
                                : cliente.citas_no_show > 0 
                                  ? "bg-yellow-500/20 text-yellow-400" 
                                  : "bg-muted text-muted-foreground"
                            )}
                          >
                            {cliente.citas_no_show}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {cliente.bloqueado ? (
                            <Badge variant="destructive">Bloqueado</Badge>
                          ) : status === 'danger' ? (
                            <Badge variant="outline" className="border-destructive text-destructive">
                              Alto riesgo
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-green-500 text-green-400">
                              Activo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedCliente(cliente)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ClienteDetailDialog
        cliente={selectedCliente}
        open={!!selectedCliente}
        onOpenChange={(open) => !open && setSelectedCliente(null)}
      />
    </>
  );
}
