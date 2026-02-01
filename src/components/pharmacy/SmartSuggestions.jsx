import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Plus, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import { getProductImage } from '@/utils/productImages';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useTheme } from '@/components/pharmacy/ThemeProvider';

/**
 * Componente de Sugestões Inteligentes
 * Sugere produtos que ajudam o cliente a alcançar frete grátis
 */
export default function SmartSuggestions({ currentItems, subtotal, onAddToCart }) {
  const theme = useTheme();
  const freeShippingThreshold = theme.freeDeliveryAbove || 150;
  const remaining = Math.max(0, freeShippingThreshold - subtotal);

  // Não mostrar se já atingiu frete grátis
  if (subtotal >= freeShippingThreshold) {
    return null;
  }

  // Buscar produtos disponíveis
  const { data: allProducts = [] } = useQuery({
    queryKey: ['products', 'suggestions'],
    queryFn: async () => {
      const products = await base44.entities.Product.list('-created_date', 100);
      return products.filter(p => 
        p.status === 'active' && 
        p.price > 0 && 
        p.price <= remaining + 50 && // Produtos até R$ 50 acima do necessário
        (p.has_infinite_stock || (p.stock_quantity && p.stock_quantity > 0))
      );
    },
    staleTime: 5 * 60 * 1000
  });

  // IDs dos produtos já no carrinho
  const cartProductIds = useMemo(() => 
    currentItems.map(item => item.id), 
    [currentItems]
  );

  // Filtrar e ordenar produtos sugeridos
  const suggestions = useMemo(() => {
    if (!allProducts.length) return [];

    // Remover produtos já no carrinho
    const availableProducts = allProducts.filter(p => !cartProductIds.includes(p.id));

    // Produtos que completam exatamente o frete grátis (margem de R$ 10)
    const perfectMatch = availableProducts.filter(p => 
      p.price >= remaining - 10 && p.price <= remaining + 10
    );

    // Produtos populares (com promoção ou featured)
    const popular = availableProducts.filter(p => 
      p.featured || p.discount_percentage > 0
    );

    // Produtos abaixo do valor faltante
    const affordable = availableProducts.filter(p => 
      p.price <= remaining
    ).sort((a, b) => Math.abs(remaining - a.price) - Math.abs(remaining - b.price));

    // Combinar e limitar a 4 sugestões
    const combined = [...perfectMatch, ...popular, ...affordable];
    const unique = Array.from(new Map(combined.map(p => [p.id, p])).values());
    
    return unique.slice(0, 4);
  }, [allProducts, cartProductIds, remaining]);

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-6 shadow-sm border border-purple-200"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            Sugestões para Você
            <TrendingUp className="w-4 h-4 text-purple-600" />
          </h3>
          <p className="text-sm text-gray-600">
            Adicione e ganhe <strong className="text-purple-600">FRETE GRÁTIS</strong>
          </p>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <AnimatePresence>
          {suggestions.map((product, index) => {
            const willCompleteFreeShipping = product.price >= remaining;
            
            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition-all border border-gray-100 relative group"
              >
                {/* Badge se completar frete grátis */}
                {willCompleteFreeShipping && (
                  <div className="absolute -top-2 -right-2 z-10">
                    <div className="bg-gradient-to-r from-emerald-500 to-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg">
                      🎁 GRÁTIS
                    </div>
                  </div>
                )}

                <Link to={createPageUrl('Product') + `?id=${product.id}`}>
                  <img
                    src={getProductImage(product)}
                    alt={product.name}
                    className="w-full h-20 object-contain rounded-lg mb-2 group-hover:scale-105 transition-transform"
                  />
                  <h4 className="text-xs font-medium text-gray-900 line-clamp-2 mb-1 min-h-[2rem]">
                    {product.name}
                  </h4>
                </Link>

                <div className="space-y-2">
                  {/* Price */}
                  <div className="flex items-baseline gap-1">
                    {product.discount_percentage > 0 && (
                      <span className="text-[10px] text-gray-400 line-through">
                        R$ {((product.price / (1 - product.discount_percentage / 100))).toFixed(2)}
                      </span>
                    )}
                    <p className="text-sm font-bold text-emerald-600">
                      R$ {product.price.toFixed(2)}
                    </p>
                  </div>

                  {/* Add button */}
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      onAddToCart(product);
                    }}
                    className="w-full h-7 text-xs bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Adicionar
                  </Button>
                </div>

                {/* Discount badge */}
                {product.discount_percentage > 0 && (
                  <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    -{product.discount_percentage}%
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Footer hint */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          💡 <strong>Dica:</strong> Produtos marcados com 🎁 completam seu frete grátis!
        </p>
      </div>
    </motion.div>
  );
}
