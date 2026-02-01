import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag, Copy, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { suggestCoupons, formatCouponDescription } from '@/utils/coupons';

/**
 * Componente para exibir cupons disponíveis
 * Mostra cupons sugeridos baseado no CEP e valor do carrinho
 */
export default function CouponDisplay({ subtotal, zipCode, isFirstPurchase = false, onApplyCoupon }) {
  const [copiedCode, setCopiedCode] = useState(null);
  
  // Buscar cupons sugeridos
  const suggestions = suggestCoupons(subtotal, zipCode, isFirstPurchase);

  if (suggestions.length === 0) {
    return null;
  }

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Cupom ${code} copiado!`);
    
    setTimeout(() => {
      setCopiedCode(null);
    }, 2000);
  };

  const handleApply = (code) => {
    if (onApplyCoupon) {
      onApplyCoupon(code);
    }
  };

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 shadow-sm border border-purple-200"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
          <Tag className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            Cupons Disponíveis para Você
            <Sparkles className="w-4 h-4 text-purple-600" />
          </h3>
          <p className="text-sm text-gray-600">
            Use e economize ainda mais
          </p>
        </div>
      </div>

      {/* Coupons List */}
      <div className="space-y-3">
        <AnimatePresence>
          {suggestions.map((coupon, index) => (
            <motion.div
              key={coupon.code}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl p-4 shadow-sm border-2 border-dashed border-purple-200 hover:border-purple-400 transition-all group"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  {/* Coupon Code */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1 rounded-lg font-bold text-sm">
                      {coupon.code}
                    </div>
                    {coupon.neighborhood !== 'Todos' && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                        📍 {coupon.neighborhood}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-900 font-medium mb-1">
                    {formatCouponDescription(coupon)}
                  </p>
                  
                  {/* Additional Info */}
                  {coupon.validFor === 'firstPurchase' && (
                    <p className="text-xs text-gray-500">
                      ✨ Válido para primeira compra
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopy(coupon.code)}
                    className="h-8 px-3"
                  >
                    {copiedCode === coupon.code ? (
                      <>
                        <Check className="w-3 h-3 mr-1 text-green-600" />
                        <span className="text-xs">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 mr-1" />
                        <span className="text-xs">Copiar</span>
                      </>
                    )}
                  </Button>

                  {onApplyCoupon && (
                    <Button
                      size="sm"
                      onClick={() => handleApply(coupon.code)}
                      className="h-8 px-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      <span className="text-xs">Aplicar</span>
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Footer Hint */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          💡 Os cupons são aplicados automaticamente ao digitar o código
        </p>
      </div>
    </motion.div>
  );
}
