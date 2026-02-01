import React from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  ShoppingCart, 
  TrendingUp, 
  Users, 
  Package,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatPriceWithSymbol } from '@/utils/priceFormat';

/**
 * Quick Metrics - KPIs principais em cards grandes
 * Visão rápida dos indicadores chave do negócio
 */

export default function QuickMetrics({ orders = [], products = [], customers = [] }) {
  // VENDAS HOJE
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayOrders = orders.filter(o => {
    const orderDate = new Date(o.created_date);
    return orderDate >= today && o.status !== 'cancelled';
  });

  const todaySales = todayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

  // VENDAS ONTEM (para comparação)
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const yesterdayOrders = orders.filter(o => {
    const orderDate = new Date(o.created_date);
    return orderDate >= yesterday && orderDate < today && o.status !== 'cancelled';
  });

  const yesterdaySales = yesterdayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

  const salesChange = yesterdaySales > 0 
    ? ((todaySales - yesterdaySales) / yesterdaySales) * 100 
    : todaySales > 0 ? 100 : 0;

  // PEDIDOS HOJE
  const todayOrdersCount = todayOrders.length;
  const yesterdayOrdersCount = yesterdayOrders.length;
  const ordersChange = yesterdayOrdersCount > 0
    ? ((todayOrdersCount - yesterdayOrdersCount) / yesterdayOrdersCount) * 100
    : todayOrdersCount > 0 ? 100 : 0;

  // TICKET MÉDIO
  const avgTicket = todayOrdersCount > 0 ? todaySales / todayOrdersCount : 0;
  const yesterdayAvgTicket = yesterdayOrdersCount > 0 
    ? yesterdaySales / yesterdayOrdersCount 
    : 0;
  const ticketChange = yesterdayAvgTicket > 0
    ? ((avgTicket - yesterdayAvgTicket) / yesterdayAvgTicket) * 100
    : avgTicket > 0 ? 100 : 0;

  // CLIENTES NOVOS HOJE
  const newCustomersToday = customers.filter(c => {
    const createdDate = new Date(c.created_date);
    return createdDate >= today;
  }).length;

  // PRODUTOS ATIVOS
  const activeProducts = products.filter(p => p.status === 'active').length;

  // TAXA DE CONVERSÃO (simulada - seria melhor com dados reais de visitas)
  const conversionRate = 3.2; // Placeholder - integrar com analytics real

  const metrics = [
    {
      id: 'sales',
      title: 'Vendas Hoje',
      value: formatPriceWithSymbol(todaySales),
      change: salesChange,
      icon: DollarSign,
      color: 'emerald',
      bgColor: 'bg-emerald-500',
      description: `${todayOrdersCount} pedido(s)`
    },
    {
      id: 'orders',
      title: 'Pedidos Hoje',
      value: todayOrdersCount,
      change: ordersChange,
      icon: ShoppingCart,
      color: 'blue',
      bgColor: 'bg-blue-500',
      description: 'pedidos realizados'
    },
    {
      id: 'ticket',
      title: 'Ticket Médio',
      value: formatPriceWithSymbol(avgTicket),
      change: ticketChange,
      icon: TrendingUp,
      color: 'purple',
      bgColor: 'bg-purple-500',
      description: 'por pedido'
    },
    {
      id: 'customers',
      title: 'Clientes Novos',
      value: newCustomersToday,
      change: null,
      icon: Users,
      color: 'orange',
      bgColor: 'bg-orange-500',
      description: 'cadastros hoje'
    },
    {
      id: 'products',
      title: 'Produtos Ativos',
      value: activeProducts,
      change: null,
      icon: Package,
      color: 'teal',
      bgColor: 'bg-teal-500',
      description: 'disponíveis'
    },
    {
      id: 'conversion',
      title: 'Taxa Conversão',
      value: `${conversionRate.toFixed(1)}%`,
      change: 0.4,
      icon: BarChart3,
      color: 'pink',
      bgColor: 'bg-pink-500',
      description: 'visitantes que compram'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        const hasPositiveChange = metric.change !== null && metric.change > 0;
        const hasNegativeChange = metric.change !== null && metric.change < 0;

        return (
          <motion.div
            key={metric.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{metric.title}</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {metric.value}
                    </p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl ${metric.bgColor} flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">{metric.description}</p>
                  
                  {metric.change !== null && (
                    <div className={`flex items-center gap-1 text-xs font-semibold ${
                      hasPositiveChange ? 'text-green-600' : hasNegativeChange ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {hasPositiveChange && <ArrowUpRight className="w-3 h-3" />}
                      {hasNegativeChange && <ArrowDownRight className="w-3 h-3" />}
                      {Math.abs(metric.change).toFixed(1)}% vs ontem
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
