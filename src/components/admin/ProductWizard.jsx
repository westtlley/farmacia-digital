import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Check, ChevronLeft, ChevronRight, Save, AlertCircle, 
  FileText, DollarSign, Package, Eye, Image as ImageIcon,
  Info, X, Upload
} from 'lucide-react';
import { toast } from 'sonner';

const STEPS = [
  { id: 1, title: 'Identificação', icon: FileText },
  { id: 2, title: 'Info Farmacêutica', icon: Package },
  { id: 3, title: 'Preço & Margem', icon: DollarSign },
  { id: 4, title: 'Estoque & Validade', icon: Package },
  { id: 5, title: 'Loja & Visibilidade', icon: Eye },
  { id: 6, title: 'Imagens', icon: ImageIcon }
];

const categories = [
  { value: 'medicamentos', label: 'Medicamentos' },
  { value: 'dermocosmeticos', label: 'Dermocosméticos' },
  { value: 'vitaminas', label: 'Vitaminas' },
  { value: 'higiene', label: 'Higiene' },
  { value: 'infantil', label: 'Infantil' },
  { value: 'mamae_bebe', label: 'Mamãe & Bebê' },
  { value: 'beleza', label: 'Beleza' },
  { value: 'diabetes', label: 'Diabetes' },
  { value: 'nutricao', label: 'Nutrição' },
  { value: 'ortopedia', label: 'Ortopedia' }
];

const prescriptionTypes = [
  { value: 'simples', label: 'Receita Simples (Branca)' },
  { value: 'retencao', label: 'Receita de Controle Especial (Branca 2 vias)' },
  { value: 'azul', label: 'Receita Azul (Psicotrópicos)' },
  { value: 'amarela', label: 'Receita Amarela (Entorpecentes)' }
];

export default function ProductWizard({ product, onClose, onSuccess }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    // Etapa 1 - Identificação
    name: product?.name || '',
    active_ingredient: product?.active_ingredient || '',
    brand: product?.brand || '',
    category: product?.category || '',
    subcategory: product?.subcategory || '',
    sku: product?.sku || '',
    barcode: product?.barcode || '',
    
    // Etapa 2 - Info Farmacêutica
    dosage: product?.dosage || '',
    presentation: product?.presentation || '',
    quantity_per_package: product?.quantity_per_package || '',
    usage_type: product?.usage_type || '',
    is_generic: product?.is_generic || false,
    requires_prescription: product?.requires_prescription || false,
    prescription_type: product?.prescription_type || '',
    is_controlled: product?.is_controlled || false,
    
    // Etapa 3 - Preço & Margem
    cost_price: product?.cost_price || '',
    margin_percentage: product?.margin_percentage || '',
    price: product?.price || '',
    original_price: product?.original_price || '',
    is_promotion: product?.is_promotion || false,
    promotion_starts_at: product?.promotion_starts_at || '',
    promotion_ends_at: product?.promotion_ends_at || '',
    
    // Etapa 4 - Estoque & Validade
    stock_quantity: product?.stock_quantity || '',
    min_stock: product?.min_stock || '10',
    batch_number: product?.batch_number || '',
    expiry_date: product?.expiry_date || '',
    
    // Etapa 5 - Loja & Visibilidade
    status: product?.status || 'draft',
    is_featured: product?.is_featured || false,
    allow_online_sale: product?.allow_online_sale ?? true,
    
    // Etapa 6 - Imagens
    image_url: product?.image_url || '',
    images: product?.images || []
  });

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Calcular preço automaticamente
  const calculatePrice = () => {
    const cost = parseFloat(formData.cost_price) || 0;
    const margin = parseFloat(formData.margin_percentage) || 0;
    if (cost > 0 && margin > 0) {
      const calculatedPrice = cost * (1 + margin / 100);
      updateField('price', calculatedPrice.toFixed(2));
    }
  };

  React.useEffect(() => {
    if (formData.cost_price && formData.margin_percentage) {
      calculatePrice();
    }
  }, [formData.cost_price, formData.margin_percentage]);

  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!formData.name || !formData.category) {
          toast.error('Preencha nome e categoria');
          return false;
        }
        return true;
      case 3:
        if (!formData.cost_price || !formData.price) {
          toast.error('Preencha custo e preço de venda');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 6));
      // Auto-save
      localStorage.setItem('product_draft', JSON.stringify(formData));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSave = async (isDraft = false) => {
    if (!isDraft && !validateStep(currentStep)) return;

    setIsSaving(true);
    try {
      const data = {
        ...formData,
        status: isDraft ? 'draft' : 'active',
        price: parseFloat(formData.price) || 0,
        cost_price: parseFloat(formData.cost_price) || 0,
        original_price: formData.original_price ? parseFloat(formData.original_price) : null,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        min_stock: parseInt(formData.min_stock) || 10,
        quantity_per_package: formData.quantity_per_package ? parseInt(formData.quantity_per_package) : null,
        margin_percentage: formData.margin_percentage ? parseFloat(formData.margin_percentage) : null
      };

      if (product?.id) {
        await base44.entities.Product.update(product.id, data);
        toast.success('Produto atualizado!');
      } else {
        await base44.entities.Product.create(data);
        toast.success('Produto criado!');
      }

      localStorage.removeItem('product_draft');
      onSuccess?.();
      onClose?.();
    } catch (error) {
      toast.error('Erro ao salvar produto');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      updateField('image_url', file_url);
      toast.success('Imagem enviada!');
    } catch {
      toast.error('Erro ao enviar imagem');
    }
  };

  const progress = (currentStep / 6) * 100;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              {product ? 'Editar Produto' : 'Novo Produto'}
            </h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">
                Etapa {currentStep} de 6: {STEPS[currentStep - 1].title}
              </span>
              <span className="text-gray-500">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Steps */}
          <div className="flex items-center justify-between mt-4">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isCompleted = step.id < currentStep;
              const isCurrent = step.id === currentStep;
              
              return (
                <div key={step.id} className="flex flex-col items-center flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isCompleted ? 'bg-emerald-500 text-white' :
                    isCurrent ? 'bg-emerald-100 text-emerald-600 ring-2 ring-emerald-500' :
                    'bg-gray-100 text-gray-400'
                  }`}>
                    {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={`text-xs mt-2 hidden sm:block ${
                    isCurrent ? 'text-emerald-600 font-semibold' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Etapa 1 - Identificação */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Identificação do Produto</CardTitle>
                  <CardDescription>Informações básicas obrigatórias</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Nome Comercial *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      placeholder="Ex: Paracetamol 500mg"
                    />
                  </div>

                  <div>
                    <Label>Princípio Ativo</Label>
                    <Input
                      value={formData.active_ingredient}
                      onChange={(e) => updateField('active_ingredient', e.target.value)}
                      placeholder="Ex: Paracetamol"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Marca / Laboratório</Label>
                      <Input
                        value={formData.brand}
                        onChange={(e) => updateField('brand', e.target.value)}
                        placeholder="Ex: EMS"
                      />
                    </div>

                    <div>
                      <Label>Categoria *</Label>
                      <Select value={formData.category} onValueChange={(v) => updateField('category', v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>SKU / Código Interno</Label>
                      <Input
                        value={formData.sku}
                        onChange={(e) => updateField('sku', e.target.value)}
                        placeholder="Ex: MED-001"
                      />
                    </div>

                    <div>
                      <Label>Código de Barras (EAN)</Label>
                      <Input
                        value={formData.barcode}
                        onChange={(e) => updateField('barcode', e.target.value)}
                        placeholder="Ex: 7891234567890"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Etapa 2 - Info Farmacêutica */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Informações Farmacêuticas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Dosagem</Label>
                      <Input
                        value={formData.dosage}
                        onChange={(e) => updateField('dosage', e.target.value)}
                        placeholder="Ex: 500mg"
                      />
                    </div>

                    <div>
                      <Label>Apresentação</Label>
                      <Select value={formData.presentation} onValueChange={(v) => updateField('presentation', v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="comprimido">Comprimido</SelectItem>
                          <SelectItem value="capsula">Cápsula</SelectItem>
                          <SelectItem value="xarope">Xarope</SelectItem>
                          <SelectItem value="pomada">Pomada</SelectItem>
                          <SelectItem value="creme">Creme</SelectItem>
                          <SelectItem value="spray">Spray</SelectItem>
                          <SelectItem value="frasco">Frasco</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Qtd. por Embalagem</Label>
                      <Input
                        type="number"
                        value={formData.quantity_per_package}
                        onChange={(e) => updateField('quantity_per_package', e.target.value)}
                        placeholder="Ex: 20"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Produto Genérico?</p>
                      <p className="text-sm text-gray-600">Medicamento genérico intercambiável</p>
                    </div>
                    <Switch
                      checked={formData.is_generic}
                      onCheckedChange={(v) => updateField('is_generic', v)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Exige Receita?</p>
                      <p className="text-sm text-gray-600">Produto requer prescrição médica</p>
                    </div>
                    <Switch
                      checked={formData.requires_prescription}
                      onCheckedChange={(v) => updateField('requires_prescription', v)}
                    />
                  </div>

                  {formData.requires_prescription && (
                    <>
                      <div>
                        <Label>Tipo de Receita</Label>
                        <Select value={formData.prescription_type} onValueChange={(v) => updateField('prescription_type', v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            {prescriptionTypes.map(type => (
                              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {(formData.prescription_type === 'azul' || formData.prescription_type === 'amarela') && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-red-900">Medicamento Controlado</p>
                            <p className="text-sm text-red-700 mt-1">
                              Este produto está sujeito à legislação especial. A receita será retida conforme RDC 344/98 da ANVISA.
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Etapa 3 - Preço & Margem */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Precificação Inteligente</CardTitle>
                  <CardDescription>Controle de custos e margem de lucro</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Custo do Produto *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.cost_price}
                        onChange={(e) => updateField('cost_price', e.target.value)}
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <Label>Margem Desejada (%) *</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.margin_percentage}
                        onChange={(e) => updateField('margin_percentage', e.target.value)}
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <Label>Preço de Venda *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.price}
                        readOnly
                        className="bg-gray-50 font-bold"
                      />
                    </div>
                  </div>

                  {formData.cost_price && formData.price && (
                    <div className="p-4 bg-emerald-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Lucro por unidade:</span>
                        <span className="font-bold text-emerald-600">
                          R$ {(parseFloat(formData.price) - parseFloat(formData.cost_price)).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm text-gray-600">Margem real:</span>
                        <span className="font-bold text-emerald-600">
                          {formData.margin_percentage}%
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <Label>Produto em Promoção?</Label>
                      <Switch
                        checked={formData.is_promotion}
                        onCheckedChange={(v) => updateField('is_promotion', v)}
                      />
                    </div>

                    {formData.is_promotion && (
                      <div className="space-y-4">
                        <div>
                          <Label>Preço Promocional</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.original_price}
                            onChange={(e) => updateField('original_price', e.target.value)}
                            placeholder="Preço antes da promoção"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Início da Promoção</Label>
                            <Input
                              type="datetime-local"
                              value={formData.promotion_starts_at}
                              onChange={(e) => updateField('promotion_starts_at', e.target.value)}
                            />
                          </div>

                          <div>
                            <Label>Fim da Promoção</Label>
                            <Input
                              type="datetime-local"
                              value={formData.promotion_ends_at}
                              onChange={(e) => updateField('promotion_ends_at', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Etapa 4 - Estoque & Validade */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Controle de Estoque</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Quantidade em Estoque</Label>
                      <Input
                        type="number"
                        value={formData.stock_quantity}
                        onChange={(e) => updateField('stock_quantity', e.target.value)}
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <Label>Estoque Mínimo (Alerta)</Label>
                      <Input
                        type="number"
                        value={formData.min_stock}
                        onChange={(e) => updateField('min_stock', e.target.value)}
                        placeholder="10"
                      />
                    </div>
                  </div>

                  {formData.stock_quantity && formData.min_stock && 
                   parseInt(formData.stock_quantity) <= parseInt(formData.min_stock) && (
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-orange-600" />
                      <p className="text-sm text-orange-800">
                        <strong>Estoque baixo!</strong> A quantidade está no limite mínimo.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Número do Lote</Label>
                      <Input
                        value={formData.batch_number}
                        onChange={(e) => updateField('batch_number', e.target.value)}
                        placeholder="Ex: LOT202401"
                      />
                    </div>

                    <div>
                      <Label>Data de Validade</Label>
                      <Input
                        type="date"
                        value={formData.expiry_date}
                        onChange={(e) => updateField('expiry_date', e.target.value)}
                      />
                    </div>
                  </div>

                  {formData.expiry_date && new Date(formData.expiry_date) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <p className="text-sm text-red-800">
                        <strong>Atenção!</strong> Produto próximo ao vencimento (menos de 3 meses).
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Etapa 5 - Loja & Visibilidade */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Visibilidade na Loja</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Status do Produto</Label>
                    <Select value={formData.status} onValueChange={(v) => updateField('status', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Rascunho (não aparece na loja)</SelectItem>
                        <SelectItem value="active">Ativo (visível na loja)</SelectItem>
                        <SelectItem value="inactive">Inativo (oculto)</SelectItem>
                        <SelectItem value="out_of_stock">Sem estoque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Produto em Destaque</p>
                      <p className="text-sm text-gray-600">Aparece na seção "Mais Vendidos"</p>
                    </div>
                    <Switch
                      checked={formData.is_featured}
                      onCheckedChange={(v) => updateField('is_featured', v)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Permitir Venda Online</p>
                      <p className="text-sm text-gray-600">Cliente pode comprar pelo site</p>
                    </div>
                    <Switch
                      checked={formData.allow_online_sale}
                      onCheckedChange={(v) => updateField('allow_online_sale', v)}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Etapa 6 - Imagens */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Imagens do Produto</CardTitle>
                  <CardDescription>Pelo menos uma imagem é obrigatória</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {formData.image_url ? (
                    <div className="relative">
                      <img
                        src={formData.image_url}
                        alt="Produto"
                        className="w-full h-64 object-contain bg-gray-50 rounded-lg"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => updateField('image_url', '')}
                      >
                        Remover
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                      <Upload className="w-12 h-12 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500">Clique para enviar imagem</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}

                  <div className="p-4 bg-blue-50 rounded-lg flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-semibold mb-1">Dicas para boas imagens:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Use fundo branco ou neutro</li>
                        <li>Boa iluminação</li>
                        <li>Produto centralizado</li>
                        <li>Resolução mínima 800x800px</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => handleSave(true)}
              disabled={isSaving}
            >
              <Save className="w-4 h-4 mr-2" />
              Salvar Rascunho
            </Button>
          </div>

          <div className="flex items-center gap-3">
            {currentStep > 1 && (
              <Button variant="outline" onClick={prevStep}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Anterior
              </Button>
            )}

            {currentStep < 6 ? (
              <Button onClick={nextStep} className="bg-emerald-600 hover:bg-emerald-700">
                Próximo
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={() => handleSave(false)}
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isSaving ? 'Salvando...' : 'Finalizar e Publicar'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}