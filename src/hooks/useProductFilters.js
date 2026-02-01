import { useMemo } from 'react';

/**
 * Valida se um produto está disponível para compra
 * Considera estoque infinito, controle de estoque mínimo e quantidade disponível
 */
export const isProductAvailable = (product) => {
  if (!product) return false;
  
  // Estoque infinito sempre disponível
  if (product.has_infinite_stock) return true;
  
  // Se não tem controle de estoque definido, sempre disponível
  if (product.stock_quantity === undefined) return true;
  
  // Verificar estoque mínimo se habilitado
  if (product.min_stock_enabled) {
    const minStock = product.min_stock || 10;
    return product.stock_quantity >= minStock;
  }
  
  // Sem controle mínimo: disponível se > 0
  return product.stock_quantity > 0;
};

/**
 * Hook para filtrar produtos por disponibilidade
 */
export const useProductFilters = (allProducts = []) => {
  // Produtos novos (últimos 30 dias)
  const newProducts = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return allProducts
      .filter(p => {
        if (!p.created_date) return false;
        const createdDate = new Date(p.created_date);
        return createdDate >= thirtyDaysAgo;
      })
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      .slice(0, 8);
  }, [allProducts]);

  // Produtos em destaque
  const featuredProducts = useMemo(() => {
    return allProducts
      .filter(p => 
        p.status === 'active' && 
        Boolean(p.is_featured) &&
        p.price > 0 &&
        isProductAvailable(p)
      )
      .slice(0, 8);
  }, [allProducts]);

  // Produtos em promoção
  const promotionProducts = useMemo(() => {
    return allProducts
      .filter(p => 
        p.status === 'active' && 
        Boolean(p.is_promotion) &&
        p.price > 0 &&
        isProductAvailable(p)
      )
      .slice(0, 8);
  }, [allProducts]);

  // Produtos recentemente visualizados
  const recentlyViewed = useMemo(() => {
    const viewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
    return allProducts
      .filter(p => viewed.includes(p.id) && isProductAvailable(p))
      .slice(0, 8);
  }, [allProducts]);

  return {
    newProducts,
    featuredProducts,
    promotionProducts,
    recentlyViewed,
    isProductAvailable
  };
};
