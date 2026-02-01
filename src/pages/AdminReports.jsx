import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  BarChart3, 
  TrendingUp,
  Download,
  Calendar,
  DollarSign,
  Package,
  Users,
  ShoppingCart
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import AdminSidebar from '@/components/admin/AdminSidebar';
import { useAdminSidebar } from '@/contexts/AdminSidebarContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer
} from 'recharts';
import { format, subDays, subMonths, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseMoney } from '@/utils/validation';

export default function AdminReports() {
  const { sidebarOpen } = useAdminSidebar();
  const [period, setPeriod] = useState('30days');
  const [reportType, setReportType] = useState('sales');

  const { data: orders = [], error: ordersError } = useQuery({
    queryKey: ['adminOrders'],
    queryFn: () => base44.entities.Order.list('-created_date', 1000),
    onError: (error) => {
      console.error('Erro ao carregar pedidos:', error);
    }
  });

  const { data: products = [], error: productsError } = useQuery({
    queryKey: ['adminProducts'],
    queryFn: () => base44.entities.Product.list('-created_date', 10000),
    onError: (error) => {
      console.error('Erro ao carregar produtos:', error);
    }
  });

  const { data: customers = [], error: customersError } = useQuery({
    queryKey: ['adminCustomers'],
    queryFn: () => base44.entities.Customer.list('-created_date', 1000),
    onError: (error) => {
      console.error('Erro ao carregar clientes:', error);
    }
  });

  // Filtrar pedidos por período
  const filteredOrders = useMemo(() => {
    const now = new Date();
    let startDate;

    switch (period) {
      case '7days':
        startDate = subDays(now, 7);
        break;
      case '30days':
        startDate = subDays(now, 30);
        break;
      case '90days':
        startDate = subDays(now, 90);
        break;
      case 'month':
        startDate = startOfMonth(now);
        break;
      case 'year':
        startDate = startOfMonth(subMonths(now, 12));
        break;
      default:
        startDate = subDays(now, 30);
    }

    return orders.filter(order => {
      if (!order.created_date) return false;
      const orderDate = parseISO(order.created_date);
      return orderDate >= startDate && order.status !== 'cancelled';
    });
  }, [orders, period]);

  // Relatório de Vendas
  const salesReport = useMemo(() => {
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + parseMoney(o.total), 0);
    const totalOrders = filteredOrders.length;
    const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Vendas por dia
    const salesByDay = {};
    filteredOrders.forEach(order => {
      if (order.created_date) {
        const date = format(parseISO(order.created_date), 'dd/MM');
        salesByDay[date] = (salesByDay[date] || 0) + parseMoney(order.total);
      }
    });

    const dailySales = Object.entries(salesByDay)
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => {
        const [dayA, monthA] = a.date.split('/');
        const [dayB, monthB] = b.date.split('/');
        return new Date(2024, parseInt(monthA) - 1, parseInt(dayA)) - 
               new Date(2024, parseInt(monthB) - 1, parseInt(dayB));
      });

    return {
      totalRevenue,
      totalOrders,
      avgTicket,
      dailySales
    };
  }, [filteredOrders]);

  // Relatório de Produtos
  const productsReport = useMemo(() => {
    const productSales = {};
    
    filteredOrders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          const productId = item.product_id || item.id;
          if (!productSales[productId]) {
            productSales[productId] = {
              name: item.product_name || item.name || 'Produto',
              quantity: 0,
              revenue: 0
            };
          }
          productSales[productId].quantity += parseFloat(item.quantity || 1);
          const itemPrice = parseMoney(item.total || item.price || 0);
          const itemQuantity = parseFloat(item.quantity || 1);
          productSales[productId].revenue += itemPrice * itemQuantity;
        });
      }
    });

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return { topProducts };
  }, [filteredOrders]);

  // Relatório de Categorias
  const categoriesReport = useMemo(() => {
    const categorySales = {};
    
    filteredOrders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          const category = item.category || 'Outros';
          const itemPrice = parseMoney(item.total || item.price || 0);
          const itemQuantity = parseFloat(item.quantity || 1);
          categorySales[category] = (categorySales[category] || 0) + (itemPrice * itemQuantity);
        });
      }
    });

    const categoryData = Object.entries(categorySales)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#6366f1', '#ef4444', '#14b8a6'];

    return { categoryData, colors: COLORS };
  }, [filteredOrders]);

  // Relatório de Clientes
  const customersReport = useMemo(() => {
    const customerSpending = {};
    
    filteredOrders.forEach(order => {
      const customerId = order.customer_id || order.customer_phone;
      if (customerId) {
        if (!customerSpending[customerId]) {
          customerSpending[customerId] = {
            name: order.customer_name || 'Cliente',
            orders: 0,
            total: 0
          };
        }
        customerSpending[customerId].orders += 1;
        customerSpending[customerId].total += parseMoney(order.total);
      }
    });

    const topCustomers = Object.values(customerSpending)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    return { topCustomers };
  }, [filteredOrders]);

  const handleExport = () => {
    // Simular exportação
    toast.success('Relatório exportado! (Funcionalidade em desenvolvimento)');
  };

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
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Relatórios</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">Análises e métricas do negócio</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-40">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Últimos 7 dias</SelectItem>
                  <SelectItem value="30days">Últimos 30 dias</SelectItem>
                  <SelectItem value="90days">Últimos 90 dias</SelectItem>
                  <SelectItem value="month">Este mês</SelectItem>
                  <SelectItem value="year">Último ano</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </motion.header>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6"
        >
        {/* Summary Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white/60 backdrop-blur-sm border-gray-200/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Receita Total</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    R$ {salesReport.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/60 backdrop-blur-sm border-gray-200/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total de Pedidos</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{salesReport.totalOrders}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <ShoppingCart className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/60 backdrop-blur-sm border-gray-200/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Ticket Médio</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    R$ {salesReport.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/60 backdrop-blur-sm border-gray-200/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total de Clientes</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{customers.length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sales Chart */}
        <Card className="bg-white/60 backdrop-blur-sm border-gray-200/50">
          <CardHeader>
            <CardTitle>Vendas por Dia</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesReport.dailySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  formatter={(value) => [`R$ ${parseFloat(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Vendas']}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Vendas (R$)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Top Products */}
          <Card className="bg-white/60 backdrop-blur-sm border-gray-200/50">
            <CardHeader>
              <CardTitle>Produtos Mais Vendidos</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={productsReport.topProducts}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" stroke="#9ca3af" angle={-45} textAnchor="end" height={100} />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    formatter={(value) => [`R$ ${parseFloat(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Receita']}
                  />
                  <Legend />
                  <Bar dataKey="revenue" fill="#10b981" name="Receita (R$)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Categories */}
          <Card className="bg-white/60 backdrop-blur-sm border-gray-200/50">
            <CardHeader>
              <CardTitle>Vendas por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoriesReport.categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoriesReport.categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={categoriesReport.colors[index % categoriesReport.colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => `R$ ${parseFloat(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Top Customers */}
        <Card className="bg-white/60 backdrop-blur-sm border-gray-200/50">
          <CardHeader>
            <CardTitle>Clientes Mais Valiosos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {customersReport.topCustomers.length > 0 ? (
                customersReport.topCustomers.map((customer, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                        <span className="font-bold text-emerald-600">#{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{customer.name}</p>
                        <p className="text-sm text-gray-500">{customer.orders} pedidos</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-600">
                        R$ {customer.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Nenhum dado disponível para o período selecionado
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        </motion.div>
      </motion.main>
    </div>
  );
}
