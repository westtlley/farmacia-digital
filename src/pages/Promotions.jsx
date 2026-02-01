import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Percent, 
  Clock, 
  Flame, 
  Tag,
  TrendingDown,
  Gift,
  Zap
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';

import ProductGrid from '@/components/pharmacy/ProductGrid';

export default function Promotions() {
  const [favorites, setFavorites] = useState([]);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    const saved = localStorage.getItem('pharmacyFavorites');
    if (saved) setFavorites(JSON.parse(saved));
  }, []);

  const { data: promotionProducts = [], isLoading } = useQuery({
    queryKey: ['promotionProducts'],
    queryFn: async () => {
      const products = await base44.entities.Product.filter(
        { status: 'active', is_promotion: true },
        '-sales_count',
        50
      );
      // Filtrar produtos com estoque zero (exceto estoque infinito)
      return products.filter(p => {
        if (!p.price || p.price <= 0) return false;
        // Produtos com estoque infinito sempre disponíveis
        if (p.has_infinite_stock) return true;
        // Produtos com estoque zero não devem aparecer
        if (p.stock_quantity !== undefined && p.stock_quantity <= 0) return false;
        // Verificar estoque mínimo se habilitado
        if (p.min_stock_enabled) {
          const minStock = p.min_stock || 10;
          if (p.stock_quantity !== undefined && p.stock_quantity < minStock) return false;
        }
        return true;
      });
    }
  });

  const { data: allProducts = [] } = useQuery({
    queryKey: ['allProducts'],
    queryFn: async () => {
      const products = await base44.entities.Product.filter(
        { status: 'active' },
        '-sales_count',
        100
      );
      return products;
    }
  });

  // Calculate countdown for end of day
  const [timeLeft, setTimeLeft] = useState('');
  
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      
      const diff = endOfDay - now;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Get products with biggest discounts (filtrar produtos zerados)
  const biggestDiscounts = allProducts
    .filter(p => {
      if (!p.original_price || !p.original_price > p.price) return false;
      if (!p.price || p.price <= 0) return false;
      // Produtos com estoque infinito sempre disponíveis
      if (p.has_infinite_stock) return true;
      // Produtos com estoque zero não devem aparecer
      if (p.stock_quantity !== undefined && p.stock_quantity <= 0) return false;
      // Verificar estoque mínimo se habilitado
      if (p.min_stock_enabled) {
        const minStock = p.min_stock || 10;
        if (p.stock_quantity !== undefined && p.stock_quantity < minStock) return false;
      }
      return true;
    })
    .map(p => ({
      ...p,
      discountPercent: Math.round(((p.original_price - p.price) / p.original_price) * 100)
    }))
    .sort((a, b) => b.discountPercent - a.discountPercent)
    .slice(0, 8);

  // Get stagnant products (low sales, needs to move)
  const stagnantProducts = allProducts
    .filter(p => (p.sales_count || 0) < 10 && p.stock_quantity > 20)
    .slice(0, 8);

  const addToCart = (product) => {
    const cart = JSON.parse(localStorage.getItem('pharmacyCart') || '[]');
    const existing = cart.find(item => item.id === product.id);
    
    if (existing) existing.quantity += 1;
    else cart.push({ ...product, quantity: 1 });
    
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
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Banner */}
      <section className="bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Flame className="w-8 h-8 animate-pulse" />
                <Badge className="bg-white/20 text-white text-lg px-4 py-1">
                  MEGA PROMOÇÃO
                </Badge>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Ofertas Imperdíveis
              </h1>
              <p className="text-xl text-red-100">
                Economize até 50% em produtos selecionados
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
              <p className="text-red-100 mb-2 flex items-center justify-center gap-2">
                <Clock className="w-5 h-5" />
                Ofertas do dia terminam em:
              </p>
              <div className="text-4xl md:text-5xl font-mono font-bold">
                {timeLeft}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-4 mb-8">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Percent className="w-4 h-4" />
              Todas
            </TabsTrigger>
            <TabsTrigger value="flash" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Flash
            </TabsTrigger>
            <TabsTrigger value="biggest" className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Maior %
            </TabsTrigger>
            <TabsTrigger value="clearance" className="flex items-center gap-2">
              <Gift className="w-4 h-4" />
              Queima
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <Percent className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Todas as Promoções</h2>
                  <p className="text-gray-500">{promotionProducts.length} produtos em oferta</p>
                </div>
              </div>
              
              <ProductGrid
                products={promotionProducts}
                isLoading={isLoading}
                onAddToCart={addToCart}
                onAddToFavorites={toggleFavorite}
                favorites={favorites}
              />
            </div>
          </TabsContent>

          <TabsContent value="flash">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-yellow-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Ofertas Relâmpago</h2>
                  <p className="text-gray-500">Válidas apenas hoje!</p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-6 mb-8">
                <div className="flex items-center gap-4">
                  <div className="animate-pulse">
                    <Zap className="w-12 h-12 text-yellow-500" />
                  </div>
                  <div>
                    <p className="font-bold text-yellow-800 text-lg">Corra! Ofertas por tempo limitado</p>
                    <p className="text-yellow-600">Preços especiais que acabam à meia-noite</p>
                  </div>
                </div>
              </div>
              
              <ProductGrid
                products={promotionProducts.slice(0, 8)}
                isLoading={isLoading}
                onAddToCart={addToCart}
                onAddToFavorites={toggleFavorite}
                favorites={favorites}
              />
            </div>
          </TabsContent>

          <TabsContent value="biggest">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Maiores Descontos</h2>
                  <p className="text-gray-500">Os produtos com maior economia</p>
                </div>
              </div>
              
              <ProductGrid
                products={biggestDiscounts}
                isLoading={isLoading}
                onAddToCart={addToCart}
                onAddToFavorites={toggleFavorite}
                favorites={favorites}
              />
            </div>
          </TabsContent>

          <TabsContent value="clearance">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Gift className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Queima de Estoque</h2>
                  <p className="text-gray-500">Preços especiais para renovar nosso estoque</p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-6 mb-8">
                <div className="flex items-center gap-4">
                  <Gift className="w-12 h-12 text-purple-500" />
                  <div>
                    <p className="font-bold text-purple-800 text-lg">Oportunidade única!</p>
                    <p className="text-purple-600">Produtos com preços especiais enquanto durarem os estoques</p>
                  </div>
                </div>
              </div>
              
              <ProductGrid
                products={stagnantProducts}
                isLoading={isLoading}
                onAddToCart={addToCart}
                onAddToFavorites={toggleFavorite}
                favorites={favorites}
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Combos Section */}
        <section className="mt-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Tag className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Combos Especiais</h2>
              <p className="text-gray-500">Kits com preços ainda melhores</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: 'Kit Imunidade',
                description: 'Vitamina C + Vitamina D + Zinco',
                originalPrice: 120,
                comboPrice: 89.90,
                image: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=300&h=200&fit=crop'
              },
              {
                title: 'Kit Gripe',
                description: 'Antigripal + Vitamina C + Mel e Própolis',
                originalPrice: 85,
                comboPrice: 59.90,
                image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&h=200&fit=crop'
              },
              {
                title: 'Kit Skincare',
                description: 'Protetor Solar + Hidratante + Sérum Vitamina C',
                originalPrice: 180,
                comboPrice: 129.90,
                image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=300&h=200&fit=crop'
              }
            ].map((combo, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow group"
              >
                <div className="relative aspect-video overflow-hidden">
                  <img
                    src={combo.image}
                    alt={combo.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <Badge className="absolute top-3 left-3 bg-blue-500 text-white">
                    COMBO
                  </Badge>
                </div>
                <div className="p-6">
                  <h3 className="font-bold text-xl text-gray-900 mb-1">{combo.title}</h3>
                  <p className="text-gray-500 text-sm mb-4">{combo.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400 line-through">
                        R$ {combo.originalPrice.toFixed(2)}
                      </p>
                      <p className="text-2xl font-bold text-emerald-600">
                        R$ {combo.comboPrice.toFixed(2)}
                      </p>
                    </div>
                    <Badge className="bg-green-100 text-green-700">
                      Economize R$ {(combo.originalPrice - combo.comboPrice).toFixed(2)}
                    </Badge>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}