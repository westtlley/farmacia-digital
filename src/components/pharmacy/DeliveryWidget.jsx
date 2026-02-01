import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, MapPin, Clock, ArrowRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTheme } from '@/components/pharmacy/ThemeProvider';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';

/**
 * Widget de Frete para Home
 * Call-to-action destacado para cálculo de frete
 */
export default function DeliveryWidget() {
  const theme = useTheme();
  const [zipCode, setZipCode] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState(null);

  const formatZipCode = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 5) {
      return numbers;
    }
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  };

  const handleQuickCalculate = async () => {
    if (!zipCode || zipCode.length < 8) {
      toast.error('Digite um CEP válido');
      return;
    }

    setIsCalculating(true);

    try {
      // Simular cálculo rápido
      await new Promise(resolve => setTimeout(resolve, 800));

      // Resultado simplificado
      setResult({
        available: true,
        time: '30-45min',
        fee: 8.00,
        freeShippingThreshold: theme.freeDeliveryAbove || 150
      });

      toast.success('Entregamos na sua região!');
    } catch (error) {
      toast.error('Erro ao calcular. Tente novamente.');
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-gradient-to-br from-emerald-600 via-green-600 to-teal-600 rounded-3xl shadow-2xl overflow-hidden"
    >
      <div className="relative p-8 md:p-10">
        {/* Background decorations */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-24 -translate-x-24 blur-3xl" />

        <div className="relative z-10">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              animate={{
                y: [0, -5, 0],
              }}
              transition={{
                repeat: Infinity,
                duration: 2,
                ease: 'easeInOut'
              }}
              className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full mb-4"
            >
              <Truck className="w-8 h-8 text-white" />
            </motion.div>

            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Entrega Rápida na Sua Casa
            </h2>
            <p className="text-lg text-emerald-50 max-w-2xl mx-auto">
              Digite seu CEP e descubra o tempo e valor de entrega
            </p>
          </div>

          {/* Calculator */}
          <div className="max-w-xl mx-auto">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6">
              <div className="flex gap-3 mb-4">
                <div className="relative flex-1">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-600" />
                  <Input
                    value={zipCode}
                    onChange={(e) => setZipCode(formatZipCode(e.target.value))}
                    placeholder="Digite seu CEP"
                    maxLength={9}
                    className="pl-12 h-14 text-lg bg-white"
                    onKeyPress={(e) => e.key === 'Enter' && handleQuickCalculate()}
                  />
                </div>
                <Button
                  onClick={handleQuickCalculate}
                  disabled={isCalculating}
                  size="lg"
                  className="bg-white text-emerald-600 hover:bg-emerald-50 h-14 px-8 font-bold"
                >
                  {isCalculating ? (
                    <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Calcular
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>

              {/* Result */}
              <AnimatePresence>
                {result && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-white rounded-xl p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
                          <Zap className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-emerald-900">
                            Entregamos na sua região!
                          </p>
                          <p className="text-sm text-emerald-700">
                            Frete grátis acima de R$ {result.freeShippingThreshold.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-emerald-50 rounded-lg p-3 text-center">
                          <Clock className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                          <p className="text-xs text-gray-600 mb-1">Tempo</p>
                          <p className="font-bold text-gray-900">{result.time}</p>
                        </div>
                        <div className="bg-emerald-50 rounded-lg p-3 text-center">
                          <Truck className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                          <p className="text-xs text-gray-600 mb-1">Frete</p>
                          <p className="font-bold text-emerald-600">
                            R$ {result.fee.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { icon: <Truck className="w-5 h-5" />, label: 'Entrega', value: '30min' },
                { icon: <MapPin className="w-5 h-5" />, label: 'Bairros', value: '15+' },
                { icon: <Zap className="w-5 h-5" />, label: 'Grátis', value: 'R$ 150+' }
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center text-white"
                >
                  <div className="flex justify-center mb-2">
                    {stat.icon}
                  </div>
                  <p className="text-xs text-emerald-50 mb-1">{stat.label}</p>
                  <p className="font-bold text-lg">{stat.value}</p>
                </motion.div>
              ))}
            </div>

            {/* CTA */}
            <div className="text-center">
              <Link to={createPageUrl('DeliveryAreas')}>
                <Button
                  variant="outline"
                  size="lg"
                  className="bg-white/10 border-2 border-white text-white hover:bg-white hover:text-emerald-600 transition-all"
                >
                  Ver Todas as Regiões Atendidas
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Banner */}
      <div className="bg-emerald-900/50 backdrop-blur-sm px-8 py-4 flex flex-wrap items-center justify-center gap-6 text-white text-sm">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4" />
          <span>Entrega Expressa</span>
        </div>
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4" />
          <span>Rastreamento Online</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          <span>15+ Bairros Atendidos</span>
        </div>
      </div>
    </motion.div>
  );
}
