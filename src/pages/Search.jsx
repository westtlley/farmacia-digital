import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Filter, 
  SlidersHorizontal, 
  X, 
  ChevronDown,
  Grid3X3,
  List
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from 'sonner';

import SearchBar from '@/components/pharmacy/SearchBar';
import ProductGrid from '@/components/pharmacy/ProductGrid';

const categories = [
  { value: 'medicamentos', label: 'Medicamentos' },
  { value: 'dermocosmeticos', label: 'Dermocosméticos' },
  { value: 'vitaminas', label: 'Vitaminas' },
  { value: 'higiene', label: 'Higiene' },
  { value: 'infantil', label: 'Infantil' },
  { value: 'beleza', label: 'Beleza' }
];

const sortOptions = [
  { value: 'relevance', label: 'Mais Relevantes' },
  { value: 'price_asc', label: 'Menor Preço' },
  { value: 'price_desc', label: 'Maior Preço' },
  { value: 'name_asc', label: 'A-Z' },
  { value: 'sales', label: 'Mais Vendidos' }
];

export default function Search() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialQuery = urlParams.get('q') || '';

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [filters, setFilters] = useState({
    categories: [],
    priceRange: [0, 500],
    onlyPromotion: false,
    onlyGeneric: false,
    inStock: true
  });
  const [sortBy, setSortBy] = useState('relevance');
  const [viewMode, setViewMode] = useState('grid');
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('pharmacyFavorites');
    if (saved) setFavorites(JSON.parse(saved));
  }, []);

  const { data: allProducts = [], isLoading } = useQuery({
    queryKey: ['searchProducts'],
    queryFn: async () => {
      // Na busca, mostrar TODOS os produtos (incluindo zerados) para permitir busca completa
      // O filtro de estoque será aplicado apenas se o usuário ativar o filtro "Apenas em estoque"
      const products = await base44.entities.Product.filter(
        { status: 'active' },
        '-sales_count',
        10000
      );
      return products;
    }
  });

  // Filter and search products
  const filteredProducts = React.useMemo(() => {
    let results = [...allProducts];

    // Text search - por nome, SKU e EAN
    if (searchQuery) {
      const queryLower = searchQuery.toLowerCase();
      const queryNumbers = searchQuery.replace(/\D/g, ''); // Extrair apenas números para SKU/EAN
      
      results = results.filter(p => {
        // Buscar por nome
        const matchesName = p.name?.toLowerCase().includes(queryLower);
        // Buscar por marca
        const matchesBrand = p.brand?.toLowerCase().includes(queryLower);
        // Buscar por ingrediente ativo
        const matchesIngredient = p.active_ingredient?.toLowerCase().includes(queryLower);
        // Buscar por descrição
        const matchesDescription = p.description?.toLowerCase().includes(queryLower);
        // Buscar por tags
        const matchesTags = p.tags?.some(t => t.toLowerCase().includes(queryLower));
        // Buscar por SKU
        const matchesSku = p.sku?.toLowerCase().includes(queryLower) || 
                          (queryNumbers && p.sku?.replace(/\D/g, '').includes(queryNumbers));
        // Buscar por EAN/barcode
        const matchesEan = p.barcode?.includes(searchQuery) || 
                          p.ean?.includes(searchQuery) ||
                          (queryNumbers && (p.barcode?.replace(/\D/g, '').includes(queryNumbers) || 
                           p.ean?.replace(/\D/g, '').includes(queryNumbers)));
        
        return matchesName || matchesBrand || matchesIngredient || matchesDescription || matchesTags || matchesSku || matchesEan;
      });
    }

    // Category filter
    if (filters.categories.length > 0) {
      results = results.filter(p => filters.categories.includes(p.category));
    }

    // Price range
    results = results.filter(p => 
      p.price >= filters.priceRange[0] && p.price <= filters.priceRange[1]
    );

    // Promotion filter
    if (filters.onlyPromotion) {
      results = results.filter(p => p.is_promotion);
    }

    // Generic filter
    if (filters.onlyGeneric) {
      results = results.filter(p => p.is_generic);
    }

    // In stock filter - só aplicar se o usuário ativar o filtro
    // Se não estiver ativado, mostrar todos (incluindo zerados) para permitir busca completa
    if (filters.inStock) {
      results = results.filter(p => {
        // Estoque infinito sempre disponível
        if (p.has_infinite_stock) return true;
        // Verificar estoque mínimo se habilitado
        if (p.min_stock_enabled) {
          const minStock = p.min_stock || 10;
          return p.stock_quantity !== undefined && p.stock_quantity >= minStock;
        }
        // Sem controle mínimo: disponível se > 0
        return p.stock_quantity !== undefined && p.stock_quantity > 0;
      });
    }

    // Sort
    switch (sortBy) {
      case 'price_asc':
        results.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        results.sort((a, b) => b.price - a.price);
        break;
      case 'name_asc':
        results.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'sales':
        results.sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0));
        break;
      default:
        // Relevance - keep original order
        break;
    }

    return results;
  }, [allProducts, searchQuery, filters, sortBy]);

  const handleSearch = (query) => {
    setSearchQuery(query);
    window.history.pushState({}, '', createPageUrl('Search') + `?q=${encodeURIComponent(query)}`);
  };

  const toggleCategory = (category) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const clearFilters = () => {
    setFilters({
      categories: [],
      priceRange: [0, 500],
      onlyPromotion: false,
      onlyGeneric: false,
      inStock: true
    });
  };

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

  const activeFiltersCount = 
    filters.categories.length + 
    (filters.onlyPromotion ? 1 : 0) + 
    (filters.onlyGeneric ? 1 : 0);

  const FiltersContent = () => (
    <div className="space-y-6">
      {/* Categories */}
      <div>
        <h4 className="font-semibold text-gray-900 mb-3">Categorias</h4>
        <div className="space-y-2">
          {categories.map(cat => (
            <label key={cat.value} className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={filters.categories.includes(cat.value)}
                onCheckedChange={() => toggleCategory(cat.value)}
              />
              <span className="text-gray-700">{cat.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h4 className="font-semibold text-gray-900 mb-3">Faixa de Preço</h4>
        <div className="px-2">
          <Slider
            value={filters.priceRange}
            onValueChange={(value) => setFilters(prev => ({ ...prev, priceRange: value }))}
            max={500}
            step={10}
            className="mb-4"
          />
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">R$ {filters.priceRange[0]}</span>
            <span className="text-gray-600">R$ {filters.priceRange[1]}</span>
          </div>
        </div>
      </div>

      {/* Other filters */}
      <div>
        <h4 className="font-semibold text-gray-900 mb-3">Filtros</h4>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <Checkbox
              checked={filters.onlyPromotion}
              onCheckedChange={(checked) => setFilters(prev => ({ ...prev, onlyPromotion: checked }))}
            />
            <span className="text-gray-700">🔥 Apenas promoções</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <Checkbox
              checked={filters.onlyGeneric}
              onCheckedChange={(checked) => setFilters(prev => ({ ...prev, onlyGeneric: checked }))}
            />
            <span className="text-gray-700">💊 Apenas genéricos</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <Checkbox
              checked={filters.inStock}
              onCheckedChange={(checked) => setFilters(prev => ({ ...prev, inStock: checked }))}
            />
            <span className="text-gray-700">✅ Em estoque</span>
          </label>
        </div>
      </div>

      {activeFiltersCount > 0 && (
        <Button
          variant="outline"
          onClick={clearFilters}
          className="w-full"
        >
          Limpar Filtros
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search Header */}
      <div className="bg-white border-b sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <SearchBar onSearch={handleSearch} initialQuery={searchQuery} />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Results header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            {searchQuery && (
              <p className="text-gray-500">
                {filteredProducts.length} resultado{filteredProducts.length !== 1 ? 's' : ''} para "<span className="font-medium text-gray-900">{searchQuery}</span>"
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {/* Mobile filter button */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="lg:hidden">
                  <Filter className="w-4 h-4 mr-2" />
                  Filtros
                  {activeFiltersCount > 0 && (
                    <Badge className="ml-2 bg-emerald-600">{activeFiltersCount}</Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80">
                <SheetHeader>
                  <SheetTitle>Filtros</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <FiltersContent />
                </div>
              </SheetContent>
            </Sheet>

            {/* Sort */}
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

            {/* View mode */}
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

        {/* Active filters */}
        {(filters.categories.length > 0 || filters.onlyPromotion || filters.onlyGeneric) && (
          <div className="flex flex-wrap gap-2 mb-6">
            {filters.categories.map(cat => (
              <Badge 
                key={cat} 
                variant="secondary"
                className="px-3 py-1.5 bg-emerald-50 text-emerald-700 cursor-pointer hover:bg-emerald-100"
                onClick={() => toggleCategory(cat)}
              >
                {categories.find(c => c.value === cat)?.label}
                <X className="w-3 h-3 ml-2" />
              </Badge>
            ))}
            {filters.onlyPromotion && (
              <Badge 
                variant="secondary"
                className="px-3 py-1.5 bg-red-50 text-red-700 cursor-pointer hover:bg-red-100"
                onClick={() => setFilters(prev => ({ ...prev, onlyPromotion: false }))}
              >
                Em promoção
                <X className="w-3 h-3 ml-2" />
              </Badge>
            )}
            {filters.onlyGeneric && (
              <Badge 
                variant="secondary"
                className="px-3 py-1.5 bg-blue-50 text-blue-700 cursor-pointer hover:bg-blue-100"
                onClick={() => setFilters(prev => ({ ...prev, onlyGeneric: false }))}
              >
                Genéricos
                <X className="w-3 h-3 ml-2" />
              </Badge>
            )}
          </div>
        )}

        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-white rounded-2xl p-6 shadow-sm sticky top-[280px]">
              <h3 className="font-semibold text-lg text-gray-900 mb-6">Filtrar por</h3>
              <FiltersContent />
            </div>
          </aside>

          {/* Products */}
          <div className="flex-1">
            <ProductGrid
              products={filteredProducts}
              isLoading={isLoading}
              onAddToCart={addToCart}
              onAddToFavorites={toggleFavorite}
              favorites={favorites}
              columns={viewMode === 'list' ? 2 : 4}
            />
          </div>
        </div>
      </div>
    </div>
  );
}