import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  User,
  Package,
  Heart,
  MapPin,
  Clock,
  Settings,
  LogOut,
  ChevronRight,
  Repeat,
  Bell,
  ShoppingBag,
  Upload,
  X
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { applyPhoneMask, formatPhoneNumber, unformatPhone } from '@/utils/phoneFormat';
import { isValidEmail } from '@/utils/validation';

export default function CustomerArea() {
  const [activeTab, setActiveTab] = useState('overview');
  const queryClient = useQueryClient();
  
  // Estados para configurações
  const [profileData, setProfileData] = useState({
    full_name: '',
    email: '',
    phone: '',
    birth_date: '',
    avatar_url: ''
  });
  
  const [notificationSettings, setNotificationSettings] = useState({
    orderNotifications: true,
    promotionNotifications: true,
    browserNotifications: Notification.permission === 'granted'
  });

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const me = await base44.auth.me();
      return me;
    }
  });

  // Carregar dados salvos do localStorage
  useEffect(() => {
    const savedProfile = localStorage.getItem('userProfile');
    const savedNotifications = localStorage.getItem('notificationSettings');
    
    if (savedProfile) {
      try {
        const profile = JSON.parse(savedProfile);
        setProfileData({
          full_name: profile.full_name || '',
          email: profile.email || '',
          phone: profile.phone ? formatPhoneNumber(profile.phone) : '',
          birth_date: profile.birth_date || '',
          avatar_url: profile.avatar_url || ''
        });
      } catch (e) {
        console.error('Erro ao carregar perfil salvo:', e);
      }
    }
    
    if (savedNotifications) {
      try {
        setNotificationSettings(JSON.parse(savedNotifications));
      } catch (e) {
        console.error('Erro ao carregar configurações de notificação:', e);
      }
    }
  }, []);

  // Atualizar profileData quando user carregar (se não houver dados salvos)
  useEffect(() => {
    if (user && !localStorage.getItem('userProfile')) {
      setProfileData({
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone ? formatPhoneNumber(user.phone) : '',
        birth_date: user.birth_date || '',
        avatar_url: user.avatar_url || ''
      });
    }
  }, [user]);

  // Mutation para atualizar perfil
  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      // Atualizar no base44 (se tiver endpoint para atualizar usuário)
      // Por enquanto, vamos salvar no localStorage e tentar atualizar via API
      try {
        // Tentar atualizar via API se disponível
        if (user?.id) {
          const updateData = {
            ...data,
            phone: unformatPhone(data.phone) // Salvar sem formatação
          };
          // Se houver endpoint para atualizar usuário
          // await base44.entities.User.update(user.id, updateData);
        }
        
        // Salvar no localStorage como backup
        const userData = {
          ...user,
          ...data,
          phone: unformatPhone(data.phone)
        };
        localStorage.setItem('userProfile', JSON.stringify(userData));
        
        return userData;
      } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['currentUser'], data);
      toast.success('Perfil atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao atualizar perfil:', error);
      toast.error('Erro ao atualizar perfil. Tente novamente.');
    }
  });

  // Mutation para atualizar foto
  const updateAvatarMutation = useMutation({
    mutationFn: async (file) => {
      // Aqui você pode fazer upload da imagem para um serviço de storage
      // Por enquanto, vamos converter para base64 e salvar
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result;
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    },
    onSuccess: (avatarUrl) => {
      setProfileData(prev => ({ ...prev, avatar_url: avatarUrl }));
      const userData = { ...user, avatar_url: avatarUrl };
      localStorage.setItem('userProfile', JSON.stringify(userData));
      queryClient.setQueryData(['currentUser'], userData);
      toast.success('Foto atualizada com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao atualizar foto. Tente novamente.');
    }
  });

  const { data: orders = [], dataUpdatedAt } = useQuery({
    queryKey: ['userOrders'],
    queryFn: async () => {
      if (!user?.email) return [];
      const result = await base44.entities.Order.filter(
        { customer_email: user.email },
        '-created_date',
        10
      );
      return result;
    },
    enabled: !!user?.email,
    refetchInterval: 10000, // Atualizar a cada 10 segundos
    refetchIntervalInBackground: true // Continuar atualizando mesmo quando a aba não está ativa
  });

  // Detectar mudanças de status e notificar
  const [previousOrders, setPreviousOrders] = React.useState([]);
  
  React.useEffect(() => {
    if (orders.length === 0 || previousOrders.length === 0) {
      setPreviousOrders(orders);
      return;
    }

    // Comparar status anterior com atual
    orders.forEach(currentOrder => {
      const previousOrder = previousOrders.find(p => p.id === currentOrder.id);
      if (previousOrder && previousOrder.status !== currentOrder.status) {
        // Status mudou! Notificar o cliente
        const statusLabels = {
          pending: 'Pendente',
          confirmed: 'Confirmado',
          preparing: 'Em Separação',
          out_for_delivery: 'Saiu para Entrega',
          delivered: 'Entregue',
          cancelled: 'Cancelado'
        };

        const statusMessages = {
          confirmed: '🎉 Seu pedido foi confirmado!',
          preparing: '📦 Seu pedido está sendo preparado!',
          out_for_delivery: '🚚 Seu pedido saiu para entrega!',
          delivered: '✅ Seu pedido foi entregue!',
          cancelled: '❌ Seu pedido foi cancelado.'
        };

        const message = statusMessages[currentOrder.status] || 
          `Status do pedido #${currentOrder.order_number || currentOrder.id.slice(-6)} mudou para: ${statusLabels[currentOrder.status]}`;

        // Toast notification
        if (currentOrder.status === 'delivered') {
          toast.success(message, {
            duration: 8000,
            description: `Pedido #${currentOrder.order_number || currentOrder.id.slice(-6)}`
          });
        } else if (currentOrder.status === 'cancelled') {
          toast.error(message, {
            duration: 8000,
            description: `Pedido #${currentOrder.order_number || currentOrder.id.slice(-6)}`
          });
        } else {
          toast.info(message, {
            duration: 6000,
            description: `Pedido #${currentOrder.order_number || currentOrder.id.slice(-6)}`
          });
        }

        // Browser notification (se permitido)
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`Pedido #${currentOrder.order_number || currentOrder.id.slice(-6)}`, {
            body: message,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: `order-${currentOrder.id}`,
            requireInteraction: currentOrder.status === 'delivered' || currentOrder.status === 'cancelled'
          });
        }
      }
    });

    setPreviousOrders(orders);
  }, [orders, previousOrders]);

  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('pharmacyFavorites');
    if (saved) setFavorites(JSON.parse(saved));

    // Solicitar permissão para notificações do navegador
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          console.log('Permissão de notificação concedida');
        }
      });
    }
  }, []);

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      preparing: 'bg-purple-100 text-purple-800',
      out_for_delivery: 'bg-cyan-100 text-cyan-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pendente',
      confirmed: 'Confirmado',
      preparing: 'Preparando',
      out_for_delivery: 'Em entrega',
      delivered: 'Entregue',
      cancelled: 'Cancelado'
    };
    return labels[status] || status;
  };

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <Card className="sticky top-48">
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <Avatar className="w-20 h-20 mx-auto mb-4">
                    <AvatarFallback className="bg-emerald-100 text-emerald-600 text-2xl">
                      {user?.full_name?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="font-bold text-lg text-gray-900">
                    {user?.full_name || 'Visitante'}
                  </h2>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                </div>

                <nav className="space-y-1">
                  {[
                    { id: 'overview', icon: User, label: 'Visão Geral' },
                    { id: 'orders', icon: Package, label: 'Meus Pedidos' },
                    { id: 'favorites', icon: Heart, label: 'Favoritos' },
                    { id: 'addresses', icon: MapPin, label: 'Endereços' },
                    { id: 'recurring', icon: Repeat, label: 'Medicamentos Recorrentes' },
                    { id: 'settings', icon: Settings, label: 'Configurações' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                        activeTab === item.id
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  ))}
                </nav>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-colors mt-4"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Sair</span>
                </button>
              </CardContent>
            </Card>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-3">
            {/* Overview */}
            {activeTab === 'overview' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <h1 className="text-2xl font-bold text-gray-900">Olá, {user?.full_name?.split(' ')[0] || 'Visitante'}!</h1>

                <div className="grid sm:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <Package className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
                          <p className="text-sm text-gray-500">Pedidos</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                          <Heart className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-gray-900">{favorites.length}</p>
                          <p className="text-sm text-gray-500">Favoritos</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                          <Repeat className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-gray-900">0</p>
                          <p className="text-sm text-gray-500">Recorrentes</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Orders */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Pedidos Recentes</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab('orders')}>
                      Ver todos
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {orders.length > 0 ? (
                      <div className="space-y-4">
                        {orders.slice(0, 3).map((order) => (
                          <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border">
                                <ShoppingBag className="w-6 h-6 text-gray-400" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">
                                  Pedido #{order.order_number || order.id.slice(-6)}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {new Date(order.created_date).toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge className={getStatusColor(order.status)}>
                                {getStatusLabel(order.status)}
                              </Badge>
                              <p className="font-bold text-gray-900 mt-1">
                                R$ {order.total?.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">Você ainda não fez nenhum pedido</p>
                        <Link to={createPageUrl('Home')}>
                          <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700">
                            Começar a comprar
                          </Button>
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Ações Rápidas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Link to={createPageUrl('UploadPrescription')}>
                        <div className="p-4 border rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-colors cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                              📋
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">Enviar Receita</p>
                              <p className="text-sm text-gray-500">Faça upload da sua receita</p>
                            </div>
                          </div>
                        </div>
                      </Link>
                      <Link to={createPageUrl('TrackOrder')}>
                        <div className="p-4 border rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-colors cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              📦
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">Rastrear Pedido</p>
                              <p className="text-sm text-gray-500">Acompanhe sua entrega</p>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Orders */}
            {activeTab === 'orders' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Meus Pedidos</h1>
                
                {orders.length > 0 ? (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <Card key={order.id}>
                        <CardContent className="p-6">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-3 mb-2">
                                <p className="font-bold text-gray-900">
                                  Pedido #{order.order_number || order.id.slice(-6)}
                                </p>
                                <Badge className={getStatusColor(order.status)}>
                                  {getStatusLabel(order.status)}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-500">
                                Realizado em {new Date(order.created_date).toLocaleDateString('pt-BR')}
                              </p>
                              {order.items && (
                                <p className="text-sm text-gray-500 mt-1">
                                  {order.items.length} {order.items.length === 1 ? 'item' : 'itens'}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-emerald-600">
                                R$ {order.total?.toFixed(2)}
                              </p>
                              <Button variant="outline" size="sm" className="mt-2">
                                Ver detalhes
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Nenhum pedido encontrado
                      </h3>
                      <p className="text-gray-500 mb-6">
                        Você ainda não realizou nenhuma compra
                      </p>
                      <Link to={createPageUrl('Home')}>
                        <Button className="bg-emerald-600 hover:bg-emerald-700">
                          Começar a comprar
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            )}

            {/* Favorites */}
            {activeTab === 'favorites' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Meus Favoritos</h1>
                
                {favorites.length > 0 ? (
                  <p className="text-gray-500">Você tem {favorites.length} produtos favoritos</p>
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Nenhum favorito ainda
                      </h3>
                      <p className="text-gray-500 mb-6">
                        Adicione produtos aos favoritos para encontrá-los facilmente
                      </p>
                      <Link to={createPageUrl('Home')}>
                        <Button className="bg-emerald-600 hover:bg-emerald-700">
                          Explorar produtos
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            )}

            {/* Addresses */}
            {activeTab === 'addresses' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Meus Endereços</h1>
                <Card>
                  <CardContent className="p-12 text-center">
                    <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Em breve
                    </h3>
                    <p className="text-gray-500">
                      Esta funcionalidade estará disponível em breve
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Recurring */}
            {activeTab === 'recurring' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Medicamentos Recorrentes</h1>
                <Card>
                  <CardContent className="p-12 text-center">
                    <Repeat className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Em breve
                    </h3>
                    <p className="text-gray-500">
                      Esta funcionalidade estará disponível em breve
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Settings */}
            {activeTab === 'settings' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>

                {/* Profile Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle>Informações Pessoais</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-20 h-20">
                        {profileData.avatar_url ? (
                          <AvatarImage src={profileData.avatar_url} alt={profileData.full_name} />
                        ) : null}
                        <AvatarFallback className="bg-emerald-100 text-emerald-600 text-2xl">
                          {profileData.full_name?.[0] || user?.full_name?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{profileData.full_name || user?.full_name || 'Visitante'}</p>
                        <p className="text-sm text-gray-500">{profileData.email || user?.email}</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label htmlFor="avatar-upload" className="cursor-pointer">
                          <Button variant="outline" asChild>
                            <span>
                              <Upload className="w-4 h-4 mr-2" />
                              Alterar Foto
                            </span>
                          </Button>
                        </label>
                        <input
                          id="avatar-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 5 * 1024 * 1024) {
                                toast.error('Imagem muito grande. Máximo 5MB');
                                return;
                              }
                              updateAvatarMutation.mutate(file);
                            }
                          }}
                        />
                        {profileData.avatar_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setProfileData(prev => ({ ...prev, avatar_url: '' }));
                              const userData = { ...user, avatar_url: '' };
                              localStorage.setItem('userProfile', JSON.stringify(userData));
                              queryClient.setQueryData(['currentUser'], userData);
                              toast.success('Foto removida');
                            }}
                          >
                            <X className="w-4 h-4 mr-2" />
                            Remover
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Nome Completo</label>
                        <Input
                          type="text"
                          value={profileData.full_name}
                          onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                          className="w-full"
                          placeholder="Seu nome completo"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">E-mail</label>
                        <Input
                          type="email"
                          value={profileData.email}
                          onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full"
                          placeholder="seu@email.com"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Telefone</label>
                        <Input
                          type="tel"
                          value={profileData.phone}
                          onChange={(e) => {
                            const formatted = applyPhoneMask(e.target.value);
                            setProfileData(prev => ({ ...prev, phone: formatted }));
                          }}
                          className="w-full"
                          placeholder="(00) 00000-0000"
                          maxLength={15}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Data de Nascimento</label>
                        <Input
                          type="date"
                          value={profileData.birth_date}
                          onChange={(e) => setProfileData(prev => ({ ...prev, birth_date: e.target.value }))}
                          className="w-full"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end pt-4 border-t">
                      <Button 
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => {
                          // Validações
                          if (!profileData.full_name.trim()) {
                            toast.error('Nome completo é obrigatório');
                            return;
                          }
                          if (!profileData.email.trim()) {
                            toast.error('E-mail é obrigatório');
                            return;
                          }
                          if (profileData.email && !isValidEmail(profileData.email)) {
                            toast.error('E-mail inválido');
                            return;
                          }
                          if (profileData.phone && unformatPhone(profileData.phone).length < 10) {
                            toast.error('Telefone inválido');
                            return;
                          }
                          
                          updateProfileMutation.mutate(profileData);
                        }}
                        disabled={updateProfileMutation.isPending}
                      >
                        {updateProfileMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Notification Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle>Notificações</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Notificações de Pedidos</p>
                        <p className="text-sm text-gray-500">Receba atualizações sobre seus pedidos</p>
                      </div>
                      <Switch 
                        checked={notificationSettings.orderNotifications}
                        onCheckedChange={(checked) => {
                          setNotificationSettings(prev => ({ ...prev, orderNotifications: checked }));
                          localStorage.setItem('notificationSettings', JSON.stringify({
                            ...notificationSettings,
                            orderNotifications: checked
                          }));
                          toast.success('Preferência de notificação salva!');
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Notificações de Promoções</p>
                        <p className="text-sm text-gray-500">Receba ofertas e promoções exclusivas</p>
                      </div>
                      <Switch 
                        checked={notificationSettings.promotionNotifications}
                        onCheckedChange={(checked) => {
                          setNotificationSettings(prev => ({ ...prev, promotionNotifications: checked }));
                          localStorage.setItem('notificationSettings', JSON.stringify({
                            ...notificationSettings,
                            promotionNotifications: checked
                          }));
                          toast.success('Preferência de notificação salva!');
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Notificações do Navegador</p>
                        <p className="text-sm text-gray-500">Permitir notificações do navegador</p>
                      </div>
                      <Switch 
                        checked={notificationSettings.browserNotifications}
                        onCheckedChange={(checked) => {
                          if (checked && Notification.permission === 'default') {
                            Notification.requestPermission().then(permission => {
                              if (permission === 'granted') {
                                setNotificationSettings(prev => ({ ...prev, browserNotifications: true }));
                                localStorage.setItem('notificationSettings', JSON.stringify({
                                  ...notificationSettings,
                                  browserNotifications: true
                                }));
                                toast.success('Notificações do navegador ativadas!');
                              } else {
                                toast.error('Permissão de notificação negada');
                              }
                            });
                          } else if (!checked) {
                            setNotificationSettings(prev => ({ ...prev, browserNotifications: false }));
                            localStorage.setItem('notificationSettings', JSON.stringify({
                              ...notificationSettings,
                              browserNotifications: false
                            }));
                            toast.success('Notificações do navegador desativadas');
                          }
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Privacy & Security */}
                <Card>
                  <CardHeader>
                    <CardTitle>Privacidade e Segurança</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button variant="outline" className="w-full justify-start">
                      <Settings className="w-4 h-4 mr-2" />
                      Alterar Senha
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Bell className="w-4 h-4 mr-2" />
                      Gerenciar Permissões
                    </Button>
                  </CardContent>
                </Card>

                {/* Preferences */}
                <Card>
                  <CardHeader>
                    <CardTitle>Preferências</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Idioma</label>
                      <select className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                        <option>Português (Brasil)</option>
                        <option>English</option>
                        <option>Español</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Formato de Data</label>
                      <select className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                        <option>DD/MM/AAAA</option>
                        <option>MM/DD/AAAA</option>
                        <option>AAAA-MM-DD</option>
                      </select>
                    </div>
                  </CardContent>
                </Card>

                {/* Danger Zone */}
                <Card className="border-red-200">
                  <CardHeader>
                    <CardTitle className="text-red-600">Zona de Perigo</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-red-50 rounded-lg">
                      <p className="text-sm text-red-800 mb-4">
                        Ao excluir sua conta, todos os seus dados serão permanentemente removidos. Esta ação não pode ser desfeita.
                      </p>
                      <Button variant="destructive">
                        Excluir Conta
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}