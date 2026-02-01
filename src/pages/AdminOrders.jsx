import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Search,
  Filter,
  Eye,
  Phone,
  MapPin,
  Package,
  Truck,
  Check,
  X,
  Clock,
  Download,
  RefreshCw,
  MessageCircle,
  User,
  Calendar,
  DollarSign,
  FileText,
  AlertCircle
} from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { useAdminSidebar } from '@/contexts/AdminSidebarContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { canChangeOrderStatus } from '@/utils/validation';
import { formatWhatsAppNumber, createWhatsAppUrl } from '@/utils/whatsapp';
import { formatStatusUpdate, sendWhatsAppMessage } from '@/utils/whatsappMessages';
import OrderInvoice from '@/components/admin/OrderInvoice';

const statusConfig = {
  pending: { 
    label: 'Pendente', 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    icon: Clock,
    description: 'Aguardando confirmação'
  },
  confirmed: { 
    label: 'Confirmado', 
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: Check,
    description: 'Pedido confirmado e aceito'
  },
  preparing: { 
    label: 'Em Separação', 
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    icon: Package,
    description: 'Produtos sendo separados'
  },
  out_for_delivery: { 
    label: 'Saiu para Entrega', 
    color: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    icon: Truck,
    description: 'A caminho do endereço'
  },
  delivered: { 
    label: 'Entregue', 
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: Check,
    description: 'Pedido entregue com sucesso'
  },
  cancelled: { 
    label: 'Cancelado', 
    color: 'bg-red-100 text-red-800 border-red-300',
    icon: X,
    description: 'Pedido cancelado'
  }
};

const statusFlow = [
  { id: 'pending', label: 'Pendente', step: 1 },
  { id: 'confirmed', label: 'Confirmado', step: 2 },
  { id: 'preparing', label: 'Em Separação', step: 3 },
  { id: 'out_for_delivery', label: 'Saiu para Entrega', step: 4 },
  { id: 'delivered', label: 'Entregue', step: 5 }
];

export default function AdminOrders() {
  const queryClient = useQueryClient();
  const { sidebarOpen } = useAdminSidebar();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [invoiceOrder, setInvoiceOrder] = useState(null);

  // Auto-refresh a cada 30 segundos
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      queryClient.invalidateQueries(['adminOrders']);
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, queryClient]);

  const { data: orders = [], isLoading, error: ordersError } = useQuery({
    queryKey: ['adminOrders'],
    queryFn: () => base44.entities.Order.list('-created_date', 200),
    refetchInterval: autoRefresh ? 30000 : false,
    onError: (error) => {
      console.error('Erro ao carregar pedidos:', error);
      toast.error('Erro ao carregar pedidos. Tente recarregar a página.');
    }
  });

  // Buscar configurações para verificar order_mode
  const { data: settings } = useQuery({
    queryKey: ['pharmacySettings'],
    queryFn: async () => {
      const data = await base44.entities.PharmacySettings.list('', 1);
      return data && data.length > 0 ? data[0] : null;
    }
  });

  const orderMode = settings?.order_mode || 'app';

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Order.update(id, data),
    onSuccess: (updatedOrder) => {
      // Invalidar todas as queries relacionadas a pedidos para atualizar em tempo real
      queryClient.invalidateQueries(['adminOrders']);
      queryClient.invalidateQueries(['userOrders']); // Para CustomerArea
      queryClient.invalidateQueries(['trackOrder']); // Para TrackOrder
      
      // Atualizar cache local
      queryClient.setQueryData(['adminOrders'], (old) =>
        (old || []).map(o => o.id === updatedOrder.id ? updatedOrder : o)
      );
      
      const statusInfo = statusConfig[updatedOrder.status];
      
      // Se modo for WhatsApp e status mudou (não é pending), enviar notificação automática
      if (orderMode === 'whatsapp' && updatedOrder.customer_phone && updatedOrder.status !== 'pending') {
        const statusMessage = formatStatusUpdate(
          updatedOrder, 
          updatedOrder.status, 
          settings?.pharmacy_name || 'Farmácia'
        );
        
        if (statusMessage) {
          const customerPhone = formatWhatsAppNumber(updatedOrder.customer_phone);
          if (customerPhone) {
            const url = sendWhatsAppMessage(customerPhone, statusMessage);
            if (url) {
              // Abrir WhatsApp automaticamente para enviar mensagem
              setTimeout(() => {
                window.open(url, '_blank');
              }, 500);
              toast.success(`Pedido atualizado! Abrindo WhatsApp para enviar notificação ao cliente.`);
            } else {
              toast.success(`Pedido atualizado para "${statusInfo?.label || updatedOrder.status}"!`);
            }
          } else {
            toast.success(`Pedido atualizado para "${statusInfo?.label || updatedOrder.status}"!`);
          }
        } else {
          toast.success(`Pedido atualizado para "${statusInfo?.label || updatedOrder.status}"!`);
        }
      } else {
        toast.success(`Pedido atualizado para "${statusInfo?.label || updatedOrder.status}"!`);
      }
      
      setSelectedOrder(null);
    },
    onError: (error) => {
      console.error('Erro ao atualizar pedido:', error);
      toast.error('Erro ao atualizar pedido: ' + (error.message || 'Tente novamente'));
    }
  });

  const getStatusInfo = (status) => {
    return statusConfig[status] || statusConfig.pending;
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_phone?.includes(searchQuery) ||
      order.customer_email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = (order, newStatus) => {
    if (!canChangeOrderStatus(order.status, newStatus)) {
      const currentInfo = getStatusInfo(order.status);
      const newInfo = getStatusInfo(newStatus);
      toast.error(`Não é possível mudar de "${currentInfo.label}" para "${newInfo.label}".`);
      return;
    }
    
    updateMutation.mutate({ 
      id: order.id, 
      data: { 
        status: newStatus,
        updated_at: new Date().toISOString()
      } 
    });
  };

  const handleWhatsApp = (order) => {
    const message = `Olá ${order.customer_name || 'Cliente'}! Gostaria de informações sobre o pedido #${order.order_number || order.id.slice(-6)}.`;
    const whatsappNumber = formatWhatsAppNumber(order.customer_phone || settings?.whatsapp);
    if (whatsappNumber) {
      const url = createWhatsAppUrl(whatsappNumber, message);
      if (url) window.open(url, '_blank');
    } else {
      toast.error('Número de WhatsApp não disponível.');
    }
  };

  const getStatusTimeline = (order) => {
    const currentStatusIndex = statusFlow.findIndex(s => s.id === order.status);
    return statusFlow.map((status, index) => {
      const isCompleted = index <= currentStatusIndex;
      const isCurrent = index === currentStatusIndex;
      const statusInfo = statusConfig[status.id];
      const Icon = statusInfo.icon;
      
      return {
        ...status,
        ...statusInfo,
        isCompleted,
        isCurrent,
        Icon
      };
    });
  };

  // Estatísticas
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    out_for_delivery: orders.filter(o => o.status === 'out_for_delivery').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
    totalRevenue: orders
      .filter(o => o.status === 'delivered')
      .reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0)
  };

  if (isLoading && orders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando pedidos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <AdminSidebar />
      
      <motion.main 
        initial={false}
        animate={{ 
          marginLeft: sidebarOpen ? '16rem' : '5rem'
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="flex-1"
      >
        <motion.header 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white border-b px-4 sm:px-6 py-4 sticky top-0 z-40 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Gestão de Pedidos</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">Gerencie todos os pedidos em tempo real</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={autoRefresh ? 'bg-emerald-50 border-emerald-200' : ''}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
                {autoRefresh ? 'Auto-atualização ON' : 'Auto-atualização OFF'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => queryClient.invalidateQueries(['adminOrders'])}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </div>
        </motion.header>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="p-4 sm:p-6"
        >
        {/* Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-gray-50 to-gray-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-yellow-700 mb-1">Pendentes</p>
                  <p className="text-2xl font-bold text-yellow-800">{stats.pending}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-700 mb-1">Confirmados</p>
                  <p className="text-2xl font-bold text-blue-800">{stats.confirmed}</p>
                </div>
                <Check className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-700 mb-1">Em Separação</p>
                  <p className="text-2xl font-bold text-purple-800">{stats.preparing}</p>
                </div>
                <Package className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-cyan-700 mb-1">Em Entrega</p>
                  <p className="text-2xl font-bold text-cyan-800">{stats.out_for_delivery}</p>
                </div>
                <Truck className="w-8 h-8 text-cyan-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-700 mb-1">Entregues</p>
                  <p className="text-2xl font-bold text-green-800">{stats.delivered}</p>
                </div>
                <Check className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-emerald-700 mb-1">Receita Total</p>
                  <p className="text-2xl font-bold text-emerald-800">
                    R$ {stats.totalRevenue.toFixed(2)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-emerald-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nome, número do pedido, telefone ou email..."
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {Object.entries(statusConfig).map(([value, config]) => (
                    <SelectItem key={value} value={value}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Pedidos */}
        <Card>
          <CardHeader>
            <CardTitle>Pedidos ({filteredOrders.length})</CardTitle>
            <CardDescription>
              {filteredOrders.length === 0 
                ? 'Nenhum pedido encontrado' 
                : `${filteredOrders.length} pedido(s) encontrado(s)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum pedido encontrado com os filtros aplicados.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => {
                      const statusInfo = getStatusInfo(order.status);
                      const Icon = statusInfo.icon;
                      
                      return (
                        <TableRow key={order.id} className="hover:bg-gray-50">
                          <TableCell>
                            <div className="font-semibold text-gray-900">
                              #{order.order_number || order.id.slice(-6)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium text-gray-900">
                                {order.customer_name || 'Cliente'}
                              </div>
                              {order.customer_phone && (
                                <div className="text-sm text-gray-500">
                                  {formatPhoneNumber(order.customer_phone)}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-gray-600">
                              {order.created_date 
                                ? format(new Date(order.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                                : '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold text-emerald-600">
                              R$ {parseFloat(order.total || 0).toFixed(2)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={order.status}
                              onValueChange={(value) => handleStatusChange(order, value)}
                            >
                              <SelectTrigger className="w-40 border-0">
                                <Badge className={`${statusInfo.color} border px-3 py-1 flex items-center gap-2`}>
                                  <Icon className="w-3 h-3" />
                                  {statusInfo.label}
                                </Badge>
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(statusConfig).map(([value, config]) => {
                                  const ConfigIcon = config.icon;
                                  const canChange = canChangeOrderStatus(order.status, value);
                                  
                                  return (
                                    <SelectItem 
                                      key={value} 
                                      value={value}
                                      disabled={!canChange}
                                    >
                                      <div className="flex items-center gap-2">
                                        <ConfigIcon className="w-4 h-4" />
                                        <span>{config.label}</span>
                                        {!canChange && (
                                          <span className="text-xs text-gray-400 ml-2">(inválido)</span>
                                        )}
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSelectedOrder(order)}
                                title="Ver detalhes"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setInvoiceOrder(order)}
                                title="Imprimir comanda"
                              >
                                <FileText className="w-4 h-4 text-blue-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleWhatsApp(order)}
                                title="Enviar WhatsApp"
                              >
                                <MessageCircle className="w-4 h-4 text-green-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Modal de Detalhes */}
      {selectedOrder && (
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Pedido #{selectedOrder.order_number || selectedOrder.id.slice(-6)}</span>
                <Badge className={getStatusInfo(selectedOrder.status).color}>
                  {getStatusInfo(selectedOrder.status).label}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                Criado em {selectedOrder.created_date 
                  ? format(new Date(selectedOrder.created_date), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })
                  : '-'}
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="details" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Detalhes</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="items">Itens</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Cliente
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <p className="text-sm text-gray-500">Nome</p>
                        <p className="font-medium">{selectedOrder.customer_name || 'Não informado'}</p>
                      </div>
                      {selectedOrder.customer_phone && (
                        <div>
                          <p className="text-sm text-gray-500">Telefone</p>
                          <p className="font-medium">{formatPhoneNumber(selectedOrder.customer_phone)}</p>
                        </div>
                      )}
                      {selectedOrder.customer_email && (
                        <div>
                          <p className="text-sm text-gray-500">Email</p>
                          <p className="font-medium">{selectedOrder.customer_email}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {selectedOrder.delivery_address && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <MapPin className="w-5 h-5" />
                          Endereço de Entrega
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600">
                          {selectedOrder.delivery_address.street}, {selectedOrder.delivery_address.number}
                          {selectedOrder.delivery_address.complement && ` - ${selectedOrder.delivery_address.complement}`}
                          <br />
                          {selectedOrder.delivery_address.neighborhood} - {selectedOrder.delivery_address.city}/{selectedOrder.delivery_address.state}
                          <br />
                          CEP: {selectedOrder.delivery_address.zipcode}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <DollarSign className="w-5 h-5" />
                        Valores
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium">R$ {parseFloat(selectedOrder.subtotal || 0).toFixed(2)}</span>
                      </div>
                      {selectedOrder.delivery_fee > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Frete:</span>
                          <span className="font-medium">R$ {parseFloat(selectedOrder.delivery_fee || 0).toFixed(2)}</span>
                        </div>
                      )}
                      {selectedOrder.discount > 0 && (
                        <div className="flex justify-between text-red-600">
                          <span>Desconto:</span>
                          <span className="font-medium">-R$ {parseFloat(selectedOrder.discount || 0).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t font-bold text-lg">
                        <span>Total:</span>
                        <span className="text-emerald-600">R$ {parseFloat(selectedOrder.total || 0).toFixed(2)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {selectedOrder.payment_method && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <FileText className="w-5 h-5" />
                          Pagamento
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="font-medium">{selectedOrder.payment_method}</p>
                        {selectedOrder.payment_status && (
                          <Badge className="mt-2">
                            {selectedOrder.payment_status}
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => handleWhatsApp(selectedOrder)}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Contatar no WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const phone = selectedOrder.customer_phone || settings?.phone;
                      if (phone) {
                        const cleaned = phone.replace(/\D/g, '');
                        window.open(`tel:+${cleaned.startsWith('55') ? cleaned : '55' + cleaned}`);
                      }
                    }}
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Ligar
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="timeline" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Status do Pedido</CardTitle>
                    <CardDescription>Acompanhe a jornada do pedido</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
                      {getStatusTimeline(selectedOrder).map((step, index) => (
                        <div key={step.id} className="relative flex items-start gap-4 pb-8 last:pb-0">
                          <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center ${
                            step.isCompleted 
                              ? step.isCurrent
                                ? 'bg-emerald-500 text-white ring-4 ring-emerald-100'
                                : 'bg-emerald-500 text-white'
                              : 'bg-gray-200 text-gray-400'
                          }`}>
                            <step.Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 pt-3">
                            <p className={`font-medium ${step.isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                              {step.label}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">{step.description}</p>
                            {step.isCurrent && (
                              <Badge className="mt-2 bg-emerald-100 text-emerald-800">
                                Status Atual
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-3">
                  {statusFlow.map((status) => {
                    const canChange = canChangeOrderStatus(selectedOrder.status, status.id);
                    if (!canChange) return null;
                    
                    const statusInfo = getStatusInfo(status.id);
                    return (
                      <Button
                        key={status.id}
                        variant="outline"
                        onClick={() => handleStatusChange(selectedOrder, status.id)}
                        className="flex-1"
                      >
                        {statusInfo.label}
                      </Button>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="items" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Itens do Pedido</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedOrder.items && selectedOrder.items.length > 0 ? (
                      <div className="space-y-4">
                        {selectedOrder.items.map((item, index) => (
                          <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                            {item.image_url && (
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="w-16 h-16 object-contain rounded"
                              />
                            )}
                            <div className="flex-1">
                              <p className="font-medium">{item.name}</p>
                              {item.dosage && (
                                <p className="text-sm text-gray-500">{item.dosage}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-500">Qtd: {item.quantity}</p>
                              <p className="font-semibold text-emerald-600">
                                R$ {parseFloat(item.price || 0).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">Nenhum item encontrado</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de Comanda/Nota Fiscal */}
      {invoiceOrder && (
        <OrderInvoice 
          order={invoiceOrder} 
          onClose={() => setInvoiceOrder(null)}
          mode="admin"
        />
      )}
      </motion.main>
    </div>
  );
}
