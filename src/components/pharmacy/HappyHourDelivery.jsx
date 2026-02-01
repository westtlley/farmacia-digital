import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, Clock, Zap, Gift, PartyPopper } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/**
 * Configuração do Happy Hour
 */
const HAPPY_HOUR_CONFIG = {
  enabled: true,
  startHour: 15, // 15h
  endHour: 17, // 17h
  daysOfWeek: [1, 2, 3, 4, 5], // Segunda a Sexta
  deliveryFee: 0.99, // R$ 0,99
  normalFee: 8.00, // Frete normal
  message: 'FRETE R$ 0,99 - APENAS AGORA!'
};

/**
 * Happy Hour Delivery Banner
 * Mostra banner animado durante horário promocional
 */
export default function HappyHourDelivery({ compact = false }) {
  const [isHappyHour, setIsHappyHour] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const updateHappyHour = () => {
      const now = new Date();
      setCurrentTime(now);
      
      const hour = now.getHours();
      const day = now.getDay();

      // Verificar se é Happy Hour
      const isActive = 
        HAPPY_HOUR_CONFIG.enabled &&
        HAPPY_HOUR_CONFIG.daysOfWeek.includes(day) &&
        hour >= HAPPY_HOUR_CONFIG.startHour &&
        hour < HAPPY_HOUR_CONFIG.endHour;

      setIsHappyHour(isActive);

      if (isActive) {
        // Calcular tempo restante até fim do Happy Hour
        const endTime = new Date(now);
        endTime.setHours(HAPPY_HOUR_CONFIG.endHour, 0, 0, 0);
        const diff = endTime - now;

        if (diff > 0) {
          setTimeRemaining({
            hours: Math.floor(diff / (1000 * 60 * 60)),
            minutes: Math.floor((diff / (1000 * 60)) % 60),
            seconds: Math.floor((diff / 1000) % 60)
          });
        }
      } else {
        setTimeRemaining(null);
      }
    };

    updateHappyHour();
    const interval = setInterval(updateHappyHour, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!isHappyHour) {
    return null;
  }

  // Versão compacta
  if (compact) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gradient-to-r from-yellow-400 via-orange-400 to-red-500 rounded-lg p-3 text-white"
      >
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 animate-pulse" />
          <div className="flex-1">
            <p className="text-xs font-bold">HAPPY HOUR</p>
            <p className="text-xs">Frete R$ {HAPPY_HOUR_CONFIG.deliveryFee.toFixed(2)}</p>
          </div>
          {timeRemaining && (
            <div className="text-right">
              <p className="text-xs font-mono font-bold">
                {timeRemaining.hours}:{String(timeRemaining.minutes).padStart(2, '0')}
              </p>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // Versão completa
  return (
    <AnimatePresence>
      {isHappyHour && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="relative"
        >
          {/* Main Banner */}
          <div className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 rounded-3xl p-6 md:p-8 text-white shadow-2xl relative overflow-hidden">
            {/* Animated background */}
            <div className="absolute inset-0">
              <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/20 rounded-full blur-3xl animate-pulse" />
              <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            <div className="relative z-10">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <motion.div
                    animate={{ 
                      rotate: [0, 10, -10, 0],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 2
                    }}
                    className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center"
                  >
                    <PartyPopper className="w-8 h-8" />
                  </motion.div>
                  <div>
                    <h3 className="text-3xl md:text-4xl font-black mb-1">
                      HAPPY HOUR ⚡
                    </h3>
                    <p className="text-lg md:text-xl text-white/90 font-medium">
                      {HAPPY_HOUR_CONFIG.message}
                    </p>
                  </div>
                </div>

                {/* Badge */}
                <Badge className="bg-white text-orange-600 text-lg px-4 py-2 font-black hidden md:inline-flex">
                  <Zap className="w-5 h-5 mr-2" />
                  ATIVO
                </Badge>
              </div>

              {/* Main Content */}
              <div className="grid md:grid-cols-3 gap-6 mb-6">
                {/* Price Comparison */}
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 text-center">
                  <Truck className="w-8 h-8 mx-auto mb-3" />
                  <p className="text-sm text-white/80 mb-2">Frete Promocional</p>
                  <p className="text-5xl font-black mb-1">
                    R$ {HAPPY_HOUR_CONFIG.deliveryFee.toFixed(2)}
                  </p>
                  <p className="text-xs text-white/70 line-through">
                    Antes: R$ {HAPPY_HOUR_CONFIG.normalFee.toFixed(2)}
                  </p>
                </div>

                {/* Countdown */}
                {timeRemaining && (
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 text-center">
                    <Clock className="w-8 h-8 mx-auto mb-3" />
                    <p className="text-sm text-white/80 mb-2">Termina em</p>
                    <p className="text-5xl font-black font-mono">
                      {timeRemaining.hours}:{String(timeRemaining.minutes).padStart(2, '0')}
                    </p>
                    <p className="text-xs text-white/70 mt-1">
                      {timeRemaining.seconds}s
                    </p>
                  </div>
                )}

                {/* Savings */}
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 text-center">
                  <Gift className="w-8 h-8 mx-auto mb-3" />
                  <p className="text-sm text-white/80 mb-2">Você Economiza</p>
                  <p className="text-5xl font-black text-yellow-200">
                    R$ {(HAPPY_HOUR_CONFIG.normalFee - HAPPY_HOUR_CONFIG.deliveryFee).toFixed(2)}
                  </p>
                  <p className="text-xs text-white/70 mt-1">
                    por entrega
                  </p>
                </div>
              </div>

              {/* Footer Message */}
              <div className="flex items-center justify-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <Zap className="w-6 h-6 flex-shrink-0 animate-pulse" />
                <p className="text-sm md:text-base font-medium text-center">
                  🎉 Aproveite! Válido para <strong>todos os bairros</strong> das {HAPPY_HOUR_CONFIG.startHour}h às {HAPPY_HOUR_CONFIG.endHour}h
                </p>
              </div>

              {/* Pulse Effect */}
              <motion.div
                animate={{
                  scale: [1, 1.05, 1],
                  opacity: [0.5, 0.8, 0.5]
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2
                }}
                className="absolute -inset-2 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 rounded-3xl blur-2xl -z-10 opacity-50"
              />
            </div>
          </div>

          {/* Bottom Notification Bar */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-4 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-xl p-4 border-2 border-orange-300"
          >
            <div className="flex items-center justify-center gap-2 text-orange-900">
              <Zap className="w-5 h-5" />
              <p className="text-sm font-medium">
                <strong>Dica:</strong> Adicione mais produtos ao carrinho e aproveite o frete promocional!
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Indica se está em Happy Hour
 * Útil para outros componentes
 */
export function isHappyHourActive() {
  if (!HAPPY_HOUR_CONFIG.enabled) return false;

  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();

  return (
    HAPPY_HOUR_CONFIG.daysOfWeek.includes(day) &&
    hour >= HAPPY_HOUR_CONFIG.startHour &&
    hour < HAPPY_HOUR_CONFIG.endHour
  );
}

/**
 * Retorna o frete aplicável (Happy Hour ou normal)
 * @param {number} normalFee - Frete normal calculado
 * @returns {number} - Frete final
 */
export function applyHappyHourDiscount(normalFee) {
  if (isHappyHourActive()) {
    return HAPPY_HOUR_CONFIG.deliveryFee;
  }
  return normalFee;
}
