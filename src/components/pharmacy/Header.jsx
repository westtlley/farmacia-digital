import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Search, 
  ShoppingCart, 
  Heart, 
  User,
  Menu,
  X,
  ChevronDown,
  Phone,
  MapPin,
  Truck,
  FileText,
  Percent
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useTheme } from './ThemeProvider';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import LoyaltyCard from './LoyaltyCard';

// Mapeamento de categorias padrão
const categoryMap = {
  medicamentos: { name: 'Medicamentos', slug: 'medicamentos' },
  dermocosmeticos: { name: 'Dermocosméticos', slug: 'dermocosmeticos' },
  vitaminas: { name: 'Vitaminas', slug: 'vitaminas' },
  higiene: { name: 'Higiene', slug: 'higiene' },
  infantil: { name: 'Infantil', slug: 'infantil' },
  mamae_bebe: { name: 'Mamãe & Bebê', slug: 'mamae_bebe' },
  beleza: { name: 'Beleza', slug: 'beleza' },
  diabetes: { name: 'Diabetes', slug: 'diabetes' },
  nutricao: { name: 'Nutrição', slug: 'nutricao' },
  ortopedia: { name: 'Ortopedia', slug: 'ortopedia' }
};

export default function Header({ cartItemsCount = 0 }) {
  const navigate = useNavigate();
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);

  // Buscar produtos para filtrar categorias que têm produtos disponíveis
  const { data: allProducts = [] } = useQuery({
    queryKey: ['products', 'header'],
    queryFn: async () => {
      try {
        const products = await base44.entities.Product.list('-created_date', 200);
        // Filtrar apenas produtos disponíveis (ativos, com estoque > 0 ou estoque infinito)
        return products.filter(p => {
          if (p.status !== 'active' || !p.price || p.price <= 0 || !p.name) return false;
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
      } catch (err) {
        console.error('Erro ao buscar produtos:', err);
        return [];
      }
    },
    staleTime: 2 * 60 * 1000,
  });

  // Filtrar categorias que têm produtos disponíveis
  const categories = useMemo(() => {
    if (!allProducts || allProducts.length === 0) return [];
    
    // Criar um Set com slugs de categorias que têm produtos disponíveis
    const categoriesWithProducts = new Set(
      allProducts
        .filter(p => p.category && p.category.trim() !== '')
        .map(p => p.category)
    );
    
    // Filtrar categorias do mapeamento que têm produtos
    return Object.values(categoryMap).filter(cat => categoriesWithProducts.has(cat.slug));
  }, [allProducts]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    if (searchQuery.trim()) {
      navigate(createPageUrl('Search') + `?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <>
      {/* Top Bar - Super Fina */}
      <div 
        className={`text-white transition-all ${
          isScrolled ? 'h-0 opacity-0 overflow-hidden' : 'h-6'
        }`}
        style={{ background: theme.getPrimaryGradient() }}
      >
        <div className="max-w-7xl mx-auto px-4 h-full">
          <div className="flex items-center justify-between text-xs h-full">
            <div className="flex items-center gap-4">
              {theme.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3 h-3" />
                  {theme.phone}
                </span>
              )}
              {theme.address?.street && (
                <span className="hidden md:flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" />
                  {theme.address.street}, {theme.address.number} - {theme.address.city}
                </span>
              )}
            </div>
            {theme.freeDeliveryAbove > 0 && (
              <div className="flex items-center gap-1.5 font-medium">
                <Truck className="w-3 h-3" />
                Frete grátis acima de R$ {theme.freeDeliveryAbove.toFixed(0)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Header Principal - Compacto */}
      <header className={`sticky top-0 z-50 bg-white transition-shadow ${
        isScrolled ? 'shadow-md' : 'shadow-sm border-b'
      }`}>
        {/* Conteúdo Principal */}
        <div className="max-w-7xl mx-auto px-4 py-1.5">
          <div className="flex items-center justify-between gap-6">
            {/* Mobile Menu */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80">
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-emerald-600">Menu</h2>
                    <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                      <X className="w-6 h-6" />
                    </Button>
                  </div>
                  <nav className="space-y-1">
                    <Link
                      to={createPageUrl('Promotions')}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-50 text-red-600 font-semibold"
                    >
                      <Percent className="w-5 h-5" />
                      Promoções
                    </Link>
                    <Link
                      to={createPageUrl('DeliveryAreas')}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-blue-50 text-blue-600 font-semibold"
                    >
                      <Truck className="w-5 h-5" />
                      Onde Entregamos
                    </Link>
                    <Link
                      to={createPageUrl('UploadPrescription')}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-emerald-50 text-emerald-600 font-semibold"
                    >
                      <FileText className="w-5 h-5" />
                      Enviar Receita
                    </Link>
                    {categories.length > 0 && (
                      <>
                        <div className="h-px bg-gray-200 my-2" />
                        {categories.map((cat) => (
                          <Link
                            key={cat.slug}
                            to={createPageUrl('Category') + `?cat=${cat.slug}`}
                            onClick={() => setIsOpen(false)}
                            className="block px-4 py-2.5 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
                          >
                            {cat.name}
                          </Link>
                        ))}
                      </>
                    )}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>

            {/* Logo */}
            <Link to={createPageUrl('Home')} className="flex items-center flex-shrink-0">
              {theme.logo ? (
                <img 
                  src={theme.logo} 
                  alt={theme.pharmacyName} 
                  className="object-contain transition-transform"
                  style={{ 
                    height: `${48 * (theme.logoScale || 1)}px`,
                    maxHeight: '120px'
                  }}
                />
              ) : (
                <div className="flex items-center gap-2.5">
                  <div 
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: theme.getPrimaryGradient() }}
                  >
                    <span className="text-white font-bold text-lg">+</span>
                  </div>
                  <div className="hidden sm:block">
                    <h1 className="text-lg font-bold text-gray-900 leading-tight">
                      {theme.pharmacyName}
                    </h1>
                    <p 
                      className="text-[10px] leading-tight"
                      style={{ color: theme.primaryColor }}
                    >
                      Saúde e Bem-estar
                    </p>
                  </div>
                </div>
              )}
            </Link>

            {/* Links de Navegação - Desktop */}
            <div className="hidden lg:flex items-center gap-1">
              <Link to={createPageUrl('Home')}>
                <Button variant="ghost" className="text-sm font-medium hover:text-emerald-600">
                  Início
                </Button>
              </Link>
              <Link to={createPageUrl('Promotions')}>
                <Button variant="ghost" className="text-sm font-medium hover:text-red-600 flex items-center gap-1">
                  <Percent className="w-4 h-4" />
                  Promoções
                </Button>
              </Link>
              <Link to={createPageUrl('DeliveryAreas')}>
                <Button variant="ghost" className="text-sm font-medium hover:text-blue-600 flex items-center gap-1">
                  <Truck className="w-4 h-4" />
                  Onde Entregamos
                </Button>
              </Link>
              <Link to={createPageUrl('UploadPrescription')}>
                <Button variant="ghost" className="text-sm font-medium hover:text-emerald-600 flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  Enviar Receita
                </Button>
              </Link>
            </div>

            {/* Search Bar - Grande e Central */}
            <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-2xl">
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Busque por medicamentos, sintomas ou categorias..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 h-9 rounded-full border-2 border-gray-200 focus:border-emerald-500 text-sm"
                  aria-label="Buscar produtos"
                  aria-describedby="search-help"
                />
                <span id="search-help" className="sr-only">
                  Digite o nome do medicamento, sintoma ou categoria para buscar
                </span>
              </div>
            </form>

            {/* Ícones à Direita */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <Link to={createPageUrl('Favorites')}>
                <Button variant="ghost" size="icon" className="relative hover:bg-gray-100 rounded-full">
                  <Heart className="w-5 h-5 text-gray-700" />
                </Button>
              </Link>
              
              {/* Badge de Fidelidade */}
              <LoyaltyCard customerId="guest" compact={true} />
              
              <Link to={createPageUrl('CustomerArea')}>
                <Button variant="ghost" size="icon" className="hover:bg-gray-100 rounded-full">
                  <User className="w-5 h-5 text-gray-700" />
                </Button>
              </Link>

              <Link to={createPageUrl('Cart')}>
                <Button variant="ghost" size="icon" className="relative hover:bg-gray-100 rounded-full">
                  <ShoppingCart className="w-5 h-5 text-gray-700" />
                  {cartItemsCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                      {cartItemsCount}
                    </span>
                  )}
                </Button>
              </Link>
            </div>
          </div>

          {/* Search Mobile */}
          <form onSubmit={handleSearch} className="md:hidden mt-1.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar produtos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 h-8 rounded-full border-2"
              />
            </div>
          </form>
        </div>

      </header>
    </>
  );
}