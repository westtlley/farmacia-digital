import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Award, 
  Gift, 
  TrendingUp, 
  Star, 
  Zap,
  ChevronRight,
  History,
  Trophy,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { 
  LoyaltyManager, 
  LOYALTY_LEVELS,
  REWARDS_CATALOG,
  formatHistoryEntry 
} from '@/utils/loyalty';
import { toast } from 'sonner';

/**
 * Componente Card do Programa de Fidelidade
 * Exibe pontos, nível e progresso do cliente
 */
export default function LoyaltyCard({ customerId = 'guest', compact = false }) {
  const [manager] = useState(() => new LoyaltyManager(customerId));
  const [stats, setStats] = useState(manager.getStats());
  const [showHistory, setShowHistory] = useState(false);
  const [showRewards, setShowRewards] = useState(false);

  useEffect(() => {
    // Atualizar stats quando mudarem
    const updateStats = () => {
      setStats(manager.getStats());
    };

    // Listener para atualizações de pontos
    window.addEventListener('loyaltyUpdated', updateStats);
    return () => window.removeEventListener('loyaltyUpdated', updateStats);
  }, [manager]);

  const { currentPoints, level, nextLevel } = stats;

  // Versão compacta para header/sidebar
  if (compact) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button 
            variant="ghost" 
            className="relative group"
            title="Programa de Fidelidade"
          >
            <div className="flex items-center gap-2">
              <div className="relative">
                <Award className="w-5 h-5" />
                {currentPoints > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
                    <Sparkles className="w-2 h-2 text-white" />
                  </div>
                )}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-medium">{level.icon} {level.name}</p>
                <p className="text-[10px] text-gray-500">{currentPoints} pts</p>
              </div>
            </div>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <LoyaltyDetailsDialog 
            stats={stats}
            manager={manager}
            onClose={() => {}}
          />
        </DialogContent>
      </Dialog>
    );
  }

  // Versão completa para CustomerArea
  return (
    <div className="space-y-4">
      {/* Main Card */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`bg-gradient-to-br ${level.color} rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden`}
      >
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-24 -translate-x-24 blur-3xl" />

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-2xl">
                {level.icon}
              </div>
              <div>
                <h3 className="text-2xl font-bold">{level.name}</h3>
                <p className="text-sm text-white/80">Programa de Fidelidade</p>
              </div>
            </div>
            <Trophy className="w-8 h-8 text-white/30" />
          </div>

          {/* Points */}
          <div className="mb-6">
            <p className="text-sm text-white/80 mb-1">Seus Pontos</p>
            <p className="text-5xl font-bold">{currentPoints}</p>
            <p className="text-xs text-white/60 mt-1">
              = R$ {(currentPoints * 0.1).toFixed(2)} em descontos
            </p>
          </div>

          {/* Progress to next level */}
          {!nextLevel.isMaxLevel && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-white/80">
                  Próximo nível: {nextLevel.nextLevel.icon} {nextLevel.nextLevel.name}
                </p>
                <p className="text-sm font-medium">
                  {nextLevel.pointsNeeded} pts
                </p>
              </div>
              <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${nextLevel.progress}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full bg-white rounded-full"
                />
              </div>
            </div>
          )}

          {level.id === 'gold' && (
            <div className="flex items-center gap-2 text-white/90">
              <Star className="w-5 h-5 fill-current" />
              <p className="text-sm font-medium">Você atingiu o nível máximo! 🎉</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Benefits */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Gift className="w-5 h-5 text-purple-600" />
          Seus Benefícios {level.icon}
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Frete</p>
              <p className="text-xs text-gray-600">
                {level.benefits.deliveryDiscount >= 100 
                  ? 'Grátis sempre' 
                  : `-${level.benefits.deliveryDiscount}%`}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Pontos</p>
              <p className="text-xs text-gray-600">
                {level.benefits.pointsMultiplier}x multiplicador
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Gift className="w-5 h-5 text-pink-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Aniversário</p>
              <p className="text-xs text-gray-600">
                +{level.benefits.birthdayBonus} pontos
              </p>
            </div>
          </div>

          {level.benefits.exclusiveCoupons && (
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Exclusivo</p>
                <p className="text-xs text-gray-600">
                  Cupons especiais
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Dialog open={showRewards} onOpenChange={setShowRewards}>
          <DialogTrigger asChild>
            <Button 
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Gift className="w-4 h-4 mr-2" />
              Resgatar Pontos
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <RewardsDialog 
              currentPoints={currentPoints}
              manager={manager}
              onRedeem={() => {
                setStats(manager.getStats());
                setShowRewards(false);
              }}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={showHistory} onOpenChange={setShowHistory}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <History className="w-4 h-4 mr-2" />
              Histórico
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <HistoryDialog manager={manager} />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

/**
 * Dialog de Detalhes (versão compacta)
 */
function LoyaltyDetailsDialog({ stats, manager }) {
  const { currentPoints, level, nextLevel } = stats;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {level.icon} Programa de Fidelidade
        </DialogTitle>
        <DialogDescription>
          Nível {level.name} - {currentPoints} pontos acumulados
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className={`bg-gradient-to-r ${level.color} rounded-xl p-4 text-white`}>
          <p className="text-3xl font-bold mb-1">{currentPoints}</p>
          <p className="text-sm text-white/80">
            pontos = R$ {(currentPoints * 0.1).toFixed(2)} em descontos
          </p>
        </div>

        {!nextLevel.isMaxLevel && (
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Próximo nível</span>
              <span className="font-medium">
                {nextLevel.nextLevel.icon} {nextLevel.nextLevel.name}
              </span>
            </div>
            <Progress value={nextLevel.progress} className="h-2" />
            <p className="text-xs text-gray-500 mt-1">
              Faltam {nextLevel.pointsNeeded} pontos
            </p>
          </div>
        )}

        <div className="pt-4 border-t">
          <p className="text-sm text-gray-600 mb-3">Benefícios atuais:</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Zap className="w-4 h-4 text-blue-600" />
              <span>
                Frete: {level.benefits.deliveryDiscount >= 100 
                  ? 'Grátis sempre' 
                  : `-${level.benefits.deliveryDiscount}%`}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              <span>Pontos: {level.benefits.pointsMultiplier}x multiplicador</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Dialog de Recompensas
 */
function RewardsDialog({ currentPoints, manager, onRedeem }) {
  const handleRedeem = (reward) => {
    if (currentPoints < reward.pointsCost) {
      toast.error('Pontos insuficientes');
      return;
    }

    try {
      manager.redeemPoints(
        reward.pointsCost,
        `Resgate: ${reward.name}`,
        { rewardId: reward.id, rewardType: reward.type }
      );
      
      // Disparar evento para atualizar
      window.dispatchEvent(new Event('loyaltyUpdated'));
      
      toast.success(`${reward.name} resgatado com sucesso!`);
      onRedeem();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-purple-600" />
          Resgatar Recompensas
        </DialogTitle>
        <DialogDescription>
          Você tem {currentPoints} pontos disponíveis
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        {REWARDS_CATALOG.map((reward) => {
          const canAfford = currentPoints >= reward.pointsCost;
          
          return (
            <div
              key={reward.id}
              className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                canAfford
                  ? 'border-purple-200 bg-purple-50 hover:border-purple-300'
                  : 'border-gray-200 bg-gray-50 opacity-60'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="text-3xl">{reward.icon}</div>
                <div>
                  <h4 className="font-bold text-gray-900">{reward.name}</h4>
                  <p className="text-sm text-gray-600">{reward.description}</p>
                  <p className="text-xs text-purple-600 font-medium mt-1">
                    {reward.pointsCost} pontos
                  </p>
                </div>
              </div>
              <Button
                onClick={() => handleRedeem(reward)}
                disabled={!canAfford}
                className="bg-gradient-to-r from-purple-600 to-pink-600"
              >
                Resgatar
              </Button>
            </div>
          );
        })}
      </div>
    </>
  );
}

/**
 * Dialog de Histórico
 */
function HistoryDialog({ manager }) {
  const history = manager.getHistory(20).map(formatHistoryEntry);

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <History className="w-5 h-5 text-gray-600" />
          Histórico de Pontos
        </DialogTitle>
        <DialogDescription>
          Últimas 20 transações
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3 py-4">
        {history.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhuma transação ainda</p>
            <p className="text-sm mt-1">
              Faça compras para ganhar pontos!
            </p>
          </div>
        ) : (
          history.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {entry.reason}
                </p>
                <p className="text-xs text-gray-500">{entry.displayDate}</p>
              </div>
              <div className="text-right">
                <p className={`text-lg font-bold ${entry.displayColor}`}>
                  {entry.displayPoints}
                </p>
                <p className="text-xs text-gray-500">
                  Saldo: {entry.balanceAfter}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
