import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, TrendingUp, Clock } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getProductImage } from '@/utils/productImages';

const popularSearches = [
  'Dipirona', 'Vitamina C', 'Paracetamol', 'Dorflex', 
  'Protetor Solar', 'Ibuprofeno', 'Omeprazol'
];

export default function SearchBar({ onSearch, initialQuery = '' }) {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved).slice(0, 5));
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchProducts = async () => {
      if (query.length < 2) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      
      try {
        const products = await base44.entities.Product.filter(
          { status: 'active' },
          '-sales_count',
          10000
        );
        
        const queryLower = query.toLowerCase();
        const queryNumbers = query.replace(/\D/g, ''); // Extrair apenas números para SKU/EAN
        
        const filtered = products
          .filter(p => {
            // Buscar por nome
            const matchesName = p.name?.toLowerCase().includes(queryLower);
            // Buscar por marca
            const matchesBrand = p.brand?.toLowerCase().includes(queryLower);
            // Buscar por ingrediente ativo
            const matchesIngredient = p.active_ingredient?.toLowerCase().includes(queryLower);
            // Buscar por tags
            const matchesTags = p.tags?.some(t => t.toLowerCase().includes(queryLower));
            // Buscar por SKU
            const matchesSku = p.sku?.toLowerCase().includes(queryLower) || 
                              (queryNumbers && p.sku?.replace(/\D/g, '').includes(queryNumbers));
            // Buscar por EAN/barcode
            const matchesEan = p.barcode?.includes(query) || 
                              p.ean?.includes(query) ||
                              (queryNumbers && (p.barcode?.replace(/\D/g, '').includes(queryNumbers) || 
                               p.ean?.replace(/\D/g, '').includes(queryNumbers)));
            
            return matchesName || matchesBrand || matchesIngredient || matchesTags || matchesSku || matchesEan;
          })
          .filter(p => p.price > 0 && p.name) // Validar produtos
          .slice(0, 6);
        
        setSuggestions(filtered);
      } catch (err) {
        console.error('Erro na busca:', err);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(searchProducts, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleSearch = (searchQuery) => {
    const finalQuery = searchQuery || query;
    if (!finalQuery.trim()) return;

    // Save to recent searches
    const updated = [finalQuery, ...recentSearches.filter(s => s !== finalQuery)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));

    setIsOpen(false);
    if (onSearch) {
      onSearch(finalQuery);
    } else {
      window.location.href = createPageUrl('Search') + `?q=${encodeURIComponent(finalQuery)}`;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-3xl">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Busque por medicamento, sintoma ou marca..."
          className="w-full pl-12 pr-24 py-6 text-lg rounded-2xl border-2 border-gray-200 focus:border-emerald-500 transition-all"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          )}
          <button
            onClick={() => handleSearch()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl font-medium transition-colors"
          >
            Buscar
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border overflow-hidden z-50"
          >
            {isLoading ? (
              <div className="p-8 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
              </div>
            ) : query.length >= 2 && suggestions.length > 0 ? (
              <div className="py-2">
                <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase">Produtos</p>
                {suggestions.map((product) => (
                  <Link
                    key={product.id}
                    to={createPageUrl('Product') + `?id=${product.id}`}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <img
                      src={getProductImage(product)}
                      alt={product.name}
                      className="w-12 h-12 object-contain rounded-lg bg-gray-100"
                      style={{ 
                        objectFit: 'contain',
                        objectPosition: 'center'
                      }}
                      onError={(e) => {
                        if (e.target.src !== getProductImage(product)) {
                          e.target.src = getProductImage(product);
                        }
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{product.name}</p>
                      <p className="text-sm text-gray-500">{product.brand}</p>
                    </div>
                    <p className="font-bold text-emerald-600">
                      R$ {product.price?.toFixed(2)}
                    </p>
                  </Link>
                ))}
                <button
                  onClick={() => handleSearch()}
                  className="w-full px-4 py-3 text-center text-emerald-600 font-medium hover:bg-emerald-50 transition-colors"
                >
                  Ver todos os resultados para "{query}"
                </button>
              </div>
            ) : (
              <div className="py-4">
                {recentSearches.length > 0 && (
                  <div className="mb-4">
                    <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5" />
                      Buscas recentes
                    </p>
                    <div className="flex flex-wrap gap-2 px-4">
                      {recentSearches.map((term, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setQuery(term);
                            handleSearch(term);
                          }}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-700 transition-colors"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div>
                  <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase flex items-center gap-2">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Mais buscados
                  </p>
                  <div className="flex flex-wrap gap-2 px-4 pb-2">
                    {popularSearches.map((term, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setQuery(term);
                          handleSearch(term);
                        }}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 rounded-full text-sm text-emerald-700 transition-colors"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}