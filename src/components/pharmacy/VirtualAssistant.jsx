import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, MessageCircle, Send, Search, FileText, User, Bot, Loader2, 
  ArrowLeft, ShoppingCart, Star, ThumbsUp, ThumbsDown, Copy, 
  Trash2, Download, Clock, Check, CheckCheck 
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from './ThemeProvider';
import { formatWhatsAppNumber, createWhatsAppUrl } from '@/utils/whatsapp';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';
import { formatPriceWithSymbol } from '@/utils/priceFormat';
import { 
  findSimilarProducts, 
  generateIntelligentResponse, 
  analyzeUserIntent 
} from '@/utils/aiAssistant';
import { getMedicationInfo, getMedicationAnswer } from '@/api/medicationAPI';

const CHAT_STATES = {
  INITIAL: 'initial',
  PRODUCT_SEARCH: 'product_search',
  PRESCRIPTION: 'prescription',
  PHARMACIST: 'pharmacist',
  QUOTE: 'quote'
};

// Som de notificação
const playNotificationSound = () => {
  try {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuC0fPTgjMGHm7A7+OZQQ0PV7Dm77RaGQg+l9zywG4fBSuAzvLZiTYHGWW56+CYThAMUKzp8LBsIwU5jtHy0IIyBhl0wO7nm0QQDVG06PClVhYKRZvb88JqHAUrgs/y04IzBhxqvu3hlj8MDFSx5O+0WhkIPpfd8sBuHwUrg9Dz0oQ0Bxhkuevgl08OD1Oz6vCxaSYFOpHR8c6CMwYbe7/s6ZhOEAxPsurvs2QgBTyM0fHPgjQGGXW/7OicTRAMUrPq8LFrJAU9kdDxz4I0Bhl2wOzomk0QDFGy6e+zbCEFPJPQ8c+CM');
    audio.play();
  } catch (error) {
    // Silenciosamente falhar se não puder reproduzir
  }
};

// Hook para salvar/carregar histórico
const usePersistedChat = () => {
  const [chatHistory, setChatHistory] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('chatHistory');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setChatHistory(parsed);
      } catch (e) {
        console.error('Erro ao carregar histórico:', e);
      }
    }
  }, []);

  const saveMessage = useCallback((message) => {
    setChatHistory(prev => {
      const updated = [...prev, message];
      localStorage.setItem('chatHistory', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    localStorage.removeItem('chatHistory');
    setChatHistory([]);
  }, []);

  return { chatHistory, saveMessage, clearHistory };
};

export default function VirtualAssistant() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [currentState, setCurrentState] = useState(CHAT_STATES.INITIAL);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [quoteItems, setQuoteItems] = useState([]);
  const [previousState, setPreviousState] = useState(null);
  const [quickReplies, setQuickReplies] = useState([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const messagesEndRef = useRef(null);
  const { chatHistory, saveMessage, clearHistory } = usePersistedChat();

  const whatsappNumber = formatWhatsAppNumber(theme.whatsapp);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Carregar histórico se existir
      if (chatHistory.length > 0) {
        setMessages(chatHistory);
        setQuickReplies([
          { text: '🆕 Nova conversa', action: 'new_chat' },
          { text: '🗑️ Limpar histórico', action: 'clear_history' }
        ]);
      } else {
        const welcomeMsg = {
          id: Date.now(),
          type: 'bot',
          text: `Olá! 👋 Sou o assistente virtual da ${theme.pharmacyName || 'farmácia'}.\n\nComo posso ajudar você hoje?`,
          timestamp: new Date(),
          status: 'delivered'
        };
        setMessages([welcomeMsg]);
        saveMessage(welcomeMsg);
        setQuickReplies([
          { text: '🔍 Buscar medicamento', action: 'search_product' },
          { text: '📋 Enviar receita', action: 'send_prescription' },
          { text: '👨‍⚕️ Falar com farmacêutico', action: 'talk_pharmacist' }
        ]);
      }
    }
  }, [isOpen, chatHistory.length, theme.pharmacyName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Simular digitação do bot
  const simulateTyping = (callback, duration = 1000) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      callback();
    }, duration);
  };

  const addMessage = (text, type = 'user', extraData = {}) => {
    const newMessage = {
      id: Date.now() + Math.random(),
      type,
      text,
      timestamp: new Date(),
      status: type === 'user' ? 'sent' : 'delivered',
      ...extraData
    };
    
    setMessages(prev => [...prev, newMessage]);
    saveMessage(newMessage);
    
    // Tocar som se for mensagem do bot
    if (type === 'bot' && !isOpen) {
      playNotificationSound();
    }
    
    return newMessage;
  };

  const handleQuickReply = (reply) => {
    switch (reply.action) {
      case 'search_product':
        handleInitialOption('product');
        break;
      case 'send_prescription':
        handleInitialOption('prescription');
        break;
      case 'talk_pharmacist':
        handleInitialOption('pharmacist');
        break;
      case 'new_chat':
        setMessages([]);
        setCurrentState(CHAT_STATES.INITIAL);
        setQuickReplies([]);
        const welcomeMsg = {
          id: Date.now(),
          type: 'bot',
          text: `Olá! 👋 Como posso ajudar você hoje?`,
          timestamp: new Date(),
          status: 'delivered'
        };
        setMessages([welcomeMsg]);
        saveMessage(welcomeMsg);
        break;
      case 'clear_history':
        if (confirm('Tem certeza que deseja limpar todo o histórico de conversas?')) {
          clearHistory();
          setMessages([]);
          setCurrentState(CHAT_STATES.INITIAL);
          toast.success('Histórico limpo!');
          setIsOpen(false);
        }
        break;
      case 'thumbs_up':
        submitFeedback('positive');
        break;
      case 'thumbs_down':
        submitFeedback('negative');
        break;
      default:
        setInputValue(reply.text);
    }
  };

  const submitFeedback = (sentiment) => {
    setFeedbackGiven(true);
    setShowFeedback(false);
    
    // Salvar feedback (pode ser enviado para analytics)
    const feedback = {
      timestamp: new Date(),
      sentiment,
      conversation: messages
    };
    
    localStorage.setItem('lastChatFeedback', JSON.stringify(feedback));
    
    simulateTyping(() => {
      addMessage(
        sentiment === 'positive' 
          ? '😊 Obrigado pelo feedback! Fico feliz em ter ajudado!' 
          : '😔 Obrigado pelo feedback. Vamos melhorar! Se precisar, fale com nosso farmacêutico.',
        'bot'
      );
    }, 500);
  };

  const handleInitialOption = (option) => {
    switch (option) {
      case 'product':
        setPreviousState(CHAT_STATES.INITIAL);
        setCurrentState(CHAT_STATES.PRODUCT_SEARCH);
        addMessage('🔍 Consultar produto', 'user');
        
        simulateTyping(() => {
          addMessage(
            'Por favor, digite o nome do medicamento ou produto que você procura. 💊\n\n*Posso buscar por:*\n• Nome comercial\n• Princípio ativo\n• Marca\n\nSe não tivermos o produto exato, vou sugerir genéricos ou similares!',
            'bot'
          );
          setQuickReplies([
            { text: 'Dipirona', action: null },
            { text: 'Paracetamol', action: null },
            { text: 'Omeprazol', action: null }
          ]);
        });
        break;
      case 'prescription':
        setPreviousState(CHAT_STATES.INITIAL);
        setCurrentState(CHAT_STATES.PRESCRIPTION);
        addMessage('📋 Enviar receita', 'user');
        navigate(createPageUrl('UploadPrescription'));
        setIsOpen(false);
        break;
      case 'pharmacist':
        setCurrentState(CHAT_STATES.PHARMACIST);
        addMessage('👨‍⚕️ Falar com farmacêutico', 'user');
        if (whatsappNumber) {
          simulateTyping(() => {
            addMessage('Vou transferir você para o nosso farmacêutico no WhatsApp. Um momento, por favor...', 'bot');
            setTimeout(() => {
              const message = 'Olá! Preciso de orientação farmacêutica.';
              const url = createWhatsAppUrl(whatsappNumber, message);
              if (url) {
                window.open(url, '_blank');
                addMessage('✅ Redirecionando para o WhatsApp...', 'bot');
              }
            }, 1500);
          });
        } else {
          addMessage('Desculpe, o WhatsApp não está configurado. Por favor, entre em contato através de outros canais.', 'bot');
        }
        break;
    }
  };

  const searchProduct = async (query) => {
    if (!query.trim()) return;

    setIsSearching(true);
    addMessage(query, 'user');

    try {
      const allProducts = await base44.entities.Product.list('', 10000);
      const activeProducts = allProducts.filter(p => p.status === 'active');
      
      const intent = analyzeUserIntent(query);
      const searchTerm = intent.medicationName || query;
      
      const isAskingMedicationInfo = intent.askingIndication || intent.askingSideEffects || 
        query.toLowerCase().includes('serve para') || 
        query.toLowerCase().includes('efeito') ||
        query.toLowerCase().includes('contraindicação');
      
      let medicationInfo = null;
      if (isAskingMedicationInfo || !intent.askingAvailability) {
        medicationInfo = await getMedicationInfo(searchTerm);
        
        if (medicationInfo && isAskingMedicationInfo) {
          const medicationAnswer = await getMedicationAnswer(searchTerm, query);
          if (medicationAnswer) {
            simulateTyping(() => {
              addMessage(medicationAnswer, 'bot');
              
              const searchResults = findSimilarProducts(searchTerm, activeProducts);
              if (searchResults.exact.length > 0 || searchResults.generic.length > 0) {
                setTimeout(() => {
                  addMessage(`\n💊 Temos este medicamento disponível! Gostaria de ver os preços e adicionar ao carrinho?`, 'bot');
                  const productsToShow = searchResults.exact.length > 0 ? searchResults.exact : searchResults.generic;
                  setSearchResults(productsToShow.slice(0, 5));
                  setCurrentState(CHAT_STATES.QUOTE);
                  setQuickReplies([
                    { text: '✅ Ver preços', action: null },
                    { text: '❌ Não, obrigado', action: 'new_chat' }
                  ]);
                }, 1500);
              } else {
                setTimeout(() => {
                  addMessage(`\nNo momento não temos este medicamento em estoque. Gostaria de falar com nosso farmacêutico? 👨‍⚕️`, 'bot');
                  setQuickReplies([
                    { text: '👨‍⚕️ Sim, falar com farmacêutico', action: 'talk_pharmacist' },
                    { text: '🔍 Buscar outro produto', action: 'search_product' }
                  ]);
                }, 1500);
              }
            }, 1500);
            
            setIsSearching(false);
            setInputValue('');
            return;
          }
        }
      }
      
      const searchResults = findSimilarProducts(searchTerm, activeProducts);
      
      const aiResponse = await generateIntelligentResponse(
        query, 
        searchResults,
        theme.pharmacyName || 'Farmácia'
      );

      simulateTyping(() => {
        addMessage(aiResponse.message, 'bot');
        
        if (medicationInfo && !isAskingMedicationInfo && (searchResults.exact.length > 0 || searchResults.generic.length > 0)) {
          setTimeout(() => {
            addMessage(`\n💡 ${medicationInfo.basicInfo}\n\n_Se tiver dúvidas sobre uso, indicações ou efeitos, é só perguntar!_`, 'bot');
          }, 1000);
        }

        if (aiResponse.showProducts && (searchResults.exact.length > 0 || searchResults.generic.length > 0 || searchResults.similar.length > 0)) {
          const productsToShow = searchResults.exact.length > 0 
            ? searchResults.exact 
            : searchResults.generic.length > 0 
              ? searchResults.generic 
              : searchResults.similar;
          
          setSearchResults(productsToShow.slice(0, 5));
          setCurrentState(CHAT_STATES.QUOTE);
          setQuickReplies([
            { text: '🛒 Adicionar ao carrinho', action: null },
            { text: '🔍 Buscar outro', action: 'search_product' }
          ]);
        } else {
          setSearchResults([]);
          
          if (aiResponse.suggestPharmacist) {
            setTimeout(() => {
              addMessage('Gostaria de falar com nosso farmacêutico agora? 👨‍⚕️', 'bot');
              setQuickReplies([
                { text: '👨‍⚕️ Sim', action: 'talk_pharmacist' },
                { text: '🔍 Buscar outro produto', action: 'search_product' }
              ]);
            }, 1000);
          }
          
          if (aiResponse.showOptions) {
            setTimeout(() => {
              setCurrentState(CHAT_STATES.INITIAL);
              setQuickReplies([
                { text: '🔍 Buscar medicamento', action: 'search_product' },
                { text: '👨‍⚕️ Falar com farmacêutico', action: 'talk_pharmacist' }
              ]);
            }, 1500);
          }
        }
      }, 1200);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      simulateTyping(() => {
        addMessage('Ops! Algo deu errado. 😅 Por favor, tente novamente ou fale direto com nosso farmacêutico pelo WhatsApp.', 'bot');
        setSearchResults([]);
        setQuickReplies([
          { text: '🔄 Tentar novamente', action: 'search_product' },
          { text: '👨‍⚕️ Falar com farmacêutico', action: 'talk_pharmacist' }
        ]);
      }, 800);
    } finally {
      setIsSearching(false);
      setInputValue('');
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isSearching) return;

    if (currentState === CHAT_STATES.PRODUCT_SEARCH || currentState === CHAT_STATES.QUOTE || currentState === CHAT_STATES.INITIAL) {
      searchProduct(inputValue);
    }

    setInputValue('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Mensagem copiada!');
  };

  const exportChat = () => {
    const chatText = messages.map(msg => 
      `[${new Date(msg.timestamp).toLocaleTimeString()}] ${msg.type === 'user' ? 'Você' : 'Assistente'}: ${msg.text}`
    ).join('\n\n');
    
    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversa-${Date.now()}.txt`;
    a.click();
    toast.success('Conversa exportada!');
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="absolute bottom-16 sm:bottom-20 right-0 w-[calc(100vw-2rem)] sm:w-96 max-h-[calc(100vh-140px)] sm:max-h-[calc(100vh-160px)] bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200 flex flex-col"
          >
            {/* Header */}
            <div 
              className="px-5 py-4 text-white flex items-center justify-between"
              style={{ backgroundColor: theme.primaryColor || '#059669' }}
            >
              <div className="flex items-center gap-3">
                {currentState !== CHAT_STATES.INITIAL && previousState && (
                  <button
                    onClick={() => {
                      setCurrentState(previousState);
                      setPreviousState(null);
                      setSearchResults([]);
                      setQuoteItems([]);
                    }}
                    className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                )}
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Assistente Virtual</h3>
                  <p className="text-xs opacity-90 flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    Online
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportChat}
                  className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
                  title="Exportar conversa"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-white">
              {messages.map((msg, index) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-end gap-2 max-w-[80%] ${msg.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    {msg.type === 'bot' && (
                      <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-3 h-3 text-emerald-600" />
                      </div>
                    )}
                    <div className="flex flex-col gap-1">
                      <div
                        className={`rounded-2xl px-4 py-2 ${
                          msg.type === 'user'
                            ? 'bg-emerald-500 text-white'
                            : 'bg-white text-gray-800 shadow-sm border border-gray-200'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                      </div>
                      <div className={`flex items-center gap-2 text-xs text-gray-400 px-2 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <Clock className="w-3 h-3" />
                        <span>{new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        {msg.type === 'user' && (
                          <span>
                            {msg.status === 'sent' && <Check className="w-3 h-3" />}
                            {msg.status === 'delivered' && <CheckCheck className="w-3 h-3 text-blue-500" />}
                            {msg.status === 'read' && <CheckCheck className="w-3 h-3 text-emerald-500" />}
                          </span>
                        )}
                        {msg.type === 'bot' && (
                          <button
                            onClick={() => copyToClipboard(msg.text)}
                            className="hover:text-emerald-600 transition-colors"
                            title="Copiar mensagem"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Search Results */}
              {searchResults.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-2 mt-4"
                >
                  {searchResults.map((product) => {
                    const inQuote = quoteItems.find(item => item.id === product.id);
                    return (
                      <div
                        key={product.id}
                        className="p-3 bg-gradient-to-r from-white to-emerald-50 rounded-xl border border-emerald-200 hover:border-emerald-400 hover:shadow-lg transition-all"
                      >
                        <p className="font-semibold text-sm text-gray-900">{product.name}</p>
                        {product.brand && (
                          <p className="text-xs text-gray-500 mt-1">📦 {product.brand}</p>
                        )}
                        <p className="text-lg font-bold text-emerald-600 mt-2">
                          {formatPriceWithSymbol(product.price || 0)}
                        </p>
                        {currentState === CHAT_STATES.QUOTE && (
                          <div className="flex items-center gap-2 mt-3">
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (inQuote && inQuote.quantity > 1) {
                                  setQuoteItems(prev => prev.map(item => 
                                    item.id === product.id 
                                      ? { ...item, quantity: item.quantity - 1 }
                                      : item
                                  ).filter(item => item.quantity > 0));
                                } else if (inQuote) {
                                  setQuoteItems(prev => prev.filter(item => item.id !== product.id));
                                }
                              }}
                              className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                              disabled={!inQuote}
                            >
                              −
                            </button>
                            <span className="text-sm text-gray-700 font-semibold min-w-[30px] text-center">
                              {inQuote?.quantity || 0}
                            </span>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const exists = quoteItems.find(item => item.id === product.id);
                                if (exists) {
                                  setQuoteItems(prev => prev.map(item => 
                                    item.id === product.id 
                                      ? { ...item, quantity: item.quantity + 1 }
                                      : item
                                  ));
                                } else {
                                  setQuoteItems(prev => [...prev, { ...product, quantity: 1 }]);
                                }
                                toast.success('✓ Produto adicionado!', { duration: 1000 });
                              }}
                              className="px-3 py-1 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors font-semibold"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </motion.div>
              )}

              {/* Quote Summary */}
              {quoteItems.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-4 p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border-2 border-emerald-300 shadow-lg"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-emerald-900 flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5" />
                      Seu Orçamento
                    </h4>
                    <span className="text-sm font-semibold text-emerald-700 bg-white px-3 py-1 rounded-full">
                      {quoteItems.length} item(ns)
                    </span>
                  </div>
                  <div className="space-y-2 mb-3 max-h-32 overflow-y-auto">
                    {quoteItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-sm bg-white p-2 rounded-lg">
                        <span className="text-gray-700 font-medium">{item.name} <span className="text-emerald-600">×{item.quantity}</span></span>
                        <span className="font-bold text-emerald-700">
                          {formatPriceWithSymbol(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-3 border-t-2 border-emerald-300 flex items-center justify-between mb-3">
                    <span className="font-bold text-emerald-900 text-lg">Total:</span>
                    <span className="font-bold text-2xl text-emerald-700">
                      {formatPriceWithSymbol(
                        quoteItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
                      )}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      const cart = JSON.parse(localStorage.getItem('pharmacyCart') || '[]');
                      quoteItems.forEach(item => {
                        const existing = cart.find(cartItem => cartItem.id === item.id);
                        if (existing) {
                          existing.quantity += item.quantity;
                        } else {
                          cart.push({ ...item, quantity: item.quantity });
                        }
                      });
                      localStorage.setItem('pharmacyCart', JSON.stringify(cart));
                      window.dispatchEvent(new Event('cartUpdated'));
                      toast.success(`✓ ${quoteItems.length} produto(s) adicionado(s) ao carrinho!`);
                      
                      // Mostrar feedback
                      simulateTyping(() => {
                        addMessage('🎉 Produtos adicionados ao carrinho! Deseja finalizar a compra agora?', 'bot');
                        setQuickReplies([
                          { text: '🛒 Ir ao carrinho', action: null },
                          { text: '🔍 Continuar comprando', action: 'search_product' }
                        ]);
                        setShowFeedback(true);
                      }, 500);
                    }}
                    className="w-full px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all transform hover:scale-105 font-bold shadow-lg flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    Adicionar ao Carrinho
                  </button>
                </motion.div>
              )}

              {/* Quick Replies */}
              {quickReplies.length > 0 && !isTyping && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-wrap gap-2 mt-4"
                >
                  {quickReplies.map((reply, index) => (
                    <motion.button
                      key={index}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleQuickReply(reply)}
                      className="px-3 py-2 bg-white border-2 border-emerald-300 text-emerald-700 rounded-full text-sm font-medium hover:bg-emerald-50 hover:border-emerald-400 transition-all shadow-sm"
                    >
                      {reply.text}
                    </motion.button>
                  ))}
                </motion.div>
              )}

              {/* Feedback Request */}
              {showFeedback && !feedbackGiven && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200"
                >
                  <p className="text-sm font-medium text-blue-900 mb-3 text-center">
                    ⭐ Este atendimento foi útil?
                  </p>
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => handleQuickReply({ action: 'thumbs_up' })}
                      className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors flex items-center gap-2 font-medium"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      Sim
                    </button>
                    <button
                      onClick={() => handleQuickReply({ action: 'thumbs_down' })}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center gap-2 font-medium"
                    >
                      <ThumbsDown className="w-4 h-4" />
                      Não
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Typing Indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="flex items-end gap-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Bot className="w-3 h-3 text-emerald-600" />
                    </div>
                    <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-200">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t bg-white">
              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Digite sua mensagem..."
                  disabled={isSearching || isTyping}
                  className="flex-1 border-2 border-gray-200 focus:border-emerald-400 rounded-xl"
                />
                <Button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isSearching || isTyping}
                  style={{ backgroundColor: theme.primaryColor || '#059669' }}
                  className="px-6 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                >
                  {isSearching ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className={`relative w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all ${
          isOpen ? 'bg-gray-700' : 'hover:shadow-emerald-500/50'
        }`}
        style={!isOpen ? { backgroundColor: theme.primaryColor || '#059669' } : {}}
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
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
            >
              <MessageCircle className="w-7 h-7 text-white" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notification Badge */}
        {!isOpen && chatHistory.length > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold border-2 border-white"
          >
            !
          </motion.span>
        )}
      </motion.button>

      {/* Pulse animation */}
      {!isOpen && (
        <motion.span 
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 rounded-full opacity-25 pointer-events-none"
          style={{ backgroundColor: theme.primaryColor || '#059669' }}
        />
      )}
    </div>
  );
}
