import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
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
import { useAuth } from '@/hooks/useAuth';
import { useReservas, useTodayStats } from '@/hooks/useReservas';
import { useUpdateReservaEstado } from '@/hooks/useUpdateReservaEstado';
import { useDeleteCliente, useClientes } from '@/hooks/useClientes';
import { formatPrice, ADMIN_EMAILS } from '@/lib/constants';
import { toast } from 'sonner';
import { LogOut, Calendar, DollarSign, ArrowLeft, Users, Clock, BarChart3, Shield, MessageCircle, Edit2, UserRound, Trash2 } from 'lucide-react';
import SplashScreen from '@/components/SplashScreen';
import NotFound from '@/pages/NotFound';
import { HourBlockManager } from '@/components/HourBlockManager';
import RevenueStats from '@/components/RevenueStats';
import { AdminRoleManager } from '@/components/AdminRoleManager';
import { ClientesManager } from '@/components/ClientesManager';
import { ReservationEditModal } from '@/components/ReservationEditModal';
import vsLogo from '@/assets/vs-logo.jpg';
import type { Reserva } from '@/hooks/useReservas';
import type { Database } from '@/integrations/supabase/types';

type EstadoCita = Database['public']['Enums']['estado_cita'];

const Control = () => {
  const { user, loading, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const { data: reservas = [], isLoading: loadingReservas } = useReservas();
  const { data: todayStats } = useTodayStats();
  const { data: clientes = [] } = useClientes();
  const updateEstado = useUpdateReservaEstado();
  const deleteCliente = useDeleteCliente();
  const [showSplash, setShowSplash] = useState(true);
  const [editingReserva, setEditingReserva] = useState<Reserva | null>(null);
  const [graceExpired, setGraceExpired] = useState(false);
  const [deletingClienteFromReserva, setDeletingClienteFromReserva] = useState<Reserva | null>(null);

  // Check if user email is in the allowed list
  const isAllowedEmail = !!(user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));

  // Mobile-safe: avoid showing 404 too early while the auth system is still
  // hydrating the session (common on Android browsers / PWAs).
  useEffect(() => {
    setGraceExpired(false);
    const t = window.setTimeout(() => setGraceExpired(true), 10_000);
    return () => window.clearTimeout(t);
  }, []);

  // If after the grace window there's still no session, send the user to /auth
  // (this prevents the confusing "404" on mobile when the session wasn't restored).
  useEffect(() => {
    if (!loading && graceExpired && !user) {
      navigate('/auth', { replace: true });
    }
  }, [loading, graceExpired, user, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleUpdateEstado = async (id: string, estado: EstadoCita) => {
    try {
      await updateEstado.mutateAsync({ id, estado });
      const messages: Record<EstadoCita, string> = {
        completada: 'Corte completado correctamente',
        ausente_con_aviso: 'Registrado: no vino pero avisó',
        no_show: 'Registrado: no vino y no avisó',
        cancelada: 'Cita cancelada correctamente',
        pendiente: 'Estado actualizado',
      };
      toast.success(messages[estado]);
    } catch (error) {
      toast.error('Error al actualizar la cita');
      throw error;
    }
  };

  const getEstadoBadge = (estado: EstadoCita) => {
    const variants: Record<EstadoCita, { label: string; className: string }> = {
      pendiente: { label: 'Pendiente', className: 'bg-muted text-muted-foreground' },
      completada: { label: 'Completado', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
      ausente_con_aviso: { label: 'Avisó', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
      no_show: { label: 'No avisó', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
      cancelada: { label: 'Cancelada', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
    };
    const { label, className } = variants[estado] || variants.pendiente;
    return <Badge variant="secondary" className={className}>{label}</Badge>;
  };

  // Generate WhatsApp link with pre-filled message
  const generateWhatsAppLink = (reserva: typeof reservas[0]) => {
    // Clean phone number: remove spaces, dashes, + signs
    const cleanPhone = reserva.telefono.replace(/[\s\-\+]/g, '');
    
    // Format time (remove seconds if present)
    const horaFormatted = reserva.hora.substring(0, 5);
    
    // Build message with exact template
    const message = `¡Hola ${reserva.nombre}! Te escribo de VIAGGIOSTYLE Barber. Te recuerdo que tenes una cita en 2 horas.

Servicio: ${reserva.servicio}
Hora: ${horaFormatted}
Precio: ${formatPrice(reserva.precio)}

Si no vas a venir o queres modificar tu cita, por favor ingresa de nuevo a https://vsbarber.lovable.app y cancelala o modificala. ¡Te esperamos!`;

    // URL encode the message
    const encodedMessage = encodeURIComponent(message);
    
    return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
  };

  const FullscreenLoader = ({ label }: { label: string }) => (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full overflow-hidden animate-pulse">
          <img src={vsLogo} alt="ViaggioStyle" className="w-full h-full object-cover" />
        </div>
        <p className="text-muted-foreground text-sm">{label}</p>
      </div>
    </div>
  );

  const findClienteByReserva = (reserva: Reserva) => {
    return clientes.find(c => 
      c.email.toLowerCase() === reserva.email.toLowerCase() && 
      c.telefono === reserva.telefono
    );
  };

  const handleDeleteClienteFromReserva = async () => {
    if (!deletingClienteFromReserva) return;
    const cliente = findClienteByReserva(deletingClienteFromReserva);
    if (!cliente) {
      toast.error('No se encontró el cliente');
      setDeletingClienteFromReserva(null);
      return;
    }
    try {
      await deleteCliente.mutateAsync(cliente.id);
      toast.success('Cliente eliminado correctamente');
    } catch {
      toast.error('Error al eliminar el cliente');
    } finally {
      setDeletingClienteFromReserva(null);
    }
  };

  // Show loading while checking auth and role
  if (loading) {
    return <FullscreenLoader label="Verificando acceso..." />;
  }

  // Extra grace window: never show 404 immediately on mobile while the session
  // may still be restored.
  if (!graceExpired && (!user || !isAllowedEmail || !isAdmin)) {
    return <FullscreenLoader label="Cargando panel..." />;
  }

  // After grace: if there's still no session, we're redirecting to /auth.
  if (graceExpired && !user) {
    return <FullscreenLoader label="Redirigiendo..." />;
  }

  // "Invisible route" - show 404 if not admin
  // This hides the existence of /control from unauthorized users
  if (!isAdmin || !isAllowedEmail) {
    return <NotFound />;
  }

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden">
                <img src={vsLogo} alt="ViaggioStyle" className="w-full h-full object-cover" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Panel de Control</h1>
                <p className="text-sm text-muted-foreground">ViaggioStyle</p>
              </div>
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Salir
          </Button>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Reservas de hoy
              </CardTitle>
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{todayStats?.count ?? 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ingresos estimados hoy
              </CardTitle>
              <DollarSign className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {formatPrice(todayStats?.ingresos ?? 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different sections */}
        <Tabs defaultValue="reservas" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="reservas" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Reservas</span>
            </TabsTrigger>
            <TabsTrigger value="clientes" className="flex items-center gap-2">
              <UserRound className="w-4 h-4" />
              <span className="hidden sm:inline">Clientes</span>
            </TabsTrigger>
            <TabsTrigger value="horarios" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Horarios</span>
            </TabsTrigger>
            <TabsTrigger value="ingresos" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Ingresos</span>
            </TabsTrigger>
            <TabsTrigger value="seguridad" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Seguridad</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reservas" className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Todas las reservas</h2>
            </div>

            {loadingReservas ? (
              <p className="text-muted-foreground py-8 text-center">Cargando reservas...</p>
            ) : reservas.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No hay reservas registradas
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {reservas.map((reserva) => (
                  <Card key={reserva.id}>
                    <CardContent className="py-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="font-semibold">{reserva.nombre}</span>
                            <span className="text-sm px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                              {reserva.servicio}
                            </span>
                            {getEstadoBadge(reserva.estado)}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span className="capitalize">
                              {format(parseISO(reserva.fecha), "EEE d MMM", { locale: es })}
                            </span>
                            <span>{reserva.hora.substring(0, 5)}</span>
                            <span>{formatPrice(reserva.precio)}</span>
                          </div>
                          <a
                            href={generateWhatsAppLink(reserva)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm text-[#25D366] hover:underline mt-1"
                          >
                            <MessageCircle className="w-4 h-4" />
                            {reserva.telefono}
                          </a>
                        </div>
                        <div className="flex gap-2">
                          {findClienteByReserva(reserva) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeletingClienteFromReserva(reserva)}
                              disabled={deleteCliente.isPending}
                              title="Eliminar cliente"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingReserva(reserva)}
                            disabled={updateEstado.isPending}
                          >
                            <Edit2 className="w-4 h-4 mr-2" />
                            Editar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="clientes">
            <ClientesManager />
          </TabsContent>

          <TabsContent value="horarios">
            <HourBlockManager />
          </TabsContent>

          <TabsContent value="ingresos">
            <RevenueStats />
          </TabsContent>

          <TabsContent value="seguridad" className="space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Seguridad / Roles</h2>
            </div>
            <AdminRoleManager />
          </TabsContent>
        </Tabs>

        {/* Edit Modal */}
        <ReservationEditModal
          reserva={editingReserva}
          open={!!editingReserva}
          onOpenChange={(open) => !open && setEditingReserva(null)}
          onUpdateEstado={handleUpdateEstado}
          isPending={updateEstado.isPending}
        />

        {/* Delete Cliente from Reserva Confirmation */}
        <AlertDialog open={!!deletingClienteFromReserva} onOpenChange={(open) => !open && setDeletingClienteFromReserva(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará permanentemente el historial del cliente{' '}
                <span className="font-semibold">{deletingClienteFromReserva?.nombre}</span> ({deletingClienteFromReserva?.email}).
                <br />
                Las reservas existentes no se eliminarán.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteClienteFromReserva}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default Control;
