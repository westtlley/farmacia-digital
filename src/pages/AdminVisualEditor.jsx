import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  ArrowLeft,
  Save, 
  Eye,
  EyeOff,
  Palette,
  Layout as LayoutIcon,
  Image as ImageIcon,
  Layers,
  Settings,
  Monitor,
  Smartphone,
  Tablet,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from 'sonner';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { useAdminSidebar } from '@/contexts/AdminSidebarContext';

const sectionIcons = {
  hero: ImageIcon,
  categories: LayoutIcon,
  promotions: Palette,
  featured: Layers,
  cta: Settings
};

export default function AdminVisualEditor() {
  const queryClient = useQueryClient();
  const { sidebarOpen } = useAdminSidebar();
  const [previewDevice, setPreviewDevice] = useState('desktop'); // desktop, tablet, mobile
  const [selectedSection, setSelectedSection] = useState(null);
  const [iframeKey, setIframeKey] = useState(0);
  
  const [formData, setFormData] = useState({
    logo_url: '',
    logo_scale: 1,
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
    },
    banners: []
  });

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['pharmacySettings'],
    queryFn: async () => {
      const data = await base44.entities.PharmacySettings.list('', 1);
      if (data && data.length > 0) {
        const s = data[0];
        setFormData({
          logo_url: s.logo_url || '',
          logo_scale: s.logo_scale || 1,
          theme: s.theme || formData.theme,
          layout: s.layout || formData.layout,
          sections: s.sections || formData.sections,
          banners: s.banners || []
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
      setIframeKey(prev => prev + 1);
      toast.success('Editor visual salvo com sucesso! As alterações já estão em vigor.');
    },
    onError: (error) => {
      console.error('Erro ao salvar editor visual:', error);
      toast.error('Erro ao salvar: ' + (error.message || 'Tente novamente'));
    }
  });

  const handleSave = () => {
    saveMutation.mutate({
      ...settings,
      ...formData
    });
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(formData.layout.homeSections);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedItems = items.map((item, index) => ({
      ...item,
      order: index + 1
    }));

    setFormData(prev => ({
      ...prev,
      layout: {
        ...prev.layout,
        homeSections: updatedItems
      }
    }));
  };

  const toggleSection = (sectionId) => {
    setFormData(prev => ({
      ...prev,
      layout: {
        ...prev.layout,
        homeSections: prev.layout.homeSections.map(s =>
          s.id === sectionId ? { ...s, enabled: !s.enabled } : s
        )
      }
    }));
  };

  const updateColor = (key, value) => {
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

  const handleBannerUpload = async (e, bannerId) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    
    setFormData(prev => ({
      ...prev,
      banners: prev.banners.map(b => 
        b.id === bannerId ? { ...b, image_url: file_url } : b
      )
    }));
    toast.success('Imagem enviada!');
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
      position: 'hero'
    };
    setFormData(prev => ({
      ...prev,
      banners: [...prev.banners, newBanner]
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

  const removeBanner = (bannerId) => {
    setFormData(prev => ({
      ...prev,
      banners: prev.banners.filter(b => b.id !== bannerId)
    }));
  };

  const deviceSizes = {
    desktop: 'w-full',
    tablet: 'w-[768px]',
    mobile: 'w-[375px]'
  };

  return (
    <div className="h-screen flex bg-gray-100">
      <AdminSidebar />
      
      <motion.main 
        initial={false}
        animate={{ 
          marginLeft: sidebarOpen ? '16rem' : '5rem'
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="flex-1"
      >
        <div className="h-screen flex flex-col bg-gray-900">
          {/* Top Bar */}
          <motion.header 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between sticky top-0 z-40"
          >
        <div className="flex items-center gap-4">
          <Link to={createPageUrl('AdminDashboard')}>
            <Button variant="ghost" size="icon" className="text-gray-300 hover:text-white hover:bg-gray-700">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-white font-semibold">Editor Visual da Loja</h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={previewDevice === 'desktop' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setPreviewDevice('desktop')}
            className="text-gray-300 hover:text-white"
          >
            <Monitor className="w-4 h-4" />
          </Button>
          <Button
            variant={previewDevice === 'tablet' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setPreviewDevice('tablet')}
            className="text-gray-300 hover:text-white"
          >
            <Tablet className="w-4 h-4" />
          </Button>
          <Button
            variant={previewDevice === 'mobile' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setPreviewDevice('mobile')}
            className="text-gray-300 hover:text-white"
          >
            <Smartphone className="w-4 h-4" />
          </Button>

          <div className="w-px h-6 bg-gray-600 mx-2" />

          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
          </motion.header>

          <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r flex flex-col">
          <Tabs defaultValue="sections" className="flex-1 flex flex-col">
            <TabsList className="grid grid-cols-3 m-2">
              <TabsTrigger value="sections" className="text-xs">
                <Layers className="w-3 h-3 mr-1" />
                Seções
              </TabsTrigger>
              <TabsTrigger value="appearance" className="text-xs">
                <Palette className="w-3 h-3 mr-1" />
                Visual
              </TabsTrigger>
              <TabsTrigger value="banners" className="text-xs">
                <ImageIcon className="w-3 h-3 mr-1" />
                Banners
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1">
              {/* Seções */}
              <TabsContent value="sections" className="p-4 space-y-4 mt-0">
                <div>
                  <h3 className="font-semibold mb-3">Ordem das Seções</h3>
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="sections">
                      {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                          {formData.layout.homeSections
                            .sort((a, b) => a.order - b.order)
                            .map((section, index) => {
                              const Icon = sectionIcons[section.type] || Layers;
                              return (
                                <Draggable key={section.id} draggableId={section.id} index={index}>
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      className={`flex items-center gap-3 p-3 bg-gray-50 rounded-lg border-2 transition-all ${
                                        snapshot.isDragging ? 'border-emerald-500 shadow-lg' : 'border-gray-200'
                                      } ${selectedSection === section.type ? 'bg-emerald-50 border-emerald-500' : ''}`}
                                      onClick={() => setSelectedSection(section.type)}
                                    >
                                      <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                        <GripVertical className="w-4 h-4 text-gray-400" />
                                      </div>
                                      <Icon className="w-4 h-4 text-gray-600" />
                                      <span className="flex-1 text-sm font-medium capitalize">
                                        {section.type === 'cta' ? 'Call to Action' : section.type}
                                      </span>
                                      <Switch
                                        checked={section.enabled}
                                        onCheckedChange={() => toggleSection(section.id)}
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                </div>

                {/* Section Config */}
                {selectedSection && (
                  <div className="pt-4 border-t space-y-4">
                    <h4 className="font-semibold capitalize">{selectedSection === 'cta' ? 'Call to Action' : selectedSection}</h4>
                    
                    {selectedSection === 'hero' && (
                      <>
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
                      </>
                    )}

                    {selectedSection === 'categories' && (
                      <div>
                        <Label>Estilo</Label>
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
                    )}

                    {(selectedSection === 'promotions' || selectedSection === 'featured') && (
                      <div>
                        <Label>Limite de produtos: {formData.sections[selectedSection]?.limit}</Label>
                        <Slider
                          value={[formData.sections[selectedSection]?.limit || 8]}
                          onValueChange={([v]) => updateSectionConfig(selectedSection, 'limit', v)}
                          min={4}
                          max={20}
                          step={4}
                          className="mt-2"
                        />
                      </div>
                    )}

                    {selectedSection === 'cta' && (
                      <>
                        <div>
                          <Label>Título</Label>
                          <Input
                            value={formData.sections.cta?.title}
                            onChange={(e) => updateSectionConfig('cta', 'title', e.target.value)}
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label>Subtítulo</Label>
                          <Input
                            value={formData.sections.cta?.subtitle}
                            onChange={(e) => updateSectionConfig('cta', 'subtitle', e.target.value)}
                            className="mt-2"
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* Visual */}
              <TabsContent value="appearance" className="p-4 space-y-4 mt-0">
                <div>
                  <h3 className="font-semibold mb-3">Cores</h3>
                  <div className="space-y-3">
                    {Object.entries(formData.theme.colors).map(([key, value]) => (
                      <div key={key}>
                        <Label className="capitalize text-xs">
                          {key === 'primary' ? 'Primária' : 
                           key === 'secondary' ? 'Secundária' : 
                           key === 'background' ? 'Fundo' : 
                           key === 'text' ? 'Texto' : 'Card'}
                        </Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            type="color"
                            value={value}
                            onChange={(e) => updateColor(key, e.target.value)}
                            className="w-12 h-9 p-1 cursor-pointer"
                          />
                          <Input
                            value={value}
                            onChange={(e) => updateColor(key, e.target.value)}
                            className="flex-1 h-9 text-xs"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h3 className="font-semibold mb-3">Bordas</h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Cards: {formData.theme.radius.card}</Label>
                      <Slider
                        value={[parseInt(formData.theme.radius.card)]}
                        onValueChange={([v]) => setFormData(prev => ({
                          ...prev,
                          theme: {
                            ...prev.theme,
                            radius: { ...prev.theme.radius, card: `${v}px` }
                          }
                        }))}
                        min={0}
                        max={24}
                        step={2}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Botões: {formData.theme.radius.button}</Label>
                      <Slider
                        value={[parseInt(formData.theme.radius.button)]}
                        onValueChange={([v]) => setFormData(prev => ({
                          ...prev,
                          theme: {
                            ...prev.theme,
                            radius: { ...prev.theme.radius, button: `${v}px` }
                          }
                        }))}
                        min={0}
                        max={24}
                        step={2}
                        className="mt-2"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Label className="text-xs">Sombra</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {['flat', 'soft', 'strong'].map(shadow => (
                      <button
                        key={shadow}
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          theme: { ...prev.theme, shadow }
                        }))}
                        className={`p-2 border-2 rounded-lg text-xs transition-all ${
                          formData.theme.shadow === shadow
                            ? 'border-emerald-500 bg-emerald-50'
                            : 'border-gray-200'
                        }`}
                      >
                        {shadow === 'flat' ? 'Plano' : shadow === 'soft' ? 'Suave' : 'Forte'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Label className="text-xs">Fonte</Label>
                  <Select
                    value={formData.theme.font}
                    onValueChange={(v) => setFormData(prev => ({
                      ...prev,
                      theme: { ...prev.theme, font: v }
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
                </div>

                <div className="pt-4 border-t">
                  <Label className="text-xs">Estilo de Grid</Label>
                  <Select
                    value={formData.layout.gridStyle}
                    onValueChange={(v) => setFormData(prev => ({
                      ...prev,
                      layout: { ...prev.layout, gridStyle: v }
                    }))}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2cols">2 Colunas</SelectItem>
                      <SelectItem value="3cols">3 Colunas</SelectItem>
                      <SelectItem value="adaptive">Adaptativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              {/* Banners */}
              <TabsContent value="banners" className="p-4 space-y-4 mt-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Banners Hero</h3>
                  <Button size="sm" onClick={addBanner} className="bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {formData.banners.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <ImageIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 mb-3">Sem banners</p>
                    <Button size="sm" variant="outline" onClick={addBanner}>
                      Adicionar Banner
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formData.banners.map((banner, index) => (
                      <div key={banner.id} className="p-3 border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Banner {index + 1}</span>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={banner.active}
                              onCheckedChange={(v) => updateBanner(banner.id, 'active', v)}
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => removeBanner(banner.id)}
                              className="h-8 w-8 text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {banner.image_url ? (
                          <div className="relative">
                            <img
                              src={banner.image_url}
                              alt="Banner"
                              className="w-full h-24 object-cover rounded"
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="absolute top-1 right-1 bg-white/90 h-7 w-7"
                              onClick={() => updateBanner(banner.id, 'image_url', '')}
                            >
                              <Trash2 className="w-3 h-3 text-red-600" />
                            </Button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed rounded cursor-pointer hover:bg-gray-50">
                            <ImageIcon className="w-6 h-6 text-gray-400 mb-1" />
                            <span className="text-xs text-gray-500">Upload</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleBannerUpload(e, banner.id)}
                              className="hidden"
                            />
                          </label>
                        )}

                        <Input
                          placeholder="Título"
                          value={banner.title}
                          onChange={(e) => updateBanner(banner.id, 'title', e.target.value)}
                          className="h-9 text-xs"
                        />
                        <Input
                          placeholder="Subtítulo"
                          value={banner.subtitle}
                          onChange={(e) => updateBanner(banner.id, 'subtitle', e.target.value)}
                          className="h-9 text-xs"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>

        {/* Preview */}
        <div className="flex-1 bg-gray-100 flex items-center justify-center p-8 overflow-auto">
          <div className={`${deviceSizes[previewDevice]} bg-white rounded-lg shadow-2xl overflow-hidden transition-all duration-300`}
               style={{ height: '90vh' }}>
            <iframe
              key={iframeKey}
              src={createPageUrl('Home')}
              className="w-full h-full"
              title="Preview"
            />
          </div>
        </div>
      </div>
        </div>
      </motion.main>
    </div>
  );
}