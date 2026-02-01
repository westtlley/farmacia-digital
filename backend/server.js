import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());

// Arquivos de persistência
const DATA_DIR = path.join(__dirname, 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const CATEGORIES_FILE = path.join(DATA_DIR, 'categories.json');

// Criar diretório de dados se não existir
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Funções de persistência
function loadProducts() {
  try {
    if (fs.existsSync(PRODUCTS_FILE)) {
      const data = fs.readFileSync(PRODUCTS_FILE, 'utf8');
      const products = JSON.parse(data);
      console.log(`📦 Carregados ${products.length} produtos do arquivo`);
      return products;
    }
  } catch (error) {
    console.error('Erro ao carregar produtos:', error);
  }
  return [];
}

function saveProducts(products) {
  try {
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf8');
    console.log(`💾 ${products.length} produtos salvos no arquivo`);
  } catch (error) {
    console.error('Erro ao salvar produtos:', error);
  }
}

function loadCategories() {
  try {
    if (fs.existsSync(CATEGORIES_FILE)) {
      const data = fs.readFileSync(CATEGORIES_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Erro ao carregar categorias:', error);
  }
  return [];
}

function saveCategories(categories) {
  try {
    fs.writeFileSync(CATEGORIES_FILE, JSON.stringify(categories, null, 2), 'utf8');
  } catch (error) {
    console.error('Erro ao salvar categorias:', error);
  }
}

// Carregar dados ao iniciar
let productsStore = loadProducts();
let categoriesStore = loadCategories();

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'API funcionando',
    timestamp: new Date().toISOString(),
    productsCount: productsStore.length
  });
});

// Rotas de produtos
app.get('/api/products', (req, res) => {
  try {
    const { status, category, search } = req.query;
    let products = [...productsStore];
    
    // Filtros
    if (status) {
      products = products.filter(p => p.status === status);
    }
    if (category) {
      products = products.filter(p => p.category === category);
    }
    if (search) {
      const searchLower = search.toLowerCase();
      products = products.filter(p => 
        p.name?.toLowerCase().includes(searchLower) ||
        p.sku?.toLowerCase().includes(searchLower) ||
        p.barcode?.toLowerCase().includes(searchLower)
      );
    }
    
    res.json(products);
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    res.status(500).json({ error: 'Erro ao buscar produtos' });
  }
});

app.get('/api/products/:id', (req, res) => {
  try {
    const product = productsStore.find(p => p.id === req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    res.json(product);
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    res.status(500).json({ error: 'Erro ao buscar produto' });
  }
});

app.post('/api/products', (req, res) => {
  try {
    const data = req.body;
    const product = {
      id: `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...data,
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString()
    };
    productsStore.push(product);
    saveProducts(productsStore); // Salvar no arquivo
    console.log(`✅ Produto criado: ${product.id} - ${product.name}`);
    res.status(201).json(product);
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    res.status(500).json({ error: 'Erro ao criar produto' });
  }
});

app.put('/api/products/:id', (req, res) => {
  try {
    const index = productsStore.findIndex(p => p.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    const updatedProduct = {
      ...productsStore[index],
      ...req.body,
      id: req.params.id,
      updated_date: new Date().toISOString()
    };
    productsStore[index] = updatedProduct;
    saveProducts(productsStore); // Salvar no arquivo
    console.log(`✅ Produto atualizado: ${updatedProduct.id} - ${updatedProduct.name}`);
    res.json(updatedProduct);
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    res.status(500).json({ error: 'Erro ao atualizar produto' });
  }
});

app.delete('/api/products/:id', (req, res) => {
  try {
    const index = productsStore.findIndex(p => p.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    productsStore.splice(index, 1);
    saveProducts(productsStore); // Salvar no arquivo
    console.log(`✅ Produto deletado: ${req.params.id}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar produto:', error);
    res.status(500).json({ error: 'Erro ao deletar produto' });
  }
});

// Rotas de pedidos
app.get('/api/orders', (req, res) => {
  // TODO: Implementar lógica de pedidos
  res.json({ orders: [] });
});

app.post('/api/orders', (req, res) => {
  // TODO: Implementar criação de pedido
  res.json({ success: true, order: req.body });
});

// Rotas de categorias
app.get('/api/categories', (req, res) => {
  try {
    // Se não houver categorias, retornar padrões
    if (categoriesStore.length === 0) {
      const defaultCategories = [
        { id: 'cat_1', name: 'Medicamentos', slug: 'medicamentos' },
        { id: 'cat_2', name: 'Dermocosméticos', slug: 'dermocosmeticos' },
        { id: 'cat_3', name: 'Vitaminas', slug: 'vitaminas' },
        { id: 'cat_4', name: 'Higiene', slug: 'higiene' },
        { id: 'cat_5', name: 'Infantil', slug: 'infantil' }
      ];
      categoriesStore = defaultCategories;
    }
    res.json(categoriesStore);
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
});

// Rotas de autenticação
app.post('/api/auth/login', (req, res) => {
  // TODO: Implementar autenticação
  res.json({ success: true, user: req.body });
});

// Salvar dados periodicamente (a cada 30 segundos)
setInterval(() => {
  saveProducts(productsStore);
  saveCategories(categoriesStore);
}, 30000);

// Salvar ao encerrar
process.on('SIGTERM', () => {
  console.log('💾 Salvando dados antes de encerrar...');
  saveProducts(productsStore);
  saveCategories(categoriesStore);
  process.exit(0);
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 URL pública: https://farmacia-digital-1.onrender.com`);
  console.log(`🔗 Frontend configurado: ${process.env.FRONTEND_URL || 'Nenhum (aceita todas as origens)'}`);
  console.log(`☁️ Cloudinary: ${process.env.CLOUDINARY_CLOUD_NAME || 'Não configurado'}`);
  console.log(`💾 Persistência: Arquivo JSON (${productsStore.length} produtos carregados)`);
});
