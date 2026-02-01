/**
 * Configuração da API Backend
 * URL da API no Render
 */

// URL da API Backend (Render)
// Em produção, será definida via variável de ambiente no Vercel
// Suporta tanto VITE_API_URL quanto VITE_API_BASE_URL
export const API_URL = import.meta.env.VITE_API_URL || 
                       import.meta.env.VITE_API_BASE_URL || 
                       'http://localhost:10000';

// Log para debug
if (typeof window !== 'undefined') {
  console.log('🔍 API Config:', {
    VITE_API_URL: import.meta.env.VITE_API_URL,
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    API_URL_FINAL: API_URL,
    willUseBackend: API_URL && !API_URL.includes('localhost')
  });
}

/**
 * Cliente HTTP para chamadas à API
 */
export const apiClient = {
  /**
   * GET request
   */
  async get(endpoint, options = {}) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  },
  
  /**
   * POST request
   */
  async post(endpoint, data, options = {}) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: JSON.stringify(data),
      ...options,
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  },
  
  /**
   * PUT request
   */
  async put(endpoint, data, options = {}) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: JSON.stringify(data),
      ...options,
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  },
  
  /**
   * DELETE request
   */
  async delete(endpoint, options = {}) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  },
};

export default apiClient;
