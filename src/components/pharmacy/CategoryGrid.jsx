import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  Pill, 
  Sparkles, 
  Apple, 
  Droplets, 
  Baby, 
  Heart,
  Dumbbell,
  Stethoscope,
  Scissors,
  ShoppingBag
} from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";

// Mapeamento de ícones por slug
const iconMap = {
  medicamentos: Pill,
  dermocosmeticos: Sparkles,
  vitaminas: Apple,
  higiene: Droplets,
  infantil: Baby,
  mamae_bebe: Heart,
  nutricao: Dumbbell,
  diabetes: Stethoscope,
  beleza: Scissors,
  ortopedia: ShoppingBag
};

// Mapeamento de cores por slug
const colorMap = {
  medicamentos: { color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-50' },
  dermocosmeticos: { color: 'from-pink-500 to-rose-600', bgColor: 'bg-pink-50' },
  vitaminas: { color: 'from-orange-500 to-amber-600', bgColor: 'bg-orange-50' },
  higiene: { color: 'from-cyan-500 to-teal-600', bgColor: 'bg-cyan-50' },
  infantil: { color: 'from-violet-500 to-purple-600', bgColor: 'bg-violet-50' },
  mamae_bebe: { color: 'from-red-500 to-rose-600', bgColor: 'bg-red-50' },
  nutricao: { color: 'from-emerald-500 to-green-600', bgColor: 'bg-emerald-50' },
  diabetes: { color: 'from-indigo-500 to-blue-600', bgColor: 'bg-indigo-50' },
  beleza: { color: 'from-fuchsia-500 to-pink-600', bgColor: 'bg-fuchsia-50' },
  ortopedia: { color: 'from-slate-500 to-gray-600', bgColor: 'bg-slate-50' }
};

// Categorias padrão caso não haja no banco
const defaultCategories = [
  { 
    name: 'Medicamentos', 
    slug: 'medicamentos', 
    icon: Pill,
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50',
    description: 'Genéricos e referência'
  },
  { 
    name: 'Dermocosméticos', 
    slug: 'dermocosmeticos', 
    icon: Sparkles,
    color: 'from-pink-500 to-rose-600',
    bgColor: 'bg-pink-50',
    description: 'Cuidados com a pele'
  },
  { 
    name: 'Vitaminas', 
    slug: 'vitaminas', 
    icon: Apple,
    color: 'from-orange-500 to-amber-600',
    bgColor: 'bg-orange-50',
    description: 'Suplementos e minerais'
  },
  { 
    name: 'Higiene', 
    slug: 'higiene', 
    icon: Droplets,
    color: 'from-cyan-500 to-teal-600',
    bgColor: 'bg-cyan-50',
    description: 'Cuidado pessoal'
  },
  { 
    name: 'Infantil', 
    slug: 'infantil', 
    icon: Baby,
    color: 'from-violet-500 to-purple-600',
    bgColor: 'bg-violet-50',
    description: 'Produtos para crianças'
  },
  { 
    name: 'Mamãe & Bebê', 
    slug: 'mamae_bebe', 
    icon: Heart,
    color: 'from-red-500 to-rose-600',
    bgColor: 'bg-red-50',
    description: 'Gestantes e recém-nascidos'
  },
  { 
    name: 'Nutrição', 
    slug: 'nutricao', 
    icon: Dumbbell,
    color: 'from-emerald-500 to-green-600',
    bgColor: 'bg-emerald-50',
    description: 'Esportiva e funcional'
  },
  { 
    name: 'Diabetes', 
    slug: 'diabetes', 
    icon: Stethoscope,
    color: 'from-indigo-500 to-blue-600',
    bgColor: 'bg-indigo-50',
    description: 'Controle e monitoramento'
  },
  { 
    name: 'Beleza', 
    slug: 'beleza', 
    icon: Scissors,
    color: 'from-fuchsia-500 to-pink-600',
    bgColor: 'bg-fuchsia-50',
    description: 'Maquiagem e cuidados'
  },
  { 
    name: 'Ortopedia', 
    slug: 'ortopedia', 
    icon: ShoppingBag,
    color: 'from-slate-500 to-gray-600',
    bgColor: 'bg-slate-50',
    description: 'Equipamentos e suportes'
  }
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function CategoryGrid() {
  // Buscar produtos para verificar quais categorias têm produtos
  const { data: allProducts = [] } = useQuery({
    queryKey: ['products', 'categories'],
    queryFn: async () => {
      try {
        const products = await base44.entities.Product.list('-created_date', 200);
        return products.filter(p => p.status === 'active' && p.price > 0 && p.name);
      } catch (err) {
        console.error('Erro ao buscar produtos:', err);
        return [];
      }
    },
    staleTime: 2 * 60 * 1000,
  });

  const { data: categories, isLoading, error } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      try {
        const cats = await base44.entities.Category.list('', 20);
        // Mapear categorias do banco para o formato esperado
        return cats.map(cat => {
          const Icon = iconMap[cat.slug] || ShoppingBag;
          const colors = colorMap[cat.slug] || { color: 'from-gray-500 to-gray-600', bgColor: 'bg-gray-50' };
          return {
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            description: cat.description || 'Produtos diversos',
            icon: Icon,
            ...colors
          };
        });
      } catch (err) {
        console.error('Erro ao buscar categorias:', err);
        return []; // Retornar array vazio em caso de erro
      }
    },
    staleTime: 30 * 1000, // Cache por 30 segundos para atualizações mais rápidas
    refetchInterval: 60 * 1000, // Refetch a cada 1 minuto
    retry: 1
  });

  // Filtrar categorias que têm produtos ativos e disponíveis (com estoque)
  // REGRA: Só mostrar categoria que tenha produto ativo e disponível
  const displayCategories = React.useMemo(() => {
    if (!categories || categories.length === 0) return [];
    
    // Filtrar produtos disponíveis (ativos, com estoque > 0 ou estoque infinito)
    const availableProducts = allProducts.filter(p => {
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
    
    // Criar um Set com slugs de categorias que têm produtos disponíveis
    // Usar apenas categorias que realmente têm produtos
    const categoriesWithProducts = new Set(
      availableProducts
        .filter(p => p.category && p.category.trim() !== '')
        .map(p => p.category)
    );
    
    // Filtrar categorias que têm pelo menos um produto disponível
    // Se não houver categorias do banco com produtos, retornar vazio
    const filtered = categories.filter(cat => categoriesWithProducts.has(cat.slug));
    
    return filtered;
  }, [categories, allProducts]);

  if (isLoading) {
    return (
      <section className="py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Categorias</h2>
            <p className="text-gray-500 mt-1">Encontre o que você precisa</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6">
              <Skeleton className="w-14 h-14 rounded-xl mb-4" />
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Categorias</h2>
          <p className="text-gray-500 mt-1">Encontre o que você precisa</p>
        </div>
      </div>

      {displayCategories.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Nenhuma categoria disponível no momento.</p>
        </div>
      ) : (
        <motion.div 
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
        >
          {displayCategories.map((category) => {
            const Icon = category.icon;
            return (
              <motion.div key={category.slug || category.id} variants={item}>
                <Link
                  to={createPageUrl('Category') + `?cat=${category.slug}`}
                  className="group block"
                >
                  <div className={`${category.bgColor} rounded-2xl p-6 transition-all duration-300 group-hover:shadow-lg group-hover:scale-105`}>
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">{category.name}</h3>
                    <p className="text-xs text-gray-500">{category.description}</p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </section>
  );
}