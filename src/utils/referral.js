/**
 * Sistema de Referral Geográfico
 * Permite que clientes indiquem amigos/vizinhos e ganhem recompensas
 */

/**
 * Configuração do programa de indicação
 */
export const REFERRAL_CONFIG = {
  referrerReward: 20, // R$ 20 OFF para quem indica
  referredReward: 20, // R$ 20 OFF para quem é indicado
  maxDistance: 5, // 5 km de distância máxima (incentiva bairro)
  minPurchaseForReward: 50, // Compra mínima para liberar recompensa
  pointsBonus: 200, // Pontos bônus de fidelidade
  expirationDays: 30 // Dias para usar o cupom
};

/**
 * Classe para gerenciar referrals
 */
export class ReferralManager {
  constructor(customerId) {
    this.customerId = customerId;
    this.storageKey = `referral_${customerId}`;
    this.load();
  }

  load() {
    const data = localStorage.getItem(this.storageKey);
    if (data) {
      const parsed = JSON.parse(data);
      this.referralCode = parsed.referralCode || this.generateCode();
      this.referredBy = parsed.referredBy || null;
      this.referrals = parsed.referrals || [];
      this.totalEarned = parsed.totalEarned || 0;
    } else {
      this.referralCode = this.generateCode();
      this.referredBy = null;
      this.referrals = [];
      this.totalEarned = 0;
    }
  }

  save() {
    const data = {
      referralCode: this.referralCode,
      referredBy: this.referredBy,
      referrals: this.referrals,
      totalEarned: this.totalEarned,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  generateCode() {
    // Gera código único: FARM + 6 caracteres
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'FARM';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  getReferralLink() {
    const baseUrl = window.location.origin;
    return `${baseUrl}/Home?ref=${this.referralCode}`;
  }

  addReferral(referredCustomerId, referredCustomerName, purchaseValue) {
    const referral = {
      id: Date.now(),
      customerId: referredCustomerId,
      customerName: referredCustomerName,
      purchaseValue: purchaseValue,
      reward: REFERRAL_CONFIG.referrerReward,
      status: purchaseValue >= REFERRAL_CONFIG.minPurchaseForReward ? 'completed' : 'pending',
      date: new Date().toISOString()
    };

    this.referrals.push(referral);
    
    if (referral.status === 'completed') {
      this.totalEarned += REFERRAL_CONFIG.referrerReward;
    }

    this.save();
    return referral;
  }

  getStats() {
    const completed = this.referrals.filter(r => r.status === 'completed').length;
    const pending = this.referrals.filter(r => r.status === 'pending').length;

    return {
      totalReferrals: this.referrals.length,
      completed,
      pending,
      totalEarned: this.totalEarned,
      referralCode: this.referralCode,
      referralLink: this.getReferralLink()
    };
  }
}

/**
 * Verifica se um código de referral é válido
 * @param {string} code - Código de referral
 * @returns {boolean}
 */
export function isValidReferralCode(code) {
  return code && code.startsWith('FARM') && code.length === 10;
}

/**
 * Gera mensagem para compartilhamento no WhatsApp
 * @param {string} referralCode - Código do indicador
 * @param {string} referrerName - Nome de quem indica
 * @returns {string} Mensagem formatada
 */
export function generateWhatsAppMessage(referralCode, referrerName = 'seu amigo') {
  const link = `${window.location.origin}/Home?ref=${referralCode}`;
  
  return `🎁 *Ganhe R$ ${REFERRAL_CONFIG.referredReward} OFF na Farmácia!*

${referrerName} está te indicando a Farmácia Digital!

💰 *R$ ${REFERRAL_CONFIG.referredReward} OFF* na sua primeira compra
🚚 *Entrega rápida* no seu bairro
💊 *Medicamentos com os melhores preços*

Use o código: *${referralCode}*

Ou acesse direto: ${link}

_Válido para compras acima de R$ ${REFERRAL_CONFIG.minPurchaseForReward}_`;
}

/**
 * Gera mensagem para compartilhamento por email
 * @param {string} referralCode - Código do indicador
 * @param {string} referrerName - Nome de quem indica
 * @returns {object} { subject, body }
 */
export function generateEmailMessage(referralCode, referrerName = 'seu amigo') {
  const link = `${window.location.origin}/Home?ref=${referralCode}`;
  
  return {
    subject: `🎁 ${referrerName} te deu R$ ${REFERRAL_CONFIG.referredReward} OFF na Farmácia!`,
    body: `Olá!

${referrerName} está te indicando a Farmácia Digital e você ganhou um presente especial!

🎁 R$ ${REFERRAL_CONFIG.referredReward} OFF na sua primeira compra
🚚 Entrega rápida no seu bairro
💊 Os melhores preços em medicamentos

Use o código: ${referralCode}

Ou acesse direto: ${link}

Válido para compras acima de R$ ${REFERRAL_CONFIG.minPurchaseForReward}

Aproveite!`
  };
}

/**
 * Copia link de referral para clipboard
 * @param {string} referralCode - Código de referral
 * @returns {boolean} Sucesso
 */
export async function copyReferralLink(referralCode) {
  const link = `${window.location.origin}/Home?ref=${referralCode}`;
  
  try {
    await navigator.clipboard.writeText(link);
    return true;
  } catch (error) {
    console.error('Erro ao copiar link:', error);
    return false;
  }
}

/**
 * Compartilha referral via Web Share API
 * @param {string} referralCode - Código de referral
 * @param {string} referrerName - Nome de quem indica
 * @returns {Promise<boolean>}
 */
export async function shareReferral(referralCode, referrerName) {
  const link = `${window.location.origin}/Home?ref=${referralCode}`;
  const message = `🎁 Ganhe R$ ${REFERRAL_CONFIG.referredReward} OFF na Farmácia!\n\n${referrerName} está te indicando!\n\nUse o código: ${referralCode}\n${link}`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Ganhe desconto na Farmácia!',
        text: message,
        url: link
      });
      return true;
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Erro ao compartilhar:', error);
      }
      return false;
    }
  }
  
  return false;
}

/**
 * Aplica código de referral para novo cliente
 * @param {string} code - Código recebido
 * @param {string} newCustomerId - ID do novo cliente
 * @returns {object|null} Cupom gerado ou null
 */
export function applyReferralCode(code, newCustomerId) {
  if (!isValidReferralCode(code)) {
    return null;
  }

  // Gerar cupom de desconto para o novo cliente
  const coupon = {
    code: `REF${code.substring(4)}`, // REF + parte do código original
    type: 'fixed',
    value: REFERRAL_CONFIG.referredReward,
    description: `Indicação de amigo - R$ ${REFERRAL_CONFIG.referredReward} OFF`,
    minPurchase: REFERRAL_CONFIG.minPurchaseForReward,
    maxDiscount: REFERRAL_CONFIG.referredReward,
    validFor: 'firstPurchase',
    expiresAt: new Date(Date.now() + REFERRAL_CONFIG.expirationDays * 24 * 60 * 60 * 1000).toISOString(),
    referralCode: code,
    newCustomerId: newCustomerId
  };

  return coupon;
}

/**
 * Registra conclusão de referral (quando indicado faz primeira compra)
 * @param {string} referralCode - Código do indicador
 * @param {string} referredCustomerId - ID de quem foi indicado
 * @param {number} purchaseValue - Valor da compra
 * @returns {object} Recompensa gerada
 */
export function completeReferral(referralCode, referredCustomerId, purchaseValue) {
  if (purchaseValue < REFERRAL_CONFIG.minPurchaseForReward) {
    return {
      success: false,
      message: `Compra mínima de R$ ${REFERRAL_CONFIG.minPurchaseForReward} necessária`
    };
  }

  // Gerar cupom para quem indicou
  const referrerCoupon = {
    code: `OBRIGADO${Date.now().toString().slice(-6)}`,
    type: 'fixed',
    value: REFERRAL_CONFIG.referrerReward,
    description: `Obrigado por indicar - R$ ${REFERRAL_CONFIG.referrerReward} OFF`,
    minPurchase: 0,
    maxDiscount: REFERRAL_CONFIG.referrerReward,
    validFor: 'all',
    expiresAt: new Date(Date.now() + REFERRAL_CONFIG.expirationDays * 24 * 60 * 60 * 1000).toISOString()
  };

  return {
    success: true,
    message: `Indicação bem-sucedida! Você ganhou R$ ${REFERRAL_CONFIG.referrerReward} OFF`,
    coupon: referrerCoupon,
    pointsBonus: REFERRAL_CONFIG.pointsBonus
  };
}

/**
 * Salva dados de referral no localStorage
 * @param {string} customerId - ID do cliente
 * @param {object} data - Dados do referral
 */
export function saveReferralData(customerId, data) {
  const key = `referral_data_${customerId}`;
  localStorage.setItem(key, JSON.stringify({
    ...data,
    savedAt: new Date().toISOString()
  }));
}

/**
 * Busca dados de referral
 * @param {string} customerId - ID do cliente
 * @returns {object|null}
 */
export function getReferralData(customerId) {
  const key = `referral_data_${customerId}`;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
}
