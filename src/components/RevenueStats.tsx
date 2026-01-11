import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useMonthlyStats, useAvailableMonths } from '@/hooks/useMonthlyStats';
import { formatPrice } from '@/lib/constants';
import { Download, Users, DollarSign, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const RevenueStats = () => {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());

  const { data: availableMonths = [] } = useAvailableMonths();
  const { data: stats, isLoading } = useMonthlyStats(selectedYear, selectedMonth);

  const handleMonthChange = (value: string) => {
    const [year, month] = value.split('-').map(Number);
    setSelectedYear(year);
    setSelectedMonth(month);
  };

  // Calculate week-over-week comparison
  const weekComparison = useMemo(() => {
    if (!stats?.weeklyData || stats.weeklyData.length < 2) return null;
    
    const currentWeekIndex = stats.weeklyData.findIndex((w, i) => {
      const nextWeek = stats.weeklyData[i + 1];
      return nextWeek ? nextWeek.clients === 0 && w.clients > 0 : w.clients > 0;
    });
    
    if (currentWeekIndex < 1) return null;
    
    const current = stats.weeklyData[currentWeekIndex];
    const previous = stats.weeklyData[currentWeekIndex - 1];
    
    if (previous.clients === 0) return null;
    
    const clientsChange = ((current.clients - previous.clients) / previous.clients) * 100;
    const revenueChange = ((current.revenue - previous.revenue) / previous.revenue) * 100;
    
    return { clientsChange, revenueChange };
  }, [stats]);

  const exportReport = () => {
    if (!stats) return;
    
    const csvContent = [
      ['Semana', 'Clientes', 'Ingresos'],
      ...stats.weeklyData.map(w => [w.weekLabel, w.clients, w.revenue]),
      ['', '', ''],
      ['Total Clientes', stats.totalClients, ''],
      ['Total Ingresos', '', stats.totalRevenue],
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reporte-${stats.monthLabel.replace(' ', '-')}.csv`;
    link.click();
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1c1c1c] border border-zinc-800 rounded-xl p-3 shadow-xl">
          <p className="text-white font-semibold mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name === 'clients' ? 'Clientes' : 'Ingresos'}: {' '}
              {entry.name === 'revenue' ? formatPrice(entry.value) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const ComparisonBadge = ({ value }: { value: number }) => {
    if (value === 0) {
      return (
        <span className="flex items-center gap-1 text-zinc-400 text-sm">
          <Minus className="w-3 h-3" /> Sin cambio
        </span>
      );
    }
    
    const isPositive = value > 0;
    return (
      <span className={`flex items-center gap-1 text-sm ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {isPositive ? '+' : ''}{value.toFixed(1)}%
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-zinc-400">Cargando estadísticas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Month Selector and Export */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <DollarSign className="w-6 h-6 text-emerald-500" />
          <h2 className="text-xl font-bold capitalize">
            {stats?.monthLabel || 'Estadísticas'}
          </h2>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Select
            value={`${selectedYear}-${selectedMonth}`}
            onValueChange={handleMonthChange}
          >
            <SelectTrigger className="w-full sm:w-[200px] bg-[#1c1c1c] border-zinc-800 rounded-2xl">
              <SelectValue placeholder="Seleccionar mes" />
            </SelectTrigger>
            <SelectContent className="bg-[#1c1c1c] border-zinc-800">
              {availableMonths.map((m) => (
                <SelectItem key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>
                  <span className="capitalize">{m.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="icon"
            onClick={exportReport}
            className="bg-[#1c1c1c] border-zinc-800 hover:bg-zinc-800 rounded-xl"
            title="Exportar Reporte"
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-[#1c1c1c] border-zinc-800 rounded-[2rem]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total Clientes del Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <span className="text-4xl font-bold text-white">{stats?.totalClients || 0}</span>
              {weekComparison && <ComparisonBadge value={weekComparison.clientsChange} />}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1c1c1c] border-zinc-800 rounded-[2rem]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Ingresos Finales del Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <span className="text-4xl font-bold text-emerald-500">
                {formatPrice(stats?.totalRevenue || 0)}
              </span>
              {weekComparison && <ComparisonBadge value={weekComparison.revenueChange} />}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clients Chart */}
      <Card className="bg-[#1c1c1c] border-zinc-800 rounded-[2rem]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Users className="w-5 h-5" />
            Control de Clientela
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.weeklyData || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis 
                  dataKey="weekLabel" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: '#a1a1aa', fontSize: 12 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: '#a1a1aa', fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="clients" 
                  name="clients"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={50}
                >
                  {(stats?.weeklyData || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="#ffffff" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-center">
            <p className="text-zinc-400">
              Total de clientes del mes: <span className="text-white font-bold text-lg">{stats?.totalClients || 0}</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Chart */}
      <Card className="bg-[#1c1c1c] border-zinc-800 rounded-[2rem]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <DollarSign className="w-5 h-5 text-emerald-500" />
            Control de Ingresos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.weeklyData || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis 
                  dataKey="weekLabel" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: '#a1a1aa', fontSize: 12 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: '#a1a1aa', fontSize: 12 }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="revenue" 
                  name="revenue"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={50}
                >
                  {(stats?.weeklyData || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="#10b981" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-center">
            <p className="text-zinc-400">
              Ingresos finales del mes: <span className="text-emerald-500 font-bold text-lg">{formatPrice(stats?.totalRevenue || 0)}</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Note about data start */}
      {selectedYear === 2026 && selectedMonth === 0 && (
        <p className="text-center text-zinc-500 text-sm">
          📅 El registro de actividad comienza el lunes 12 de enero 2026 (Semana 3)
        </p>
      )}
    </div>
  );
};

export default RevenueStats;
