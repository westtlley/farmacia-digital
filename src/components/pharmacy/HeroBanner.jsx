import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from "@/components/ui/button";

const defaultBanners = [
  {
    id: 1,
    title: 'Semana da Saúde',
    subtitle: 'Até 50% OFF em vitaminas e suplementos',
    image_url: 'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=1600&h=600&fit=crop',
    button_text: 'Ver Ofertas',
    link_url: '/promotions'
  },
  {
    id: 2,
    title: 'Frete Grátis',
    subtitle: 'Em compras acima de R$ 150',
    image_url: 'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=1600&h=600&fit=crop',
    button_text: 'Comprar Agora',
    link_url: '/category?cat=medicamentos'
  },
  {
    id: 3,
    title: 'Dermocosméticos',
    subtitle: 'As melhores marcas para sua pele',
    image_url: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=1600&h=600&fit=crop',
    button_text: 'Explorar',
    link_url: '/category?cat=dermocosmeticos'
  }
];

export default function HeroBanner({ banners = defaultBanners }) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);
  const [imageErrors, setImageErrors] = useState({});

  const activeBanners = banners.length > 0 ? banners : defaultBanners;

  const handleImageError = (bannerId) => {
    setImageErrors(prev => ({ ...prev, [bannerId]: true }));
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setDirection(1);
      setCurrent((prev) => (prev + 1) % activeBanners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [activeBanners.length]);

  const slide = (dir) => {
    setDirection(dir);
    setCurrent((prev) => (prev + dir + activeBanners.length) % activeBanners.length);
  };

  const variants = {
    enter: (direction) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction) => ({
      x: direction < 0 ? 1000 : -1000,
      opacity: 0
    })
  };

  return (
    <div className="relative w-full h-[200px] sm:h-[220px] lg:h-[320px] overflow-hidden bg-gray-900 rounded-2xl">
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={current}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 }
          }}
          className="absolute inset-0"
        >
          {/* Background Image */}
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ 
              backgroundImage: imageErrors[activeBanners[current].id] 
                ? 'none' 
                : `url(${activeBanners[current].image_url})` 
            }}
          >
            {imageErrors[activeBanners[current].id] && (
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 to-teal-700" />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
            <img
              src={activeBanners[current].image_url}
              alt={activeBanners[current].title}
              className="hidden"
              onError={() => handleImageError(activeBanners[current].id)}
            />
          </div>

          {/* Content */}
          <div className="relative h-full flex items-center">
            <div className="max-w-7xl mx-auto px-6 md:px-12">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="max-w-xl"
              >
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
                  {activeBanners[current].title}
                </h2>
                <p className="text-lg sm:text-xl text-gray-200 mb-6">
                  {activeBanners[current].subtitle}
                </p>
                {activeBanners[current].has_button !== false && 
                 activeBanners[current].button_text && 
                 (activeBanners[current].link_url || activeBanners[current].link) && (
                  <a href={activeBanners[current].link_url || activeBanners[current].link}>
                    <Button 
                      size="lg"
                      className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-6 text-lg rounded-full"
                    >
                      {activeBanners[current].button_text}
                    </Button>
                  </a>
                )}
              </motion.div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation arrows */}
      <button
        onClick={() => slide(-1)}
        aria-label="Banner anterior"
        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/40 transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-white/50"
      >
        <ChevronLeft className="w-6 h-6 text-white" />
        <span className="sr-only">Banner anterior</span>
      </button>
      <button
        onClick={() => slide(1)}
        aria-label="Próximo banner"
        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/40 transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-white/50"
      >
        <ChevronRight className="w-6 h-6 text-white" />
        <span className="sr-only">Próximo banner</span>
      </button>

      {/* Dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2" role="tablist" aria-label="Navegação de banners">
        {activeBanners.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setDirection(index > current ? 1 : -1);
              setCurrent(index);
            }}
            role="tab"
            aria-selected={index === current}
            aria-label={`Ir para banner ${index + 1}`}
            className={`h-2 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-white/50 ${
              index === current 
                ? 'w-8 bg-emerald-500' 
                : 'w-2 bg-white/50 hover:bg-white/80'
            }`}
          />
        ))}
      </div>
    </div>
  );
}