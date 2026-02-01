// API local que substitui o base44
import { db } from './localStorage';
import { apiClient, API_URL } from '@/config/api';

// Simular delay de rede
const delay = (ms = 100) => new Promise(resolve => setTimeout(resolve, ms));

// Debug Cloudinary - remover em produção se necessário
if (typeof window !== 'undefined') {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const apiKey = import.meta.env.VITE_CLOUDINARY_API_KEY;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  
  console.log('🔍 ===== Cloudinary Config Check =====');
  console.log('Cloud Name:', cloudName || '❌ FALTA - Adicione VITE_CLOUDINARY_CLOUD_NAME no Vercel');
  console.log('API Key:', apiKey ? '✅ Configurado' : '❌ FALTA - Adicione VITE_CLOUDINARY_API_KEY no Vercel');
  console.log('Upload Preset:', uploadPreset || '❌ FALTA - Adicione VITE_CLOUDINARY_UPLOAD_PRESET no Vercel');
  console.log('Vai usar Cloudinary?', !!cloudName && !!uploadPreset ? '✅ SIM' : '❌ NÃO');
  console.log('=====================================');
  
  // Listar todas as variáveis VITE_ disponíveis
  const viteEnvVars = Object.keys(import.meta.env).filter(k => k.startsWith('VITE_'));
  console.log('📋 Variáveis VITE_ disponíveis:', viteEnvVars);
}

// Entidades
class EntityAPI {
  constructor(entityName) {
    this.entityName = entityName;
  }

  async list(sortBy = '', limit = null) {
    // Tentar usar backend se disponível
    if (this.entityName === 'Product') {
      const isLocalhost = API_URL.includes('localhost') || API_URL === 'http://localhost:10000';
      const shouldUseBackend = API_URL && !isLocalhost && API_URL.startsWith('http');
      
      if (shouldUseBackend) {
        try {
          console.log('🔍 Tentando buscar produtos do backend:', API_URL);
          console.log('VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL || '❌ UNDEFINED');
          const products = await apiClient.get('/api/products');
          console.log(`✅ ${products.length} produtos carregados do backend`);
          return Array.isArray(products) ? products : [];
        } catch (error) {
          console.error('❌ Erro ao buscar do backend:', error);
          console.error('❌ URL tentada:', `${API_URL}/api/products`);
          console.error('❌ Detalhes:', error.message);
          console.warn('⚠️ Usando localStorage como fallback');
        }
      } else {
        console.log('ℹ️ Usando localStorage (backend não configurado ou localhost)');
        console.log('ℹ️ API_URL atual:', API_URL);
        console.log('ℹ️ Configure VITE_API_BASE_URL no Vercel!');
      }
    }
    await delay();
    const localData = db.filter(this.entityName, {}, sortBy, limit);
    console.log(`💾 ${localData.length} produtos carregados do localStorage`);
    return localData;
  }

  async filter(filters = {}, sortBy = '', limit = null) {
    // Tentar usar backend se disponível
    if (this.entityName === 'Product') {
      const isLocalhost = API_URL.includes('localhost') || API_URL === 'http://localhost:10000';
      const shouldUseBackend = API_URL && !isLocalhost && API_URL.startsWith('http');
      
      if (shouldUseBackend) {
        try {
          const params = new URLSearchParams();
          if (filters.status) params.append('status', filters.status);
          if (filters.category) params.append('category', filters.category);
          if (filters.search) params.append('search', filters.search);
          
          const products = await apiClient.get(`/api/products?${params.toString()}`);
          return Array.isArray(products) ? products : [];
        } catch (error) {
          console.error('❌ Erro ao filtrar do backend:', error.message);
          console.warn('⚠️ Usando localStorage como fallback');
        }
      }
    }
    await delay();
    return db.filter(this.entityName, filters, sortBy, limit);
  }

  async get(id) {
    // Tentar usar backend se disponível
    if (this.entityName === 'Product') {
      const isLocalhost = API_URL.includes('localhost') || API_URL === 'http://localhost:10000';
      const shouldUseBackend = API_URL && !isLocalhost && API_URL.startsWith('http');
      
      if (shouldUseBackend) {
        try {
          return await apiClient.get(`/api/products/${id}`);
        } catch (error) {
          console.error('❌ Erro ao buscar produto do backend:', error.message);
          console.warn('⚠️ Usando localStorage como fallback');
        }
      }
    }
    await delay();
    return db.getById(this.entityName, id);
  }

  async create(data) {
    console.log('🔍 ===== CRIAR PRODUTO =====');
    console.log('Entity:', this.entityName);
    console.log('API_URL:', API_URL);
    console.log('VITE_API_URL:', import.meta.env.VITE_API_URL || '❌ UNDEFINED');
    console.log('VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL || '❌ UNDEFINED');
    
    // Tentar usar backend se disponível
    if (this.entityName === 'Product') {
      const isLocalhost = API_URL.includes('localhost') || API_URL === 'http://localhost:10000';
      const shouldUseBackend = API_URL && !isLocalhost && API_URL.startsWith('http');
      
      console.log('isLocalhost?', isLocalhost);
      console.log('shouldUseBackend?', shouldUseBackend);
      
      if (shouldUseBackend) {
        try {
          console.log('🔍 Tentando salvar produto no backend:', API_URL);
          console.log('📦 Dados do produto:', { name: data.name, price: data.price, status: data.status });
          const product = await apiClient.post('/api/products', data);
          console.log('✅ Produto salvo no backend:', product.id, '-', product.name);
          console.log('============================');
          return product;
        } catch (error) {
          console.error('❌ Erro ao salvar no backend:', error);
          console.error('❌ Detalhes:', error.message);
          console.error('❌ Stack:', error.stack);
          console.error('❌ URL tentada:', `${API_URL}/api/products`);
          console.warn('⚠️ Usando localStorage como fallback');
          // Continuar para salvar no localStorage como fallback
        }
      } else {
        console.log('ℹ️ Backend não configurado ou localhost');
        console.log('ℹ️ API_URL atual:', API_URL);
        console.log('ℹ️ Configure VITE_API_BASE_URL no Vercel!');
      }
    }
    await delay();
    const result = db.create(this.entityName, data);
    console.log('⚠️ Produto salvo apenas no localStorage (não persiste entre sessões)');
    console.log('============================');
    return result;
  }

  async update(id, data) {
    // Tentar usar backend se disponível
    if (this.entityName === 'Product') {
      const isLocalhost = API_URL.includes('localhost') || API_URL === 'http://localhost:10000';
      const shouldUseBackend = API_URL && !isLocalhost && API_URL.startsWith('http');
      
      if (shouldUseBackend) {
        try {
          console.log('🔍 Atualizando produto no backend:', id);
          const product = await apiClient.put(`/api/products/${id}`, data);
          console.log('✅ Produto atualizado no backend:', product.id);
          return product;
        } catch (error) {
          console.error('❌ Erro ao atualizar no backend:', error.message);
          console.warn('⚠️ Usando localStorage como fallback');
        }
      }
    }
    await delay();
    return db.update(this.entityName, id, data);
  }

  async delete(id) {
    // Tentar usar backend se disponível
    if (this.entityName === 'Product') {
      const isLocalhost = API_URL.includes('localhost') || API_URL === 'http://localhost:10000';
      const shouldUseBackend = API_URL && !isLocalhost && API_URL.startsWith('http');
      
      if (shouldUseBackend) {
        try {
          console.log('🔍 Deletando produto no backend:', id);
          await apiClient.delete(`/api/products/${id}`);
          console.log('✅ Produto deletado no backend:', id);
          return { success: true };
        } catch (error) {
          console.error('❌ Erro ao deletar no backend:', error.message);
          console.warn('⚠️ Usando localStorage como fallback');
        }
      }
    }
    await delay();
    return db.delete(this.entityName, id);
  }

  async bulkCreate(items) {
    console.log('🔍 ===== BULK CREATE PRODUTOS =====');
    console.log('Entity:', this.entityName);
    console.log('Quantidade:', items.length);
    
    // Verificar variáveis de ambiente diretamente
    const viteApiUrl = import.meta.env.VITE_API_URL;
    const viteApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
    const finalApiUrl = API_URL;
    
    console.log('VITE_API_URL:', viteApiUrl || '❌ UNDEFINED');
    console.log('VITE_API_BASE_URL:', viteApiBaseUrl || '❌ UNDEFINED');
    console.log('API_URL FINAL:', finalApiUrl);
    
    // Tentar usar backend se disponível
    if (this.entityName === 'Product') {
      const isLocalhost = finalApiUrl.includes('localhost') || finalApiUrl === 'http://localhost:10000';
      const shouldUseBackend = finalApiUrl && !isLocalhost && finalApiUrl.startsWith('http');
      
      console.log('isLocalhost?', isLocalhost);
      console.log('shouldUseBackend?', shouldUseBackend);
      
      if (shouldUseBackend) {
        console.log('🔍 Tentando salvar produtos no backend:', finalApiUrl);
        const results = [];
        let successCount = 0;
        let errorCount = 0;
        const errors = [];
        
        // Testar conexão primeiro
        try {
          const healthCheck = await fetch(`${finalApiUrl}/api/health`);
          if (!healthCheck.ok) {
            throw new Error(`Backend não está respondendo: ${healthCheck.status}`);
          }
          const health = await healthCheck.json();
          console.log('✅ Backend online:', health.message);
        } catch (error) {
          console.error('❌ Backend offline ou inacessível:', error.message);
          console.warn('⚠️ Usando localStorage como fallback');
          // Continuar para fallback
        }
        
        // Se health check passou, tentar salvar produtos
        if (shouldUseBackend) {
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            try {
              const response = await fetch(`${finalApiUrl}/api/products`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(item),
              });
              
              if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 100)}`);
              }
              
              const product = await response.json();
              results.push(product);
              successCount++;
              
              // Log de progresso a cada 50 produtos
              if ((i + 1) % 50 === 0) {
                console.log(`📊 Progresso: ${i + 1}/${items.length} produtos processados (${successCount} sucesso, ${errorCount} erros)`);
              }
            } catch (error) {
              errorCount++;
              errors.push({ index: i + 1, name: item.name, error: error.message });
              
              // Mostrar apenas os primeiros 5 erros para não poluir o console
              if (errorCount <= 5) {
                console.error(`❌ Erro ao criar produto ${i + 1} (${item.name || 'sem nome'}):`, error.message);
              }
              // Continuar com os próximos produtos mesmo se um falhar
            }
            
            // Pequeno delay para não sobrecarregar o servidor
            if ((i + 1) % 10 === 0) {
              await new Promise(resolve => setTimeout(resolve, 50));
            }
          }
          
          console.log(`✅ ${successCount} produtos salvos no backend`);
          if (errorCount > 0) {
            console.warn(`⚠️ ${errorCount} produtos falharam ao salvar no backend`);
            if (errors.length > 0) {
              console.warn('Primeiros erros:', errors.slice(0, 5));
            }
          }
          console.log('============================');
          
          // Se pelo menos alguns produtos foram salvos, retornar os resultados
          if (results.length > 0) {
            console.log(`✅ Retornando ${results.length} produtos salvos no backend`);
            return results;
          } else {
            console.warn('⚠️ Nenhum produto foi salvo no backend, usando localStorage como fallback');
          }
        }
      } else {
        console.log('ℹ️ Backend não configurado ou localhost');
        console.log('ℹ️ API_URL atual:', finalApiUrl);
        console.log('ℹ️ Verifique se VITE_API_BASE_URL está configurada no Vercel e faça redeploy!');
      }
    }
    
    // Fallback para localStorage
    console.log('💾 Salvando produtos no localStorage...');
    await delay(300);
    const result = db.bulkCreate(this.entityName, items);
    console.log('⚠️ Produtos salvos apenas no localStorage (não persistem entre sessões)');
    console.log('⚠️ IMPORTANTE: Configure VITE_API_BASE_URL no Vercel e faça redeploy!');
    console.log('============================');
    return result;
  }
}

// Autenticação
class AuthAPI {
  async me() {
    await delay();
    let user = JSON.parse(localStorage.getItem('db_currentUser') || '{}');
    if (!user.id) {
      // Criar usuário padrão se não existir
      user = {
        id: 'user_1',
        email: 'admin@farmacia.com',
        full_name: 'Administrador',
        role: 'admin'
      };
      localStorage.setItem('db_currentUser', JSON.stringify(user));
    }
    return user;
  }

  async login(email, password) {
    await delay(500);
    // Para desenvolvimento local, aceita qualquer login
    const user = {
      id: 'user_1',
      email: email || 'admin@farmacia.com',
      full_name: email?.split('@')[0] || 'Usuário',
      role: 'admin'
    };
    localStorage.setItem('db_currentUser', JSON.stringify(user));
    return user;
  }

  async logout() {
    await delay();
    localStorage.removeItem('db_currentUser');
    return { success: true };
  }

  async register(data) {
    await delay(500);
    const user = {
      id: `user_${Date.now()}`,
      email: data.email,
      full_name: data.full_name || data.name || 'Usuário',
      role: 'customer',
      ...data
    };
    localStorage.setItem('db_currentUser', JSON.stringify(user));
    return user;
  }
}

// Integrações
class IntegrationsAPI {
  async UploadFile({ file }) {
    await delay(1000);
    
    // Tentar usar Cloudinary se estiver configurado
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    
    if (file && cloudName && uploadPreset) {
      console.log('☁️ Tentando upload no Cloudinary...');
      console.log('📋 Configuração:', { cloudName, uploadPreset, fileName: file.name });
      try {
        const { uploadToCloudinary } = await import('@/config/cloudinary');
        const result = await uploadToCloudinary(file, {
          folder: 'uploads',
          uploadPreset: uploadPreset
        });
        console.log('✅ Upload Cloudinary bem-sucedido:', result.url);
        return {
          file_url: result.url,
          file_id: result.publicId
        };
      } catch (error) {
        console.error('❌ Erro ao fazer upload no Cloudinary:', error);
        console.error('❌ Mensagem de erro:', error.message);
        console.warn('⚠️ Usando fallback...');
        // Não retorna aqui, deixa cair no fallback abaixo
      }
    } else {
      const missing = [];
      if (!cloudName) missing.push('VITE_CLOUDINARY_CLOUD_NAME');
      if (!uploadPreset) missing.push('VITE_CLOUDINARY_UPLOAD_PRESET');
      
      console.error('❌ Cloudinary não configurado. Variáveis faltando:', missing);
      console.error('❌ Adicione essas variáveis no Vercel e faça redeploy!');
      console.error('❌ Usando placeholder como fallback.');
      
      // Em produção, nunca usar blob URLs
      return {
        file_url: 'https://via.placeholder.com/400',
        file_id: `file_${Date.now()}`,
        error: 'Cloudinary não configurado'
      };
    }
    
    // Se chegou aqui, o Cloudinary falhou mas as variáveis existem
    // Isso significa que o preset provavelmente não está configurado corretamente
    console.error('❌ Upload do Cloudinary falhou. Verifique:');
    console.error('   1. Preset "farmacia-upload" existe no Cloudinary?');
    console.error('   2. Preset está como "Unsigned" (não "Signed")?');
    console.error('   3. Nome do preset está correto?');
    
    // Em produção, nunca usar blob URLs
    return {
      file_url: 'https://via.placeholder.com/400',
      file_id: `file_${Date.now()}`,
      error: 'Upload do Cloudinary falhou'
    };
  }

  async UploadPrivateFile({ file }) {
    await delay(1000);
    
    // Tentar usar Cloudinary se estiver configurado
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    
    if (file && cloudName && uploadPreset) {
      console.log('☁️ Tentando upload privado no Cloudinary...');
      console.log('📋 Configuração:', { cloudName, uploadPreset, fileName: file.name });
      try {
        const { uploadToCloudinary } = await import('@/config/cloudinary');
        const result = await uploadToCloudinary(file, {
          folder: 'private',
          uploadPreset: uploadPreset
        });
        console.log('✅ Upload Cloudinary privado bem-sucedido:', result.url);
        return {
          file_url: result.url,
          file_id: result.publicId
        };
      } catch (error) {
        console.error('❌ Erro ao fazer upload privado no Cloudinary:', error);
        console.error('❌ Mensagem de erro:', error.message);
        console.warn('⚠️ Usando fallback...');
        // Não retorna aqui, deixa cair no fallback abaixo
      }
    } else {
      const missing = [];
      if (!cloudName) missing.push('VITE_CLOUDINARY_CLOUD_NAME');
      if (!uploadPreset) missing.push('VITE_CLOUDINARY_UPLOAD_PRESET');
      
      console.error('❌ Cloudinary não configurado para upload privado. Variáveis faltando:', missing);
      console.error('❌ Usando placeholder como fallback.');
      
      // Em produção, nunca usar blob URLs
      return {
        file_url: 'https://via.placeholder.com/400',
        file_id: `file_${Date.now()}`,
        error: 'Cloudinary não configurado'
      };
    }
    
    // Se chegou aqui, o Cloudinary falhou mas as variáveis existem
    console.error('❌ Upload privado do Cloudinary falhou. Verifique o preset no Cloudinary.');
    
    // Em produção, nunca usar blob URLs
    return {
      file_url: 'https://via.placeholder.com/400',
      file_id: `file_${Date.now()}`,
      error: 'Upload do Cloudinary falhou'
    };
  }

  async ExtractDataFromUploadedFile({ file_url }) {
    await delay(2000);
    // Simular extração de dados de receita
    return {
      extracted_data: {
        patient_name: 'João Silva',
        doctor_name: 'Dr. Maria Santos',
        medications: [
          { name: 'Paracetamol', dosage: '500mg', quantity: 20 },
          { name: 'Ibuprofeno', dosage: '400mg', quantity: 30 }
        ],
        date: new Date().toISOString()
      }
    };
  }

  async CreateFileSignedUrl({ file_id }) {
    await delay(500);
    return {
      signed_url: `https://example.com/files/${file_id}`,
      expires_at: new Date(Date.now() + 3600000).toISOString()
    };
  }

  async InvokeLLM({ prompt, model = 'gpt-3.5-turbo' }) {
    await delay(2000);
    return {
      response: `Resposta simulada para: ${prompt}`,
      model
    };
  }

  async SendEmail({ to, subject, body }) {
    await delay(1000);
    console.log('Email simulado enviado:', { to, subject, body });
    return {
      success: true,
      message_id: `msg_${Date.now()}`
    };
  }

  async GenerateImage({ prompt, size = '512x512' }) {
    await delay(2000);
    return {
      image_url: `https://via.placeholder.com/${size}?text=${encodeURIComponent(prompt)}`,
      image_id: `img_${Date.now()}`
    };
  }
}

// Cliente principal
class LocalAPIClient {
  constructor() {
    this.entities = {
      Product: new EntityAPI('Product'),
      Order: new EntityAPI('Order'),
      Category: new EntityAPI('Category'),
      Promotion: new EntityAPI('Promotion'),
      BlogPost: new EntityAPI('BlogPost'),
      Prescription: new EntityAPI('Prescription'),
      Customer: new EntityAPI('Customer'),
      Banner: new EntityAPI('Banner'),
      PharmacySettings: new EntityAPI('PharmacySettings'),
      ImportLog: new EntityAPI('ImportLog')
    };

    this.auth = new AuthAPI();
    this.integrations = {
      Core: new IntegrationsAPI()
    };
  }
}

export const localApi = new LocalAPIClient();
