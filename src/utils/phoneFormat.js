/**
 * Formata número de telefone para o formato (xx)xxxxx-xxxx
 * Aceita números com ou sem DDD, com ou sem código do país
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  
  // Remove todos os caracteres não numéricos
  let cleaned = phone.replace(/\D/g, '');
  
  // Remove código do país (55) se presente
  if (cleaned.startsWith('55') && cleaned.length > 10) {
    cleaned = cleaned.substring(2);
  }
  
  // Formata para (xx)xxxxx-xxxx
  if (cleaned.length === 11) {
    // Celular: (xx)xxxxx-xxxx
    return `(${cleaned.substring(0, 2)})${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
  } else if (cleaned.length === 10) {
    // Fixo: (xx)xxxx-xxxx
    return `(${cleaned.substring(0, 2)})${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
  } else if (cleaned.length > 0) {
    // Formata parcialmente conforme o tamanho
    if (cleaned.length <= 2) {
      return `(${cleaned}`;
    } else if (cleaned.length <= 7) {
      return `(${cleaned.substring(0, 2)})${cleaned.substring(2)}`;
    } else {
      return `(${cleaned.substring(0, 2)})${cleaned.substring(2, 7)}-${cleaned.substring(7, 11)}`;
    }
  }
  
  return cleaned;
};

/**
 * Aplica máscara de telefone enquanto o usuário digita
 */
export const applyPhoneMask = (value) => {
  const cleaned = value.replace(/\D/g, '');
  
  if (cleaned.length === 0) return '';
  if (cleaned.length <= 2) return `(${cleaned}`;
  if (cleaned.length <= 7) return `(${cleaned.substring(0, 2)})${cleaned.substring(2)}`;
  if (cleaned.length <= 11) {
    return `(${cleaned.substring(0, 2)})${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
  }
  
  // Limita a 11 dígitos
  return `(${cleaned.substring(0, 2)})${cleaned.substring(2, 7)}-${cleaned.substring(7, 11)}`;
};

/**
 * Remove formatação do telefone, retornando apenas números
 */
export const unformatPhone = (phone) => {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
};
