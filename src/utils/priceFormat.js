/**
 * Formata preço para exibição brasileira (com vírgula)
 */
export const formatPrice = (value) => {
  if (value === null || value === undefined) return '0,00';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0,00';
  
  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

/**
 * Formata preço com símbolo R$
 */
export const formatPriceWithSymbol = (value) => {
  return `R$ ${formatPrice(value)}`;
};
