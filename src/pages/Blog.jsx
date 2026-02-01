import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Calendar, User, Clock, ChevronRight, Search } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const categories = [
  { value: 'saude', label: 'Saúde', color: 'bg-red-100 text-red-700' },
  { value: 'bem_estar', label: 'Bem-estar', color: 'bg-green-100 text-green-700' },
  { value: 'tratamentos', label: 'Tratamentos', color: 'bg-blue-100 text-blue-700' },
  { value: 'prevencao', label: 'Prevenção', color: 'bg-purple-100 text-purple-700' },
  { value: 'dicas', label: 'Dicas', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'nutricao', label: 'Nutrição', color: 'bg-orange-100 text-orange-700' }
];

// Sample blog posts (in real app, these would come from database)
const samplePosts = [
  {
    id: '1',
    title: 'Como fortalecer sua imunidade no inverno',
    slug: 'fortalecer-imunidade-inverno',
    excerpt: 'Descubra as melhores práticas e suplementos para manter sua imunidade forte durante os meses mais frios.',
    cover_image: 'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=800&h=500&fit=crop',
    category: 'prevencao',
    author: 'Dra. Maria Santos',
    created_date: '2024-01-15',
    views_count: 1250
  },
  {
    id: '2',
    title: 'Guia completo sobre vitaminas e suplementos',
    slug: 'guia-vitaminas-suplementos',
    excerpt: 'Tudo o que você precisa saber sobre vitaminas, quando suplementar e quais são as melhores opções.',
    cover_image: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=500&fit=crop',
    category: 'nutricao',
    author: 'Dr. Carlos Oliveira',
    created_date: '2024-01-12',
    views_count: 980
  },
  {
    id: '3',
    title: 'Cuidados essenciais com a pele no verão',
    slug: 'cuidados-pele-verao',
    excerpt: 'Proteção solar, hidratação e outros cuidados indispensáveis para manter sua pele saudável.',
    cover_image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&h=500&fit=crop',
    category: 'dicas',
    author: 'Dra. Ana Ferreira',
    created_date: '2024-01-10',
    views_count: 850
  },
  {
    id: '4',
    title: 'Diabetes: prevenção e controle',
    slug: 'diabetes-prevencao-controle',
    excerpt: 'Entenda como prevenir e controlar o diabetes com hábitos saudáveis e acompanhamento adequado.',
    cover_image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=500&fit=crop',
    category: 'tratamentos',
    author: 'Dr. Paulo Mendes',
    created_date: '2024-01-08',
    views_count: 720
  },
  {
    id: '5',
    title: 'Saúde mental: dicas para o dia a dia',
    slug: 'saude-mental-dicas',
    excerpt: 'Práticas simples que podem melhorar significativamente sua saúde mental e qualidade de vida.',
    cover_image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=500&fit=crop',
    category: 'bem_estar',
    author: 'Dra. Juliana Costa',
    created_date: '2024-01-05',
    views_count: 1100
  },
  {
    id: '6',
    title: 'Primeiros socorros: o que todo mundo deveria saber',
    slug: 'primeiros-socorros-basico',
    excerpt: 'Aprenda técnicas básicas de primeiros socorros que podem salvar vidas em situações de emergência.',
    cover_image: 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=800&h=500&fit=crop',
    category: 'saude',
    author: 'Dr. Ricardo Lima',
    created_date: '2024-01-03',
    views_count: 650
  }
];

export default function Blog() {
  const { data: posts = samplePosts } = useQuery({
    queryKey: ['blogPosts'],
    queryFn: async () => {
      const result = await base44.entities.BlogPost.filter(
        { is_published: true },
        '-created_date',
        20
      );
      return result.length > 0 ? result : samplePosts;
    }
  });

  const featuredPost = posts[0];
  const otherPosts = posts.slice(1);

  const getCategoryStyle = (cat) => {
    return categories.find(c => c.value === cat)?.color || 'bg-gray-100 text-gray-700';
  };

  const getCategoryLabel = (cat) => {
    return categories.find(c => c.value === cat)?.label || cat;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="text-center max-w-2xl mx-auto">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Blog de Saúde</h1>
            <p className="text-gray-500 text-lg mb-8">
              Dicas, informações e orientações para cuidar melhor da sua saúde
            </p>
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input 
                placeholder="Buscar artigos..." 
                className="pl-12 py-6 rounded-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="bg-white border-b sticky top-[180px] md:top-[200px] z-30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-2 py-4 overflow-x-auto">
            <Badge className="bg-emerald-600 text-white cursor-pointer">
              Todos
            </Badge>
            {categories.map(cat => (
              <Badge 
                key={cat.value} 
                className={`${cat.color} cursor-pointer whitespace-nowrap`}
              >
                {cat.label}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Featured Post */}
        {featuredPost && (
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="grid md:grid-cols-2 gap-8 bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
              <div className="aspect-video md:aspect-auto overflow-hidden">
                <img
                  src={featuredPost.cover_image}
                  alt={featuredPost.title}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-8 flex flex-col justify-center">
                <Badge className={`${getCategoryStyle(featuredPost.category)} w-fit mb-4`}>
                  {getCategoryLabel(featuredPost.category)}
                </Badge>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 hover:text-emerald-600 transition-colors">
                  <Link to={createPageUrl('BlogPost') + `?id=${featuredPost.id}`}>
                    {featuredPost.title}
                  </Link>
                </h2>
                <p className="text-gray-500 mb-6 line-clamp-3">
                  {featuredPost.excerpt}
                </p>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {featuredPost.author}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(featuredPost.created_date).toLocaleDateString('pt-BR')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    5 min de leitura
                  </span>
                </div>
              </div>
            </div>
          </motion.article>
        )}

        {/* Other Posts */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {otherPosts.map((post, index) => (
            <motion.article
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all group"
            >
              <div className="aspect-video overflow-hidden">
                <img
                  src={post.cover_image}
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              <div className="p-6">
                <Badge className={`${getCategoryStyle(post.category)} mb-3`}>
                  {getCategoryLabel(post.category)}
                </Badge>
                <h3 className="font-bold text-lg text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors line-clamp-2">
                  <Link to={createPageUrl('BlogPost') + `?id=${post.id}`}>
                    {post.title}
                  </Link>
                </h3>
                <p className="text-gray-500 text-sm mb-4 line-clamp-2">
                  {post.excerpt}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{post.author}</span>
                  <span>{new Date(post.created_date).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
            </motion.article>
          ))}
        </div>

        {/* Newsletter */}
        <section className="mt-16 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-8 md:p-12 text-center text-white">
          <h3 className="text-2xl md:text-3xl font-bold mb-4">
            Receba dicas de saúde por e-mail
          </h3>
          <p className="text-emerald-100 mb-8 max-w-2xl mx-auto">
            Cadastre-se e receba semanalmente artigos, promoções exclusivas e novidades sobre saúde e bem-estar.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto">
            <Input
              type="email"
              placeholder="Seu melhor e-mail"
              className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/60 h-12"
            />
            <button className="bg-white text-emerald-600 font-semibold px-8 h-12 rounded-lg hover:bg-emerald-50 transition-colors">
              Cadastrar
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}