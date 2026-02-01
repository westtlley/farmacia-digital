import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Save, 
  Upload, 
  Palette, 
  ImagePlus,
  Eye,
  Trash2,
  Plus,
  Settings,
  Sparkles,
  Layout,
  Type,
  Smartphone,
  MapPin,
  MessageCircle,
  RefreshCw,
  Check,
  AlertCircle,
  Star,
  Search,
  X
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import AdminSidebar from '@/components/admin/AdminSidebar';
import { useAdminSidebar } from '@/contexts/AdminSidebarContext';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { validateSettingsForm, validateImage, parseMoney } from '@/utils/validation';
import { applyPhoneMask, formatPhoneNumber } from '@/utils/phoneFormat';
import { validateEmail, formatCEP, validateCEP, formatCNPJ, validateCNPJ, formatCurrency, unformatCurrency } from '@/utils/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const { sidebarOpen } = useAdminSidebar();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const autoSaveTimeoutRef = useRef(null);
  const [previewMode, setPreviewMode] = useState('light'); // 'light' ou 'dark'
  const [searchTerm, setSearchTerm] = useState('');
  const [favoritePalettes, setFavoritePalettes] = useState(() => {
    const saved = localStorage.getItem('favoritePalettes');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [formData, setFormData] = useState({
    pharmacy_name: '',
    description: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: {
      street: '',
      number: '',
      neighborhood: '',
      city: '',
      state: '',
      zipcode: '',
      maps_link: ''
    },
    opening_hours: {
      weekdays: '',
      saturday: '',
      sunday: ''
    },
    social_media: [],
    quick_links: [],
    cnpj: '',
    license_number: '',
    pharmacist_name: '',
    pharmacist_crf: '',
    delivery_fee_base: '',
    free_delivery_above: '',
    logo_url: '',
    logo_scale: 1,
    primary_color: '#059669',
    secondary_color: '#0d9488',
    button_color: '#059669',
    background_color: '#ffffff',
    text_color: '#1f2937',
    font_family: 'inter',
    button_style: 'rounded',
    theme_mode: 'light',
    layout_style: 'comfortable',
    design_style: 'modern',
    banners: [],
    order_mode: 'app', // 'app' ou 'whatsapp'
    installments: 3, // Número de parcelas padrão
    installmentHasInterest: false // Se as parcelas têm juros
  });

  const { data: settings } = useQuery({
    queryKey: ['pharmacySettings'],
    queryFn: async () => {
      const data = await base44.entities.PharmacySettings.list('', 1);
      if (data && data.length > 0) {
        const settingsData = data[0];
        const initialData = {
          ...settingsData,
          phone: settingsData.phone ? formatPhoneNumber(settingsData.phone) : '',
          whatsapp: settingsData.whatsapp ? formatPhoneNumber(settingsData.whatsapp) : '',
          banners: settingsData.banners || [],
          order_mode: settingsData.order_mode || 'app',
          installments: settingsData.installments || 3,
          installmentHasInterest: settingsData.installmentHasInterest || false,
          // Garantir que theme seja inicializado corretamente
          theme: settingsData.theme || {
            colors: {
              primary: settingsData.primary_color || '#059669',
              secondary: settingsData.secondary_color || '#0d9488',
              background: settingsData.background_color || '#ffffff',
              text: settingsData.text_color || '#1f2937',
              card: '#ffffff'
            },
            radius: {
              button: '12px',
              card: '16px',
              input: '8px'
            },
            shadow: 'soft',
            font: settingsData.font_family || 'inter'
          }
        };
        setFormData(initialData);
        setHasUnsavedChanges(false);
        return settingsData;
      }
      return null;
    }
  });

  // Calcular progresso de configuração
  const progress = React.useMemo(() => {
    const sections = {
      info: {
        name: 'Loja',
        fields: [
          formData.pharmacy_name,
          formData.phone,
          formData.email,
          formData.address?.street,
          formData.address?.city,
          formData.address?.state,
          formData.cnpj
        ],
        total: 7
      },
      appearance: {
        name: 'Aparência',
        fields: [
          formData.logo_url,
          formData.primary_color,
          formData.secondary_color,
          formData.font_family,
          formData.button_style
        ],
        total: 5
      },
      banners: {
        name: 'Banners',
        fields: [
          formData.banners?.length > 0
        ],
        total: 1
      }
    };

    const result = {};
    let totalFilled = 0;
    let totalFields = 0;

    Object.keys(sections).forEach(key => {
      const section = sections[key];
      const filled = section.fields.filter(f => f && f !== '' && f !== 0).length;
      result[key] = {
        name: section.name,
        percentage: Math.round((filled / section.total) * 100),
        filled,
        total: section.total
      };
      totalFilled += filled;
      totalFields += section.total;
    });

    result.total = Math.round((totalFilled / totalFields) * 100);
    return result;
  }, [formData]);

  // Auto-save quando houver mudanças
  useEffect(() => {
    if (hasUnsavedChanges && settings) {
      // Limpar timeout anterior
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      // Criar novo timeout para auto-save após 3 segundos
      autoSaveTimeoutRef.current = setTimeout(() => {
        handleAutoSave();
      }, 3000);
    }
    
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [formData, hasUnsavedChanges]);

  // Marcar como alterado quando formData mudar
  useEffect(() => {
    if (settings && formData.pharmacy_name) {
      setHasUnsavedChanges(true);
    }
  }, [formData]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      // Validação antes de salvar
      const validation = validateSettingsForm(data);
      if (!validation.valid) {
        setValidationErrors(validation.errors);
        const firstError = Object.values(validation.errors)[0];
        throw new Error(firstError);
      }
      
      setValidationErrors({});

      if (settings) {
        return base44.entities.PharmacySettings.update(settings.id, data);
      } else {
        return base44.entities.PharmacySettings.create(data);
      }
    },
    onSuccess: (data) => {
      // Invalidar todas as queries relacionadas para atualizar imediatamente
      queryClient.invalidateQueries(['pharmacySettings']);
      queryClient.setQueryData(['pharmacySettings'], [data]);
      
      // Forçar atualização do tema
      queryClient.refetchQueries(['pharmacySettings']);
      
      setHasUnsavedChanges(false);
      setLastSaved(new Date());
      toast.success('✅ Configurações salvas com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao salvar configurações:', error);
      toast.error('❌ Erro ao salvar: ' + (error.message || 'Tente novamente'));
    }
  });

  const handleAutoSave = () => {
    if (!hasUnsavedChanges || !settings) return;
    
    const dataToSave = {
      ...formData,
      delivery_fee_base: parseFloat(formData.delivery_fee_base) || 0,
      free_delivery_above: parseFloat(formData.free_delivery_above) || 0,
      installments: parseInt(formData.installments) || 3,
      installmentHasInterest: Boolean(formData.installmentHasInterest),
      // Garantir que todas as cores sejam salvas
      primary_color: formData.primary_color || '#059669',
      secondary_color: formData.secondary_color || '#0d9488',
      button_color: formData.button_color || '#059669',
      background_color: formData.background_color || '#ffffff',
      text_color: formData.text_color || '#1f2937',
      font_family: formData.font_family || 'inter',
      button_style: formData.button_style || 'rounded',
      logo_url: formData.logo_url || '',
      logo_scale: formData.logo_scale || 1,
      theme: {
        colors: {
          primary: formData.primary_color || '#059669',
          secondary: formData.secondary_color || '#0d9488',
          background: formData.background_color || '#ffffff',
          text: formData.text_color || '#1f2937',
          card: '#ffffff'
        },
        radius: {
          button: '12px',
          card: '16px',
          input: '8px'
        },
        shadow: 'soft',
        font: formData.font_family || 'inter'
      }
    };
    
    saveMutation.mutate(dataToSave);
  };

  // Paletas de cores predefinidas
  const colorPalettes = [
    {
      name: 'Farmácia Verde',
      primary: '#059669',
      secondary: '#0d9488',
      button: '#059669',
      background: '#ffffff',
      text: '#1f2937'
    },
    {
      name: 'Azul Saúde',
      primary: '#0284c7',
      secondary: '#0ea5e9',
      button: '#0284c7',
      background: '#ffffff',
      text: '#1e293b'
    },
    {
      name: 'Roxo Moderno',
      primary: '#7c3aed',
      secondary: '#a78bfa',
      button: '#7c3aed',
      background: '#ffffff',
      text: '#1e1b4b'
    },
    {
      name: 'Laranja Vibrante',
      primary: '#ea580c',
      secondary: '#f97316',
      button: '#ea580c',
      background: '#ffffff',
      text: '#1c1917'
    },
    {
      name: 'Rosa Elegante',
      primary: '#db2777',
      secondary: '#ec4899',
      button: '#db2777',
      background: '#ffffff',
      text: '#831843'
    },
    {
      name: 'Verde Escuro',
      primary: '#15803d',
      secondary: '#16a34a',
      button: '#15803d',
      background: '#f0fdf4',
      text: '#14532d'
    },
    {
      name: 'Minimalista',
      primary: '#18181b',
      secondary: '#3f3f46',
      button: '#18181b',
      background: '#ffffff',
      text: '#09090b'
    },
    {
      name: 'Modo Escuro',
      primary: '#60a5fa',
      secondary: '#3b82f6',
      button: '#60a5fa',
      background: '#1e293b',
      text: '#f1f5f9'
    }
  ];

  // Templates completos (paleta + fonte + estilo)
  const completeTemplates = [
    {
      name: 'Farmácia Moderna',
      description: 'Design clean e contemporâneo',
      icon: '✨',
      colors: colorPalettes[0],
      font: 'inter',
      buttonStyle: 'rounded',
      layout: 'comfortable'
    },
    {
      name: 'Saúde Profissional',
      description: 'Confiável e sério',
      icon: '🏥',
      colors: colorPalettes[1],
      font: 'roboto',
      buttonStyle: 'soft',
      layout: 'comfortable'
    },
    {
      name: 'Inovação & Tech',
      description: 'Futurista e moderno',
      icon: '🚀',
      colors: colorPalettes[2],
      font: 'poppins',
      buttonStyle: 'rounded',
      layout: 'compact'
    },
    {
      name: 'Energia & Vitalidade',
      description: 'Dinâmico e vibrante',
      icon: '⚡',
      colors: colorPalettes[3],
      font: 'montserrat',
      buttonStyle: 'soft',
      layout: 'comfortable'
    },
    {
      name: 'Elegância Premium',
      description: 'Sofisticado e acolhedor',
      icon: '💎',
      colors: colorPalettes[4],
      font: 'playfair-display',
      buttonStyle: 'rounded',
      layout: 'comfortable'
    },
    {
      name: 'Natureza & Orgânico',
      description: 'Sustentável e natural',
      icon: '🌿',
      colors: colorPalettes[5],
      font: 'lato',
      buttonStyle: 'rounded',
      layout: 'comfortable'
    }
  ];

  // Aplicar template completo
  const applyCompleteTemplate = (template) => {
    setFormData(prev => ({
      ...prev,
      primary_color: template.colors.primary,
      secondary_color: template.colors.secondary,
      button_color: template.colors.button,
      background_color: template.colors.background,
      text_color: template.colors.text,
      font_family: template.font,
      button_style: template.buttonStyle,
      layout_style: template.layout
    }));
    toast.success(`🎨 Template "${template.name}" aplicado!`);
  };

  // Adicionar aos favoritos
  const addToFavorites = () => {
    const currentPalette = {
      id: Date.now(),
      name: formData.pharmacy_name || 'Minha Paleta',
      primary: formData.primary_color,
      secondary: formData.secondary_color,
      button: formData.button_color,
      background: formData.background_color,
      text: formData.text_color,
      savedAt: new Date().toISOString()
    };

    const newFavorites = [...favoritePalettes, currentPalette];
    setFavoritePalettes(newFavorites);
    localStorage.setItem('favoritePalettes', JSON.stringify(newFavorites));
    toast.success('⭐ Paleta salva nos favoritos!');
  };

  const removeFavorite = (id) => {
    const newFavorites = favoritePalettes.filter(p => p.id !== id);
    setFavoritePalettes(newFavorites);
    localStorage.setItem('favoritePalettes', JSON.stringify(newFavorites));
    toast.info('Paleta removida dos favoritos');
  };

  const applyFavoritePalette = (palette) => {
    setFormData(prev => ({
      ...prev,
      primary_color: palette.primary,
      secondary_color: palette.secondary,
      button_color: palette.button,
      background_color: palette.background,
      text_color: palette.text
    }));
    toast.success(`✨ Paleta "${palette.name}" aplicada!`);
  };

  // Aplicar paleta de cores
  const applyColorPalette = (palette) => {
    setFormData(prev => ({
      ...prev,
      primary_color: palette.primary,
      secondary_color: palette.secondary,
      button_color: palette.button,
      background_color: palette.background,
      text_color: palette.text
    }));
    toast.success(`✨ Paleta "${palette.name}" aplicada!`);
  };

  // Calcular contraste entre duas cores (WCAG)
  const calculateContrast = (color1, color2) => {
    const getLuminance = (color) => {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16) / 255;
      const g = parseInt(hex.substr(2, 2), 16) / 255;
      const b = parseInt(hex.substr(4, 2), 16) / 255;
      
      const [rs, gs, bs] = [r, g, b].map(c => {
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      
      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    };
    
    const l1 = getLuminance(color1);
    const l2 = getLuminance(color2);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    
    return ratio;
  };

  // Verificar se o contraste é adequado
  const getContrastRating = () => {
    const ratio = calculateContrast(formData.primary_color || '#059669', formData.background_color || '#ffffff');
    
    if (ratio >= 7) return { level: 'AAA', label: 'Excelente', color: 'text-green-600' };
    if (ratio >= 4.5) return { level: 'AA', label: 'Bom', color: 'text-blue-600' };
    if (ratio >= 3) return { level: 'A', label: 'Aceitável', color: 'text-yellow-600' };
    return { level: 'Falha', label: 'Ruim', color: 'text-red-600' };
  };

  // Import tema do JSON
  const importTheme = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const theme = JSON.parse(e.target.result);
        
        // Validar estrutura básica
        if (!theme.colors) {
          toast.error('❌ Arquivo de tema inválido');
          return;
        }

        // Aplicar tema importado
        setFormData(prev => ({
          ...prev,
          primary_color: theme.colors.primary || prev.primary_color,
          secondary_color: theme.colors.secondary || prev.secondary_color,
          button_color: theme.colors.button || prev.button_color,
          background_color: theme.colors.background || prev.background_color,
          text_color: theme.colors.text || prev.text_color,
          font_family: theme.typography?.font || prev.font_family,
          button_style: theme.style?.button || prev.button_style,
          layout_style: theme.style?.layout || prev.layout_style
        }));

        toast.success(`✅ Tema "${theme.name || 'importado'}" aplicado com sucesso!`);
      } catch (error) {
        console.error('Erro ao importar tema:', error);
        toast.error('❌ Erro ao ler arquivo. Verifique o formato JSON.');
      }
    };
    reader.readAsText(file);
  };

  // Gerar paleta complementar automaticamente
  const generateComplementaryColors = (baseColor) => {
    // Converter hex para HSL
    const hexToHSL = (hex) => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h, s, l = (max + min) / 2;

      if (max === min) {
        h = s = 0;
      } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }

      return { h: h * 360, s: s * 100, l: l * 100 };
    };

    // Converter HSL para hex
    const hslToHex = (h, s, l) => {
      h = h / 360;
      s = s / 100;
      l = l / 100;

      let r, g, b;
      if (s === 0) {
        r = g = b = l;
      } else {
        const hue2rgb = (p, q, t) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1/6) return p + (q - p) * 6 * t;
          if (t < 1/2) return q;
          if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
          return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
      }

      const toHex = x => {
        const hex = Math.round(x * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      };

      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    };

    const hsl = hexToHSL(baseColor);
    
    // Gerar cores complementares
    const secondary = hslToHex((hsl.h + 30) % 360, hsl.s, hsl.l);
    const button = hslToHex(hsl.h, hsl.s, Math.min(hsl.l - 5, 95));
    const background = hslToHex(hsl.h, Math.max(hsl.s - 80, 5), 98);
    const text = hslToHex(hsl.h, hsl.s, 15);

    return { secondary, button, background, text };
  };

  const applyGeneratedPalette = () => {
    const baseColor = formData.primary_color || '#059669';
    const generated = generateComplementaryColors(baseColor);
    
    setFormData(prev => ({
      ...prev,
      secondary_color: generated.secondary,
      button_color: generated.button,
      background_color: generated.background,
      text_color: generated.text
    }));

    toast.success('🎨 Paleta complementar gerada com IA!');
  };

  // Export tema atual
  const exportTheme = () => {
    const theme = {
      name: formData.pharmacy_name || 'Meu Tema',
      colors: {
        primary: formData.primary_color,
        secondary: formData.secondary_color,
        button: formData.button_color,
        background: formData.background_color,
        text: formData.text_color
      },
      typography: {
        font: formData.font_family
      },
      style: {
        button: formData.button_style,
        layout: formData.layout_style
      }
    };
    
    const json = JSON.stringify(theme, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tema-${formData.pharmacy_name?.toLowerCase().replace(/\s+/g, '-') || 'farmacia'}.json`;
    document.body.appendChild(link);
    link.click();
    
    // Remover o link e revogar URL após um delay
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
    
    toast.success('📥 Tema exportado com sucesso!');
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validação de imagem
    const validation = validateImage(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, logo_url: file_url }));
      toast.success('Logo enviado com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao fazer upload da imagem. Tente novamente.');
    }
  };

  const handleBannerUpload = async (e, bannerId) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validação de imagem
    const validation = validateImage(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      setFormData(prev => ({
        ...prev,
        banners: prev.banners.map(b => 
          b.id === bannerId ? { ...b, image_url: file_url } : b
        )
      }));
      toast.success('Imagem do banner enviada com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao fazer upload da imagem. Tente novamente.');
    }
  };

  const addBanner = () => {
    const newBanner = {
      id: Date.now().toString(),
      image_url: '',
      title: '',
      subtitle: '',
      button_text: 'Ver Ofertas',
      link: '',
      active: true,
      position: 'hero',
      starts_at: '',
      ends_at: '',
      has_button: true // Novo campo para controlar se tem botão de ação
    };
    setFormData(prev => ({
      ...prev,
      banners: [...prev.banners, newBanner]
    }));
  };

  const removeBanner = (bannerId) => {
    setFormData(prev => ({
      ...prev,
      banners: prev.banners.filter(b => b.id !== bannerId)
    }));
  };

  const updateBanner = (bannerId, field, value) => {
    setFormData(prev => ({
      ...prev,
      banners: prev.banners.map(b => 
        b.id === bannerId ? { ...b, [field]: value } : b
      )
    }));
  };

  const handleSubmit = () => {
    // Cancelar auto-save pendente
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    // Garantir que theme seja salvo corretamente
    const dataToSave = {
      ...formData,
      delivery_fee_base: parseFloat(formData.delivery_fee_base) || 0,
      free_delivery_above: parseFloat(formData.free_delivery_above) || 0,
      installments: parseInt(formData.installments) || 3,
      installmentHasInterest: Boolean(formData.installmentHasInterest),
      // Garantir que todas as cores sejam salvas diretamente
      primary_color: formData.primary_color || '#059669',
      secondary_color: formData.secondary_color || '#0d9488',
      button_color: formData.button_color || '#059669',
      background_color: formData.background_color || '#ffffff',
      text_color: formData.text_color || '#1f2937',
      font_family: formData.font_family || 'inter',
      button_style: formData.button_style || 'rounded',
      logo_url: formData.logo_url || '',
      logo_scale: formData.logo_scale || 1,
      // Garantir que theme esteja completo
      theme: {
        colors: {
          primary: formData.primary_color || '#059669',
          secondary: formData.secondary_color || '#0d9488',
          background: formData.background_color || '#ffffff',
          text: formData.text_color || '#1f2937',
          card: '#ffffff'
        },
        radius: {
          button: '12px',
          card: '16px',
          input: '8px'
        },
        shadow: 'soft',
        font: formData.font_family || 'inter'
      }
    };
    saveMutation.mutate(dataToSave);
  };

  const handleDiscard = () => {
    if (confirm('Deseja descartar todas as alterações não salvas?')) {
      queryClient.invalidateQueries(['pharmacySettings']);
      setHasUnsavedChanges(false);
      toast.info('Alterações descartadas');
    }
  };

  // Função auxiliar para verificar se um campo corresponde à busca
  const matchesSearch = (searchFields) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return searchFields.some(field => 
      field && field.toLowerCase().includes(term)
    );
  };

  // Função para destacar texto que corresponde à busca
  const highlightClass = (searchFields) => {
    if (!searchTerm) return '';
    const matches = matchesSearch(searchFields);
    return matches ? 'ring-2 ring-emerald-500 ring-offset-2' : 'opacity-30';
  };

  const fontOptions = [
    { value: 'inter', label: 'Inter (Moderno)', category: 'Sans-serif' },
    { value: 'roboto', label: 'Roboto (Clássico)', category: 'Sans-serif' },
    { value: 'montserrat', label: 'Montserrat (Elegante)', category: 'Sans-serif' },
    { value: 'poppins', label: 'Poppins (Amigável)', category: 'Sans-serif' },
    { value: 'lato', label: 'Lato (Profissional)', category: 'Sans-serif' },
    { value: 'open-sans', label: 'Open Sans (Universal)', category: 'Sans-serif' },
    { value: 'raleway', label: 'Raleway (Refinado)', category: 'Sans-serif' },
    { value: 'nunito', label: 'Nunito (Suave)', category: 'Sans-serif' },
    { value: 'source-sans-pro', label: 'Source Sans Pro', category: 'Sans-serif' },
    { value: 'playfair-display', label: 'Playfair Display (Sofisticado)', category: 'Serif' },
    { value: 'merriweather', label: 'Merriweather (Tradicional)', category: 'Serif' },
    { value: 'lora', label: 'Lora (Elegante)', category: 'Serif' }
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <AdminSidebar />
      
      <motion.main 
        initial={false}
        animate={{ 
          marginLeft: sidebarOpen ? '16rem' : '5rem'
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="flex-1"
      >
        <motion.header 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white border-b px-4 sm:px-6 py-4 sticky top-0 z-40 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Configurações</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">Personalize sua farmácia</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Status de Salvamento */}
              <div className="flex items-center gap-2 text-sm mr-2">
                {saveMutation.isPending && (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                    <span className="text-blue-600 font-medium">Salvando...</span>
                  </>
                )}
                {lastSaved && !saveMutation.isPending && !hasUnsavedChanges && (
                  <>
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-green-600 font-medium">
                      Salvo {format(lastSaved, 'HH:mm', { locale: ptBR })}
                    </span>
                  </>
                )}
                {hasUnsavedChanges && !saveMutation.isPending && (
                  <>
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <span className="text-amber-600 font-medium">Alterações não salvas</span>
                  </>
                )}
              </div>
              
              <Link to={createPageUrl('Home')}>
                <Button variant="outline" className="rounded-xl">
                  <Eye className="w-4 h-4 mr-2" />
                  Visualizar Loja
                </Button>
              </Link>
              <Button 
                onClick={handleSubmit}
                disabled={saveMutation.isPending || !hasUnsavedChanges}
                className="bg-emerald-600 hover:bg-emerald-700 rounded-xl disabled:opacity-50"
              >
                <Save className="w-4 h-4 mr-2" />
                {saveMutation.isPending ? 'Salvando...' : 'Salvar Agora'}
              </Button>
            </div>
          </div>
        </motion.header>

        {/* Campo de Busca */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="px-4 sm:px-6 pt-4 pb-2 bg-white border-b"
        >
          <div className="max-w-2xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar configurações... (ex: cor, telefone, endereço)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10 py-6 text-base rounded-xl border-2 focus:border-emerald-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            {searchTerm && (
              <p className="text-sm text-gray-500 mt-2">
                Mostrando resultados para "{searchTerm}"
              </p>
            )}
          </div>
        </motion.div>

        {/* Indicador de Progresso */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="px-4 sm:px-6 py-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-b"
        >
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-700">Progresso da Configuração</h3>
                <span className="text-2xl font-bold text-emerald-600">{progress.total}%</span>
              </div>
              {progress.total === 100 && (
                <span className="flex items-center gap-1 text-sm text-emerald-700 font-medium bg-emerald-100 px-3 py-1 rounded-full">
                  <Check className="w-4 h-4" />
                  Completo!
                </span>
              )}
            </div>
            
            <Progress value={progress.total} className="h-3 mb-3" />
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {Object.keys(progress).filter(k => k !== 'total').map(key => (
                <div key={key} className="flex items-center justify-between bg-white/70 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    {progress[key].percentage === 100 ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : progress[key].percentage > 0 ? (
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                    ) : (
                      <X className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-sm font-medium text-gray-700">{progress[key].name}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-600">
                    {progress[key].filled}/{progress[key].total}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="p-4 sm:p-6 pb-24 md:pb-6 max-w-7xl mx-auto"
        >
        <Tabs defaultValue="info" className="space-y-6">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 lg:w-auto gap-2">
            <TabsTrigger value="info" className="gap-2 py-3 sm:py-2 text-base sm:text-sm">
              <Settings className="w-5 h-5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Loja</span>
              <span className="sm:hidden">Informações da Loja</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2 py-3 sm:py-2 text-base sm:text-sm">
              <Sparkles className="w-5 h-5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Aparência</span>
              <span className="sm:hidden">Cores e Estilo</span>
            </TabsTrigger>
            <TabsTrigger value="banners" className="gap-2 py-3 sm:py-2 text-base sm:text-sm">
              <ImagePlus className="w-5 h-5 sm:w-4 sm:h-4" />
              Banners
            </TabsTrigger>
          </TabsList>

          {/* Tab: Informações Básicas */}
          <TabsContent value="info" className="space-y-6">
            <Card className="bg-white/60 backdrop-blur-sm border-gray-200/50">
              <CardHeader>
                <CardTitle>Informações Básicas</CardTitle>
                <CardDescription>Dados principais da farmácia</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Nome da Farmácia</Label>
                  <Input
                    value={formData.pharmacy_name || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, pharmacy_name: e.target.value }))}
                    placeholder="Farmácia Exemplo"
                  />
                </div>

                <div>
                  <Label>Descrição</Label>
                  <Textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Há mais de 20 anos cuidando da saúde da sua família..."
                    rows={3}
                  />
                  <p className="text-xs text-gray-500 mt-1">Aparece no rodapé do site</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Telefone</Label>
                    <Input
                      value={formData.phone || ''}
                      onChange={(e) => {
                        const formatted = applyPhoneMask(e.target.value);
                        setFormData(prev => ({ ...prev, phone: formatted }));
                      }}
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                    />
                  </div>
                  <div>
                    <Label>WhatsApp</Label>
                    <Input
                      value={formData.whatsapp || ''}
                      onChange={(e) => {
                        const formatted = applyPhoneMask(e.target.value);
                        setFormData(prev => ({ ...prev, whatsapp: formatted }));
                      }}
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="pharmacy-email">Email</Label>
                  <Input
                    id="pharmacy-email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="contato@farmacia.com.br"
                    className={formData.email && !validateEmail(formData.email).valid ? 'border-red-300' : ''}
                    aria-describedby="email-help email-error"
                  />
                  {formData.email && !validateEmail(formData.email).valid && (
                    <p id="email-error" className="text-xs text-red-600 mt-1">
                      Email inválido
                    </p>
                  )}
                  <p id="email-help" className="text-xs text-gray-500 mt-1">
                    Email para contato e notificações
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/60 backdrop-blur-sm border-gray-200/50">
              <CardHeader>
                <CardTitle>Endereço</CardTitle>
                <CardDescription>Localização da farmácia</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <Label>Rua</Label>
                    <Input
                      value={formData.address?.street || ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        address: { ...prev.address, street: e.target.value }
                      }))}
                      placeholder="Rua Example"
                    />
                  </div>
                  <div>
                    <Label>Número</Label>
                    <Input
                      value={formData.address?.number || ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        address: { ...prev.address, number: e.target.value }
                      }))}
                      placeholder="123"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Bairro</Label>
                    <Input
                      value={formData.address?.neighborhood || ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        address: { ...prev.address, neighborhood: e.target.value }
                      }))}
                      placeholder="Centro"
                    />
                  </div>
                  <div>
                    <Label htmlFor="address-zipcode">CEP</Label>
                    <Input
                      id="address-zipcode"
                      value={formData.address?.zipcode || ''}
                      onChange={(e) => {
                        const formatted = formatCEP(e.target.value);
                        setFormData(prev => ({ 
                          ...prev, 
                          address: { ...prev.address, zipcode: formatted }
                        }));
                      }}
                      placeholder="01234-567"
                      maxLength={9}
                      className={formData.address?.zipcode && !validateCEP(formData.address.zipcode).valid ? 'border-red-300' : ''}
                      aria-describedby="zipcode-help zipcode-error"
                    />
                    {formData.address?.zipcode && !validateCEP(formData.address.zipcode).valid && (
                      <p id="zipcode-error" className="text-xs text-red-600 mt-1">
                        CEP inválido (deve ter 8 dígitos)
                      </p>
                    )}
                    <p id="zipcode-help" className="text-xs text-gray-500 mt-1">
                      CEP da farmácia
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Cidade</Label>
                    <Input
                      value={formData.address?.city || ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        address: { ...prev.address, city: e.target.value }
                      }))}
                      placeholder="São Paulo"
                    />
                  </div>
                  <div>
                    <Label>Estado</Label>
                    <Input
                      value={formData.address?.state || ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        address: { ...prev.address, state: e.target.value }
                      }))}
                      placeholder="SP"
                      maxLength={2}
                    />
                  </div>
                </div>

                <div>
                  <Label>Link do Google Maps</Label>
                  <Input
                    value={formData.address?.maps_link || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, maps_link: e.target.value }
                    }))}
                    placeholder="https://maps.google.com/..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Para obter: abra o Google Maps, busque sua farmácia, clique em "Compartilhar" e copie o link
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/60 backdrop-blur-sm border-gray-200/50">
              <CardHeader>
                <CardTitle>Horário de Funcionamento</CardTitle>
                <CardDescription>Horários de atendimento</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Segunda a Sexta</Label>
                  <Input
                    value={formData.opening_hours?.weekdays || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      opening_hours: { ...prev.opening_hours, weekdays: e.target.value }
                    }))}
                    placeholder="07h às 22h"
                  />
                </div>
                <div>
                  <Label>Sábado</Label>
                  <Input
                    value={formData.opening_hours?.saturday || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      opening_hours: { ...prev.opening_hours, saturday: e.target.value }
                    }))}
                    placeholder="08h às 20h"
                  />
                </div>
                <div>
                  <Label>Domingo</Label>
                  <Input
                    value={formData.opening_hours?.sunday || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      opening_hours: { ...prev.opening_hours, sunday: e.target.value }
                    }))}
                    placeholder="09h às 18h"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/60 backdrop-blur-sm border-gray-200/50">
              <CardHeader>
                <CardTitle>Informações Legais</CardTitle>
                <CardDescription>CNPJ e responsável técnico</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="pharmacy-cnpj">CNPJ</Label>
                    <Input
                      id="pharmacy-cnpj"
                      value={formData.cnpj || ''}
                      onChange={(e) => {
                        const formatted = formatCNPJ(e.target.value);
                        setFormData(prev => ({ ...prev, cnpj: formatted }));
                      }}
                      placeholder="00.000.000/0001-00"
                      maxLength={18}
                      className={formData.cnpj && !validateCNPJ(formData.cnpj).valid ? 'border-red-300' : ''}
                      aria-describedby="cnpj-help cnpj-error"
                    />
                    {formData.cnpj && !validateCNPJ(formData.cnpj).valid && (
                      <p id="cnpj-error" className="text-xs text-red-600 mt-1">
                        CNPJ inválido (deve ter 14 dígitos)
                      </p>
                    )}
                    <p id="cnpj-help" className="text-xs text-gray-500 mt-1">
                      CNPJ da farmácia (opcional)
                    </p>
                  </div>
                  <div>
                    <Label>Licença Sanitária</Label>
                    <Input
                      value={formData.license_number || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, license_number: e.target.value }))}
                      placeholder="123456"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Farmacêutico Responsável</Label>
                    <Input
                      value={formData.pharmacist_name || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, pharmacist_name: e.target.value }))}
                      placeholder="Dr. João Silva"
                    />
                  </div>
                  <div>
                    <Label>CRF</Label>
                    <Input
                      value={formData.pharmacist_crf || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, pharmacist_crf: e.target.value }))}
                      placeholder="CRF/SP 12345"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/60 backdrop-blur-sm border-gray-200/50">
              <CardHeader>
                <CardTitle>Redes Sociais</CardTitle>
                <CardDescription>Links para suas redes sociais</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(formData.social_media || []).map((social, index) => (
                  <div key={index} className="flex gap-3 items-start p-3 bg-gray-50 rounded-lg">
                    <Select
                      value={social.platform}
                      onValueChange={(value) => {
                        const updated = [...(formData.social_media || [])];
                        updated[index].platform = value;
                        setFormData(prev => ({ ...prev, social_media: updated }));
                      }}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Rede" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="facebook">Facebook</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="youtube">YouTube</SelectItem>
                        <SelectItem value="twitter">Twitter</SelectItem>
                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                        <SelectItem value="tiktok">TikTok</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      value={social.url}
                      onChange={(e) => {
                        const updated = [...(formData.social_media || [])];
                        updated[index].url = e.target.value;
                        setFormData(prev => ({ ...prev, social_media: updated }));
                      }}
                      placeholder="https://..."
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const updated = (formData.social_media || []).filter((_, i) => i !== index);
                        setFormData(prev => ({ ...prev, social_media: updated }));
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      social_media: [...(prev.social_media || []), { platform: 'instagram', url: '' }]
                    }));
                  }}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Rede Social
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white/60 backdrop-blur-sm border-gray-200/50">
              <CardHeader>
                <CardTitle>Links Rápidos</CardTitle>
                <CardDescription>Links customizados para o rodapé</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(formData.quick_links || []).map((link, index) => (
                  <div key={index} className="flex gap-3 items-start p-3 bg-gray-50 rounded-lg">
                    <Input
                      value={link.label}
                      onChange={(e) => {
                        const updated = [...(formData.quick_links || [])];
                        updated[index].label = e.target.value;
                        setFormData(prev => ({ ...prev, quick_links: updated }));
                      }}
                      placeholder="Nome do link"
                      className="w-48"
                    />
                    <Input
                      value={link.url}
                      onChange={(e) => {
                        const updated = [...(formData.quick_links || [])];
                        updated[index].url = e.target.value;
                        setFormData(prev => ({ ...prev, quick_links: updated }));
                      }}
                      placeholder="https:// ou /pagina"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const updated = (formData.quick_links || []).filter((_, i) => i !== index);
                        setFormData(prev => ({ ...prev, quick_links: updated }));
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        quick_links: [...(prev.quick_links || []), { label: '', url: '' }]
                      }));
                    }}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Link
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (formData.address?.maps_link) {
                        setFormData(prev => ({
                          ...prev,
                          quick_links: [...(prev.quick_links || []), { 
                            label: 'Como Chegar', 
                            url: formData.address.maps_link 
                          }]
                        }));
                      } else {
                        toast.error('Configure o link do Google Maps primeiro');
                      }
                    }}
                    className="w-full"
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    Link do Maps
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/60 backdrop-blur-sm border-gray-200/50">
              <CardHeader>
                <CardTitle>Financeiro</CardTitle>
                <CardDescription>Configurações de pagamento e parcelamento</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Número de Parcelas</Label>
                    <Input
                      type="number"
                      min="1"
                      max="12"
                      value={formData.installments !== undefined ? formData.installments : 3}
                      onChange={(e) => setFormData(prev => ({ ...prev, installments: parseInt(e.target.value) || 3 }))}
                      placeholder="3"
                    />
                    <p className="text-xs text-gray-500 mt-1">Número padrão de parcelas para produtos</p>
                  </div>
                  <div>
                    <Label>Parcelas com Juros</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Switch
                        checked={formData.installmentHasInterest || false}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, installmentHasInterest: checked }))}
                      />
                      <span className="text-sm text-gray-600">
                        {formData.installmentHasInterest ? 'Sim' : 'Não'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Se as parcelas terão juros ou não</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/60 backdrop-blur-sm border-gray-200/50">
              <CardHeader>
                <CardTitle>Entrega</CardTitle>
                <CardDescription>Configurações de entrega e frete</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="delivery-fee">Taxa de Entrega Base</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                        <Input
                          id="delivery-fee"
                          type="text"
                          value={formData.delivery_fee_base !== undefined && formData.delivery_fee_base !== null ? formatCurrency(formData.delivery_fee_base) : ''}
                          onChange={(e) => {
                            const unformatted = unformatCurrency(e.target.value);
                            setFormData(prev => ({ ...prev, delivery_fee_base: unformatted }));
                          }}
                          placeholder="0,00"
                          className="pl-8"
                          aria-describedby="delivery-fee-help"
                        />
                      </div>
                      <p id="delivery-fee-help" className="text-xs text-gray-500 mt-1">
                        Valor fixo cobrado por entrega
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="free-delivery">Frete Grátis Acima de</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                        <Input
                          id="free-delivery"
                          type="text"
                          value={formData.free_delivery_above !== undefined && formData.free_delivery_above !== null ? formatCurrency(formData.free_delivery_above) : ''}
                          onChange={(e) => {
                            const unformatted = unformatCurrency(e.target.value);
                            setFormData(prev => ({ ...prev, free_delivery_above: unformatted }));
                          }}
                          placeholder="150,00"
                          className="pl-8"
                          aria-describedby="free-delivery-help"
                        />
                      </div>
                      <p id="free-delivery-help" className="text-xs text-gray-500 mt-1">
                        Valor mínimo para frete grátis
                      </p>
                    </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/60 backdrop-blur-sm border-gray-200/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-emerald-600" />
                  Modo de Pedidos
                </CardTitle>
                <CardDescription>Escolha como os clientes farão pedidos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-xl">
                    <div className="flex items-center gap-3">
                      {(formData.order_mode || 'app') === 'app' ? (
                        <Smartphone className="w-6 h-6 text-emerald-600" />
                      ) : (
                        <MessageCircle className="w-6 h-6 text-green-600" />
                      )}
                      <div>
                        <p className="font-semibold text-gray-900">
                          {(formData.order_mode || 'app') === 'app' ? 'Pedidos no App' : 'Pedidos no WhatsApp'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {(formData.order_mode || 'app') === 'app' 
                            ? 'Clientes fazem pedidos pelo site e acompanham status online'
                            : 'Clientes recebem comanda no WhatsApp e notificações automáticas'}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={(formData.order_mode || 'app') === 'whatsapp'}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({ ...prev, order_mode: checked ? 'whatsapp' : 'app' }))
                      }
                    />
                  </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Modo App:</strong> Cliente finaliza pedido no site, cria pedido no sistema e acompanha status em tempo real.
                  </p>
                  <p className="text-sm text-blue-800 mt-2">
                    <strong>Modo WhatsApp:</strong> Cliente recebe comanda detalhada no WhatsApp. Ao atualizar status no gestor, cliente recebe notificações automáticas.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Aparência (Consolidada - Identidade Visual + Tema & Estilo) */}
          <TabsContent value="appearance" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Coluna Esquerda - Configurações */}
              <div className="space-y-6">
                {/* Logo */}
                <Card className="bg-white/60 backdrop-blur-sm border-gray-200/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-emerald-600" />
                      Logo da Marca
                    </CardTitle>
                    <CardDescription>Upload do logotipo da farmácia</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {formData.logo_url ? (
                      <div className="space-y-4">
                        <div className="relative">
                          <img
                            src={formData.logo_url}
                            alt="Logo"
                            className="h-40 object-contain bg-gray-50 rounded-2xl mx-auto p-4 border-2 border-gray-200"
                            style={{ transform: `scale(${(formData.logo_scale !== undefined && formData.logo_scale !== null) ? formData.logo_scale : 1})` }}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 bg-white shadow-md"
                            onClick={() => setFormData(prev => ({ ...prev, logo_url: '' }))}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                        
                        <div>
                          <Label>Tamanho da Logo: {Math.round(((formData.logo_scale !== undefined && formData.logo_scale !== null) ? formData.logo_scale : 1) * 100)}%</Label>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-xs text-gray-500">50%</span>
                            <input
                              type="range"
                              min="0.5"
                              max="3"
                              step="0.1"
                              value={(formData.logo_scale !== undefined && formData.logo_scale !== null) ? formData.logo_scale : 1}
                              onChange={(e) => setFormData(prev => ({ ...prev, logo_scale: parseFloat(e.target.value) }))}
                              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                              style={{
                                background: `linear-gradient(to right, ${formData.primary_color || '#059669'} 0%, ${formData.primary_color || '#059669'} ${(((formData.logo_scale || 1) - 0.5) / 2.5) * 100}%, #e5e7eb ${(((formData.logo_scale || 1) - 0.5) / 2.5) * 100}%, #e5e7eb 100%)`
                              }}
                            />
                            <span className="text-xs text-gray-500">300%</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-2xl cursor-pointer hover:bg-gray-50 transition-colors">
                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                        <span className="text-sm text-gray-500">Clique para enviar logo</span>
                        <span className="text-xs text-gray-400 mt-1">PNG, JPG até 5MB</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </CardContent>
                </Card>

                {/* Templates Completos */}
                <Card className="bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 border-purple-200/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Layout className="w-5 h-5 text-purple-600" />
                      Templates Completos
                    </CardTitle>
                    <CardDescription>Design completo (cores + fonte + estilo)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-3">
                      {completeTemplates.map((template, index) => (
                        <button
                          key={index}
                          onClick={() => applyCompleteTemplate(template)}
                          className="group relative p-4 bg-white border-2 border-purple-200 rounded-xl hover:border-purple-400 hover:shadow-lg transition-all text-left"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{template.icon}</span>
                              <div>
                                <p className="font-bold text-gray-900">{template.name}</p>
                                <p className="text-xs text-gray-600">{template.description}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1.5 mt-3">
                            <div 
                              className="w-8 h-8 rounded-md border-2 border-white shadow-sm"
                              style={{ backgroundColor: template.colors.primary }}
                            />
                            <div 
                              className="w-8 h-8 rounded-md border-2 border-white shadow-sm"
                              style={{ backgroundColor: template.colors.secondary }}
                            />
                            <div 
                              className="w-8 h-8 rounded-md border-2 border-white shadow-sm"
                              style={{ backgroundColor: template.colors.button }}
                            />
                            <div className="flex-1 flex items-center justify-end gap-2">
                              <span className="text-xs text-gray-500 font-medium">
                                {fontOptions.find(f => f.value === template.font)?.label?.split(' ')[0] || template.font}
                              </span>
                              <div 
                                className="w-6 h-6 border-2 border-gray-300"
                                style={{ 
                                  borderRadius: template.buttonStyle === 'rounded' ? '6px' : 
                                              template.buttonStyle === 'soft' ? '4px' : '2px',
                                  backgroundColor: template.colors.primary 
                                }}
                              />
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Favoritos */}
                {favoritePalettes.length > 0 && (
                  <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200/50">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Star className="w-5 h-5 text-amber-600 fill-amber-600" />
                            Suas Paletas Favoritas
                          </CardTitle>
                          <CardDescription>Paletas que você salvou</CardDescription>
                        </div>
                        <span className="px-2 py-1 bg-amber-200 text-amber-800 text-xs font-bold rounded-full">
                          {favoritePalettes.length}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {favoritePalettes.map((palette) => (
                          <div
                            key={palette.id}
                            className="group flex items-center justify-between p-3 bg-white rounded-xl border-2 border-amber-100 hover:border-amber-300 transition-all"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <div className="flex gap-1">
                                <div 
                                  className="w-5 h-5 rounded-md border border-white shadow-sm"
                                  style={{ backgroundColor: palette.primary }}
                                />
                                <div 
                                  className="w-5 h-5 rounded-md border border-white shadow-sm"
                                  style={{ backgroundColor: palette.secondary }}
                                />
                                <div 
                                  className="w-5 h-5 rounded-md border border-white shadow-sm"
                                  style={{ backgroundColor: palette.button }}
                                />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{palette.name}</p>
                                <p className="text-xs text-gray-500">
                                  Salvo em {new Date(palette.savedAt).toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => applyFavoritePalette(palette)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Check className="w-4 h-4 text-green-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeFavorite(palette.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Paletas Predefinidas */}
                <Card className="bg-white/60 backdrop-blur-sm border-gray-200/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-emerald-600" />
                      Paletas Prontas
                    </CardTitle>
                    <CardDescription>Aplique uma paleta com um clique</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      {colorPalettes.map((palette, index) => (
                        <button
                          key={index}
                          onClick={() => applyColorPalette(palette)}
                          className="group relative p-3 border-2 rounded-xl hover:border-gray-400 transition-all text-left"
                        >
                          <div className="flex gap-2 mb-2">
                            <div 
                              className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                              style={{ backgroundColor: palette.primary }}
                            />
                            <div 
                              className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                              style={{ backgroundColor: palette.secondary }}
                            />
                            <div 
                              className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                              style={{ backgroundColor: palette.button }}
                            />
                          </div>
                          <p className="text-sm font-medium text-gray-900">{palette.name}</p>
                          <div 
                            className="absolute inset-0 bg-gradient-to-br from-transparent to-black/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                          />
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Copiar de URL */}
                <Card className="bg-white/60 backdrop-blur-sm border-gray-200/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="w-5 h-5 text-emerald-600" />
                      Inspiração de Site
                    </CardTitle>
                    <CardDescription>Cole uma URL para extrair cores</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Input
                        type="url"
                        placeholder="https://exemplo.com"
                        className="text-sm"
                      />
                      <Button
                        variant="outline"
                        className="w-full rounded-xl"
                        disabled
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Extrair Cores (Em Breve)
                      </Button>
                      <p className="text-xs text-gray-500 text-center">
                        Funcionalidade em desenvolvimento
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Validação de Contraste */}
                <Card className="bg-white/60 backdrop-blur-sm border-gray-200/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-emerald-600" />
                      Acessibilidade
                    </CardTitle>
                    <CardDescription>Contraste de cores (WCAG)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">
                          Contraste: {calculateContrast(formData.primary_color || '#059669', formData.background_color || '#ffffff').toFixed(2)}:1
                        </p>
                        <p className="text-xs text-gray-500">
                          Nível WCAG: <span className={`font-bold ${getContrastRating().color}`}>
                            {getContrastRating().level} - {getContrastRating().label}
                          </span>
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <div 
                          className="w-12 h-12 rounded-lg border-2"
                          style={{ backgroundColor: formData.background_color || '#ffffff' }}
                        />
                        <div 
                          className="w-12 h-12 rounded-lg border-2"
                          style={{ backgroundColor: formData.primary_color || '#059669' }}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Recomendado: AAA (7:1) ou AA (4.5:1) para melhor legibilidade
                    </p>
                  </CardContent>
                </Card>

                {/* Cores Personalizadas */}
                <Card className="bg-white/60 backdrop-blur-sm border-gray-200/50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Palette className="w-5 h-5 text-emerald-600" />
                          Cores Personalizadas
                        </CardTitle>
                        <CardDescription>Ajuste fino das cores</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={addToFavorites}
                          className="rounded-xl"
                        >
                          <Star className="w-4 h-4 mr-2" />
                          Favoritar
                        </Button>
                        <label htmlFor="import-theme">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl cursor-pointer"
                            onClick={() => document.getElementById('import-theme').click()}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Importar
                          </Button>
                          <input
                            id="import-theme"
                            type="file"
                            accept=".json"
                            onChange={importTheme}
                            className="hidden"
                          />
                        </label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={exportTheme}
                          className="rounded-xl"
                        >
                          <Upload className="w-4 h-4 mr-2 rotate-180" />
                          Exportar
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Gerador Automático */}
                    <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-purple-900">✨ Gerador Inteligente</p>
                          <p className="text-xs text-purple-700">Crie paleta baseada na cor primária</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={applyGeneratedPalette}
                          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl"
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Gerar
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label>Cor Primária</Label>
                      <div className="flex gap-3 mt-2">
                        <Input
                          type="color"
                          value={formData.primary_color || '#059669'}
                          onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                          className="w-20 h-12 p-1 cursor-pointer"
                        />
                        <Input
                          value={formData.primary_color || '#059669'}
                          onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                          placeholder="#059669"
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Cor Secundária</Label>
                      <div className="flex gap-3 mt-2">
                        <Input
                          type="color"
                          value={formData.secondary_color || '#0d9488'}
                          onChange={(e) => setFormData(prev => ({ ...prev, secondary_color: e.target.value }))}
                          className="w-20 h-12 p-1 cursor-pointer"
                        />
                        <Input
                          value={formData.secondary_color || '#0d9488'}
                          onChange={(e) => setFormData(prev => ({ ...prev, secondary_color: e.target.value }))}
                          placeholder="#0d9488"
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Cor dos Botões</Label>
                      <div className="flex gap-3 mt-2">
                        <Input
                          type="color"
                          value={formData.button_color || '#059669'}
                          onChange={(e) => setFormData(prev => ({ ...prev, button_color: e.target.value }))}
                          className="w-20 h-12 p-1 cursor-pointer"
                        />
                        <Input
                          value={formData.button_color || '#059669'}
                          onChange={(e) => setFormData(prev => ({ ...prev, button_color: e.target.value }))}
                          placeholder="#059669"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tipografia */}
                <Card className="bg-white/60 backdrop-blur-sm border-gray-200/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Type className="w-5 h-5 text-emerald-600" />
                      Tipografia
                    </CardTitle>
                    <CardDescription>Escolha a fonte do sistema</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Label>Fonte Principal</Label>
                    <Select
                      value={formData.font_family || 'inter'}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, font_family: value }))}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fontOptions.map(font => (
                          <SelectItem key={font.value} value={font.value}>
                            {font.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                {/* Estilos de Botões */}
                <Card className="bg-white/60 backdrop-blur-sm border-gray-200/50">
                  <CardHeader>
                    <CardTitle>Estilo dos Botões</CardTitle>
                    <CardDescription>Escolha o estilo de arredondamento</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: 'rounded', label: 'Arredondado', radius: '12px' },
                        { value: 'soft', label: 'Suave', radius: '8px' },
                        { value: 'square', label: 'Quadrado', radius: '4px' }
                      ].map(style => (
                        <button
                          key={style.value}
                          onClick={() => setFormData(prev => ({ ...prev, button_style: style.value }))}
                          className={`p-4 border-2 transition-all ${
                            (formData.button_style || 'rounded') === style.value
                              ? 'border-emerald-500 bg-emerald-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          style={{ borderRadius: style.radius }}
                        >
                          <div 
                            className="w-full h-8 mb-2"
                            style={{ 
                              backgroundColor: formData.primary_color || '#059669',
                              borderRadius: style.radius
                            }}
                          />
                          <span className="text-sm font-medium">{style.label}</span>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Layout */}
                <Card className="bg-white/60 backdrop-blur-sm border-gray-200/50">
                  <CardHeader>
                    <CardTitle>Layout</CardTitle>
                    <CardDescription>Densidade de informação</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: 'compact', label: 'Compacto', desc: 'Mais produtos visíveis' },
                        { value: 'comfortable', label: 'Confortável', desc: 'Mais espaçamento' }
                      ].map(layout => (
                        <button
                          key={layout.value}
                          onClick={() => setFormData(prev => ({ ...prev, layout_style: layout.value }))}
                          className={`p-4 border-2 rounded-xl transition-all text-left ${
                            (formData.layout_style || 'comfortable') === layout.value
                              ? 'border-emerald-500 bg-emerald-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <p className="font-medium mb-1">{layout.label}</p>
                          <p className="text-xs text-gray-600">{layout.desc}</p>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Coluna Direita - Preview Melhorado */}
              <Card className="bg-white/60 backdrop-blur-sm border-gray-200/50 sticky top-24 h-fit max-h-[800px] overflow-y-auto">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Smartphone className="w-5 h-5 text-emerald-600" />
                        Preview em Tempo Real
                      </CardTitle>
                      <CardDescription>Veja como ficará sua loja</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPreviewMode('light')}
                        className={`p-2 rounded-lg transition-all ${
                          previewMode === 'light' 
                            ? 'bg-yellow-100 text-yellow-600' 
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                        title="Modo Claro"
                      >
                        ☀️
                      </button>
                      <button
                        onClick={() => setPreviewMode('dark')}
                        className={`p-2 rounded-lg transition-all ${
                          previewMode === 'dark' 
                            ? 'bg-slate-700 text-slate-100' 
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                        title="Modo Escuro"
                      >
                        🌙
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <motion.div 
                    key={previewMode}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="rounded-2xl p-6 space-y-4 border-2"
                    style={{ 
                      backgroundColor: previewMode === 'dark' ? '#1e293b' : (formData.background_color || '#ffffff'),
                      fontFamily: formData.font_family || 'inter',
                      borderColor: `${formData.primary_color || '#059669'}20`
                    }}
                  >
                    {/* Header */}
                    <motion.div 
                      className="pb-4 border-b-2" 
                      style={{ borderColor: `${formData.primary_color || '#059669'}20` }}
                      initial={{ y: -20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      {formData.logo_url ? (
                        <div className="flex justify-center mb-3">
                          <motion.img 
                            src={formData.logo_url} 
                            alt="Logo" 
                            className="h-12 object-contain"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 200 }}
                          />
                        </div>
                      ) : (
                        <h2 
                          className="text-xl font-bold text-center mb-3"
                          style={{ color: previewMode === 'dark' ? '#f1f5f9' : (formData.text_color || '#1f2937') }}
                        >
                          {formData.pharmacy_name || 'Sua Farmácia'}
                        </h2>
                      )}
                      
                      {/* Navegação */}
                      <div className="flex gap-2 justify-center text-xs">
                        {['Início', 'Produtos', 'Contato'].map((item, index) => (
                          <motion.span
                            key={item}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 + index * 0.1 }}
                            className={`px-3 py-1.5 rounded-lg font-medium ${index === 0 ? 'text-white' : ''}`}
                            style={index === 0 ? { 
                              backgroundColor: formData.primary_color || '#059669'
                            } : { 
                              color: previewMode === 'dark' ? '#cbd5e1' : (formData.text_color || '#1f2937')
                            }}
                          >
                            {item}
                          </motion.span>
                        ))}
                      </div>
                    </motion.div>

                    {/* Banner Promocional */}
                    <motion.div 
                      className="p-4 rounded-xl"
                      style={{ backgroundColor: `${formData.primary_color || '#059669'}${previewMode === 'dark' ? '30' : '15'}` }}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <p 
                        className="font-bold text-sm mb-1"
                        style={{ color: formData.primary_color || '#059669' }}
                      >
                        🎉 Oferta Especial
                      </p>
                      <p 
                        className="text-xs" 
                        style={{ color: previewMode === 'dark' ? '#cbd5e1' : (formData.text_color || '#1f2937') }}
                      >
                        Até 30% OFF em produtos selecionados
                      </p>
                    </motion.div>

                    {/* Card de Produto */}
                    <motion.div 
                      className="p-4 rounded-xl border-2"
                      style={{ 
                        borderColor: `${formData.primary_color || '#059669'}20`,
                        backgroundColor: previewMode === 'dark' ? '#334155' : '#ffffff'
                      }}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      whileHover={{ y: -5, boxShadow: `0 10px 30px ${formData.primary_color || '#059669'}30` }}
                    >
                      <div className={`w-full h-24 ${previewMode === 'dark' ? 'bg-slate-600' : 'bg-gray-100'} rounded-lg mb-3 flex items-center justify-center`}>
                        <span className={`text-xs ${previewMode === 'dark' ? 'text-slate-400' : 'text-gray-400'}`}>
                          Imagem do Produto
                        </span>
                      </div>
                      <h3 
                        className="font-semibold text-sm mb-1"
                        style={{ color: previewMode === 'dark' ? '#f1f5f9' : (formData.text_color || '#1f2937') }}
                      >
                        Nome do Produto
                      </h3>
                      <p className={`text-xs mb-2 ${previewMode === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                        Descrição breve do medicamento
                      </p>
                      <div className="flex items-center justify-between">
                        <span 
                          className="font-bold text-sm"
                          style={{ color: formData.primary_color || '#059669' }}
                        >
                          R$ 29,90
                        </span>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="px-3 py-1.5 text-xs text-white font-medium"
                          style={{ 
                            backgroundColor: formData.button_color || '#059669',
                            borderRadius: (formData.button_style || 'rounded') === 'rounded' ? '8px' : 
                                         formData.button_style === 'soft' ? '6px' : '4px'
                          }}
                        >
                          Comprar
                        </motion.button>
                      </div>
                    </motion.div>

                    {/* Botões de Ação */}
                    <motion.div 
                      className="grid grid-cols-2 gap-2"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className="py-2 text-xs text-white font-medium"
                        style={{ 
                          backgroundColor: formData.primary_color || '#059669',
                          borderRadius: (formData.button_style || 'rounded') === 'rounded' ? '10px' : 
                                       formData.button_style === 'soft' ? '8px' : '4px'
                        }}
                      >
                        Ver Ofertas
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className="py-2 text-xs border-2 font-medium"
                        style={{ 
                          color: formData.primary_color || '#059669',
                          borderColor: formData.primary_color || '#059669',
                          backgroundColor: previewMode === 'dark' ? 'transparent' : 'white',
                          borderRadius: (formData.button_style || 'rounded') === 'rounded' ? '10px' : 
                                       formData.button_style === 'soft' ? '8px' : '4px'
                        }}
                      >
                        Catálogo
                      </motion.button>
                    </motion.div>

                    {/* Badges */}
                    <motion.div 
                      className="flex gap-2 justify-center flex-wrap"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.6 }}
                    >
                      <motion.span 
                        whileHover={{ scale: 1.1 }}
                        className="px-3 py-1 text-xs rounded-full font-medium"
                        style={{ 
                          backgroundColor: `${formData.secondary_color || '#0d9488'}${previewMode === 'dark' ? '30' : '20'}`,
                          color: formData.secondary_color || '#0d9488'
                        }}
                      >
                        Entrega Rápida
                      </motion.span>
                      <motion.span 
                        whileHover={{ scale: 1.1 }}
                        className="px-3 py-1 text-xs rounded-full font-medium"
                        style={{ 
                          backgroundColor: `${formData.primary_color || '#059669'}${previewMode === 'dark' ? '30' : '20'}`,
                          color: formData.primary_color || '#059669'
                        }}
                      >
                        Frete Grátis
                      </motion.span>
                    </motion.div>

                    {/* Footer Info */}
                    <motion.div 
                      className="pt-4 border-t-2 text-center"
                      style={{ borderColor: `${formData.primary_color || '#059669'}20` }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.7 }}
                    >
                      <p className={`text-xs ${previewMode === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                        Fonte: {fontOptions.find(f => f.value === formData.font_family)?.label || 'Inter'}
                      </p>
                      <p className={`text-xs mt-1 ${previewMode === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>
                        Modo: {previewMode === 'dark' ? 'Escuro 🌙' : 'Claro ☀️'} • Estilo: {(formData.button_style || 'rounded') === 'rounded' ? 'Arredondado' : 
                                 formData.button_style === 'soft' ? 'Suave' : 'Quadrado'}
                      </p>
                    </motion.div>
                  </motion.div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab: Banners */}
          <TabsContent value="banners" className="space-y-6">
            <Card className="bg-white/60 backdrop-blur-sm border-gray-200/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Banners Promocionais</CardTitle>
                    <CardDescription>Gerencie banners da página inicial</CardDescription>
                  </div>
                  <Button
                    onClick={addBanner}
                    className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Banner
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {formData.banners.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-2xl">
                    <ImagePlus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 mb-4">Nenhum banner criado ainda</p>
                    <Button
                      onClick={addBanner}
                      variant="outline"
                      className="rounded-xl"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Criar Primeiro Banner
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {formData.banners.map((banner, index) => (
                      <div key={banner.id} className="p-6 border-2 rounded-2xl bg-white/50 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-lg">Banner {index + 1}</h3>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={banner.active}
                              onCheckedChange={(v) => updateBanner(banner.id, 'active', v)}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeBanner(banner.id)}
                              className="text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid lg:grid-cols-2 gap-4">
                          <div className="space-y-4">
                            <div>
                              <Label>Imagem do Banner</Label>
                              {banner.image_url ? (
                                <div className="relative mt-2">
                                  <img
                                    src={banner.image_url}
                                    alt="Banner"
                                    className="w-full h-40 object-cover rounded-xl"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-2 right-2 bg-white shadow-md"
                                    onClick={() => updateBanner(banner.id, 'image_url', '')}
                                  >
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                  </Button>
                                </div>
                              ) : (
                                <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-xl cursor-pointer hover:bg-gray-50 transition-colors mt-2">
                                  <Upload className="w-6 h-6 text-gray-400 mb-2" />
                                  <span className="text-sm text-gray-500">Upload de imagem</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleBannerUpload(e, banner.id)}
                                    className="hidden"
                                  />
                                </label>
                              )}
                            </div>

                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <Label>Botão de Ação</Label>
                                <p className="text-xs text-gray-500">Mostrar botão no banner</p>
                              </div>
                              <Switch
                                checked={banner.has_button !== false}
                                onCheckedChange={(v) => updateBanner(banner.id, 'has_button', v)}
                              />
                            </div>

                            <div>
                              <Label>Posição</Label>
                              <Select
                                value={banner.position || 'hero'}
                                onValueChange={(value) => updateBanner(banner.id, 'position', value)}
                              >
                                <SelectTrigger className="mt-2">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="hero">Topo (Hero)</SelectItem>
                                  <SelectItem value="middle">Meio da Página</SelectItem>
                                  <SelectItem value="footer">Rodapé</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="space-y-4">
                          <div>
                            <Label>Título</Label>
                            <Input
                              value={banner.title || ''}
                              onChange={(e) => updateBanner(banner.id, 'title', e.target.value)}
                              placeholder="Promoção Especial"
                              className="mt-2"
                            />
                          </div>

                          <div>
                            <Label>Subtítulo</Label>
                            <Input
                              value={banner.subtitle || ''}
                              onChange={(e) => updateBanner(banner.id, 'subtitle', e.target.value)}
                              placeholder="Até 50% de desconto"
                              className="mt-2"
                            />
                          </div>

                          <div>
                            <Label>Texto do Botão</Label>
                            <Input
                              value={banner.button_text || ''}
                              onChange={(e) => updateBanner(banner.id, 'button_text', e.target.value)}
                              placeholder="Ver Ofertas"
                              className="mt-2"
                            />
                          </div>

                          <div>
                            <Label>Link</Label>
                            <Input
                              value={banner.link || ''}
                              onChange={(e) => updateBanner(banner.id, 'link', e.target.value)}
                              placeholder="/promocoes"
                              className="mt-2"
                            />
                          </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </motion.div>

        {/* Botão Flutuante Mobile */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg md:hidden z-50"
          style={{ marginLeft: sidebarOpen ? '16rem' : '5rem' }}
        >
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setSearchTerm('')}
              className="flex-1 py-6 rounded-xl text-base"
            >
              <Search className="w-5 h-5 mr-2" />
              Buscar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={saveMutation.isPending || !hasUnsavedChanges}
              className="flex-[2] py-6 bg-emerald-600 hover:bg-emerald-700 rounded-xl disabled:opacity-50 text-base font-semibold"
            >
              {saveMutation.isPending ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </motion.main>
    </div>
  );
}