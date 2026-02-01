/**
 * Sistema de Badges e Conquistas
 * Gamificação para aumentar engajamento
 */

/**
 * Catálogo de Conquistas
 */
export const ACHIEVEMENTS = {
  // Primeiras Compras
  first_order: {
    id: 'first_order',
    name: 'Primeira Compra',
    description: 'Realizou sua primeira compra',
    icon: '🎉',
    points: 50,
    tier: 'bronze',
    category: 'compras'
  },
  
  orders_5: {
    id: 'orders_5',
    name: 'Cliente Frequente',
    description: 'Realizou 5 compras',
    icon: '🛒',
    points: 100,
    tier: 'bronze',
    category: 'compras'
  },
  
  orders_10: {
    id: 'orders_10',
    name: 'Comprador Assíduo',
    description: 'Realizou 10 compras',
    icon: '🏅',
    points: 200,
    tier: 'silver',
    category: 'compras'
  },
  
  orders_25: {
    id: 'orders_25',
    name: 'Cliente VIP',
    description: 'Realizou 25 compras',
    icon: '⭐',
    points: 500,
    tier: 'gold',
    category: 'compras'
  },
  
  // Valores
  spent_100: {
    id: 'spent_100',
    name: 'Primeira Centena',
    description: 'Gastou R$ 100 em compras',
    icon: '💵',
    points: 50,
    tier: 'bronze',
    category: 'valores'
  },
  
  spent_500: {
    id: 'spent_500',
    name: 'Investidor em Saúde',
    description: 'Gastou R$ 500 em compras',
    icon: '💰',
    points: 150,
    tier: 'silver',
    category: 'valores'
  },
  
  spent_1000: {
    id: 'spent_1000',
    name: 'Cliente Premium',
    description: 'Gastou R$ 1.000 em compras',
    icon: '💎',
    points: 300,
    tier: 'gold',
    category: 'valores'
  },
  
  // Social
  first_referral: {
    id: 'first_referral',
    name: 'Embaixador Iniciante',
    description: 'Indicou seu primeiro amigo',
    icon: '🤝',
    points: 100,
    tier: 'bronze',
    category: 'social'
  },
  
  referrals_5: {
    id: 'referrals_5',
    name: 'Influenciador',
    description: 'Indicou 5 amigos',
    icon: '🌟',
    points: 300,
    tier: 'silver',
    category: 'social'
  },
  
  referrals_10: {
    id: 'referrals_10',
    name: 'Embaixador Master',
    description: 'Indicou 10 amigos',
    icon: '👑',
    points: 600,
    tier: 'gold',
    category: 'social'
  },
  
  // Fidelidade
  loyalty_bronze: {
    id: 'loyalty_bronze',
    name: 'Nível Bronze',
    description: 'Alcançou o nível Bronze',
    icon: '🥉',
    points: 50,
    tier: 'bronze',
    category: 'fidelidade'
  },
  
  loyalty_silver: {
    id: 'loyalty_silver',
    name: 'Nível Prata',
    description: 'Alcançou o nível Prata',
    icon: '🥈',
    points: 200,
    tier: 'silver',
    category: 'fidelidade'
  },
  
  loyalty_gold: {
    id: 'loyalty_gold',
    name: 'Nível Ouro',
    description: 'Alcançou o nível Ouro',
    icon: '🥇',
    points: 500,
    tier: 'gold',
    category: 'fidelidade'
  },
  
  // Especiais
  early_bird: {
    id: 'early_bird',
    name: 'Madrugador',
    description: 'Fez uma compra antes das 8h',
    icon: '🌅',
    points: 75,
    tier: 'bronze',
    category: 'especial'
  },
  
  night_owl: {
    id: 'night_owl',
    name: 'Coruja Noturna',
    description: 'Fez uma compra depois das 22h',
    icon: '🦉',
    points: 75,
    tier: 'bronze',
    category: 'especial'
  },
  
  flash_hunter: {
    id: 'flash_hunter',
    name: 'Caçador de Ofertas',
    description: 'Aproveitou 3 Flash Sales',
    icon: '⚡',
    points: 150,
    tier: 'silver',
    category: 'especial'
  },
  
  happy_hour_fan: {
    id: 'happy_hour_fan',
    name: 'Fã do Happy Hour',
    description: 'Usou Happy Hour 5 vezes',
    icon: '🎊',
    points: 100,
    tier: 'bronze',
    category: 'especial'
  },
  
  review_master: {
    id: 'review_master',
    name: 'Avaliador Expert',
    description: 'Avaliou 10 produtos',
    icon: '⭐',
    points: 200,
    tier: 'silver',
    category: 'especial'
  },
  
  neighborhood_champion: {
    id: 'neighborhood_champion',
    name: 'Campeão do Bairro',
    description: 'Indicou 5 vizinhos do mesmo bairro',
    icon: '🏘️',
    points: 250,
    tier: 'silver',
    category: 'social'
  }
};

/**
 * Gerenciador de Conquistas
 */
export class AchievementManager {
  constructor(customerId) {
    this.customerId = customerId;
    this.storageKey = `achievements_${customerId}`;
    this.load();
  }

  load() {
    const data = localStorage.getItem(this.storageKey);
    if (data) {
      const parsed = JSON.parse(data);
      this.unlocked = parsed.unlocked || [];
      this.progress = parsed.progress || {};
      this.stats = parsed.stats || {
        totalOrders: 0,
        totalSpent: 0,
        totalReferrals: 0,
        flashSalesPurchased: 0,
        happyHourUsed: 0,
        reviewsGiven: 0
      };
    } else {
      this.unlocked = [];
      this.progress = {};
      this.stats = {
        totalOrders: 0,
        totalSpent: 0,
        totalReferrals: 0,
        flashSalesPurchased: 0,
        happyHourUsed: 0,
        reviewsGiven: 0
      };
    }
  }

  save() {
    const data = {
      unlocked: this.unlocked,
      progress: this.progress,
      stats: this.stats,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  unlock(achievementId) {
    if (this.isUnlocked(achievementId)) {
      return false; // Já desbloqueado
    }

    const achievement = ACHIEVEMENTS[achievementId];
    if (!achievement) {
      return false;
    }

    this.unlocked.push({
      id: achievementId,
      unlockedAt: new Date().toISOString(),
      ...achievement
    });

    this.save();

    // Disparar evento
    window.dispatchEvent(new CustomEvent('achievementUnlocked', {
      detail: achievement
    }));

    return true;
  }

  isUnlocked(achievementId) {
    return this.unlocked.some(a => a.id === achievementId);
  }

  checkAndUnlock() {
    const toUnlock = [];

    // Verificar compras
    if (this.stats.totalOrders >= 1 && !this.isUnlocked('first_order')) {
      toUnlock.push('first_order');
    }
    if (this.stats.totalOrders >= 5 && !this.isUnlocked('orders_5')) {
      toUnlock.push('orders_5');
    }
    if (this.stats.totalOrders >= 10 && !this.isUnlocked('orders_10')) {
      toUnlock.push('orders_10');
    }
    if (this.stats.totalOrders >= 25 && !this.isUnlocked('orders_25')) {
      toUnlock.push('orders_25');
    }

    // Verificar gastos
    if (this.stats.totalSpent >= 100 && !this.isUnlocked('spent_100')) {
      toUnlock.push('spent_100');
    }
    if (this.stats.totalSpent >= 500 && !this.isUnlocked('spent_500')) {
      toUnlock.push('spent_500');
    }
    if (this.stats.totalSpent >= 1000 && !this.isUnlocked('spent_1000')) {
      toUnlock.push('spent_1000');
    }

    // Verificar indicações
    if (this.stats.totalReferrals >= 1 && !this.isUnlocked('first_referral')) {
      toUnlock.push('first_referral');
    }
    if (this.stats.totalReferrals >= 5 && !this.isUnlocked('referrals_5')) {
      toUnlock.push('referrals_5');
    }
    if (this.stats.totalReferrals >= 10 && !this.isUnlocked('referrals_10')) {
      toUnlock.push('referrals_10');
    }

    // Verificar especiais
    if (this.stats.flashSalesPurchased >= 3 && !this.isUnlocked('flash_hunter')) {
      toUnlock.push('flash_hunter');
    }
    if (this.stats.happyHourUsed >= 5 && !this.isUnlocked('happy_hour_fan')) {
      toUnlock.push('happy_hour_fan');
    }

    // Desbloquear todos
    toUnlock.forEach(id => this.unlock(id));

    return toUnlock;
  }

  recordOrder(orderValue) {
    this.stats.totalOrders++;
    this.stats.totalSpent += orderValue;
    this.save();
    this.checkAndUnlock();
  }

  recordReferral() {
    this.stats.totalReferrals++;
    this.save();
    this.checkAndUnlock();
  }

  recordFlashSale() {
    this.stats.flashSalesPurchased++;
    this.save();
    this.checkAndUnlock();
  }

  recordHappyHour() {
    this.stats.happyHourUsed++;
    this.save();
    this.checkAndUnlock();
  }

  getUnlocked() {
    return this.unlocked;
  }

  getByCategory(category) {
    return this.unlocked.filter(a => a.category === category);
  }

  getProgress(achievementId) {
    return this.progress[achievementId] || 0;
  }

  getTotalPoints() {
    return this.unlocked.reduce((sum, a) => sum + a.points, 0);
  }

  getCompletionRate() {
    const total = Object.keys(ACHIEVEMENTS).length;
    const unlocked = this.unlocked.length;
    return Math.round((unlocked / total) * 100);
  }

  getNextAchievements(limit = 3) {
    const locked = Object.values(ACHIEVEMENTS).filter(a => 
      !this.isUnlocked(a.id)
    );

    // Ordenar por proximidade de desbloquear
    return locked.slice(0, limit);
  }

  getStats() {
    return {
      ...this.stats,
      totalAchievements: Object.keys(ACHIEVEMENTS).length,
      unlockedAchievements: this.unlocked.length,
      totalPoints: this.getTotalPoints(),
      completionRate: this.getCompletionRate()
    };
  }
}

/**
 * Formata tier para exibição
 */
export function formatTier(tier) {
  const tierMap = {
    bronze: { name: 'Bronze', color: 'from-amber-600 to-amber-700', icon: '🥉' },
    silver: { name: 'Prata', color: 'from-gray-400 to-gray-500', icon: '🥈' },
    gold: { name: 'Ouro', color: 'from-yellow-500 to-yellow-600', icon: '🥇' }
  };
  return tierMap[tier] || tierMap.bronze;
}

/**
 * Formata categoria para exibição
 */
export function formatCategory(category) {
  const categoryMap = {
    compras: { name: 'Compras', icon: '🛒', color: 'blue' },
    valores: { name: 'Valores', icon: '💰', color: 'green' },
    social: { name: 'Social', icon: '🤝', color: 'purple' },
    fidelidade: { name: 'Fidelidade', icon: '🏆', color: 'orange' },
    especial: { name: 'Especial', icon: '⭐', color: 'pink' }
  };
  return categoryMap[category] || categoryMap.especial;
}
