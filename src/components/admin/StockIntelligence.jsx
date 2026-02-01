import React from 'react';
import { motion } from 'framer-motion';
import { Package, AlertTriangle, TrendingUp, ShoppingBag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatPriceWithSymbol } from '@/utils/priceFormat';
import { getProductImage } from '@/utils/productImages';
import { Link } from 'react-router-dom';

/**
 * Gestão Inteligente de Estoque
 * Avisos proativos e sugestões de compra
 */

export default function StockIntelligence({ products = [], orders = [] }) {
  // Calcular velocidade de vendas (últimos 30 dias)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentOrders = orders.filter(o => {
    const orderDate = new Date(o.created_date);
    return orderDate >= thirtyDaysAgo && o.status !== 'cancelled';
  });

  // Contar vendas por produto nos últimos 30 dias
  const productSalesVelocity = {};
  
  recentOrders.forEach(order => {
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach(item => {
        const productId = item.product_id || item.product?.id;
        if (!productId) return;

        if (!productSalesVelocity[productId]) {
          productSalesVelocity[productId] = {
            quantity: 0,
            product: item.product || products.find(p => p.id === productId)
          };
        }

        productSalesVelocity[productId].quantity += item.quantity || 1;
      });
    }
  });

  // Calcular vendas por dia
  Object.keys(productSalesVelocity).forEach(productId => {
    productSalesVelocity[productId].dailySales = 
      productSalesVelocity[productId].quantity / 30;
  });

  // CRÍTICO: Produtos sem estoque que vendem
  const criticalProducts = products.filter(p => {
    if (p.has_infinite_stock || p.status !== 'active') return false;
    const stock = p.stock_quantity || 0;
    const velocity = productSalesVelocity[p.id];
    return stock === 0 && velocity && velocity.dailySales > 0;
  }).map(p => ({
    ...p,
    dailySales: productSalesVelocity[p.id].dailySales,
    daysUntilOut: 0,
    suggested: Math.ceil(productSalesVelocity[p.id].dailySales * 30) // 30 dias
  }));

  // ATENÇÃO: Produtos com estoque baixo
  const warningProducts = products.filter(p => {
    if (p.has_infinite_stock || p.status !== 'active') return false;
    const stock = p.stock_quantity || 0;
    const velocity = productSalesVelocity[p.id];
    if (!velocity || velocity.dailySales === 0) return false;
    const daysUntilOut = stock / velocity.dailySales;
    return stock > 0 && stock <= 10 && daysUntilOut <= 7;
  }).map(p => ({
    ...p,
    dailySales: productSalesVelocity[p.id].dailySales,
    daysUntilOut: Math.ceil((p.stock_quantity || 0) / productSalesVelocity[p.id].dailySales),
    suggested: Math.ceil(productSalesVelocity[p.id].dailySales * 30)
  })).sort((a, b) => a.daysUntilOut - b.daysUntilOut);

  // BOM: Produtos com estoque saudável
  const healthyProducts = products.filter(p => {
    if (p.has_infinite_stock || p.status !== 'active') return false;
    const stock = p.stock_quantity || 0;
    const velocity = productSalesVelocity[p.id];
    if (!velocity || velocity.dailySales === 0) return stock > 10;
    const daysUntilOut = stock / velocity.dailySales;
    return stock > 0 && daysUntilOut > 7;
  }).length;

  const totalActive = products.filter(p => p.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Visão Geral */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 mb-1">Crítico</p>
                <p className="text-3xl font-bold text-red-900">
                  {criticalProducts.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-xs text-red-600 mt-2">Sem estoque (repor hoje)</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600 mb-1">Atenção</p>
                <p className="text-3xl font-bold text-yellow-900">
                  {warningProducts.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-xs text-yellow-600 mt-2">Estoque baixo (repor em breve)</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 mb-1">Saudável</p>
                <p className="text-3xl font-bold text-green-900">
                  {healthyProducts}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-xs text-green-600 mt-2">
              {Math.round((healthyProducts / totalActive) * 100)}% do estoque ativo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Produtos Críticos */}
      {criticalProducts.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-900">
              <AlertTriangle className="w-5 h-5" />
              🚨 Crítico - Repor HOJE
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {criticalProducts.slice(0, 5).map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-4 p-3 bg-white rounded-lg border border-red-100"
                >
                  <img
                    src={getProductImage(product)}
                    alt={product.name}
                    className="w-12 h-12 object-contain rounded"
                  />
                  
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-red-600">
                      <strong>SEM ESTOQUE</strong> • Vende{' '}
                      {Math.round(product.dailySales)} un/dia
                    </p>
                  </div>

                  <div className="text-right">
                    <Badge variant="destructive" className="mb-1">
                      Estoque: 0
                    </Badge>
                    <p className="text-xs text-gray-600">
                      Sugestão: <strong>{product.suggested} un</strong>
                    </p>
                    <p className="text-xs text-gray-500">
                      (30 dias)
                    </p>
                  </div>
                </motion.div>
              ))}

              {criticalProducts.length > 5 && (
                <div className="text-center pt-2">
                  <Link to="/AdminProducts">
                    <Button variant="outline" size="sm">
                      Ver todos ({criticalProducts.length})
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Produtos em Atenção */}
      {warningProducts.length > 0 && (
        <Card className="border-yellow-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-900">
              <Package className="w-5 h-5" />
              ⚠️ Atenção - Repor em breve
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {warningProducts.slice(0, 5).map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-4 p-3 bg-white rounded-lg border border-yellow-100"
                >
                  <img
                    src={getProductImage(product)}
                    alt={product.name}
                    className="w-12 h-12 object-contain rounded"
                  />
                  
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-yellow-600">
                      Acaba em <strong>{product.daysUntilOut} dia(s)</strong> •{' '}
                      Vende {Math.round(product.dailySales)} un/dia
                    </p>
                  </div>

                  <div className="text-right">
                    <Badge variant="outline" className="mb-1 border-yellow-500 text-yellow-700">
                      Estoque: {product.stock_quantity}
                    </Badge>
                    <p className="text-xs text-gray-600">
                      Sugestão: <strong>{product.suggested} un</strong>
                    </p>
                  </div>
                </motion.div>
              ))}

              {warningProducts.length > 5 && (
                <div className="text-center pt-2">
                  <Link to="/AdminProducts">
                    <Button variant="outline" size="sm">
                      Ver todos ({warningProducts.length})
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tudo certo */}
      {criticalProducts.length === 0 && warningProducts.length === 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-green-900 mb-2">
              Estoque Saudável! 🎉
            </h3>
            <p className="text-green-700">
              Todos os produtos ativos têm estoque suficiente
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
