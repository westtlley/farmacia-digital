/**
 * Utilitários para formatação de campos de formulário
 */

/**
 * Formata valor monetário (R$ 0,00)
 */
export const formatCurrency = (value) => {
  if (!value && value !== 0) return '';
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^\d,.-]/g, '').replace(',', '.')) : value;
  if (isNaN(numValue)) return '';
  return numValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Remove formatação monetária
 */
export const unformatCurrency = (value) => {
  if (!value && value !== 0) return '';
  // Remove tudo exceto números, vírgula e ponto
  const cleaned = value.toString().replace(/[^\d,.-]/g, '');
  // Substitui vírgula por ponto (formato brasileiro)
  return cleaned.replace(',', '.');
};

/**
 * Formata código de barras (EAN)
 */
export const formatBarcode = (value) => {
  if (!value) return '';
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, '');
  // Limita a 13 dígitos (EAN-13)
  return numbers.slice(0, 13);
};

/**
 * Valida email
 */
export const validateEmail = (email) => {
  if (!email) return { valid: true, message: '' };
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return {
    valid: emailRegex.test(email),
    message: emailRegex.test(email) ? '' : 'Email inválido'
  };
};

/**
 * Valida CEP (formato brasileiro)
 */
export const formatCEP = (value) => {
  if (!value) return '';
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 5) return numbers;
  return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
};

/**
 * Valida CEP
 */
export const validateCEP = (cep) => {
  if (!cep) return { valid: true, message: '' };
  const numbers = cep.replace(/\D/g, '');
  return {
    valid: numbers.length === 8,
    message: numbers.length === 8 ? '' : 'CEP deve ter 8 dígitos'
  };
};

/**
 * Formata CNPJ
 */
export const formatCNPJ = (value) => {
  if (!value) return '';
  const numbers = value.replace(/\D/g, '').slice(0, 14);
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
  if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
  if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
  return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12)}`;
};

/**
 * Valida CNPJ
 */
export const validateCNPJ = (cnpj) => {
  if (!cnpj) return { valid: true, message: '' };
  const numbers = cnpj.replace(/\D/g, '');
  return {
    valid: numbers.length === 14,
    message: numbers.length === 14 ? '' : 'CNPJ deve ter 14 dígitos'
  };
};

/**
 * Formata número com separador de milhar
 */
export const formatNumber = (value) => {
  if (!value && value !== 0) return '';
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^\d,.-]/g, '').replace(',', '.')) : value;
  if (isNaN(numValue)) return '';
  return numValue.toLocaleString('pt-BR');
};
