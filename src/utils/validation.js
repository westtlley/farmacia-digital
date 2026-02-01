// Utilitários de validação e parsing de dados

/**
 * Parse e valida valores monetários
 */
export const parseMoney = (value) => {
  if (!value && value !== 0) return 0;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : Math.max(0, parsed);
};

/**
 * Valida email
 */
export const isValidEmail = (email) => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Valida telefone brasileiro
 */
export const isValidPhone = (phone) => {
  if (!phone) return false;
  const phoneRegex = /^[\d\s\(\)\-\+]{10,15}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

/**
 * Valida arquivo de imagem
 */
export const validateImage = (file) => {
  if (!file) return { valid: false, error: 'Nenhum arquivo selecionado' };
  
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  
  if (!allowedTypes.includes(file.type)) {
    return { 
      valid: false, 
      error: 'Tipo de arquivo não permitido. Use JPG, PNG ou WEBP' 
    };
  }
  
  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: 'Arquivo muito grande. Tamanho máximo: 5MB' 
    };
  }
  
  return { valid: true, error: null };
};

/**
 * Valida SKU único
 */
export const validateSkuUnique = async (sku, existingProducts, excludeId = null) => {
  if (!sku || !sku.trim()) return { valid: true, error: null };
  
  const exists = existingProducts.some(p => 
    p.sku && p.sku.toLowerCase() === sku.toLowerCase() && p.id !== excludeId
  );
  
  if (exists) {
    return { valid: false, error: 'SKU já existe. Use um SKU único.' };
  }
  
  return { valid: true, error: null };
};

/**
 * Valida formulário de produto
 */
export const validateProductForm = (formData) => {
  const errors = {};
  
  if (!formData.name || !formData.name.trim()) {
    errors.name = 'Nome do produto é obrigatório';
  }
  
  if (!formData.price || parseMoney(formData.price) <= 0) {
    errors.price = 'Preço deve ser maior que zero';
  }
  
  if (!formData.category) {
    errors.category = 'Categoria é obrigatória';
  }
  
  if (formData.stock_quantity !== undefined && formData.stock_quantity !== '') {
    const stock = parseFloat(formData.stock_quantity);
    if (isNaN(stock) || stock < 0) {
      errors.stock_quantity = 'Estoque deve ser um número positivo';
    }
  }
  
  if (formData.min_stock !== undefined && formData.min_stock !== '') {
    const minStock = parseFloat(formData.min_stock);
    if (isNaN(minStock) || minStock < 0) {
      errors.min_stock = 'Estoque mínimo deve ser um número positivo';
    }
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Valida formulário de promoção
 */
export const validatePromotionForm = (formData) => {
  const errors = {};
  
  if (!formData.name || !formData.name.trim()) {
    errors.name = 'Nome da promoção é obrigatório';
  }
  
  if (!formData.value || parseMoney(formData.value) <= 0) {
    errors.value = 'Valor do desconto deve ser maior que zero';
  }
  
  if (formData.type === 'percentage' && parseMoney(formData.value) > 100) {
    errors.value = 'Desconto percentual não pode ser maior que 100%';
  }
  
  if (formData.start_date && formData.end_date) {
    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);
    if (end < start) {
      errors.end_date = 'Data de fim deve ser posterior à data de início';
    }
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Valida configurações da farmácia
 */
export const validateSettingsForm = (formData) => {
  const errors = {};
  
  if (!formData.pharmacy_name || !formData.pharmacy_name.trim()) {
    errors.pharmacy_name = 'Nome da farmácia é obrigatório';
  }
  
  if (formData.email && !isValidEmail(formData.email)) {
    errors.email = 'Email inválido';
  }
  
  if (formData.phone && !isValidPhone(formData.phone)) {
    errors.phone = 'Telefone inválido';
  }
  
  if (formData.whatsapp && !isValidPhone(formData.whatsapp)) {
    errors.whatsapp = 'WhatsApp inválido';
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Valida transição de status de pedido
 */
export const canChangeOrderStatus = (currentStatus, newStatus) => {
  const validTransitions = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['preparing', 'cancelled'],
    preparing: ['out_for_delivery', 'cancelled'],
    out_for_delivery: ['delivered'],
    delivered: [], // Estado final
    cancelled: [] // Estado final
  };
  
  return validTransitions[currentStatus]?.includes(newStatus) || false;
};

/**
 * Sanitiza string (remove caracteres perigosos)
 */
export const sanitizeString = (str) => {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/[<>]/g, '');
};

/**
 * Formata número para exibição monetária
 */
export const formatMoney = (value) => {
  return parseMoney(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};
