import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  Clock, 
  Flame, 
  MapPin,
  ShoppingCart,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { createPageUrl } from '@/utils';
import { getProductImage } from '@/utils/productImages';
import { 
  FlashSalesManager, 
  formatTimeRemaining,
  formatSaleProgress 
} from '@/utils/flashSales';
import { toast } from 'sonner';

/**
 * Widget de Flash Sales Regionais
 * Exibe ofertas relâmpago específicas por bairro
 */
export default function FlashSalesWidget({ zipCode = '', compact = false }) {
  const [manager] = useState(() => new FlashSalesManager());
  const [activeSales, setActiveSales] = useState([]);
  const [upcomingSales, setUpcomingSales] = useState([]);
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    updateSales();

    // Atualizar a cada segundo para countdown
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
      updateSales();
    }, 1000);

    return () => clearInterval(interval);
  }, [zipCode]);

  const updateSales = () => {
    setActiveSales(manager.getActiveSales(zipCode));
    setUpcomingSales(manager.getUpcomingSales(zipCode));
  };

  const handleAddToCart = (sale) => {
    try {
      // Verificar se pode comprar
      const check = sale.canPurchase(zipCode, 1);
      if (!check.can) {
        toast.error(check.reason);
        return;
      }

      // Adicionar ao carrinho
      const cart = JSON.parse(localStorage.getItem('pharmacyCart') || '[]');
      const existing = cart.find(item => item.id === sale.productId);

      if (existing) {
        // Verificar se não excede máximo por cliente
        if (existing.quantity >= sale.maxPerCustomer) {
          toast.error(`Máximo ${sale.maxPerCustomer} unidades por cliente`);
          return;
        }
        existing.quantity += 1;
        existing.flashSale = {
          id: sale.id,
          originalPrice: sale.originalPrice,
          discount: sale.originalPrice - sale.salePrice
        };
      } else {
        cart.push({
          id: sale.productId,
          name: sale.productName,
          price: sale.salePrice,
          original_price: sale.originalPrice,
          quantity: 1,
          image_url: sale.imageUrl,
          flashSale: {
            id: sale.id,
            originalPrice: sale.originalPrice,
            discount: sale.originalPrice - sale.salePrice
          }
        });
      }

      localStorage.setItem('pharmacyCart', JSON.stringify(cart));
      window.dispatchEvent(new Event('cartUpdated'));
      
      toast.success(`${sale.productName} adicionado ao carrinho!`, {
        description: `Você economizou R$ ${(sale.originalPrice - sale.salePrice).toFixed(2)}`
      });
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (activeSales.length === 0 && upcomingSales.length === 0) {
    return null;
  }

  // Versão compacta para sidebars
  if (compact) {
    const sale = activeSales[0] || upcomingSales[0];
    if (!sale) return null;

    const time = sale.getTimeRemaining();
    const isActive = sale.isActive();

    return (
      <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-xl p-4 text-white">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4" />
          <p className="text-xs font-bold uppercase">Flash Sale</p>
        </div>
        <p className="text-sm font-medium mb-2 line-clamp-1">{sale.title}</p>
        <div className="flex items-center gap-2 text-xs">
          <Clock className="w-3 h-3" />
          <span>{formatTimeRemaining(time)}</span>
        </div>
      </div>
    );
  }

  // Versão completa
  return (
    <div className="space-y-6">
      {/* Active Sales */}
      {activeSales.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Flash Sales Ativas</h3>
              <p className="text-sm text-gray-600">Ofertas relâmpago da sua região</p>
            </div>
          </div>

          <div className="grid gap-4">
            <AnimatePresence>
              {activeSales.map((sale) => (
                <FlashSaleCard
                  key={sale.id}
                  sale={sale}
                  onAddToCart={handleAddToCart}
                  currentTime={currentTime}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Upcoming Sales */}
      {upcomingSales.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Próximas Ofertas</h3>
              <p className="text-sm text-gray-600">Fique atento!</p>
            </div>
          </div>

          <div className="grid gap-4">
            {upcomingSales.map((sale) => (
              <UpcomingSaleCard
                key={sale.id}
                sale={sale}
                currentTime={currentTime}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Card de Flash Sale Ativa
 */
function FlashSaleCard({ sale, onAddToCart, currentTime }) {
  const time = sale.getTimeRemaining();
  const progress = sale.getProgress();
  const saved = sale.originalPrice - sale.salePrice;

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-5 border-2 border-orange-200 shadow-lg hover:shadow-xl transition-shadow relative overflow-hidden"
    >
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-red-500/10 animate-pulse" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-gradient-to-r from-orange-500 to-red-600 text-white">
                <Flame className="w-3 h-3 mr-1" />
                -{sale.discountPercent}%
              </Badge>
              {sale.neighborhoods.length > 0 && (
                <Badge variant="outline" className="border-orange-300 text-orange-700">
                  <MapPin className="w-3 h-3 mr-1" />
                  {sale.neighborhoods.join(', ')}
                </Badge>
              )}
            </div>
            <h4 className="font-bold text-gray-900 text-lg mb-1">{sale.productName}</h4>
            <p className="text-sm text-gray-600">{sale.description}</p>
          </div>
        </div>

        {/* Prices */}
        <div className="flex items-end gap-3 mb-4">
          <div>
            <p className="text-xs text-gray-500 line-through">De R$ {sale.originalPrice.toFixed(2)}</p>
            <p className="text-3xl font-bold text-orange-600">
              R$ {sale.salePrice.toFixed(2)}
            </p>
          </div>
          <div className="mb-2">
            <Badge className="bg-green-500 text-white">
              Economize R$ {saved.toFixed(2)}
            </Badge>
          </div>
        </div>

        {/* Stock Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-gray-600">{formatSaleProgress(sale)}</span>
            <span className="font-bold text-orange-600">{progress}% vendido</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Countdown */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-red-600" />
            <span className="font-mono font-bold text-red-600">
              {formatTimeRemaining(time)}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            Máx. {sale.maxPerCustomer} por cliente
          </p>
        </div>

        {/* Action Button */}
        <Button
          onClick={() => onAddToCart(sale)}
          className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 h-12 text-base font-bold"
          disabled={sale.stock === 0}
        >
          {sale.stock === 0 ? (
            'Esgotado'
          ) : (
            <>
              <ShoppingCart className="w-5 h-5 mr-2" />
              Adicionar ao Carrinho
            </>
          )}
        </Button>

        {/* Urgency Message */}
        {sale.stock < 10 && sale.stock > 0 && (
          <div className="mt-3 flex items-center gap-2 text-xs text-red-600">
            <AlertCircle className="w-4 h-4" />
            <span className="font-medium">Últimas unidades! Corra!</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Card de Flash Sale Futura
 */
function UpcomingSaleCard({ sale, currentTime }) {
  const time = sale.getTimeRemaining();

  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-5 border-2 border-blue-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white mb-2">
            <Clock className="w-3 h-3 mr-1" />
            Em Breve
          </Badge>
          <h4 className="font-bold text-gray-900 mb-1">{sale.productName}</h4>
          <p className="text-sm text-gray-600">{sale.description}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 line-through">De R$ {sale.originalPrice.toFixed(2)}</p>
          <p className="text-2xl font-bold text-purple-600">
            R$ {sale.salePrice.toFixed(2)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 mb-1">Começa em:</p>
          <p className="font-mono font-bold text-blue-600">
            {formatTimeRemaining(time)}
          </p>
        </div>
      </div>

      {sale.neighborhoods.length > 0 && (
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-600">
          <MapPin className="w-3 h-3" />
          <span>Válido para: {sale.neighborhoods.join(', ')}</span>
        </div>
      )}
    </div>
  );
}
