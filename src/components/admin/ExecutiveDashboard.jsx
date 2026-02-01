import React from 'react';
import { motion } from 'framer-motion';
import AlertsWidget from './AlertsWidget';
import QuickMetrics from './QuickMetrics';
import StockIntelligence from './StockIntelligence';
import TopProducts from './TopProducts';
import CustomersAnalysis from './CustomersAnalysis';
import FinancialOverview from './FinancialOverview';

/**
 * Dashboard Executivo Completo
 * Visão 360º do negócio para o dono da farmácia
 */

export default function ExecutiveDashboard({ 
  products = [], 
  orders = [], 
  prescriptions = [],
  customers = [] 
}) {
  // Saudação baseada no horário
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  // Data formatada
  const getFormattedDate = () => {
    const date = new Date();
    const weekday = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][date.getDay()];
    const day = date.getDate();
    const month = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ][date.getMonth()];
    return `${weekday}, ${day} de ${month}`;
  };

  return (
    <div className="space-y-8">
      {/* Header com Saudação */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-1">
              {getGreeting()}! 👋
            </h1>
            <p className="text-emerald-100 text-lg">
              {getFormattedDate()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-emerald-100 text-sm mb-1">Seu Dashboard Executivo</p>
            <p className="text-2xl font-bold">Farmácia Digital</p>
          </div>
        </div>
      </motion.div>

      {/* Alertas Importantes */}
      <section>
        <AlertsWidget 
          products={products} 
          orders={orders} 
          prescriptions={prescriptions} 
        />
      </section>

      {/* KPIs Principais */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          📊 Indicadores do Dia
        </h2>
        <QuickMetrics 
          orders={orders} 
          products={products} 
          customers={customers} 
        />
      </section>

      {/* Visão Financeira */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          💰 Visão Financeira
        </h2>
        <FinancialOverview orders={orders} />
      </section>

      {/* Análise de Produtos */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          📦 Análise de Produtos
        </h2>
        <TopProducts orders={orders} products={products} />
      </section>

      {/* Gestão de Estoque */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          🔔 Gestão Inteligente de Estoque
        </h2>
        <StockIntelligence products={products} orders={orders} />
      </section>

      {/* Análise de Clientes */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          👥 Análise de Clientes
        </h2>
        <CustomersAnalysis customers={customers} orders={orders} />
      </section>
    </div>
  );
}
