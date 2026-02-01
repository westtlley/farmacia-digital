import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import SectionEditor from '@/components/admin/SectionEditor';
import { 
  ArrowLeft,
  Save, 
  Eye,
  Palette,
  Layout as LayoutIcon,
  Layers,
  Sliders,
  Grid3x3,
  CreditCard,
  Sparkles
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { toast } from 'sonner';
import { Loader2, AlertCircle } from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { useAdminSidebar } from '@/contexts/AdminSidebarContext';

export default function AdminStoreEditor() {
  const queryClient = useQueryClient();
  const { sidebarOpen } = useAdminSidebar();
  
  const [formData, setFormData] = useState({
    theme: {
      colors: {
        primary: '#059669',
        secondary: '#0d9488',
        background: '#ffffff',
        text: '#1f2937',
        card: '#ffffff'
      },
      radius: {
        card: '16px',
        button: '12px',
        input: '8px'
      },
      shadow: 'soft',
      font: 'inter'
    },
    layout: {
      headerStyle: 'withSearch',
      productCardStyle: 'modern',
      gridStyle: 'adaptive',
      homeSections: [
        {id: '1', type: 'hero', enabled: true, order: 1},
        {id: '2', type: 'categories', enabled: true, order: 2},
        {id: '3', type: 'promotions', enabled: true, order: 3},
        {id: '4', type: 'featured', enabled: true, order: 4},
        {id: '5', type: 'cta', enabled: true, order: 5}
      ]
    },
    sections: {
      hero: { enabled: true, animation: 'slide', height: 'medium' },
      categories: { enabled: true, style: 'grid' },
      promotions: { enabled: true, limit: 8 },
      featured: { enabled: true, limit: 8 },
      cta: { enabled: true, title: 'Envie sua Receita', subtitle: '' }
    }
  });

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['pharmacySettings'],
    queryFn: async () => {
      const data = await base44.entities.PharmacySettings.list('', 1);
      if (data && data.length > 0) {
        const s = data[0];
        setFormData({
          theme: s.theme || formData.theme,
          layout: s.layout || formData.layout,
          sections: s.sections || formData.sections
        });
        return data[0];
      }
      return null;
    },
    onError: (error) => {
      console.error('Erro ao carregar configurações:', error);
      toast.error('Erro ao carregar configurações. Tente recarregar a página.');
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (settings) {
        return base44.entities.PharmacySettings.update(settings.id, data);
      } else {
        return base44.entities.PharmacySettings.create(data);
      }
    },
    onSuccess: (data) => {
      // Invalidar e atualizar cache imediatamente
      queryClient.invalidateQueries(['pharmacySettings']);
      queryClient.setQueryData(['pharmacySettings'], [data]);
      queryClient.refetchQueries(['pharmacySettings']);
      toast.success('Editor da loja salvo com sucesso! As alterações já estão em vigor.');
    },
    onError: (error) => {
      console.error('Erro ao salvar editor da loja:', error);
      toast.error('Erro ao salvar: ' + (error.message || 'Tente novamente'));
    }
  });

  const handleSubmit = () => {
    saveMutation.mutate({
      ...settings,
      theme: formData.theme,
      layout: formData.layout,
      sections: formData.sections
    });
  };

  const updateThemeColor = (key, value) => {
    setFormData(prev => ({
      ...prev,
      theme: {
        ...prev.theme,
        colors: {
          ...prev.theme.colors,
          [key]: value
        }
      }
    }));
  };

  const updateThemeRadius = (key, value) => {
    setFormData(prev => ({
      ...prev,
      theme: {
        ...prev.theme,
        radius: {
          ...prev.theme.radius,
          [key]: value
        }
      }
    }));
  };

  const updateSectionConfig = (sectionType, field, value) => {
    setFormData(prev => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionType]: {
          ...prev.sections[sectionType],
          [field]: value
        }
      }
    }));
  };

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
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
          <motion.header 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 sticky top-0 z-40 shadow-sm"
          >
            <div className="px-4 sm:px-6 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Link to={createPageUrl('AdminDashboard')}>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <ArrowLeft className="w-5 h-5" />
                    </Button>
                  </Link>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                      Editor da Loja
                    </h1>
                <p className="text-sm text-gray-500">Personalize visual e layout da sua farmácia</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('Home')}>
                <Button variant="outline" className="rounded-xl">
                  <Eye className="w-4 h-4 mr-2" />
                  Ver Loja
                </Button>
              </Link>
              <Button 
                onClick={handleSubmit}
                disabled={saveMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
              >
                <Save className="w-4 h-4 mr-2" />
                {saveMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </div>
        </div>
        </motion.header>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="p-4 sm:p-6 max-w-7xl mx-auto"
        >
        <Tabs defaultValue="appearance" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="w-4 h-4" />
              Aparência
            </TabsTrigger>
            <TabsTrigger value="layout" className="gap-2">
              <LayoutIcon className="w-4 h-4" />
              Layout
            </TabsTrigger>
            <TabsTrigger value="sections" className="gap-2">
              <Layers className="w-4 h-4" />
              Seções
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-2">
              <Sliders className="w-4 h-4" />
              Configuração
            </TabsTrigger>
          </TabsList>

          {/* Aparência */}
          <TabsContent value="appearance" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Paleta de Cores</CardTitle>
                    <CardDescription>Cores da sua marca</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(formData.theme.colors).map(([key, value]) => (
                      <div key={key}>
                        <Label className="capitalize">{key === 'primary' ? 'Primária' : key === 'secondary' ? 'Secundária' : key === 'background' ? 'Fundo' : key === 'text' ? 'Texto' : 'Card'}</Label>
                        <div className="flex gap-3 mt-2">
                          <Input
                            type="color"
                            value={value}
                            onChange={(e) => updateThemeColor(key, e.target.value)}
                            className="w-20 h-12 p-1 cursor-pointer"
                          />
                          <Input
                            value={value}
                            onChange={(e) => updateThemeColor(key, e.target.value)}
                            className="flex-1"
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Bordas e Sombras</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Cards: {formData.theme.radius.card}</Label>
                      <Slider
                        value={[parseInt(formData.theme.radius.card)]}
                        onValueChange={([v]) => updateThemeRadius('card', `${v}px`)}
                        min={0}
                        max={24}
                        step={2}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>Botões: {formData.theme.radius.button}</Label>
                      <Slider
                        value={[parseInt(formData.theme.radius.button)]}
                        onValueChange={([v]) => updateThemeRadius('button', `${v}px`)}
                        min={0}
                        max={24}
                        step={2}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>Inputs: {formData.theme.radius.input}</Label>
                      <Slider
                        value={[parseInt(formData.theme.radius.input)]}
                        onValueChange={([v]) => updateThemeRadius('input', `${v}px`)}
                        min={0}
                        max={24}
                        step={2}
                        className="mt-2"
                      />
                    </div>
                    
                    <div>
                      <Label>Estilo de Sombra</Label>
                      <div className="grid grid-cols-3 gap-3 mt-2">
                        {[
                          { value: 'flat', label: 'Plano' },
                          { value: 'soft', label: 'Suave' },
                          { value: 'strong', label: 'Forte' }
                        ].map(shadow => (
                          <button
                            key={shadow.value}
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              theme: { ...prev.theme, shadow: shadow.value }
                            }))}
                            className={`p-3 border-2 rounded-lg transition-all ${
                              formData.theme.shadow === shadow.value
                                ? 'border-emerald-500 bg-emerald-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <span className="text-sm font-medium">{shadow.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Tipografia</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Label>Fonte Principal</Label>
                    <Select
                      value={formData.theme.font}
                      onValueChange={(value) => setFormData(prev => ({ 
                        ...prev, 
                        theme: { ...prev.theme, font: value }
                      }))}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inter">Inter</SelectItem>
                        <SelectItem value="poppins">Poppins</SelectItem>
                        <SelectItem value="roboto">Roboto</SelectItem>
                        <SelectItem value="montserrat">Montserrat</SelectItem>
                        <SelectItem value="lato">Lato</SelectItem>
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
              </div>

              {/* Preview */}
              <Card className="sticky top-24 h-fit">
                <CardHeader>
                  <CardTitle>Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div 
                    className="p-6 space-y-4"
                    style={{ 
                      backgroundColor: formData.theme.colors.background,
                      borderRadius: formData.theme.radius.card,
                      fontFamily: formData.theme.font
                    }}
                  >
                    <div 
                      className="p-4"
                      style={{ 
                        backgroundColor: formData.theme.colors.card,
                        borderRadius: formData.theme.radius.card,
                        boxShadow: formData.theme.shadow === 'flat' ? 'none' : 
                                  formData.theme.shadow === 'soft' ? '0 2px 8px rgba(0,0,0,0.08)' : 
                                  '0 4px 16px rgba(0,0,0,0.15)'
                      }}
                    >
                      <h3 
                        className="font-bold mb-2"
                        style={{ color: formData.theme.colors.text }}
                      >
                        Card de Produto
                      </h3>
                      <p className="text-sm" style={{ color: formData.theme.colors.text + 'aa' }}>
                        Este é um exemplo de card
                      </p>
                    </div>

                    <button
                      className="w-full py-3 text-white font-medium"
                      style={{ 
                        backgroundColor: formData.theme.colors.primary,
                        borderRadius: formData.theme.radius.button
                      }}
                    >
                      Botão Exemplo
                    </button>

                    <input
                      placeholder="Campo de entrada"
                      className="w-full px-4 py-2 border"
                      style={{ 
                        borderRadius: formData.theme.radius.input,
                        borderColor: formData.theme.colors.primary + '40'
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Layout */}
          <TabsContent value="layout" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Estilo do Header</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { value: 'centered', label: 'Centralizado', desc: 'Logo no centro' },
                    { value: 'withSearch', label: 'Com Busca', desc: 'Barra de busca visível' },
                    { value: 'minimal', label: 'Minimalista', desc: 'Limpo e simples' }
                  ].map(style => (
                    <button
                      key={style.value}
                      onClick={() => setFormData(prev => ({ 
                        ...prev, 
                        layout: { ...prev.layout, headerStyle: style.value }
                      }))}
                      className={`p-4 border-2 rounded-xl text-left transition-all ${
                        formData.layout.headerStyle === style.value
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="font-medium mb-1">{style.label}</p>
                      <p className="text-xs text-gray-600">{style.desc}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Estilo dos Cards de Produto</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { value: 'compact', label: 'Compacto', desc: 'Mais produtos por linha' },
                    { value: 'modern', label: 'Moderno', desc: 'Espaçamento balanceado' },
                    { value: 'elevated', label: 'Elevado', desc: 'Sombra e destaque' }
                  ].map(style => (
                    <button
                      key={style.value}
                      onClick={() => setFormData(prev => ({ 
                        ...prev, 
                        layout: { ...prev.layout, productCardStyle: style.value }
                      }))}
                      className={`p-4 border-2 rounded-xl text-left transition-all ${
                        formData.layout.productCardStyle === style.value
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="font-medium mb-1">{style.label}</p>
                      <p className="text-xs text-gray-600">{style.desc}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Grade de Produtos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { value: '2cols', label: '2 Colunas', desc: 'Cards maiores' },
                    { value: '3cols', label: '3 Colunas', desc: 'Balanceado' },
                    { value: 'adaptive', label: 'Adaptativo', desc: '2-4 colunas responsivo' }
                  ].map(grid => (
                    <button
                      key={grid.value}
                      onClick={() => setFormData(prev => ({ 
                        ...prev, 
                        layout: { ...prev.layout, gridStyle: grid.value }
                      }))}
                      className={`p-4 border-2 rounded-xl text-left transition-all ${
                        formData.layout.gridStyle === grid.value
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="font-medium mb-1">{grid.label}</p>
                      <p className="text-xs text-gray-600">{grid.desc}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Seções */}
          <TabsContent value="sections" className="space-y-6">
            <SectionEditor 
              sections={formData.layout.homeSections}
              onChange={(newSections) => setFormData(prev => ({
                ...prev,
                layout: { ...prev.layout, homeSections: newSections }
              }))}
            />

            <Card>
              <CardHeader>
                <CardTitle>Configurações de Seções</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Hero */}
                <div className="p-4 border rounded-xl space-y-4">
                  <h4 className="font-semibold">Banner Hero</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Animação</Label>
                      <Select
                        value={formData.sections.hero?.animation}
                        onValueChange={(v) => updateSectionConfig('hero', 'animation', v)}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fade">Fade</SelectItem>
                          <SelectItem value="slide">Slide</SelectItem>
                          <SelectItem value="none">Sem animação</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Altura</Label>
                      <Select
                        value={formData.sections.hero?.height}
                        onValueChange={(v) => updateSectionConfig('hero', 'height', v)}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Pequeno</SelectItem>
                          <SelectItem value="medium">Médio</SelectItem>
                          <SelectItem value="large">Grande</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Categories */}
                <div className="p-4 border rounded-xl space-y-4">
                  <h4 className="font-semibold">Categorias</h4>
                  <div>
                    <Label>Estilo de Exibição</Label>
                    <Select
                      value={formData.sections.categories?.style}
                      onValueChange={(v) => updateSectionConfig('categories', 'style', v)}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="grid">Grade</SelectItem>
                        <SelectItem value="carousel">Carrossel</SelectItem>
                        <SelectItem value="list">Lista</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Promotions */}
                <div className="p-4 border rounded-xl space-y-4">
                  <h4 className="font-semibold">Ofertas</h4>
                  <div>
                    <Label>Limite de produtos: {formData.sections.promotions?.limit}</Label>
                    <Slider
                      value={[formData.sections.promotions?.limit || 8]}
                      onValueChange={([v]) => updateSectionConfig('promotions', 'limit', v)}
                      min={4}
                      max={20}
                      step={4}
                      className="mt-2"
                    />
                  </div>
                </div>

                {/* Featured */}
                <div className="p-4 border rounded-xl space-y-4">
                  <h4 className="font-semibold">Mais Vendidos</h4>
                  <div>
                    <Label>Limite de produtos: {formData.sections.featured?.limit}</Label>
                    <Slider
                      value={[formData.sections.featured?.limit || 8]}
                      onValueChange={([v]) => updateSectionConfig('featured', 'limit', v)}
                      min={4}
                      max={20}
                      step={4}
                      className="mt-2"
                    />
                  </div>
                </div>

                {/* CTA */}
                <div className="p-4 border rounded-xl space-y-4">
                  <h4 className="font-semibold">Call to Action (Receita)</h4>
                  <div>
                    <Label>Título</Label>
                    <Input
                      value={formData.sections.cta?.title}
                      onChange={(e) => updateSectionConfig('cta', 'title', e.target.value)}
                      placeholder="Envie sua Receita"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Subtítulo</Label>
                    <Input
                      value={formData.sections.cta?.subtitle}
                      onChange={(e) => updateSectionConfig('cta', 'subtitle', e.target.value)}
                      placeholder="Receba um orçamento em minutos"
                      className="mt-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Config */}
          <TabsContent value="config" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Resumo da Configuração</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 mb-1">Seções ativas</p>
                    <p className="font-semibold text-xl">
                      {formData.layout.homeSections.filter(s => s.enabled).length}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 mb-1">Fonte</p>
                    <p className="font-semibold text-xl capitalize">{formData.theme.font}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 mb-1">Estilo de grid</p>
                    <p className="font-semibold text-xl">{formData.layout.gridStyle}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 mb-1">Sombra</p>
                    <p className="font-semibold text-xl capitalize">{formData.theme.shadow}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </motion.div>
        </div>
      </motion.main>
    </div>
  );
}