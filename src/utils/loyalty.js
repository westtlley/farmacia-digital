/**
 * Sistema de Programa de Fidelidade
 * Gerencia pontos, níveis e recompensas dos clientes
 */

// Níveis do programa de fidelidade
export const LOYALTY_LEVELS = {
  BRONZE: {
    id: 'bronze',
    name: 'Bronze',
    icon: '🥉',
    minPoints: 0,
    maxPoints: 499,
    benefits: {
      deliveryDiscount: 10, // 10% desconto no frete
      pointsMultiplier: 1, // 1x pontos
      birthdayBonus: 50, // 50 pontos no aniversário
      exclusiveCoupons: false
    },
    color: 'from-amber-600 to-amber-700'
  },
  SILVER: {
    id: 'silver',
    name: 'Prata',
    icon: '🥈',
    minPoints: 500,
    maxPoints: 1999,
    benefits: {
      deliveryDiscount: 20, // 20% desconto no frete
      pointsMultiplier: 1.5, // 1.5x pontos
      birthdayBonus: 100,
      exclusiveCoupons: true
    },
    color: 'from-gray-400 to-gray-500'
  },
  GOLD: {
    id: 'gold',
    name: 'Ouro',
    icon: '🥇',
    minPoints: 2000,
    maxPoints: Infinity,
    benefits: {
      deliveryDiscount: 100, // Frete grátis sempre
      pointsMultiplier: 2, // 2x pontos
      birthdayBonus: 200,
      exclusiveCoupons: true,
      prioritySupport: true
    },
    color: 'from-yellow-500 to-yellow-600'
  }
};

/**
 * Calcula o nível baseado nos pontos
 * @param {number} points - Pontos totais do cliente
 * @returns {object} Nível atual
 */
export function getLevelByPoints(points) {
  if (points >= LOYALTY_LEVELS.GOLD.minPoints) {
    return LOYALTY_LEVELS.GOLD;
  } else if (points >= LOYALTY_LEVELS.SILVER.minPoints) {
    return LOYALTY_LEVELS.SILVER;
  }
  return LOYALTY_LEVELS.BRONZE;
}

/**
 * Calcula pontos ganhos em uma compra
 * @param {number} subtotal - Valor da compra
 * @param {object} level - Nível do cliente
 * @returns {number} Pontos ganhos
 */
export function calculatePointsEarned(subtotal, level = LOYALTY_LEVELS.BRONZE) {
  const basePoints = Math.floor(subtotal); // 1 ponto por R$ 1,00
  const multiplier = level.benefits.pointsMultiplier || 1;
  return Math.floor(basePoints * multiplier);
}

/**
 * Calcula pontos necessários para próximo nível
 * @param {number} currentPoints - Pontos atuais
 * @returns {object} { nextLevel, pointsNeeded, progress }
 */
export function getNextLevelProgress(currentPoints) {
  const currentLevel = getLevelByPoints(currentPoints);
  
  if (currentLevel.id === 'gold') {
    return {
      nextLevel: null,
      pointsNeeded: 0,
      progress: 100,
      isMaxLevel: true
    };
  }

  const nextLevel = currentLevel.id === 'bronze' 
    ? LOYALTY_LEVELS.SILVER 
    : LOYALTY_LEVELS.GOLD;

  const pointsNeeded = nextLevel.minPoints - currentPoints;
  const pointsInCurrentLevel = currentPoints - currentLevel.minPoints;
  const pointsRangeInLevel = nextLevel.minPoints - currentLevel.minPoints;
  const progress = (pointsInCurrentLevel / pointsRangeInLevel) * 100;

  return {
    nextLevel,
    pointsNeeded,
    progress: Math.min(100, Math.max(0, progress)),
    isMaxLevel: false
  };
}

/**
 * Converte pontos em desconto (R$)
 * @param {number} points - Pontos a serem convertidos
 * @param {number} conversionRate - Taxa de conversão (padrão: 100 pontos = R$ 10)
 * @returns {number} Valor em reais
 */
export function convertPointsToDiscount(points, conversionRate = 0.1) {
  return points * conversionRate;
}

/**
 * Verifica se o cliente pode resgatar pontos
 * @param {number} points - Pontos atuais
 * @param {number} minPoints - Pontos mínimos para resgate (padrão: 100)
 * @returns {boolean}
 */
export function canRedeemPoints(points, minPoints = 100) {
  return points >= minPoints;
}

/**
 * Calcula desconto no frete baseado no nível
 * @param {number} deliveryFee - Valor original do frete
 * @param {object} level - Nível do cliente
 * @returns {number} Frete com desconto
 */
export function calculateDeliveryDiscount(deliveryFee, level) {
  if (!level || !level.benefits) return deliveryFee;
  
  const discountPercent = level.benefits.deliveryDiscount || 0;
  
  if (discountPercent >= 100) {
    return 0; // Frete grátis
  }
  
  const discount = (deliveryFee * discountPercent) / 100;
  return Math.max(0, deliveryFee - discount);
}

/**
 * Gerencia histórico de pontos do cliente
 */
export class LoyaltyManager {
  constructor(customerId) {
    this.customerId = customerId;
    this.storageKey = `loyalty_${customerId}`;
    this.load();
  }

  load() {
    const data = localStorage.getItem(this.storageKey);
    if (data) {
      const parsed = JSON.parse(data);
      this.points = parsed.points || 0;
      this.history = parsed.history || [];
      this.totalEarned = parsed.totalEarned || 0;
      this.totalRedeemed = parsed.totalRedeemed || 0;
    } else {
      this.points = 0;
      this.history = [];
      this.totalEarned = 0;
      this.totalRedeemed = 0;
    }
  }

  save() {
    const data = {
      points: this.points,
      history: this.history,
      totalEarned: this.totalEarned,
      totalRedeemed: this.totalRedeemed,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  addPoints(points, reason, metadata = {}) {
    const entry = {
      id: Date.now(),
      type: 'earned',
      points: points,
      reason: reason,
      metadata: metadata,
      date: new Date().toISOString(),
      balanceAfter: this.points + points
    };

    this.points += points;
    this.totalEarned += points;
    this.history.unshift(entry);
    
    // Manter apenas últimas 50 transações
    if (this.history.length > 50) {
      this.history = this.history.slice(0, 50);
    }

    this.save();
    return entry;
  }

  redeemPoints(points, reason, metadata = {}) {
    if (points > this.points) {
      throw new Error('Pontos insuficientes');
    }

    const entry = {
      id: Date.now(),
      type: 'redeemed',
      points: -points,
      reason: reason,
      metadata: metadata,
      date: new Date().toISOString(),
      balanceAfter: this.points - points
    };

    this.points -= points;
    this.totalRedeemed += points;
    this.history.unshift(entry);

    if (this.history.length > 50) {
      this.history = this.history.slice(0, 50);
    }

    this.save();
    return entry;
  }

  getLevel() {
    return getLevelByPoints(this.points);
  }

  getNextLevelInfo() {
    return getNextLevelProgress(this.points);
  }

  getHistory(limit = 10) {
    return this.history.slice(0, limit);
  }

  getStats() {
    return {
      currentPoints: this.points,
      totalEarned: this.totalEarned,
      totalRedeemed: this.totalRedeemed,
      level: this.getLevel(),
      nextLevel: this.getNextLevelInfo()
    };
  }
}

/**
 * Desafios semanais para engajamento
 */
export const WEEKLY_CHALLENGES = [
  {
    id: 'complete_3_orders',
    title: 'Comprador Frequente',
    description: 'Complete 3 compras esta semana',
    reward: 100,
    icon: '🛒',
    progress: 0,
    goal: 3
  },
  {
    id: 'spend_300',
    title: 'Grande Comprador',
    description: 'Gaste R$ 300 em compras',
    reward: 150,
    icon: '💰',
    progress: 0,
    goal: 300
  },
  {
    id: 'refer_friend',
    title: 'Embaixador',
    description: 'Indique 1 amigo',
    reward: 200,
    icon: '🎁',
    progress: 0,
    goal: 1
  },
  {
    id: 'try_new_category',
    title: 'Explorador',
    description: 'Compre de 3 categorias diferentes',
    reward: 80,
    icon: '🔍',
    progress: 0,
    goal: 3
  }
];

/**
 * Recompensas especiais por pontos
 */
export const REWARDS_CATALOG = [
  {
    id: 'discount_10',
    name: 'R$ 10 OFF',
    description: 'Desconto de R$ 10 na próxima compra',
    pointsCost: 100,
    type: 'discount',
    value: 10,
    icon: '💵'
  },
  {
    id: 'discount_25',
    name: 'R$ 25 OFF',
    description: 'Desconto de R$ 25 na próxima compra',
    pointsCost: 250,
    type: 'discount',
    value: 25,
    icon: '💰'
  },
  {
    id: 'discount_50',
    name: 'R$ 50 OFF',
    description: 'Desconto de R$ 50 na próxima compra',
    pointsCost: 500,
    type: 'discount',
    value: 50,
    icon: '🎁'
  },
  {
    id: 'free_delivery_3x',
    name: 'Frete Grátis (3x)',
    description: '3 entregas grátis',
    pointsCost: 300,
    type: 'delivery',
    value: 3,
    icon: '🚚'
  },
  {
    id: 'express_delivery',
    name: 'Entrega Express',
    description: 'Prioridade na próxima entrega',
    pointsCost: 150,
    type: 'express',
    value: 1,
    icon: '⚡'
  }
];

/**
 * Formata histórico para exibição
 * @param {object} entry - Entrada do histórico
 * @returns {object} Formatado
 */
export function formatHistoryEntry(entry) {
  const sign = entry.points > 0 ? '+' : '';
  const color = entry.points > 0 ? 'text-green-600' : 'text-red-600';
  
  return {
    ...entry,
    displayPoints: `${sign}${entry.points}`,
    displayColor: color,
    displayDate: new Date(entry.date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  };
}
