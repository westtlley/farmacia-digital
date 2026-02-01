import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Lock, Star, TrendingUp, Zap } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  AchievementManager,
  ACHIEVEMENTS,
  formatTier,
  formatCategory
} from '@/utils/achievements';
import { toast } from 'sonner';

/**
 * Display de Conquistas e Badges
 * Mostra progresso de gamificação do usuário
 */
export default function AchievementsDisplay({ customerId = 'guest' }) {
  const [manager] = useState(() => new AchievementManager(customerId));
  const [unlocked, setUnlocked] = useState(manager.getUnlocked());
  const [stats, setStats] = useState(manager.getStats());
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    // Listener para novos desbloqueios
    const handleUnlock = (event) => {
      const achievement = event.detail;
      toast.success(`🎉 Conquista Desbloqueada!`, {
        description: `${achievement.icon} ${achievement.name} (+${achievement.points} pts)`
      });
      setUnlocked(manager.getUnlocked());
      setStats(manager.getStats());
    };

    window.addEventListener('achievementUnlocked', handleUnlock);
    return () => window.removeEventListener('achievementUnlocked', handleUnlock);
  }, [manager]);

  const categories = ['all', 'compras', 'valores', 'social', 'fidelidade', 'especial'];
  
  const filteredAchievements = selectedCategory === 'all'
    ? Object.values(ACHIEVEMENTS)
    : Object.values(ACHIEVEMENTS).filter(a => a.category === selectedCategory);

  return (
    <div className="space-y-6">
      {/* Stats Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32 blur-3xl" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
              <Trophy className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-3xl font-bold">Conquistas</h2>
              <p className="text-white/80">Seu progresso de gamificação</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
              <p className="text-4xl font-bold">{stats.unlockedAchievements}</p>
              <p className="text-sm text-white/70 mt-1">Desbloqueadas</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
              <p className="text-4xl font-bold">{stats.totalPoints}</p>
              <p className="text-sm text-white/70 mt-1">Pontos</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
              <p className="text-4xl font-bold">{stats.completionRate}%</p>
              <p className="text-sm text-white/70 mt-1">Completo</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span>{stats.unlockedAchievements} de {stats.totalAchievements} conquistas</span>
              <span>{stats.completionRate}%</span>
            </div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${stats.completionRate}%` }}
                transition={{ duration: 1 }}
                className="h-full bg-white rounded-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Next Achievements */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="w-6 h-6 text-orange-600" />
          <h3 className="text-xl font-bold text-gray-900">Próximas Conquistas</h3>
        </div>

        <div className="grid gap-3">
          {manager.getNextAchievements(3).map((achievement) => {
            const tier = formatTier(achievement.tier);
            
            return (
              <div
                key={achievement.id}
                className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 border-2 border-dashed border-gray-200"
              >
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-2xl grayscale">
                  {achievement.icon}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{achievement.name}</p>
                  <p className="text-sm text-gray-600">{achievement.description}</p>
                </div>
                <div className="text-right">
                  <Badge className="bg-gray-200 text-gray-700">
                    +{achievement.points} pts
                  </Badge>
                  <p className="text-xs text-gray-500 mt-1">{tier.icon} {tier.name}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* All Achievements */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Todas as Conquistas</h3>

        {/* Category Tabs */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="mb-6">
            {categories.map((cat) => (
              <TabsTrigger key={cat} value={cat} className="capitalize">
                {cat === 'all' ? 'Todas' : formatCategory(cat).name}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="grid md:grid-cols-2 gap-4">
            {filteredAchievements.map((achievement) => {
              const isUnlocked = manager.isUnlocked(achievement.id);
              const tier = formatTier(achievement.tier);
              const category = formatCategory(achievement.category);

              return (
                <motion.div
                  key={achievement.id}
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`p-5 rounded-xl border-2 transition-all ${
                    isUnlocked
                      ? `border-${category.color}-200 bg-${category.color}-50`
                      : 'border-gray-200 bg-gray-50 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 ${
                      isUnlocked
                        ? `bg-gradient-to-br ${tier.color}`
                        : 'bg-gray-300'
                    } rounded-full flex items-center justify-center text-3xl ${
                      !isUnlocked && 'grayscale'
                    } relative`}>
                      {achievement.icon}
                      {!isUnlocked && (
                        <div className="absolute inset-0 bg-black/20 rounded-full flex items-center justify-center">
                          <Lock className="w-5 h-5 text-white" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-bold text-gray-900">
                            {achievement.name}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {achievement.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-3">
                        <Badge 
                          className={`${
                            isUnlocked
                              ? 'bg-emerald-500'
                              : 'bg-gray-400'
                          } text-white`}
                        >
                          {isUnlocked ? <Star className="w-3 h-3 mr-1" /> : <Lock className="w-3 h-3 mr-1" />}
                          +{achievement.points} pts
                        </Badge>
                        
                        <Badge variant="outline" className="text-xs">
                          {tier.icon} {tier.name}
                        </Badge>

                        {isUnlocked && (
                          <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300">
                            Desbloqueado
                          </Badge>
                        )}
                      </div>

                      {isUnlocked && (
                        <p className="text-xs text-gray-500 mt-2">
                          Desbloqueado em {new Date(
                            unlocked.find(a => a.id === achievement.id)?.unlockedAt
                          ).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Tabs>
      </div>
    </div>
  );
}

/**
 * Componente compacto de Badge para exibir no perfil
 */
export function AchievementBadge({ achievement, size = 'md' }) {
  const tier = formatTier(achievement.tier);
  const sizeClasses = {
    sm: 'w-8 h-8 text-lg',
    md: 'w-12 h-12 text-2xl',
    lg: 'w-16 h-16 text-3xl'
  };

  return (
    <div 
      className={`${sizeClasses[size]} bg-gradient-to-br ${tier.color} rounded-full flex items-center justify-center shadow-lg`}
      title={achievement.name}
    >
      {achievement.icon}
    </div>
  );
}

/**
 * Notificação de Conquista Desbloqueada
 */
export function AchievementNotification({ achievement, onClose }) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0, y: 50 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.8, opacity: 0, y: 50 }}
      className="fixed bottom-4 right-4 z-50 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl p-6 shadow-2xl max-w-sm"
    >
      <div className="flex items-center gap-4">
        <motion.div
          animate={{
            rotate: [0, 10, -10, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ repeat: 3, duration: 0.5 }}
          className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-4xl"
        >
          {achievement.icon}
        </motion.div>
        <div className="flex-1">
          <p className="font-bold text-lg mb-1">Conquista Desbloqueada!</p>
          <p className="text-white/90">{achievement.name}</p>
          <p className="text-sm text-white/70 mt-1">
            +{achievement.points} pontos
          </p>
        </div>
      </div>
      
      <button
        onClick={onClose}
        className="absolute top-2 right-2 text-white/60 hover:text-white"
      >
        ✕
      </button>
    </motion.div>
  );
}
