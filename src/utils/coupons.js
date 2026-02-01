/**
 * Sistema de Cupons por Bairro/CEP
 * Permite criar e validar cupons específicos para regiões
 */

// Base de dados de cupons (em produção, seria no Base44)
const COUPONS_DATABASE = [
  // Cupons por Bairro
  {
    code: 'JARDINS30',
    type: 'percentage',
    value: 30,
    description: '30% OFF - Primeira compra Jardins',
    minPurchase: 0,
    maxDiscount: 50,
    validFor: 'firstPurchase',
    zipCodes: ['01400', '01401', '01402', '01403', '01404', '01405'], // Jardins
    neighborhood: 'Jardins',
    active: true,
    expiresAt: '2026-12-31'
  },
  {
    code: 'MOEMA25',
    type: 'percentage',
    value: 25,
    description: '25% OFF - Primeira compra Moema',
    minPurchase: 0,
    maxDiscount: 40,
    validFor: 'firstPurchase',
    zipCodes: ['04560', '04561', '04562', '04563', '04564'], // Moema
    neighborhood: 'Moema',
    active: true,
    expiresAt: '2026-12-31'
  },
  {
    code: 'VILAMARIA20',
    type: 'percentage',
    value: 20,
    description: '20% OFF - Primeira compra Vila Mariana',
    minPurchase: 0,
    maxDiscount: 35,
    validFor: 'firstPurchase',
    zipCodes: ['04010', '04011', '04012', '04013', '04014'], // Vila Mariana
    neighborhood: 'Vila Mariana',
    active: true,
    expiresAt: '2026-12-31'
  },
  {
    code: 'CENTRO15',
    type: 'percentage',
    value: 15,
    description: '15% OFF - Centro',
    minPurchase: 0,
    maxDiscount: 30,
    validFor: 'all',
    zipCodes: ['01000', '01001', '01002', '01003', '01004', '01005'], // Centro
    neighborhood: 'Centro',
    active: true,
    expiresAt: '2026-12-31'
  },
  
  // Cupons Gerais
  {
    code: 'BEMVINDO',
    type: 'percentage',
    value: 15,
    description: '15% OFF - Primeira compra',
    minPurchase: 50,
    maxDiscount: 30,
    validFor: 'firstPurchase',
    zipCodes: [], // Todos os CEPs
    neighborhood: 'Todos',
    active: true,
    expiresAt: '2026-12-31'
  },
  {
    code: 'PRIMEIRA10',
    type: 'percentage',
    value: 10,
    description: '10% OFF - Primeira compra',
    minPurchase: 0,
    maxDiscount: 25,
    validFor: 'firstPurchase',
    zipCodes: [],
    neighborhood: 'Todos',
    active: true,
    expiresAt: '2026-12-31'
  },
  {
    code: 'FRETEGRATIS',
    type: 'freeShipping',
    value: 100, // Valor máximo de desconto no frete
    description: 'Frete Grátis',
    minPurchase: 0,
    maxDiscount: 100,
    validFor: 'all',
    zipCodes: [],
    neighborhood: 'Todos',
    active: true,
    expiresAt: '2026-12-31'
  },
  {
    code: 'DELIVERY10',
    type: 'fixed',
    value: 10,
    description: 'R$ 10 OFF',
    minPurchase: 50,
    maxDiscount: 10,
    validFor: 'all',
    zipCodes: [],
    neighborhood: 'Todos',
    active: true,
    expiresAt: '2026-12-31'
  }
];

/**
 * Valida um cupom baseado no CEP e valor da compra
 * @param {string} code - Código do cupom
 * @param {string} zipCode - CEP do cliente (apenas 5 primeiros dígitos)
 * @param {number} subtotal - Valor do subtotal da compra
 * @param {boolean} isFirstPurchase - Se é primeira compra do cliente
 * @returns {object|null} Cupom validado ou null se inválido
 */
export function validateCoupon(code, zipCode = '', subtotal = 0, isFirstPurchase = false) {
  if (!code) return null;

  const coupon = COUPONS_DATABASE.find(c => 
    c.code.toUpperCase() === code.toUpperCase() && c.active
  );

  if (!coupon) {
    return { valid: false, error: 'Cupom não encontrado' };
  }

  // Verificar expiração
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    return { valid: false, error: 'Cupom expirado' };
  }

  // Verificar valor mínimo de compra
  if (coupon.minPurchase && subtotal < coupon.minPurchase) {
    return { 
      valid: false, 
      error: `Compra mínima de R$ ${coupon.minPurchase.toFixed(2)} necessária` 
    };
  }

  // Verificar primeira compra
  if (coupon.validFor === 'firstPurchase' && !isFirstPurchase) {
    return { 
      valid: false, 
      error: 'Cupom válido apenas para primeira compra' 
    };
  }

  // Verificar CEP (se cupom for específico de região)
  if (coupon.zipCodes && coupon.zipCodes.length > 0) {
    const zipPrefix = zipCode.replace(/\D/g, '').substring(0, 5);
    const isValidZip = coupon.zipCodes.some(validZip => 
      zipPrefix.startsWith(validZip)
    );

    if (!isValidZip) {
      return { 
        valid: false, 
        error: `Cupom válido apenas para ${coupon.neighborhood}` 
      };
    }
  }

  return {
    valid: true,
    coupon: {
      ...coupon,
      code: code.toUpperCase()
    }
  };
}

/**
 * Calcula o desconto de um cupom
 * @param {object} coupon - Cupom validado
 * @param {number} subtotal - Valor do subtotal
 * @param {number} deliveryFee - Valor do frete
 * @returns {object} { discount, finalDeliveryFee }
 */
export function calculateCouponDiscount(coupon, subtotal, deliveryFee = 0) {
  if (!coupon || !coupon.valid) {
    return { discount: 0, finalDeliveryFee: deliveryFee };
  }

  const { type, value, maxDiscount } = coupon.coupon;

  let discount = 0;
  let finalDeliveryFee = deliveryFee;

  switch (type) {
    case 'percentage':
      discount = subtotal * (value / 100);
      discount = Math.min(discount, maxDiscount || Infinity);
      break;

    case 'fixed':
      discount = value;
      discount = Math.min(discount, maxDiscount || value);
      break;

    case 'freeShipping':
      discount = 0;
      finalDeliveryFee = 0;
      break;

    default:
      discount = 0;
  }

  // Desconto não pode ser maior que o subtotal
  discount = Math.min(discount, subtotal);

  return {
    discount: Number(discount.toFixed(2)),
    finalDeliveryFee: Number(finalDeliveryFee.toFixed(2))
  };
}

/**
 * Retorna todos os cupons ativos
 * @returns {array} Lista de cupons
 */
export function getAllCoupons() {
  return COUPONS_DATABASE.filter(c => c.active);
}

/**
 * Retorna cupons disponíveis para um CEP específico
 * @param {string} zipCode - CEP do cliente
 * @returns {array} Lista de cupons disponíveis
 */
export function getCouponsForZipCode(zipCode) {
  const zipPrefix = zipCode.replace(/\D/g, '').substring(0, 5);
  
  return COUPONS_DATABASE.filter(coupon => {
    if (!coupon.active) return false;
    
    // Cupons sem restrição de CEP
    if (!coupon.zipCodes || coupon.zipCodes.length === 0) return true;
    
    // Cupons específicos de região
    return coupon.zipCodes.some(validZip => zipPrefix.startsWith(validZip));
  });
}

/**
 * Sugere cupons baseado no valor do carrinho e CEP
 * @param {number} subtotal - Valor do subtotal
 * @param {string} zipCode - CEP do cliente
 * @param {boolean} isFirstPurchase - Se é primeira compra
 * @returns {array} Lista de cupons sugeridos
 */
export function suggestCoupons(subtotal, zipCode = '', isFirstPurchase = false) {
  const availableCoupons = zipCode ? getCouponsForZipCode(zipCode) : getAllCoupons();
  
  // Filtrar e ordenar cupons por relevância
  const suggestions = availableCoupons
    .filter(coupon => {
      // Remover cupons que requerem valor mínimo maior que o subtotal
      if (coupon.minPurchase > subtotal) return false;
      
      // Remover cupons de primeira compra se não for primeira compra
      if (coupon.validFor === 'firstPurchase' && !isFirstPurchase) return false;
      
      return true;
    })
    .sort((a, b) => {
      // Priorizar cupons de bairro
      if (a.zipCodes?.length > 0 && !b.zipCodes?.length) return -1;
      if (!a.zipCodes?.length && b.zipCodes?.length > 0) return 1;
      
      // Depois por valor de desconto
      return b.value - a.value;
    })
    .slice(0, 3); // Top 3 sugestões

  return suggestions;
}

/**
 * Formata descrição do cupom para exibição
 * @param {object} coupon - Cupom
 * @returns {string} Descrição formatada
 */
export function formatCouponDescription(coupon) {
  if (!coupon) return '';

  const { type, value, neighborhood, minPurchase } = coupon;
  
  let desc = '';
  
  if (type === 'percentage') {
    desc = `${value}% OFF`;
  } else if (type === 'fixed') {
    desc = `R$ ${value.toFixed(2)} OFF`;
  } else if (type === 'freeShipping') {
    desc = 'FRETE GRÁTIS';
  }

  if (neighborhood && neighborhood !== 'Todos') {
    desc += ` - ${neighborhood}`;
  }

  if (minPurchase > 0) {
    desc += ` (mín. R$ ${minPurchase.toFixed(2)})`;
  }

  return desc;
}
