import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  ArrowRight,
  Truck,
  Tag,
  ShieldCheck,
  Gift
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from 'sonner';
import { useTheme } from '@/components/pharmacy/ThemeProvider';
import { formatWhatsAppNumber, createWhatsAppUrl } from '@/utils/whatsapp';
import { formatOrderReceipt, sendWhatsAppMessage } from '@/utils/whatsappMessages';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { getProductImage } from '@/utils/productImages';

import DeliveryCalculator from '@/components/pharmacy/DeliveryCalculator';
import FreeShippingProgress from '@/components/pharmacy/FreeShippingProgress';
import SmartSuggestions from '@/components/pharmacy/SmartSuggestions';
import CouponDisplay from '@/components/pharmacy/CouponDisplay';
import { validateCoupon, calculateCouponDiscount } from '@/utils/coupons';

export default function Cart() {
  const [items, setItems] = useState([]);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [deliveryAddress, setDeliveryAddress] = useState(null);
  const [deliveryOption, setDeliveryOption] = useState('motoboy');
  const [freteCalculado, setFreteCalculado] = useState(false);
  const [customerZipCode, setCustomerZipCode] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('pharmacyCart');
    if (saved) {
      setItems(JSON.parse(saved));
    }
  }, []);

  const updateCart = (newItems) => {
    setItems(newItems);
    localStorage.setItem('pharmacyCart', JSON.stringify(newItems));
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const updateQuantity = async (productId, newQuantity) => {
    if (newQuantity < 1) {
      removeItem(productId);
      return;
    }
    
    // Validar estoque antes de atualizar quantidade
    try {
      const products = await base44.entities.Product.filter({ id: productId });
      const product = products[0];
      
      if (product && product.stock_quantity !== undefined && newQuantity > product.stock_quantity) {
        toast.error(`Apenas ${product.stock_quantity} unidade(s) disponível(eis) em estoque`);
        return;
      }
    } catch (error) {
      console.error('Erro ao validar estoque:', error);
    }
    
    const updated = items.map(item =>
      item.id === productId ? { ...item, quantity: newQuantity } : item
    );
    updateCart(updated);
  };

  const removeItem = (productId) => {
    const updated = items.filter(item => item.id !== productId);
    updateCart(updated);
    toast.success('Produto removido do carrinho');
  };

  const clearCart = () => {
    if (window.confirm('Tem certeza que deseja limpar o carrinho?')) {
      updateCart([]);
      toast.success('Carrinho limpo');
    }
  };

  const applyCoupon = (code = couponCode) => {
    if (!code) {
      toast.error('Digite um cupom');
      return;
    }

    // Usar sistema de cupons aprimorado
    const validation = validateCoupon(
      code,
      customerZipCode,
      subtotal,
      false // TODO: Verificar se é primeira compra do usuário
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

    setCouponCode(code);
    toast.success(`Cupom ${code.toUpperCase()} aplicado com sucesso!`);
  };

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  
  // Calcular desconto com sistema aprimorado
  const discount = appliedCoupon?.calculatedDiscount || 0;
  const finalDeliveryFee = appliedCoupon?.finalDeliveryFee !== undefined 
    ? appliedCoupon.finalDeliveryFee 
    : deliveryFee;
  const total = subtotal - discount + finalDeliveryFee;

  const theme = useTheme();
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  // Buscar configurações para verificar order_mode
  const { data: settings } = useQuery({
    queryKey: ['pharmacySettings'],
    queryFn: async () => {
      const data = await base44.entities.PharmacySettings.list('', 1);
      return data && data.length > 0 ? data[0] : null;
    }
  });

  const orderMode = settings?.order_mode || 'app';

  // Validar estoque antes de finalizar
  const validateCartItems = async () => {
    const errors = [];
    
    for (const item of items) {
      try {
        // Buscar produto atualizado para verificar estoque e preço
        const products = await base44.entities.Product.filter({ id: item.id });
        const currentProduct = products[0];
        
        if (!currentProduct) {
          errors.push(`${item.name} não foi encontrado`);
          continue;
        }
        
        if (currentProduct.status !== 'active') {
          errors.push(`${item.name} não está mais disponível`);
          continue;
        }
        
        if (currentProduct.stock_quantity !== undefined && currentProduct.stock_quantity < item.quantity) {
          errors.push(`${item.name}: apenas ${currentProduct.stock_quantity} unidade(s) disponível(eis)`);
          continue;
        }
        
        if (currentProduct.price !== item.price) {
          errors.push(`${item.name}: preço atualizado de R$ ${item.price.toFixed(2)} para R$ ${currentProduct.price.toFixed(2)}`);
        }
      } catch (error) {
        console.error(`Erro ao validar ${item.name}:`, error);
        errors.push(`Erro ao validar ${item.name}`);
      }
    }
    
    return errors;
  };

  const handleFinalizeOrder = async () => {
    if (isCreatingOrder) return;

    // Se modo for WhatsApp, apenas abre WhatsApp
    if (orderMode === 'whatsapp') {
      handleWhatsAppCheckout();
      return;
    }

    // Validar se frete foi calculado
    if (!freteCalculado) {
      toast.error('Por favor, preencha o endereço e calcule o frete antes de finalizar o pedido');
      return;
    }

    // Validar endereço se for entrega
    if (deliveryOption === 'motoboy' && !deliveryAddress) {
      toast.error('Por favor, preencha o endereço de entrega e calcule o frete');
      return;
    }

    // Validar itens antes de criar pedido
    setIsCreatingOrder(true);
    
    try {
      const validationErrors = await validateCartItems();
      
      if (validationErrors.length > 0) {
        toast.error(validationErrors[0] + (validationErrors.length > 1 ? ` e mais ${validationErrors.length - 1} erro(s)` : ''));
        setIsCreatingOrder(false);
        return;
      }

      // Obter dados do cliente (se logado)
      const user = await base44.auth.me();
      
      // Criar pedido
      const orderData = {
        order_number: `PED${Date.now()}`,
        customer_name: user?.full_name || 'Cliente',
        customer_email: user?.email || '',
        customer_phone: user?.phone || '',
        items: items.map(item => ({
          product_id: item.id,
          name: item.name,
          product_name: item.name,
          price: item.price,
          unit_price: item.price,
          quantity: item.quantity,
          total: item.price * item.quantity,
          image_url: item.image_url,
          dosage: item.dosage,
          category: item.category
        })),
        subtotal: subtotal,
        delivery_fee: deliveryFee,
        discount: discount,
        total: total,
        status: 'pending',
        payment_method: 'A definir',
        delivery_address: deliveryAddress || null,
        delivery_option: deliveryOption,
        created_date: new Date().toISOString()
      };

      const order = await base44.entities.Order.create(orderData);
      
      // Limpar carrinho
      updateCart([]);
      
      toast.success('Pedido criado com sucesso! Acompanhe o status na área do cliente.');
      
      // Redirecionar para área do cliente ou página de pedidos
      window.location.href = createPageUrl('CustomerArea');
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      toast.error('Erro ao criar pedido. Tente novamente.');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handleWhatsAppCheckout = async () => {
    setIsCreatingOrder(true);
    
    try {
      // Obter dados do cliente (se logado)
      const user = await base44.auth.me();
      
      // Criar pedido no sistema mesmo no modo WhatsApp (para gestão)
      const orderData = {
        order_number: `PED${Date.now()}`,
        customer_name: user?.full_name || 'Cliente',
        customer_email: user?.email || '',
        customer_phone: user?.phone || '',
        items: items.map(item => ({
          product_id: item.id,
          name: item.name,
          product_name: item.name,
          price: item.price,
          unit_price: item.price,
          quantity: item.quantity,
          total: item.price * item.quantity,
          image_url: item.image_url,
          dosage: item.dosage,
          category: item.category
        })),
        subtotal: subtotal,
        delivery_fee: deliveryFee,
        discount: discount,
        total: total,
        status: 'pending',
        payment_method: 'A definir',
        delivery_address: deliveryAddress || null,
        delivery_option: deliveryOption,
        created_date: new Date().toISOString(),
        order_mode: 'whatsapp' // Marcar como pedido WhatsApp
      };

      // Salvar pedido no sistema
      const order = await base44.entities.Order.create(orderData);
      
      // Formatar e enviar comanda via WhatsApp
      const message = formatOrderReceipt(order, theme.pharmacyName || 'Farmácia');
      
      const whatsappNumber = formatWhatsAppNumber(theme.whatsapp);
      if (whatsappNumber) {
        const url = sendWhatsAppMessage(whatsappNumber, message);
        if (url) {
          window.open(url, '_blank');
          // Limpar carrinho após enviar
          updateCart([]);
          toast.success('Pedido criado e comanda enviada para WhatsApp!');
        }
      } else {
        toast.error('WhatsApp não configurado. Configure nas Configurações da farmácia.');
      }
    } catch (error) {
      console.error('Erro ao criar pedido WhatsApp:', error);
      toast.error('Erro ao criar pedido. Tente novamente.');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
        <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <ShoppingCart className="w-16 h-16 text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Seu carrinho está vazio</h2>
        <p className="text-gray-500 mb-8 text-center">
          Adicione produtos ao carrinho para continuar comprando
        </p>
        <Link to={createPageUrl('Home')}>
          <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Continuar Comprando
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Carrinho de Compras</h1>
          <Button variant="ghost" onClick={clearCart} className="text-red-500 hover:text-red-600 hover:bg-red-50">
            <Trash2 className="w-4 h-4 mr-2" />
            Limpar carrinho
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {/* Free Shipping Progress */}
            <FreeShippingProgress subtotal={subtotal} />

            {/* Smart Suggestions */}
            <SmartSuggestions
              currentItems={items}
              subtotal={subtotal}
              onAddToCart={(product) => {
                const cart = JSON.parse(localStorage.getItem('pharmacyCart') || '[]');
                const existing = cart.find(item => item.id === product.id);
                
                if (existing) {
                  toast.info('Produto já está no carrinho');
                  return;
                }
                
                const newCart = [...cart, { ...product, quantity: 1 }];
                updateCart(newCart);
                toast.success(`${product.name} adicionado ao carrinho!`);
              }}
            />

            <AnimatePresence>
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className="bg-white rounded-2xl p-6 shadow-sm"
                >
                  <div className="flex gap-6">
                    <Link to={createPageUrl('Product') + `?id=${item.id}`}>
                      <img
                        src={getProductImage(item)}
                        alt={item.name}
                        className="w-24 h-24 object-contain rounded-xl bg-gray-50"
                        style={{ 
                          objectFit: 'contain',
                          objectPosition: 'center'
                        }}
                        onError={(e) => {
                          if (e.target.src !== getProductImage(item)) {
                            e.target.src = getProductImage(item);
                          }
                        }}
                      />
                    </Link>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between">
                        <div>
                          {item.brand && (
                            <p className="text-sm text-emerald-600 font-medium">{item.brand}</p>
                          )}
                          <Link to={createPageUrl('Product') + `?id=${item.id}`}>
                            <h3 className="font-semibold text-gray-900 hover:text-emerald-600 transition-colors">
                              {item.name}
                            </h3>
                          </Link>
                          {item.dosage && (
                            <p className="text-sm text-gray-500">{item.dosage}</p>
                          )}
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors p-2"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center border rounded-lg">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-2 hover:bg-gray-100 rounded-l-lg transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-12 text-center font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-2 hover:bg-gray-100 rounded-r-lg transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="text-right">
                          {item.original_price && item.original_price > item.price && (
                            <p className="text-sm text-gray-400 line-through">
                              R$ {(item.original_price * item.quantity).toFixed(2)}
                            </p>
                          )}
                          <p className="text-xl font-bold text-emerald-600">
                            R$ {(item.price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Coupon Display - Suggestions */}
            {customerZipCode && (
              <CouponDisplay
                subtotal={subtotal}
                zipCode={customerZipCode}
                isFirstPurchase={false}
                onApplyCoupon={(code) => applyCoupon(code)}
              />
            )}

            {/* Coupon Input */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Tag className="w-5 h-5 text-emerald-600" />
                Cupom de Desconto
              </h3>
              <div className="flex gap-3">
                <Input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Digite seu cupom"
                  className="flex-1"
                  disabled={!!appliedCoupon}
                  onKeyPress={(e) => e.key === 'Enter' && applyCoupon()}
                />
                {appliedCoupon ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setAppliedCoupon(null);
                      setCouponCode('');
                      toast.info('Cupom removido');
                    }}
                    className="text-red-500"
                  >
                    Remover
                  </Button>
                ) : (
                  <Button onClick={() => applyCoupon()} className="bg-emerald-600 hover:bg-emerald-700">
                    Aplicar
                  </Button>
                )}
              </div>
              {appliedCoupon && (
                <div className="mt-3 p-3 bg-emerald-50 rounded-lg">
                  <p className="text-sm text-emerald-700 font-medium">
                    ✓ Cupom <strong>{appliedCoupon.code}</strong> aplicado!
                  </p>
                  <p className="text-xs text-emerald-600 mt-1">
                    {appliedCoupon.description}
                  </p>
                </div>
              )}
              {!appliedCoupon && (
                <p className="text-xs text-gray-500 mt-2">
                  💡 Temos cupons especiais por bairro! Digite seu CEP acima para ver ofertas exclusivas.
                </p>
              )}
            </div>

            {/* Continue shopping */}
            <Link to={createPageUrl('Home')}>
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Continuar Comprando
              </Button>
            </Link>
          </div>

          {/* Summary */}
          <div className="space-y-6">
            <DeliveryCalculator
              subtotal={subtotal}
              onCalculate={(result) => {
                setDeliveryFee(result.fee);
                setDeliveryAddress(result.address);
                setDeliveryOption(result.selectedOption || 'motoboy');
                setFreteCalculado(result.calculated || false);
                
                // Salvar CEP para sugestões de cupons
                if (result.address?.zipcode) {
                  setCustomerZipCode(result.address.zipcode);
                }
              }}
            />

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-6">Resumo do Pedido</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal ({items.length} {items.length === 1 ? 'item' : 'itens'})</span>
                  <span className="font-medium">R$ {subtotal.toFixed(2)}</span>
                </div>
                
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Desconto</span>
                    <span className="font-medium">-R$ {discount.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-gray-500">Frete</span>
                  {finalDeliveryFee === 0 ? (
                    <span className="font-medium text-emerald-600">Grátis</span>
                  ) : (
                    <span className="font-medium">R$ {finalDeliveryFee.toFixed(2)}</span>
                  )}
                </div>

                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between">
                    <span className="text-lg font-semibold">Total</span>
                    <span className="text-2xl font-bold text-emerald-600">R$ {total.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-gray-500 text-right mt-1">
                    ou 3x de R$ {(total / 3).toFixed(2)} sem juros
                  </p>
                </div>
              </div>

              {/* Delivery Estimate */}
              {deliveryFee > 0 && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Truck className="w-5 h-5 text-blue-600" />
                    <p className="font-semibold text-blue-900">Estimativa de Entrega</p>
                  </div>
                  <p className="text-sm text-blue-700">
                    Entrega em 2-5 dias úteis após confirmação do pedido
                  </p>
                </div>
              )}

              <div className="mt-6 space-y-3">
                {orderMode === 'app' ? (
                  <Button 
                    size="lg" 
                    className="w-full bg-emerald-600 hover:bg-emerald-700 h-14 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleFinalizeOrder}
                    disabled={isCreatingOrder || !freteCalculado}
                    title={!freteCalculado ? 'Calcule o frete antes de finalizar' : ''}
                  >
                    {isCreatingOrder ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Validando e criando pedido...
                      </>
                    ) : !freteCalculado ? (
                      <>
                        Calcule o frete primeiro
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    ) : (
                      <>
                        Finalizar Pedido
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                ) : (
                  <Button 
                    size="lg" 
                    className="w-full bg-green-600 hover:bg-green-700 h-14 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleFinalizeOrder}
                    disabled={isCreatingOrder || !freteCalculado}
                    title={!freteCalculado ? 'Calcule o frete antes de finalizar' : ''}
                  >
                    {isCreatingOrder ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Criando pedido...
                      </>
                    ) : !freteCalculado ? (
                      <>
                        Calcule o frete primeiro
                        <svg className="w-5 h-5 ml-2" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        Finalizar via WhatsApp
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Trust badges */}
              <div className="mt-6 pt-6 border-t space-y-3">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>Compra 100% segura</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Truck className="w-5 h-5 text-emerald-600" />
                  <span>Entrega rápida garantida</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Gift className="w-5 h-5 text-emerald-600" />
                  <span>Frete grátis acima de R$ 150</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}