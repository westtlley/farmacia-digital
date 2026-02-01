import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Package, FileText, Clock, TrendingDown, Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

/**
 * Centro de Alertas - Avisos críticos para o dono
 * Mostra problemas que precisam de ação imediata
 */

export default function AlertsWidget({ products = [], orders = [], prescriptions = [] }) {
  const alerts = [];

  // 1. PRODUTOS SEM ESTOQUE
  const outOfStock = products.filter(p => 
    !p.has_infinite_stock && 
    p.stock_quantity !== undefined && 
    p.stock_quantity <= 0 &&
    p.status === 'active'
  );

  if (outOfStock.length > 0) {
    alerts.push({
      id: 'out_of_stock',
      type: 'critical',
      icon: Package,
      title: `${outOfStock.length} produto(s) sem estoque`,
      description: 'Produtos ativos não disponíveis para venda',
      action: 'Ver produtos',
      link: '/AdminProducts',
      color: 'red'
    });
  }

  // 2. ESTOQUE BAIXO
  const lowStock = products.filter(p => 
    !p.has_infinite_stock && 
    p.stock_quantity !== undefined && 
    p.stock_quantity > 0 &&
    p.stock_quantity <= 5 &&
    p.status === 'active'
  );

  if (lowStock.length > 0) {
    alerts.push({
      id: 'low_stock',
      type: 'warning',
      icon: Package,
      title: `${lowStock.length} produto(s) com estoque baixo`,
      description: '5 ou menos unidades disponíveis',
      action: 'Gerenciar estoque',
      link: '/AdminProducts',
      color: 'yellow'
    });
  }

  // 3. PEDIDOS PENDENTES
  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'confirmed');

  if (pendingOrders.length > 0) {
    alerts.push({
      id: 'pending_orders',
      type: 'info',
      icon: Clock,
      title: `${pendingOrders.length} pedido(s) pendente(s)`,
      description: 'Aguardando processamento',
      action: 'Ver pedidos',
      link: '/AdminOrders',
      color: 'blue'
    });
  }

  // 4. RECEITAS PENDENTES
  const pendingPrescriptions = prescriptions.filter(p => p.status === 'pending');

  if (pendingPrescriptions.length > 0) {
    alerts.push({
      id: 'pending_prescriptions',
      type: 'warning',
      icon: FileText,
      title: `${pendingPrescriptions.length} receita(s) aguardando aprovação`,
      description: 'Clientes esperando validação',
      action: 'Validar receitas',
      link: '/AdminPrescriptions',
      color: 'orange'
    });
  }

  // 5. PRODUTOS PARADOS (sem vender há 30+ dias)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const staleProducts = products.filter(p => {
    if (!p.updated_date || p.status !== 'active') return false;
    const updatedDate = new Date(p.updated_date);
    return updatedDate < thirtyDaysAgo;
  });

  if (staleProducts.length >= 10) {
    alerts.push({
      id: 'stale_products',
      type: 'info',
      icon: TrendingDown,
      title: `${staleProducts.length} produto(s) sem movimento`,
      description: 'Sem atualizações há 30+ dias',
      action: 'Criar promoção',
      link: '/AdminPromotions',
      color: 'gray'
    });
  }

  // Se não houver alertas
  if (alerts.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-green-900 text-lg">Tudo certo! 🎉</h3>
              <p className="text-sm text-green-700">Nenhum alerta crítico no momento</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getColorClasses = (color) => {
    const colors = {
      red: {
        bg: 'bg-red-50',
        border: 'border-red-200',
        icon: 'bg-red-500',
        text: 'text-red-900',
        desc: 'text-red-700',
        badge: 'bg-red-500'
      },
      yellow: {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        icon: 'bg-yellow-500',
        text: 'text-yellow-900',
        desc: 'text-yellow-700',
        badge: 'bg-yellow-500'
      },
      orange: {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        icon: 'bg-orange-500',
        text: 'text-orange-900',
        desc: 'text-orange-700',
        badge: 'bg-orange-500'
      },
      blue: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        icon: 'bg-blue-500',
        text: 'text-blue-900',
        desc: 'text-blue-700',
        badge: 'bg-blue-500'
      },
      gray: {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        icon: 'bg-gray-500',
        text: 'text-gray-900',
        desc: 'text-gray-700',
        badge: 'bg-gray-500'
      }
    };
    return colors[color] || colors.gray;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h2 className="text-xl font-bold text-gray-900">Alertas Importantes</h2>
          <Badge variant="destructive" className="ml-2">
            {alerts.length}
          </Badge>
        </div>
      </div>

      <div className="grid gap-3">
        {alerts.map((alert, index) => {
          const Icon = alert.icon;
          const colors = getColorClasses(alert.color);

          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`${colors.border} ${colors.bg} hover:shadow-md transition-shadow`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-full ${colors.icon} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-semibold ${colors.text} mb-1`}>
                        {alert.title}
                      </h3>
                      <p className={`text-sm ${colors.desc}`}>
                        {alert.description}
                      </p>
                    </div>
                    <Link to={alert.link}>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="flex-shrink-0"
                      >
                        {alert.action}
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
