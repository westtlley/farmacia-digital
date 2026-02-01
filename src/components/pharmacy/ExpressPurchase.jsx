import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Check, Loader2, MapPin, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

/**
 * Compra Expressa (1-Click Purchase)
 * Para clientes recorrentes comprarem com um clique
 */
export default function ExpressPurchase({ product, onSuccess }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [savedData, setSavedData] = useState(null);

  // Carregar dados salvos
  const loadSavedData = async () => {
    try {
      const user = await base44.auth.me();
      if (!user) {
        toast.error('Faça login para usar compra expressa');
        return false;
      }

      // Buscar último pedido do usuário
      const orders = await base44.entities.Order.filter({ 
        customer_email: user.email 
      });

      if (orders.length === 0) {
        toast.info('Nenhum pedido anterior encontrado');
        return false;
      }

      // Pegar o mais recente
      const lastOrder = orders.sort((a, b) => 
        new Date(b.created_date) - new Date(a.created_date)
      )[0];

      setSavedData({
        address: lastOrder.delivery_address,
        paymentMethod: lastOrder.payment_method,
        user: user
      });

      return true;
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados salvos');
      return false;
    }
  };

  const handleExpressPurchase = async () => {
    setIsProcessing(true);

    try {
      const hasData = await loadSavedData();
      if (!hasData) {
        setIsProcessing(false);
        return;
      }

      setIsOpen(true);
    } catch (error) {
      toast.error('Erro ao iniciar compra expressa');
      setIsProcessing(false);
    }
  };

  const confirmPurchase = async () => {
    if (!savedData) return;

    setIsProcessing(true);

    try {
      // Criar pedido
      const orderData = {
        order_number: `EXP${Date.now()}`,
        customer_name: savedData.user.full_name,
        customer_email: savedData.user.email,
        customer_phone: savedData.user.phone,
        items: [{
          product_id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          total: product.price
        }],
        subtotal: product.price,
        delivery_fee: 0, // TODO: Calcular frete
        discount: 0,
        total: product.price,
        status: 'pending',
        payment_method: savedData.paymentMethod,
        delivery_address: savedData.address,
        delivery_option: 'delivery',
        express_purchase: true,
        created_date: new Date().toISOString()
      };

      const order = await base44.entities.Order.create(orderData);

      toast.success('Compra realizada com sucesso!', {
        description: `Pedido #${order.order_number}`
      });

      setIsOpen(false);
      
      if (onSuccess) {
        onSuccess(order);
      }

    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      toast.error('Erro ao processar compra');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleExpressPurchase}
        disabled={isProcessing}
        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 gap-2"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Carregando...
          </>
        ) : (
          <>
            <Zap className="w-4 h-4" />
            Compra Expressa
          </>
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-600" />
              Confirmar Compra Expressa
            </DialogTitle>
            <DialogDescription>
              Confirme os dados da sua última compra
            </DialogDescription>
          </DialogHeader>

          {savedData && (
            <div className="space-y-4 py-4">
              {/* Product */}
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-600 mb-1">Produto</p>
                <p className="font-medium">{product.name}</p>
                <p className="text-lg font-bold text-emerald-600 mt-1">
                  R$ {product.price.toFixed(2)}
                </p>
              </div>

              {/* Address */}
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-gray-600" />
                  <p className="text-sm text-gray-600">Endereço de Entrega</p>
                </div>
                <p className="text-sm">
                  {savedData.address.street}, {savedData.address.number}
                  {savedData.address.complement && ` - ${savedData.address.complement}`}
                </p>
                <p className="text-sm">
                  {savedData.address.neighborhood} - {savedData.address.city}/{savedData.address.state}
                </p>
                <p className="text-sm">CEP: {savedData.address.zipcode}</p>
              </div>

              {/* Payment */}
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-4 h-4 text-gray-600" />
                  <p className="text-sm text-gray-600">Forma de Pagamento</p>
                </div>
                <p className="text-sm capitalize">{savedData.paymentMethod}</p>
              </div>

              {/* Total */}
              <div className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border-2 border-emerald-200">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total</span>
                  <span className="text-2xl font-bold text-emerald-600">
                    R$ {product.price.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Confirm Button */}
              <Button
                onClick={confirmPurchase}
                disabled={isProcessing}
                className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    Confirmar Compra
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-gray-500">
                Ao confirmar, você concorda com nossos termos e condições
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
