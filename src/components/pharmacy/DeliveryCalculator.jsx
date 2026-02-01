import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Truck, Clock, Check, MapPin, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/components/pharmacy/ThemeProvider';
import { getCoordinates, calculateDistance, calculateDeliveryFee } from '@/utils/cepApi';
import AddressForm from './AddressForm';
import { toast } from 'sonner';

export default function DeliveryCalculator({ onCalculate, subtotal = 0 }) {
  const theme = useTheme();
  const [address, setAddress] = useState(null);
  const [result, setResult] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [selectedOption, setSelectedOption] = useState('motoboy');

  // Obter endereço da farmácia das configurações
  const pharmacyAddress = theme.address || null;

  const handleAddressChange = (newAddress) => {
    setAddress(newAddress);
    setResult(null);
  };

  const handleCalculate = async (deliveryAddress) => {
    // Validar campos obrigatórios
    if (!deliveryAddress.street || !deliveryAddress.number || !deliveryAddress.neighborhood || !deliveryAddress.city || !deliveryAddress.state) {
      toast.error('Preencha todos os campos obrigatórios do endereço');
      return;
    }

    setIsCalculating(true);
    setResult(null);

    try {
      let distance = 0;
      let deliveryFee = 0;
      let estimatedTime = '';
      let errorMessage = '';

      // Se tiver endereço da farmácia, calcular distância real
      if (pharmacyAddress && pharmacyAddress.street && pharmacyAddress.city) {
        try {
          // Obter coordenadas do endereço do cliente
          const clientCoords = await getCoordinates({
            street: deliveryAddress.street,
            number: deliveryAddress.number,
            neighborhood: deliveryAddress.neighborhood,
            city: deliveryAddress.city,
            state: deliveryAddress.state
          });

          // Obter coordenadas da farmácia
          const pharmacyCoords = await getCoordinates({
            street: pharmacyAddress.street,
            number: pharmacyAddress.number || '',
            neighborhood: pharmacyAddress.neighborhood || '',
            city: pharmacyAddress.city || '',
            state: pharmacyAddress.state || ''
          });

          // Calcular distância
          distance = calculateDistance(
            pharmacyCoords.lat,
            pharmacyCoords.lon,
            clientCoords.lat,
            clientCoords.lon
          );

          // Se a distância for muito grande ou inválida, usar fallback
          if (distance > 100 || distance <= 0) {
            throw new Error('Distância inválida');
          }

          // Calcular frete baseado na distância
          const freeDeliveryThreshold = theme.freeDeliveryAbove || 150;
          const feeConfig = {
            baseFee: parseFloat(theme.deliveryFeeBase) || 5.00,
            pricePerKm: 2.50,
            minFee: 8.00,
            maxFee: 50.00,
            freeDeliveryAbove: freeDeliveryThreshold
          };

          const feeResult = calculateDeliveryFee(distance, feeConfig);
          deliveryFee = subtotal >= freeDeliveryThreshold ? 0 : feeResult.fee;
          estimatedTime = feeResult.estimatedTime;
        } catch (error) {
          console.error('Erro ao calcular distância:', error);
          errorMessage = 'Usando cálculo aproximado de frete';
          
          // Fallback: calcular frete baseado no CEP (primeiro dígito)
          const cepFirstDigit = parseInt(deliveryAddress.zipcode?.replace(/\D/g, '')[0] || '5');
          if (cepFirstDigit <= 1) {
            deliveryFee = 8.90;
            estimatedTime = '30-45 min';
          } else if (cepFirstDigit <= 3) {
            deliveryFee = 12.90;
            estimatedTime = '45-60 min';
          } else if (cepFirstDigit <= 5) {
            deliveryFee = 15.90;
            estimatedTime = '1-2 horas';
          } else {
            deliveryFee = 19.90;
            estimatedTime = '2-3 horas';
          }
        }
      } else {
        // Fallback se não tiver endereço da farmácia configurado
        toast.warning('Endereço da farmácia não configurado. Usando cálculo aproximado.');
        const cepFirstDigit = parseInt(deliveryAddress.zipcode?.replace(/\D/g, '')[0] || '5');
        if (cepFirstDigit <= 1) {
          deliveryFee = 8.90;
          estimatedTime = '30-45 min';
        } else if (cepFirstDigit <= 3) {
          deliveryFee = 12.90;
          estimatedTime = '45-60 min';
        } else if (cepFirstDigit <= 5) {
          deliveryFee = 15.90;
          estimatedTime = '1-2 horas';
        } else {
          deliveryFee = 19.90;
          estimatedTime = '2-3 horas';
        }
      }

      const freeDeliveryThreshold = theme.freeDeliveryAbove || 150;
      const isFreeDelivery = subtotal >= freeDeliveryThreshold;

      const deliveryResult = {
        address: deliveryAddress,
        distance,
        fee: isFreeDelivery ? 0 : deliveryFee,
        originalFee: deliveryFee,
        estimatedTime,
        available: true,
        isFreeDelivery,
        freeDeliveryThreshold,
        missingForFree: Math.max(0, freeDeliveryThreshold - subtotal),
        calculated: true, // Marcar como calculado
        errorMessage,
        options: [
          { 
            type: 'motoboy', 
            name: 'Motoboy', 
            fee: isFreeDelivery ? 0 : deliveryFee, 
            time: estimatedTime,
            distance: distance > 0 ? `${distance} km` : null
          },
          { 
            type: 'pickup', 
            name: 'Retirar na Loja', 
            fee: 0, 
            time: 'Em até 1 hora' 
          }
        ]
      };

      setResult(deliveryResult);
      if (onCalculate) onCalculate(deliveryResult);
      
      if (errorMessage) {
        toast.warning(errorMessage);
      } else {
        toast.success('Frete calculado com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao calcular frete:', error);
      toast.error('Erro ao calcular frete. Verifique o endereço e tente novamente.');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleOptionSelect = (optionType) => {
    setSelectedOption(optionType);
    if (result && onCalculate) {
      const selected = result.options.find(opt => opt.type === optionType);
      onCalculate({
        ...result,
        selectedOption: optionType,
        fee: selected.fee
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Formulário de Endereço */}
      <AddressForm
        onAddressChange={handleAddressChange}
        onCalculate={handleCalculate}
        subtotal={subtotal}
        pharmacyAddress={pharmacyAddress}
      />

      {/* Resultado do Cálculo */}
      <AnimatePresence>
        {isCalculating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-white rounded-2xl p-6 border shadow-sm"
          >
            <div className="flex items-center justify-center gap-3 py-8">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <p className="text-gray-600">Calculando frete...</p>
            </div>
          </motion.div>
        )}

        {result && !isCalculating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-2xl p-6 border shadow-sm space-y-3"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <Truck className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Opções de Entrega</h3>
                {result.distance > 0 && (
                  <p className="text-sm text-gray-500">Distância: {result.distance} km</p>
                )}
              </div>
            </div>

            {result.options.map((option) => (
              <div 
                key={option.type}
                onClick={() => handleOptionSelect(option.type)}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  selectedOption === option.type
                    ? 'border-emerald-500 bg-emerald-50 shadow-md' 
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {option.type === 'motoboy' ? (
                      <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                        <Truck className="w-5 h-5 text-emerald-600" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-gray-600" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{option.name}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{option.time}</span>
                        {option.distance && (
                          <>
                            <span>•</span>
                            <span>{option.distance}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {option.fee === 0 ? (
                      <p className="font-bold text-emerald-600 flex items-center gap-1">
                        <Check className="w-4 h-4" />
                        Grátis
                      </p>
                    ) : (
                      <p className="font-bold text-gray-900">R$ {option.fee.toFixed(2)}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {result.missingForFree > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm text-amber-800">
                  🎉 Faltam apenas <strong>R$ {result.missingForFree.toFixed(2)}</strong> para você ganhar <strong>Frete Grátis!</strong>
                </p>
              </div>
            )}

            {result.errorMessage && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                <p className="text-sm text-yellow-800">
                  ⚠️ {result.errorMessage}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}