import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAdminSidebar } from '@/contexts/AdminSidebarContext';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  DollarSign,
  Tag,
  FileText,
  Settings,
  Menu,
  X,
  Eye,
  Pill,
  BarChart3
} from 'lucide-react';
import { Button } from "@/components/ui/button";

const menuItems = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', link: 'AdminDashboard' },
  { id: 'finance', icon: DollarSign, label: 'Financeiro', link: 'AdminFinancial' },
  { id: 'products', icon: Package, label: 'Produtos', link: 'AdminProducts' },
  { id: 'orders', icon: ShoppingCart, label: 'Pedidos', link: 'AdminOrders' },
  { id: 'customers', icon: Users, label: 'Clientes', link: 'AdminCustomers' },
  { id: 'promotions', icon: Tag, label: 'Promoções', link: 'AdminPromotions' },
  { id: 'prescriptions', icon: FileText, label: 'Receitas', link: 'AdminPrescriptions' },
  { id: 'medications', icon: Pill, label: 'Medicamentos', link: 'AdminMedications' },
  { id: 'reports', icon: BarChart3, label: 'Relatórios', link: 'AdminReports' },
  { id: 'settings', icon: Settings, label: 'Configurações', link: 'AdminSettings' },
];

export default function AdminSidebar() {
  const { sidebarOpen, setSidebarOpen } = useAdminSidebar();
  const location = useLocation();
  
  const getCurrentPage = () => {
    const path = location.pathname;
    if (path.includes('AdminDashboard')) return 'dashboard';
    if (path.includes('AdminFinancial')) return 'finance';
    if (path.includes('AdminProducts')) return 'products';
    if (path.includes('AdminOrders')) return 'orders';
    if (path.includes('AdminCustomers')) return 'customers';
    if (path.includes('AdminPromotions')) return 'promotions';
    if (path.includes('AdminPrescriptions')) return 'prescriptions';
    if (path.includes('AdminMedications')) return 'medications';
    if (path.includes('AdminReports')) return 'reports';
    if (path.includes('AdminSettings')) return 'settings';
    return 'dashboard';
  };

  const currentPage = getCurrentPage();

  return (
    <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-gray-900 text-white transition-all duration-300 fixed h-full z-50 flex flex-col`}>
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                <span className="font-bold">+</span>
              </div>
              <span className="font-bold">Admin</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-800 rounded-lg"
            title={sidebarOpen ? 'Recolher menu' : 'Expandir menu'}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <nav className="p-4 space-y-1 flex-1">
        {menuItems.map((item) => (
          <Link
            key={item.id}
            to={createPageUrl(item.link)}
            className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${
              currentPage === item.id
                ? 'bg-emerald-600 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
            title={!sidebarOpen ? item.label : undefined}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <Link to={createPageUrl('Home')}>
          {sidebarOpen ? (
            <Button variant="outline" className="w-full border-gray-700 text-gray-300 hover:bg-gray-800">
              <Eye className="w-4 h-4 mr-2" />
              Ver Loja
            </Button>
          ) : (
            <Button variant="outline" size="icon" className="w-full border-gray-700 text-gray-300 hover:bg-gray-800" title="Ver Loja">
              <Eye className="w-4 h-4" />
            </Button>
          )}
        </Link>
      </div>
    </aside>
  );
}
