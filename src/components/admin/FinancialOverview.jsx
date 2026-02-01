import React from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, TrendingDown, Percent } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPriceWithSymbol } from '@/utils/priceFormat';

/**
 * Visão Financeira Real
 * Lucro = Receita - Custos
 */

export default function FinancialOverview({ orders = [] }) {
  // ESTE MÊS
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const thisMonthOrders = orders.filter(o => {
    const orderDate = new Date(o.created_date);
    return orderDate >= firstDayOfMonth && 
           orderDate <= lastDayOfMonth && 
           o.status !== 'cancelled';
  });

  const thisMonthRevenue = thisMonthOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const thisMonthOrdersCount = thisMonthOrders.length;

  // MÊS ANTERIOR (para comparação)
  const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const lastMonthOrders = orders.filter(o => {
    const orderDate = new Date(o.created_date);
    return orderDate >= firstDayLastMonth && 
           orderDate <= lastDayLastMonth && 
           o.status !== 'cancelled';
  });

  const lastMonthRevenue = lastMonthOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

  // CRESCIMENTO
  const revenueGrowth = lastMonthRevenue > 0
    ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
    : thisMonthRevenue > 0 ? 100 : 0;

  // CUSTOS ESTIMADOS (60% da receita - ajustar conforme realidade)
  const estimatedCosts = thisMonthRevenue * 0.60; // 60% custos
  const profit = thisMonthRevenue - estimatedCosts;
  const profitMargin = thisMonthRevenue > 0 ? (profit / thisMonthRevenue) * 100 : 0;

  // CANCELAMENTOS
  const cancelledOrders = orders.filter(o => {
    const orderDate = new Date(o.created_date);
    return orderDate >= firstDayOfMonth && 
           orderDate <= lastDayOfMonth && 
           o.status === 'cancelled';
  });

  const cancelledRevenue = cancelledOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const cancellationRate = (thisMonthOrdersCount + cancelledOrders.length) > 0
    ? (cancelledOrders.length / (thisMonthOrdersCount + cancelledOrders.length)) * 100
    : 0;

  // PREVISÃO PARA O MÊS
  const daysInMonth = lastDayOfMonth.getDate();
  const daysPassed = now.getDate();
  const dailyAverage = daysPassed > 0 ? thisMonthRevenue / daysPassed : 0;
  const projectedRevenue = dailyAverage * daysInMonth;
  const projectedProfit = projectedRevenue * (profitMargin / 100);

  return (
    <div className="space-y-6">
      {/* Cards Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm text-emerald-600 mb-1">Receita Bruta</p>
                <p className="text-2xl font-bold text-emerald-900">
                  {formatPriceWithSymbol(thisMonthRevenue)}
                </p>
              </div>
              <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className={`flex items-center gap-1 text-xs font-semibold ${
              revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {revenueGrowth >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {Math.abs(revenueGrowth).toFixed(1)}% vs mês anterior
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm text-gray-600 mb-1">Custos Estimados</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatPriceWithSymbol(estimatedCosts)}
                </p>
              </div>
              <div className="w-10 h-10 bg-gray-500 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-xs text-gray-500">~60% da receita bruta</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm text-green-600 mb-1">💰 Lucro</p>
                <p className="text-2xl font-bold text-green-900">
                  {formatPriceWithSymbol(profit)}
                </p>
              </div>
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-xs text-green-600 font-semibold">
              Receita - Custos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm text-gray-600 mb-1">Margem de Lucro</p>
                <p className="text-2xl font-bold text-gray-900">
                  {profitMargin.toFixed(1)}%
                </p>
              </div>
              <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                <Percent className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className={`text-xs font-semibold ${
              profitMargin >= 30 ? 'text-green-600' : 
              profitMargin >= 20 ? 'text-yellow-600' : 
              'text-red-600'
            }`}>
              {profitMargin >= 30 ? '✅ Excelente' : 
               profitMargin >= 20 ? '⚠️ Regular' : 
               '🚨 Atenção'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detalhamento */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Resumo Mensal */}
        <Card>
          <CardHeader>
            <CardTitle>📊 Resumo do Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-sm text-gray-600">Receita Bruta</span>
                <span className="font-bold text-gray-900">
                  {formatPriceWithSymbol(thisMonthRevenue)}
                </span>
              </div>

              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-sm text-gray-600">Cancelamentos</span>
                <span className="font-semibold text-red-600">
                  - {formatPriceWithSymbol(cancelledRevenue)}
                </span>
              </div>

              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-sm text-gray-600">Receita Líquida</span>
                <span className="font-bold text-gray-900">
                  {formatPriceWithSymbol(thisMonthRevenue - cancelledRevenue)}
                </span>
              </div>

              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-sm text-gray-600">Custos Estimados</span>
                <span className="font-semibold text-red-600">
                  - {formatPriceWithSymbol(estimatedCosts)}
                </span>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-base font-semibold text-green-800">💰 Lucro</span>
                <span className="text-2xl font-bold text-green-600">
                  {formatPriceWithSymbol(profit)}
                </span>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg mt-4">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Total de Pedidos</span>
                  <span className="font-semibold">{thisMonthOrdersCount}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Taxa de Cancelamento</span>
                  <span className={`font-semibold ${cancellationRate > 10 ? 'text-red-600' : 'text-green-600'}`}>
                    {cancellationRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Projeção */}
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardHeader>
            <CardTitle className="text-blue-900">🔮 Projeção para o Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-blue-700 mb-2">
                  Baseado na média de {formatPriceWithSymbol(dailyAverage)}/dia
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-blue-900">
                    {formatPriceWithSymbol(projectedRevenue)}
                  </span>
                  <span className="text-sm text-blue-600">receita projetada</span>
                </div>
              </div>

              <div className="bg-white bg-opacity-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-700">Lucro Projetado</span>
                  <span className="font-bold text-green-700">
                    {formatPriceWithSymbol(projectedProfit)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-700">Dias Restantes</span>
                  <span className="font-semibold text-gray-900">
                    {daysInMonth - daysPassed} dias
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-700">Progresso</span>
                  <span className="font-semibold text-blue-700">
                    {((daysPassed / daysInMonth) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              <div className="bg-green-500 bg-opacity-10 border border-green-300 p-3 rounded-lg">
                <p className="text-sm text-green-800">
                  {projectedRevenue > lastMonthRevenue ? (
                    <>
                      🎉 <strong>Parabéns!</strong> Você está no caminho para superar o mês anterior em{' '}
                      {formatPriceWithSymbol(projectedRevenue - lastMonthRevenue)}
                    </>
                  ) : (
                    <>
                      💪 <strong>Atenção!</strong> Você precisa vender{' '}
                      {formatPriceWithSymbol(lastMonthRevenue - projectedRevenue)} a mais para igualar o mês anterior
                    </>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
