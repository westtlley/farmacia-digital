import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  MapPin,
  Truck,
  User,
  Phone,
  Mail,
  CheckCircle,
  ArrowRight,
  Loader2,
  Lock,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import AddressForm from './AddressForm';
import { validateCoupon, calculateCouponDiscount } from '@/utils/coupons';
import { applyHappyHourDiscount } from './HappyHourDelivery';
import { base44 } from '@/api/base44Client';

/**
 * Checkout em 1 Página
 * Tudo em uma única página sem reloads para máxima conversão
 */
export default function OnePageCheckout({ 
  items = [], 
  subtotal = 0,
  onComplete 
}) {
  // Estados
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Dados do cliente
  const [customerData, setCustomerData] = useState({
    name: '',
    email: '',
    phone: ''
  });

  // Endereço
  const [address, setAddress] = useState(null);
  const [deliveryOption, setDeliveryOption] = useState('delivery');

  // Pagamento
  const [paymentMethod, setPaymentMethod] = useState('pix');

  // Frete e cupom
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  // Carregar dados do usuário logado
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const user = await base44.auth.me();
        if (user) {
          setCustomerData({
            name: user.full_name || '',
            email: user.email || '',
            phone: user.phone || ''
          });
        }
      } catch (error) {
        // Usuário não logado, deixar campos vazios
      }
    };
    loadUserData();
  }, []);

  // Calcular totais
  const discount = appliedCoupon?.calculatedDiscount || 0;
  const finalDeliveryFee = appliedCoupon?.finalDeliveryFee !== undefined 
    ? appliedCoupon.finalDeliveryFee 
    : applyHappyHourDiscount(deliveryFee);
  const total = subtotal - discount + (deliveryOption === 'delivery' ? finalDeliveryFee : 0);

  // Validações por step
  const isStep1Valid = () => {
    return customerData.name && customerData.phone && 
           (customerData.email || customerData.phone);
  };

  const isStep2Valid = () => {
    if (deliveryOption === 'pickup') return true;
    return address && address.street && address.number && address.neighborhood;
  };

  const isStep3Valid = () => {
    return paymentMethod !== '';
  };

  // Aplicar cupom
  const handleApplyCoupon = () => {
    if (!couponCode) {
      toast.error('Digite um cupom');
      return;
    }

    const validation = validateCoupon(
      couponCode,
      address?.zipcode || '',
      subtotal,
      false // TODO: verificar se é primeira compra
    );

    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    const { discount, finalDeliveryFee } = calculateCouponDiscount(
      validation,
      subtotal,
      deliveryFee
    );

    setAppliedCoupon({
      ...validation.coupon,
      calculatedDiscount: discount,
      finalDeliveryFee: finalDeliveryFee
    });

    toast.success(`Cupom ${couponCode.toUpperCase()} aplicado!`);
  };

  // Finalizar pedido
  const handleFinishOrder = async () => {
    if (isProcessing) return;

    setIsProcessing(true);

    try {
      // Criar pedido
      const orderData = {
        order_number: `PED${Date.now()}`,
        customer_name: customerData.name,
        customer_email: customerData.email,
        customer_phone: customerData.phone,
        items: items.map(item => ({
          product_id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          total: item.price * item.quantity
        })),
        subtotal: subtotal,
        delivery_fee: deliveryOption === 'delivery' ? finalDeliveryFee : 0,
        discount: discount,
        total: total,
        status: 'pending',
        payment_method: paymentMethod,
        delivery_address: deliveryOption === 'delivery' ? address : null,
        delivery_option: deliveryOption,
        coupon_code: appliedCoupon?.code || null,
        created_date: new Date().toISOString()
      };

      const order = await base44.entities.Order.create(orderData);

      toast.success('Pedido realizado com sucesso!', {
        description: `Pedido #${order.order_number}`
      });

      if (onComplete) {
        onComplete(order);
      }

    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      toast.error('Erro ao processar pedido. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4">
            {[1, 2, 3].map((s) => (
              <React.Fragment key={s}>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ 
                    scale: step >= s ? 1 : 0.8,
                    opacity: step >= s ? 1 : 0.5
                  }}
                  className={`flex items-center gap-2 ${
                    step >= s ? 'text-emerald-600' : 'text-gray-400'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    step > s 
                      ? 'bg-emerald-600 text-white' 
                      : step === s
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                  }`}>
                    {step > s ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <span className="font-bold">{s}</span>
                    )}
                  </div>
                  <span className="hidden md:block font-medium">
                    {s === 1 && 'Dados'}
                    {s === 2 && 'Entrega'}
                    {s === 3 && 'Pagamento'}
                  </span>
                </motion.div>
                {s < 3 && (
                  <div className={`w-16 h-1 ${
                    step > s ? 'bg-emerald-600' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <AnimatePresence mode="wait">
              {/* Step 1: Customer Data */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -20, opacity: 0 }}
                  className="bg-white rounded-2xl p-6 shadow-sm"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Seus Dados</h2>
                      <p className="text-sm text-gray-600">Para entrar em contato</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Nome Completo *</Label>
                      <Input
                        id="name"
                        value={customerData.name}
                        onChange={(e) => setCustomerData({...customerData, name: e.target.value})}
                        placeholder="João da Silva"
                        className="mt-1"
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="phone">WhatsApp *</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={customerData.phone}
                          onChange={(e) => setCustomerData({...customerData, phone: e.target.value})}
                          placeholder="(11) 99999-9999"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="email">Email (opcional)</Label>
                        <Input
                          id="email"
                          type="email"
                          value={customerData.email}
                          onChange={(e) => setCustomerData({...customerData, email: e.target.value})}
                          placeholder="joao@email.com"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => setStep(2)}
                    disabled={!isStep1Valid()}
                    className="w-full mt-6 h-12 bg-emerald-600 hover:bg-emerald-700"
                  >
                    Continuar para Entrega
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </motion.div>
              )}

              {/* Step 2: Delivery */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -20, opacity: 0 }}
                  className="bg-white rounded-2xl p-6 shadow-sm"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Truck className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Entrega</h2>
                      <p className="text-sm text-gray-600">Como quer receber?</p>
                    </div>
                  </div>

                  <RadioGroup value={deliveryOption} onValueChange={setDeliveryOption}>
                    <div className="space-y-3">
                      <div className={`flex items-center space-x-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        deliveryOption === 'delivery' 
                          ? 'border-emerald-500 bg-emerald-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <RadioGroupItem value="delivery" id="delivery" />
                        <Label htmlFor="delivery" className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-3">
                            <Truck className="w-5 h-5 text-emerald-600" />
                            <div>
                              <p className="font-medium">Receber em casa</p>
                              <p className="text-sm text-gray-600">
                                Entrega em até 90 minutos
                              </p>
                            </div>
                          </div>
                        </Label>
                      </div>

                      <div className={`flex items-center space-x-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        deliveryOption === 'pickup' 
                          ? 'border-emerald-500 bg-emerald-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <RadioGroupItem value="pickup" id="pickup" />
                        <Label htmlFor="pickup" className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-3">
                            <MapPin className="w-5 h-5 text-blue-600" />
                            <div>
                              <p className="font-medium">Retirar na loja</p>
                              <p className="text-sm text-gray-600">
                                Pronto em até 1 hora - Frete Grátis
                              </p>
                            </div>
                          </div>
                        </Label>
                      </div>
                    </div>
                  </RadioGroup>

                  {deliveryOption === 'delivery' && (
                    <div className="mt-6">
                      <AddressForm
                        onAddressChange={setAddress}
                        onFeeCalculate={(fee) => setDeliveryFee(fee)}
                      />
                    </div>
                  )}

                  <div className="flex gap-3 mt-6">
                    <Button
                      onClick={() => setStep(1)}
                      variant="outline"
                      className="flex-1 h-12"
                    >
                      Voltar
                    </Button>
                    <Button
                      onClick={() => setStep(3)}
                      disabled={!isStep2Valid()}
                      className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700"
                    >
                      Continuar para Pagamento
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Payment */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -20, opacity: 0 }}
                  className="bg-white rounded-2xl p-6 shadow-sm"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Pagamento</h2>
                      <p className="text-sm text-gray-600">Como prefere pagar?</p>
                    </div>
                  </div>

                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                    <div className="space-y-3">
                      <div className={`flex items-center space-x-3 p-4 rounded-xl border-2 cursor-pointer ${
                        paymentMethod === 'pix' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200'
                      }`}>
                        <RadioGroupItem value="pix" id="pix" />
                        <Label htmlFor="pix" className="flex-1 cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">PIX</p>
                              <p className="text-sm text-gray-600">Pagamento instantâneo</p>
                            </div>
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                              Recomendado
                            </span>
                          </div>
                        </Label>
                      </div>

                      <div className={`flex items-center space-x-3 p-4 rounded-xl border-2 cursor-pointer ${
                        paymentMethod === 'card' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200'
                      }`}>
                        <RadioGroupItem value="card" id="card" />
                        <Label htmlFor="card" className="flex-1 cursor-pointer">
                          <p className="font-medium">Cartão de Crédito</p>
                          <p className="text-sm text-gray-600">Ou débito na entrega</p>
                        </Label>
                      </div>

                      <div className={`flex items-center space-x-3 p-4 rounded-xl border-2 cursor-pointer ${
                        paymentMethod === 'cash' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200'
                      }`}>
                        <RadioGroupItem value="cash" id="cash" />
                        <Label htmlFor="cash" className="flex-1 cursor-pointer">
                          <p className="font-medium">Dinheiro</p>
                          <p className="text-sm text-gray-600">Pagar na entrega</p>
                        </Label>
                      </div>
                    </div>
                  </RadioGroup>

                  <div className="flex gap-3 mt-6">
                    <Button
                      onClick={() => setStep(2)}
                      variant="outline"
                      className="flex-1 h-12"
                    >
                      Voltar
                    </Button>
                    <Button
                      onClick={handleFinishOrder}
                      disabled={!isStep3Valid() || isProcessing}
                      className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <Lock className="w-5 h-5 mr-2" />
                          Finalizar Pedido
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Compra 100% segura e protegida</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-6 shadow-sm sticky top-4">
              <h3 className="font-bold text-gray-900 mb-4">Resumo do Pedido</h3>

              {/* Items */}
              <div className="space-y-3 mb-4">
                {items.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.quantity}x R$ {item.price.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
                {items.length > 3 && (
                  <p className="text-xs text-gray-500 text-center">
                    +{items.length - 3} item(ns)
                  </p>
                )}
              </div>

              <Separator className="my-4" />

              {/* Coupon */}
              {!appliedCoupon && (
                <div className="mb-4">
                  <Label className="text-sm mb-2">Cupom de Desconto</Label>
                  <div className="flex gap-2">
                    <Input
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="CUPOM"
                      className="text-sm"
                    />
                    <Button
                      onClick={handleApplyCoupon}
                      size="sm"
                      variant="outline"
                    >
                      Aplicar
                    </Button>
                  </div>
                </div>
              )}

              {appliedCoupon && (
                <div className="mb-4 p-3 bg-emerald-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-emerald-700">
                      Cupom {appliedCoupon.code} aplicado!
                    </p>
                    <button
                      onClick={() => setAppliedCoupon(null)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              )}

              {/* Totals */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">R$ {subtotal.toFixed(2)}</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Desconto</span>
                    <span className="font-medium">-R$ {discount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-gray-600">Frete</span>
                  {deliveryOption === 'pickup' || finalDeliveryFee === 0 ? (
                    <span className="font-medium text-emerald-600">Grátis</span>
                  ) : (
                    <span className="font-medium">R$ {finalDeliveryFee.toFixed(2)}</span>
                  )}
                </div>

                <Separator className="my-3" />

                <div className="flex justify-between text-lg">
                  <span className="font-bold">Total</span>
                  <span className="font-bold text-emerald-600">
                    R$ {total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
