import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Truck, Clock, Check, Calculator, TrendingUp, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTheme } from '@/components/pharmacy/ThemeProvider';
import { toast } from 'sonner';
import { getCoordinates, calculateDistance, calculateDeliveryFee } from '@/utils/cepApi';

/**
 * Landing Page "Onde Entregamos"
 * Mostra todos os bairros atendidos, preços e tempos de entrega
 */
export default function DeliveryAreas() {
  const theme = useTheme();
  const [zipCode, setZipCode] = useState('');
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState(null);

  // Bairros e áreas atendidas (pode vir do Base44 no futuro)
  const deliveryZones = [
    {
      zone: 'Zona Premium',
      description: 'Entrega super rápida',
      areas: [
        { name: 'Centro', time: '20-30min', fee: 5.00, zipStart: '01000' },
        { name: 'Jardins', time: '25-35min', fee: 7.00, zipStart: '01400' },
        { name: 'Paulista', time: '20-30min', fee: 6.00, zipStart: '01310' },
        { name: 'Vila Mariana', time: '30-40min', fee: 8.00, zipStart: '04010' },
      ],
      color: 'emerald'
    },
    {
      zone: 'Zona Standard',
      description: 'Entrega rápida',
      areas: [
        { name: 'Moema', time: '35-45min', fee: 10.00, zipStart: '04560' },
        { name: 'Pinheiros', time: '30-40min', fee: 9.00, zipStart: '05410' },
        { name: 'Itaim Bibi', time: '35-45min', fee: 11.00, zipStart: '04530' },
        { name: 'Brooklin', time: '40-50min', fee: 12.00, zipStart: '04560' },
      ],
      color: 'blue'
    },
    {
      zone: 'Zona Expandida',
      description: 'Entrega programada',
      areas: [
        { name: 'Tatuapé', time: '45-60min', fee: 15.00, zipStart: '03070' },
        { name: 'Ipiranga', time: '50-65min', fee: 14.00, zipStart: '04260' },
        { name: 'Santo Amaro', time: '45-60min', fee: 13.00, zipStart: '04750' },
        { name: 'Outros bairros', time: '60-90min', fee: 15.00, zipStart: '00000' },
      ],
      color: 'orange'
    }
  ];

  const handleCalculate = async () => {
    if (!zipCode || zipCode.length < 8) {
      toast.error('Digite um CEP válido');
      return;
    }

    setCalculating(true);
    setResult(null);

    try {
      // Simular cálculo (em produção, usar API real)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verificar zona baseado no CEP
      const zipPrefix = zipCode.replace(/\D/g, '').substring(0, 5);
      let foundZone = null;
      let foundArea = null;

      for (const zone of deliveryZones) {
        const area = zone.areas.find(a => zipPrefix.startsWith(a.zipStart));
        if (area) {
          foundZone = zone;
          foundArea = area;
          break;
        }
      }

      if (foundArea) {
        setResult({
          available: true,
          neighborhood: foundArea.name,
          time: foundArea.time,
          fee: foundArea.fee,
          zone: foundZone.zone,
          freeShippingThreshold: theme.freeDeliveryAbove || 150
        });
        toast.success('CEP disponível para entrega!');
      } else {
        setResult({
          available: true,
          neighborhood: 'Sua região',
          time: '60-90min',
          fee: 15.00,
          zone: 'Zona Expandida',
          freeShippingThreshold: theme.freeDeliveryAbove || 150
        });
        toast.info('Entregamos na sua região!');
      }
    } catch (error) {
      console.error('Erro ao calcular:', error);
      toast.error('Erro ao calcular. Tente novamente.');
    } finally {
      setCalculating(false);
    }
  };

  const formatZipCode = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 5) {
      return numbers;
    }
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-emerald-600 to-green-600 text-white py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-center"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full mb-6">
              <MapPin className="w-10 h-10" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Onde Entregamos
            </h1>
            <p className="text-xl text-emerald-50 max-w-2xl mx-auto">
              Levamos saúde e bem-estar até você com rapidez e segurança
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-8">
        {/* Calculator Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-8 mb-12"
        >
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Calculator className="w-4 h-4" />
              Calculadora de Frete
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Consulte o Frete para seu CEP
            </h2>
            <p className="text-gray-600">
              Digite seu CEP e descubra o valor e tempo de entrega
            </p>
          </div>

          <div className="max-w-md mx-auto">
            <div className="flex gap-3 mb-4">
              <Input
                value={zipCode}
                onChange={(e) => setZipCode(formatZipCode(e.target.value))}
                placeholder="00000-000"
                maxLength={9}
                className="text-lg h-14"
                onKeyPress={(e) => e.key === 'Enter' && handleCalculate()}
              />
              <Button
                onClick={handleCalculate}
                disabled={calculating}
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-700 px-8 h-14"
              >
                {calculating ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Navigation className="w-5 h-5 mr-2" />
                    Calcular
                  </>
                )}
              </Button>
            </div>

            {/* Result */}
            {result && (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`p-6 rounded-2xl border-2 ${
                  result.available
                    ? 'bg-emerald-50 border-emerald-300'
                    : 'bg-red-50 border-red-300'
                }`}
              >
                {result.available ? (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
                        <Check className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-emerald-900 text-lg">
                          Entregamos em {result.neighborhood}!
                        </h3>
                        <p className="text-sm text-emerald-700">{result.zone}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-white rounded-xl p-4">
                        <div className="flex items-center gap-2 text-gray-600 mb-1">
                          <Clock className="w-4 h-4" />
                          <span className="text-xs">Tempo</span>
                        </div>
                        <p className="text-lg font-bold text-gray-900">{result.time}</p>
                      </div>
                      <div className="bg-white rounded-xl p-4">
                        <div className="flex items-center gap-2 text-gray-600 mb-1">
                          <Truck className="w-4 h-4" />
                          <span className="text-xs">Frete</span>
                        </div>
                        <p className="text-lg font-bold text-emerald-600">
                          R$ {result.fee.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-orange-100 to-yellow-100 rounded-xl p-4">
                      <p className="text-sm text-gray-900 font-medium">
                        🎉 <strong>FRETE GRÁTIS</strong> em compras acima de{' '}
                        <strong className="text-orange-600">
                          R$ {result.freeShippingThreshold.toFixed(2)}
                        </strong>
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="text-center">
                    <p className="text-red-700 font-medium">
                      Desculpe, ainda não entregamos nesta região.
                    </p>
                    <p className="text-sm text-red-600 mt-2">
                      Entre em contato conosco para consultar disponibilidade.
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Delivery Zones */}
        <div className="py-12">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Nossas Zonas de Entrega
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Cobrimos toda a região com diferentes tempos e valores de entrega
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {deliveryZones.map((zone, zoneIndex) => (
              <motion.div
                key={zone.zone}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: zoneIndex * 0.1 }}
                className="bg-white rounded-2xl shadow-lg overflow-hidden"
              >
                <div className={`bg-gradient-to-r from-${zone.color}-500 to-${zone.color}-600 text-white p-6`}>
                  <h3 className="text-2xl font-bold mb-2">{zone.zone}</h3>
                  <p className="text-sm opacity-90">{zone.description}</p>
                </div>

                <div className="p-6 space-y-4">
                  {zone.areas.map((area, areaIndex) => (
                    <div
                      key={areaIndex}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 bg-${zone.color}-500 rounded-full`} />
                        <div>
                          <p className="font-medium text-gray-900">{area.name}</p>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {area.time}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">
                          R$ {area.fee.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Benefits Section */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl p-12 mb-12">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
            Por que escolher nosso delivery?
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Truck className="w-8 h-8" />,
                title: 'Entrega Rápida',
                description: 'Seus produtos chegam em até 90 minutos nas zonas premium',
                color: 'emerald'
              },
              {
                icon: <Check className="w-8 h-8" />,
                title: 'Frete Grátis',
                description: `Acima de R$ ${(theme.freeDeliveryAbove || 150).toFixed(2)} você não paga nada`,
                color: 'blue'
              },
              {
                icon: <TrendingUp className="w-8 h-8" />,
                title: 'Rastreamento',
                description: 'Acompanhe seu pedido em tempo real pelo WhatsApp',
                color: 'purple'
              }
            ].map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className={`w-16 h-16 bg-${benefit.color}-500 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white shadow-lg`}>
                  {benefit.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {benefit.title}
                </h3>
                <p className="text-gray-600">
                  {benefit.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-emerald-600 to-green-600 rounded-3xl p-12 text-center text-white mb-12">
          <h2 className="text-3xl font-bold mb-4">
            Pronto para receber seus produtos?
          </h2>
          <p className="text-xl text-emerald-50 mb-8 max-w-2xl mx-auto">
            Comece a comprar agora e aproveite nossas ofertas com entrega rápida
          </p>
          <Button
            size="lg"
            className="bg-white text-emerald-600 hover:bg-emerald-50 h-14 px-8 text-lg"
            onClick={() => window.location.href = '/Home'}
          >
            Começar a Comprar
          </Button>
        </div>
      </div>
    </div>
  );
}
