import React from 'react';
import { Printer, X, Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTheme } from '@/components/pharmacy/ThemeProvider';
import { formatWhatsAppNumber, createWhatsAppUrl } from '@/utils/whatsapp';
import { formatOrderReceipt } from '@/utils/whatsappMessages';

export default function OrderInvoice({ order, onClose, mode = 'admin' }) {
  const theme = useTheme();

  const handlePrint = () => {
    const printContent = document.getElementById('invoice-content');
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Comanda - Pedido #${order.order_number || order.id.slice(-6)}</title>
          <style>
            @media print {
              body { margin: 0; padding: 20px; }
              .no-print { display: none !important; }
            }
            body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
              color: #333;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #059669;
              padding-bottom: 20px;
              margin-bottom: 20px;
            }
            .company-info {
              margin-bottom: 20px;
            }
            .order-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 20px;
              padding: 15px;
              background: #f9fafb;
              border-radius: 8px;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            .items-table th,
            .items-table td {
              padding: 10px;
              text-align: left;
              border-bottom: 1px solid #e5e7eb;
            }
            .items-table th {
              background: #f3f4f6;
              font-weight: bold;
            }
            .totals {
              margin-top: 20px;
              padding-top: 20px;
              border-top: 2px solid #e5e7eb;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
            }
            .total-row.final {
              font-size: 1.2em;
              font-weight: bold;
              color: #059669;
              border-top: 2px solid #059669;
              padding-top: 15px;
              margin-top: 10px;
            }
            .address {
              margin-top: 20px;
              padding: 15px;
              background: #f9fafb;
              border-radius: 8px;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              font-size: 0.9em;
              color: #6b7280;
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const handleDownload = () => {
    const printContent = document.getElementById('invoice-content');
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Comanda - Pedido #${order.order_number || order.id.slice(-6)}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
              color: #333;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #059669;
              padding-bottom: 20px;
              margin-bottom: 20px;
            }
            .company-info {
              margin-bottom: 20px;
            }
            .order-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 20px;
              padding: 15px;
              background: #f9fafb;
              border-radius: 8px;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            .items-table th,
            .items-table td {
              padding: 10px;
              text-align: left;
              border-bottom: 1px solid #e5e7eb;
            }
            .items-table th {
              background: #f3f4f6;
              font-weight: bold;
            }
            .totals {
              margin-top: 20px;
              padding-top: 20px;
              border-top: 2px solid #e5e7eb;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
            }
            .total-row.final {
              font-size: 1.2em;
              font-weight: bold;
              color: #059669;
              border-top: 2px solid #059669;
              padding-top: 15px;
              margin-top: 10px;
            }
            .address {
              margin-top: 20px;
              padding: 15px;
              background: #f9fafb;
              border-radius: 8px;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              font-size: 0.9em;
              color: #6b7280;
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comanda-pedido-${order.order_number || order.id.slice(-6)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleWhatsApp = () => {
    const message = formatOrderReceipt(order, theme.pharmacyName || 'Farmácia');
    const whatsappNumber = formatWhatsAppNumber(theme.whatsapp);
    if (whatsappNumber) {
      const url = createWhatsAppUrl(whatsappNumber, message);
      if (url) window.open(url, '_blank');
    }
  };

  const subtotal = order.items?.reduce((sum, item) => {
    const price = parseFloat(item.price || 0);
    const quantity = parseInt(item.quantity || 1);
    return sum + (price * quantity);
  }, 0) || 0;

  const discount = parseFloat(order.discount || 0);
  const deliveryFee = parseFloat(order.delivery_fee || 0);
  const total = parseFloat(order.total || 0);

  const statusLabels = {
    pending: 'Pendente',
    confirmed: 'Confirmado',
    preparing: 'Em Separação',
    out_for_delivery: 'Saiu para Entrega',
    delivered: 'Entregue',
    cancelled: 'Cancelado'
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b no-print">
          <h2 className="text-2xl font-bold text-gray-900">
            Comanda do Pedido #{order.order_number || order.id.slice(-6)}
          </h2>
          <div className="flex items-center gap-2">
            {mode === 'admin' && (
              <>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button variant="outline" size="sm" onClick={handleWhatsApp}>
                  <Share2 className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div id="invoice-content" className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="header text-center border-b-2 border-emerald-600 pb-6 mb-6">
              {theme.logo && (
                <img 
                  src={theme.logo} 
                  alt={theme.pharmacyName}
                  className="h-16 mx-auto mb-4 object-contain"
                />
              )}
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {theme.pharmacyName || 'Farmácia'}
              </h1>
              {theme.cnpj && (
                <p className="text-sm text-gray-600">CNPJ: {theme.cnpj}</p>
              )}
            </div>

            {/* Company Info */}
            <div className="company-info mb-6">
              {theme.address && (
                <div className="text-sm text-gray-600 mb-2">
                  <p>{theme.address.street}, {theme.address.number}</p>
                  {theme.address.complement && <p>{theme.address.complement}</p>}
                  <p>{theme.address.neighborhood} - {theme.address.city}/{theme.address.state}</p>
                  {theme.address.zipcode && <p>CEP: {theme.address.zipcode}</p>}
                </div>
              )}
              {theme.phone && (
                <p className="text-sm text-gray-600">Telefone: {theme.phone}</p>
              )}
              {theme.email && (
                <p className="text-sm text-gray-600">Email: {theme.email}</p>
              )}
            </div>

            {/* Order Info */}
            <div className="order-info bg-gray-50 p-4 rounded-lg mb-6">
              <div>
                <p className="text-sm text-gray-600">Número do Pedido</p>
                <p className="text-xl font-bold text-gray-900">
                  #{order.order_number || order.id.slice(-6)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Data do Pedido</p>
                <p className="text-lg font-semibold text-gray-900">
                  {order.created_date 
                    ? format(new Date(order.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="text-lg font-semibold text-gray-900">
                  {statusLabels[order.status] || order.status}
                </p>
              </div>
            </div>

            {/* Customer Info */}
            <div className="mb-6">
              <h3 className="font-bold text-gray-900 mb-2">Dados do Cliente</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-900"><strong>Nome:</strong> {order.customer_name || 'Não informado'}</p>
                {order.customer_email && (
                  <p className="text-gray-900"><strong>Email:</strong> {order.customer_email}</p>
                )}
                {order.customer_phone && (
                  <p className="text-gray-900"><strong>Telefone:</strong> {order.customer_phone}</p>
                )}
              </div>
            </div>

            {/* Items */}
            <div className="mb-6">
              <h3 className="font-bold text-gray-900 mb-4">Itens do Pedido</h3>
              <table className="items-table w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-3 text-left border-b">Produto</th>
                    <th className="p-3 text-center border-b">Qtd</th>
                    <th className="p-3 text-right border-b">Preço Unit.</th>
                    <th className="p-3 text-right border-b">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items?.map((item, index) => {
                    const itemPrice = parseFloat(item.price || 0);
                    const itemQuantity = parseInt(item.quantity || 1);
                    const itemSubtotal = itemPrice * itemQuantity;
                    
                    return (
                      <tr key={index} className="border-b">
                        <td className="p-3">
                          <p className="font-medium text-gray-900">{item.name || 'Produto'}</p>
                          {item.sku && (
                            <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                          )}
                        </td>
                        <td className="p-3 text-center">{itemQuantity}</td>
                        <td className="p-3 text-right">R$ {itemPrice.toFixed(2)}</td>
                        <td className="p-3 text-right font-semibold">R$ {itemSubtotal.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="totals border-t-2 border-gray-200 pt-6">
              <div className="total-row">
                <span>Subtotal:</span>
                <span>R$ {subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="total-row text-red-600">
                  <span>Desconto:</span>
                  <span>- R$ {discount.toFixed(2)}</span>
                </div>
              )}
              {deliveryFee > 0 && (
                <div className="total-row">
                  <span>Taxa de Entrega:</span>
                  <span>R$ {deliveryFee.toFixed(2)}</span>
                </div>
              )}
              <div className="total-row final">
                <span>Total:</span>
                <span>R$ {total.toFixed(2)}</span>
              </div>
            </div>

            {/* Delivery Address */}
            {order.delivery_address && (
              <div className="address bg-gray-50 p-4 rounded-lg mt-6">
                <h3 className="font-bold text-gray-900 mb-2">Endereço de Entrega</h3>
                <p className="text-gray-700">
                  {order.delivery_address.street}, {order.delivery_address.number}
                  {order.delivery_address.complement && ` - ${order.delivery_address.complement}`}
                </p>
                <p className="text-gray-700">
                  {order.delivery_address.neighborhood} - {order.delivery_address.city}/{order.delivery_address.state}
                </p>
                {order.delivery_address.zipcode && (
                  <p className="text-gray-700">CEP: {order.delivery_address.zipcode}</p>
                )}
              </div>
            )}

            {/* Payment Method */}
            {order.payment_method && (
              <div className="mt-6">
                <h3 className="font-bold text-gray-900 mb-2">Forma de Pagamento</h3>
                <p className="text-gray-700">{order.payment_method}</p>
              </div>
            )}

            {/* Footer */}
            <div className="footer border-t border-gray-200 pt-6 mt-8 text-center text-sm text-gray-500">
              <p>Este documento é uma representação do pedido realizado.</p>
              {theme.pharmacistName && (
                <p className="mt-2">
                  Farmacêutico Responsável: {theme.pharmacistName}
                  {theme.pharmacistCrf && ` - CRF: ${theme.pharmacistCrf}`}
                </p>
              )}
              <p className="mt-2">
                Emitido em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
