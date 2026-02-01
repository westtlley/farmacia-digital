// Sistema de armazenamento local que substitui o base44
class LocalStorageDB {
  constructor() {
    this.init();
  }

  init() {
    // Inicializar dados padrão se não existirem
    const entities = ['Product', 'Order', 'Category', 'Promotion', 'BlogPost', 'Prescription', 'Customer', 'Banner', 'PharmacySettings', 'ImportLog'];
    
    entities.forEach(entity => {
      if (!localStorage.getItem(`db_${entity}`)) {
        localStorage.setItem(`db_${entity}`, JSON.stringify([]));
      }
    });

    // Inicializar usuário padrão
    if (!localStorage.getItem('db_currentUser')) {
      localStorage.setItem('db_currentUser', JSON.stringify({
        id: 'user_1',
        email: 'admin@farmacia.com',
        full_name: 'Administrador',
        role: 'admin'
      }));
    }

    // Inicializar categorias padrão
    if (!localStorage.getItem('db_Category') || JSON.parse(localStorage.getItem('db_Category')).length === 0) {
      const defaultCategories = [
        { id: 'cat_1', name: 'Medicamentos', slug: 'medicamentos', description: 'Medicamentos diversos', created_date: new Date().toISOString() },
        { id: 'cat_2', name: 'Dermocosméticos', slug: 'dermocosmeticos', description: 'Produtos dermocosméticos', created_date: new Date().toISOString() },
        { id: 'cat_3', name: 'Vitaminas', slug: 'vitaminas', description: 'Suplementos vitamínicos', created_date: new Date().toISOString() },
        { id: 'cat_4', name: 'Higiene', slug: 'higiene', description: 'Produtos de higiene', created_date: new Date().toISOString() },
        { id: 'cat_5', name: 'Infantil', slug: 'infantil', description: 'Produtos infantis', created_date: new Date().toISOString() },
        { id: 'cat_6', name: 'Mamãe & Bebê', slug: 'mamae_bebe', description: 'Produtos para mamãe e bebê', created_date: new Date().toISOString() },
        { id: 'cat_7', name: 'Beleza', slug: 'beleza', description: 'Produtos de beleza', created_date: new Date().toISOString() },
        { id: 'cat_8', name: 'Diabetes', slug: 'diabetes', description: 'Produtos para diabetes', created_date: new Date().toISOString() },
        { id: 'cat_9', name: 'Nutrição', slug: 'nutricao', description: 'Produtos nutricionais', created_date: new Date().toISOString() },
        { id: 'cat_10', name: 'Ortopedia', slug: 'ortopedia', description: 'Produtos ortopédicos', created_date: new Date().toISOString() },
        { id: 'cat_11', name: 'Primeiros Socorros', slug: 'primeiros_socorros', description: 'Primeiros socorros', created_date: new Date().toISOString() },
        { id: 'cat_12', name: 'Equipamentos', slug: 'equipamentos', description: 'Equipamentos médicos', created_date: new Date().toISOString() }
      ];
      localStorage.setItem('db_Category', JSON.stringify(defaultCategories));
    }

    // Inicializar configurações da farmácia
    if (!localStorage.getItem('db_PharmacySettings') || JSON.parse(localStorage.getItem('db_PharmacySettings')).length === 0) {
      const defaultSettings = [{
        id: 'settings_1',
        name: 'Farmácia Digital',
        primary_color: '#10b981',
        secondary_color: '#059669',
        logo_url: '',
        banner_url: '',
        sections: {
          featured: { limit: 8 },
          promotions: { limit: 8 }
        },
        layout: {
          homeSections: [
            { id: '1', type: 'hero', enabled: true, order: 1 },
            { id: '2', type: 'categories', enabled: true, order: 2 },
            { id: '3', type: 'promotions', enabled: true, order: 3 },
            { id: '4', type: 'featured', enabled: true, order: 4 },
            { id: '5', type: 'cta', enabled: true, order: 5 }
          ]
        },
        banners: [],
        created_date: new Date().toISOString()
      }];
      localStorage.setItem('db_PharmacySettings', JSON.stringify(defaultSettings));
    }
  }

  getAll(entity) {
    const data = localStorage.getItem(`db_${entity}`);
    return data ? JSON.parse(data) : [];
  }

  getById(entity, id) {
    const items = this.getAll(entity);
    return items.find(item => item.id === id);
  }

  filter(entity, filters = {}, sortBy = '', limit = null) {
    let items = this.getAll(entity);
    
    // Aplicar filtros
    if (filters && Object.keys(filters).length > 0) {
      items = items.filter(item => {
        return Object.keys(filters).every(key => {
          const filterValue = filters[key];
          const itemValue = item[key];
          
          if (filterValue === undefined || filterValue === null) return true;
          if (itemValue === undefined || itemValue === null) return false;
          
          // Busca especial por ID - permite buscar por nome, SKU ou EAN
          if (key === 'id' && typeof filterValue === 'string') {
            const searchLower = filterValue.toLowerCase();
            const searchNumbers = filterValue.replace(/\D/g, '');
            
            return item.id === filterValue ||
                   item.name?.toLowerCase().includes(searchLower) ||
                   item.sku?.toLowerCase().includes(searchLower) ||
                   (searchNumbers && item.sku?.replace(/\D/g, '').includes(searchNumbers)) ||
                   item.barcode?.includes(filterValue) ||
                   item.ean?.includes(filterValue) ||
                   (searchNumbers && (item.barcode?.replace(/\D/g, '').includes(searchNumbers) || 
                                     item.ean?.replace(/\D/g, '').includes(searchNumbers)));
          }
          
          // Comparação de strings (case insensitive)
          if (typeof filterValue === 'string' && typeof itemValue === 'string') {
            return itemValue.toLowerCase().includes(filterValue.toLowerCase());
          }
          
          // Comparação exata
          return itemValue === filterValue;
        });
      });
    }

    // Aplicar ordenação
    if (sortBy) {
      const isDesc = sortBy.startsWith('-');
      const field = isDesc ? sortBy.substring(1) : sortBy;
      
      items.sort((a, b) => {
        let aVal = a[field];
        let bVal = b[field];
        
        // Tratar datas
        if (field.includes('date') || field.includes('created') || field.includes('updated')) {
          aVal = new Date(aVal || 0).getTime();
          bVal = new Date(bVal || 0).getTime();
        }
        
        // Tratar strings
        if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = (bVal || '').toLowerCase();
        }
        
        if (aVal < bVal) return isDesc ? 1 : -1;
        if (aVal > bVal) return isDesc ? -1 : 1;
        return 0;
      });
    }

    // Aplicar limite
    if (limit && limit > 0) {
      items = items.slice(0, limit);
    }

    return items;
  }

  create(entity, data) {
    const items = this.getAll(entity);
    const newItem = {
      id: `${entity.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...data,
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString()
    };
    items.push(newItem);
    localStorage.setItem(`db_${entity}`, JSON.stringify(items));
    return newItem;
  }

  update(entity, id, data) {
    const items = this.getAll(entity);
    const index = items.findIndex(item => item.id === id);
    
    if (index === -1) {
      throw new Error(`${entity} with id ${id} not found`);
    }
    
    items[index] = {
      ...items[index],
      ...data,
      updated_date: new Date().toISOString()
    };
    
    localStorage.setItem(`db_${entity}`, JSON.stringify(items));
    return items[index];
  }

  delete(entity, id) {
    const items = this.getAll(entity);
    const filtered = items.filter(item => item.id !== id);
    localStorage.setItem(`db_${entity}`, JSON.stringify(filtered));
    return { success: true };
  }

  bulkCreate(entity, items) {
    const existing = this.getAll(entity);
    const newItems = items.map(data => ({
      id: `${entity.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...data,
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString()
    }));
    existing.push(...newItems);
    localStorage.setItem(`db_${entity}`, JSON.stringify(existing));
    return newItems;
  }
}

export const db = new LocalStorageDB();
