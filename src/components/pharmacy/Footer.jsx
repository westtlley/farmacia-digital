import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Phone, 
  Mail, 
  MapPin, 
  Clock,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Heart,
  Shield,
  Truck,
  CreditCard,
  FileText
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import { TrustBadges } from './SocialProof';

/**
 * Footer Profissional e Completo
 * Aumenta confiança e SEO
 */
export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-br from-gray-900 to-gray-800 text-gray-300">
      {/* Trust Section */}
      <div className="border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <TrustBadges />
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          
          {/* Coluna 1: Sobre */}
          <div>
            <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
              <Heart className="w-5 h-5 text-emerald-500" />
              Farmácia Digital
            </h3>
            <p className="text-sm text-gray-400 mb-4 leading-relaxed">
              Sua farmácia online de confiança. Medicamentos com os melhores preços e entrega rápida no conforto da sua casa.
            </p>
            <div className="space-y-2 text-sm">
              <p className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span>Certificado ANVISA</span>
              </p>
              <p className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span>CRF: 12345-SP</span>
              </p>
            </div>
          </div>

          {/* Coluna 2: Links Rápidos */}
          <div>
            <h3 className="text-white text-lg font-bold mb-4">Links Rápidos</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link 
                  to={createPageUrl('Home')} 
                  className="hover:text-emerald-400 transition-colors flex items-center gap-2"
                >
                  → Início
                </Link>
              </li>
              <li>
                <Link 
                  to={createPageUrl('Promotions')} 
                  className="hover:text-emerald-400 transition-colors flex items-center gap-2"
                >
                  → Promoções
                </Link>
              </li>
              <li>
                <Link 
                  to={createPageUrl('DeliveryAreas')} 
                  className="hover:text-emerald-400 transition-colors flex items-center gap-2"
                >
                  → Onde Entregamos
                </Link>
              </li>
              <li>
                <Link 
                  to={createPageUrl('UploadPrescription')} 
                  className="hover:text-emerald-400 transition-colors flex items-center gap-2"
                >
                  → Enviar Receita
                </Link>
              </li>
              <li>
                <Link 
                  to={createPageUrl('CustomerArea')} 
                  className="hover:text-emerald-400 transition-colors flex items-center gap-2"
                >
                  → Minha Conta
                </Link>
              </li>
              <li>
                <Link 
                  to={createPageUrl('TrackOrder')} 
                  className="hover:text-emerald-400 transition-colors flex items-center gap-2"
                >
                  → Rastrear Pedido
                </Link>
              </li>
            </ul>
          </div>

          {/* Coluna 3: Atendimento */}
          <div>
            <h3 className="text-white text-lg font-bold mb-4">Atendimento</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-white">WhatsApp</p>
                  <a href="https://wa.me/5511999999999" className="hover:text-emerald-400 transition-colors">
                    (11) 99999-9999
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-white">Email</p>
                  <a href="mailto:contato@farmacia.com" className="hover:text-emerald-400 transition-colors">
                    contato@farmacia.com
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-white">Horário</p>
                  <p>Seg-Sáb: 8h às 22h</p>
                  <p>Dom: 9h às 18h</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-white">Endereço</p>
                  <p>Rua das Flores, 123</p>
                  <p>São Paulo - SP</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Coluna 4: Institucional */}
          <div>
            <h3 className="text-white text-lg font-bold mb-4">Institucional</h3>
            <ul className="space-y-2 text-sm mb-6">
              <li>
                <Link to="/sobre" className="hover:text-emerald-400 transition-colors flex items-center gap-2">
                  → Sobre Nós
                </Link>
              </li>
              <li>
                <Link to="/politica-privacidade" className="hover:text-emerald-400 transition-colors flex items-center gap-2">
                  → Política de Privacidade
                </Link>
              </li>
              <li>
                <Link to="/termos-uso" className="hover:text-emerald-400 transition-colors flex items-center gap-2">
                  → Termos de Uso
                </Link>
              </li>
              <li>
                <Link to="/trocas-devolucoes" className="hover:text-emerald-400 transition-colors flex items-center gap-2">
                  → Trocas e Devoluções
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-emerald-400 transition-colors flex items-center gap-2">
                  → Perguntas Frequentes
                </Link>
              </li>
            </ul>

            {/* Redes Sociais */}
            <div>
              <h4 className="text-white font-semibold mb-3">Redes Sociais</h4>
              <div className="flex gap-3">
                <a 
                  href="https://facebook.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-gray-700 hover:bg-emerald-600 rounded-full flex items-center justify-center transition-colors"
                  aria-label="Facebook"
                >
                  <Facebook className="w-5 h-5" />
                </a>
                <a 
                  href="https://instagram.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-gray-700 hover:bg-gradient-to-r hover:from-purple-500 hover:to-pink-500 rounded-full flex items-center justify-center transition-all"
                  aria-label="Instagram"
                >
                  <Instagram className="w-5 h-5" />
                </a>
                <a 
                  href="https://twitter.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-gray-700 hover:bg-blue-500 rounded-full flex items-center justify-center transition-colors"
                  aria-label="Twitter"
                >
                  <Twitter className="w-5 h-5" />
                </a>
                <a 
                  href="https://youtube.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-gray-700 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors"
                  aria-label="YouTube"
                >
                  <Youtube className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Formas de Pagamento */}
        <div className="border-t border-gray-700 pt-8 mb-8">
          <h3 className="text-white text-center font-semibold mb-4 flex items-center justify-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-500" />
            Formas de Pagamento
          </h3>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <div className="bg-white rounded px-3 py-2 text-gray-900 text-xs font-semibold">
              💳 Cartão de Crédito
            </div>
            <div className="bg-white rounded px-3 py-2 text-gray-900 text-xs font-semibold">
              💸 PIX
            </div>
            <div className="bg-white rounded px-3 py-2 text-gray-900 text-xs font-semibold">
              💵 Dinheiro
            </div>
            <div className="bg-white rounded px-3 py-2 text-gray-900 text-xs font-semibold">
              💳 Débito
            </div>
          </div>
        </div>

        {/* Benefícios */}
        <div className="border-t border-gray-700 pt-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-white font-semibold">Entrega Rápida</h4>
              <p className="text-sm text-gray-400">Em até 90 minutos</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-white font-semibold">Compra Segura</h4>
              <p className="text-sm text-gray-400">100% protegida</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-white font-semibold">Atendimento</h4>
              <p className="text-sm text-gray-400">Farmacêutico disponível</p>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-gray-700 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-400">
            <p className="text-center md:text-left">
              © {currentYear} Farmácia Digital. Todos os direitos reservados.
            </p>
            <p className="text-center md:text-right">
              Desenvolvido com <Heart className="w-4 h-4 inline text-red-500" /> por Farmácia Digital
            </p>
          </div>
          <div className="mt-4 text-center text-xs text-gray-500">
            <p>CNPJ: 00.000.000/0001-00 | Autorização ANVISA: 1.23456.7 | CRF-SP: 12345</p>
            <p className="mt-2">
              ⚠️ Imagens meramente ilustrativas. Preços e disponibilidade sujeitos a alteração sem aviso prévio.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
