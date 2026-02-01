import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { 
  ChevronRight, 
  SlidersHorizontal,
  Grid3X3,
  List
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';

import ProductGrid from '@/components/pharmacy/ProductGrid';

const categoryInfo = {
  medicamentos: {
    name: 'Medicamentos',
    icon: '💊',
    description: 'Medicamentos genéricos e de referência',
    banner: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=1600&h=400&fit=crop'
  },
  dermocosmeticos: {
    name: 'Dermocosméticos',
    icon: '✨',
    description: 'Cuidados com a pele e tratamentos dermatológicos',
    banner: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=1600&h=400&fit=crop'
  },
  vitaminas: {
    name: 'Vitaminas e Suplementos',
    icon: '🍊',
    description: 'Vitaminas, minerais e suplementos alimentares',
    banner: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=1600&h=400&fit=crop'
  },
  higiene: {
    name: 'Higiene Pessoal',
    icon: '🧴',
    description: 'Produtos de higiene e cuidados pessoais',
    banner: 'https://images.unsplash.com/photo-1585232004423-244e0e6904e3?w=1600&h=400&fit=crop'
  },
  infantil: {
    name: 'Infantil',
    icon: '👶',
    description: 'Produtos para crianças de todas as idades',
    banner: 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=1600&h=400&fit=crop'
  },
  mamae_bebe: {
    name: 'Mamãe & Bebê',
    icon: '🍼',
    description: 'Produtos para gestantes e recém-nascidos',
    banner: 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=1600&h=400&fit=crop'
  },
  beleza: {
    name: 'Beleza',
    icon: '💄',
    description: 'Maquiagem e produtos de beleza',
    banner: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1600&h=400&fit=crop'
  },
  diabetes: {
    name: 'Diabetes',
    icon: '💉',
    description: 'Produtos para controle e monitoramento do diabetes',
    banner: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1600&h=400&fit=crop'
  },
  nutricao: {
    name: 'Nutrição',
    icon: '🏋️',
    description: 'Nutrição esportiva e funcional',
    banner: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1600&h=400&fit=crop'
  },
  ortopedia: {
    name: 'Ortopedia',
    icon: '🩹',
    description: 'Equipamentos ortopédicos e de suporte',
    banner: 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=1600&h=400&fit=crop'
  }
};

const sortOptions = [
  { value: 'relevance', label: 'Mais Relevantes' },
  { value: 'price_asc', label: 'Menor Preço' },
  { value: 'price_desc', label: 'Maior Preço' },
  { value: 'name_asc', label: 'A-Z' },
  { value: 'sales', label: 'Mais Vendidos' }
];

export default function Category() {
  const urlParams = new URLSearchParams(window.location.search);
  const categorySlug = urlParams.get('cat') || 'medicamentos';

  const [sortBy, setSortBy] = useState('relevance');
  const [viewMode, setViewMode] = useState('grid');
  const [favorites, setFavorites] = useState([]);

  const category = categoryInfo[categorySlug] || categoryInfo.medicamentos;

  useEffect(() => {
    const saved = localStorage.getItem('pharmacyFavorites');
    if (saved) setFavorites(JSON.parse(saved));
  }, []);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['categoryProducts', categorySlug],
    queryFn: async () => {
      const result = await base44.entities.Product.filter(
        { category: categorySlug, status: 'active' },
        '-sales_count',
        10000
      );
      // Filtrar produtos com estoque zero (exceto estoque infinito)
      return result.filter(p => {
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

  // Sort products
  const sortedProducts = React.useMemo(() => {
    let sorted = [...products];
    
    switch (sortBy) {
      case 'price_asc':
        sorted.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        sorted.sort((a, b) => b.price - a.price);
        break;
      case 'name_asc':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'sales':
        sorted.sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0));
        break;
      default:
        break;
    }
    
    return sorted;
  }, [products, sortBy]);

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
      <section 
        className="relative h-48 md:h-64 bg-cover bg-center"
        style={{ backgroundImage: `url(${category.banner})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/30" />
        <div className="relative max-w-7xl mx-auto px-4 h-full flex items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-2 text-white/80 text-sm mb-2">
              <Link to={createPageUrl('Home')} className="hover:text-white">Home</Link>
              <ChevronRight className="w-4 h-4" />
              <span>Categorias</span>
              <ChevronRight className="w-4 h-4" />
              <span className="text-white">{category.name}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-5xl">{category.icon}</span>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white">{category.name}</h1>
                <p className="text-white/80 mt-1">{category.description}</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <p className="text-gray-500">
            {sortedProducts.length} produto{sortedProducts.length !== 1 ? 's' : ''} encontrado{sortedProducts.length !== 1 ? 's' : ''}
          </p>
          
          <div className="flex items-center gap-3">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="hidden md:flex border rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-emerald-100 text-emerald-600' : 'text-gray-400'}`}
              >
                <Grid3X3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-emerald-100 text-emerald-600' : 'text-gray-400'}`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Products */}
        <ProductGrid
          products={sortedProducts}
          isLoading={isLoading}
          onAddToCart={addToCart}
          onAddToFavorites={toggleFavorite}
          favorites={favorites}
          columns={viewMode === 'list' ? 2 : 4}
        />
      </div>
    </div>
  );
}