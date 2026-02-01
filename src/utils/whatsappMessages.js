/**
 * Utilitários para formatar mensagens de WhatsApp para pedidos
 */

/**
 * Formata comanda detalhada do pedido
 */
export const formatOrderReceipt = (order, pharmacyName = 'Farmácia') => {
  let message = `🍽️ *COMANDA - ${pharmacyName}*\n\n`;
  message += `📋 *Pedido #${order.order_number || order.id?.slice(-6)}*\n`;
  message += `📅 Data: ${new Date(order.created_date || Date.now()).toLocaleDateString('pt-BR')}\n`;
  message += `👤 Cliente: ${order.customer_name || 'Cliente'}\n`;
  
  if (order.customer_phone) {
    message += `📱 Telefone: ${order.customer_phone}\n`;
  }
  
  message += `\n━━━━━━━━━━━━━━━━━━━━\n`;
  message += `🛒 *ITENS DO PEDIDO*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  if (order.items && order.items.length > 0) {
    order.items.forEach((item, index) => {
      message += `${index + 1}. *${item.name || item.product_name}*\n`;
      if (item.dosage) message += `   ${item.dosage}\n`;
      message += `   ${item.quantity}x R$ ${parseFloat(item.price || item.unit_price || 0).toFixed(2)}\n`;
      message += `   = R$ ${parseFloat((item.price || item.unit_price || 0) * (item.quantity || 1)).toFixed(2)}\n\n`;
    });
  }
  
  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  message += `💰 *RESUMO FINANCEIRO*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  const subtotal = parseFloat(order.subtotal || 0);
  const deliveryFee = parseFloat(order.delivery_fee || 0);
  const discount = parseFloat(order.discount || 0);
  const total = parseFloat(order.total || 0);
  
  message += `Subtotal: R$ ${subtotal.toFixed(2)}\n`;
  if (deliveryFee > 0) {
    message += `Frete: R$ ${deliveryFee.toFixed(2)}\n`;
  }
  if (discount > 0) {
    message += `Desconto: -R$ ${discount.toFixed(2)}\n`;
  }
  message += `\n*TOTAL: R$ ${total.toFixed(2)}*\n`;
  
  if (order.delivery_address) {
    message += `\n━━━━━━━━━━━━━━━━━━━━\n`;
    message += `📍 *ENDEREÇO DE ENTREGA*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    message += `${order.delivery_address.street}, ${order.delivery_address.number}\n`;
    if (order.delivery_address.complement) {
      message += `${order.delivery_address.complement}\n`;
    }
    message += `${order.delivery_address.neighborhood}\n`;
    message += `${order.delivery_address.city}/${order.delivery_address.state}\n`;
    message += `CEP: ${order.delivery_address.zipcode}\n`;
  }
  
  if (order.payment_method) {
    message += `\n💳 Forma de Pagamento: ${order.payment_method}\n`;
  }
  
  message += `\n━━━━━━━━━━━━━━━━━━━━\n`;
  message += `✅ Seu pedido foi recebido!\n`;
  message += `Acompanhe o status em tempo real.\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  
  return message;
};

/**
 * Formata mensagem de atualização de status
 */
export const formatStatusUpdate = (order, newStatus, pharmacyName = 'Farmácia') => {
  const statusMessages = {
    confirmed: {
      emoji: '✅',
      title: 'PEDIDO ACEITO',
      message: `Seu pedido #${order.order_number || order.id?.slice(-6)} foi *aceito* e confirmado!\n\nEstamos preparando seu pedido com muito cuidado.`
    },
    preparing: {
      emoji: '📦',
      title: 'PEDIDO EM SEPARAÇÃO',
      message: `Seu pedido #${order.order_number || order.id?.slice(-6)} está sendo *separado*!\n\nNossos colaboradores estão preparando seus produtos com atenção.`
    },
    out_for_delivery: {
      emoji: '🚚',
      title: 'SAIU PARA ENTREGA',
      message: `Seu pedido #${order.order_number || order.id?.slice(-6)} *saiu para entrega*!\n\nO entregador está a caminho do endereço informado.\n\nPor favor, esteja disponível para receber.`
    },
    delivered: {
      emoji: '🎉',
      title: 'PEDIDO ENTREGUE',
      message: `Seu pedido #${order.order_number || order.id?.slice(-6)} foi *entregue* com sucesso!\n\nObrigado pela preferência! Esperamos que tenha gostado.`
    },
    cancelled: {
      emoji: '❌',
      title: 'PEDIDO CANCELADO',
      message: `Seu pedido #${order.order_number || order.id?.slice(-6)} foi *cancelado*.\n\nEntre em contato conosco se tiver dúvidas.`
    }
  };
  
  const statusInfo = statusMessages[newStatus];
  if (!statusInfo) return null;
  
  let message = `${statusInfo.emoji} *${statusInfo.title}*\n\n`;
  message += `${statusInfo.message}\n\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  message += `📋 Pedido: #${order.order_number || order.id?.slice(-6)}\n`;
  message += `💰 Total: R$ ${parseFloat(order.total || 0).toFixed(2)}\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  
  return message;
};

/**
 * Cria URL do WhatsApp com mensagem formatada
 */
export const sendWhatsAppMessage = (phoneNumber, message) => {
  if (!phoneNumber || !message) return null;
  
  // Formatar número
  let cleaned = phoneNumber.replace(/\D/g, '');
  if (cleaned.length > 0 && !cleaned.startsWith('55')) {
    cleaned = '55' + cleaned;
  }
  
  if (cleaned.length < 10) return null;
  
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
};
