import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Search,
  Package,
  Check,
  Truck,
  MapPin,
  Clock,
  Phone,
  MessageCircle
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTheme } from '@/components/pharmacy/ThemeProvider';
import { formatWhatsAppNumber, createWhatsAppUrl } from '@/utils/whatsapp';
import { toast } from 'sonner';

const orderSteps = [
  { id: 'pending', label: 'Pedido Recebido', icon: Package },
  { id: 'confirmed', label: 'Confirmado', icon: Check },
  { id: 'preparing', label: 'Em Preparação', icon: Package },
  { id: 'out_for_delivery', label: 'Saiu para Entrega', icon: Truck },
  { id: 'delivered', label: 'Entregue', icon: MapPin }
];

export default function TrackOrder() {
  const theme = useTheme();
  const [orderNumber, setOrderNumber] = useState('');
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const previousStatusRef = useRef(null);

  // Solicitar permissão para notificações do navegador
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          console.log('Permissão de notificação concedida');
        }
      });
    }
  }, []);

  // Query para atualização automática quando um pedido está sendo rastreado
  const { data: trackedOrder } = useQuery({
    queryKey: ['trackOrder', orderNumber],
    queryFn: async () => {
      if (!orderNumber.trim()) return null;
      const results = await base44.entities.Order.filter({ order_number: orderNumber.trim() });
      return results.length > 0 ? results[0] : null;
    },
    enabled: !!order && !!orderNumber.trim(),
    refetchInterval: 10000, // Atualizar a cada 10 segundos
    refetchIntervalInBackground: true
  });

  // Atualizar order quando trackedOrder mudar
  useEffect(() => {
    if (trackedOrder) {
      setOrder(trackedOrder);
    }
  }, [trackedOrder]);

  // Detectar mudanças de status e notificar
  useEffect(() => {
    if (!order) {
      previousStatusRef.current = null;
      return;
    }

    if (previousStatusRef.current && previousStatusRef.current !== order.status) {
      // Status mudou! Notificar o cliente
      const statusLabels = {
        pending: 'Pendente',
        confirmed: 'Confirmado',
        preparing: 'Em Separação',
        out_for_delivery: 'Saiu para Entrega',
        delivered: 'Entregue',
        cancelled: 'Cancelado'
      };

      const statusMessages = {
        confirmed: '🎉 Seu pedido foi confirmado!',
        preparing: '📦 Seu pedido está sendo preparado!',
        out_for_delivery: '🚚 Seu pedido saiu para entrega!',
        delivered: '✅ Seu pedido foi entregue!',
        cancelled: '❌ Seu pedido foi cancelado.'
      };

      const message = statusMessages[order.status] || 
        `Status do pedido #${order.order_number || order.id.slice(-6)} mudou para: ${statusLabels[order.status]}`;

      // Toast notification
      if (order.status === 'delivered') {
        toast.success(message, {
          duration: 8000,
          description: `Pedido #${order.order_number || order.id.slice(-6)}`
        });
      } else if (order.status === 'cancelled') {
        toast.error(message, {
          duration: 8000,
          description: `Pedido #${order.order_number || order.id.slice(-6)}`
        });
      } else {
        toast.info(message, {
          duration: 6000,
          description: `Pedido #${order.order_number || order.id.slice(-6)}`
        });
      }

      // Browser notification (se permitido)
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`Pedido #${order.order_number || order.id.slice(-6)}`, {
          body: message,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: `order-${order.id}`,
          requireInteraction: order.status === 'delivered' || order.status === 'cancelled'
        });
      }
    }

    previousStatusRef.current = order.status;
  }, [order]);

  const handleSearch = async () => {
    if (!orderNumber.trim()) {
      setError('Digite o número do pedido');
      return;
    }

    setIsLoading(true);
    setError('');

    const results = await base44.entities.Order.filter({ order_number: orderNumber.trim() });
    
    if (results.length > 0) {
      setOrder(results[0]);
      previousStatusRef.current = results[0].status;
    } else {
      setError('Pedido não encontrado. Verifique o número e tente novamente.');
      setOrder(null);
      previousStatusRef.current = null;
    }
    
    setIsLoading(false);
  };

  const getCurrentStep = () => {
    if (!order) return -1;
    return orderSteps.findIndex(step => step.id === order.status);
  };
  
  const handleWhatsApp = () => {
    const message = `Olá! Gostaria de informações sobre o pedido ${order?.order_number || orderNumber}`;
    const whatsappNumber = formatWhatsAppNumber(theme.whatsapp);
    if (whatsappNumber) {
      const url = createWhatsAppUrl(whatsappNumber, message);
      if (url) window.open(url, '_blank');
    } else {
      toast.error('WhatsApp não configurado. Configure nas Configurações da farmácia.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Truck className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Rastrear Pedido</h1>
          <p className="text-gray-500">
            Acompanhe o status da sua entrega em tempo real
          </p>
        </div>

        {/* Search */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Digite o número do pedido"
                  className="pl-10 h-12"
                />
              </div>
              <Button 
                onClick={handleSearch}
                disabled={isLoading}
                className="bg-emerald-600 hover:bg-emerald-700 h-12 px-8"
              >
                {isLoading ? 'Buscando...' : 'Rastrear'}
              </Button>
            </div>
            {error && (
              <p className="text-red-500 text-sm mt-3">{error}</p>
            )}
          </CardContent>
        </Card>

        {/* Order Status */}
        {order && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardContent className="p-8">
                {/* Order Info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-8 border-b">
                  <div>
                    <p className="text-sm text-gray-500">Pedido</p>
                    <p className="text-2xl font-bold text-gray-900">
                      #{order.order_number || order.id.slice(-6)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Total</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      R$ {order.total?.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Timeline */}
                <div className="relative mb-8">
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
                  
                  {orderSteps.map((step, index) => {
                    const currentStep = getCurrentStep();
                    const isCompleted = index <= currentStep;
                    const isCurrent = index === currentStep;
                    
                    return (
                      <div key={step.id} className="relative flex items-start gap-4 pb-8 last:pb-0">
                        <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center ${
                          isCompleted 
                            ? 'bg-emerald-500 text-white' 
                            : 'bg-gray-200 text-gray-400'
                        } ${isCurrent ? 'ring-4 ring-emerald-100' : ''}`}>
                          <step.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 pt-3">
                          <p className={`font-medium ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                            {step.label}
                          </p>
                          {isCurrent && (
                            <p className="text-sm text-emerald-600 mt-1">
                              Status atual
                            </p>
                          )}
                        </div>
                        {isCompleted && index < currentStep && (
                          <Check className="w-5 h-5 text-emerald-500 mt-3" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Delivery Info */}
                {order.delivery_address && (
                  <div className="bg-gray-50 rounded-xl p-6 mb-6">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-emerald-600" />
                      Endereço de Entrega
                    </h3>
                    <p className="text-gray-600">
                      {order.delivery_address.street}, {order.delivery_address.number}
                      {order.delivery_address.complement && ` - ${order.delivery_address.complement}`}
                      <br />
                      {order.delivery_address.neighborhood} - {order.delivery_address.city}/{order.delivery_address.state}
                      <br />
                      CEP: {order.delivery_address.zipcode}
                    </p>
                  </div>
                )}

                {/* Estimated Time */}
                {order.delivery_time_estimate && (
                  <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl mb-6">
                    <Clock className="w-6 h-6 text-emerald-600" />
                    <div>
                      <p className="font-medium text-emerald-800">Previsão de Entrega</p>
                      <p className="text-emerald-600">{order.delivery_time_estimate}</p>
                    </div>
                  </div>
                )}

                {/* Contact */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      const phone = theme.phone || '11999999999';
                      const cleaned = phone.replace(/\D/g, '');
                      window.open(`tel:+${cleaned.startsWith('55') ? cleaned : '55' + cleaned}`);
                    }}
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Ligar para suporte
                  </Button>
                  <Button 
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={handleWhatsApp}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Falar no WhatsApp
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Help */}
        <div className="mt-8 text-center text-gray-500">
          <p className="text-sm">
            Não encontrou seu pedido? Entre em contato conosco pelo WhatsApp.
          </p>
        </div>
      </div>
    </div>
  );
}