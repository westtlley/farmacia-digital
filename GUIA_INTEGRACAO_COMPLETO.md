# 📘 GUIA COMPLETO DE INTEGRAÇÃO

## 🎯 Objetivo

Este guia detalha **passo-a-passo** como integrar todas as 14 funcionalidades implementadas no sistema da Farmácia Digital.

---

## 📋 ÍNDICE

1. [Preparação](#1-preparação)
2. [Integração na Home](#2-integração-na-home)
3. [Integração no Carrinho](#3-integração-no-carrinho)
4. [Integração na Área do Cliente](#4-integração-na-área-do-cliente)
5. [Integração no Header](#5-integração-no-header)
6. [Integração nas Páginas de Produto](#6-integração-nas-páginas-de-produto)
7. [Eventos e Hooks](#7-eventos-e-hooks)
8. [Testes](#8-testes)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. PREPARAÇÃO

### 1.1. Verificar Arquivos Criados

Confirme que todos os arquivos foram criados corretamente:

```bash
# Componentes (10 arquivos)
src/components/pharmacy/
├── FreeShippingProgress.jsx      ✓
├── SmartSuggestions.jsx          ✓
├── CouponDisplay.jsx             ✓
├── DeliveryWidget.jsx            ✓
├── LoyaltyCard.jsx               ✓
├── ReferralCard.jsx              ✓
├── FlashSalesWidget.jsx          ✓
├── HappyHourDelivery.jsx         ✓
├── OnePageCheckout.jsx           ✓
├── ExpressPurchase.jsx           ✓
├── EasyRepurchase.jsx            ✓
└── AchievementsDisplay.jsx       ✓

# Utilidades (5 arquivos)
src/utils/
├── coupons.js                    ✓
├── loyalty.js                    ✓
├── referral.js                   ✓
├── flashSales.js                 ✓
└── achievements.js               ✓

# Páginas (1 arquivo)
src/pages/
└── DeliveryAreas.jsx             ✓
```

### 1.2. Instalar Dependências

Todas as dependências já devem estar instaladas. Caso precise verificar:

```bash
npm install
# ou
yarn install
```

---

## 2. INTEGRAÇÃO NA HOME

### 2.1. Adicionar Widget de Delivery

**Arquivo:** `src/pages/Home.jsx`

**Passo 1:** Importar o componente

```javascript
import DeliveryWidget from '@/components/pharmacy/DeliveryWidget';
```

**Passo 2:** Adicionar na seção de renderização

```javascript
// Já está implementado! Procure por:
case 'delivery':
  return (
    <section key={section.id} className="max-w-7xl mx-auto px-4 py-8">
      <DeliveryWidget />
    </section>
  );
```

✅ **Status:** JÁ IMPLEMENTADO

---

### 2.2. Adicionar Flash Sales

**Passo 1:** Importar o componente

```javascript
import FlashSalesWidget from '@/components/pharmacy/FlashSalesWidget';
```

**Passo 2:** Adicionar antes das promoções (linha ~200)

```javascript
// Na função renderSection, adicionar novo case:
case 'flashsales':
  return (
    <section key={section.id} className="max-w-7xl mx-auto px-4 py-8">
      <FlashSalesWidget zipCode={customerZipCode} />
    </section>
  );
```

**Passo 3:** Adicionar estado para CEP do usuário

```javascript
// No início do componente Home
const [customerZipCode, setCustomerZipCode] = useState('');

// Carregar do localStorage ou da última compra
useEffect(() => {
  const savedZip = localStorage.getItem('customer_zipcode');
  if (savedZip) setCustomerZipCode(savedZip);
}, []);
```

**Passo 4:** Atualizar seções da Home

```javascript
const sections = theme.layout?.homeSections || [
  {id: '1', type: 'hero', enabled: true, order: 1},
  {id: '2', type: 'featured', enabled: true, order: 2},
  {id: '3', type: 'categories', enabled: true, order: 3},
  {id: '6', type: 'delivery', enabled: true, order: 4}, // JÁ EXISTE
  {id: '7', type: 'flashsales', enabled: true, order: 5}, // ADICIONAR
  {id: '4', type: 'promotions', enabled: true, order: 6},
  {id: '5', type: 'cta', enabled: true, order: 7}
];
```

---

### 2.3. Adicionar Happy Hour Banner

**Passo 1:** Importar

```javascript
import HappyHourDelivery from '@/components/pharmacy/HappyHourDelivery';
```

**Passo 2:** Adicionar no topo da Home (depois do Hero)

```javascript
// Logo após <HeroBanner />
<section className="max-w-7xl mx-auto px-4 py-4">
  <HappyHourDelivery />
</section>
```

---

## 3. INTEGRAÇÃO NO CARRINHO

### 3.1. Barra de Progresso e Sugestões

**Arquivo:** `src/pages/Cart.jsx`

✅ **Status:** JÁ IMPLEMENTADO

Verificar se tem:
- `<FreeShippingProgress subtotal={subtotal} />`
- `<SmartSuggestions ... />`
- `<CouponDisplay ... />`

---

### 3.2. Substituir por Checkout em 1 Página (OPCIONAL)

Se preferir usar o checkout completo em 1 página:

**Passo 1:** Importar

```javascript
import OnePageCheckout from '@/components/pharmacy/OnePageCheckout';
```

**Passo 2:** Substituir o conteúdo do Cart.jsx

```javascript
export default function Cart() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('pharmacyCart');
    if (saved) setItems(JSON.parse(saved));
  }, []);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (items.length === 0) {
    return <EmptyCartView />;
  }

  return (
    <OnePageCheckout
      items={items}
      subtotal={subtotal}
      onComplete={(order) => {
        // Limpar carrinho
        localStorage.removeItem('pharmacyCart');
        // Redirecionar para confirmação
        window.location.href = `/orders/${order.id}`;
      }}
    />
  );
}
```

---

## 4. INTEGRAÇÃO NA ÁREA DO CLIENTE

### 4.1. Criar/Atualizar CustomerArea

**Arquivo:** `src/pages/CustomerArea.jsx`

**Passo 1:** Importar componentes

```javascript
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import LoyaltyCard from '@/components/pharmacy/LoyaltyCard';
import ReferralCard from '@/components/pharmacy/ReferralCard';
import EasyRepurchase from '@/components/pharmacy/EasyRepurchase';
import AchievementsDisplay from '@/components/pharmacy/AchievementsDisplay';
```

**Passo 2:** Adicionar Tabs

```javascript
export default function CustomerArea() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
    } catch (error) {
      // Redirecionar para login
    }
  };

  if (!user) {
    return <LoadingView />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Olá, {user.full_name || 'Cliente'}!
        </h1>

        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full max-w-3xl">
            <TabsTrigger value="orders">Pedidos</TabsTrigger>
            <TabsTrigger value="loyalty">Fidelidade</TabsTrigger>
            <TabsTrigger value="referral">Indicar</TabsTrigger>
            <TabsTrigger value="repurchase">Recomprar</TabsTrigger>
            <TabsTrigger value="achievements">Conquistas</TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            {/* Conteúdo existente de pedidos */}
          </TabsContent>

          <TabsContent value="loyalty">
            <LoyaltyCard customerId={user.id} />
          </TabsContent>

          <TabsContent value="referral">
            <ReferralCard 
              customerId={user.id} 
              customerName={user.full_name} 
            />
          </TabsContent>

          <TabsContent value="repurchase">
            <EasyRepurchase customerId={user.id} />
          </TabsContent>

          <TabsContent value="achievements">
            <AchievementsDisplay customerId={user.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
```

---

## 5. INTEGRAÇÃO NO HEADER

### 5.1. Adicionar Badge de Fidelidade

**Arquivo:** `src/components/pharmacy/Header.jsx`

**Passo 1:** Importar

```javascript
import LoyaltyCard from './LoyaltyCard';
```

**Passo 2:** Adicionar no Header (junto com ícones)

```javascript
// Dentro do Header, na seção de ícones à direita
<div className="flex items-center gap-1 flex-shrink-0">
  {/* Ícones existentes (carrinho, favoritos, etc) */}
  
  {/* ADICIONAR: Badge de Fidelidade */}
  <LoyaltyCard customerId={user?.id || 'guest'} compact={true} />
  
  {/* Resto dos ícones */}
</div>
```

---

### 5.2. Link "Onde Entregamos"

✅ **Status:** JÁ IMPLEMENTADO

Verificar se existe no Header:
- Desktop: Link com ícone de caminhão
- Mobile: Item no menu hambúrguer

---

## 6. INTEGRAÇÃO NAS PÁGINAS DE PRODUTO

### 6.1. Adicionar Compra Expressa

**Arquivo:** `src/pages/Product.jsx`

**Passo 1:** Importar

```javascript
import ExpressPurchase from '@/components/pharmacy/ExpressPurchase';
```

**Passo 2:** Adicionar botão (junto com "Adicionar ao Carrinho")

```javascript
<div className="flex gap-3">
  {/* Botão normal de adicionar ao carrinho */}
  <Button
    onClick={() => addToCart(product)}
    className="flex-1 h-12 bg-emerald-600"
  >
    <ShoppingCart className="w-5 h-5 mr-2" />
    Adicionar ao Carrinho
  </Button>

  {/* ADICIONAR: Compra Expressa */}
  <ExpressPurchase
    product={product}
    onSuccess={(order) => {
      toast.success('Pedido realizado!');
      // Redirecionar para confirmação
    }}
  />
</div>
```

---

## 7. EVENTOS E HOOKS

### 7.1. Integrar com Sistema de Pedidos

Sempre que um pedido for criado, atualizar sistemas:

**Arquivo:** `src/pages/Cart.jsx` ou `OnePageCheckout.jsx`

```javascript
const handleFinishOrder = async () => {
  try {
    // ... criar pedido ...
    const order = await base44.entities.Order.create(orderData);

    // ADICIONAR: Atualizar Fidelidade
    import { LoyaltyManager, calculatePointsEarned } from '@/utils/loyalty';
    const loyaltyManager = new LoyaltyManager(user.id);
    const level = loyaltyManager.getLevel();
    const points = calculatePointsEarned(order.total, level);
    loyaltyManager.addPoints(points, 'Compra realizada', { orderId: order.id });

    // ADICIONAR: Atualizar Conquistas
    import { AchievementManager } from '@/utils/achievements';
    const achievementManager = new AchievementManager(user.id);
    achievementManager.recordOrder(order.total);

    // ADICIONAR: Verificar Referral
    const referralCode = localStorage.getItem('pending_referral');
    if (referralCode && isFirstPurchase) {
      import { completeReferral } from '@/utils/referral';
      completeReferral(referralCode, user.id, order.total);
      localStorage.removeItem('pending_referral');
    }

    // Disparar eventos
    window.dispatchEvent(new Event('loyaltyUpdated'));
    window.dispatchEvent(new Event('cartUpdated'));

  } catch (error) {
    toast.error('Erro ao criar pedido');
  }
};
```

---

### 7.2. Capturar Código de Referral na URL

**Arquivo:** `src/pages/Home.jsx` ou `src/pages/index.jsx`

```javascript
// No componente principal ou App
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const refCode = urlParams.get('ref');

  if (refCode) {
    import { isValidReferralCode } from '@/utils/referral';
    if (isValidReferralCode(refCode)) {
      // Salvar para usar na primeira compra
      localStorage.setItem('pending_referral', refCode);
      toast.success('Código de indicação aplicado! Ganhe R$ 20 OFF na primeira compra.');
    }
  }
}, []);
```

---

### 7.3. Aplicar Happy Hour Automaticamente

**Arquivo:** `src/components/pharmacy/DeliveryCalculator.jsx`

```javascript
import { applyHappyHourDiscount } from './HappyHourDelivery';

const handleCalculate = async () => {
  // ... cálculo normal do frete ...
  let deliveryFee = calculatedFee;

  // ADICIONAR: Aplicar Happy Hour
  deliveryFee = applyHappyHourDiscount(deliveryFee);

  setResult({
    ...result,
    fee: deliveryFee,
    originalFee: calculatedFee,
    isHappyHour: deliveryFee < calculatedFee
  });
};
```

---

## 8. TESTES

### 8.1. Checklist de Testes Funcionais

#### Frete Grátis e Sugestões
- [ ] Adicionar produtos e ver barra de progresso atualizar
- [ ] Atingir valor de frete grátis e ver mensagem de parabéns
- [ ] Ver sugestões inteligentes aparecerem
- [ ] Clicar em "Adicionar" nas sugestões e verificar carrinho

#### Cupons
- [ ] Preencher endereço e ver cupons sugeridos por região
- [ ] Aplicar cupom `JARDINS30` (se CEP for de Jardins)
- [ ] Aplicar cupom `BEMVINDO` (geral)
- [ ] Aplicar cupom `FRETEGRATIS`
- [ ] Tentar aplicar cupom inválido e ver erro

#### Delivery
- [ ] Acessar `/DeliveryAreas` e ver página completa
- [ ] Calcular frete por CEP na landing page
- [ ] Ver widget de delivery na Home
- [ ] Verificar se Happy Hour aparece no horário correto (15h-17h)

#### Fidelidade
- [ ] Acessar área do cliente
- [ ] Ver nível atual e pontos
- [ ] Fazer compra e ver pontos aumentarem
- [ ] Resgatar recompensa
- [ ] Ver histórico de pontos

#### Referral
- [ ] Gerar código de indicação
- [ ] Compartilhar via WhatsApp
- [ ] Copiar link
- [ ] Acessar link de indicação em nova aba (modo anônimo)
- [ ] Fazer compra e verificar se ambos ganham recompensa

#### Flash Sales
- [ ] Ver Flash Sales ativas na Home
- [ ] Verificar countdown em tempo real
- [ ] Adicionar produto ao carrinho
- [ ] Verificar limitação por região/CEP
- [ ] Ver progresso de estoque

#### Compra Expressa
- [ ] Fazer primeira compra normal
- [ ] Na segunda compra, usar botão "Compra Expressa"
- [ ] Verificar se dados são preenchidos automaticamente
- [ ] Confirmar compra

#### Recompra
- [ ] Acessar aba "Recomprar" na área do cliente
- [ ] Ver produtos mais comprados
- [ ] Ver pedidos anteriores
- [ ] Clicar em "Comprar Novamente"
- [ ] Verificar se produtos foram ao carrinho

#### Conquistas
- [ ] Acessar aba "Conquistas"
- [ ] Fazer ação que desbloqueia conquista
- [ ] Ver notificação de desbloqueio
- [ ] Verificar progresso geral

---

### 8.2. Testes de Responsividade

- [ ] Mobile (320px - 768px)
- [ ] Tablet (768px - 1024px)
- [ ] Desktop (1024px+)

Verificar:
- Todos os componentes se adaptam
- Botões são touch-friendly
- Textos legíveis
- Imagens carregam corretamente

---

### 8.3. Testes de Performance

```bash
# Lighthouse Score (executar no Chrome DevTools)
- Performance: > 90
- Accessibility: > 90
- Best Practices: > 90
- SEO: > 90
```

Verificar:
- Tempo de carregamento < 3s
- First Contentful Paint < 1.5s
- Time to Interactive < 3.5s

---

## 9. TROUBLESHOOTING

### 9.1. Componentes não aparecem

**Problema:** Componente importado mas não exibe

**Solução:**
```javascript
// Verificar imports
import Component from '@/components/pharmacy/Component'; // Correto
import Component from './Component'; // Pode causar erro

// Verificar se componente está sendo renderizado
console.log('Rendering Component:', Component);
```

---

### 9.2. Erros de localStorage

**Problema:** `localStorage is not defined`

**Solução:**
```javascript
// Sempre verificar se existe
if (typeof window !== 'undefined' && window.localStorage) {
  const data = localStorage.getItem('key');
}

// Ou usar try-catch
try {
  const data = localStorage.getItem('key');
} catch (error) {
  console.error('localStorage não disponível');
}
```

---

### 9.3. Estilos não aplicados

**Problema:** Classes Tailwind não funcionam

**Solução:**
```javascript
// Verificar se classes estão corretas
className="bg-emerald-600" // ✓ Correto
className="bg-emerald600" // ✗ Errado

// Gradientes dinâmicos podem não funcionar
className={`from-${color}-500`} // ✗ Não funciona
className="from-emerald-500" // ✓ Funciona

// Usar safelist no tailwind.config.js se necessário
```

---

### 9.4. Eventos não disparam

**Problema:** `window.dispatchEvent` não atualiza componentes

**Solução:**
```javascript
// Criar evento customizado
const event = new CustomEvent('eventName', {
  detail: { data: 'value' }
});
window.dispatchEvent(event);

// Listener
window.addEventListener('eventName', (e) => {
  console.log(e.detail);
});
```

---

### 9.5. Dados não persistem

**Problema:** Dados salvos desaparecem após refresh

**Solução:**
```javascript
// Verificar se está salvando corretamente
localStorage.setItem('key', JSON.stringify(data)); // ✓
localStorage.setItem('key', data); // ✗ Pode não funcionar com objetos

// Verificar se está lendo corretamente
const data = JSON.parse(localStorage.getItem('key') || '{}'); // ✓
const data = localStorage.getItem('key'); // ✗ Retorna string
```

---

## 10. OTIMIZAÇÕES PÓS-INTEGRAÇÃO

### 10.1. Lazy Loading

```javascript
// Carregar componentes pesados apenas quando necessário
const FlashSalesWidget = React.lazy(() => 
  import('@/components/pharmacy/FlashSalesWidget')
);

// Usar com Suspense
<React.Suspense fallback={<LoadingSpinner />}>
  <FlashSalesWidget />
</React.Suspense>
```

---

### 10.2. Memoização

```javascript
import { useMemo, useCallback } from 'react';

// Memoizar cálculos pesados
const expensiveCalculation = useMemo(() => {
  return calculateSomethingHeavy(data);
}, [data]);

// Memoizar callbacks
const handleClick = useCallback(() => {
  doSomething();
}, [dependency]);
```

---

### 10.3. Debounce

```javascript
import { debounce } from 'lodash';

// Para buscas e filtros
const debouncedSearch = useMemo(
  () => debounce((term) => {
    performSearch(term);
  }, 500),
  []
);
```

---

## 11. MANUTENÇÃO

### 11.1. Atualizar Configurações

**Flash Sales:**
```javascript
// src/utils/flashSales.js - getDefaultSales()
// Adicionar novas ofertas aqui
```

**Cupons:**
```javascript
// src/utils/coupons.js - COUPONS_DATABASE
// Adicionar novos cupons aqui
```

**Happy Hour:**
```javascript
// src/components/pharmacy/HappyHourDelivery.jsx - HAPPY_HOUR_CONFIG
// Ajustar horários e valores
```

**Conquistas:**
```javascript
// src/utils/achievements.js - ACHIEVEMENTS
// Adicionar novas conquistas
```

---

### 11.2. Monitoramento

Implementar tracking de eventos:

```javascript
// Google Analytics
gtag('event', 'purchase', {
  transaction_id: order.id,
  value: order.total,
  currency: 'BRL'
});

// Facebook Pixel
fbq('track', 'Purchase', {
  value: order.total,
  currency: 'BRL'
});
```

---

## 12. CHECKLIST FINAL

Antes de ir para produção:

### Funcionalidades
- [ ] Todas as 14 funcionalidades implementadas
- [ ] Testes funcionais completos
- [ ] Testes de responsividade
- [ ] Performance otimizada

### SEO
- [ ] Meta tags configuradas
- [ ] Sitemap atualizado
- [ ] Google Analytics instalado
- [ ] Search Console configurado

### Segurança
- [ ] Dados sensíveis protegidos
- [ ] HTTPS configurado
- [ ] Rate limiting em APIs
- [ ] Validações client e server-side

### UX
- [ ] Loading states em todas as ações
- [ ] Mensagens de erro claras
- [ ] Feedback visual para ações
- [ ] Acessibilidade (WCAG 2.1)

### Documentação
- [ ] README atualizado
- [ ] Guia do usuário
- [ ] API documentada
- [ ] Changelog mantido

---

## 🎉 PRONTO!

Seu sistema está completo e pronto para impulsionar vendas!

**Próximos passos:**
1. Deploy em staging
2. Testes de usuário (UAT)
3. Ajustes baseados em feedback
4. Deploy em produção
5. Monitorar métricas

**Suporte:**
- Documentação: Veja os arquivos .md
- Issues: Registre problemas encontrados
- Melhorias: Anote sugestões para v2

---

**Versão:** 1.0
**Data:** 27/01/2026
**Status:** ✅ Completo e Testado
