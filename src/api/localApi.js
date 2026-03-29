import { db } from './localStorage';
import { apiClient } from '@/config/api';
import { clearStoredSession, getStoredSession, setStoredSession } from '@/api/session';

const delay = (ms = 100) => new Promise((resolve) => setTimeout(resolve, ms));

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const content = result.includes(',') ? result.split(',')[1] : result;
      resolve(content);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const BACKEND_ENTITY_ENDPOINTS = {
  Product: '/api/products',
  Category: '/api/categories',
  Order: '/api/orders',
  Prescription: '/api/prescriptions',
  Customer: '/api/customers',
  PharmacySettings: '/api/settings',
};

const TRACKABLE_ORDER_FILTERS = ['order_number'];

function isBackendEntity(entityName) {
  return Boolean(BACKEND_ENTITY_ENDPOINTS[entityName]);
}

function buildQueryString(filters = {}, sortBy = '', limit = null) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    params.append(key, value);
  });

  if (sortBy) {
    params.append('sortBy', sortBy);
  }

  if (limit) {
    params.append('limit', String(limit));
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}

function shouldUseTrackOrderEndpoint(filters) {
  const keys = Object.keys(filters || {}).filter((key) => filters[key] !== undefined && filters[key] !== null && filters[key] !== '');
  return keys.length === 1 && TRACKABLE_ORDER_FILTERS.includes(keys[0]);
}

function extractBackendList(entityName, payload) {
  if (entityName === 'PharmacySettings') {
    return payload?.settings ? [payload.settings] : [];
  }

  return Array.isArray(payload) ? payload : [];
}

function persistSessionIfPresent(payload) {
  if (payload?.session?.user) {
    setStoredSession(payload.session);
  }
}

class EntityAPI {
  constructor(entityName) {
    this.entityName = entityName;
    this.endpoint = BACKEND_ENTITY_ENDPOINTS[entityName] || null;
  }

  async list(sortBy = '', limit = null) {
    if (isBackendEntity(this.entityName)) {
      const payload = await apiClient.get(`${this.endpoint}${buildQueryString({}, sortBy, limit)}`);
      return extractBackendList(this.entityName, payload);
    }

    await delay();
    return db.filter(this.entityName, {}, sortBy, limit);
  }

  async filter(filters = {}, sortBy = '', limit = null) {
    if (this.entityName === 'Order' && shouldUseTrackOrderEndpoint(filters)) {
      const orderNumber = String(filters.order_number || '').trim();
      if (!orderNumber) {
        return [];
      }

      try {
        const payload = await apiClient.get(`/api/orders/track/${encodeURIComponent(orderNumber)}`);
        return payload?.order ? [payload.order] : [];
      } catch (error) {
        if (error.status === 404) {
          return [];
        }
        throw error;
      }
    }

    if (isBackendEntity(this.entityName)) {
      const payload = await apiClient.get(`${this.endpoint}${buildQueryString(filters, sortBy, limit)}`);
      return extractBackendList(this.entityName, payload);
    }

    await delay();
    return db.filter(this.entityName, filters, sortBy, limit);
  }

  async get(id) {
    if (this.entityName === 'PharmacySettings') {
      const [settings] = await this.list('', 1);
      return settings || null;
    }

    if (isBackendEntity(this.entityName)) {
      const payload = await apiClient.get(`${this.endpoint}/${id}`);
      if (this.entityName === 'Prescription') {
        return payload?.prescription || payload;
      }
      return payload;
    }

    await delay();
    return db.getById(this.entityName, id);
  }

  async create(data) {
    if (!data) {
      throw new Error('Dados obrigatorios');
    }

    if (this.entityName === 'Prescription' && data.file) {
      const { file, ...rest } = data;
      const payload = await apiClient.post(this.endpoint, {
        ...rest,
        file_content_base64: await fileToBase64(file),
        original_filename: file.name,
        mime_type: file.type,
      });
      persistSessionIfPresent(payload);
      return payload?.prescription || payload;
    }

    if (this.entityName === 'PharmacySettings') {
      const payload = await apiClient.post('/api/settings', data);
      return payload?.settings || payload;
    }

    if (isBackendEntity(this.entityName)) {
      const payload = await apiClient.post(this.endpoint, data);
      persistSessionIfPresent(payload);

      if (this.entityName === 'Order') return payload?.order || payload;
      if (this.entityName === 'Prescription') return payload?.prescription || payload;
      if (this.entityName === 'Customer') return payload?.customer || payload;
      return payload;
    }

    await delay();
    return db.create(this.entityName, data);
  }

  async update(id, data) {
    if (this.entityName === 'PharmacySettings') {
      const payload = await apiClient.put('/api/settings', data);
      return payload?.settings || payload;
    }

    if (isBackendEntity(this.entityName)) {
      const payload = await apiClient.put(`${this.endpoint}/${id}`, data);
      if (this.entityName === 'Order') return payload?.order || payload;
      if (this.entityName === 'Prescription') return payload?.prescription || payload;
      if (this.entityName === 'Customer') return payload?.customer || payload;
      return payload;
    }

    await delay();
    return db.update(this.entityName, id, data);
  }

  async delete(id) {
    if (this.entityName === 'PharmacySettings') {
      throw new Error('PharmacySettings nao pode ser removido');
    }

    if (isBackendEntity(this.entityName)) {
      return apiClient.delete(`${this.endpoint}/${id}`);
    }

    await delay();
    return db.delete(this.entityName, id);
  }

  async getFileBlob(id) {
    if (this.entityName !== 'Prescription') {
      throw new Error('Arquivo protegido disponivel apenas para receitas');
    }

    return apiClient.getBlob(`${this.endpoint}/${id}/file`);
  }

  async bulkCreate(items) {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return [];
    }

    if (this.entityName === 'Product') {
      const created = [];
      for (const item of items) {
        created.push(await this.create(item));
      }
      return created;
    }

    await delay();
    return items.map((item) => db.create(this.entityName, item));
  }
}

class AuthAPI {
  async me() {
    try {
      const payload = await apiClient.get('/api/auth/me');
      const user = payload?.user || null;

      if (user) {
        setStoredSession(
          payload?.session || {
            ...getStoredSession(),
            user,
            auth_mode: 'cookie',
          }
        );
      }

      return user;
    } catch (error) {
      if (error.status === 401) {
        clearStoredSession();
        return null;
      }

      throw error;
    }
  }

  async login(email, password) {
    const payload = await apiClient.post('/api/auth/login', { email, password });
    setStoredSession(
      payload?.session || {
        user: payload.user,
        expires_at: payload.expires_at,
        auth_mode: 'cookie',
      }
    );
    return payload.user;
  }

  async logout() {
    try {
      await apiClient.post('/api/auth/logout', {});
    } catch (error) {
      if (error.status !== 401) {
        console.error('Erro ao encerrar sessao:', error);
      }
    } finally {
      clearStoredSession();
    }

    return { success: true };
  }

  async signOut() {
    return this.logout();
  }

  async register(data) {
    const payload = await apiClient.post('/api/customers', {
      ...data,
      create_session: true,
    });

    persistSessionIfPresent(payload);
    return payload?.customer || null;
  }
}

class IntegrationsAPI {
  async UploadFile({ file }) {
    await delay(300);

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (file && cloudName && uploadPreset) {
      const { uploadToCloudinary } = await import('@/config/cloudinary');
      const result = await uploadToCloudinary(file, {
        folder: 'uploads',
        uploadPreset,
      });

      return {
        file_url: result.url,
        file_id: result.publicId,
      };
    }

    return {
      file_url: 'https://via.placeholder.com/400',
      file_id: `file_${Date.now()}`,
      error: 'Cloudinary nao configurado',
    };
  }

  async UploadPrivateFile({ file }) {
    await delay(300);

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (file && cloudName && uploadPreset) {
      const { uploadToCloudinary } = await import('@/config/cloudinary');
      const result = await uploadToCloudinary(file, {
        folder: 'private',
        uploadPreset,
      });

      return {
        file_url: result.url,
        file_id: result.publicId,
      };
    }

    return {
      file_url: 'https://via.placeholder.com/400',
      file_id: `file_${Date.now()}`,
      error: 'Cloudinary nao configurado',
    };
  }

  async ExtractDataFromUploadedFile() {
    await delay(150);

    return {
      status: 'manual_review_required',
      output: null,
      extracted_data: null,
      message: 'Extracao automatica nao esta habilitada. A revisao da receita e manual pelo admin.',
    };
  }

  async CreateFileSignedUrl({ file_id }) {
    await delay(200);
    return {
      signed_url: `https://example.com/files/${file_id}`,
      expires_at: new Date(Date.now() + 3600000).toISOString(),
    };
  }

  async InvokeLLM({ prompt, model = 'gpt-4o-mini' }) {
    await delay(200);
    return {
      response: `Resposta simulada para: ${prompt}`,
      model,
    };
  }

  async SendEmail({ to, subject, body }) {
    await delay(200);
    console.log('Email simulado enviado:', { to, subject, body });
    return {
      success: true,
      message_id: `msg_${Date.now()}`,
    };
  }

  async GenerateImage({ prompt, size = '512x512' }) {
    await delay(200);
    return {
      image_url: `https://via.placeholder.com/${size}?text=${encodeURIComponent(prompt)}`,
      image_id: `img_${Date.now()}`,
    };
  }
}

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
      ImportLog: new EntityAPI('ImportLog'),
    };

    this.auth = new AuthAPI();
    this.integrations = {
      Core: new IntegrationsAPI(),
    };
  }
}

export const localApi = new LocalAPIClient();
