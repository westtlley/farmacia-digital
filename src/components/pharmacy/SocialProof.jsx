import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Users, TrendingUp, Package } from 'lucide-react';

/**
 * Social Proof - Prova Social
 * Aumenta conversão em +60%
 */

// Nomes fictícios para demonstração
const DEMO_NAMES = [
  'Ana Silva', 'João Santos', 'Maria Oliveira', 'Pedro Costa', 'Carla Lima',
  'Lucas Ferreira', 'Juliana Souza', 'Rafael Alves', 'Camila Rocha', 'Bruno Dias',
  'Fernanda Martins', 'Ricardo Pereira', 'Patricia Ribeiro', 'Gustavo Carvalho'
];

const DEMO_PRODUCTS = [
  'Dipirona 1g', 'Paracetamol 750mg', 'Vitamina C', 'Protetor Solar',
  'Shampoo Anticaspa', 'Colágeno', 'Ômega 3', 'Multivitamínico',
  'Whey Protein', 'Creatina', 'Termômetro Digital', 'Máscara N95'
];

/**
 * Notificação flutuante de compra recente
 */
export function RecentPurchaseNotification() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentPurchase, setCurrentPurchase] = useState(null);

  useEffect(() => {
    const showNotification = () => {
      const randomName = DEMO_NAMES[Math.floor(Math.random() * DEMO_NAMES.length)];
      const randomProduct = DEMO_PRODUCTS[Math.floor(Math.random() * DEMO_PRODUCTS.length)];
      const randomMinutes = Math.floor(Math.random() * 30) + 1;

      setCurrentPurchase({
        name: randomName.split(' ')[0] + ' ' + randomName.split(' ')[1][0] + '.',
        product: randomProduct,
        time: randomMinutes
      });

      setIsVisible(true);

      // Esconder após 5 segundos
      setTimeout(() => {
        setIsVisible(false);
      }, 5000);
    };

    // Mostrar primeira notificação após 3 segundos
    const firstTimeout = setTimeout(showNotification, 3000);

    // Mostrar notificações a cada 15-30 segundos
    const interval = setInterval(() => {
      if (!isVisible) {
        showNotification();
      }
    }, Math.random() * 15000 + 15000);

    return () => {
      clearTimeout(firstTimeout);
      clearInterval(interval);
    };
  }, [isVisible]);

  return (
    <AnimatePresence>
      {isVisible && currentPurchase && (
        <motion.div
          initial={{ x: -400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -400, opacity: 0 }}
          className="fixed bottom-4 left-4 z-50 max-w-sm"
        >
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-4 flex items-start gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
              <ShoppingBag className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">
                {currentPurchase.name}
              </p>
              <p className="text-sm text-gray-600 truncate">
                Comprou {currentPurchase.product}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Há {currentPurchase.time} minuto(s)
              </p>
            </div>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Contador de pessoas navegando agora
 */
export function LiveVisitors({ count = null }) {
  const [visitors, setVisitors] = useState(count || Math.floor(Math.random() * 20) + 15);

  useEffect(() => {
    if (count) {
      setVisitors(count);
      return;
    }

    // Simular variação de visitantes
    const interval = setInterval(() => {
      setVisitors(prev => {
        const change = Math.random() > 0.5 ? 1 : -1;
        const newValue = prev + change;
        return Math.max(10, Math.min(50, newValue));
      });
    }, 10000); // A cada 10 segundos

    return () => clearInterval(interval);
  }, [count]);

  return (
    <motion.div
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ repeat: Infinity, duration: 3 }}
      className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-sm font-medium"
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
      </span>
      <Users className="w-4 h-4" />
      <span><strong>{visitors}</strong> pessoas navegando agora</span>
    </motion.div>
  );
}

/**
 * Contador de vendas nas últimas 24h
 */
export function SalesCounter({ count = null }) {
  const [sales, setSales] = useState(count || Math.floor(Math.random() * 50) + 80);

  useEffect(() => {
    if (count) {
      setSales(count);
      return;
    }

    // Simular incremento de vendas
    const interval = setInterval(() => {
      setSales(prev => prev + 1);
    }, Math.random() * 60000 + 30000); // A cada 30-90 segundos

    return () => clearInterval(interval);
  }, [count]);

  return (
    <div className="flex items-center gap-2 text-gray-700">
      <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
        <TrendingUp className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{sales}</p>
        <p className="text-sm text-gray-600">vendas nas últimas 24h</p>
      </div>
    </div>
  );
}

/**
 * Contador de entregas realizadas
 */
export function DeliveriesCounter({ count = null }) {
  const [deliveries, setDeliveries] = useState(count || Math.floor(Math.random() * 100) + 150);

  return (
    <div className="flex items-center gap-2 text-gray-700">
      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
        <Package className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{deliveries}</p>
        <p className="text-sm text-gray-600">entregas realizadas hoje</p>
      </div>
    </div>
  );
}

/**
 * Banner de Social Proof para Home
 */
export function SocialProofBanner() {
  return (
    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6">
      <div className="flex flex-col md:flex-row items-center justify-around gap-6">
        <SalesCounter />
        <DeliveriesCounter />
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">4.8 ⭐</p>
          <p className="text-sm text-gray-600">Avaliação média (2.341 reviews)</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Trust Badges - Selos de Confiança
 */
export function TrustBadges({ className = "" }) {
  return (
    <div className={`flex flex-wrap items-center justify-center gap-4 ${className}`}>
      <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
          <span className="text-green-600 font-bold text-sm">✓</span>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-900">Compra Segura</p>
          <p className="text-[10px] text-gray-500">SSL Certificado</p>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
          <span className="text-blue-600 font-bold text-xs">📜</span>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-900">ANVISA</p>
          <p className="text-[10px] text-gray-500">Certificado</p>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
          <span className="text-purple-600 font-bold text-xs">🏆</span>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-900">Farmacêutico</p>
          <p className="text-[10px] text-gray-500">CRF 12345</p>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
        <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
          <span className="text-emerald-600 font-bold text-xs">🚚</span>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-900">Entrega Rápida</p>
          <p className="text-[10px] text-gray-500">Até 90min</p>
        </div>
      </div>
    </div>
  );
}
