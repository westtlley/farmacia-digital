import { clearStoredSession, getStoredToken } from '@/api/session';

export const API_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:10000';

async function request(method, endpoint, data, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const token = getStoredToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: data !== undefined ? JSON.stringify(data) : undefined,
    credentials: 'include',
    ...options,
  });

  if (response.status === 401) {
    clearStoredSession();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
  }

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload?.error
        ? payload.error
        : `API Error: ${response.status} ${response.statusText}`;

    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

async function requestBlob(endpoint, options = {}) {
  const headers = {
    ...options.headers,
  };

  const token = getStoredToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'GET',
    headers,
    credentials: 'include',
    ...options,
  });

  if (response.status === 401) {
    clearStoredSession();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
  }

  if (!response.ok) {
    const payload = await response.text();
    const error = new Error(payload || `API Error: ${response.status} ${response.statusText}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return response.blob();
}

export const apiClient = {
  get(endpoint, options = {}) {
    return request('GET', endpoint, undefined, options);
  },
  post(endpoint, data, options = {}) {
    return request('POST', endpoint, data, options);
  },
  put(endpoint, data, options = {}) {
    return request('PUT', endpoint, data, options);
  },
  delete(endpoint, options = {}) {
    return request('DELETE', endpoint, undefined, options);
  },
  getBlob(endpoint, options = {}) {
    return requestBlob(endpoint, options);
  },
};

export default apiClient;
