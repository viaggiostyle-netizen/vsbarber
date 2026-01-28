import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useReservas, useTodayStats, useDeleteReserva } from '@/hooks/useReservas';
import { useUpdateReservaEstado } from '@/hooks/useUpdateReservaEstado';
import { useDeleteCliente, useClientes } from '@/hooks/useClientes';
import { formatPrice, ADMIN_EMAILS } from '@/lib/constants';
import { toast } from 'sonner';
import { Calendar, DollarSign, MessageCircle, Edit2, Trash2 } from 'lucide-react';
import SplashScreen from '@/components/SplashScreen';
import NotFound from '@/pages/NotFound';
import { HourBlockManager } from '@/components/HourBlockManager';
import RevenueStats from '@/components/RevenueStats';
import { AdminRoleManager } from '@/components/AdminRoleManager';
import { ClientesManager } from '@/components/ClientesManager';
import { ReservationEditModal } from '@/components/ReservationEditModal';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { MobileAdminNav } from '@/components/admin/MobileAdminNav';
import { OrganizationSection } from '@/components/admin/OrganizationSection';
import vsLogo from '@/assets/vs-logo-new.jpg';
import { PushNotificationButton } from '@/components/PushNotificationButton';
import { TestPushButton } from '@/components/TestPushButton';
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
  const deleteReserva = useDeleteReserva();
  const [showSplash, setShowSplash] = useState(true);
  const [editingReserva, setEditingReserva] = useState<Reserva | null>(null);
  const [graceExpired, setGraceExpired] = useState(false);
  const [deletingReserva, setDeletingReserva] = useState<Reserva | null>(null);
  const [activeSection, setActiveSection] = useState('reservas');

  const isAllowedEmail = !!(user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));

  useEffect(() => {
    setGraceExpired(false);
    const t = window.setTimeout(() => setGraceExpired(true), 10_000);
    return () => window.clearTimeout(t);
  }, []);

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

  const generateWhatsAppLink = (reserva: typeof reservas[0]) => {
    const cleanPhone = reserva.telefono.replace(/[\s\-\+]/g, '');
    const horaFormatted = reserva.hora.substring(0, 5);
    const message = `¡Hola ${reserva.nombre}! Te escribo de VIAGGIOSTYLE Barber. Te recuerdo que tenes una cita en 2 horas.

Servicio: ${reserva.servicio}
Hora: ${horaFormatted}
Precio: ${formatPrice(reserva.precio)}

Si no vas a venir o queres modificar tu cita, por favor ingresa de nuevo a https://vsbarber.lovable.app y cancelala o modificala. ¡Te esperamos!`;
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

  const handleDeleteReserva = async () => {
    if (!deletingReserva) return;
    try {
      await deleteReserva.mutateAsync(deletingReserva.id);
      toast.success('Reserva eliminada correctamente');
    } catch {
      toast.error('Error al eliminar la reserva');
    } finally {
      setDeletingReserva(null);
    }
  };

  if (loading) {
    return <FullscreenLoader label="Verificando acceso..." />;
  }

  if (!graceExpired && (!user || !isAllowedEmail || !isAdmin)) {
    return <FullscreenLoader label="Cargando panel..." />;
  }

  if (graceExpired && !user) {
    return <FullscreenLoader label="Redirigiendo..." />;
  }

  if (!isAdmin || !isAllowedEmail) {
    return <NotFound />;
  }

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'reservas':
        return (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            {/* Notification Buttons */}
            <div className="flex gap-2">
              <TestPushButton />
              <PushNotificationButton />
            </div>

            {/* Reservations List */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Todas las reservas</h2>

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
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeletingReserva(reserva)}
                              disabled={deleteReserva.isPending}
                              title="Eliminar reserva"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
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
            </div>
          </div>
        );

      case 'ingresos':
        return <RevenueStats />;

      case 'clientes':
        return <ClientesManager />;

      case 'horarios':
        return <HourBlockManager />;

      case 'admins':
        return <AdminRoleManager />;

      case 'organizacion':
        return <OrganizationSection />;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <AdminSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          onSignOut={handleSignOut}
        />
      </div>

      {/* Mobile Nav */}
      <MobileAdminNav
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onSignOut={handleSignOut}
      />

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen">
        <div className="container max-w-5xl mx-auto px-4 py-8 pt-20 lg:pt-8">
          {renderContent()}
        </div>
      </main>

      {/* Edit Modal */}
      <ReservationEditModal
        reserva={editingReserva}
        open={!!editingReserva}
        onOpenChange={(open) => !open && setEditingReserva(null)}
        onUpdateEstado={handleUpdateEstado}
        isPending={updateEstado.isPending}
      />

      {/* Delete Reserva Confirmation */}
      <AlertDialog open={!!deletingReserva} onOpenChange={(open) => !open && setDeletingReserva(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar reserva?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente la reserva de{' '}
              <span className="font-semibold">{deletingReserva?.nombre}</span> para el{' '}
              {deletingReserva?.fecha && format(parseISO(deletingReserva.fecha), "d 'de' MMMM", { locale: es })} a las {deletingReserva?.hora.substring(0, 5)}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteReserva}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Control;
