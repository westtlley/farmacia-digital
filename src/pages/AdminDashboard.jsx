import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  TrendingUp,
  DollarSign,
  Tag,
  FileText,
  Settings,
  Plus,
  Upload,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Menu,
  X,
  Loader2,
  AlertCircle,
  Smartphone,
  MessageCircle,
  CheckCircle,
  Clock,
  Pill
} from 'lucide-react';
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
  Legend
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseMoney } from '@/utils/validation';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { getProductImage } from '@/utils/productImages';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { useAdminSidebar } from '@/contexts/AdminSidebarContext';
import ExecutiveDashboard from '@/components/admin/ExecutiveDashboard';

const statusLabels = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  out_for_delivery: 'Em Entrega',
  delivered: 'Entregue',
  cancelled: 'Cancelado'
};

const menuItems = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'finance', icon: DollarSign, label: 'Financeiro', link: null },
  { id: 'products', icon: Package, label: 'Produtos', link: 'AdminProducts' },
  { id: 'orders', icon: ShoppingCart, label: 'Pedidos', link: 'AdminOrders' },
  { id: 'customers', icon: Users, label: 'Clientes', link: 'AdminCustomers' },
  { id: 'promotions', icon: Tag, label: 'Promoções', link: 'AdminPromotions' },
  { id: 'prescriptions', icon: FileText, label: 'Receitas', link: 'AdminPrescriptions' },
  { id: 'medications', icon: Pill, label: 'Medicamentos', link: 'AdminMedications' },
  { id: 'reports', icon: BarChart3, label: 'Relatórios', link: 'AdminReports' },
  { id: 'settings', icon: Settings, label: 'Configurações', link: 'AdminSettings' },
];

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const { sidebarOpen } = useAdminSidebar();
  const location = useLocation();
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard' ou 'finance'

  // Ler parâmetro 'view' da URL para definir a view ativa
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const viewParam = urlParams.get('view');
    if (viewParam === 'finance') {
      setActiveView('finance');
    } else {
      setActiveView('dashboard');
    }
  }, [location.search]);

  const { data: products = [], isLoading: productsLoading, error: productsError } = useQuery({
    queryKey: ['adminProducts'],
    queryFn: () => base44.entities.Product.list('-created_date', 10000),
    onError: (error) => {
      console.error('Erro ao carregar produtos:', error);
    }
  });

  const { data: orders = [], isLoading: ordersLoading, error: ordersError } = useQuery({
    queryKey: ['adminOrders'],
    queryFn: () => base44.entities.Order.list('-created_date', 1000),
    onError: (error) => {
      console.error('Erro ao carregar pedidos:', error);
    }
  });

  const { data: prescriptions = [], isLoading: prescriptionsLoading, error: prescriptionsError } = useQuery({
    queryKey: ['adminPrescriptions'],
    queryFn: () => base44.entities.Prescription.list('-created_date', 100),
    onError: (error) => {
      console.error('Erro ao carregar receitas:', error);
    }
  });

  // Buscar configurações para obter order_mode
  const { data: settings } = useQuery({
    queryKey: ['pharmacySettings'],
    queryFn: async () => {
      const data = await base44.entities.PharmacySettings.list('', 1);
      return data && data.length > 0 ? data[0] : null;
    }
  });

  const orderMode = settings?.order_mode || 'app';

  // Mutation para atualizar order_mode
  const updateOrderModeMutation = useMutation({
    mutationFn: async (newMode) => {
      if (settings) {
        return base44.entities.PharmacySettings.update(settings.id, { 
          ...settings, 
          order_mode: newMode 
        });
      } else {
        return base44.entities.PharmacySettings.create({ order_mode: newMode });
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['pharmacySettings']);
      queryClient.setQueryData(['pharmacySettings'], [data]);
      toast.success(`Modo de pedidos alterado para ${newMode === 'app' ? 'App' : 'WhatsApp'}!`);
    },
    onError: (error) => {
      console.error('Erro ao atualizar modo de pedidos:', error);
      toast.error('Erro ao atualizar modo de pedidos');
    }
  });

  const handleToggleOrderMode = (checked) => {
    const newMode = checked ? 'whatsapp' : 'app';
    updateOrderModeMutation.mutate(newMode);
  };

  // Cálculos de métricas
  const metrics = useMemo(() => {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    // Filtrar pedidos do mês atual e anterior
    const currentMonthOrders = orders.filter(order => {
      if (!order.created_date) return false;
      const orderDate = parseISO(order.created_date);
      return isWithinInterval(orderDate, { start: currentMonthStart, end: currentMonthEnd });
    });

    const lastMonthOrders = orders.filter(order => {
      if (!order.created_date) return false;
      const orderDate = parseISO(order.created_date);
      return isWithinInterval(orderDate, { start: lastMonthStart, end: lastMonthEnd });
    });

    // Receita total (com validação robusta)
    const totalRevenue = orders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + parseMoney(o.total), 0);
    
    const currentMonthRevenue = currentMonthOrders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + parseMoney(o.total), 0);
    
    const lastMonthRevenue = lastMonthOrders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + parseMoney(o.total), 0);
    
    const revenueChange = lastMonthRevenue > 0 
      ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
      : currentMonthRevenue > 0 ? '100' : '0';

    // Pedidos
    const totalOrders = orders.filter(o => o.status !== 'cancelled').length;
    const currentMonthOrdersCount = currentMonthOrders.filter(o => o.status !== 'cancelled').length;
    const lastMonthOrdersCount = lastMonthOrders.filter(o => o.status !== 'cancelled').length;
    const ordersChange = lastMonthOrdersCount > 0
      ? ((currentMonthOrdersCount - lastMonthOrdersCount) / lastMonthOrdersCount * 100).toFixed(1)
      : currentMonthOrdersCount > 0 ? '100' : '0';

    // Ticket médio
    const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const currentMonthAvgTicket = currentMonthOrdersCount > 0 
      ? currentMonthRevenue / currentMonthOrdersCount 
      : 0;
    const lastMonthAvgTicket = lastMonthOrdersCount > 0
      ? lastMonthRevenue / lastMonthOrdersCount
      : 0;
    const ticketChange = lastMonthAvgTicket > 0
      ? ((currentMonthAvgTicket - lastMonthAvgTicket) / lastMonthAvgTicket * 100).toFixed(1)
      : currentMonthAvgTicket > 0 ? '100' : '0';

    // Produtos com estoque baixo
    const lowStockProducts = products.filter(p => {
      const stock = parseFloat(p.stock_quantity) || 0;
      const minStock = parseFloat(p.min_stock) || 10;
      return stock <= minStock && p.status === 'active';
    });

    return {
      totalRevenue,
      revenueChange: parseFloat(revenueChange),
      totalOrders,
      ordersChange: parseFloat(ordersChange),
      avgTicket,
      ticketChange: parseFloat(ticketChange),
      totalProducts: products.length,
      lowStockCount: lowStockProducts.length,
      lowStockProducts
    };
  }, [orders, products]);

  // Vendas por mês (últimos 7 meses)
  const salesByMonth = useMemo(() => {
    const months = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      
      const monthOrders = orders.filter(order => {
        if (!order.created_date) return false;
        const orderDate = parseISO(order.created_date);
        return isWithinInterval(orderDate, { start: monthStart, end: monthEnd }) 
          && order.status !== 'cancelled';
      });
      
      const monthRevenue = monthOrders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
      
      months.push({
        name: format(monthDate, 'MMM', { locale: ptBR }),
        value: monthRevenue
      });
    }
    
    return months;
  }, [orders]);

  // Vendas por categoria
  const salesByCategory = useMemo(() => {
    const categoryMap = new Map();
    
    orders
      .filter(o => o.status !== 'cancelled')
      .forEach(order => {
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach(item => {
            const category = item.category || 'Outros';
            const current = categoryMap.get(category) || 0;
            const itemPrice = parseMoney(item.price || item.total || 0);
            const itemQuantity = parseFloat(item.quantity || 1);
            categoryMap.set(category, current + (itemPrice * itemQuantity));
          });
        }
      });
    
    // Se não houver dados de itens, usar categorias dos produtos
    if (categoryMap.size === 0) {
      products.forEach(product => {
        if (product.category) {
          const current = categoryMap.get(product.category) || 0;
          categoryMap.set(product.category, current + 1);
        }
      });
    }
    
    const total = Array.from(categoryMap.values()).reduce((sum, val) => sum + val, 0);
    
    const categoryColors = {
      'medicamentos': '#10b981',
      'dermocosmeticos': '#f59e0b',
      'vitaminas': '#3b82f6',
      'higiene': '#8b5cf6',
      'infantil': '#ec4899',
      'mamae_bebe': '#ec4899',
      'beleza': '#f97316',
      'diabetes': '#06b6d4',
      'nutricao': '#84cc16',
      'ortopedia': '#6366f1',
      'primeiros_socorros': '#ef4444',
      'equipamentos': '#14b8a6',
      'Outros': '#6b7280'
    };
    
    const categoryLabels = {
      'medicamentos': 'Medicamentos',
      'dermocosmeticos': 'Dermocosméticos',
      'vitaminas': 'Vitaminas',
      'higiene': 'Higiene',
      'infantil': 'Infantil',
      'mamae_bebe': 'Mamãe & Bebê',
      'beleza': 'Beleza',
      'diabetes': 'Diabetes',
      'nutricao': 'Nutrição',
      'ortopedia': 'Ortopedia',
      'primeiros_socorros': 'Primeiros Socorros',
      'equipamentos': 'Equipamentos',
      'Outros': 'Outros'
    };
    
    const data = Array.from(categoryMap.entries())
      .map(([category, value]) => ({
        name: categoryLabels[category] || category,
        value: total > 0 ? ((value / total) * 100).toFixed(1) : 0,
        revenue: value,
        color: categoryColors[category] || '#6b7280'
      }))
      .sort((a, b) => parseFloat(b.value) - parseFloat(a.value))
      .slice(0, 5);
    
    // Se não houver dados, retornar dados padrão
    if (data.length === 0) {
      return [
        { name: 'Medicamentos', value: '35', revenue: 0, color: '#10b981' },
        { name: 'Dermocosméticos', value: '20', revenue: 0, color: '#f59e0b' },
        { name: 'Vitaminas', value: '18', revenue: 0, color: '#3b82f6' },
        { name: 'Higiene', value: '15', revenue: 0, color: '#8b5cf6' },
        { name: 'Outros', value: '12', revenue: 0, color: '#6b7280' }
      ];
    }
    
    return data;
  }, [orders, products]);

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

  const isLoading = productsLoading || ordersLoading || prescriptionsLoading;
  const hasError = productsError || ordersError || prescriptionsError;

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
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              {activeView === 'finance' ? 'Financeiro' : 'Dashboard'}
            </h1>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              {/* Toggle Modo de Pedidos */}
              <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-2 border">
                <div className="flex items-center gap-2">
                  {orderMode === 'app' ? (
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <MessageCircle className="w-4 h-4 text-green-600" />
                  )}
                  <Label htmlFor="order-mode" className="text-sm font-medium cursor-pointer">
                    {orderMode === 'app' ? 'Pedidos no App' : 'Pedidos no WhatsApp'}
                  </Label>
                </div>
                <Switch
                  id="order-mode"
                  checked={orderMode === 'whatsapp'}
                  onCheckedChange={handleToggleOrderMode}
                  disabled={updateOrderModeMutation.isPending}
                />
              </div>
              
              <Link to={createPageUrl('AdminProducts') + '?action=new'}>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Produto
                </Button>
              </Link>
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
                  Ocorreu um erro ao carregar os dados do dashboard. Por favor, tente novamente.
                </p>
                <Button onClick={() => window.location.reload()} variant="outline">
                  Recarregar Página
                </Button>
              </CardContent>
            </Card>
          ) : activeView === 'finance' ? (
            <>
              {/* Financial Metrics */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {(() => {
                  const now = new Date();
                  const currentMonthStart = startOfMonth(now);
                  const currentMonthEnd = endOfMonth(now);
                  const currentMonthOrders = orders.filter(order => {
                    if (!order.created_date) return false;
                    const orderDate = parseISO(order.created_date);
                    return isWithinInterval(orderDate, { start: currentMonthStart, end: currentMonthEnd }) 
                      && order.status !== 'cancelled';
                  });
                  
                  const currentMonthRevenue = currentMonthOrders.reduce((sum, o) => sum + parseMoney(o.total), 0);
                  const totalRevenue = orders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + parseMoney(o.total), 0);
                  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'confirmed');
                  const pendingRevenue = pendingOrders.reduce((sum, o) => sum + parseMoney(o.total), 0);
                  const deliveredOrders = orders.filter(o => o.status === 'delivered');
                  const deliveredRevenue = deliveredOrders.reduce((sum, o) => sum + parseMoney(o.total), 0);
                  
                  return [
                    {
                      title: 'Receita do Mês',
                      value: `R$ ${currentMonthRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                      subtitle: `${currentMonthOrders.length} pedidos`,
                      icon: DollarSign,
                      color: 'emerald'
                    },
                    {
                      title: 'Receita Total',
                      value: `R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                      subtitle: `${orders.filter(o => o.status !== 'cancelled').length} pedidos`,
                      icon: TrendingUp,
                      color: 'blue'
                    },
                    {
                      title: 'Pendente de Recebimento',
                      value: `R$ ${pendingRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                      subtitle: `${pendingOrders.length} pedidos`,
                      icon: Clock,
                      color: 'yellow'
                    },
                    {
                      title: 'Receita Recebida',
                      value: `R$ ${deliveredRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                      subtitle: `${deliveredOrders.length} pedidos`,
                      icon: CheckCircle,
                      color: 'green'
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
                            </div>
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${stat.color}-100`}>
                              <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ));
                })()}
              </div>

              {/* Financial Charts */}
              <div className="grid lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Receita por Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={(() => {
                            const statusData = [
                              { name: 'Entregue', value: orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + parseMoney(o.total), 0), color: '#10b981' },
                              { name: 'Pendente', value: orders.filter(o => o.status === 'pending').reduce((sum, o) => sum + parseMoney(o.total), 0), color: '#f59e0b' },
                              { name: 'Confirmado', value: orders.filter(o => o.status === 'confirmed').reduce((sum, o) => sum + parseMoney(o.total), 0), color: '#3b82f6' },
                              { name: 'Em Preparação', value: orders.filter(o => o.status === 'preparing').reduce((sum, o) => sum + parseMoney(o.total), 0), color: '#8b5cf6' },
                              { name: 'Em Entrega', value: orders.filter(o => o.status === 'out_for_delivery').reduce((sum, o) => sum + parseMoney(o.total), 0), color: '#06b6d4' },
                              { name: 'Cancelado', value: orders.filter(o => o.status === 'cancelled').reduce((sum, o) => sum + parseMoney(o.total), 0), color: '#ef4444' }
                            ].filter(item => item.value > 0);
                            return statusData;
                          })()}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {(() => {
                            const statusData = [
                              { name: 'Entregue', value: orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + parseMoney(o.total), 0), color: '#10b981' },
                              { name: 'Pendente', value: orders.filter(o => o.status === 'pending').reduce((sum, o) => sum + parseMoney(o.total), 0), color: '#f59e0b' },
                              { name: 'Confirmado', value: orders.filter(o => o.status === 'confirmed').reduce((sum, o) => sum + parseMoney(o.total), 0), color: '#3b82f6' },
                              { name: 'Em Preparação', value: orders.filter(o => o.status === 'preparing').reduce((sum, o) => sum + parseMoney(o.total), 0), color: '#8b5cf6' },
                              { name: 'Em Entrega', value: orders.filter(o => o.status === 'out_for_delivery').reduce((sum, o) => sum + parseMoney(o.total), 0), color: '#06b6d4' },
                              { name: 'Cancelado', value: orders.filter(o => o.status === 'cancelled').reduce((sum, o) => sum + parseMoney(o.total), 0), color: '#ef4444' }
                            ].filter(item => item.value > 0);
                            return statusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ));
                          })()}
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
                    <CardTitle>Receita Diária (Últimos 30 dias)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={(() => {
                        const days = [];
                        const now = new Date();
                        for (let i = 29; i >= 0; i--) {
                          const date = new Date(now);
                          date.setDate(date.getDate() - i);
                          const dayStart = new Date(date.setHours(0, 0, 0, 0));
                          const dayEnd = new Date(date.setHours(23, 59, 59, 999));
                          
                          const dayOrders = orders.filter(order => {
                            if (!order.created_date) return false;
                            const orderDate = parseISO(order.created_date);
                            return isWithinInterval(orderDate, { start: dayStart, end: dayEnd }) 
                              && order.status !== 'cancelled';
                          });
                          
                          const dayRevenue = dayOrders.reduce((sum, o) => sum + parseMoney(o.total), 0);
                          
                          days.push({
                            name: format(date, 'dd/MM', { locale: ptBR }),
                            value: dayRevenue
                          });
                        }
                        return days;
                      })()}>
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

              {/* Financial Transactions Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Movimentações Financeiras</CardTitle>
                </CardHeader>
                <CardContent>
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
                      {orders
                        .filter(o => o.status !== 'cancelled')
                        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
                        .slice(0, 20)
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
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              {/* Dashboard Executivo Completo - NOVO */}
              <ExecutiveDashboard 
                products={products}
                orders={orders}
                prescriptions={prescriptions}
                customers={[]}
              />

              {/* Stats Antigos (mantidos para compatibilidade) */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4" style={{display: 'none'}}>
                {[
                  {
                    title: 'Receita Total',
                    value: `R$ ${metrics.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    change: `${metrics.revenueChange >= 0 ? '+' : ''}${metrics.revenueChange.toFixed(1)}%`,
                    up: metrics.revenueChange >= 0,
                    icon: DollarSign,
                    color: 'emerald'
                  },
                  {
                    title: 'Pedidos',
                    value: metrics.totalOrders,
                    change: `${metrics.ordersChange >= 0 ? '+' : ''}${metrics.ordersChange.toFixed(1)}%`,
                    up: metrics.ordersChange >= 0,
                    icon: ShoppingCart,
                    color: 'blue'
                  },
                  {
                    title: 'Ticket Médio',
                    value: `R$ ${metrics.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    change: `${metrics.ticketChange >= 0 ? '+' : ''}${metrics.ticketChange.toFixed(1)}%`,
                    up: metrics.ticketChange >= 0,
                    icon: TrendingUp,
                    color: 'purple'
                  },
                  {
                    title: 'Produtos',
                    value: metrics.totalProducts,
                    change: `${metrics.lowStockCount} baixo estoque`,
                    up: false,
                    icon: Package,
                    color: 'orange'
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
                          <div>
                            <p className="text-sm text-gray-500">{stat.title}</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                            <div className={`flex items-center gap-1 mt-2 text-sm ${stat.up ? 'text-green-600' : 'text-orange-600'}`}>
                              {stat.up ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                              {stat.change}
                            </div>
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

              <div className="grid lg:grid-cols-3 gap-6">
                {/* Sales Chart */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Vendas por Mês</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={salesByMonth}>
                        <defs>
                          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" stroke="#9ca3af" />
                        <YAxis stroke="#9ca3af" />
                        <Tooltip 
                          formatter={(value) => [`R$ ${parseFloat(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Vendas']}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#10b981" 
                          strokeWidth={2}
                          fill="url(#colorValue)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Category Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle>Vendas por Categoria</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={salesByCategory}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {salesByCategory.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => `${parseFloat(value).toFixed(1)}%`}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-1 gap-2 mt-4">
                      {salesByCategory.map((cat, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                          <span className="text-gray-600 flex-1">{cat.name}</span>
                          <span className="font-medium">{cat.value}%</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                {/* Recent Orders */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Pedidos Recentes</CardTitle>
                    <Link to={createPageUrl('AdminOrders')}>
                      <Button variant="ghost" size="sm">Ver todos</Button>
                    </Link>
                  </CardHeader>
                  <CardContent>
                    {orders.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Pedido</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {orders
                            .filter(o => o.status !== 'cancelled')
                            .slice(0, 5)
                            .map((order) => (
                            <TableRow key={order.id}>
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
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8">
                        <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500">Nenhum pedido encontrado</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Low Stock Alert */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-orange-600">⚠️ Estoque Baixo</CardTitle>
                    <Link to={createPageUrl('AdminProducts')}>
                      <Button variant="ghost" size="sm">Gerenciar</Button>
                    </Link>
                  </CardHeader>
                  <CardContent>
                    {metrics.lowStockProducts.length > 0 ? (
                      <div className="space-y-3">
                        {metrics.lowStockProducts.slice(0, 5).map((product) => (
                          <div key={product.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <img
                                src={getProductImage(product)}
                                alt={product.name}
                                className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                                onError={(e) => {
                                  if (e.target.src !== getProductImage(product)) {
                                    e.target.src = getProductImage(product);
                                  }
                                }}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-gray-900 text-sm line-clamp-1">{product.name}</p>
                                <p className="text-xs text-gray-500">{product.sku || 'Sem SKU'}</p>
                              </div>
                            </div>
                            <Badge className="bg-orange-100 text-orange-800 flex-shrink-0 ml-2">
                              {product.stock_quantity || 0} un
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500">Nenhum produto com estoque baixo</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Recent Prescriptions */}
              {prescriptions.filter(p => p.status === 'pending').length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Receitas Pendentes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {prescriptions.filter(p => p.status === 'pending').slice(0, 3).map((prescription) => (
                        <div key={prescription.id} className="p-4 border rounded-xl">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <FileText className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{prescription.customer_name || 'Cliente'}</p>
                              <p className="text-sm text-gray-500">{prescription.customer_phone || 'Sem telefone'}</p>
                            </div>
                          </div>
                          <Link to={createPageUrl('AdminPrescriptions')}>
                            <Button variant="outline" size="sm" className="w-full">
                              Analisar
                            </Button>
                          </Link>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </motion.div>
      </motion.main>
    </div>
  );
}
