import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Tag, 
  Plus, 
  TrendingUp,
  Edit,
  Trash2,
  Calendar,
  Percent,
  DollarSign,
  Package,
  Search,
  Filter,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { useAdminSidebar } from '@/contexts/AdminSidebarContext';
import { validatePromotionForm, parseMoney } from '@/utils/validation';

const promotionTypes = [
  { value: 'coupon', label: 'Cupom de Desconto', icon: Tag, description: 'Cupom com código para desconto' },
  { value: 'buy_x_pay_y', label: 'Leve X Pague Y', icon: Package, description: 'Compre X produtos, pague Y' },
  { value: 'flash', label: 'Promoção Relâmpago', icon: TrendingUp, description: 'Promoção com tempo limitado e estoque definido' },
  { value: 'buy_x_get_y_discount', label: 'Na Compra de X Ganha Y', icon: Percent, description: 'Desconto em % ou R$ ao comprar X' },
  { value: 'percentage', label: 'Desconto Percentual', icon: Percent, description: 'Desconto percentual simples' },
  { value: 'fixed', label: 'Desconto Fixo', icon: DollarSign, description: 'Desconto em valor fixo' },
  { value: 'free_shipping', label: 'Frete Grátis', icon: Package, description: 'Frete grátis' }
];

export default function AdminPromotions() {
  const queryClient = useQueryClient();
  const { sidebarOpen } = useAdminSidebar();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'percentage',
    value: '',
    code: '',
    min_purchase: '',
    max_discount: '',
    applicable_to: 'all', // all, category, product
    category: '',
    product_ids: [],
    start_date: '',
    end_date: '',
    usage_limit: '',
    active: true
  });

  const { data: promotions = [], isLoading, error: promotionsError } = useQuery({
    queryKey: ['adminPromotions'],
    queryFn: () => base44.entities.Promotion.list('-created_date', 100),
    onError: (error) => {
      console.error('Erro ao carregar promoções:', error);
      toast.error('Erro ao carregar promoções. Tente recarregar a página.');
    }
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.list('', 100)
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Promotion.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['adminPromotions']);
      queryClient.setQueryData(['adminPromotions'], (old) => [data, ...(old || [])]);
      toast.success('Promoção criada com sucesso! Já está disponível no site.');
      closeModal();
    },
    onError: (error) => {
      console.error('Erro ao criar promoção:', error);
      toast.error('Erro ao criar promoção: ' + (error.message || 'Tente novamente'));
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Promotion.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['adminPromotions']);
      queryClient.setQueryData(['adminPromotions'], (old) => 
        (old || []).map(p => p.id === data.id ? data : p)
      );
      toast.success('Promoção atualizada com sucesso! As alterações já estão em vigor.');
      closeModal();
    },
    onError: (error) => {
      console.error('Erro ao atualizar promoção:', error);
      toast.error('Erro ao atualizar promoção: ' + (error.message || 'Tente novamente'));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Promotion.delete(id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries(['adminPromotions']);
      queryClient.setQueryData(['adminPromotions'], (old) => 
        (old || []).filter(p => p.id !== deletedId)
      );
      toast.success('Promoção excluída com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao excluir promoção:', error);
      toast.error('Erro ao excluir promoção: ' + (error.message || 'Tente novamente'));
    }
  });

  const openModal = (promotion = null) => {
    if (promotion) {
      setEditingPromotion(promotion);
      setFormData({
        name: promotion.name || '',
        description: promotion.description || '',
        type: promotion.type || 'percentage',
        value: promotion.value || '',
        code: promotion.code || '',
        min_purchase: promotion.min_purchase || '',
        max_discount: promotion.max_discount || '',
        applicable_to: promotion.applicable_to || 'all',
        category: promotion.category || '',
        product_ids: promotion.product_ids || [],
        start_date: promotion.start_date ? format(new Date(promotion.start_date), 'yyyy-MM-dd') : '',
        end_date: promotion.end_date ? format(new Date(promotion.end_date), 'yyyy-MM-dd') : '',
        usage_limit: promotion.usage_limit || '',
        active: promotion.active !== false,
        buy_quantity: promotion.buy_quantity || '',
        pay_quantity: promotion.pay_quantity || '',
        flash_stock_limit: promotion.flash_stock_limit || '',
        flash_duration_hours: promotion.flash_duration_hours || '',
        purchase_quantity: promotion.purchase_quantity || '',
        discount_type: promotion.discount_type || 'percentage',
        discount_value: promotion.discount_value || ''
      });
    } else {
      setEditingPromotion(null);
      setFormData({
        name: '',
        description: '',
        type: 'coupon',
        value: '',
        code: '',
        buy_quantity: '',
        pay_quantity: '',
        flash_stock_limit: '',
        flash_duration_hours: '',
        purchase_quantity: '',
        discount_type: 'percentage',
        discount_value: '',
        min_purchase: '',
        max_discount: '',
        applicable_to: 'all',
        category: '',
        product_ids: [],
        start_date: '',
        end_date: '',
        usage_limit: '',
        active: true
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPromotion(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validação robusta
    const validation = validatePromotionForm(formData);
    if (!validation.valid) {
      Object.values(validation.errors).forEach(error => {
        toast.error(error);
      });
      return;
    }

    const data = {
      ...formData,
      value: parseMoney(formData.value),
      min_purchase: formData.min_purchase ? parseMoney(formData.min_purchase) : null,
      max_discount: formData.max_discount ? parseMoney(formData.max_discount) : null,
      usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      // Campos específicos para Leve X Pague Y
      buy_quantity: formData.type === 'buy_x_pay_y' ? parseInt(formData.value) : null,
      pay_quantity: formData.type === 'buy_x_pay_y' ? parseInt(formData.pay_quantity) : null,
      // Campos específicos para Promoção Relâmpago
      flash_stock_limit: formData.type === 'flash' ? parseInt(formData.flash_stock_limit) : null,
      flash_duration_hours: formData.type === 'flash' ? parseInt(formData.flash_duration_hours) : null,
      // Campos específicos para Na Compra de X Ganha Y
      purchase_quantity: formData.type === 'buy_x_get_y_discount' ? parseInt(formData.value) : null,
      discount_type: formData.type === 'buy_x_get_y_discount' ? formData.discount_type : null,
      discount_value: formData.type === 'buy_x_get_y_discount' ? parseMoney(formData.discount_value) : null
    };

    if (editingPromotion) {
      updateMutation.mutate({ id: editingPromotion.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getStatus = (promotion) => {
    const now = new Date();
    const start = promotion.start_date ? new Date(promotion.start_date) : null;
    const end = promotion.end_date ? new Date(promotion.end_date) : null;

    if (!promotion.active) return { label: 'Inativa', color: 'bg-gray-100 text-gray-800' };
    if (start && now < start) return { label: 'Agendada', color: 'bg-blue-100 text-blue-800' };
    if (end && now > end) return { label: 'Expirada', color: 'bg-red-100 text-red-800' };
    return { label: 'Ativa', color: 'bg-green-100 text-green-800' };
  };

  const filteredPromotions = promotions.filter(promo => {
    const matchesSearch = 
      promo.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      promo.code?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const status = getStatus(promo);
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'active' && status.label === 'Ativa') ||
      (statusFilter === 'inactive' && status.label === 'Inativa') ||
      (statusFilter === 'expired' && status.label === 'Expirada');
    
    return matchesSearch && matchesStatus;
  });

  const getPromotionValue = (promotion) => {
    switch (promotion.type) {
      case 'percentage':
        return `${promotion.value}%`;
      case 'fixed':
        return `R$ ${parseFloat(promotion.value).toFixed(2)}`;
      case 'free_shipping':
        return 'Frete Grátis';
      case 'buy_x_get_y':
        return `Leve ${promotion.value} Pague ${promotion.buy_y || promotion.value - 1}`;
      default:
        return promotion.value;
    }
  };

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
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Promoções</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">{promotions.length} promoções cadastradas</p>
            </div>
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
              onClick={() => openModal()}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Promoção
            </Button>
          </div>
        </motion.header>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="p-4 sm:p-6 space-y-6"
        >
        {/* Filters */}
        <Card className="bg-white/60 backdrop-blur-sm border-gray-200/50">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nome ou código..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativas</SelectItem>
                  <SelectItem value="inactive">Inativas</SelectItem>
                  <SelectItem value="expired">Expiradas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Promotions List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Carregando promoções...</p>
          </div>
        ) : filteredPromotions.length === 0 ? (
          <Card className="bg-white/60 backdrop-blur-sm border-gray-200/50">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-orange-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <Tag className="w-10 h-10 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Nenhuma promoção encontrada</h2>
              <p className="text-gray-500 mb-6">
                {searchQuery ? 'Tente buscar com outros termos' : 'Crie sua primeira promoção para começar'}
              </p>
              {!searchQuery && (
                <Button 
                  className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                  onClick={() => openModal()}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeira Promoção
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPromotions.map((promotion) => {
              const status = getStatus(promotion);
              const typeInfo = promotionTypes.find(t => t.value === promotion.type);
              const TypeIcon = typeInfo?.icon || Tag;
              
              return (
                <Card key={promotion.id} className="bg-white/60 backdrop-blur-sm border-gray-200/50 hover:shadow-lg transition-all">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">{promotion.name}</CardTitle>
                        <Badge className={status.color}>{status.label}</Badge>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-100 to-orange-100 flex items-center justify-center">
                        <TypeIcon className="w-6 h-6 text-red-600" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {promotion.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{promotion.description}</p>
                    )}
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Desconto:</span>
                        <span className="font-bold text-emerald-600">{getPromotionValue(promotion)}</span>
                      </div>
                      {promotion.code && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Código:</span>
                          <Badge variant="outline" className="font-mono">{promotion.code}</Badge>
                        </div>
                      )}
                      {promotion.start_date && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(promotion.start_date), 'dd/MM/yyyy', { locale: ptBR })} - {promotion.end_date ? format(new Date(promotion.end_date), 'dd/MM/yyyy', { locale: ptBR }) : 'Sem fim'}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => openModal(promotion)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => {
                          if (confirm('Tem certeza que deseja excluir esta promoção?')) {
                            deleteMutation.mutate(promotion.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        </motion.div>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={closeModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPromotion ? 'Editar Promoção' : 'Nova Promoção'}
            </DialogTitle>
            <DialogDescription>
              Configure os detalhes da promoção
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nome da Promoção *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Desconto de Verão"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva a promoção"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Tipo de Promoção *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {promotionTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="value">
                    {formData.type === 'coupon' ? 'Desconto (%) ou R$' : 
                     formData.type === 'buy_x_pay_y' ? 'Quantidade a Comprar (X)' :
                     formData.type === 'flash' ? 'Desconto (%)' :
                     formData.type === 'buy_x_get_y_discount' ? 'Quantidade (X)' :
                     'Valor'} *
                  </Label>
                  <Input
                    id="value"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder={formData.type === 'percentage' || formData.type === 'coupon' ? 'Ex: 10' : 'Ex: 50.00'}
                    required
                  />
                </div>
              </div>

              {/* Campos específicos para Cupom */}
              {formData.type === 'coupon' && (
                <div>
                  <Label htmlFor="code">Código do Cupom *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="Ex: VERAO2024"
                    required
                  />
                </div>
              )}

              {/* Campos específicos para Leve X Pague Y */}
              {formData.type === 'buy_x_pay_y' && (
                <div>
                  <Label htmlFor="pay_quantity">Quantidade a Pagar (Y) *</Label>
                  <Input
                    id="pay_quantity"
                    type="number"
                    min="1"
                    value={formData.pay_quantity}
                    onChange={(e) => setFormData({ ...formData, pay_quantity: e.target.value })}
                    placeholder="Ex: 2"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Exemplo: Leve {formData.value || '3'} Pague {formData.pay_quantity || '2'}
                  </p>
                </div>
              )}

              {/* Campos específicos para Promoção Relâmpago */}
              {formData.type === 'flash' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="flash_stock_limit">Limite de Estoque *</Label>
                    <Input
                      id="flash_stock_limit"
                      type="number"
                      min="1"
                      value={formData.flash_stock_limit}
                      onChange={(e) => setFormData({ ...formData, flash_stock_limit: e.target.value })}
                      placeholder="Ex: 50"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="flash_duration_hours">Duração (horas) *</Label>
                    <Input
                      id="flash_duration_hours"
                      type="number"
                      min="1"
                      value={formData.flash_duration_hours}
                      onChange={(e) => setFormData({ ...formData, flash_duration_hours: e.target.value })}
                      placeholder="Ex: 24"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Campos específicos para Na Compra de X Ganha Y */}
              {formData.type === 'buy_x_get_y_discount' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="discount_type">Tipo de Desconto *</Label>
                      <Select
                        value={formData.discount_type}
                        onValueChange={(value) => setFormData({ ...formData, discount_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentual (%)</SelectItem>
                          <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="discount_value">Valor do Desconto (Y) *</Label>
                      <Input
                        id="discount_value"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.discount_value}
                        onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                        placeholder={formData.discount_type === 'percentage' ? 'Ex: 15' : 'Ex: 20.00'}
                        required
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Exemplo: Na compra de {formData.value || 'X'} ganhe {formData.discount_value || 'Y'} 
                    {formData.discount_type === 'percentage' ? '%' : ' R$'} de desconto
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="code">Código do Cupom (opcional)</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="Ex: VERAO2024"
                  />
                </div>

                <div>
                  <Label htmlFor="min_purchase">Compra Mínima (R$)</Label>
                  <Input
                    id="min_purchase"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.min_purchase}
                    onChange={(e) => setFormData({ ...formData, min_purchase: e.target.value })}
                    placeholder="Ex: 100.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Data de Início</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="end_date">Data de Fim</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="usage_limit">Limite de Uso (opcional)</Label>
                <Input
                  id="usage_limit"
                  type="number"
                  min="1"
                  value={formData.usage_limit}
                  onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                  placeholder="Ex: 100"
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <Label htmlFor="active">Promoção ativa</Label>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                {editingPromotion ? 'Salvar Alterações' : 'Criar Promoção'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      </motion.main>
    </div>
  );
}
