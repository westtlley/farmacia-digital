import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ShoppingCart, Heart, Star, AlertTriangle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from 'framer-motion';
import { useTheme } from './ThemeProvider';
import { formatWhatsAppNumber, createWhatsAppUrl } from '@/utils/whatsapp';
import { toast } from 'sonner';
import { formatPrice, formatPriceWithSymbol } from '@/utils/priceFormat';
import { getProductImage } from '@/utils/productImages';
import { ProductBadges, StockUrgencyBadge, SavingsBadge } from './ProductBadges';

export default function ProductCard({ product, onAddToCart, onAddToFavorites, isFavorite }) {
  const [imageError, setImageError] = useState(false);
  const theme = useTheme();
  
  if (!product || !product.id) {
    return null;
  }

  const discountPercentage = product.original_price && product.original_price > product.price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  const isOutOfStock = product.stock_quantity !== undefined && product.stock_quantity <= 0;
  const isLowStock = product.stock_quantity !== undefined && product.stock_quantity > 0 && product.stock_quantity <= 5;

  const handleWhatsAppBuy = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const message = `Olá! Tenho interesse no produto:\n\n*${product.name}*\nPreço: ${formatPriceWithSymbol(product.price)}\n\nPoderia me ajudar?`;
    const whatsappNumber = formatWhatsAppNumber(theme.whatsapp);
    if (whatsappNumber) {
      const url = createWhatsAppUrl(whatsappNumber, message);
      if (url) window.open(url, '_blank');
    } else {
      toast.error('WhatsApp não configurado. Configure nas Configurações da farmácia.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden"
    >
      <Link to={createPageUrl('Product') + `?id=${product.id}`}>
        <div className="relative">
          {/* Image */}
          <div className="aspect-square bg-white flex items-center justify-center relative">
            {imageError ? (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <span className="text-4xl">💊</span>
              </div>
            ) : (
              <img
                src={getProductImage(product)}
                alt={`${product.name || 'Produto'}${product.brand ? ` - ${product.brand}` : ''} - ${formatPriceWithSymbol(product.price || 0)}`}
                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                style={{ 
                  objectFit: 'contain',
                  objectPosition: 'center'
                }}
                onError={(e) => {
                  // Se falhar ao carregar, tenta usar a imagem padrão
                  if (e.target.src !== getProductImage(product)) {
                    e.target.src = getProductImage(product);
                  } else {
                    setImageError(true);
                  }
                }}
                loading="lazy"
              />
            )}
            {isOutOfStock && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Badge className="bg-red-500 text-white font-bold px-4 py-2">
                  Fora de Estoque
                </Badge>
              </div>
            )}
          </div>

          {/* Badges - Novo Sistema Automático */}
          <div className="absolute top-3 right-3 z-10 flex flex-col gap-2 items-end">
            <ProductBadges product={product} />
          </div>
          
          {/* Badges Adicionais (Genérico, Receita) */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {product.is_generic && (
              <Badge className="bg-blue-500 text-white text-xs">
                Genérico
              </Badge>
            )}
            {(product.requires_prescription || product.is_antibiotic || product.is_controlled) && (
              <Badge className="bg-blue-500 text-white text-xs flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Receita obrigatória
              </Badge>
            )}
          </div>

          {/* Favorite button - movido para baixo dos badges */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAddToFavorites?.(product);
            }}
            className={`absolute bottom-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-sm ${
              isFavorite 
                ? 'bg-red-500 text-white scale-100' 
                : 'bg-white/90 text-gray-400 hover:bg-white hover:text-red-500 opacity-0 group-hover:opacity-100'
            }`}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Brand */}
          {product.brand && (
            <p className="text-xs text-emerald-600 font-semibold mb-1 uppercase tracking-wide">{product.brand}</p>
          )}

          {/* Name */}
          <h3 className="font-medium text-sm text-gray-900 line-clamp-2 min-h-[40px] leading-snug group-hover:text-emerald-600 transition-colors">
            {product.name}
          </h3>

          {/* Dosage/Quantity */}
          {(product.dosage || product.quantity_per_package) && (
            <p className="text-xs text-gray-500 mt-1">
              {product.dosage} {product.quantity_per_package && `• ${product.quantity_per_package} un`}
            </p>
          )}

          {/* Price */}
          <div className="mt-3 mb-2">
            {product.original_price && product.original_price > product.price && (
              <p className="text-xs text-gray-400 line-through mb-0.5">
                De {formatPriceWithSymbol(product.original_price)}
              </p>
            )}
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-2xl font-bold text-gray-900">
                {formatPriceWithSymbol(product.price)}
              </span>
            </div>
            {/* Novo: Badge de Economia */}
            {product.original_price && product.original_price > product.price && (
              <div className="mt-1">
                <SavingsBadge 
                  originalPrice={product.original_price} 
                  currentPrice={product.price} 
                />
              </div>
            )}
          </div>

          {/* Novo: Stock Urgency Badge */}
          {!isOutOfStock && (
            <StockUrgencyBadge stock={product.stock_quantity} className="mb-2" />
          )}
          
          {isOutOfStock && (
            <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
              <span className="w-2 h-2 bg-red-500 rounded-full" />
              Produto indisponível
            </p>
          )}
        </div>
      </Link>

      {/* Actions */}
      <div className="px-4 pb-4">
        <Button
          onClick={(e) => {
            e.preventDefault();
            if (!isOutOfStock) {
              onAddToCart?.(product);
            }
          }}
          disabled={isOutOfStock}
          className="w-full bg-emerald-600 hover:bg-emerald-700 rounded-xl h-11 font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          {isOutOfStock ? 'Fora de Estoque' : 'Adicionar ao Carrinho'}
        </Button>
      </div>
    </motion.div>
  );
}