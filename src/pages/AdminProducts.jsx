import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  LayoutDashboard,
  Package,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  MoreVertical,
  Upload,
  Download,
  Save,
  X,
  Eye,
  ImagePlus,
  CheckSquare,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Tag,
  ArrowUpDown,
  RefreshCw,
  Bell
} from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { useAdminSidebar } from '@/contexts/AdminSidebarContext';
import { notifyProductBackInStock } from '@/utils/stockNotifications';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
import { validateProductForm, validateImage, validateSkuUnique, parseMoney } from '@/utils/validation';
import { getProductImage } from '@/utils/productImages';
import { formatCurrency, unformatCurrency, formatBarcode } from '@/utils/formatters';

const defaultCategories = [
  { value: 'medicamentos', label: 'Medicamentos' },
  { value: 'dermocosmeticos', label: 'Dermocosméticos' },
  { value: 'vitaminas', label: 'Vitaminas' },
  { value: 'higiene', label: 'Higiene' },
  { value: 'infantil', label: 'Infantil' },
  { value: 'mamae_bebe', label: 'Mamãe & Bebê' },
  { value: 'beleza', label: 'Beleza' },
  { value: 'diabetes', label: 'Diabetes' },
  { value: 'nutricao', label: 'Nutrição' },
  { value: 'ortopedia', label: 'Ortopedia' },
  { value: 'primeiros_socorros', label: 'Primeiros Socorros' },
  { value: 'equipamentos', label: 'Equipamentos' }
];

export default function AdminProducts() {
  const queryClient = useQueryClient();
  const { sidebarOpen } = useAdminSidebar();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all'); // 'all', 'in_stock', 'low_stock', 'out_of_stock'
  const [sortBy, setSortBy] = useState('name_asc'); // 'name_asc', 'name_desc', 'price_asc', 'price_desc', 'stock_asc', 'stock_desc', 'created_desc'
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState('');
  const [bulkScope, setBulkScope] = useState('current'); // 'current' ou 'all'
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkProgressText, setBulkProgressText] = useState('');
  const [isBulkCancelled, setIsBulkCancelled] = useState(false);
  const bulkCancelRef = React.useRef(false);
  const [newCategory, setNewCategory] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [categories, setCategories] = useState(defaultCategories);
  const [tempCategories, setTempCategories] = useState([]); // Estado temporário para o diálogo
  const [categoriesToAdd, setCategoriesToAdd] = useState([]); // Categorias a serem adicionadas
  const [categoriesToRemove, setCategoriesToRemove] = useState([]); // Categorias a serem removidas
  const [isSavingCategories, setIsSavingCategories] = useState(false);
  const [bulkData, setBulkData] = useState({
    status: 'active',
    category: '',
    priceAction: 'increase',
    priceType: 'percentage',
    priceValue: '',
    stockAction: 'add',
    stockValue: '',
    is_featured: false,
    is_promotion: false,
    min_stock_enabled: true
  });
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    original_price: '',
    cost_price: '',
    category: '',
    brand: '',
    sku: '',
    barcode: '',
    stock_quantity: '',
    min_stock: '10',
    min_stock_enabled: true,
    dosage: '',
    active_ingredient: '',
    quantity_per_package: '',
    image_url: '', // Mantido para compatibilidade
    images: [], // Array de até 4 imagens
    is_promotion: false,
    is_featured: false,
    is_generic: false,
    requires_prescription: false,
    is_antibiotic: false,
    is_controlled: false,
    has_infinite_stock: false,
    status: 'active'
  });

  const { data: products = [], isLoading, error: productsError } = useQuery({
    queryKey: ['adminProducts'],
    queryFn: () => base44.entities.Product.list('-created_date', 10000),
    onError: (error) => {
      console.error('Erro ao carregar produtos:', error);
      toast.error('Erro ao carregar produtos. Tente recarregar a página.');
    }
  });

  // Verificar e corrigir status de produtos automaticamente quando carregados
  React.useEffect(() => {
    if (products.length === 0 || isLoading) return;

    // Verificar produtos com estoque zerado que estão ativos
    const productsToFix = products.filter(p => {
      // Pular produtos com estoque infinito
      if (p.has_infinite_stock) return false;
      
      const stockQty = p.stock_quantity || 0;
      const minStock = p.min_stock || 10;
      const minStockEnabled = p.min_stock_enabled !== false; // Default é true
      
      // Se está ativo mas deveria estar inativo
      if (p.status === 'active') {
        if (minStockEnabled) {
          // Com controle de estoque mínimo: inativo se < mínimo
          return stockQty < minStock;
        } else {
          // Sem controle de estoque mínimo: inativo se = 0
          return stockQty === 0;
        }
      }
      return false;
    });

    // Corrigir automaticamente (silenciosamente, sem toast)
    if (productsToFix.length > 0) {
      const fixProducts = async () => {
        try {
          const batchSize = 10;
          for (let i = 0; i < productsToFix.length; i += batchSize) {
            const batch = productsToFix.slice(i, i + batchSize);
            await Promise.all(batch.map(async (product) => {
              const stockQty = product.stock_quantity || 0;
              const minStock = product.min_stock || 10;
              const minStockEnabled = product.min_stock_enabled !== false;
              let newStatus = 'inactive';

              if (minStockEnabled) {
                newStatus = stockQty >= minStock ? 'active' : 'inactive';
              } else {
                newStatus = stockQty > 0 ? 'active' : 'inactive';
              }

              if (newStatus !== product.status) {
                await base44.entities.Product.update(product.id, { status: newStatus });
              }
            }));
          }
          // Invalidar query para atualizar a lista
          queryClient.invalidateQueries(['adminProducts']);
        } catch (error) {
          console.error('Erro ao corrigir status automaticamente:', error);
        }
      };
      
      // Executar após um pequeno delay para não bloquear a renderização
      const timeoutId = setTimeout(fixProducts, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [products, isLoading, queryClient]);

  // Carregar categorias do banco
  const { data: dbCategories = [] } = useQuery({
    queryKey: ['adminCategories'],
    queryFn: async () => {
      try {
        const cats = await base44.entities.Category.list('', 100);
        return cats.map(cat => ({
          value: cat.slug,
          label: cat.name,
          id: cat.id
        }));
      } catch (error) {
        console.error('Erro ao carregar categorias:', error);
        return [];
      }
    }
  });

  // Atualizar categorias quando carregar do banco
  useEffect(() => {
    // Sempre usar as categorias do banco, mesmo que seja array vazio
    setCategories(dbCategories);
  }, [dbCategories]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Product.create(data),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries(['adminProducts']);
      await queryClient.invalidateQueries(['products']); // Invalidar também a query pública
      queryClient.setQueryData(['adminProducts'], (old) => [data, ...(old || [])]);
      toast.success('Produto criado com sucesso! Já está disponível no site.');
      closeModal();
    },
    onError: (error) => {
      console.error('Erro ao criar produto:', error);
      toast.error('Erro ao criar produto: ' + (error.message || 'Tente novamente'));
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      // Garantir que o status seja recalculado se campos relacionados ao estoque mudaram
      const product = products.find(p => p.id === id);
      const wasOutOfStock = product && product.stock_quantity <= 0 && !product.has_infinite_stock;
      
      if (product && (
        data.stock_quantity !== undefined || 
        data.min_stock_enabled !== undefined || 
        data.min_stock !== undefined ||
        data.has_infinite_stock !== undefined
      )) {
        const stockQty = data.stock_quantity !== undefined ? data.stock_quantity : (product.stock_quantity || 0);
        const minStock = data.min_stock !== undefined ? data.min_stock : (product.min_stock || 10);
        const hasInfiniteStock = data.has_infinite_stock !== undefined ? data.has_infinite_stock : product.has_infinite_stock;
        const minStockEnabled = data.min_stock_enabled !== undefined ? data.min_stock_enabled : (product.min_stock_enabled !== false);
        
        // Recalcular status baseado nas regras de estoque
        if (hasInfiniteStock) {
          data.status = 'active';
        } else if (minStockEnabled) {
          data.status = stockQty >= minStock ? 'active' : 'inactive';
        } else {
          data.status = stockQty > 0 ? 'active' : 'inactive';
        }
        
        // Atualizar produto
        const updated = await base44.entities.Product.update(id, data);
        
        // Verificar se produto voltou ao estoque
        const isBackInStock = wasOutOfStock && (hasInfiniteStock || stockQty > 0);
        
        // Se voltou ao estoque, enviar notificações
        if (isBackInStock) {
          try {
            const theme = JSON.parse(localStorage.getItem('pharmacyTheme') || '{}');
            const result = await notifyProductBackInStock(
              updated, 
              theme.pharmacyName || 'Farmácia',
              theme.whatsapp || ''
            );
            
            if (result.count > 0) {
              toast.success(`✓ Produto atualizado! ${result.count} notificação(ões) enviada(s).`, {
                description: result.whatsappOpened > 0 ? `WhatsApp aberto para ${result.whatsappOpened} cliente(s)` : undefined,
                duration: 5000
              });
            }
          } catch (error) {
            console.error('Erro ao enviar notificações:', error);
          }
        }
        
        return updated;
      }
      return base44.entities.Product.update(id, data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries(['adminProducts']);
      toast.success('Produto atualizado com sucesso!');
      closeModal();
    },
    onError: (error) => {
      console.error('Erro ao atualizar produto:', error);
      toast.error('Erro ao atualizar produto: ' + (error.message || 'Tente novamente'));
    }
  });

  // Auto-gerenciar status dos produtos - executa apenas ao salvar
  const autoManageProductStatus = React.useCallback(async () => {
    if (products.length === 0) return;

    const updates = [];

    for (const product of products) {
      let newStatus = product.status;

      if (product.has_infinite_stock) {
        newStatus = 'active';
      } else if (product.min_stock_enabled !== false) {
        const stockQty = product.stock_quantity || 0;
        const minStock = product.min_stock || 10;
        if (stockQty < minStock) {
          newStatus = 'inactive';
        } else if (stockQty >= minStock && product.status === 'inactive') {
          newStatus = 'active';
        }
      } else {
        if ((product.stock_quantity || 0) === 0) {
          newStatus = 'inactive';
        } else if ((product.stock_quantity || 0) > 0 && product.status === 'inactive') {
          newStatus = 'active';
        }
      }

      if (newStatus !== product.status) {
        updates.push({ id: product.id, status: newStatus });
      }
    }

    if (updates.length > 0) {
      try {
        await Promise.all(updates.map(update => 
          base44.entities.Product.update(update.id, { status: update.status })
        ));
        queryClient.invalidateQueries(['adminProducts']);
      } catch (error) {
        console.error('Erro ao atualizar status:', error);
      }
    }
  }, [products, queryClient]);

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Product.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['adminProducts']);
      toast.success('Produto excluído!');
    }
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, updates }) => {
      for (const id of ids) {
        await base44.entities.Product.update(id, updates);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['adminProducts']);
      setSelectedProducts([]);
      setIsBulkDialogOpen(false);
      toast.success('Produtos atualizados em massa!');
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      setIsBulkProcessing(true);
      setBulkProgress(0);
      const batchSize = 5;
      let processed = 0;

      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        setBulkProgressText(`Excluindo ${Math.min(i + batchSize, ids.length)} de ${ids.length} produtos...`);
        
        try {
          await Promise.all(batch.map(id => base44.entities.Product.delete(id).catch(err => {
            console.error(`Erro ao excluir produto ${id}:`, err);
            return null;
          })));
        } catch (error) {
          console.error('Erro no batch:', error);
        }
        
        processed += batch.length;
        setBulkProgress(Math.round((processed / ids.length) * 100));
        
        // Pequeno delay para evitar sobrecarga
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      setIsBulkProcessing(false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['adminProducts']);
      setSelectedProducts([]);
      setIsBulkDialogOpen(false);
      toast.success('Produtos excluídos!');
    },
    onError: (error) => {
      setIsBulkProcessing(false);
      toast.error('Erro ao excluir produtos: ' + error.message);
    }
  });

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      description: product.description || '',
      price: product.price?.toString() || '',
      original_price: product.original_price?.toString() || '',
      cost_price: product.cost_price?.toString() || '',
      category: product.category || '',
      brand: product.brand || '',
      sku: product.sku || '',
      barcode: product.barcode || '',
      stock_quantity: product.stock_quantity?.toString() || '',
      min_stock: product.min_stock?.toString() || '10',
      min_stock_enabled: product.min_stock_enabled !== undefined ? product.min_stock_enabled : true,
      dosage: product.dosage || '',
      active_ingredient: product.active_ingredient || '',
      quantity_per_package: product.quantity_per_package?.toString() || '',
      image_url: product.image_url || '', // Compatibilidade
      images: product.images || (product.image_url ? [product.image_url] : []), // Suporta array ou string única
      is_promotion: product.is_promotion || false,
      is_featured: product.is_featured || false,
      is_generic: product.is_generic || false,
      requires_prescription: product.requires_prescription || false,
      is_antibiotic: product.is_antibiotic || false,
      is_controlled: product.is_controlled || false,
      has_infinite_stock: product.has_infinite_stock || false,
      status: product.status || 'active'
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      original_price: '',
      cost_price: '',
      category: '',
      brand: '',
      sku: '',
      barcode: '',
      stock_quantity: '',
      min_stock: '10',
      min_stock_enabled: true,
      dosage: '',
      active_ingredient: '',
      quantity_per_package: '',
      image_url: '', // Compatibilidade
      images: [], // Array de até 4 imagens
      is_promotion: false,
      is_featured: false,
      is_generic: false,
      requires_prescription: false,
      has_infinite_stock: false,
      status: 'active'
    });
  };

  const handleSubmit = async () => {
    // Previne cliques múltiplos
    if (createMutation.isPending || updateMutation.isPending) {
      return;
    }

    // Preparar dados para validação (valores numéricos)
    const validationData = {
      ...formData,
      price: formData.price ? parseFloat(unformatCurrency(formData.price.toString())) : '',
      original_price: formData.original_price ? parseFloat(unformatCurrency(formData.original_price.toString())) : '',
      cost_price: formData.cost_price ? parseFloat(unformatCurrency(formData.cost_price.toString())) : ''
    };
    
    // Validação do formulário
    const validation = validateProductForm(validationData);
    if (!validation.valid) {
      Object.values(validation.errors).forEach(error => {
        toast.error(error);
      });
      return;
    }

    // Validação de SKU único (apenas para novos produtos ou se SKU mudou)
    if (formData.sku && formData.sku.trim()) {
      const skuValidation = await validateSkuUnique(
        formData.sku, 
        products, 
        editingProduct?.id
      );
      if (!skuValidation.valid) {
        toast.error(skuValidation.error);
        return;
      }
    }

    const stockQty = parseInt(formData.stock_quantity) || 0;
    const minStock = parseInt(formData.min_stock) || 10;
    
    // Garantir que image_url seja a primeira imagem se images existir
    const primaryImage = formData.images && formData.images.length > 0 ? formData.images[0] : formData.image_url;
    
    // Converter valores monetários formatados para números
    const priceValue = formData.price ? parseMoney(unformatCurrency(formData.price.toString())) : 0;
    const originalPriceValue = formData.original_price ? parseMoney(unformatCurrency(formData.original_price.toString())) : null;
    const costPriceValue = formData.cost_price ? parseMoney(unformatCurrency(formData.cost_price.toString())) : null;
    
    const data = {
      ...formData,
      price: priceValue,
      original_price: originalPriceValue,
      cost_price: costPriceValue,
      stock_quantity: stockQty,
      min_stock: minStock,
      quantity_per_package: formData.quantity_per_package ? parseInt(formData.quantity_per_package) : null,
      image_url: primaryImage, // Compatibilidade: primeira imagem
      images: formData.images || (formData.image_url ? [formData.image_url] : []) // Array de imagens
    };

    // Status sempre automático baseado nas regras de estoque
    if (formData.has_infinite_stock) {
      // Estoque infinito: sempre ativo
      data.status = 'active';
    } else if (formData.min_stock_enabled) {
      // Estoque mínimo ativado: ativo se >= mínimo, inativo se < mínimo
      data.status = stockQty >= minStock ? 'active' : 'inactive';
    } else {
      // Estoque mínimo desativado: ativo se > 0, inativo se = 0
      data.status = stockQty > 0 ? 'active' : 'inactive';
    }

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleImageUpload = async (e, index = null) => {
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
      
      if (index !== null) {
        // Atualizar imagem específica
        setFormData(prev => {
          const newImages = [...(prev.images || [])];
          newImages[index] = file_url;
          return { 
            ...prev, 
            images: newImages,
            image_url: newImages[0] || prev.image_url // Atualizar image_url para compatibilidade
          };
        });
      } else {
        // Adicionar nova imagem (máximo 4)
        setFormData(prev => {
          const currentImages = prev.images || [];
          if (currentImages.length >= 4) {
            toast.warning('Máximo de 4 imagens por produto');
            return prev;
          }
          const newImages = [...currentImages, file_url];
          return { 
            ...prev, 
            images: newImages,
            image_url: newImages[0] || prev.image_url // Atualizar image_url para compatibilidade
          };
        });
      }
      
      toast.success('Imagem enviada com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao fazer upload da imagem. Tente novamente.');
    }
  };

  const handleRemoveImage = (index) => {
    setFormData(prev => {
      const newImages = [...(prev.images || [])];
      newImages.splice(index, 1);
      return { 
        ...prev, 
        images: newImages,
        image_url: newImages[0] || '' // Atualizar image_url para compatibilidade
      };
    });
  };

  // Abrir diálogo e inicializar estado temporário
  const handleOpenCategoryManager = () => {
    setTempCategories([...categories]);
    setCategoriesToAdd([]);
    setCategoriesToRemove([]);
    setIsCategoryManagerOpen(true);
  };

  // Adicionar categoria ao estado temporário (não salva ainda)
  const handleAddCategory = () => {
    if (!newCategory.trim()) return;
    
    const slug = newCategory.toLowerCase().replace(/\s+/g, '_').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const newCat = {
      value: slug,
      label: newCategory.trim(),
      id: null // Será criado no banco ao salvar
    };
    
    // Verificar se já existe
    if (tempCategories.some(cat => cat.value === slug)) {
      toast.error('Esta categoria já existe!');
      return;
    }
    
    setTempCategories(prev => [...prev, newCat]);
    setCategoriesToAdd(prev => [...prev, newCat]);
    setNewCategory('');
    toast.success('Categoria adicionada à lista. Clique em "Salvar" para confirmar.');
  };

  // Remover categoria do estado temporário (não remove ainda)
  const handleRemoveCategory = (categoryValue) => {
    const catToRemove = tempCategories.find(cat => cat.value === categoryValue);
    if (!catToRemove) return;
    
    // Se a categoria já existe no banco (tem id), adicionar à lista de remoção
    if (catToRemove.id) {
      setCategoriesToRemove(prev => [...prev, catToRemove.id]);
    }
    
    // Remover da lista temporária
    setTempCategories(prev => prev.filter(cat => cat.value !== categoryValue));
    
    // Remover também da lista de adição se estava lá
    setCategoriesToAdd(prev => prev.filter(cat => cat.value !== categoryValue));
    
    toast.success('Categoria removida da lista. Clique em "Salvar" para confirmar.');
  };

  // Salvar todas as mudanças de uma vez
  const handleSaveCategories = async () => {
    setIsSavingCategories(true);
    try {
      // Adicionar novas categorias
      for (const cat of categoriesToAdd) {
        await base44.entities.Category.create({
          name: cat.label,
          slug: cat.value,
          description: `Categoria ${cat.label}`,
          created_date: new Date().toISOString()
        });
      }
      
      // Remover categorias
      for (const catId of categoriesToRemove) {
        await base44.entities.Category.delete(catId);
      }
      
      // Atualizar estado principal
      setCategories(tempCategories);
      
      // Limpar estados temporários
      setCategoriesToAdd([]);
      setCategoriesToRemove([]);
      setNewCategory('');
      
      // Invalidar queries para atualizar no site
      queryClient.invalidateQueries(['categories']);
      queryClient.invalidateQueries(['adminCategories']);
      
      toast.success('Categorias salvas com sucesso! Já estão disponíveis no site.');
      setIsCategoryManagerOpen(false);
    } catch (error) {
      console.error('Erro ao salvar categorias:', error);
      toast.error('Erro ao salvar categorias. Tente novamente.');
    } finally {
      setIsSavingCategories(false);
    }
  };

  const filteredProducts = React.useMemo(() => {
    let filtered = products.filter(product => {
    const matchesSearch = product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.barcode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.brand?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'out_of_stock' && (product.stock_quantity || 0) === 0 && !product.has_infinite_stock) ||
      product.status === statusFilter;
      
      // Filtro de estoque
      const stockQty = product.stock_quantity || 0;
      const minStock = product.min_stock || 10;
      const matchesStock = 
        stockFilter === 'all' ||
        (stockFilter === 'in_stock' && (product.has_infinite_stock || stockQty > minStock)) ||
        (stockFilter === 'low_stock' && !product.has_infinite_stock && stockQty > 0 && stockQty <= minStock) ||
        (stockFilter === 'out_of_stock' && !product.has_infinite_stock && stockQty === 0);
      
      return matchesSearch && matchesCategory && matchesStatus && matchesStock;
    });

    // Aplicar ordenação
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':
          return (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' });
        case 'name_desc':
          return (b.name || '').localeCompare(a.name || '', 'pt-BR', { sensitivity: 'base' });
        case 'price_asc':
          return (a.price || 0) - (b.price || 0);
        case 'price_desc':
          return (b.price || 0) - (a.price || 0);
        case 'stock_asc':
          return (a.stock_quantity || 0) - (b.stock_quantity || 0);
        case 'stock_desc':
          return (b.stock_quantity || 0) - (a.stock_quantity || 0);
        case 'created_desc':
        default:
          return new Date(b.created_date || 0) - new Date(a.created_date || 0);
      }
    });

    return filtered;
  }, [products, searchQuery, categoryFilter, statusFilter, stockFilter, sortBy]);

  // Paginação
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  // Reset para página 1 quando filtros mudam
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, statusFilter, stockFilter]);

  const toggleProductSelection = (productId) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const toggleSelectAll = () => {
    const currentProductIds = currentProducts.map(p => p.id);
    const allCurrentSelected = currentProductIds.every(id => selectedProducts.includes(id));
    
    if (allCurrentSelected) {
      setSelectedProducts(prev => prev.filter(id => !currentProductIds.includes(id)));
    } else {
      setSelectedProducts(prev => [...new Set([...prev, ...currentProductIds])]);
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction) {
      toast.error('Selecione uma ação');
      return;
    }

    // Determinar quais produtos usar baseado no escopo
    let idsToProcess = [];
    if (bulkScope === 'current') {
      // Apenas produtos da página atual que estão selecionados
      idsToProcess = currentProducts.filter(p => selectedProducts.includes(p.id)).map(p => p.id);
    } else if (bulkScope === 'all') {
      // Todos os produtos selecionados (em todas as páginas, mas respeitando filtros)
      idsToProcess = filteredProducts.filter(p => selectedProducts.includes(p.id)).map(p => p.id);
    } else if (bulkScope === 'filtered') {
      // TODOS os produtos filtrados (respeitando filtros aplicados)
      idsToProcess = filteredProducts.map(p => p.id);
    } else if (bulkScope === 'allProducts') {
      // TODOS os produtos do banco (ignora filtros)
      const allProducts = await base44.entities.Product.list('-created_date', 10000);
      idsToProcess = allProducts.map(p => p.id);
    }

    if (idsToProcess.length === 0) {
      if (bulkScope === 'filtered') {
        toast.error('Nenhum produto corresponde aos filtros aplicados');
      } else {
        toast.error('Nenhum produto selecionado');
      }
      return;
    }

    // Usar filteredProducts para garantir que estamos trabalhando com produtos que passam pelos filtros
    const selectedProductsData = filteredProducts.filter(p => idsToProcess.includes(p.id));

    switch (bulkAction) {
      case 'delete':
        bulkDeleteMutation.mutate(idsToProcess);
        break;
        
      case 'status':
        setIsBulkProcessing(true);
        setIsBulkCancelled(false);
        bulkCancelRef.current = false;
        setBulkProgress(0);
        const statusBatchSize = 5;
        try {
        for (let i = 0; i < idsToProcess.length; i += statusBatchSize) {
            if (bulkCancelRef.current) {
              setIsBulkCancelled(true);
              toast.info('Ação cancelada pelo usuário');
              break;
            }
          const batch = idsToProcess.slice(i, i + statusBatchSize);
          setBulkProgressText(`Atualizando ${Math.min(i + statusBatchSize, idsToProcess.length)} de ${idsToProcess.length} produtos...`);
          await Promise.all(batch.map(id => base44.entities.Product.update(id, { status: bulkData.status })));
          setBulkProgress(Math.round(((i + statusBatchSize) / idsToProcess.length) * 100));
          await new Promise(resolve => setTimeout(resolve, 500));
        }
          if (!bulkCancelRef.current) {
            toast.success('Status atualizado!');
          }
        } finally {
        setIsBulkProcessing(false);
        queryClient.invalidateQueries(['adminProducts']);
        setSelectedProducts([]);
        setIsBulkDialogOpen(false);
        }
        break;
        
      case 'category':
        if (!bulkData.category) {
          toast.error('Selecione uma categoria');
          return;
        }
        setIsBulkProcessing(true);
        setIsBulkCancelled(false);
        bulkCancelRef.current = false;
        setBulkProgress(0);
        const catBatchSize = 5;
        try {
        for (let i = 0; i < idsToProcess.length; i += catBatchSize) {
            if (bulkCancelRef.current) {
              setIsBulkCancelled(true);
              toast.info('Ação cancelada pelo usuário');
              break;
            }
          const batch = idsToProcess.slice(i, i + catBatchSize);
          setBulkProgressText(`Atualizando ${Math.min(i + catBatchSize, idsToProcess.length)} de ${idsToProcess.length} produtos...`);
          await Promise.all(batch.map(id => base44.entities.Product.update(id, { category: bulkData.category })));
          setBulkProgress(Math.round(((i + catBatchSize) / idsToProcess.length) * 100));
          await new Promise(resolve => setTimeout(resolve, 500));
        }
          if (!bulkCancelRef.current) {
            toast.success('Categoria atualizada!');
          }
        } finally {
        setIsBulkProcessing(false);
        queryClient.invalidateQueries(['adminProducts']);
        setSelectedProducts([]);
        setIsBulkDialogOpen(false);
        }
        break;
        
      case 'price':
        if (!bulkData.priceValue || bulkData.priceValue <= 0) {
          toast.error('Insira um valor válido');
          return;
        }
        setIsBulkProcessing(true);
        setIsBulkCancelled(false);
        bulkCancelRef.current = false;
        setBulkProgress(0);
        const priceBatchSize = 5;
        try {
        for (let i = 0; i < selectedProductsData.length; i += priceBatchSize) {
            if (bulkCancelRef.current) {
              setIsBulkCancelled(true);
              toast.info('Ação cancelada pelo usuário');
              break;
            }
          const batch = selectedProductsData.slice(i, i + priceBatchSize);
          setBulkProgressText(`Atualizando preços ${Math.min(i + priceBatchSize, selectedProductsData.length)} de ${selectedProductsData.length} produtos...`);
          
          await Promise.all(batch.map(product => {
            const currentPrice = product.price || 0;
            let newPrice = currentPrice;
            
            if (bulkData.priceType === 'percentage') {
              const factor = bulkData.priceAction === 'increase' 
                ? (1 + parseFloat(bulkData.priceValue) / 100)
                : (1 - parseFloat(bulkData.priceValue) / 100);
              newPrice = currentPrice * factor;
            } else {
              newPrice = bulkData.priceAction === 'increase'
                ? currentPrice + parseFloat(bulkData.priceValue)
                : currentPrice - parseFloat(bulkData.priceValue);
            }
            
            return base44.entities.Product.update(product.id, { price: Math.max(0, newPrice) });
          }));
          
          setBulkProgress(Math.round(((i + priceBatchSize) / selectedProductsData.length) * 100));
          await new Promise(resolve => setTimeout(resolve, 500));
        }
          if (!bulkCancelRef.current) {
            toast.success('Preços atualizados!');
          }
        } finally {
        setIsBulkProcessing(false);
        queryClient.invalidateQueries(['adminProducts']);
        setSelectedProducts([]);
        setIsBulkDialogOpen(false);
        }
        break;
        
      case 'stock':
        if (!bulkData.stockValue || bulkData.stockValue <= 0) {
          toast.error('Insira um valor válido');
          return;
        }
        setIsBulkProcessing(true);
        setIsBulkCancelled(false);
        bulkCancelRef.current = false;
        setBulkProgress(0);
        const stockBatchSize = 5;
        try {
        for (let i = 0; i < selectedProductsData.length; i += stockBatchSize) {
            if (bulkCancelRef.current) {
              setIsBulkCancelled(true);
              toast.info('Ação cancelada pelo usuário');
              break;
            }
          const batch = selectedProductsData.slice(i, i + stockBatchSize);
          setBulkProgressText(`Atualizando estoque ${Math.min(i + stockBatchSize, selectedProductsData.length)} de ${selectedProductsData.length} produtos...`);
          
          await Promise.all(batch.map(product => {
            const currentStock = product.stock_quantity || 0;
            const newStock = bulkData.stockAction === 'add'
              ? currentStock + parseInt(bulkData.stockValue)
              : Math.max(0, currentStock - parseInt(bulkData.stockValue));
              
              // Aplicar regras de estoque automaticamente
              const minStock = product.min_stock || 10;
              let newStatus = product.status;
              
              if (product.has_infinite_stock) {
                newStatus = 'active';
              } else if (product.min_stock_enabled !== false) {
                newStatus = newStock >= minStock ? 'active' : 'inactive';
              } else {
                newStatus = newStock > 0 ? 'active' : 'inactive';
              }
              
              return base44.entities.Product.update(product.id, { 
                stock_quantity: newStock,
                status: newStatus // Atualizar status baseado nas regras
              });
          }));
          
          setBulkProgress(Math.round(((i + stockBatchSize) / selectedProductsData.length) * 100));
          await new Promise(resolve => setTimeout(resolve, 500));
        }
          if (!bulkCancelRef.current) {
            toast.success('Estoque atualizado!');
          }
        } finally {
        setIsBulkProcessing(false);
        queryClient.invalidateQueries(['adminProducts']);
        setSelectedProducts([]);
        setIsBulkDialogOpen(false);
        }
        break;
        
      case 'featured':
        setIsBulkProcessing(true);
        setIsBulkCancelled(false);
        bulkCancelRef.current = false;
        setBulkProgress(0);
        const featBatchSize = 5;
        try {
        for (let i = 0; i < idsToProcess.length; i += featBatchSize) {
            if (bulkCancelRef.current) {
              setIsBulkCancelled(true);
              toast.info('Ação cancelada pelo usuário');
              break;
            }
          const batch = idsToProcess.slice(i, i + featBatchSize);
          setBulkProgressText(`Marcando ${Math.min(i + featBatchSize, idsToProcess.length)} de ${idsToProcess.length} produtos...`);
          await Promise.all(batch.map(id => base44.entities.Product.update(id, { is_featured: bulkData.is_featured })));
          setBulkProgress(Math.round(((i + featBatchSize) / idsToProcess.length) * 100));
          await new Promise(resolve => setTimeout(resolve, 500));
        }
          if (!bulkCancelRef.current) {
            toast.success('Produtos atualizados!');
          }
        } finally {
        setIsBulkProcessing(false);
        queryClient.invalidateQueries(['adminProducts']);
        setSelectedProducts([]);
        setIsBulkDialogOpen(false);
        }
        break;
        
      case 'promotion':
        setIsBulkProcessing(true);
        setIsBulkCancelled(false);
        bulkCancelRef.current = false;
        setBulkProgress(0);
        const promoBatchSize = 5;
        try {
        for (let i = 0; i < idsToProcess.length; i += promoBatchSize) {
            if (bulkCancelRef.current) {
              setIsBulkCancelled(true);
              toast.info('Ação cancelada pelo usuário');
              break;
            }
          const batch = idsToProcess.slice(i, i + promoBatchSize);
          setBulkProgressText(`Marcando ${Math.min(i + promoBatchSize, idsToProcess.length)} de ${idsToProcess.length} produtos...`);
          await Promise.all(batch.map(id => base44.entities.Product.update(id, { is_promotion: bulkData.is_promotion })));
          setBulkProgress(Math.round(((i + promoBatchSize) / idsToProcess.length) * 100));
          await new Promise(resolve => setTimeout(resolve, 500));
        }
          if (!bulkCancelRef.current) {
            toast.success('Produtos atualizados!');
          }
        } finally {
        setIsBulkProcessing(false);
        queryClient.invalidateQueries(['adminProducts']);
        setSelectedProducts([]);
        setIsBulkDialogOpen(false);
        }
        break;

      case 'min_stock_control':
        setIsBulkProcessing(true);
        setIsBulkCancelled(false);
        bulkCancelRef.current = false;
        setBulkProgress(0);
        const minStockBatchSize = 5;
        try {
          // Buscar dados completos dos produtos para recalcular status
          const productsToUpdate = filteredProducts.filter(p => idsToProcess.includes(p.id));
          
          for (let i = 0; i < productsToUpdate.length; i += minStockBatchSize) {
            if (bulkCancelRef.current) {
              setIsBulkCancelled(true);
              toast.info('Ação cancelada pelo usuário');
              break;
            }
            const batch = productsToUpdate.slice(i, i + minStockBatchSize);
            setBulkProgressText(`Atualizando controle de estoque ${Math.min(i + minStockBatchSize, productsToUpdate.length)} de ${productsToUpdate.length} produtos...`);
            
            await Promise.all(batch.map(async (product) => {
              // Recalcular status baseado nas novas regras
              const stockQty = product.stock_quantity || 0;
              const minStock = product.min_stock || 10;
              const newMinStockEnabled = bulkData.min_stock_enabled;
              let newStatus = product.status;
              
              // Aplicar regras de estoque com a nova configuração
              if (product.has_infinite_stock) {
                newStatus = 'active';
              } else if (newMinStockEnabled) {
                // Com controle de estoque mínimo: ativo se >= mínimo, inativo se < mínimo
                newStatus = stockQty >= minStock ? 'active' : 'inactive';
              } else {
                // Sem controle de estoque mínimo: ativo se > 0, inativo se = 0
                newStatus = stockQty > 0 ? 'active' : 'inactive';
              }
              
              // Atualizar min_stock_enabled E status
              await base44.entities.Product.update(product.id, { 
                min_stock_enabled: newMinStockEnabled,
                status: newStatus
              });
            }));
            
            setBulkProgress(Math.round(((i + minStockBatchSize) / productsToUpdate.length) * 100));
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          if (!bulkCancelRef.current) {
            toast.success('Controle de estoque atualizado!');
          }
        } finally {
          setIsBulkProcessing(false);
          queryClient.invalidateQueries(['adminProducts']);
          setSelectedProducts([]);
          setIsBulkDialogOpen(false);
        }
        break;
    }
  };

  // Função para atualizar status de todos os produtos baseado nas regras de estoque
  const handleUpdateAllProductStatus = async () => {
    if (!confirm('Deseja atualizar o status de TODOS os produtos baseado nas regras de estoque? Esta ação pode demorar alguns minutos.')) {
      return;
    }

    setIsBulkProcessing(true);
    setIsBulkCancelled(false);
    bulkCancelRef.current = false;
    setBulkProgress(0);
    setBulkProgressText('Carregando produtos...');

    try {
      // Buscar todos os produtos
      const allProducts = await base44.entities.Product.list('-created_date', 10000);
      setBulkProgressText(`Atualizando status de ${allProducts.length} produtos...`);

      const batchSize = 10;
      let updated = 0;
      let skipped = 0;

      for (let i = 0; i < allProducts.length; i += batchSize) {
        if (bulkCancelRef.current) {
          setIsBulkCancelled(true);
          toast.info('Atualização cancelada pelo usuário');
          break;
        }

        const batch = allProducts.slice(i, i + batchSize);
        setBulkProgressText(`Atualizando ${Math.min(i + batchSize, allProducts.length)} de ${allProducts.length} produtos...`);

        await Promise.all(batch.map(async (product) => {
          const stockQty = product.stock_quantity || 0;
          const minStock = product.min_stock || 10;
          let newStatus = product.status;

          // Aplicar regras de estoque
          if (product.has_infinite_stock) {
            newStatus = 'active';
          } else if (product.min_stock_enabled !== false) {
            newStatus = stockQty >= minStock ? 'active' : 'inactive';
          } else {
            newStatus = stockQty > 0 ? 'active' : 'inactive';
          }

          // Só atualizar se o status mudou
          if (newStatus !== product.status) {
            try {
              await base44.entities.Product.update(product.id, { status: newStatus });
              updated++;
            } catch (error) {
              console.error(`Erro ao atualizar produto ${product.id}:`, error);
              skipped++;
            }
          } else {
            skipped++;
          }
        }));

        setBulkProgress(Math.round(((i + batchSize) / allProducts.length) * 100));
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      if (!bulkCancelRef.current) {
        toast.success(`Status atualizado! ${updated} produtos alterados, ${skipped} sem alteração.`);
        queryClient.invalidateQueries(['adminProducts']);
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status dos produtos. Tente novamente.');
    } finally {
      setIsBulkProcessing(false);
      setBulkProgress(0);
      setBulkProgressText('');
    }
  };

  const headerActions = (
    <>
      <Button 
        variant="outline"
        onClick={handleUpdateAllProductStatus}
        disabled={isBulkProcessing}
        className="border-blue-600 text-blue-600 hover:bg-blue-50"
        title="Atualizar status de todos os produtos baseado nas regras de estoque"
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Atualizar Status
      </Button>
      {selectedProducts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <Button 
            variant="outline"
            onClick={() => setIsBulkDialogOpen(true)}
            className="border-emerald-600 text-emerald-600"
          >
            <CheckSquare className="w-4 h-4 mr-2" />
            Ações em Massa ({selectedProducts.length})
          </Button>
        </motion.div>
      )}
      <Link to={createPageUrl('AdminImportProducts')}>
        <Button variant="outline">
          <Upload className="w-4 h-4 mr-2" />
          Importar
        </Button>
      </Link>
      <Button variant="outline">
        <Download className="w-4 h-4 mr-2" />
        Exportar
      </Button>
      <Button 
        onClick={() => setIsModalOpen(true)}
        className="bg-emerald-600 hover:bg-emerald-700"
      >
        <Plus className="w-4 h-4 mr-2" />
        Novo Produto
      </Button>
    </>
  );

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
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Produtos</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">Gerencie todos os produtos da sua farmácia</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {headerActions}
            </div>
          </div>
        </motion.header>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="p-4 sm:p-6"
        >
        {/* Filters */}
        <div className="bg-white rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 flex flex-wrap gap-3 sm:gap-4 shadow-sm">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome, SKU, INT, EAN ou marca..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={stockFilter} onValueChange={setStockFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Estoque" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo o estoque</SelectItem>
              <SelectItem value="in_stock">Em estoque</SelectItem>
              <SelectItem value="low_stock">Estoque baixo</SelectItem>
              <SelectItem value="out_of_stock">Sem estoque</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            onClick={handleOpenCategoryManager}
            title="Gerenciar categorias"
          >
            <Tag className="w-4 h-4 mr-2" />
            Categorias
          </Button>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="inactive">Inativo</SelectItem>
              <SelectItem value="out_of_stock">Sem Estoque</SelectItem>
              <SelectItem value="draft">Rascunho</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48">
              <ArrowUpDown className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name_asc">Nome (A-Z)</SelectItem>
              <SelectItem value="name_desc">Nome (Z-A)</SelectItem>
              <SelectItem value="price_asc">Preço (Menor)</SelectItem>
              <SelectItem value="price_desc">Preço (Maior)</SelectItem>
              <SelectItem value="stock_asc">Estoque (Menor)</SelectItem>
              <SelectItem value="stock_desc">Estoque (Maior)</SelectItem>
              <SelectItem value="created_desc">Mais recentes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-xl overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={currentProducts.length > 0 && currentProducts.every(p => selectedProducts.includes(p.id))}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>SKU / EAN</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Estoque</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentProducts.map((product) => (
                <TableRow key={product.id} className={selectedProducts.includes(product.id) ? 'bg-emerald-50' : ''}>
                  <TableCell>
                    <Checkbox
                      checked={selectedProducts.includes(product.id)}
                      onCheckedChange={() => toggleProductSelection(product.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <img
                        src={getProductImage(product)}
                        alt={product.name}
                        className="w-10 h-10 rounded-lg object-cover"
                        onError={(e) => {
                          if (e.target.src !== getProductImage(product)) {
                            e.target.src = getProductImage(product);
                          }
                        }}
                      />
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-sm text-gray-500">{product.brand}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {product.sku && (
                        <p className="text-sm font-mono text-gray-900">{product.sku}</p>
                      )}
                      {product.barcode && (
                        <p className="text-xs font-mono text-gray-500">{product.barcode}</p>
                      )}
                      {!product.sku && !product.barcode && (
                        <span className="text-gray-400">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {product.category?.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">R$ {product.price?.toFixed(2)}</p>
                      {product.original_price && product.original_price > product.price && (
                        <p className="text-sm text-gray-400 line-through">
                          R$ {product.original_price.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {product.has_infinite_stock ? (
                      <Badge className="bg-blue-100 text-blue-800 flex items-center gap-1 w-fit">
                        <span className="text-lg">∞</span> Infinito
                      </Badge>
                    ) : (
                      <Badge className={
                        (product.stock_quantity || 0) === 0
                          ? 'bg-red-100 text-red-800'
                          : (product.stock_quantity || 0) <= (product.min_stock || 10)
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-green-100 text-green-800'
                      }>
                        {product.stock_quantity || 0} un
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={
                      product.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }>
                      {product.status === 'active' ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditModal(product)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => deleteMutation.mutate(product.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            </Table>

            {/* Pagination Controls */}
            <div className="border-t p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Mostrando {startIndex + 1} a {Math.min(endIndex, filteredProducts.length)} de {filteredProducts.length} produtos
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Itens por página:</span>
                <Select value={itemsPerPage.toString()} onValueChange={(v) => {
                  setItemsPerPage(parseInt(v));
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="30">30</SelectItem>
                    <SelectItem value="60">60</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-gray-600 px-4">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            </div>
          </div>

      {/* Product Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Editar Produto' : 'Novo Produto'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-6 py-4">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="product-name">
                  Nome do Produto <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="product-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Paracetamol 500mg - 30 comprimidos"
                  className={!formData.name ? 'border-amber-300' : ''}
                  aria-required="true"
                  aria-describedby="name-help"
                />
                <p id="name-help" className="text-xs text-gray-500 mt-1">
                  Nome comercial completo do produto
                </p>
              </div>

              <div>
                <Label htmlFor="product-description">Descrição</Label>
                <Textarea
                  id="product-description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Informações adicionais sobre o produto, indicações, modo de uso..."
                  rows={3}
                  maxLength={500}
                  aria-describedby="description-help"
                />
                <div className="flex justify-between items-center mt-1">
                  <p id="description-help" className="text-xs text-gray-500">
                    Opcional - Aparece na página do produto
                  </p>
                  <span className="text-xs text-gray-400">
                    {formData.description?.length || 0}/500
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="product-price">
                    Preço de Venda <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                    <Input
                      id="product-price"
                      type="text"
                      value={formData.price ? formatCurrency(formData.price) : ''}
                      onChange={(e) => {
                        const unformatted = unformatCurrency(e.target.value);
                        setFormData(prev => ({ ...prev, price: unformatted }));
                      }}
                      placeholder="0,00"
                      className={`pl-8 ${!formData.price ? 'border-amber-300' : ''}`}
                      aria-required="true"
                      aria-describedby="price-help"
                    />
                  </div>
                  <p id="price-help" className="text-xs text-gray-500 mt-1">
                    Preço que o cliente pagará
                  </p>
                </div>
                <div>
                  <Label htmlFor="product-original-price">Preço Original</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                    <Input
                      id="product-original-price"
                      type="text"
                      value={formData.original_price ? formatCurrency(formData.original_price) : ''}
                      onChange={(e) => {
                        const unformatted = unformatCurrency(e.target.value);
                        setFormData(prev => ({ ...prev, original_price: unformatted }));
                      }}
                      placeholder="0,00"
                      className="pl-8"
                      aria-describedby="original-price-help"
                    />
                  </div>
                  <p id="original-price-help" className="text-xs text-gray-500 mt-1">
                    Preço antes do desconto (opcional)
                  </p>
                </div>
              </div>

              <div>
                <Label>Categoria *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                    <div className="border-t mt-2 pt-2 px-2">
                      {!isAddingCategory ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsAddingCategory(true)}
                          className="w-full justify-start text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Nova Categoria
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Input
                            placeholder="Nome da categoria"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newCategory.trim()) {
                                const slug = newCategory.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_');
                                setCategories(prev => [...prev, { value: slug, label: newCategory.trim() }]);
                                setFormData(prev => ({ ...prev, category: slug }));
                                setNewCategory('');
                                setIsAddingCategory(false);
                                toast.success('Categoria criada!');
                              }
                              if (e.key === 'Escape') {
                                setNewCategory('');
                                setIsAddingCategory(false);
                              }
                            }}
                            className="h-8"
                            autoFocus
                          />
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              if (newCategory.trim()) {
                                const slug = newCategory.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_');
                                setCategories(prev => [...prev, { value: slug, label: newCategory.trim() }]);
                                setFormData(prev => ({ ...prev, category: slug }));
                                setNewCategory('');
                                setIsAddingCategory(false);
                                toast.success('Categoria criada!');
                              }
                            }}
                            className="h-8 bg-emerald-600 hover:bg-emerald-700"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setNewCategory('');
                              setIsAddingCategory(false);
                            }}
                            className="h-8"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="product-brand">Marca/Laboratório</Label>
                  <Input
                    id="product-brand"
                    value={formData.brand}
                    onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                    placeholder="Ex: Medley, Eurofarma, EMS"
                    aria-describedby="brand-help"
                  />
                  <p id="brand-help" className="text-xs text-gray-500 mt-1">
                    Nome do fabricante
                  </p>
                </div>
                <div>
                  <Label htmlFor="product-sku">SKU (Código Interno)</Label>
                  <Input
                    id="product-sku"
                    value={formData.sku}
                    onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value.toUpperCase() }))}
                    placeholder="Ex: PAR500-30"
                    aria-describedby="sku-help"
                  />
                  <p id="sku-help" className="text-xs text-gray-500 mt-1">
                    Código único para controle interno
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="product-barcode">Código de Barras (EAN)</Label>
                <Input
                  id="product-barcode"
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => {
                    const formatted = formatBarcode(e.target.value);
                    setFormData(prev => ({ ...prev, barcode: formatted }));
                  }}
                  placeholder="7891234567890"
                  maxLength={13}
                  aria-describedby="barcode-help"
                />
                <p id="barcode-help" className="text-xs text-gray-500 mt-1">
                  Código EAN-13 (13 dígitos) - Opcional
                </p>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <Label>Imagens do Produto (máximo 4)</Label>
                <div className="mt-2 space-y-3">
                  {/* Carrossel de Imagens */}
                  {(formData.images && formData.images.length > 0) ? (
                    <div className="relative">
                      <div className="flex items-center gap-2 overflow-x-auto pb-2">
                        {formData.images.map((img, index) => (
                          <div key={index} className="relative flex-shrink-0 group">
                            <img
                              src={img}
                              alt={`Produto ${index + 1}`}
                              className={`w-32 h-32 object-contain bg-gray-100 rounded-lg border-2 ${
                                index === 0 ? 'border-emerald-500' : 'border-gray-200'
                              }`}
                            />
                            {index === 0 && (
                              <Badge className="absolute top-1 left-1 bg-emerald-600 text-xs">
                                Principal
                              </Badge>
                            )}
                      <Button
                        variant="ghost"
                        size="icon"
                              className="absolute top-1 right-1 h-6 w-6 bg-red-500 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleRemoveImage(index)}
                      >
                              <X className="w-3 h-3" />
                      </Button>
                            <label className="absolute bottom-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 bg-white hover:bg-gray-100"
                                asChild
                              >
                                <span>
                                  <Edit className="w-3 h-3" />
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleImageUpload(e, index)}
                                    className="hidden"
                                  />
                                </span>
                              </Button>
                            </label>
                          </div>
                        ))}
                      </div>
                      {formData.images.length < 4 && (
                        <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 mt-2">
                          <ImagePlus className="w-6 h-6 text-gray-400 mb-1" />
                          <span className="text-xs text-gray-500">Adicionar imagem ({formData.images.length}/4)</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                      <ImagePlus className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500">Clique para adicionar imagem (0/4)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="product-stock">Quantidade em Estoque</Label>
                    <Input
                      id="product-stock"
                      type="number"
                      min="0"
                      value={formData.stock_quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, stock_quantity: e.target.value }))}
                      placeholder="0"
                      disabled={formData.has_infinite_stock}
                      aria-describedby="stock-help"
                    />
                    {formData.has_infinite_stock ? (
                      <p className="text-xs text-blue-600 mt-1">✓ Estoque infinito ativado</p>
                    ) : (
                      <p id="stock-help" className="text-xs text-gray-500 mt-1">
                        Quantidade disponível
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="product-min-stock">Estoque Mínimo</Label>
                    <Input
                      id="product-min-stock"
                      type="number"
                      min="0"
                      value={formData.min_stock}
                      onChange={(e) => setFormData(prev => ({ ...prev, min_stock: e.target.value }))}
                      placeholder="10"
                      disabled={formData.has_infinite_stock || !formData.min_stock_enabled}
                      aria-describedby="min-stock-help"
                    />
                    <p id="min-stock-help" className="text-xs text-gray-500 mt-1">
                      Alerta quando atingir este valor
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex-1">
                    <Label className="font-semibold text-sm">Controle de Estoque Mínimo</Label>
                    <p className="text-xs text-gray-600 mt-1">
                      {formData.min_stock_enabled 
                        ? 'Produto inativa se estoque < mínimo' 
                        : 'Produto inativa apenas se estoque = 0'}
                    </p>
                  </div>
                  <Switch
                    checked={formData.min_stock_enabled}
                    onCheckedChange={(v) => setFormData(prev => ({ ...prev, min_stock_enabled: v }))}
                    disabled={formData.has_infinite_stock}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="product-dosage">Dosagem</Label>
                  <Input
                    id="product-dosage"
                    value={formData.dosage}
                    onChange={(e) => setFormData(prev => ({ ...prev, dosage: e.target.value }))}
                    placeholder="Ex: 500mg, 10ml, 2,5mg"
                    aria-describedby="dosage-help"
                  />
                  <p id="dosage-help" className="text-xs text-gray-500 mt-1">
                    Concentração do princípio ativo
                  </p>
                </div>
                <div>
                  <Label htmlFor="product-quantity">Quantidade por Embalagem</Label>
                  <Input
                    id="product-quantity"
                    type="number"
                    min="1"
                    value={formData.quantity_per_package}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantity_per_package: e.target.value }))}
                    placeholder="Ex: 30 comprimidos"
                    aria-describedby="quantity-help"
                  />
                  <p id="quantity-help" className="text-xs text-gray-500 mt-1">
                    Quantidade de unidades na embalagem
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <Label className="font-semibold">Estoque Infinito</Label>
                    <p className="text-xs text-gray-600">Produto sempre disponível e ativo</p>
                  </div>
                  <Switch
                    checked={formData.has_infinite_stock}
                    onCheckedChange={(v) => setFormData(prev => ({ ...prev, has_infinite_stock: v }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Em Promoção</Label>
                  <Switch
                    checked={formData.is_promotion}
                    onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_promotion: v }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Destaque</Label>
                  <Switch
                    checked={formData.is_featured}
                    onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_featured: v }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>É Genérico</Label>
                  <Switch
                    checked={formData.is_generic}
                    onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_generic: v }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Exige Receita</Label>
                  <Switch
                    checked={formData.requires_prescription}
                    onCheckedChange={(v) => setFormData(prev => ({ ...prev, requires_prescription: v }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Antibiótico</Label>
                  <Switch
                    checked={formData.is_antibiotic || false}
                    onCheckedChange={(v) => {
                      setFormData(prev => ({ 
                        ...prev, 
                        is_antibiotic: v,
                        requires_prescription: v ? true : prev.requires_prescription // Auto-marcar receita se for antibiótico
                      }));
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Medicamento Controlado</Label>
                  <Switch
                    checked={formData.is_controlled || false}
                    onCheckedChange={(v) => {
                      setFormData(prev => ({ 
                        ...prev, 
                        is_controlled: v,
                        requires_prescription: v ? true : prev.requires_prescription // Auto-marcar receita se for controlado
                      }));
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={closeModal} disabled={createMutation.isPending || updateMutation.isPending}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending || !formData.name || !formData.price}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {editingProduct ? 'Atualizar' : 'Criar Produto'}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Actions Dialog */}
      <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ações em Massa</DialogTitle>
            <DialogDescription>
              {selectedProducts.length} produto{selectedProducts.length > 1 ? 's' : ''} selecionado{selectedProducts.length > 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>

          {/* Bulk Scope Selection */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <Label className="text-sm font-semibold mb-3 block">Aplicar ação em:</Label>
            <RadioGroup value={bulkScope} onValueChange={setBulkScope}>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 p-2 rounded hover:bg-blue-100">
                  <RadioGroupItem value="current" id="current" />
                  <Label htmlFor="current" className="flex-1 cursor-pointer">
                    <span className="font-medium">Produtos da página atual</span>
                    <span className="text-xs text-gray-600 block">
                      {currentProducts.filter(p => selectedProducts.includes(p.id)).length} produto{currentProducts.filter(p => selectedProducts.includes(p.id)).length > 1 ? 's' : ''} selecionado{currentProducts.filter(p => selectedProducts.includes(p.id)).length > 1 ? 's' : ''} nesta página
                    </span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-2 rounded hover:bg-blue-100">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all" className="flex-1 cursor-pointer">
                    <span className="font-medium">Todos os produtos selecionados</span>
                    <span className="text-xs text-gray-600 block">
                      {selectedProducts.length} produto{selectedProducts.length > 1 ? 's' : ''} selecionado{selectedProducts.length > 1 ? 's' : ''} (respeitando filtros)
                    </span>
                  </Label>
                </div>
                <div className={`flex items-center space-x-2 p-2 rounded ${bulkAction === 'delete' ? 'hover:bg-orange-100 border-2 border-orange-300' : 'hover:bg-emerald-100 border-2 border-emerald-300'}`}>
                  <RadioGroupItem value="filtered" id="filtered" />
                  <Label htmlFor="filtered" className="flex-1 cursor-pointer">
                    <span className={`font-medium ${bulkAction === 'delete' ? 'text-orange-700' : 'text-emerald-700'}`}>
                      {bulkAction === 'delete' ? '⚠️ TODOS os produtos filtrados' : '🔍 TODOS os produtos filtrados'}
                    </span>
                    <span className={`text-xs block ${bulkAction === 'delete' ? 'text-orange-600' : 'text-emerald-600'}`}>
                      {filteredProducts.length} produto{filteredProducts.length > 1 ? 's' : ''} {bulkAction === 'delete' ? '- AÇÃO IRREVERSÍVEL' : '- aplicar em todos os produtos visíveis (respeita filtros aplicados)'}
                    </span>
                  </Label>
                </div>
                <div className={`flex items-center space-x-2 p-2 rounded ${bulkAction === 'delete' ? 'hover:bg-red-100 border-2 border-red-300' : 'hover:bg-purple-100 border-2 border-purple-300'}`}>
                  <RadioGroupItem value="allProducts" id="allProducts" />
                  <Label htmlFor="allProducts" className="flex-1 cursor-pointer">
                    <span className={`font-medium ${bulkAction === 'delete' ? 'text-red-700' : 'text-purple-700'}`}>
                      {bulkAction === 'delete' ? '⚠️ TODOS os produtos cadastrados' : '🌐 TODOS os produtos cadastrados'}
                    </span>
                    <span className={`text-xs block ${bulkAction === 'delete' ? 'text-red-600' : 'text-purple-600'}`}>
                      {products.length} produto{products.length > 1 ? 's' : ''} {bulkAction === 'delete' ? '- AÇÃO IRREVERSÍVEL' : '- aplicar em todo o catálogo (ignora filtros)'}
                    </span>
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Bulk Progress */}
          {isBulkProcessing && (
            <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
              <div className="text-center mb-3">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">{bulkProgressText}</p>
              </div>
              <div className="relative">
                <Progress value={bulkProgress} className="h-2 bg-white/50" />
                <div 
                  className="absolute top-0 left-0 h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-300"
                  style={{ width: `${bulkProgress}%` }}
                />
              </div>
              <p className="text-center text-xs text-gray-600 mt-2">{bulkProgress}% concluído</p>
              <div className="mt-3 text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    bulkCancelRef.current = true;
                    setIsBulkCancelled(true);
                  }}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-4 py-4">
            <div>
              <Label className="text-base font-semibold mb-3 block">Selecione a Ação</Label>
              <RadioGroup value={bulkAction} onValueChange={setBulkAction}>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50">
                    <RadioGroupItem value="status" id="status" />
                    <Label htmlFor="status" className="flex-1 cursor-pointer text-sm">Atualizar Status</Label>
                  </div>
                  <div className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50">
                    <RadioGroupItem value="category" id="category" />
                    <Label htmlFor="category" className="flex-1 cursor-pointer text-sm">Alterar Categoria</Label>
                  </div>
                  <div className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50">
                    <RadioGroupItem value="price" id="price" />
                    <Label htmlFor="price" className="flex-1 cursor-pointer text-sm">Ajustar Preço</Label>
                  </div>
                  <div className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50">
                    <RadioGroupItem value="stock" id="stock" />
                    <Label htmlFor="stock" className="flex-1 cursor-pointer text-sm">Ajustar Estoque</Label>
                  </div>
                  <div className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50">
                    <RadioGroupItem value="featured" id="featured" />
                    <Label htmlFor="featured" className="flex-1 cursor-pointer text-sm">Marcar como Destaque</Label>
                  </div>
                  <div className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50">
                    <RadioGroupItem value="promotion" id="promotion" />
                    <Label htmlFor="promotion" className="flex-1 cursor-pointer text-sm">Marcar como Promoção</Label>
                  </div>
                  <div className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50">
                    <RadioGroupItem value="min_stock_control" id="min_stock_control" />
                    <Label htmlFor="min_stock_control" className="flex-1 cursor-pointer text-sm">Controle de Estoque Mínimo</Label>
                  </div>
                  <div className="flex items-center space-x-2 p-2 rounded hover:bg-red-50">
                    <RadioGroupItem value="delete" id="delete" />
                    <Label htmlFor="delete" className="flex-1 cursor-pointer text-sm text-red-600">Excluir Produtos</Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Action-specific inputs */}
            {bulkAction === 'status' && (
              <div>
                <Label>Novo Status</Label>
                <Select value={bulkData.status} onValueChange={(v) => setBulkData(prev => ({ ...prev, status: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="out_of_stock">Sem Estoque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {bulkAction === 'category' && (
              <div>
                <Label>Nova Categoria</Label>
                <Select value={bulkData.category} onValueChange={(v) => setBulkData(prev => ({ ...prev, category: v }))}>
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
            )}

            {bulkAction === 'price' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Ação</Label>
                    <Select value={bulkData.priceAction} onValueChange={(v) => setBulkData(prev => ({ ...prev, priceAction: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="increase">Aumentar</SelectItem>
                        <SelectItem value="decrease">Diminuir</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tipo</Label>
                    <Select value={bulkData.priceType} onValueChange={(v) => setBulkData(prev => ({ ...prev, priceType: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                        <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Valor</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={bulkData.priceValue}
                    onChange={(e) => setBulkData(prev => ({ ...prev, priceValue: e.target.value }))}
                    placeholder={bulkData.priceType === 'percentage' ? 'Ex: 10' : 'Ex: 5.00'}
                  />
                </div>
              </div>
            )}

            {bulkAction === 'stock' && (
              <div className="space-y-4">
                <div>
                  <Label>Ação</Label>
                  <Select value={bulkData.stockAction} onValueChange={(v) => setBulkData(prev => ({ ...prev, stockAction: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="add">Adicionar</SelectItem>
                      <SelectItem value="subtract">Subtrair</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    value={bulkData.stockValue}
                    onChange={(e) => setBulkData(prev => ({ ...prev, stockValue: e.target.value }))}
                    placeholder="Ex: 10"
                  />
                </div>
              </div>
            )}

            {bulkAction === 'featured' && (
              <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg">
                <div>
                  <p className="font-medium">Marcar como Destaque</p>
                  <p className="text-sm text-gray-600">Produtos aparecerão na seção "Mais Vendidos"</p>
                </div>
                <Switch
                  checked={bulkData.is_featured}
                  onCheckedChange={(v) => setBulkData(prev => ({ ...prev, is_featured: v }))}
                />
              </div>
            )}

            {bulkAction === 'promotion' && (
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                <div>
                  <p className="font-medium">Marcar como Promoção</p>
                  <p className="text-sm text-gray-600">Produtos aparecerão na seção "Ofertas"</p>
                </div>
                <Switch
                  checked={bulkData.is_promotion}
                  onCheckedChange={(v) => setBulkData(prev => ({ ...prev, is_promotion: v }))}
                />
              </div>
            )}

            {bulkAction === 'min_stock_control' && (
              <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div>
                  <p className="font-medium">Controle de Estoque Mínimo</p>
                  <p className="text-sm text-gray-600">
                    {bulkData.min_stock_enabled 
                      ? 'Produto inativa automaticamente se estoque < mínimo' 
                      : 'Produto inativa apenas se estoque = 0'}
                  </p>
                </div>
                <Switch
                  checked={bulkData.min_stock_enabled}
                  onCheckedChange={(v) => setBulkData(prev => ({ ...prev, min_stock_enabled: v }))}
                />
              </div>
            )}

            {bulkAction === 'delete' && (
              <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-900">⚠️ ATENÇÃO: Ação Irreversível</p>
                    <p className="text-sm text-red-700 mt-1">
                      Você está prestes a excluir <strong>{selectedProducts.length} produto(s)</strong> permanentemente.
                      Esta ação não pode ser desfeita.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {bulkAction && bulkAction !== 'delete' && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Resumo:</strong> {selectedProducts.length} produto(s) será(ão) atualizado(s) com as configurações acima.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsBulkDialogOpen(false)}
              disabled={isBulkProcessing}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleBulkAction}
              disabled={!bulkAction || isBulkProcessing}
              className={bulkAction === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}
            >
              {isBulkProcessing ? 'Processando...' : 'Confirmar Ação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Gerenciamento de Categorias */}
      <Dialog open={isCategoryManagerOpen} onOpenChange={(open) => {
        if (!open) {
          // Resetar estados ao fechar sem salvar
          setNewCategory('');
          setCategoriesToAdd([]);
          setCategoriesToRemove([]);
        }
        setIsCategoryManagerOpen(open);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gerenciar Categorias</DialogTitle>
            <DialogDescription>
              Adicione ou remova categorias. Clique em "Salvar" para confirmar as mudanças.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Adicionar nova categoria */}
            <div className="flex gap-2">
              <Input
                placeholder="Nome da categoria"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newCategory.trim()) {
                    handleAddCategory();
                  }
                }}
              />
              <Button 
                onClick={handleAddCategory}
                disabled={!newCategory.trim()}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Indicador de mudanças pendentes */}
            {(categoriesToAdd.length > 0 || categoriesToRemove.length > 0) && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  <strong>Mudanças pendentes:</strong>
                  {categoriesToAdd.length > 0 && ` ${categoriesToAdd.length} categoria(s) para adicionar`}
                  {categoriesToAdd.length > 0 && categoriesToRemove.length > 0 && ' e'}
                  {categoriesToRemove.length > 0 && ` ${categoriesToRemove.length} categoria(s) para remover`}
                </p>
              </div>
            )}

            {/* Lista de categorias */}
            <div className="border rounded-lg max-h-96 overflow-y-auto">
              {tempCategories.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p>Nenhuma categoria cadastrada.</p>
                  <p className="text-sm mt-2">Adicione uma categoria acima.</p>
                </div>
              ) : (
                tempCategories.map((cat) => {
                  const isNew = categoriesToAdd.some(c => c.value === cat.value);
                  const willBeRemoved = cat.id && categoriesToRemove.includes(cat.id);
                  
                  return (
                    <div 
                      key={cat.value} 
                      className={`flex items-center justify-between p-3 border-b last:border-b-0 ${
                        isNew ? 'bg-emerald-50' : willBeRemoved ? 'bg-red-50 opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{cat.label}</span>
                        {isNew && <Badge variant="outline" className="bg-emerald-100 text-emerald-700">Nova</Badge>}
                        {willBeRemoved && <Badge variant="outline" className="bg-red-100 text-red-700">Será removida</Badge>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{cat.value}</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveCategory(cat.value)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsCategoryManagerOpen(false)}
              disabled={isSavingCategories}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveCategories}
              disabled={isSavingCategories || (categoriesToAdd.length === 0 && categoriesToRemove.length === 0)}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isSavingCategories ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </motion.div>
      </motion.main>
    </div>
  );
}