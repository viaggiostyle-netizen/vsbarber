import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useReservas, useTodayStats, useDeleteReserva } from '@/hooks/useReservas';
import { formatPrice } from '@/lib/constants';
import { toast } from 'sonner';
import { Scissors, LogOut, Calendar, DollarSign, Trash2, ArrowLeft, Users } from 'lucide-react';

const Control = () => {
  const { user, loading, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const { data: reservas = [], isLoading: loadingReservas } = useReservas();
  const { data: todayStats } = useTodayStats();
  const deleteReserva = useDeleteReserva();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!loading && user && !isAdmin) {
      toast.error('No tienes permisos de administrador');
      signOut();
      navigate('/');
    }
  }, [user, loading, isAdmin, signOut, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de que deseas cancelar esta cita?')) {
      try {
        await deleteReserva.mutateAsync(id);
        toast.success('Cita cancelada correctamente');
      } catch (error) {
        toast.error('Error al cancelar la cita');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
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
              <div className="w-10 h-10 rounded-full bg-foreground flex items-center justify-center">
                <Scissors className="w-5 h-5 text-background" />
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

        {/* Reservations List */}
        <div className="space-y-4">
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
                        <div className="flex items-center gap-3">
                          <span className="font-semibold">{reserva.nombre}</span>
                          <span className="text-sm px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {reserva.servicio}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span className="capitalize">
                            {format(parseISO(reserva.fecha), "EEE d MMM", { locale: es })}
                          </span>
                          <span>{reserva.hora.substring(0, 5)}</span>
                          <span>{formatPrice(reserva.precio)}</span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(reserva.id)}
                        disabled={deleteReserva.isPending}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Cancelar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Control;
