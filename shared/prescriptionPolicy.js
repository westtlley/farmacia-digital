export const PRESCRIPTION_STATUS = {
  UPLOADED: 'uploaded',
  PENDING_REVIEW: 'pending_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
};

export const REVIEW_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export const REGULATORY_LEVEL = {
  COMMON: 'common',
  PRESCRIPTION: 'prescription',
  ANTIBIOTIC: 'antibiotic',
  CONTROLLED: 'controlled',
};

export function getProductRegulatoryLevel(product = {}) {
  if (product.is_controlled) {
    return REGULATORY_LEVEL.CONTROLLED;
  }

  if (product.is_antibiotic) {
    return REGULATORY_LEVEL.ANTIBIOTIC;
  }

  if (product.requires_prescription) {
    return REGULATORY_LEVEL.PRESCRIPTION;
  }

  return REGULATORY_LEVEL.COMMON;
}

export function productRequiresPrescription(product = {}) {
  return getProductRegulatoryLevel(product) !== REGULATORY_LEVEL.COMMON;
}

export function prescriptionApprovalRequired(product = {}) {
  const level = getProductRegulatoryLevel(product);
  return level === REGULATORY_LEVEL.ANTIBIOTIC || level === REGULATORY_LEVEL.CONTROLLED;
}

export function getPolicyForProduct(product = {}) {
  const level = getProductRegulatoryLevel(product);

  if (level === REGULATORY_LEVEL.CONTROLLED) {
    return {
      level,
      requiresPrescription: true,
      requiresApprovedPrescription: true,
      label: 'Controlado',
      checkoutMessage: 'Medicamento controlado exige receita aprovada manualmente.',
    };
  }

  if (level === REGULATORY_LEVEL.ANTIBIOTIC) {
    return {
      level,
      requiresPrescription: true,
      requiresApprovedPrescription: true,
      label: 'Antibiotico',
      checkoutMessage: 'Antibiotico exige receita aprovada manualmente.',
    };
  }

  if (level === REGULATORY_LEVEL.PRESCRIPTION) {
    return {
      level,
      requiresPrescription: true,
      requiresApprovedPrescription: false,
      label: 'Receita obrigatoria',
      checkoutMessage: 'Este item exige uma receita anexada antes da finalizacao.',
    };
  }

  return {
    level,
    requiresPrescription: false,
    requiresApprovedPrescription: false,
    label: 'Comum',
    checkoutMessage: 'Compra liberada sem receita.',
  };
}

export function getMostRestrictivePolicy(products = []) {
  return products.reduce(
    (currentPolicy, product) => {
      const candidate = getPolicyForProduct(product);
      const score = getPolicyScore(candidate.level);
      const currentScore = getPolicyScore(currentPolicy.level);
      return score > currentScore ? candidate : currentPolicy;
    },
    getPolicyForProduct()
  );
}

export function isPrescriptionRejected(prescription = {}) {
  return (
    prescription.status === PRESCRIPTION_STATUS.REJECTED ||
    prescription.review_status === REVIEW_STATUS.REJECTED
  );
}

export function isPrescriptionApproved(prescription = {}) {
  return (
    prescription.status === PRESCRIPTION_STATUS.APPROVED &&
    prescription.review_status === REVIEW_STATUS.APPROVED
  );
}

export function isPrescriptionUsableForProduct(prescription = {}, product = {}) {
  if (!prescription || !productRequiresPrescription(product) || isPrescriptionRejected(prescription)) {
    return false;
  }

  if (prescription.status === PRESCRIPTION_STATUS.EXPIRED) {
    return false;
  }

  if (prescriptionApprovalRequired(product)) {
    return isPrescriptionApproved(prescription);
  }

  return [
    PRESCRIPTION_STATUS.UPLOADED,
    PRESCRIPTION_STATUS.PENDING_REVIEW,
    PRESCRIPTION_STATUS.APPROVED,
  ].includes(prescription.status);
}

function getPolicyScore(level = REGULATORY_LEVEL.COMMON) {
  switch (level) {
    case REGULATORY_LEVEL.CONTROLLED:
      return 4;
    case REGULATORY_LEVEL.ANTIBIOTIC:
      return 3;
    case REGULATORY_LEVEL.PRESCRIPTION:
      return 2;
    default:
      return 1;
  }
}
