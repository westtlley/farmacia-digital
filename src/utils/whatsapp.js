import { useTheme } from '@/components/pharmacy/ThemeProvider';

/**
 * Formata número de WhatsApp removendo caracteres não numéricos
 * e adicionando código do país (55) se necessário
 */
export const formatWhatsAppNumber = (phone) => {
  if (!phone) return null;
  
  // Remove todos os caracteres não numéricos
  let cleaned = phone.replace(/\D/g, '');
  
  // Se não começar com 55 (código do Brasil), adiciona
  if (cleaned.length > 0 && !cleaned.startsWith('55')) {
    cleaned = '55' + cleaned;
  }
  
  return cleaned.length >= 10 ? cleaned : null;
};

/**
 * Hook para obter número de WhatsApp formatado do tema
 */
export const useWhatsAppNumber = () => {
  try {
    const theme = useTheme();
    return formatWhatsAppNumber(theme.whatsapp);
  } catch (error) {
    // Se não estiver dentro do ThemeProvider, retorna null
    return null;
  }
};

/**
 * Cria URL do WhatsApp com mensagem
 */
export const createWhatsAppUrl = (phoneNumber, message) => {
  const formatted = formatWhatsAppNumber(phoneNumber);
  if (!formatted) return null;
  
  return `https://wa.me/${formatted}?text=${encodeURIComponent(message)}`;
};
