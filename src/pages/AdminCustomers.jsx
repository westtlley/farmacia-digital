import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Search,
  Users,
  Mail,
  Phone,
  MapPin,
  Package,
  TrendingUp
} from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { useAdminSidebar } from '@/contexts/AdminSidebarContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { parseMoney } from '@/utils/validation';
import { formatPhoneNumber } from '@/utils/phoneFormat';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AdminCustomers() {
  const { sidebarOpen } = useAdminSidebar();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: customers = [], isLoading: customersLoading, error: customersError } = useQuery({
    queryKey: ['adminCustomers'],
    queryFn: () => base44.entities.Customer.list('-created_date', 200),
    onError: (error) => {
      console.error('Erro ao carregar clientes:', error);
    }
  });

  const { data: orders = [], isLoading: ordersLoading, error: ordersError } = useQuery({
    queryKey: ['customerOrders'],
    queryFn: () => base44.entities.Order.list('-created_date', 500),
    onError: (error) => {
      console.error('Erro ao carregar pedidos:', error);
    }
  });

  const filteredCustomers = customers.filter(customer => 
    customer.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone?.includes(searchQuery) ||
    customer.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCustomerOrders = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return [];
    
    // Priorizar customer_id, depois telefone como fallback
    return orders.filter(o => 
      o.customer_id === customerId || 
      (o.customer_phone && customer.phone && o.customer_phone === customer.phone)
    );
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
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Clientes</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              {customersLoading ? 'Carregando...' : `${filteredCustomers.length} clientes cadastrados`}
            </p>
          </div>
        </motion.header>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="p-4 sm:p-6 space-y-6"
        >
        {/* Stats */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Card className="bg-white/60 backdrop-blur-sm border-gray-200/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total de Clientes</p>
                  <p className="text-2xl font-bold text-gray-900">{customers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/60 backdrop-blur-sm border-gray-200/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pedidos Totais</p>
                  <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/60 backdrop-blur-sm border-gray-200/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Ticket Médio</p>
                  <p className="text-2xl font-bold text-gray-900">
                    R$ {orders.length > 0 
                      ? (orders.reduce((sum, o) => sum + parseMoney(o.total), 0) / orders.length).toFixed(2) 
                      : '0.00'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="bg-white/60 backdrop-blur-sm border-gray-200/50">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome, telefone ou email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white"
              />
            </div>
          </CardContent>
        </Card>

        {/* Customers Table */}
        <Card className="bg-white/60 backdrop-blur-sm border-gray-200/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50">
                <TableHead>Cliente</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Pedidos</TableHead>
                <TableHead>Total Gasto</TableHead>
                <TableHead>Cadastro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => {
                const customerOrders = getCustomerOrders(customer.id);
                const totalSpent = customerOrders.reduce((sum, o) => sum + parseMoney(o.total), 0);
                
                return (
                  <TableRow key={customer.id} className="hover:bg-white/50">
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">{customer.name}</p>
                        {customer.cpf && (
                          <p className="text-sm text-gray-500">CPF: {customer.cpf}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        {customer.phone && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Phone className="w-3 h-3" />
                            {formatPhoneNumber(customer.phone)}
                          </div>
                        )}
                        {customer.email && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Mail className="w-3 h-3" />
                            {customer.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-blue-100 text-blue-800">
                        {customerOrders.length} pedidos
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-gray-900">R$ {totalSpent.toFixed(2)}</p>
                    </TableCell>
                    <TableCell className="text-gray-500 text-sm">
                      {new Date(customer.created_date).toLocaleDateString('pt-BR')}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
        </motion.div>
      </motion.main>
    </div>
  );
}