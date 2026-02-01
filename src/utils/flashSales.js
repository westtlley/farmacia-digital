/**
 * Sistema de Flash Sales Regionais
 * Promoções relâmpago específicas por bairro/região
 */

/**
 * Estrutura de uma Flash Sale
 */
export class FlashSale {
  constructor(data) {
    this.id = data.id || Date.now().toString();
    this.title = data.title;
    this.description = data.description;
    this.productId = data.productId;
    this.productName = data.productName;
    this.originalPrice = data.originalPrice;
    this.salePrice = data.salePrice;
    this.discountPercent = Math.round(((data.originalPrice - data.salePrice) / data.originalPrice) * 100);
    this.stock = data.stock;
    this.maxPerCustomer = data.maxPerCustomer || 3;
    this.startTime = new Date(data.startTime);
    this.endTime = new Date(data.endTime);
    this.regions = data.regions || []; // Array de CEP prefixes ou 'all'
    this.neighborhoods = data.neighborhoods || [];
    this.active = data.active !== false;
    this.imageUrl = data.imageUrl;
    this.sold = data.sold || 0;
  }

  isActive() {
    const now = new Date();
    return this.active && now >= this.startTime && now <= this.endTime && this.stock > 0;
  }

  isUpcoming() {
    const now = new Date();
    return this.active && now < this.startTime;
  }

  isExpired() {
    const now = new Date();
    return now > this.endTime || this.stock <= 0;
  }

  getTimeRemaining() {
    const now = new Date();
    const target = this.isUpcoming() ? this.startTime : this.endTime;
    const diff = target - now;

    if (diff <= 0) {
      return { hours: 0, minutes: 0, seconds: 0, total: 0 };
    }

    return {
      hours: Math.floor(diff / (1000 * 60 * 60)),
      minutes: Math.floor((diff / (1000 * 60)) % 60),
      seconds: Math.floor((diff / 1000) % 60),
      total: diff
    };
  }

  getProgress() {
    if (this.stock === 0) return 100;
    const totalStock = this.stock + this.sold;
    return Math.round((this.sold / totalStock) * 100);
  }

  canPurchase(zipCode, quantity = 1) {
    if (!this.isActive()) {
      return { can: false, reason: 'Promoção não está ativa' };
    }

    if (quantity > this.maxPerCustomer) {
      return { can: false, reason: `Máximo ${this.maxPerCustomer} unidades por cliente` };
    }

    if (quantity > this.stock) {
      return { can: false, reason: `Apenas ${this.stock} unidade(s) disponível(eis)` };
    }

    // Verificar região
    if (this.regions.length > 0 && !this.regions.includes('all')) {
      const zipPrefix = zipCode.replace(/\D/g, '').substring(0, 5);
      const isValidRegion = this.regions.some(region => zipPrefix.startsWith(region));
      
      if (!isValidRegion) {
        const neighborhoodsStr = this.neighborhoods.join(', ');
        return { 
          can: false, 
          reason: `Oferta válida apenas para: ${neighborhoodsStr || 'regiões específicas'}` 
        };
      }
    }

    return { can: true };
  }

  reduceStock(quantity) {
    if (quantity > this.stock) {
      throw new Error('Estoque insuficiente');
    }
    this.stock -= quantity;
    this.sold += quantity;
  }
}

/**
 * Gerenciador de Flash Sales
 */
export class FlashSalesManager {
  constructor() {
    this.storageKey = 'flash_sales';
    this.load();
  }

  load() {
    const data = localStorage.getItem(this.storageKey);
    if (data) {
      const parsed = JSON.parse(data);
      this.sales = parsed.map(s => new FlashSale(s));
    } else {
      this.sales = this.getDefaultSales();
      this.save();
    }
  }

  save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.sales));
  }

  getDefaultSales() {
    // Exemplos de Flash Sales (em produção, viriam do backend)
    const now = new Date();
    const inTwoHours = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const inSixHours = new Date(now.getTime() + 6 * 60 * 60 * 1000);

    return [
      new FlashSale({
        title: '⚡ FLASH SALE - JARDINS',
        description: 'Dipirona 1g - Apenas para o bairro Jardins',
        productId: 'prod_001',
        productName: 'Dipirona 1g com 10 comprimidos',
        originalPrice: 12.90,
        salePrice: 5.90,
        stock: 50,
        maxPerCustomer: 3,
        startTime: now,
        endTime: inSixHours,
        regions: ['01400', '01401', '01402'],
        neighborhoods: ['Jardins'],
        active: true
      }),
      new FlashSale({
        title: '🔥 SUPER OFERTA - MOEMA',
        description: 'Vitamina C 500mg - Exclusivo Moema',
        productId: 'prod_002',
        productName: 'Vitamina C 500mg com 30 cápsulas',
        originalPrice: 29.90,
        salePrice: 14.90,
        stock: 30,
        maxPerCustomer: 2,
        startTime: now,
        endTime: inSixHours,
        regions: ['04560', '04561'],
        neighborhoods: ['Moema'],
        active: true
      }),
      new FlashSale({
        title: '💥 PRÓXIMA OFERTA - VILA MARIANA',
        description: 'Paracetamol 750mg - Começa em 2h',
        productId: 'prod_003',
        productName: 'Paracetamol 750mg com 20 comprimidos',
        originalPrice: 15.90,
        salePrice: 7.90,
        stock: 40,
        maxPerCustomer: 3,
        startTime: inTwoHours,
        endTime: inSixHours,
        regions: ['04010', '04011'],
        neighborhoods: ['Vila Mariana'],
        active: true
      })
    ];
  }

  getActiveSales(zipCode = null) {
    let sales = this.sales.filter(s => s.isActive());

    if (zipCode) {
      const zipPrefix = zipCode.replace(/\D/g, '').substring(0, 5);
      sales = sales.filter(s => {
        if (s.regions.includes('all')) return true;
        return s.regions.some(region => zipPrefix.startsWith(region));
      });
    }

    return sales;
  }

  getUpcomingSales(zipCode = null) {
    let sales = this.sales.filter(s => s.isUpcoming());

    if (zipCode) {
      const zipPrefix = zipCode.replace(/\D/g, '').substring(0, 5);
      sales = sales.filter(s => {
        if (s.regions.includes('all')) return true;
        return s.regions.some(region => zipPrefix.startsWith(region));
      });
    }

    return sales;
  }

  getSaleById(id) {
    return this.sales.find(s => s.id === id);
  }

  purchaseSale(saleId, zipCode, quantity = 1) {
    const sale = this.getSaleById(saleId);
    if (!sale) {
      throw new Error('Oferta não encontrada');
    }

    const check = sale.canPurchase(zipCode, quantity);
    if (!check.can) {
      throw new Error(check.reason);
    }

    sale.reduceStock(quantity);
    this.save();

    return {
      success: true,
      sale: sale,
      quantity: quantity,
      totalSaved: (sale.originalPrice - sale.salePrice) * quantity
    };
  }

  addSale(saleData) {
    const sale = new FlashSale(saleData);
    this.sales.push(sale);
    this.save();
    return sale;
  }

  updateSale(saleId, updates) {
    const sale = this.getSaleById(saleId);
    if (sale) {
      Object.assign(sale, updates);
      this.save();
    }
    return sale;
  }

  removeSale(saleId) {
    this.sales = this.sales.filter(s => s.id !== saleId);
    this.save();
  }

  getStats() {
    return {
      total: this.sales.length,
      active: this.sales.filter(s => s.isActive()).length,
      upcoming: this.sales.filter(s => s.isUpcoming()).length,
      expired: this.sales.filter(s => s.isExpired()).length,
      totalSold: this.sales.reduce((sum, s) => sum + s.sold, 0)
    };
  }
}

/**
 * Formata tempo restante para exibição
 * @param {object} time - { hours, minutes, seconds }
 * @returns {string}
 */
export function formatTimeRemaining(time) {
  const { hours, minutes, seconds } = time;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Formata progresso para exibição
 * @param {FlashSale} sale
 * @returns {string}
 */
export function formatSaleProgress(sale) {
  const remaining = sale.stock;
  const total = sale.stock + sale.sold;
  return `${remaining} de ${total} disponíveis`;
}
