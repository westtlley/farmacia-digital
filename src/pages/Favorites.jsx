import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Heart, ArrowLeft, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';

import ProductGrid from '@/components/pharmacy/ProductGrid';

export default function Favorites() {
  const [favoriteIds, setFavoriteIds] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('pharmacyFavorites');
    if (saved) setFavoriteIds(JSON.parse(saved));
  }, []);

  const { data: allProducts = [], isLoading } = useQuery({
    queryKey: ['allProducts'],
    queryFn: () => base44.entities.Product.filter({ status: 'active' }, '-created_date', 200)
  });

  const favoriteProducts = allProducts.filter(p => {
    if (!favoriteIds.includes(p.id)) return false;
    // Filtrar produtos com estoque zero (exceto estoque infinito)
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
    const updated = favoriteIds.filter(id => id !== product.id);
    setFavoriteIds(updated);
    localStorage.setItem('pharmacyFavorites', JSON.stringify(updated));
    toast.success('Removido dos favoritos');
  };

  const clearFavorites = () => {
    setFavoriteIds([]);
    localStorage.setItem('pharmacyFavorites', JSON.stringify([]));
    toast.success('Favoritos limpos');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Home')}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Meus Favoritos</h1>
              <p className="text-gray-500">{favoriteProducts.length} produtos salvos</p>
            </div>
          </div>
          
          {favoriteProducts.length > 0 && (
            <Button variant="ghost" onClick={clearFavorites} className="text-red-500 hover:text-red-600 hover:bg-red-50">
              <Trash2 className="w-4 h-4 mr-2" />
              Limpar tudo
            </Button>
          )}
        </div>

        {favoriteProducts.length > 0 ? (
          <ProductGrid
            products={favoriteProducts}
            isLoading={isLoading}
            onAddToCart={addToCart}
            onAddToFavorites={toggleFavorite}
            favorites={favoriteIds}
          />
        ) : (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="w-12 h-12 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Nenhum favorito ainda
            </h2>
            <p className="text-gray-500 mb-8">
              Adicione produtos aos favoritos clicando no coração
            </p>
            <Link to={createPageUrl('Home')}>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                Explorar produtos
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}