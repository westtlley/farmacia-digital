import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatPriceWithSymbol } from '@/utils/priceFormat';
import { getProductImage } from '@/utils/productImages';

/**
 * Top Produtos - Mais e menos vendidos
 * Ajuda a identificar o que está funcionando
 */

export default function TopProducts({ orders = [], products = [] }) {
  // Calcular vendas por produto (últimos 7 dias)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentOrders = orders.filter(o => {
    const orderDate = new Date(o.created_date);
    return orderDate >= sevenDaysAgo && o.status !== 'cancelled';
  });

  // Contar vendas por produto
  const productSales = {};
  
  recentOrders.forEach(order => {
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach(item => {
        const productId = item.product_id || item.product?.id;
        if (!productId) return;

        if (!productSales[productId]) {
          productSales[productId] = {
            quantity: 0,
            revenue: 0,
            product: item.product || products.find(p => p.id === productId)
          };
        }

        productSales[productId].quantity += item.quantity || 1;
        productSales[productId].revenue += (item.price || 0) * (item.quantity || 1);
      });
    }
  });

  // Converter para array e ordenar
  const productSalesArray = Object.entries(productSales).map(([id, data]) => ({
    id,
    ...data
  }));

  // Top 5 mais vendidos
  const topSelling = productSalesArray
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  // Produtos que não venderam (últimos 30 dias)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const oldOrders = orders.filter(o => {
    const orderDate = new Date(o.created_date);
    return orderDate >= thirtyDaysAgo && o.status !== 'cancelled';
  });

  const soldProductIds = new Set();
  oldOrders.forEach(order => {
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach(item => {
        const productId = item.product_id || item.product?.id;
        if (productId) soldProductIds.add(productId);
      });
    }
  });

  const notSelling = products
    .filter(p => p.status === 'active' && !soldProductIds.has(p.id))
    .slice(0, 5);

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Mais Vendidos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Top 5 Mais Vendidos (7 dias)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topSelling.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>Nenhuma venda nos últimos 7 dias</p>
            </div>
          ) : (
            <div className="space-y-4">
              {topSelling.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      #{index + 1}
                    </div>
                  </div>
                  
                  {item.product && (
                    <div className="flex-shrink-0">
                      <img
                        src={getProductImage(item.product)}
                        alt={item.product.name}
                        className="w-12 h-12 object-contain rounded"
                      />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {item.product?.name || 'Produto desconhecido'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {item.quantity} unidade(s) vendida(s)
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold text-green-600">
                      {formatPriceWithSymbol(item.revenue)}
                    </p>
                    <p className="text-xs text-gray-500">receita</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Não Vendendo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-orange-600" />
            Produtos Parados (30 dias)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notSelling.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <TrendingUp className="w-12 h-12 mx-auto mb-2 text-green-300" />
              <p className="font-medium text-green-600">Excelente!</p>
              <p className="text-sm">Todos os produtos estão vendendo</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notSelling.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-shrink-0">
                    <img
                      src={getProductImage(product)}
                      alt={product.name}
                      className="w-12 h-12 object-contain rounded"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {product.name}
                    </p>
                    <p className="text-sm text-orange-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Sem vendas há 30+ dias
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatPriceWithSymbol(product.price)}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      Estoque: {product.stock_quantity || 0}
                    </Badge>
                  </div>
                </motion.div>
              ))}

              <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-800">
                  💡 <strong>Sugestão:</strong> Crie uma promoção ou destaque esses produtos na home
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
