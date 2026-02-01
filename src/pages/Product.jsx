import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { 
  ShoppingCart, 
  Heart, 
  Share2, 
  Minus, 
  Plus, 
  Truck, 
  Shield, 
  AlertTriangle,
  Check,
  ChevronRight,
  FileText,
  MessageCircle,
  Star,
  Bell
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { useTheme } from '@/components/pharmacy/ThemeProvider';
import { formatWhatsAppNumber, createWhatsAppUrl } from '@/utils/whatsapp';
import { formatPrice, formatPriceWithSymbol } from '@/utils/priceFormat';
import { getProductImage } from '@/utils/productImages';
import { saveStockNotification } from '@/utils/stockNotifications';

import ProductGrid from '@/components/pharmacy/ProductGrid';
import ExpressPurchase from '@/components/pharmacy/ExpressPurchase';
import { ProductBadges, StockUrgencyBadge, SavingsBadge } from '@/components/pharmacy/ProductBadges';
import { LiveVisitors } from '@/components/pharmacy/SocialProof';

export default function Product() {
  const theme = useTheme();
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [notifyDialogOpen, setNotifyDialogOpen] = useState(false);
  const [notifyData, setNotifyData] = useState({
    name: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    const saved = localStorage.getItem('pharmacyFavorites');
    if (saved) {
      const favs = JSON.parse(saved);
      setFavorites(favs);
      setIsFavorite(favs.includes(productId));
    }
    
    // Salvar produto visualizado recentemente
    if (productId) {
      const viewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
      const updated = [productId, ...viewed.filter(id => id !== productId)].slice(0, 20);
      localStorage.setItem('recentlyViewed', JSON.stringify(updated));
    }
  }, [productId]);

  const { data: product, isLoading, error: productError } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      try {
        // Buscar por ID, SKU ou EAN
        const allProducts = await base44.entities.Product.list('', 10000);
        const found = allProducts.find(p => 
          p.id === productId || 
          p.sku === productId || 
          p.barcode === productId || 
          p.ean === productId
        );
        return found;
      } catch (error) {
        console.error('Erro ao buscar produto:', error);
        toast.error('Erro ao carregar produto. Tente novamente.');
        throw error;
      }
    },
    enabled: !!productId,
    retry: 2
  });

  const { data: relatedProducts = [] } = useQuery({
    queryKey: ['relatedProducts', product?.category],
    queryFn: async () => {
      if (!product?.category) return [];
      const products = await base44.entities.Product.filter(
        { category: product.category, status: 'active' },
        '-sales_count',
        8
      );
      return products.filter(p => p.id !== productId);
    },
    enabled: !!product?.category
  });

  const discountPercentage = product?.original_price && product?.price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  const addToCart = () => {
    if (!product) {
      toast.error('Produto não disponível');
      return;
    }
    
    const cart = JSON.parse(localStorage.getItem('pharmacyCart') || '[]');
    const existing = cart.find(item => item.id === product.id);
    
    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.push({ ...product, quantity });
    }
    
    localStorage.setItem('pharmacyCart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cartUpdated'));
    toast.success(`${quantity}x ${product.name} adicionado ao carrinho!`);
  };

  const toggleFavorite = () => {
    if (!productId) {
      toast.error('ID do produto não encontrado');
      return;
    }
    
    const updated = isFavorite
      ? favorites.filter(id => id !== productId)
      : [...favorites, productId];
    
    setFavorites(updated);
    setIsFavorite(!isFavorite);
    localStorage.setItem('pharmacyFavorites', JSON.stringify(updated));
    
    if (!isFavorite) {
      toast.success('Adicionado aos favoritos!');
    } else {
      toast.success('Removido dos favoritos!');
    }
    };
    
    const handleWhatsAppBuy = () => {
    if (!product) {
      toast.error('Produto não disponível');
      return;
    }
    
    const message = `Olá! Tenho interesse no produto:\n\n*${product.name}*\n${product.dosage || ''}\nQuantidade: ${quantity}\nPreço unitário: R$ ${product.price.toFixed(2)}\nTotal: R$ ${(product.price * quantity).toFixed(2)}\n\nPoderia me ajudar com este pedido?`;
    const whatsappNumber = formatWhatsAppNumber(theme.whatsapp);
    if (whatsappNumber) {
      const url = createWhatsAppUrl(whatsappNumber, message);
      if (url) window.open(url, '_blank');
    } else {
      toast.error('WhatsApp não configurado. Configure nas Configurações da farmácia.');
    }
  };

  const shareProduct = async () => {
    if (!product) {
      toast.error('Produto não disponível');
      return;
    }
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: `Confira este produto: ${product.name}`,
          url: window.location.href
        });
      } catch (error) {
        // Usuário cancelou o compartilhamento ou ocorreu um erro
        if (error.name !== 'AbortError') {
          console.error('Erro ao compartilhar:', error);
        }
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copiado!');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-12">
          <div className="aspect-square bg-gray-200 rounded-3xl animate-pulse" />
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4 animate-pulse" />
            <div className="h-6 bg-gray-200 rounded w-1/2 animate-pulse" />
            <div className="h-12 bg-gray-200 rounded w-1/3 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (productError) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="w-24 h-24 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-12 h-12 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Erro ao carregar produto</h2>
        <p className="text-gray-500 mb-6">Ocorreu um erro ao carregar as informações do produto. Tente novamente.</p>
        <Link to={createPageUrl('Home')}>
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            Voltar para a loja
          </Button>
        </Link>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
          <span className="text-4xl">😕</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Produto não encontrado</h2>
        <p className="text-gray-500 mb-6">O produto que você está procurando não existe ou foi removido.</p>
        <Link to={createPageUrl('Home')}>
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            Voltar para a loja
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-1">
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <Link to={createPageUrl('Home')} className="hover:text-emerald-600">Home</Link>
            <ChevronRight className="w-4 h-4" />
            <Link 
              to={createPageUrl('Category') + `?cat=${product.category}`} 
              className="hover:text-emerald-600 capitalize"
            >
              {product.category?.replace(/_/g, ' ')}
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900 truncate max-w-[200px]">{product.name}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Product Image */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="relative"
          >
            <div className="aspect-square bg-white rounded-3xl shadow-sm flex items-center justify-center sticky top-24 relative group">
              <img
                src={getProductImage(product)}
                alt={product.name}
                className="w-full h-full object-contain cursor-zoom-in transition-transform duration-300 group-hover:scale-105"
                style={{ 
                  objectFit: 'contain',
                  objectPosition: 'center'
                }}
                onError={(e) => {
                  // Se falhar ao carregar, tenta usar a imagem padrão novamente
                  if (e.target.src !== getProductImage(product)) {
                    e.target.src = getProductImage(product);
                  }
                }}
                onClick={() => {
                  // Abrir imagem em nova aba para zoom
                  window.open(getProductImage(product), '_blank');
                }}
              />
              
              {/* Stock indicator */}
              {product.stock_quantity !== undefined && (
                <div className="absolute bottom-4 left-4 right-4">
                  {product.stock_quantity <= 0 ? (
                    <div className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold text-center">
                      Fora de Estoque
                    </div>
                  ) : product.stock_quantity <= 5 ? (
                    <div className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-semibold text-center">
                      Últimas {product.stock_quantity} unidade(s)!
                    </div>
                  ) : product.stock_quantity <= 10 ? (
                    <div className="bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm font-semibold text-center">
                      Estoque limitado ({product.stock_quantity} unidades)
                    </div>
                  ) : (
                    <div className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-semibold text-center">
                      Em Estoque
                    </div>
                  )}
                </div>
              )}
              
              {/* Novo Sistema de Badges */}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                <ProductBadges product={product} />
                {product.is_generic && (
                  <Badge className="bg-blue-500 text-white">
                    Genérico
                  </Badge>
                )}
              </div>

              {/* Action buttons */}
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                <button
                  onClick={toggleFavorite}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg ${
                    isFavorite 
                      ? 'bg-red-500 text-white' 
                      : 'bg-white text-gray-400 hover:text-red-500'
                  }`}
                >
                  <Heart className={`w-6 h-6 ${isFavorite ? 'fill-current' : ''}`} />
                </button>
                <button
                  onClick={shareProduct}
                  className="w-12 h-12 rounded-full bg-white text-gray-400 hover:text-emerald-600 flex items-center justify-center shadow-lg transition-all"
                >
                  <Share2 className="w-6 h-6" />
                </button>
              </div>
            </div>
          </motion.div>

          {/* Product Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Brand */}
            {product.brand && (
              <p className="text-emerald-600 font-medium">{product.brand}</p>
            )}

            {/* Name */}
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
              {product.name}
            </h1>

            {/* Details */}
            <div className="flex flex-wrap gap-3">
              {product.dosage && (
                <span className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-sm">
                  {product.dosage}
                </span>
              )}
              {product.quantity_per_package && (
                <span className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-sm">
                  {product.quantity_per_package} un
                </span>
              )}
              {product.active_ingredient && (
                <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-sm">
                  {product.active_ingredient}
                </span>
              )}
            </div>

            {/* Prescription warning */}
            {(product.requires_prescription || product.is_antibiotic || product.is_controlled) && (
              <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <FileText className="w-6 h-6 text-blue-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-blue-900 mb-1">Receita obrigatória</p>
                  <p className="text-sm text-blue-700">
                    {product.is_controlled && (
                      <span className="block mb-1">
                        <strong>Medicamento controlado.</strong> Receita obrigatória para receber em casa ou retirar na farmácia.
                      </span>
                    )}
                    {product.is_antibiotic && !product.is_controlled && (
                      <span className="block mb-1">
                        <strong>Medicamento antibiótico.</strong> Receita obrigatória para receber em casa ou retirar na farmácia.
                      </span>
                    )}
                    {!product.is_controlled && !product.is_antibiotic && product.requires_prescription && (
                      <span className="block mb-1">
                        Este medicamento requer receita médica para a compra.
                      </span>
                    )}
                    <Link to={createPageUrl('UploadPrescription')} className="underline">
                      Envie sua receita aqui.
                    </Link>
                  </p>
                </div>
              </div>
            )}

            {/* Social Proof - Pessoas navegando */}
            <div className="flex items-center justify-between">
              <LiveVisitors />
            </div>

            {/* Price */}
            <div className="py-6 border-t border-b">
              {product.original_price && product.original_price > product.price && (
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg text-gray-400 line-through">
                    {formatPriceWithSymbol(product.original_price)}
                  </span>
                </div>
              )}
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl font-bold text-emerald-600">
                  {formatPriceWithSymbol(product.price)}
                </span>
                <span className="text-gray-500">cada</span>
              </div>
              {/* Novo Badge de Economia */}
              {product.original_price && product.original_price > product.price && (
                <SavingsBadge 
                  originalPrice={product.original_price} 
                  currentPrice={product.price} 
                />
              )}
              {(() => {
                const installments = theme.installments || 3;
                const hasInterest = theme.installmentHasInterest || false;
                const installmentValue = product.price / installments;
                return (
                  <p className="text-sm text-gray-500 mt-1">
                    ou {installments}x de {formatPriceWithSymbol(installmentValue)} {hasInterest ? 'com juros' : 'sem juros'}
                  </p>
                );
              })()}
            </div>

            {/* Quantity and Add to cart */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-gray-600">Quantidade:</span>
                <div className="flex items-center border rounded-xl">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-3 hover:bg-gray-100 rounded-l-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={quantity <= 1}
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <span className="w-16 text-center font-semibold text-lg">{quantity}</span>
                  <button
                    onClick={() => {
                      const maxQty = product.stock_quantity !== undefined ? product.stock_quantity : 999;
                      if (quantity < maxQty) {
                        setQuantity(quantity + 1);
                      } else {
                        toast.error(`Apenas ${maxQty} unidade(s) disponível(eis)`);
                      }
                    }}
                    className="p-3 hover:bg-gray-100 rounded-r-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={product.stock_quantity !== undefined && quantity >= product.stock_quantity}
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <span className="text-2xl font-bold text-gray-900">
                  R$ {(product.price * quantity).toFixed(2)}
                </span>
              </div>
              
              {/* Novo: Stock Urgency Badge */}
              <StockUrgencyBadge stock={product.stock_quantity} />

              <div className="grid sm:grid-cols-2 gap-3">
                <Button
                  onClick={addToCart}
                  size="lg"
                  className="bg-emerald-600 hover:bg-emerald-700 h-14 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={product.stock_quantity !== undefined && product.stock_quantity <= 0}
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  {product.stock_quantity !== undefined && product.stock_quantity <= 0 
                    ? 'Fora de Estoque' 
                    : 'Adicionar ao Carrinho'}
                </Button>
                <Button
                  onClick={handleWhatsAppBuy}
                  size="lg"
                  variant="outline"
                  className="h-14 text-lg border-green-500 text-green-600 hover:bg-green-50"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Comprar no WhatsApp
                </Button>
              </div>

              {/* Compra Expressa (1-Click) */}
              {product.stock_quantity !== undefined && product.stock_quantity > 0 && (
                <div className="mt-3">
                  <ExpressPurchase 
                    product={product}
                    onSuccess={(order) => {
                      toast.success('Pedido realizado com sucesso!');
                      window.location.href = `/track-order?id=${order.id}`;
                    }}
                  />
                </div>
              )}
              
              {/* Notify when back in stock */}
              {product.stock_quantity !== undefined && product.stock_quantity <= 0 && (
                <Button
                  variant="outline"
                  className="w-full border-orange-500 text-orange-600 hover:bg-orange-50"
                  onClick={() => setNotifyDialogOpen(true)}
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Avise-me quando voltar ao estoque
                </Button>
              )}
            </div>


            {/* Trust badges */}
            <div className="grid grid-cols-2 gap-4 py-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  <Truck className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="text-sm">
                  <p className="font-medium text-gray-900">Entrega Rápida</p>
                  <p className="text-gray-500">Receba hoje</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-sm">
                  <p className="font-medium text-gray-900">Produto Original</p>
                  <p className="text-gray-500">Garantia de qualidade</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Product Details Tabs */}
        <div className="mt-12">
          <Tabs defaultValue="description" className="bg-white rounded-2xl shadow-sm p-6">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="description">Descrição</TabsTrigger>
              <TabsTrigger value="usage">Como Usar</TabsTrigger>
              <TabsTrigger value="indications">Indicações</TabsTrigger>
              <TabsTrigger value="warnings">Atenção</TabsTrigger>
            </TabsList>
            
            <TabsContent value="description" className="prose max-w-none">
              <p className="text-gray-600 leading-relaxed">
                {product.description || product.technical_description || 'Descrição não disponível para este produto.'}
              </p>
            </TabsContent>
            
            <TabsContent value="usage" className="prose max-w-none">
              <p className="text-gray-600 leading-relaxed">
                {product.usage_instructions || 'Siga as orientações do seu médico ou farmacêutico. Em caso de dúvidas, consulte a bula do medicamento.'}
              </p>
            </TabsContent>
            
            <TabsContent value="indications" className="prose max-w-none">
              <p className="text-gray-600 leading-relaxed">
                {product.indications || 'Consulte a bula do medicamento para informações completas sobre as indicações.'}
              </p>
            </TabsContent>
            
            <TabsContent value="warnings" className="prose max-w-none">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                <p className="text-amber-800 font-medium">⚠️ Atenção</p>
              </div>
              <p className="text-gray-600 leading-relaxed">
                {product.contraindications || 'SE PERSISTIREM OS SINTOMAS, O MÉDICO DEVERÁ SER CONSULTADO. Leia atentamente a bula antes de usar o medicamento. Não use medicamentos sem orientação médica.'}
              </p>
            </TabsContent>
          </Tabs>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mt-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">Produtos Relacionados</h2>
            <ProductGrid 
              products={relatedProducts.slice(0, 4)}
              onAddToCart={(p) => {
                const cart = JSON.parse(localStorage.getItem('pharmacyCart') || '[]');
                const existing = cart.find(item => item.id === p.id);
                if (existing) existing.quantity += 1;
                else cart.push({ ...p, quantity: 1 });
                localStorage.setItem('pharmacyCart', JSON.stringify(cart));
                window.dispatchEvent(new Event('cartUpdated'));
                toast.success(`${p.name} adicionado ao carrinho!`);
              }}
              favorites={favorites}
            />
          </section>
        )}
      </div>

      {/* Dialog de Notificação de Estoque */}
      <Dialog open={notifyDialogOpen} onOpenChange={setNotifyDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-orange-500" />
              Avise-me quando voltar
            </DialogTitle>
            <DialogDescription>
              Preencha seus dados e enviaremos uma notificação quando <strong>{product?.name}</strong> voltar ao estoque.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notify-name">Nome *</Label>
              <Input
                id="notify-name"
                placeholder="Seu nome completo"
                value={notifyData.name}
                onChange={(e) => setNotifyData({ ...notifyData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notify-email">Email</Label>
              <Input
                id="notify-email"
                type="email"
                placeholder="seu@email.com"
                value={notifyData.email}
                onChange={(e) => setNotifyData({ ...notifyData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notify-phone">WhatsApp</Label>
              <Input
                id="notify-phone"
                type="tel"
                placeholder="(99) 99999-9999"
                value={notifyData.phone}
                onChange={(e) => {
                  let value = e.target.value.replace(/\D/g, '');
                  if (value.length <= 11) {
                    if (value.length >= 11) {
                      value = value.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
                    } else if (value.length >= 7) {
                      value = value.replace(/^(\d{2})(\d{4})(\d{0,4})$/, '($1) $2-$3');
                    } else if (value.length >= 3) {
                      value = value.replace(/^(\d{2})(\d{0,5})$/, '($1) $2');
                    }
                    setNotifyData({ ...notifyData, phone: value });
                  }
                }}
              />
            </div>
            <p className="text-xs text-gray-500">
              * Informe pelo menos email ou WhatsApp
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setNotifyDialogOpen(false);
                setNotifyData({ name: '', email: '', phone: '' });
              }}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-orange-500 hover:bg-orange-600"
              disabled={!notifyData.name || (!notifyData.email && !notifyData.phone)}
              onClick={async () => {
                try {
                  const result = await saveStockNotification({
                    product_id: product.id,
                    product_name: product.name,
                    customer_name: notifyData.name,
                    customer_email: notifyData.email,
                    customer_phone: notifyData.phone.replace(/\D/g, '')
                  });

                  if (result.alreadyExists) {
                    toast.info('Você já está inscrito para receber notificação deste produto!');
                  } else {
                    toast.success('✓ Notificação cadastrada! Avisaremos quando o produto voltar.');
                  }

                  setNotifyDialogOpen(false);
                  setNotifyData({ name: '', email: '', phone: '' });
                } catch (error) {
                  toast.error('Erro ao cadastrar notificação. Tente novamente.');
                  console.error('Erro:', error);
                }
              }}
            >
              <Bell className="w-4 h-4 mr-2" />
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}