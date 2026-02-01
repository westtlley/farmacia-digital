/**
 * Sistema de Notificações de Estoque
 * Gerencia notificações quando produtos voltam ao estoque
 */

import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { createWhatsAppUrl } from '@/utils/whatsapp';

/**
 * Salva uma solicitação de notificação de estoque
 * @param {Object} data - Dados da notificação
 * @param {string} data.product_id - ID do produto
 * @param {string} data.product_name - Nome do produto
 * @param {string} data.customer_name - Nome do cliente
 * @param {string} data.customer_email - Email do cliente (opcional)
 * @param {string} data.customer_phone - Telefone do cliente (opcional)
 * @returns {Promise<Object>} Notificação criada
 */
export const saveStockNotification = async (data) => {
  try {
    // Validar que pelo menos email ou telefone foi fornecido
    if (!data.customer_email && !data.customer_phone) {
      throw new Error('É necessário fornecer email ou telefone');
    }

    // Verificar se já existe notificação pendente para este produto e cliente
    const existing = await base44.entities.StockNotification.filter({
      product_id: data.product_id,
      customer_email: data.customer_email || '',
      customer_phone: data.customer_phone || '',
      notified: false
    });

    if (existing && existing.length > 0) {
      return { alreadyExists: true, notification: existing[0] };
    }

    // Criar nova notificação
    const notification = await base44.entities.StockNotification.create({
      product_id: data.product_id,
      product_name: data.product_name,
      customer_name: data.customer_name,
      customer_email: data.customer_email || '',
      customer_phone: data.customer_phone || '',
      notified: false,
      created_at: new Date().toISOString()
    });

    return { success: true, notification };
  } catch (error) {
    console.error('Erro ao salvar notificação de estoque:', error);
    throw error;
  }
};

/**
 * Busca todas as notificações pendentes para um produto
 * @param {string} productId - ID do produto
 * @returns {Promise<Array>} Lista de notificações pendentes
 */
export const getPendingNotifications = async (productId) => {
  try {
    const notifications = await base44.entities.StockNotification.filter({
      product_id: productId,
      notified: false
    });
    return notifications || [];
  } catch (error) {
    console.error('Erro ao buscar notificações pendentes:', error);
    return [];
  }
};

/**
 * Marca uma notificação como enviada
 * @param {string} notificationId - ID da notificação
 */
export const markAsNotified = async (notificationId) => {
  try {
    await base44.entities.StockNotification.update(notificationId, {
      notified: true,
      notified_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao marcar notificação como enviada:', error);
  }
};

/**
 * Envia notificações para todos os clientes interessados quando produto volta ao estoque
 * @param {Object} product - Produto que voltou ao estoque
 * @param {string} pharmacyName - Nome da farmácia
 * @param {string} whatsappNumber - Número de WhatsApp da farmácia
 * @returns {Promise<Object>} Resultado do envio
 */
export const notifyProductBackInStock = async (product, pharmacyName = 'Farmácia', whatsappNumber = '') => {
  try {
    // Buscar notificações pendentes
    const notifications = await getPendingNotifications(product.id);
    
    if (!notifications || notifications.length === 0) {
      return { 
        success: true, 
        count: 0, 
        message: 'Nenhuma notificação pendente' 
      };
    }

    let emailsSent = 0;
    let whatsappOpened = 0;
    const errors = [];

    // Processar cada notificação
    for (const notification of notifications) {
      try {
        // Se tiver WhatsApp, preparar mensagem
        if (notification.customer_phone && whatsappNumber) {
          const message = `🎉 *Produto Disponível!*\n\n` +
            `Olá ${notification.customer_name}!\n\n` +
            `O produto *${product.name}* que você solicitou voltou ao estoque! ✅\n\n` +
            `💰 *Preço:* R$ ${product.price?.toFixed(2).replace('.', ',')}\n\n` +
            `🛒 Acesse nosso site para adicionar ao carrinho:\n` +
            `${window.location.origin}/Product?id=${product.id}\n\n` +
            `_${pharmacyName} - Seu bem-estar é nossa prioridade!_`;

          // Criar URL do WhatsApp
          const url = createWhatsAppUrl(notification.customer_phone, message);
          
          if (url) {
            // Abrir WhatsApp (apenas o primeiro para não sobrecarregar)
            if (whatsappOpened === 0) {
              window.open(url, '_blank');
            }
            whatsappOpened++;
          }
        }

        // Se tiver email, aqui você pode integrar com serviço de email
        // Por exemplo: SendGrid, Mailgun, etc.
        if (notification.customer_email) {
          // TODO: Implementar envio de email
          // await sendEmailNotification(notification, product);
          emailsSent++;
        }

        // Marcar como notificado
        await markAsNotified(notification.id);
      } catch (error) {
        console.error(`Erro ao processar notificação ${notification.id}:`, error);
        errors.push({
          notificationId: notification.id,
          error: error.message
        });
      }
    }

    const totalSent = whatsappOpened + emailsSent;
    
    return {
      success: true,
      count: totalSent,
      whatsappOpened,
      emailsSent,
      errors,
      message: `${totalSent} notificação(ões) enviada(s)!`
    };
  } catch (error) {
    console.error('Erro ao enviar notificações:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Limpa notificações antigas (já notificadas há mais de 30 dias)
 */
export const cleanOldNotifications = async () => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const oldNotifications = await base44.entities.StockNotification.filter({
      notified: true
    });

    let cleaned = 0;
    for (const notification of oldNotifications) {
      if (notification.notified_at && new Date(notification.notified_at) < thirtyDaysAgo) {
        await base44.entities.StockNotification.delete(notification.id);
        cleaned++;
      }
    }

    return { success: true, cleaned };
  } catch (error) {
    console.error('Erro ao limpar notificações antigas:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Obtém estatísticas de notificações
 */
export const getNotificationStats = async () => {
  try {
    const all = await base44.entities.StockNotification.list();
    const pending = all.filter(n => !n.notified);
    const sent = all.filter(n => n.notified);

    return {
      total: all.length,
      pending: pending.length,
      sent: sent.length,
      success: true
    };
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return {
      total: 0,
      pending: 0,
      sent: 0,
      success: false
    };
  }
};
