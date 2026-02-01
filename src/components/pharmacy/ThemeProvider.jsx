import React, { createContext, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

const ThemeContext = createContext(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export default function ThemeProvider({ children }) {
  const { data: settings, isLoading } = useQuery({
    queryKey: ['pharmacySettings'],
    queryFn: async () => {
      const data = await base44.entities.PharmacySettings.list('', 1);
      return data && data.length > 0 ? data[0] : null;
    }
  });

  // Apply theme styles to root
  useEffect(() => {
    if (!settings) return;

    const theme = settings.theme || {};
    const colors = theme.colors || {};
    const radius = theme.radius || {};

    // Apply CSS variables
    document.documentElement.style.setProperty('--color-primary', colors.primary || '#059669');
    document.documentElement.style.setProperty('--color-secondary', colors.secondary || '#0d9488');
    document.documentElement.style.setProperty('--color-background', colors.background || '#ffffff');
    document.documentElement.style.setProperty('--color-text', colors.text || '#1f2937');
    document.documentElement.style.setProperty('--color-card', colors.card || '#ffffff');
    
    document.documentElement.style.setProperty('--radius-card', radius.card || '16px');
    document.documentElement.style.setProperty('--radius-button', radius.button || '12px');
    document.documentElement.style.setProperty('--radius-input', radius.input || '8px');

    // Apply shadow
    const shadowMap = {
      flat: 'none',
      soft: '0 2px 8px rgba(0,0,0,0.08)',
      strong: '0 4px 16px rgba(0,0,0,0.15)'
    };
    document.documentElement.style.setProperty('--shadow', shadowMap[theme.shadow] || shadowMap.soft);

    // Apply font
    const fontMap = {
      inter: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      poppins: "'Poppins', sans-serif",
      roboto: "'Roboto', sans-serif",
      montserrat: "'Montserrat', sans-serif",
      lato: "'Lato', sans-serif"
    };
    document.documentElement.style.setProperty('--font-family', fontMap[theme.font] || fontMap.inter);
  }, [settings]);

  const theme = settings?.theme || {};
  const colors = theme.colors || {};
  const radius = theme.radius || {};
  const layout = settings?.layout || {};
  const sections = settings?.sections || {};

  const themeContext = {
    // New theme structure
    colors: {
      primary: colors.primary || '#059669',
      secondary: colors.secondary || '#0d9488',
      background: colors.background || '#ffffff',
      text: colors.text || '#1f2937',
      card: colors.card || '#ffffff'
    },
    radius: {
      card: radius.card || '16px',
      button: radius.button || '12px',
      input: radius.input || '8px'
    },
    shadow: theme.shadow || 'soft',
    font: theme.font || 'inter',
    
    // Layout configuration
    layout: {
      headerStyle: layout.headerStyle || 'withSearch',
      productCardStyle: layout.productCardStyle || 'modern',
      gridStyle: layout.gridStyle || 'adaptive',
      homeSections: layout.homeSections || [
        {id: '1', type: 'hero', enabled: true, order: 1},
        {id: '2', type: 'categories', enabled: true, order: 2},
        {id: '3', type: 'promotions', enabled: true, order: 3},
        {id: '4', type: 'featured', enabled: true, order: 4},
        {id: '5', type: 'cta', enabled: true, order: 5}
      ]
    },
    
    // Financial configs
    installments: settings?.installments || 3,
    installmentHasInterest: settings?.installmentHasInterest || false,
    
    // Section configs
    sections: {
      hero: sections.hero || {enabled: true, animation: 'slide', height: 'medium'},
      categories: sections.categories || {enabled: true, style: 'grid'},
      promotions: sections.promotions || {enabled: true, limit: 8},
      featured: sections.featured || {enabled: true, limit: 8},
      cta: sections.cta || {enabled: true, title: 'Envie sua Receita'}
    },
    
    // Branding
    logo: settings?.logo_url || '',
    logoScale: settings?.logo_scale || 1,
    pharmacyName: settings?.pharmacy_name || 'Farmácia',
    description: settings?.description || '',
    whatsapp: settings?.whatsapp || '',
    phone: settings?.phone || '',
    email: settings?.email || '',
    address: settings?.address || {
      street: settings?.address?.street || '',
      number: settings?.address?.number || '',
      complement: settings?.address?.complement || '',
      neighborhood: settings?.address?.neighborhood || '',
      city: settings?.address?.city || '',
      state: settings?.address?.state || '',
      zipcode: settings?.address?.zipcode || ''
    },
    openingHours: settings?.opening_hours || {},
    socialMedia: settings?.social_media || [],
    quickLinks: settings?.quick_links || [],
    cnpj: settings?.cnpj || '',
    pharmacistName: settings?.pharmacist_name || '',
    pharmacistCrf: settings?.pharmacist_crf || '',
    
    // Banners
    banners: settings?.banners || [],
    
    // Delivery
    deliveryFeeBase: settings?.delivery_fee_base || 0,
    freeDeliveryAbove: settings?.free_delivery_above || 0,
    
    // Order mode
    orderMode: settings?.order_mode || 'app',
    
    // Helper functions
    getShadow: () => {
      const shadowMap = {
        flat: 'none',
        soft: '0 2px 8px rgba(0,0,0,0.08)',
        strong: '0 4px 16px rgba(0,0,0,0.15)'
      };
      return shadowMap[theme.shadow] || shadowMap.soft;
    },
    
    getFontFamily: () => {
      const fontMap = {
        inter: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        poppins: "'Poppins', sans-serif",
        roboto: "'Roboto', sans-serif",
        montserrat: "'Montserrat', sans-serif",
        lato: "'Lato', sans-serif"
      };
      return fontMap[theme.font] || fontMap.inter;
    },
    
    getPrimaryGradient: () => {
      return `linear-gradient(135deg, ${colors.primary || '#059669'}, ${colors.secondary || '#0d9488'})`;
    },
    
    getGridCols: () => {
      const gridMap = {
        '2cols': 2,
        '3cols': 3,
        'adaptive': 4
      };
      return gridMap[layout.gridStyle] || 4;
    },
    
    getButtonRadius: () => {
      return radius.button || '12px';
    },
    
    getCardRadius: () => {
      return radius.card || '16px';
    },
    
    // Legacy support (backward compatibility)
    primaryColor: colors.primary || '#059669',
    secondaryColor: colors.secondary || '#0d9488',
    backgroundColor: colors.background || '#ffffff',
    textColor: colors.text || '#1f2937',
    
    // Settings
    settings,
    isLoading
  };

  return (
    <ThemeContext.Provider value={themeContext}>
      {children}
    </ThemeContext.Provider>
  );
}