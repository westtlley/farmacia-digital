import React from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp, AlertCircle, Gift, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatPriceWithSymbol } from '@/utils/priceFormat';
import { Link } from 'react-router-dom';

/**
 * Análise de Clientes
 * Top clientes e clientes em risco
 */

export default function CustomersAnalysis({ customers = [], orders = [] }) {
  // Calcular estatísticas por cliente
  const customerStats = {};

  orders.forEach(order => {
    if (order.status === 'cancelled') return;
    
    const customerId = order.customer_id;
    if (!customerId) return;

    if (!customerStats[customerId]) {
      customerStats[customerId] = {
        customer: customers.find(c => c.id === customerId),
        totalSpent: 0,
        orderCount: 0,
        lastOrderDate: null,
        averageTicket: 0
      };
    }

    customerStats[customerId].totalSpent += order.total_amount || 0;
    customerStats[customerId].orderCount += 1;
    
    const orderDate = new Date(order.created_date);
    if (!customerStats[customerId].lastOrderDate || orderDate > customerStats[customerId].lastOrderDate) {
      customerStats[customerId].lastOrderDate = orderDate;
    }
  });

  // Calcular ticket médio
  Object.keys(customerStats).forEach(customerId => {
    const stats = customerStats[customerId];
    stats.averageTicket = stats.orderCount > 0 
      ? stats.totalSpent / stats.orderCount 
      : 0;
  });

  // Converter para array
  const customerStatsArray = Object.entries(customerStats)
    .map(([id, stats]) => ({ id, ...stats }))
    .filter(s => s.customer); // Remover clientes sem dados

  // TOP 10 CLIENTES (por valor total)
  const topCustomers = customerStatsArray
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10);

  // CLIENTES EM RISCO (não compram há 30+ dias)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const atRiskCustomers = customerStatsArray
    .filter(s => s.lastOrderDate && s.lastOrderDate < thirtyDaysAgo)
    .sort((a, b) => a.lastOrderDate - b.lastOrderDate)
    .slice(0, 10);

  // Calcular total gasto pelos top clientes
  const topCustomersTotal = topCustomers.reduce((sum, c) => sum + c.totalSpent, 0);
  const allCustomersTotal = customerStatsArray.reduce((sum, c) => sum + c.totalSpent, 0);
  const topCustomersPercentage = allCustomersTotal > 0 
    ? (topCustomersTotal / allCustomersTotal) * 100 
    : 0;

  const getDaysSinceLastOrder = (lastOrderDate) => {
    if (!lastOrderDate) return 0;
    const now = new Date();
    const diff = now - lastOrderDate;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Top Clientes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            🏆 Top 10 Clientes
          </CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            Representam {topCustomersPercentage.toFixed(1)}% do faturamento total
          </p>
        </CardHeader>
        <CardContent>
          {topCustomers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>Nenhum cliente com pedidos ainda</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topCustomers.map((customerStat, index) => {
                const customer = customerStat.customer;
                if (!customer) return null;

                return (
                  <motion.div
                    key={customer.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-shrink-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                        index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                        index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                        index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600' :
                        'bg-gradient-to-br from-blue-500 to-blue-600'
                      }`}>
                        #{index + 1}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {customer.name || 'Cliente sem nome'}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>{customerStat.orderCount} pedido(s)</span>
                        <span>•</span>
                        <span>Ticket: {formatPriceWithSymbol(customerStat.averageTicket)}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-green-600">
                        {formatPriceWithSymbol(customerStat.totalSpent)}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        <Gift className="w-3 h-3 mr-1" />
                        VIP
                      </Badge>
                    </div>
                  </motion.div>
                );
              })}

              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  💡 <strong>Sugestão:</strong> Envie um cupom de agradecimento para esses clientes VIP!
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clientes em Risco */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            ⚠️ Clientes em Risco
          </CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            Não compram há 30+ dias
          </p>
        </CardHeader>
        <CardContent>
          {atRiskCustomers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <TrendingUp className="w-12 h-12 mx-auto mb-2 text-green-300" />
              <p className="font-medium text-green-600">Excelente!</p>
              <p className="text-sm">Todos os clientes estão ativos</p>
            </div>
          ) : (
            <div className="space-y-3">
              {atRiskCustomers.map((customerStat, index) => {
                const customer = customerStat.customer;
                if (!customer) return null;

                const daysSince = getDaysSinceLastOrder(customerStat.lastOrderDate);

                return (
                  <motion.div
                    key={customer.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-orange-600" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {customer.name || 'Cliente sem nome'}
                      </p>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-orange-600 font-medium">
                          Há {daysSince} dias
                        </span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-500">
                          {customerStat.orderCount} pedido(s) total
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {formatPriceWithSymbol(customerStat.totalSpent)}
                      </p>
                      <p className="text-xs text-gray-500">LTV total</p>
                    </div>
                  </motion.div>
                );
              })}

              <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-800 mb-2">
                  💡 <strong>Ação recomendada:</strong> Reconquiste esses clientes!
                </p>
                <ul className="text-xs text-orange-700 space-y-1 ml-4">
                  <li>• Enviar cupom de 15% OFF por WhatsApp</li>
                  <li>• Lembrar de produtos que costumavam comprar</li>
                  <li>• Oferecer frete grátis na próxima compra</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
