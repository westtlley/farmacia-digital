import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle, ShoppingBag, HelpCircle, FileText, Sparkles } from 'lucide-react';
import { formatWhatsAppNumber, createWhatsAppUrl } from '@/utils/whatsapp';
import { useTheme } from './ThemeProvider';

const options = [
  {
    icon: ShoppingBag,
    label: 'Fazer Pedido',
    message: 'Olá! Gostaria de fazer um pedido.',
    color: 'bg-emerald-500'
  },
  {
    icon: HelpCircle,
    label: 'Falar com Farmacêutico',
    message: 'Olá! Preciso de orientação farmacêutica.',
    color: 'bg-blue-500'
  },
  {
    icon: FileText,
    label: 'Enviar Receita',
    message: 'Olá! Gostaria de enviar uma receita médica.',
    color: 'bg-purple-500'
  },
  {
    icon: Sparkles,
    label: 'Ver Promoções',
    message: 'Olá! Quero saber das promoções de hoje.',
    color: 'bg-orange-500'
  }
];

export default function WhatsAppButton({ phoneNumber, productMessage }) {
  const theme = useTheme();
  
  // Usar número do theme se não for passado como prop
  const whatsappNumber = phoneNumber || formatWhatsAppNumber(theme.whatsapp);
  
  // Se ainda não tiver número válido, não renderiza o botão
  if (!whatsappNumber) {
    return null;
  }
  const [isOpen, setIsOpen] = useState(false);

  const handleOptionClick = (message) => {
    const finalMessage = productMessage || message;
    const url = createWhatsAppUrl(whatsappNumber, finalMessage);
    if (url) {
      window.open(url, '_blank');
      setIsOpen(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="absolute bottom-20 right-0 w-72 bg-white rounded-2xl shadow-2xl overflow-hidden border"
          >
            <div className="bg-gradient-to-r from-green-500 to-green-600 px-5 py-4 text-white">
              <h3 className="font-semibold text-lg">Fale Conosco</h3>
              <p className="text-green-100 text-sm">Escolha uma opção para iniciar</p>
            </div>
            <div className="p-3 space-y-2">
              {options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleOptionClick(option.message)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                >
                  <div className={`${option.color} w-10 h-10 rounded-full flex items-center justify-center`}>
                    <option.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-gray-700 font-medium">{option.label}</span>
                </button>
              ))}
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t">
              <p className="text-xs text-gray-500 text-center">
                Atendimento de Seg-Sex 07h-22h
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className={`w-16 h-16 rounded-full shadow-lg flex items-center justify-center transition-colors ${
          isOpen ? 'bg-gray-700' : 'bg-green-500 hover:bg-green-600'
        }`}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
            >
              <X className="w-7 h-7 text-white" />
            </motion.div>
          ) : (
            <motion.div
              key="whatsapp"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
            >
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Pulse animation */}
      {!isOpen && (
        <span className="absolute inset-0 rounded-full animate-ping bg-green-400 opacity-25 pointer-events-none" />
      )}
    </div>
  );
}