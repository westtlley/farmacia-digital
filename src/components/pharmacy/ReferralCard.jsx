import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Gift, 
  Copy, 
  Share2, 
  Check,
  MessageCircle,
  Mail,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  ReferralManager,
  REFERRAL_CONFIG,
  generateWhatsAppMessage,
  copyReferralLink,
  shareReferral
} from '@/utils/referral';
import { createWhatsAppUrl } from '@/utils/whatsapp';

/**
 * Card do Sistema de Referral
 * Permite que clientes indiquem amigos e ganhem recompensas
 */
export default function ReferralCard({ customerId = 'guest', customerName = 'Cliente' }) {
  const [manager] = useState(() => new ReferralManager(customerId));
  const [stats, setStats] = useState(manager.getStats());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setStats(manager.getStats());
  }, [manager]);

  const handleCopy = async () => {
    const success = await copyReferralLink(stats.referralCode);
    if (success) {
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Erro ao copiar link');
    }
  };

  const handleWhatsAppShare = () => {
    const message = generateWhatsAppMessage(stats.referralCode, customerName);
    const url = createWhatsAppUrl('', message);
    if (url) {
      window.open(url, '_blank');
    }
  };

  const handleShare = async () => {
    const shared = await shareReferral(stats.referralCode, customerName);
    if (!shared) {
      // Fallback: mostrar opções
      handleCopy();
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Card */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-600 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden"
      >
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-24 -translate-x-24 blur-3xl" />

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-2xl font-bold">Indique e Ganhe</h3>
              <p className="text-sm text-white/80">Ganhe R$ {REFERRAL_CONFIG.referrerReward} por indicação</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
              <p className="text-3xl font-bold">{stats.completed}</p>
              <p className="text-xs text-white/70 mt-1">Indicações</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
              <p className="text-3xl font-bold">R$ {stats.totalEarned}</p>
              <p className="text-xs text-white/70 mt-1">Ganhos</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
              <p className="text-3xl font-bold">{stats.pending}</p>
              <p className="text-xs text-white/70 mt-1">Pendentes</p>
            </div>
          </div>

          {/* Referral Code */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-4">
            <p className="text-xs text-white/70 mb-2">Seu código de indicação:</p>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={stats.referralCode}
                className="bg-white/20 border-white/30 text-white font-mono text-lg font-bold"
              />
              <Button
                onClick={handleCopy}
                size="sm"
                className="bg-white/20 hover:bg-white/30 flex-shrink-0"
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Share Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleWhatsAppShare}
              className="bg-green-600 hover:bg-green-700 w-full"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
            <Button
              onClick={handleShare}
              variant="outline"
              className="bg-white/10 border-white/30 hover:bg-white/20 text-white w-full"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Compartilhar
            </Button>
          </div>
        </div>
      </motion.div>

      {/* How it Works */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Gift className="w-5 h-5 text-purple-600" />
          Como Funciona
        </h4>
        
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-purple-600">
              1
            </div>
            <div>
              <p className="font-medium text-gray-900">Compartilhe seu código</p>
              <p className="text-sm text-gray-600">
                Envie para amigos, familiares e vizinhos
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-purple-600">
              2
            </div>
            <div>
              <p className="font-medium text-gray-900">Seu amigo ganha desconto</p>
              <p className="text-sm text-gray-600">
                R$ {REFERRAL_CONFIG.referredReward} OFF na primeira compra acima de R$ {REFERRAL_CONFIG.minPurchaseForReward}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-purple-600">
              3
            </div>
            <div>
              <p className="font-medium text-gray-900">Você também ganha!</p>
              <p className="text-sm text-gray-600">
                R$ {REFERRAL_CONFIG.referrerReward} OFF + {REFERRAL_CONFIG.pointsBonus} pontos de fidelidade
              </p>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
          <div className="flex items-start gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900 text-sm">
                💡 Dica: Indique vizinhos!
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Indicações no mesmo bairro têm prioridade e ambos ganham benefícios extras.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Referrals */}
      {stats.totalReferrals > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            Suas Indicações
          </h4>
          
          <div className="space-y-3">
            {manager.referrals.slice(0, 5).map((referral) => (
              <div
                key={referral.id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {referral.customerName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(referral.date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="text-right">
                  {referral.status === 'completed' ? (
                    <div>
                      <p className="text-sm font-bold text-green-600">
                        +R$ {referral.reward}
                      </p>
                      <p className="text-xs text-gray-500">Confirmado</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-orange-600">
                        Pendente
                      </p>
                      <p className="text-xs text-gray-500">
                        Aguardando compra
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
