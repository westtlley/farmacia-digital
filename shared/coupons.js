export const DEFAULT_COUPONS = [
  {
    code: 'JARDINS30',
    type: 'percentage',
    value: 30,
    description: '30% OFF - Primeira compra Jardins',
    minPurchase: 0,
    maxDiscount: 50,
    validFor: 'firstPurchase',
    zipCodes: ['01400', '01401', '01402', '01403', '01404', '01405'],
    neighborhood: 'Jardins',
    active: true,
    expiresAt: '2026-12-31',
  },
  {
    code: 'MOEMA25',
    type: 'percentage',
    value: 25,
    description: '25% OFF - Primeira compra Moema',
    minPurchase: 0,
    maxDiscount: 40,
    validFor: 'firstPurchase',
    zipCodes: ['04560', '04561', '04562', '04563', '04564'],
    neighborhood: 'Moema',
    active: true,
    expiresAt: '2026-12-31',
  },
  {
    code: 'VILAMARIA20',
    type: 'percentage',
    value: 20,
    description: '20% OFF - Primeira compra Vila Mariana',
    minPurchase: 0,
    maxDiscount: 35,
    validFor: 'firstPurchase',
    zipCodes: ['04010', '04011', '04012', '04013', '04014'],
    neighborhood: 'Vila Mariana',
    active: true,
    expiresAt: '2026-12-31',
  },
  {
    code: 'CENTRO15',
    type: 'percentage',
    value: 15,
    description: '15% OFF - Centro',
    minPurchase: 0,
    maxDiscount: 30,
    validFor: 'all',
    zipCodes: ['01000', '01001', '01002', '01003', '01004', '01005'],
    neighborhood: 'Centro',
    active: true,
    expiresAt: '2026-12-31',
  },
  {
    code: 'BEMVINDO',
    type: 'percentage',
    value: 15,
    description: '15% OFF - Primeira compra',
    minPurchase: 50,
    maxDiscount: 30,
    validFor: 'firstPurchase',
    zipCodes: [],
    neighborhood: 'Todos',
    active: true,
    expiresAt: '2026-12-31',
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
    expiresAt: '2026-12-31',
  },
  {
    code: 'FRETEGRATIS',
    type: 'freeShipping',
    value: 100,
    description: 'Frete Gratis',
    minPurchase: 0,
    maxDiscount: 100,
    validFor: 'all',
    zipCodes: [],
    neighborhood: 'Todos',
    active: true,
    expiresAt: '2026-12-31',
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
    expiresAt: '2026-12-31',
  },
];

export function validateCoupon(code, zipCode = '', subtotal = 0, isFirstPurchase = false) {
  if (!code) return null;

  const coupon = DEFAULT_COUPONS.find((entry) =>
    entry.code.toUpperCase() === String(code).toUpperCase() && entry.active
  );

  if (!coupon) {
    return { valid: false, error: 'Cupom nao encontrado' };
  }

  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    return { valid: false, error: 'Cupom expirado' };
  }

  if (coupon.minPurchase && subtotal < coupon.minPurchase) {
    return {
      valid: false,
      error: `Compra minima de R$ ${coupon.minPurchase.toFixed(2)} necessaria`,
    };
  }

  if (coupon.validFor === 'firstPurchase' && !isFirstPurchase) {
    return {
      valid: false,
      error: 'Cupom valido apenas para primeira compra',
    };
  }

  if (coupon.zipCodes && coupon.zipCodes.length > 0) {
    const zipPrefix = String(zipCode || '').replace(/\D/g, '').substring(0, 5);
    const isValidZip = coupon.zipCodes.some((validZip) => zipPrefix.startsWith(validZip));

    if (!isValidZip) {
      return {
        valid: false,
        error: `Cupom valido apenas para ${coupon.neighborhood}`,
      };
    }
  }

  return {
    valid: true,
    coupon: {
      ...coupon,
      code: String(code).toUpperCase(),
    },
  };
}

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

  discount = Math.min(discount, subtotal);

  return {
    discount: Number(discount.toFixed(2)),
    finalDeliveryFee: Number(finalDeliveryFee.toFixed(2)),
  };
}

export function getAllCoupons() {
  return DEFAULT_COUPONS.filter((coupon) => coupon.active);
}

export function getCouponsForZipCode(zipCode = '') {
  const zipPrefix = String(zipCode || '').replace(/\D/g, '').substring(0, 5);

  return DEFAULT_COUPONS.filter((coupon) => {
    if (!coupon.active) {
      return false;
    }

    if (!coupon.zipCodes || coupon.zipCodes.length === 0) {
      return true;
    }

    return coupon.zipCodes.some((validZip) => zipPrefix.startsWith(validZip));
  });
}

export function suggestCoupons(subtotal, zipCode = '', isFirstPurchase = false) {
  const availableCoupons = zipCode ? getCouponsForZipCode(zipCode) : getAllCoupons();

  return availableCoupons
    .filter((coupon) => {
      if (coupon.minPurchase > subtotal) {
        return false;
      }

      if (coupon.validFor === 'firstPurchase' && !isFirstPurchase) {
        return false;
      }

      return true;
    })
    .sort((left, right) => {
      if (left.zipCodes?.length > 0 && !right.zipCodes?.length) return -1;
      if (!left.zipCodes?.length && right.zipCodes?.length > 0) return 1;

      return right.value - left.value;
    })
    .slice(0, 3);
}

export function formatCouponDescription(coupon) {
  if (!coupon) {
    return '';
  }

  const { type, value, neighborhood, minPurchase } = coupon;
  let description = '';

  if (type === 'percentage') {
    description = `${value}% OFF`;
  } else if (type === 'fixed') {
    description = `R$ ${value.toFixed(2)} OFF`;
  } else if (type === 'freeShipping') {
    description = 'FRETE GRATIS';
  }

  if (neighborhood && neighborhood !== 'Todos') {
    description += ` - ${neighborhood}`;
  }

  if (minPurchase > 0) {
    description += ` (min. R$ ${minPurchase.toFixed(2)})`;
  }

  return description;
}
