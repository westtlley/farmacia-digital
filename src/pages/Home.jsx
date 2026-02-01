import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { ArrowRight, Percent, ChevronRight, Star, FileText, Check, TrendingUp, Eye } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import HeroBanner from '@/components/pharmacy/HeroBanner';
import CategoryGrid from '@/components/pharmacy/CategoryGrid';
import ProductGrid from '@/components/pharmacy/ProductGrid';
import DeliveryWidget from '@/components/pharmacy/DeliveryWidget';
import FlashSalesWidget from '@/components/pharmacy/FlashSalesWidget';
import HappyHourDelivery from '@/components/pharmacy/HappyHourDelivery';
import { SocialProofBanner, LiveVisitors } from '@/components/pharmacy/SocialProof';
import { useTheme } from '@/components/pharmacy/ThemeProvider';
import { toast } from 'sonner';
import { useProductFilters, isProductAvailable } from '@/hooks/useProductFilters';

export default function Home() {
  const theme = useTheme();
  const [favorites, setFavorites] = useState([]);
  const [customerZipCode, setCustomerZipCode] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('pharmacyFavorites');
    if (saved) setFavorites(JSON.parse(saved));
    
    // Carregar CEP do cliente para Flash Sales
    const savedZip = localStorage.getItem('customer_zipcode');
    if (savedZip) setCustomerZipCode(savedZip);
  }, []);

  // Otimizado: Carregar apenas produtos necessários para a home (limitado a 200)
  const { data: allProducts = [], isLoading, error } = useQuery({
    queryKey: ['products', 'home'],
    queryFn: async () => {
      try {
        // Limitar a 200 produtos iniciais para melhor performance
        const products = await base44.entities.Product.list('-created_date', 200);
        // Filtrar apenas produtos ativos, com preço válido e com estoque disponível
        return products.filter(p => {
          if (p.status !== 'active' || !p.price || p.price <= 0 || !p.name) {
            return false;
          }
          // Filtrar produtos com estoque zero (exceto estoque infinito)
          if (!p.has_infinite_stock && p.stock_quantity !== undefined && p.stock_quantity <= 0) {
            return false;
          }
          // Verificar estoque mínimo se habilitado
          if (p.min_stock_enabled && !p.has_infinite_stock) {
            const minStock = p.min_stock || 10;
            if (p.stock_quantity !== undefined && p.stock_quantity < minStock) {
              return false;
            }
          }
          return true;
        });
      } catch (err) {
        console.error('Erro ao buscar produtos:', err);
        toast.error('Erro ao carregar produtos. Tente novamente.');
        return [];
      }
    },
    staleTime: 2 * 60 * 1000, // Cache por 2 minutos
    retry: 2
  });

  // Usar hook de filtros otimizado
  const { newProducts, featuredProducts, promotionProducts, recentlyViewed } = useProductFilters(allProducts);


  const banners = theme.banners?.filter(b => b.active && b.position === 'hero') || [];

  const addToCart = (product) => {
    // Validações antes de adicionar ao carrinho
    if (!product || !product.id) {
      toast.error('Produto inválido');
      return;
    }

    if (product.status !== 'active') {
      toast.error('Este produto não está disponível para compra');
      return;
    }

    // Usar validação de estoque melhorada
    if (!isProductAvailable(product)) {
      if (product.has_infinite_stock) {
        // Produto com estoque infinito sempre disponível
      } else if (product.stock_quantity !== undefined && product.stock_quantity <= 0) {
        toast.error('Produto fora de estoque');
        return;
      } else if (product.min_stock_enabled && product.stock_quantity < (product.min_stock || 10)) {
        toast.error(`Produto abaixo do estoque mínimo (${product.min_stock || 10} unidades)`);
        return;
      } else {
        toast.error('Produto não disponível');
        return;
      }
    }

    const cart = JSON.parse(localStorage.getItem('pharmacyCart') || '[]');
    const existing = cart.find(item => item.id === product.id);
    
    // Verificar estoque disponível
    if (existing) {
      const newQuantity = existing.quantity + 1;
      // Não verificar estoque se for infinito
      if (!product.has_infinite_stock && product.stock_quantity !== undefined && newQuantity > product.stock_quantity) {
        toast.error(`Apenas ${product.stock_quantity} unidade(s) disponível(eis) em estoque`);
        return;
      }
      existing.quantity = newQuantity;
    } else {
      cart.push({ ...product, quantity: 1 });
    }
    
    localStorage.setItem('pharmacyCart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cartUpdated'));
    toast.success(`${product.name} adicionado ao carrinho!`);
  };

  const toggleFavorite = (product) => {
    const updated = favorites.includes(product.id)
      ? favorites.filter(id => id !== product.id)
      : [...favorites, product.id];
    
    setFavorites(updated);
    localStorage.setItem('pharmacyFavorites', JSON.stringify(updated));
    
    if (updated.includes(product.id)) {
      toast.success('Adicionado aos favoritos!');
    }
  };

  // Get ordered sections - Ordem: Banner → Mais Vendidos → Categorias → Delivery Widget → Ofertas → Enviar receita
  const sections = theme.layout?.homeSections || [
    {id: '1', type: 'hero', enabled: true, order: 1}, // Banner
    {id: '7', type: 'happyhour', enabled: true, order: 2}, // Happy Hour (logo após hero)
    {id: '2', type: 'featured', enabled: true, order: 3}, // Mais Vendidos
    {id: '3', type: 'categories', enabled: true, order: 4}, // Categorias
    {id: '8', type: 'flashsales', enabled: true, order: 5}, // Flash Sales (antes de promoções)
    {id: '6', type: 'delivery', enabled: true, order: 6}, // Widget de Delivery
    {id: '4', type: 'promotions', enabled: true, order: 7}, // Ofertas/Promoções
    {id: '5', type: 'cta', enabled: true, order: 8} // Enviar receita
  ];

  const orderedSections = sections
    .filter(s => s.enabled)
    .sort((a, b) => a.order - b.order);

  // Render section based on type
  const renderSection = (section) => {
    switch (section.type) {
      case 'hero':
        return (
          <React.Fragment key={section.id}>
            <section className="max-w-7xl mx-auto px-4 pt-0 pb-4">
              <HeroBanner banners={banners} />
            </section>
            {/* Social Proof Banner - Logo após o Hero */}
            <section className="max-w-7xl mx-auto px-4 py-6">
              <SocialProofBanner />
            </section>
          </React.Fragment>
        );

      case 'categories':
        return (
          <section key={section.id} className="max-w-7xl mx-auto px-4 py-4">
            <CategoryGrid />
          </section>
        );

      case 'delivery':
        return (
          <section key={section.id} className="max-w-7xl mx-auto px-4 py-8">
            <DeliveryWidget />
          </section>
        );

      case 'flashsales':
        return (
          <section key={section.id} className="max-w-7xl mx-auto px-4 py-8">
            <FlashSalesWidget zipCode={customerZipCode} />
          </section>
        );

      case 'happyhour':
        return (
          <section key={section.id} className="max-w-7xl mx-auto px-4 py-4">
            <HappyHourDelivery />
          </section>
        );

      case 'promotions':
        if (isLoading) {
          return (
            <section key={section.id} className="max-w-7xl mx-auto px-4 py-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-11 h-11 rounded-xl" />
                  <div>
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-2xl" />
                ))}
              </div>
            </section>
          );
        }
        
        if (promotionProducts.length === 0) {
          return (
            <section key={section.id} className="max-w-7xl mx-auto px-4 py-8">
              <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                <Percent className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Nenhuma oferta no momento
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Fique atento! Novas promoções em breve.
                </p>
                <Link 
                  to={createPageUrl('Promotions')}
                  className="inline-flex items-center gap-2 text-sm font-semibold hover:gap-3 transition-all"
                  style={{ color: theme.colors?.primary || theme.primaryColor }}
                >
                  Ver todas as ofertas
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </section>
          );
        }
        
        return (
          <section key={section.id} className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div 
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: theme.getPrimaryGradient() }}
                >
                  <Percent className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Ofertas Imperdíveis</h2>
                  <p className="text-sm text-gray-600">Economize até 50% em produtos selecionados</p>
                </div>
              </div>
              <Link 
                to={createPageUrl('Promotions')}
                className="hidden md:flex items-center gap-2 font-semibold hover:gap-3 transition-all text-sm"
                style={{ color: theme.colors?.primary || theme.primaryColor }}
                aria-label="Ver todas as ofertas"
              >
                Ver todas as ofertas
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <ProductGrid 
              products={promotionProducts}
              isLoading={false}
              onAddToCart={addToCart}
              onAddToFavorites={toggleFavorite}
              favorites={favorites}
              columns={theme.getGridCols ? theme.getGridCols() : 4}
            />
          </section>
        );

      case 'featured':
        // Sempre mostrar a seção, mesmo durante loading ou sem produtos
        return (
          <section key={section.id} className="bg-white py-4 border-y">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: theme.getPrimaryGradient() }}
                  >
                    <Star className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Mais Vendidos</h2>
                    <p className="text-sm text-gray-600">Os produtos preferidos dos nossos clientes</p>
                  </div>
                </div>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-square rounded-2xl" />
                  ))}
                </div>
              ) : featuredProducts.length === 0 ? (
                // Fallback: mostrar produtos disponíveis se não houver em destaque
                allProducts.length > 0 ? (
                  <div>
                    <div className="mb-4 text-center">
                      <p className="text-sm text-gray-500 mb-4">
                        💊 Digite o nome do medicamento na busca acima ou explore nossos produtos disponíveis.
                      </p>
                    </div>
                    <ProductGrid 
                      products={allProducts.slice(0, 8)}
                      isLoading={false}
                      onAddToCart={addToCart}
                      onAddToFavorites={toggleFavorite}
                      favorites={favorites}
                      columns={theme.getGridCols ? theme.getGridCols() : 4}
                    />
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <Star className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                      Nenhum produto em destaque no momento
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      💊 Digite o nome do medicamento na busca acima ou envie sua receita.
                    </p>
                  </div>
                )
              ) : (
                <ProductGrid 
                  products={featuredProducts}
                  isLoading={false}
                  onAddToCart={addToCart}
                  onAddToFavorites={toggleFavorite}
                  favorites={favorites}
                  columns={theme.getGridCols ? theme.getGridCols() : 4}
                />
              )}
            </div>
          </section>
        );

      case 'cta':
        const ctaConfig = theme.sections?.cta || {};
        return (
          <section key={section.id} className="max-w-7xl mx-auto px-4 py-4">
            <div 
              className="relative overflow-hidden rounded-2xl p-6 md:p-8"
              style={{ background: theme.getPrimaryGradient() }}
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
              
              <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="text-center md:text-left flex-1">
                  <div className="flex items-center gap-2 mb-3 justify-center md:justify-start">
                    <FileText className="w-6 h-6 text-white" />
                    <h3 className="text-2xl md:text-3xl font-bold text-white">
                      {ctaConfig.title || 'Tem receita médica?'}
                    </h3>
                  </div>
                  <p className="text-white/90 text-base mb-4">
                    {ctaConfig.subtitle || 'Envie sua receita e receba um orçamento personalizado em minutos!'}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-white/90 text-sm justify-center md:justify-start">
                    <span className="flex items-center gap-1">
                      <Check className="w-4 h-4" />
                      Resposta em até 2h
                    </span>
                    <span className="flex items-center gap-1">
                      <Check className="w-4 h-4" />
                      Orçamento gratuito
                    </span>
                    <span className="flex items-center gap-1">
                      <Check className="w-4 h-4" />
                      Entrega rápida
                    </span>
                  </div>
                </div>
                <Link to={createPageUrl('UploadPrescription')} className="aria-label: Enviar receita médica">
                  <Button 
                    size="lg" 
                    className="bg-white hover:bg-gray-50 px-8 py-6 text-base font-bold shadow-lg hover:shadow-xl transition-all"
                    style={{ 
                      color: theme.colors?.primary || theme.primaryColor,
                      borderRadius: theme.radius?.button || '12px'
                    }}
                  >
                    Enviar Receita Agora
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        );

      case 'recently_viewed':
        if (recentlyViewed.length === 0) {
          return (
            <section key={section.id} className="max-w-7xl mx-auto px-4 py-8">
              <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                <Eye className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Nenhum produto visualizado recentemente
                </h3>
                <p className="text-sm text-gray-500">
                  Explore nossos produtos e eles aparecerão aqui!
                </p>
              </div>
            </section>
          );
        }
        return (
          <section key={section.id} className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div 
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: theme.getPrimaryGradient() }}
                >
                  <Eye className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Vistos Recentemente</h2>
                  <p className="text-sm text-gray-600">Continue de onde parou</p>
                </div>
              </div>
            </div>
            <ProductGrid 
              products={recentlyViewed}
              isLoading={false}
              onAddToCart={addToCart}
              onAddToFavorites={toggleFavorite}
              favorites={favorites}
              columns={theme.getGridCols ? theme.getGridCols() : 4}
            />
          </section>
        );

      case 'new_products':
        if (isLoading) {
          return (
            <section key={section.id} className="bg-white py-8 border-y">
              <div className="max-w-7xl mx-auto px-4">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-11 h-11 rounded-xl" />
                    <div>
                      <Skeleton className="h-8 w-48 mb-2" />
                      <Skeleton className="h-4 w-64" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-square rounded-2xl" />
                  ))}
                </div>
              </div>
            </section>
          );
        }
        
        if (newProducts.length === 0) {
          return (
            <section key={section.id} className="bg-white py-8 border-y">
              <div className="max-w-7xl mx-auto px-4">
                <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                  <span className="text-6xl mb-4 block">🆕</span>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    Nenhum produto novo no momento
                  </h3>
                  <p className="text-sm text-gray-500">
                    Em breve teremos novidades para você!
                  </p>
                </div>
              </div>
            </section>
          );
        }
        
        return (
          <section key={section.id} className="bg-white py-8 border-y">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: theme.getPrimaryGradient() }}
                  >
                    <span className="text-white text-xl">🆕</span>
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Novidades</h2>
                    <p className="text-sm text-gray-600">Produtos recém-chegados</p>
                  </div>
                </div>
              </div>
              <ProductGrid 
                products={newProducts}
                isLoading={false}
                onAddToCart={addToCart}
                onAddToFavorites={toggleFavorite}
                favorites={favorites}
                columns={theme.getGridCols ? theme.getGridCols() : 4}
              />
            </div>
          </section>
        );

      default:
        return null;
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.colors?.background || theme.backgroundColor || '#f9fafb' }}>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Erro ao carregar página</h2>
          <p className="text-gray-500">Tente recarregar a página</p>
        </div>
      </div>
    );
  }

  // SEO: Adicionar meta tags dinâmicas
  useEffect(() => {
    const storeName = theme.storeName || 'Farmácia Digital';
    document.title = `${storeName} - Sua farmácia online`;
    
    // Adicionar meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', 
      `Compre medicamentos, vitaminas e produtos de saúde com segurança e praticidade. ${allProducts.length} produtos disponíveis. Entrega rápida e preços competitivos.`
    );
    
    // Adicionar structured data (Schema.org)
    const existingScript = document.getElementById('schema-org-data');
    if (existingScript) existingScript.remove();
    
    const script = document.createElement('script');
    script.id = 'schema-org-data';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Pharmacy",
      "name": storeName,
      "url": window.location.origin,
      "logo": theme.logo || `${window.location.origin}/logo.png`,
      "description": `Farmácia online com ${allProducts.length} produtos de saúde e bem-estar`,
      "offers": {
        "@type": "AggregateOffer",
        "offerCount": allProducts.length,
        "lowPrice": allProducts.length > 0 ? Math.min(...allProducts.map(p => p.price)) : 0,
        "highPrice": allProducts.length > 0 ? Math.max(...allProducts.map(p => p.price)) : 0,
        "priceCurrency": "BRL"
      }
    });
    document.head.appendChild(script);
    
    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, [theme.storeName, theme.logo, allProducts.length]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.colors?.background || theme.backgroundColor || '#f9fafb' }}>
      {isLoading && orderedSections.length > 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
            <p className="text-gray-600">Carregando produtos...</p>
          </div>
        </div>
      )}
      {orderedSections.map(section => renderSection(section))}
    </div>
  );
}