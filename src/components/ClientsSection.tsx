import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useClientes, Cliente } from '@/hooks/useClientes';
import { ClientProfileDialog } from './ClientProfileDialog';
import { Search, AlertTriangle, Ban, MessageCircle } from 'lucide-react';

export function ClientsSection() {
  const { data: clientes = [], isLoading } = useClientes();
  const [search, setSearch] = useState('');
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);

  const filteredClientes = clientes.filter((cliente) => {
    const searchLower = search.toLowerCase();
    return (
      cliente.nombre.toLowerCase().includes(searchLower) ||
      cliente.telefono.includes(search) ||
      cliente.email.toLowerCase().includes(searchLower)
    );
  });

  const generateWhatsAppLink = (telefono: string) => {
    const cleanPhone = telefono.replace(/[\s\-\+]/g, '');
    return `https://wa.me/${cleanPhone}`;
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

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, teléfono o email..."
          className="pl-10 bg-card"
        />
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>{clientes.length} clientes totales</span>
        <span className="text-destructive">
          {clientes.filter(c => c.citas_no_show >= 2).length} con alertas
        </span>
        <span className="text-orange-400">
          {clientes.filter(c => c.bloqueado).length} bloqueados
        </span>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden sm:table-cell">Contacto</TableHead>
                  <TableHead className="text-center">Completadas</TableHead>
                  <TableHead className="text-center">No-shows</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClientes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      {search ? 'No se encontraron clientes' : 'No hay clientes registrados'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClientes.map((cliente) => (
                    <TableRow 
                      key={cliente.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedCliente(cliente)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{cliente.nombre}</span>
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
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <a
                          href={generateWhatsAppLink(cliente.telefono)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 text-sm text-[#25D366] hover:underline"
                        >
                          <MessageCircle className="w-4 h-4" />
                          {cliente.telefono}
                        </a>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-green-400">{cliente.citas_completadas}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cliente.citas_no_show >= 2 ? 'text-destructive font-bold' : ''}>
                          {cliente.citas_no_show}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {cliente.total_citas}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Client Profile Dialog */}
      {selectedCliente && (
        <ClientProfileDialog
          cliente={selectedCliente}
          open={!!selectedCliente}
          onOpenChange={(open) => !open && setSelectedCliente(null)}
        />
      )}
    </div>
  );
}
