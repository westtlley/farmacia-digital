import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, ShoppingCart, Clock, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { getProductImage } from '@/utils/productImages';

/**
 * Recompra Fácil
 * Mostra histórico de compras e permite recomprar com 1 clique
 */
export default function EasyRepurchase({ customerId }) {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, [customerId]);

  const loadOrders = async () => {
    try {
      const user = await base44.auth.me();
      if (!user) return;

      const userOrders = await base44.entities.Order.filter({
        customer_email: user.email
      });

      // Ordenar por data mais recente
      const sorted = userOrders.sort((a, b) => 
        new Date(b.created_date) - new Date(a.created_date)
      ).slice(0, 10); // Últimos 10 pedidos

      setOrders(sorted);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRepurchase = (order) => {
    try {
      // Adicionar itens ao carrinho
      const cart = JSON.parse(localStorage.getItem('pharmacyCart') || '[]');

      order.items.forEach(item => {
        const existing = cart.find(c => c.id === item.product_id);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          cart.push({
            id: item.product_id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            image_url: item.image_url
          });
        }
      });

      localStorage.setItem('pharmacyCart', JSON.stringify(cart));
      window.dispatchEvent(new Event('cartUpdated'));

      toast.success('Produtos adicionados ao carrinho!', {
        description: `${order.items.length} item(ns) do pedido #${order.order_number}`
      });
    } catch (error) {
      toast.error('Erro ao adicionar produtos');
    }
  };

  const getFrequentProducts = () => {
    // Análise de produtos mais comprados
    const productCount = {};

    orders.forEach(order => {
      order.items?.forEach(item => {
        const id = item.product_id;
        if (productCount[id]) {
          productCount[id].count++;
          productCount[id].lastPurchase = order.created_date;
        } else {
          productCount[id] = {
            ...item,
            count: 1,
            lastPurchase: order.created_date
          };
        }
      });
    });

    return Object.values(productCount)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  };

  const frequentProducts = getFrequentProducts();

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <RefreshCw className="w-12 h-12 mx-auto text-gray-300 animate-spin mb-3" />
        <p className="text-gray-500">Carregando histórico...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <ShoppingCart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">
          Nenhuma compra anterior
        </h3>
        <p className="text-sm text-gray-500">
          Faça seu primeiro pedido para ver aqui!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Frequent Products */}
      {frequentProducts.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Seus Favoritos</h3>
              <p className="text-sm text-gray-600">Produtos que você compra mais</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {frequentProducts.map((product) => (
              <motion.div
                key={product.product_id}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="relative mb-3">
                  <img
                    src={getProductImage(product)}
                    alt={product.name}
                    className="w-full h-24 object-contain rounded-lg"
                  />
                  <Badge className="absolute top-2 right-2 bg-orange-500">
                    {product.count}x
                  </Badge>
                </div>

                <h4 className="font-medium text-sm text-gray-900 line-clamp-2 mb-2 min-h-[2.5rem]">
                  {product.name}
                </h4>

                <p className="text-lg font-bold text-emerald-600 mb-3">
                  R$ {product.price.toFixed(2)}
                </p>

                <Button
                  onClick={() => {
                    const cart = JSON.parse(localStorage.getItem('pharmacyCart') || '[]');
                    cart.push({
                      id: product.product_id,
                      name: product.name,
                      price: product.price,
                      quantity: 1
                    });
                    localStorage.setItem('pharmacyCart', JSON.stringify(cart));
                    window.dispatchEvent(new Event('cartUpdated'));
                    toast.success('Produto adicionado!');
                  }}
                  size="sm"
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  <ShoppingCart className="w-3 h-3 mr-1" />
                  Adicionar
                </Button>

                <p className="text-xs text-gray-500 text-center mt-2">
                  Última compra: {new Date(product.lastPurchase).toLocaleDateString('pt-BR')}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Orders */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Pedidos Anteriores</h3>
            <p className="text-sm text-gray-600">Compre novamente com 1 clique</p>
          </div>
        </div>

        <div className="space-y-3">
          {orders.map((order) => (
            <motion.div
              key={order.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-medium text-gray-900">
                    Pedido #{order.order_number}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(order.created_date).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <Badge 
                  variant={order.status === 'completed' ? 'success' : 'secondary'}
                  className="capitalize"
                >
                  {order.status}
                </Badge>
              </div>

              {/* Items preview */}
              <div className="flex flex-wrap gap-2 mb-3">
                {order.items?.slice(0, 3).map((item, idx) => (
                  <span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {item.name}
                  </span>
                ))}
                {order.items?.length > 3 && (
                  <span className="text-xs text-gray-500">
                    +{order.items.length - 3} item(ns)
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-xl font-bold text-gray-900">
                    R$ {order.total.toFixed(2)}
                  </p>
                </div>

                <Button
                  onClick={() => handleRepurchase(order)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Comprar Novamente
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
