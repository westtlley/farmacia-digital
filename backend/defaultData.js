export const DEFAULT_SETTINGS_ID = 'settings_1';

export function defaultCategories() {
  const now = new Date().toISOString();
  return [
    { id: 'cat_1', name: 'Medicamentos', slug: 'medicamentos', created_date: now, updated_date: now },
    { id: 'cat_2', name: 'Dermocosmeticos', slug: 'dermocosmeticos', created_date: now, updated_date: now },
    { id: 'cat_3', name: 'Vitaminas', slug: 'vitaminas', created_date: now, updated_date: now },
    { id: 'cat_4', name: 'Higiene', slug: 'higiene', created_date: now, updated_date: now },
    { id: 'cat_5', name: 'Infantil', slug: 'infantil', created_date: now, updated_date: now },
  ];
}

export function defaultSettings() {
  const now = new Date().toISOString();
  return {
    id: DEFAULT_SETTINGS_ID,
    pharmacy_name: 'Farmacia Digital',
    description: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: {
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      zipcode: '',
      maps_link: '',
    },
    opening_hours: {
      weekdays: '',
      saturday: '',
      sunday: '',
    },
    social_media: [],
    quick_links: [],
    cnpj: '',
    license_number: '',
    pharmacist_name: '',
    pharmacist_crf: '',
    delivery_fee_base: 0,
    free_delivery_above: 150,
    logo_url: '',
    logo_scale: 1,
    banners: [],
    order_mode: 'app',
    installments: 3,
    installmentHasInterest: false,
    theme: {
      colors: {
        primary: '#059669',
        secondary: '#0d9488',
        background: '#ffffff',
        text: '#1f2937',
        card: '#ffffff',
      },
      radius: {
        button: '12px',
        card: '16px',
        input: '8px',
      },
      shadow: 'soft',
      font: 'inter',
    },
    layout: {
      headerStyle: 'withSearch',
      productCardStyle: 'modern',
      gridStyle: 'adaptive',
      homeSections: [
        { id: '1', type: 'hero', enabled: true, order: 1 },
        { id: '2', type: 'categories', enabled: true, order: 2 },
        { id: '3', type: 'promotions', enabled: true, order: 3 },
        { id: '4', type: 'featured', enabled: true, order: 4 },
        { id: '5', type: 'cta', enabled: true, order: 5 },
      ],
    },
    sections: {
      hero: { enabled: true, animation: 'slide', height: 'medium' },
      categories: { enabled: true, style: 'grid' },
      promotions: { enabled: true, limit: 8 },
      featured: { enabled: true, limit: 8 },
      cta: { enabled: true, title: 'Envie sua Receita' },
    },
    created_date: now,
    updated_date: now,
  };
}
