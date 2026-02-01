import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import * as XLSX from 'xlsx';
import {
  Upload,
  FileSpreadsheet,
  Check,
  AlertCircle,
  Loader2,
  Download,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Tag,
  ArrowRight
} from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { useAdminSidebar } from '@/contexts/AdminSidebarContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from 'sonner';
import { parseMoney, validateImage } from '@/utils/validation';

// Mapeamento de categorias da planilha para o sistema
const categoryMapping = {
  'ANTICONCEP': 'medicamentos',
  'GERAL': 'medicamentos',
  'PADRAO': 'medicamentos',
  'DOR E FEBRE': 'medicamentos',
  'XAROPE': 'medicamentos',
  'VITAMINAS': 'vitaminas',
  'CONGESTÃO': 'medicamentos',
  'ANTIMICROBIA': 'medicamentos',
  'POMADA DER': 'dermocosmeticos',
  'DERMATOLOGI': 'dermocosmeticos',
  'HIGIENE': 'higiene',
  'INFANTIL': 'infantil',
  'DIABETES': 'diabetes',
  'NUTRICAO': 'nutricao',
  'BELEZA': 'beleza',
  'ORTOPEDIA': 'ortopedia',
  'MAMAE BEBE': 'mamae_bebe',
  'EQUIPAMENTO': 'equipamentos',
  'PRIMEIROS S': 'primeiros_socorros'
};

const systemCategories = [
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

export default function AdminImportProducts() {
  const { sidebarOpen } = useAdminSidebar();
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [duplicates, setDuplicates] = useState([]);
  const [unmappedCategories, setUnmappedCategories] = useState([]);
  const [categoryMappings, setCategoryMappings] = useState({});
  const [showCategoryMapping, setShowCategoryMapping] = useState(false);
  const [updateMode, setUpdateMode] = useState('skip');
  const [updateFields, setUpdateFields] = useState({
    name: true,
    price: true,
    stock: true,
    image: false
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState({ success: 0, errors: 0, updated: 0, skipped: 0 });
  const [errorDetails, setErrorDetails] = useState([]);
  const [showErrorReport, setShowErrorReport] = useState(false);
  const [importStartTime, setImportStartTime] = useState(null);
  const [showExitWarning, setShowExitWarning] = useState(false);

  // Aviso ao tentar sair durante importação
  React.useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isImporting) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isImporting]);

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.xls',
      '.xlsx'
    ];
    
    const isValid = validTypes.some(type => 
      selectedFile.type === type || selectedFile.name.endsWith('.xls') || selectedFile.name.endsWith('.xlsx')
    );

    if (!isValid) {
      toast.error('Arquivo inválido. Use arquivos .xls ou .xlsx');
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Encontrar a linha de cabeçalho (procura por INT, CODIGO, PRODUTO, etc.)
      let headerRowIndex = -1;
      for (let i = 0; i < Math.min(50, jsonData.length); i++) {
        const row = jsonData[i];
        if (row && Array.isArray(row)) {
          // Converter células para string e contar quantas são cabeçalhos esperados
          const cellsUpper = row.map(cell => cell != null ? String(cell).toUpperCase().trim() : '');
          const headerMatches = cellsUpper.filter(cell => 
            cell.includes('INT') || 
            cell.includes('CODIGO') || 
            cell.includes('SKU') ||
            cell.includes('PRODUTO') || 
            cell.includes('NOME') ||
            cell.includes('ESTOQUE') ||
            cell.includes('PRECO') ||
            cell.includes('PREÇO')
          ).length;
          
          // Se encontrar 3+ cabeçalhos esperados, é a linha de cabeçalho
          if (headerMatches >= 3) {
            headerRowIndex = i;
            break;
          }
        }
      }

      if (headerRowIndex === -1) {
        toast.error('Não foi possível encontrar o cabeçalho da planilha');
        setIsProcessing(false);
        return;
      }

      const headers = jsonData[headerRowIndex].map(h => h != null ? String(h).toUpperCase().trim() : '');
      
      // Mapear índices das colunas
      const safeIncludes = (str, search) => str && typeof str === 'string' && str.includes(search);
      const colIndex = {
        int: headers.findIndex(h => safeIncludes(h, 'INT') && !safeIncludes(h, 'REFER')),
        sku: headers.findIndex(h => safeIncludes(h, 'CODIGO') && !safeIncludes(h, 'BARRAS')),
        barcode: headers.findIndex(h => safeIncludes(h, 'BARRAS') || safeIncludes(h, 'EAN') || safeIncludes(h, 'GTIN')),
        reference: headers.findIndex(h => safeIncludes(h, 'REFER')),
        name: headers.findIndex(h => safeIncludes(h, 'PRODUTO') || safeIncludes(h, 'NOME')),
        manufacturer: headers.findIndex(h => safeIncludes(h, 'FABRIC') || safeIncludes(h, 'MARCA') || safeIncludes(h, 'LABOR')),
        category: headers.findIndex(h => safeIncludes(h, 'CATEG')),
        stock: headers.findIndex(h => safeIncludes(h, 'ESTOQUE') || (safeIncludes(h, 'QTD') && !safeIncludes(h, 'EMBAL'))),
        cost: headers.findIndex(h => safeIncludes(h, 'CUSTO')),
        price: headers.findIndex(h => (safeIncludes(h, 'PRECO') || safeIncludes(h, 'PREÇO')) && !safeIncludes(h, 'CUSTO')),
        margin: headers.findIndex(h => safeIncludes(h, 'LUCRO') || safeIncludes(h, 'MARGEM'))
      };

      // Buscar produtos existentes para verificar duplicatas
      const existingProducts = await base44.entities.Product.list('', 10000);

      // Processar linhas de dados
      const products = [];
      const foundDuplicates = [];
      const eanGroups = {}; // Agrupar produtos por EAN para deduplicação
      
      for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length === 0) continue;

        const name = colIndex.name >= 0 ? String(row[colIndex.name] || '').trim() : '';
        if (!name || name.length < 3) continue;

        const categoryRaw = colIndex.category >= 0 ? String(row[colIndex.category] || '').toUpperCase().trim() : '';
        const category = categoryMapping[categoryRaw] || 
                        Object.entries(categoryMapping).find(([key]) => categoryRaw.includes(key))?.[1] || 
                        'medicamentos'; // Padrão se não encontrar

        const parseNumber = (val) => {
          if (!val) return 0;
          const str = String(val).replace(/[^\d.,]/g, '').replace(',', '.');
          return parseFloat(str) || 0;
        };

        const intCode = colIndex.int >= 0 ? String(row[colIndex.int] || '').trim() : '';
        const sku = colIndex.sku >= 0 ? String(row[colIndex.sku] || '').trim() : '';
        const barcode = colIndex.barcode >= 0 ? String(row[colIndex.barcode] || '').trim() : '';
        const reference = colIndex.reference >= 0 ? String(row[colIndex.reference] || '').trim() : '';
        const manufacturer = colIndex.manufacturer >= 0 ? String(row[colIndex.manufacturer] || '').trim() : '';
        
        const price = parseNumber(row[colIndex.price]);
        const costPrice = parseNumber(row[colIndex.cost]);
        const stockQuantity = Math.floor(parseNumber(row[colIndex.stock]));

        // Validação mínima - apenas nome é obrigatório
        // Preço pode ser 0 (será definido depois) ou pode não existir na planilha
        // if (!price || price <= 0) continue; // Removido para permitir produtos sem preço

        // Verificar duplicatas
        const existingProduct = existingProducts.find(p => 
          (sku && p.sku === sku) || 
          (barcode && p.barcode === barcode) ||
          (intCode && p.sku === intCode)
        );

        // Agrupar por EAN para deduplicação posterior
        if (barcode) {
          if (!eanGroups[barcode]) {
            eanGroups[barcode] = [];
          }
          eanGroups[barcode].push({
            int: intCode,
            sku: sku || intCode,
            barcode,
            reference,
            name,
            brand: manufacturer,
            category,
            categoryRaw,
            stock_quantity: stockQuantity,
            cost_price: costPrice,
            price,
            rowIndex: i
          });
        }

        const productData = {
          int: intCode,
          sku: sku || intCode,
          barcode,
          reference,
          name,
          brand: manufacturer,
          category,
          categoryRaw,
          stock_quantity: stockQuantity,
          cost_price: costPrice,
          price,
          status: 'active',
          is_generic: name.toLowerCase().includes('generico') || name.toLowerCase().includes('genérico'),
          existingProductId: existingProduct?.id,
          isDuplicate: !!existingProduct,
          rowIndex: i
        };

        products.push(productData);

        if (existingProduct) {
          foundDuplicates.push({
            ...productData,
            existingProduct
          });
        }
      }

      // Processar grupos de EAN duplicados - manter apenas o com maior estoque
      const eanDuplicates = Object.entries(eanGroups).filter(([ean, group]) => group.length > 1);
      let finalProducts = products;
      let finalDuplicates = foundDuplicates;
      
      if (eanDuplicates.length > 0) {
        const productsToRemove = new Set();
        
        eanDuplicates.forEach(([ean, group]) => {
          // Ordenar por estoque (maior primeiro) e depois por nome
          const sorted = group.sort((a, b) => {
            if (b.stock_quantity !== a.stock_quantity) {
              return b.stock_quantity - a.stock_quantity;
            }
            return a.name.localeCompare(b.name);
          });
          
          // Manter apenas o primeiro (maior estoque)
          const keep = sorted[0];
          
          // Marcar os outros para remoção
          sorted.slice(1).forEach(item => {
            productsToRemove.add(item.rowIndex);
          });
        });
        
        // Remover produtos duplicados por EAN da lista
        finalProducts = products.filter((product) => {
          return !productsToRemove.has(product.rowIndex);
        });
        
        // Atualizar produtos e duplicatas após remoção
        finalDuplicates = finalProducts.filter(p => p.isDuplicate);
        
        if (productsToRemove.size > 0) {
          toast.warning(`${productsToRemove.size} produto(s) com EAN duplicado removido(s). Mantido apenas o com maior estoque.`);
        }
      }

      // Identificar categorias não mapeadas
      const uniqueCategoriesRaw = [...new Set(finalProducts.map(p => p.categoryRaw).filter(Boolean))];
      const unmapped = uniqueCategoriesRaw.filter(catRaw => {
        const mapped = categoryMapping[catRaw] || 
                      Object.entries(categoryMapping).find(([key]) => catRaw.includes(key))?.[1];
        return !mapped;
      });

      // Inicializar mapeamentos com medicamentos como padrão
      const initialMappings = {};
      unmapped.forEach(cat => {
        initialMappings[cat] = 'medicamentos';
      });

      setParsedData(finalProducts);
      setDuplicates(finalDuplicates);
      
      setUnmappedCategories(unmapped);
      setCategoryMappings(initialMappings);
      setIsProcessing(false);
      
      if (unmapped.length > 0) {
        setShowCategoryMapping(true);
        toast.info(`${unmapped.length} categoria${unmapped.length > 1 ? 's' : ''} precisa${unmapped.length > 1 ? 'm' : ''} ser mapeada${unmapped.length > 1 ? 's' : ''}`);
      } else if (foundDuplicates.length > 0) {
        toast.warning(`${products.length} produtos encontrados (${foundDuplicates.length} já existem no sistema)`);
      } else {
        toast.success(`${products.length} produtos encontrados na planilha`);
      }
    };

    reader.readAsArrayBuffer(selectedFile);
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;

    setIsImporting(true);
    setImportProgress(0);
    setImportResults({ success: 0, errors: 0, updated: 0, skipped: 0 });
    setErrorDetails([]);
    setImportStartTime(Date.now());

    let success = 0;
    let errors = 0;
    let updated = 0;
    let skipped = 0;
    const errorList = [];

    // Separar produtos novos e duplicados
    const newProducts = [];
    const duplicateProducts = [];

    for (let i = 0; i < parsedData.length; i++) {
      const product = parsedData[i];
      if (product.isDuplicate && product.existingProductId) {
        duplicateProducts.push({ ...product, rowIndex: i });
      } else {
        newProducts.push({ ...product, rowIndex: i });
      }
    }

    // Processar produtos novos em lote (bulk create) - MUITO MAIS RÁPIDO
    const batchSize = 50;
    for (let i = 0; i < newProducts.length; i += batchSize) {
      const batch = newProducts.slice(i, i + batchSize);
      const productsToCreate = batch.map(product => {
        const stockQty = product.stock_quantity || 0;
        const minStock = 10; // Estoque mínimo padrão
        
        // Aplicar regras de estoque automaticamente
        let status = 'active';
        if (stockQty === 0) {
          status = 'inactive'; // Estoque zerado = inativo
        } else if (stockQty < minStock) {
          status = 'inactive'; // Abaixo do mínimo = inativo
        }
        
        const productData = {
          name: product.name,
          category: product.category || 'medicamentos',
          price: product.price,
          stock_quantity: stockQty,
          min_stock: minStock,
          min_stock_enabled: true,
          status: status // Status baseado nas regras de estoque
        };

        if (product.sku) productData.sku = product.sku;
        if (product.barcode) productData.barcode = product.barcode;
        if (product.reference) productData.reference = product.reference;
        if (product.brand) productData.brand = product.brand;
        if (product.cost_price > 0) productData.cost_price = product.cost_price;
        if (product.is_generic !== undefined) productData.is_generic = product.is_generic;

        return productData;
      });

      try {
        await base44.entities.Product.bulkCreate(productsToCreate);
        success += batch.length;
      } catch (error) {
        // Se falhar em lote, tenta um por um para identificar qual falhou
        for (const product of batch) {
          try {
            const stockQty = product.stock_quantity || 0;
            const minStock = 10;
            
            // Aplicar regras de estoque automaticamente
            let status = 'active';
            if (stockQty === 0) {
              status = 'inactive'; // Estoque zerado = inativo
            } else if (stockQty < minStock) {
              status = 'inactive'; // Abaixo do mínimo = inativo
            }
            
            const productData = {
              name: product.name,
              category: product.category || 'medicamentos',
              price: product.price || 0, // Permite preço 0
              stock_quantity: stockQty,
              min_stock: minStock,
              min_stock_enabled: true,
              status: status // Status baseado nas regras de estoque
            };

            if (product.sku) productData.sku = product.sku;
            if (product.barcode) productData.barcode = product.barcode;
            if (product.reference) productData.reference = product.reference;
            if (product.brand) productData.brand = product.brand;
            if (product.cost_price > 0) productData.cost_price = product.cost_price;
            if (product.is_generic !== undefined) productData.is_generic = product.is_generic;

            await base44.entities.Product.create(productData);
            success++;
          } catch (err) {
            errors++;
            errorList.push({
              row: product.rowIndex + 1,
              product_name: product.name,
              error_message: err.message || 'Erro desconhecido'
            });
          }
        }
      }

      setImportProgress(Math.round(((i + batchSize) / parsedData.length) * 100));
      setImportResults({ success, errors, updated, skipped });
    }

    // Processar produtos duplicados
    for (const product of duplicateProducts) {
      try {
        if (updateMode === 'update' || updateMode === 'updateAll') {
          const stockQty = product.stock_quantity || 0;
          const minStock = 10;
          
          // Aplicar regras de estoque automaticamente
          let status = 'active';
          if (stockQty === 0) {
            status = 'inactive'; // Estoque zerado = inativo
          } else if (stockQty < minStock) {
            status = 'inactive'; // Abaixo do mínimo = inativo
          }
          
          // Construir objeto de atualização baseado nas escolhas do usuário
          const updateData = {
            min_stock: minStock,
            min_stock_enabled: true,
            status: status // Status baseado nas regras de estoque
          };
          
          // Atualizar apenas os campos selecionados
          if (updateFields.name) {
            updateData.name = product.name;
          }
          if (updateFields.price) {
            updateData.price = product.price;
            if (product.cost_price > 0) {
              updateData.cost_price = product.cost_price;
            }
          }
          if (updateFields.stock) {
            updateData.stock_quantity = stockQty;
          }
          if (updateFields.image && product.image_url) {
            updateData.image_url = product.image_url;
            updateData.images = product.images || [];
          }
          
          // Sempre atualizar campos auxiliares se disponíveis
          if (product.brand) updateData.brand = product.brand;
          if (product.barcode) updateData.barcode = product.barcode;
          if (product.reference) updateData.reference = product.reference;
          
          await base44.entities.Product.update(product.existingProductId, updateData);
          updated++;
        } else {
          skipped++;
        }
      } catch (error) {
        errors++;
        errorList.push({
          row: product.rowIndex + 1,
          product_name: product.name,
          error_message: error.message || 'Erro ao atualizar'
        });
      }

      setImportProgress(Math.round(((newProducts.length + duplicateProducts.indexOf(product)) / parsedData.length) * 100));
      setImportResults({ success, errors, updated, skipped });
    }

    const duration = Math.round((Date.now() - importStartTime) / 1000);

    // Registrar log da importação
    try {
      await base44.entities.ImportLog.create({
        file_name: file.name,
        total_products: parsedData.length,
        products_created: success,
        products_updated: updated,
        products_skipped: skipped,
        products_errors: errors,
        error_details: errorList,
        duration_seconds: duration,
        status: errors === parsedData.length ? 'failed' : 'completed'
      });
    } catch (err) {
      console.error('Erro ao salvar log:', err);
    }

    setErrorDetails(errorList);
    setIsImporting(false);
    
    if (errors === 0) {
      toast.success(`Importação concluída em ${duration}s! ${success} criados, ${updated} atualizados, ${skipped} ignorados`);
    } else {
      toast.warning(`Importação concluída: ${success} criados, ${updated} atualizados, ${skipped} ignorados, ${errors} erros`);
      if (errorList.length > 0) {
        setShowErrorReport(true);
      }
    }
  };

  const applyCategoryMappings = () => {
    const updated = parsedData.map(product => ({
      ...product,
      category: product.category || categoryMappings[product.categoryRaw] || 'medicamentos'
    }));
    setParsedData(updated);
    setShowCategoryMapping(false);
    toast.success('Categorias mapeadas com sucesso!');
  };

  const clearData = () => {
    setFile(null);
    setParsedData([]);
    setDuplicates([]);
    setUnmappedCategories([]);
    setCategoryMappings({});
    setShowCategoryMapping(false);
    setUpdateMode('skip');
    setImportProgress(0);
    setImportResults({ success: 0, errors: 0, updated: 0, skipped: 0 });
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
        <motion.header 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white border-b px-4 sm:px-6 py-4 sticky top-0 z-40 shadow-sm"
        >
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Importar Produtos</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Upload de planilha Excel (.xls, .xlsx)</p>
          </div>
        </motion.header>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6"
        >
        {/* Upload Card */}
        <Card className="bg-white/60 backdrop-blur-sm border-gray-200/50 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              Upload da Planilha
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!file ? (
              <label className="block">
                <div className="border-2 border-dashed border-gray-300 rounded-3xl p-12 text-center cursor-pointer hover:border-emerald-500 hover:bg-gradient-to-br hover:from-emerald-50 hover:to-teal-50 transition-all group">
                  <input
                    type="file"
                    accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-3xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Upload className="w-10 h-10 text-emerald-600" />
                  </div>
                  <p className="text-gray-900 font-semibold text-lg mb-2">
                    Clique para enviar a planilha
                  </p>
                  <p className="text-sm text-gray-500">
                    Arraste e solte ou clique para selecionar
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Suporta arquivos .xls e .xlsx
                  </p>
                </div>
              </label>
            ) : (
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-10 h-10 text-emerald-600" />
                  <div>
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {parsedData.length} produtos encontrados
                    </p>
                  </div>
                </div>
                <Button variant="ghost" onClick={clearData}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}

            {isProcessing && (
              <div className="flex items-center justify-center gap-3 py-8">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                <span>Processando planilha...</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Mapping */}
        {showCategoryMapping && unmappedCategories.length > 0 && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Tag className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-2">
                    Mapear Categorias ({unmappedCategories.length} não reconhecida{unmappedCategories.length > 1 ? 's' : ''})
                  </h3>
                  <p className="text-sm text-blue-700 mb-4">
                    As categorias abaixo não foram reconhecidas automaticamente. Escolha para qual categoria do sistema cada uma deve ser mapeada:
                  </p>
                  <div className="space-y-3">
                    {unmappedCategories.map((catRaw) => (
                      <div key={catRaw} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-200">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 mb-1">{catRaw}</p>
                          <p className="text-xs text-gray-500">
                            {parsedData.filter(p => p.categoryRaw === catRaw).length} produto{parsedData.filter(p => p.categoryRaw === catRaw).length > 1 ? 's' : ''}
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                        <Select
                          value={categoryMappings[catRaw] || 'medicamentos'}
                          onValueChange={(value) => setCategoryMappings(prev => ({ ...prev, [catRaw]: value }))}
                        >
                          <SelectTrigger className="w-64">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {systemCategories.map(cat => (
                              <SelectItem key={cat.value} value={cat.value}>
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={applyCategoryMappings}
                    className="mt-4 bg-blue-600 hover:bg-blue-700"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Aplicar Mapeamento
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Duplicates Warning */}
        {!showCategoryMapping && duplicates.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-900 mb-2">
                    {duplicates.length} produto{duplicates.length > 1 ? 's' : ''} já existe{duplicates.length > 1 ? 'm' : ''} no sistema
                  </h3>
                  <p className="text-sm text-amber-700 mb-4">
                    Escolha como deseja tratar os produtos duplicados:
                  </p>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-amber-200 cursor-pointer hover:border-amber-400 transition-colors">
                      <input
                        type="radio"
                        name="updateMode"
                        value="skip"
                        checked={updateMode === 'skip'}
                        onChange={(e) => setUpdateMode(e.target.value)}
                        className="w-4 h-4 text-emerald-600"
                      />
                      <div>
                        <p className="font-medium text-gray-900">Ignorar produtos duplicados</p>
                        <p className="text-sm text-gray-500">Manter os dados existentes e importar apenas produtos novos</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-amber-200 cursor-pointer hover:border-amber-400 transition-colors">
                      <input
                        type="radio"
                        name="updateMode"
                        value="update"
                        checked={updateMode === 'update' || updateMode === 'updateAll'}
                        onChange={(e) => setUpdateMode(e.target.value)}
                        className="w-4 h-4 text-emerald-600"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Atualizar produtos existentes</p>
                        <p className="text-sm text-gray-500 mb-3">Escolha quais campos deseja atualizar:</p>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                            <input
                              type="checkbox"
                              checked={updateFields.name}
                              onChange={(e) => setUpdateFields(prev => ({ ...prev, name: e.target.checked }))}
                              disabled={updateMode !== 'update' && updateMode !== 'updateAll'}
                              className="w-4 h-4 text-emerald-600"
                            />
                            <span className="text-sm">Nome</span>
                          </label>
                          <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                            <input
                              type="checkbox"
                              checked={updateFields.price}
                              onChange={(e) => setUpdateFields(prev => ({ ...prev, price: e.target.checked }))}
                              disabled={updateMode !== 'update' && updateMode !== 'updateAll'}
                              className="w-4 h-4 text-emerald-600"
                            />
                            <span className="text-sm">Preço</span>
                          </label>
                          <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                            <input
                              type="checkbox"
                              checked={updateFields.stock}
                              onChange={(e) => setUpdateFields(prev => ({ ...prev, stock: e.target.checked }))}
                              disabled={updateMode !== 'update' && updateMode !== 'updateAll'}
                              className="w-4 h-4 text-emerald-600"
                            />
                            <span className="text-sm">Estoque</span>
                          </label>
                          <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                            <input
                              type="checkbox"
                              checked={updateFields.image}
                              onChange={(e) => setUpdateFields(prev => ({ ...prev, image: e.target.checked }))}
                              disabled={updateMode !== 'update' && updateMode !== 'updateAll'}
                              className="w-4 h-4 text-emerald-600"
                            />
                            <span className="text-sm">Imagem</span>
                          </label>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Preview Table */}
        {!showCategoryMapping && parsedData.length > 0 && (
          <Card className="bg-white/60 backdrop-blur-sm border-gray-200/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Pré-visualização ({parsedData.length} produtos)</CardTitle>
                <div className="flex items-center gap-2">
                  {duplicates.length > 0 && (
                    <Badge className="bg-amber-100 text-amber-800">
                      {duplicates.length} duplicados
                    </Badge>
                  )}
                  <Badge className="bg-emerald-100 text-emerald-700">
                    {parsedData.length - duplicates.length} novos
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50">
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Cód. INT</TableHead>
                      <TableHead>SKU/Código</TableHead>
                      <TableHead>EAN/Barras</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Fabricante</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Estoque</TableHead>
                      <TableHead>Custo</TableHead>
                      <TableHead>Preço</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 50).map((product, index) => (
                      <TableRow key={index} className={product.isDuplicate ? 'bg-amber-50/30' : ''}>
                        <TableCell>
                          {product.isDuplicate && (
                            <RefreshCw className="w-4 h-4 text-amber-600" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{product.int}</TableCell>
                        <TableCell className="font-mono text-xs">{product.sku}</TableCell>
                        <TableCell className="font-mono text-xs">{product.barcode}</TableCell>
                        <TableCell className="max-w-xs truncate">{product.name}</TableCell>
                        <TableCell className="text-sm text-gray-600">{product.brand}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize text-xs">
                            {product.category ? product.category.replace(/_/g, ' ') : 'Sem categoria'}
                          </Badge>
                        </TableCell>
                        <TableCell>{product.stock_quantity}</TableCell>
                        <TableCell className="text-sm">R$ {product.cost_price.toFixed(2)}</TableCell>
                        <TableCell className="font-medium">R$ {product.price.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {parsedData.length > 50 && (
                <p className="text-sm text-gray-500 text-center mt-4">
                  Mostrando 50 de {parsedData.length} produtos
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Import Progress */}
        {isImporting && (
          <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
            <CardContent className="py-8">
              <div className="text-center mb-6">
                <div className="relative inline-flex">
                  <Loader2 className="w-12 h-12 animate-spin text-emerald-600" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-emerald-700">{importProgress}%</span>
                  </div>
                </div>
                <p className="font-semibold text-lg mt-4 text-gray-900">Importando produtos...</p>
                <p className="text-sm text-gray-500">
                  {importStartTime && `Tempo decorrido: ${Math.round((Date.now() - importStartTime) / 1000)}s`}
                </p>
              </div>
              <div className="relative mb-6">
                <Progress value={importProgress} className="h-3 bg-white/50" />
                <div 
                  className="absolute top-0 left-0 h-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-300 shadow-lg"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-white/70 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{importResults.success}</p>
                  <p className="text-xs text-gray-600">Criados</p>
                </div>
                {importResults.updated > 0 && (
                  <div className="text-center p-3 bg-white/70 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{importResults.updated}</p>
                    <p className="text-xs text-gray-600">Atualizados</p>
                  </div>
                )}
                {importResults.skipped > 0 && (
                  <div className="text-center p-3 bg-white/70 rounded-lg">
                    <p className="text-2xl font-bold text-gray-600">{importResults.skipped}</p>
                    <p className="text-xs text-gray-600">Ignorados</p>
                  </div>
                )}
                {importResults.errors > 0 && (
                  <div className="text-center p-3 bg-white/70 rounded-lg">
                    <p className="text-2xl font-bold text-red-600">{importResults.errors}</p>
                    <p className="text-xs text-gray-600">Erros</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Import Results */}
        {!isImporting && importResults.success > 0 && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="py-8 text-center">
              <Check className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-green-800 mb-2">
                Importação Concluída!
              </h3>
              <div className="space-y-1 text-green-600">
                <p>{importResults.success} produtos criados</p>
                {importResults.updated > 0 && <p>{importResults.updated} produtos atualizados</p>}
                {importResults.skipped > 0 && <p>{importResults.skipped} produtos ignorados</p>}
                {importResults.errors > 0 && (
                  <p className="text-red-600">
                    {importResults.errors} erros 
                    <Button 
                      variant="link" 
                      onClick={() => setShowErrorReport(true)}
                      className="text-red-600 underline ml-2"
                    >
                      Ver detalhes
                    </Button>
                  </p>
                )}
              </div>
              <div className="flex justify-center gap-3 mt-4">
                <Link to={createPageUrl('AdminProducts')}>
                  <Button className="bg-green-600 hover:bg-green-700">
                    Ver Produtos
                  </Button>
                </Link>
                <Link to={createPageUrl('AdminImportHistory')}>
                  <Button variant="outline">
                    Ver Histórico de Importações
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        {!showCategoryMapping && parsedData.length > 0 && !isImporting && importResults.success === 0 && (
          <div className="flex gap-4">
            <Button variant="outline" onClick={clearData} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={handleImport}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              Importar {parsedData.length} Produtos
            </Button>
          </div>
        )}

        {/* Instructions */}
        <Card className="bg-white/60 backdrop-blur-sm border-gray-200/50">
          <CardHeader>
            <CardTitle className="text-base">Formato Esperado da Planilha</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              A planilha deve conter as seguintes colunas (o sistema detecta automaticamente):
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              {[
                { col: 'INT', desc: 'Código interno INT' },
                { col: 'CODIGO', desc: 'Código/SKU do produto' },
                { col: 'BARRAS / EAN', desc: 'Código de barras' },
                { col: 'REFERÊNCIA', desc: 'Referência do produto' },
                { col: 'PRODUTO / NOME', desc: 'Nome do produto' },
                { col: 'FABRICANTE', desc: 'Fabricante/Marca' },
                { col: 'CATEGORIA', desc: 'Categoria (opcional)' },
                { col: 'ESTOQUE', desc: 'Quantidade disponível' },
                { col: 'CUSTO', desc: 'Preço de custo' },
                { col: 'PREÇO / VENDA', desc: 'Preço de venda' }
              ].map((item, i) => (
                <div key={i} className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-3 border border-gray-100">
                  <p className="font-semibold text-emerald-700 text-xs mb-1">{item.col}</p>
                  <p className="text-gray-600 text-xs">{item.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>💡 Dica:</strong> O sistema detecta automaticamente as colunas. Produtos duplicados (mesmo SKU ou código de barras) podem ser atualizados ou ignorados.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Error Report Dialog */}
      <Dialog open={showErrorReport} onOpenChange={setShowErrorReport}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Relatório de Erros ({errorDetails.length})
            </DialogTitle>
            <DialogDescription>
              Produtos que não puderam ser importados
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {errorDetails.map((error, index) => (
              <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Badge variant="destructive" className="mt-0.5">
                    Linha {error.row}
                  </Badge>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{error.product_name}</p>
                    <p className="text-sm text-red-600 mt-1">{error.error_message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowErrorReport(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </motion.main>
    </div>
  );
}