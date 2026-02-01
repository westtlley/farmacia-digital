// API local que substitui o base44
import { db } from './localStorage';

// Simular delay de rede
const delay = (ms = 100) => new Promise(resolve => setTimeout(resolve, ms));

// Entidades
class EntityAPI {
  constructor(entityName) {
    this.entityName = entityName;
  }

  async list(sortBy = '', limit = null) {
    await delay();
    return db.filter(this.entityName, {}, sortBy, limit);
  }

  async filter(filters = {}, sortBy = '', limit = null) {
    await delay();
    return db.filter(this.entityName, filters, sortBy, limit);
  }

  async get(id) {
    await delay();
    return db.getById(this.entityName, id);
  }

  async create(data) {
    await delay();
    return db.create(this.entityName, data);
  }

  async update(id, data) {
    await delay();
    return db.update(this.entityName, id, data);
  }

  async delete(id) {
    await delay();
    return db.delete(this.entityName, id);
  }

  async bulkCreate(items) {
    await delay(300);
    return db.bulkCreate(this.entityName, items);
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
    // Simular upload - retorna uma URL local
    return {
      file_url: file ? URL.createObjectURL(file) : 'https://via.placeholder.com/400',
      file_id: `file_${Date.now()}`
    };
  }

  async UploadPrivateFile({ file }) {
    await delay(1000);
    return {
      file_url: file ? URL.createObjectURL(file) : 'https://via.placeholder.com/400',
      file_id: `file_${Date.now()}`
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
