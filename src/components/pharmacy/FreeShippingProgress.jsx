import React from 'react';
import { Truck, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '@/components/pharmacy/ThemeProvider';

/**
 * Componente de Barra de Progresso para Frete Grátis
 * Mostra quanto falta para o cliente ganhar frete grátis e motiva a adicionar mais produtos
 */
export default function FreeShippingProgress({ subtotal }) {
  const theme = useTheme();
  const freeShippingThreshold = theme.freeDeliveryAbove || 150;
  
  const remaining = Math.max(0, freeShippingThreshold - subtotal);
  const progress = Math.min(100, (subtotal / freeShippingThreshold) * 100);
  const isEligible = subtotal >= freeShippingThreshold;

  if (isEligible) {
    return (
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gradient-to-r from-emerald-500 to-green-500 rounded-2xl p-6 shadow-lg"
      >
        <div className="flex items-center gap-3 text-white">
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 0.6 }}
          >
            <Truck className="w-8 h-8" />
          </motion.div>
          <div className="flex-1">
            <p className="font-bold text-lg">🎉 Parabéns! Você ganhou FRETE GRÁTIS!</p>
            <p className="text-sm text-emerald-50">Economia de até R$ 15,00 na entrega</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-white rounded-2xl p-6 shadow-sm border-2 border-orange-200"
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <Truck className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900">
                Faltam <span className="text-orange-600">R$ {remaining.toFixed(2)}</span>
              </p>
              <p className="text-sm text-gray-500">para FRETE GRÁTIS!</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-orange-600">{progress.toFixed(0)}%</p>
            <p className="text-xs text-gray-500">completo</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative">
          <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 rounded-full relative"
            >
              {progress > 10 && (
                <motion.div
                  animate={{ 
                    x: [0, 10, 0],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{ 
                    repeat: Infinity,
                    duration: 1.5
                  }}
                  className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-r from-transparent to-white/30"
                />
              )}
            </motion.div>
          </div>
          {/* Milestone marker */}
          <div className="absolute -top-1 right-0 transform translate-x-1/2">
            <div className="flex flex-col items-center">
              <div className="w-6 h-6 bg-emerald-500 rounded-full border-4 border-white shadow-lg flex items-center justify-center">
                <Truck className="w-3 h-3 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Motivational Message */}
        <div className="flex items-start gap-2 bg-orange-50 rounded-xl p-3">
          <TrendingUp className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-gray-900">
              Continue comprando e economize na entrega!
            </p>
            <p className="text-gray-600 text-xs mt-1">
              Adicione mais R$ {remaining.toFixed(2)} em produtos e ganhe frete grátis
            </p>
          </div>
        </div>

        {/* Current vs Target */}
        <div className="flex justify-between text-xs text-gray-500 pt-2 border-t">
          <span>Seu carrinho: <strong className="text-gray-900">R$ {subtotal.toFixed(2)}</strong></span>
          <span>Meta: <strong className="text-emerald-600">R$ {freeShippingThreshold.toFixed(2)}</strong></span>
        </div>
      </div>
    </motion.div>
  );
}
