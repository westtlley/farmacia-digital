import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  Download,
  Calendar,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  BarChart3
} from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { useAdminSidebar } from '@/contexts/AdminSidebarContext';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, parseISO, isWithinInterval, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseMoney } from '@/utils/validation';
import { Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const statusLabels = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  out_for_delivery: 'Em Entrega',
  delivered: 'Entregue',
  cancelled: 'Cancelado'
};

const getStatusColor = (status) => {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    preparing: 'bg-purple-100 text-purple-800',
    out_for_delivery: 'bg-cyan-100 text-cyan-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

export default function AdminFinancial() {
  const { sidebarOpen } = useAdminSidebar();
  const [periodFilter, setPeriodFilter] = useState('month'); // 'today', 'week', 'month', 'year', 'all'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'delivered', 'pending', 'cancelled'

  const { data: orders = [], isLoading: ordersLoading, error: ordersError } = useQuery({
    queryKey: ['adminOrders'],
    queryFn: () => base44.entities.Order.list('-created_date', 10000),
    onError: (error) => {
      console.error('Erro ao carregar pedidos:', error);
      toast.error('Erro ao carregar dados financeiros');
    }
  });

  // Filtrar pedidos por período e status
  const filteredOrders = useMemo(() => {
    let filtered = [...orders];

    // Filtrar por status
    if (statusFilter !== 'all') {
      if (statusFilter === 'pending') {
        filtered = filtered.filter(o => o.status === 'pending' || o.status === 'confirmed');
      } else {
        filtered = filtered.filter(o => o.status === statusFilter);
      }
    }

    // Filtrar por período
    const now = new Date();
    let startDate, endDate;

    switch (periodFilter) {
      case 'today':
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        break;
      case 'week':
        startDate = startOfDay(subDays(now, 7));
        endDate = endOfDay(now);
        break;
      case 'month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'year':
        startDate = startOfMonth(subMonths(now, 11));
        endDate = endOfMonth(now);
        break;
      case 'all':
      default:
        return filtered;
    }

    return filtered.filter(order => {
      if (!order.created_date) return false;
      const orderDate = parseISO(order.created_date);
      return isWithinInterval(orderDate, { start: startDate, end: endDate });
    });
  }, [orders, periodFilter, statusFilter]);

  // Calcular métricas financeiras
  const financialMetrics = useMemo(() => {
    const validOrders = filteredOrders.filter(o => o.status !== 'cancelled');
    const deliveredOrders = filteredOrders.filter(o => o.status === 'delivered');
    const pendingOrders = filteredOrders.filter(o => o.status === 'pending' || o.status === 'confirmed');
    
    const totalRevenue = validOrders.reduce((sum, o) => sum + parseMoney(o.total), 0);
    const deliveredRevenue = deliveredOrders.reduce((sum, o) => sum + parseMoney(o.total), 0);
    const pendingRevenue = pendingOrders.reduce((sum, o) => sum + parseMoney(o.total), 0);
    const avgTicket = validOrders.length > 0 ? totalRevenue / validOrders.length : 0;
    const cancelledRevenue = filteredOrders.filter(o => o.status === 'cancelled').reduce((sum, o) => sum + parseMoney(o.total), 0);

    // Comparar com período anterior
    const now = new Date();
    let previousStart, previousEnd, currentStart, currentEnd;

    switch (periodFilter) {
      case 'today':
        currentStart = startOfDay(now);
        currentEnd = endOfDay(now);
        previousStart = startOfDay(subDays(now, 1));
        previousEnd = endOfDay(subDays(now, 1));
        break;
      case 'week':
        currentStart = startOfDay(subDays(now, 7));
        currentEnd = endOfDay(now);
        previousStart = startOfDay(subDays(now, 14));
        previousEnd = endOfDay(subDays(now, 7));
        break;
      case 'month':
        currentStart = startOfMonth(now);
        currentEnd = endOfMonth(now);
        previousStart = startOfMonth(subMonths(now, 1));
        previousEnd = endOfMonth(subMonths(now, 1));
        break;
      case 'year':
        currentStart = startOfMonth(subMonths(now, 11));
        currentEnd = endOfMonth(now);
        previousStart = startOfMonth(subMonths(now, 23));
        previousEnd = endOfMonth(subMonths(now, 12));
        break;
      default:
        return {
          totalRevenue,
          deliveredRevenue,
          pendingRevenue,
          avgTicket,
          cancelledRevenue,
          totalOrders: validOrders.length,
          revenueChange: 0,
          ordersChange: 0
        };
    }

    const currentPeriodOrders = orders.filter(order => {
      if (!order.created_date || order.status === 'cancelled') return false;
      const orderDate = parseISO(order.created_date);
      return isWithinInterval(orderDate, { start: currentStart, end: currentEnd });
    });

    const previousPeriodOrders = orders.filter(order => {
      if (!order.created_date || order.status === 'cancelled') return false;
      const orderDate = parseISO(order.created_date);
      return isWithinInterval(orderDate, { start: previousStart, end: previousEnd });
    });

    const currentPeriodRevenue = currentPeriodOrders.reduce((sum, o) => sum + parseMoney(o.total), 0);
    const previousPeriodRevenue = previousPeriodOrders.reduce((sum, o) => sum + parseMoney(o.total), 0);
    const revenueChange = previousPeriodRevenue > 0 
      ? ((currentPeriodRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100 
      : 0;
    
    const ordersChange = previousPeriodOrders.length > 0
      ? ((currentPeriodOrders.length - previousPeriodOrders.length) / previousPeriodOrders.length) * 100
      : 0;

    return {
      totalRevenue,
      deliveredRevenue,
      pendingRevenue,
      avgTicket,
      cancelledRevenue,
      totalOrders: validOrders.length,
      revenueChange,
      ordersChange
    };
  }, [filteredOrders, orders, periodFilter]);

  // Dados para gráfico de receita por status
  const revenueByStatus = useMemo(() => {
    const statusData = [
      { name: 'Entregue', value: filteredOrders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + parseMoney(o.total), 0), color: '#10b981' },
      { name: 'Pendente', value: filteredOrders.filter(o => o.status === 'pending').reduce((sum, o) => sum + parseMoney(o.total), 0), color: '#f59e0b' },
      { name: 'Confirmado', value: filteredOrders.filter(o => o.status === 'confirmed').reduce((sum, o) => sum + parseMoney(o.total), 0), color: '#3b82f6' },
      { name: 'Em Preparação', value: filteredOrders.filter(o => o.status === 'preparing').reduce((sum, o) => sum + parseMoney(o.total), 0), color: '#8b5cf6' },
      { name: 'Em Entrega', value: filteredOrders.filter(o => o.status === 'out_for_delivery').reduce((sum, o) => sum + parseMoney(o.total), 0), color: '#06b6d4' },
      { name: 'Cancelado', value: filteredOrders.filter(o => o.status === 'cancelled').reduce((sum, o) => sum + parseMoney(o.total), 0), color: '#ef4444' }
    ].filter(item => item.value > 0);
    return statusData;
  }, [filteredOrders]);

  // Dados para gráfico de receita diária
  const dailyRevenue = useMemo(() => {
    const days = [];
    const daysToShow = periodFilter === 'year' ? 365 : periodFilter === 'month' ? 30 : periodFilter === 'week' ? 7 : 1;
    
    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      
      const dayOrders = filteredOrders.filter(order => {
        if (!order.created_date || order.status === 'cancelled') return false;
        const orderDate = parseISO(order.created_date);
        return isWithinInterval(orderDate, { start: dayStart, end: dayEnd });
      });
      
      const dayRevenue = dayOrders.reduce((sum, o) => sum + parseMoney(o.total), 0);
      
      days.push({
        name: format(date, daysToShow > 30 ? 'MMM' : 'dd/MM', { locale: ptBR }),
        value: dayRevenue,
        orders: dayOrders.length
      });
    }
    return days;
  }, [filteredOrders, periodFilter]);

  // Dados para gráfico de receita mensal (últimos 12 meses)
  const monthlyRevenue = useMemo(() => {
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      
      const monthOrders = orders.filter(order => {
        if (!order.created_date || order.status === 'cancelled') return false;
        const orderDate = parseISO(order.created_date);
        return isWithinInterval(orderDate, { start: monthStart, end: monthEnd });
      });
      
      const monthRevenue = monthOrders.reduce((sum, o) => sum + parseMoney(o.total), 0);
      
      months.push({
        name: format(date, 'MMM', { locale: ptBR }),
        value: monthRevenue,
        orders: monthOrders.length
      });
    }
    return months;
  }, [orders]);

  // Exportar relatório
  const exportReport = () => {
    const csvContent = [
      ['Data', 'Pedido', 'Cliente', 'Status', 'Valor'].join(','),
      ...filteredOrders
        .filter(o => o.status !== 'cancelled')
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
        .map(order => [
          format(parseISO(order.created_date), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
          `#${order.order_number || order.id.slice(-6)}`,
          `"${order.customer_name || 'Cliente'}"`,
          statusLabels[order.status] || order.status,
          parseMoney(order.total).toFixed(2)
        ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio-financeiro-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Relatório exportado com sucesso!');
  };

  const isLoading = ordersLoading;
  const hasError = ordersError;

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <AdminSidebar />
      
      <motion.main 
        initial={false}
        animate={{ 
          marginLeft: sidebarOpen ? '16rem' : '5rem'
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="flex-1"
      >
        <motion.header 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white border-b px-4 sm:px-6 py-4 sticky top-0 z-40 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Financeiro</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">Gestão financeira e relatórios</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Button onClick={exportReport} variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Exportar Relatório
              </Button>
            </div>
          </div>
        </motion.header>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="p-4 sm:p-6 space-y-6"
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
          ) : hasError ? (
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-6 text-center">
                <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-red-900 mb-2">Erro ao carregar dados</h3>
                <p className="text-red-700 mb-4">
                  Ocorreu um erro ao carregar os dados financeiros. Por favor, tente novamente.
                </p>
                <Button onClick={() => window.location.reload()} variant="outline">
                  Recarregar Página
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Filtros */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Período:</span>
                      <Select value={periodFilter} onValueChange={setPeriodFilter}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="today">Hoje</SelectItem>
                          <SelectItem value="week">Últimos 7 dias</SelectItem>
                          <SelectItem value="month">Este mês</SelectItem>
                          <SelectItem value="year">Este ano</SelectItem>
                          <SelectItem value="all">Todos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Status:</span>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="delivered">Entregues</SelectItem>
                          <SelectItem value="pending">Pendentes</SelectItem>
                          <SelectItem value="cancelled">Cancelados</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Métricas Financeiras */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    title: 'Receita Total',
                    value: `R$ ${financialMetrics.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    change: `${financialMetrics.revenueChange >= 0 ? '+' : ''}${financialMetrics.revenueChange.toFixed(1)}%`,
                    up: financialMetrics.revenueChange >= 0,
                    subtitle: `${financialMetrics.totalOrders} pedidos`,
                    icon: DollarSign,
                    color: 'emerald'
                  },
                  {
                    title: 'Receita Recebida',
                    value: `R$ ${financialMetrics.deliveredRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    subtitle: `${filteredOrders.filter(o => o.status === 'delivered').length} pedidos entregues`,
                    icon: CheckCircle,
                    color: 'green'
                  },
                  {
                    title: 'Pendente de Recebimento',
                    value: `R$ ${financialMetrics.pendingRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    subtitle: `${filteredOrders.filter(o => o.status === 'pending' || o.status === 'confirmed').length} pedidos`,
                    icon: Clock,
                    color: 'yellow'
                  },
                  {
                    title: 'Ticket Médio',
                    value: `R$ ${financialMetrics.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    change: `${financialMetrics.ordersChange >= 0 ? '+' : ''}${financialMetrics.ordersChange.toFixed(1)}%`,
                    up: financialMetrics.ordersChange >= 0,
                    subtitle: 'Por pedido',
                    icon: TrendingUp,
                    color: 'blue'
                  }
                ].map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm text-gray-500">{stat.title}</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                            <p className="text-xs text-gray-500 mt-2">{stat.subtitle}</p>
                            {stat.change && (
                              <div className={`flex items-center gap-1 mt-2 text-sm ${stat.up ? 'text-green-600' : 'text-red-600'}`}>
                                {stat.up ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                                {stat.change}
                              </div>
                            )}
                          </div>
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${stat.color}-100`}>
                            <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Gráficos */}
              <div className="grid lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Receita por Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={revenueByStatus}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {revenueByStatus.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => [`R$ ${parseFloat(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Receita']}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Receita Diária</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={dailyRevenue}>
                        <defs>
                          <linearGradient id="colorDaily" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" stroke="#9ca3af" />
                        <YAxis stroke="#9ca3af" />
                        <Tooltip 
                          formatter={(value) => [`R$ ${parseFloat(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Receita']}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#10b981" 
                          strokeWidth={2}
                          fill="url(#colorDaily)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Gráfico de Receita Mensal */}
              <Card>
                <CardHeader>
                  <CardTitle>Receita Mensal (Últimos 12 meses)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" />
                      <Tooltip 
                        formatter={(value) => [`R$ ${parseFloat(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Receita']}
                      />
                      <Bar dataKey="value" fill="#10b981" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Tabela de Movimentações */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Movimentações Financeiras</CardTitle>
                    <Badge variant="outline" className="text-sm">
                      {filteredOrders.filter(o => o.status !== 'cancelled').length} registros
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Pedido</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrders
                          .filter(o => o.status !== 'cancelled')
                          .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
                          .slice(0, 50)
                          .map((order) => (
                            <TableRow key={order.id}>
                              <TableCell>
                                {format(parseISO(order.created_date), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                              </TableCell>
                              <TableCell className="font-medium">
                                #{order.order_number || order.id.slice(-6)}
                              </TableCell>
                              <TableCell>{order.customer_name || 'Cliente'}</TableCell>
                              <TableCell>
                                <Badge className={getStatusColor(order.status)}>
                                  {statusLabels[order.status] || order.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                R$ {parseMoney(order.total).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </TableCell>
                            </TableRow>
                          ))}
                        {filteredOrders.filter(o => o.status !== 'cancelled').length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                              Nenhuma movimentação encontrada para os filtros selecionados
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </motion.div>
      </motion.main>
    </div>
  );
}
