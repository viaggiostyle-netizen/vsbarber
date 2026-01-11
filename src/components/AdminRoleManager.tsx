import { useMemo, useState } from 'react';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
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
import { Trash2, UserPlus } from 'lucide-react';

const emailSchema = z
  .string()
  .email('Ingresá un email válido')
  .max(255, 'El email es demasiado largo');

type AdminUser = {
  user_id: string;
  email: string;
};

async function listAdmins(): Promise<AdminUser[]> {
  const { data, error } = await supabase.functions.invoke('manage-admin-roles', {
    body: { action: 'list' },
  });

  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || 'No se pudo cargar la lista');
  return data.admins ?? [];
}

async function addAdmin(email: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('manage-admin-roles', {
    body: { action: 'add', email },
  });

  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || 'No se pudo agregar el admin');
}

async function removeAdmin(user_id: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('manage-admin-roles', {
    body: { action: 'remove', user_id },
  });

  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || 'No se pudo eliminar el admin');
}

export function AdminRoleManager() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');

  const adminsQuery = useQuery({
    queryKey: ['admin-roles'],
    queryFn: listAdmins,
  });

  const sortedAdmins = useMemo(() => {
    const list = adminsQuery.data ?? [];
    return [...list].sort((a, b) => a.email.localeCompare(b.email));
  }, [adminsQuery.data]);

  const addMutation = useMutation({
    mutationFn: addAdmin,
    onSuccess: async () => {
      toast.success('Admin agregado');
      setEmail('');
      await queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
    },
    onError: (err: any) => {
      toast.error(err?.message ?? 'Error al agregar admin');
    },
  });

  const removeMutation = useMutation({
    mutationFn: removeAdmin,
    onSuccess: async () => {
      toast.success('Admin eliminado');
      await queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
    },
    onError: (err: any) => {
      toast.error(err?.message ?? 'Error al eliminar admin');
    },
  });

  const handleAdd = () => {
    const parsed = emailSchema.safeParse(email.trim().toLowerCase());
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Email inválido');
      return;
    }
    addMutation.mutate(parsed.data);
  };

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Admins con acceso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nuevoadmin@gmail.com"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
            />
            <Button onClick={handleAdd} disabled={addMutation.isPending || adminsQuery.isLoading}>
              <UserPlus className="w-4 h-4 mr-2" />
              Agregar nuevo admin
            </Button>
          </div>

          {adminsQuery.isLoading ? (
            <p className="text-muted-foreground py-6 text-center">Cargando admins…</p>
          ) : adminsQuery.isError ? (
            <p className="text-destructive py-6 text-center">
              No se pudo cargar la lista. Intentá nuevamente.
            </p>
          ) : sortedAdmins.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center">
              No hay admins registrados.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead className="w-[120px] text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedAdmins.map((a) => (
                    <TableRow key={a.user_id}>
                      <TableCell className="font-medium">{a.email}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={removeMutation.isPending}
                          onClick={() => {
                            if (confirm(`¿Eliminar permisos de admin para ${a.email}?`)) {
                              removeMutation.mutate(a.user_id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Eliminar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Nota: los cambios se aplican en tiempo real y controlan el acceso a /control.
      </p>
    </section>
  );
}
