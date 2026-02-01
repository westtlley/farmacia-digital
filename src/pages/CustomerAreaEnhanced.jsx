import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  User,
  Package,
  Award,
  Users,
  RefreshCw,
  Trophy,
  Settings,
  LogOut
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LoyaltyCard from '@/components/pharmacy/LoyaltyCard';
import ReferralCard from '@/components/pharmacy/ReferralCard';
import EasyRepurchase from '@/components/pharmacy/EasyRepurchase';
import AchievementsDisplay from '@/components/pharmacy/AchievementsDisplay';

/**
 * CustomerArea Aprimorada com Todas as Novas Funcionalidades
 */
export default function CustomerAreaEnhanced() {
  const [activeTab, setActiveTab] = useState('orders');

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        const me = await base44.auth.me();
        return me;
      } catch (error) {
        console.error('Erro ao carregar usuário:', error);
        return null;
      }
    }
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['customerOrders', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      try {
        const ordersList = await base44.entities.Order.filter({
          customer_email: user.email
        });
        return ordersList.sort((a, b) => 
          new Date(b.created_date) - new Date(a.created_date)
        );
      } catch (error) {
        console.error('Erro ao carregar pedidos:', error);
        return [];
      }
    },
    enabled: !!user?.email
  });

  const handleLogout = async () => {
    try {
      await base44.auth.signOut();
      toast.success('Logout realizado com sucesso!');
      window.location.href = '/';
    } catch (error) {
      toast.error('Erro ao fazer logout');
    }
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Acesso Restrito</h2>
          <p className="text-gray-600 mb-6">Faça login para acessar sua área</p>
          <Button onClick={() => window.location.href = '/login'}>
            Fazer Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-8 text-white shadow-2xl mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <User className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-1">
                  Olá, {user.full_name || 'Cliente'}!
                </h1>
                <p className="text-white/80">{user.email}</p>
              </div>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-6 w-full max-w-4xl mx-auto">
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span className="hidden md:inline">Pedidos</span>
            </TabsTrigger>
            <TabsTrigger value="loyalty" className="flex items-center gap-2">
              <Award className="w-4 h-4" />
              <span className="hidden md:inline">Fidelidade</span>
            </TabsTrigger>
            <TabsTrigger value="referral" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden md:inline">Indicar</span>
            </TabsTrigger>
            <TabsTrigger value="repurchase" className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              <span className="hidden md:inline">Recomprar</span>
            </TabsTrigger>
            <TabsTrigger value="achievements" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              <span className="hidden md:inline">Conquistas</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden md:inline">Configurações</span>
            </TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Meus Pedidos</h2>
                
                {ordersLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando pedidos...</p>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                      Nenhum pedido ainda
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Faça seu primeiro pedido e acompanhe aqui!
                    </p>
                    <Button onClick={() => window.location.href = '/'}>
                      Começar a Comprar
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div
                        key={order.id}
                        className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-bold text-gray-900">
                              Pedido #{order.order_number}
                            </p>
                            <p className="text-sm text-gray-500">
                              {new Date(order.created_date).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            order.status === 'completed' 
                              ? 'bg-green-100 text-green-700'
                              : order.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-700'
                          }`}>
                            {order.status === 'completed' ? 'Concluído' : 
                             order.status === 'pending' ? 'Pendente' : 
                             order.status}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">
                              {order.items?.length || 0} item(ns)
                            </p>
                            <p className="text-lg font-bold text-gray-900">
                              R$ {(order.total || 0).toFixed(2)}
                            </p>
                          </div>
                          <Button variant="outline" size="sm">
                            Ver Detalhes
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </TabsContent>

          {/* Loyalty Tab */}
          <TabsContent value="loyalty">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              <LoyaltyCard customerId={user.id} />
            </motion.div>
          </TabsContent>

          {/* Referral Tab */}
          <TabsContent value="referral">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              <ReferralCard 
                customerId={user.id} 
                customerName={user.full_name || 'Cliente'} 
              />
            </motion.div>
          </TabsContent>

          {/* Repurchase Tab */}
          <TabsContent value="repurchase">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              <EasyRepurchase customerId={user.id} />
            </motion.div>
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              <AchievementsDisplay customerId={user.id} />
            </motion.div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Configurações</h2>
                <p className="text-gray-600">
                  Configurações da conta em breve...
                </p>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
