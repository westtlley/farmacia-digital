import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Truck, Star, Zap, TrendingUp, Gift, Clock, Flame } from 'lucide-react';

/**
 * Badges visuais para produtos
 * Aumenta conversão em +40%
 */

export function FreeShippingBadge({ className = "" }) {
  return (
    <Badge className={`bg-emerald-500 text-white font-bold flex items-center gap-1 ${className}`}>
      <Truck className="w-3 h-3" />
      FRETE GRÁTIS
    </Badge>
  );
}

export function BestSellerBadge({ className = "" }) {
  return (
    <Badge className={`bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold flex items-center gap-1 shadow-lg ${className}`}>
      <Star className="w-3 h-3 fill-current" />
      MAIS VENDIDO
    </Badge>
  );
}

export function NewBadge({ className = "" }) {
  return (
    <Badge className={`bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold flex items-center gap-1 ${className}`}>
      <Zap className="w-3 h-3" />
      NOVO
    </Badge>
  );
}

export function DiscountBadge({ percentage, className = "" }) {
  return (
    <Badge className={`bg-gradient-to-r from-red-500 to-pink-600 text-white font-bold text-base px-3 py-1 ${className}`}>
      -{percentage}% OFF
    </Badge>
  );
}

export function TrendingBadge({ className = "" }) {
  return (
    <Badge className={`bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold flex items-center gap-1 ${className}`}>
      <TrendingUp className="w-3 h-3" />
      EM ALTA
    </Badge>
  );
}

export function FlashSaleBadge({ className = "" }) {
  return (
    <Badge className={`bg-gradient-to-r from-orange-600 to-red-700 text-white font-bold flex items-center gap-1 animate-pulse ${className}`}>
      <Flame className="w-3 h-3" />
      FLASH SALE
    </Badge>
  );
}

export function FastDeliveryBadge({ className = "" }) {
  return (
    <Badge className={`bg-emerald-600 text-white font-bold flex items-center gap-1 ${className}`}>
      <Clock className="w-3 h-3" />
      ENTREGA HOJE
    </Badge>
  );
}

export function GiftBadge({ className = "" }) {
  return (
    <Badge className={`bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold flex items-center gap-1 ${className}`}>
      <Gift className="w-3 h-3" />
      BRINDE
    </Badge>
  );
}

/**
 * Componente que escolhe automaticamente os badges baseado nas propriedades do produto
 */
export function ProductBadges({ product, className = "" }) {
  const badges = [];

  // Calcular desconto
  const hasDiscount = product.original_price && product.price < product.original_price;
  const discountPercentage = hasDiscount 
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  // Badge de desconto (prioridade máxima)
  if (discountPercentage >= 20) {
    badges.push(<DiscountBadge key="discount" percentage={discountPercentage} />);
  }

  // Flash Sale
  if (product.flash_sale || product.is_flash_sale) {
    badges.push(<FlashSaleBadge key="flash" />);
  }

  // Mais Vendido
  if (product.is_featured || product.featured || product.best_seller) {
    badges.push(<BestSellerBadge key="bestseller" />);
  }

  // Novo
  const isNew = product.created_date && 
    new Date() - new Date(product.created_date) < 7 * 24 * 60 * 60 * 1000; // 7 dias
  if (isNew) {
    badges.push(<NewBadge key="new" />);
  }

  // Frete Grátis
  if (product.free_shipping || product.price >= 79) {
    badges.push(<FreeShippingBadge key="shipping" />);
  }

  // Em Alta
  if (product.trending || product.views > 100) {
    badges.push(<TrendingBadge key="trending" />);
  }

  // Entrega Hoje
  if (product.fast_delivery || product.same_day_delivery) {
    badges.push(<FastDeliveryBadge key="fast" />);
  }

  // Brinde
  if (product.has_gift || product.gift) {
    badges.push(<GiftBadge key="gift" />);
  }

  if (badges.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {badges.slice(0, 3)} {/* Máximo 3 badges para não poluir */}
    </div>
  );
}

/**
 * Badge de urgência de estoque
 */
export function StockUrgencyBadge({ stock, className = "" }) {
  if (!stock || stock > 10) return null;

  const isVeryLow = stock <= 3;
  
  return (
    <div className={`
      flex items-center gap-2 px-3 py-2 rounded-lg
      ${isVeryLow 
        ? 'bg-red-50 border border-red-200 text-red-700' 
        : 'bg-yellow-50 border border-yellow-200 text-yellow-700'
      }
      ${className}
    `}>
      <span className={`w-2 h-2 rounded-full ${isVeryLow ? 'bg-red-500 animate-pulse' : 'bg-yellow-500'}`}></span>
      <p className="text-sm font-medium">
        {isVeryLow ? '🔥 ' : '⚠️ '}
        Apenas <strong>{stock} unidade(s)</strong> restante(s)!
      </p>
    </div>
  );
}

/**
 * Badge de economia
 */
export function SavingsBadge({ originalPrice, currentPrice, className = "" }) {
  const savings = originalPrice - currentPrice;
  if (savings <= 0) return null;

  return (
    <div className={`inline-flex items-center gap-1 text-emerald-600 text-sm font-medium ${className}`}>
      <span className="text-lg">💰</span>
      Você economiza R$ {savings.toFixed(2)}
    </div>
  );
}
