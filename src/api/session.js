const SESSION_STORAGE_KEY = 'farmacia_auth_session';

function normalizeSession(session) {
  if (!session || typeof session !== 'object') {
    return null;
  }

  const legacyToken =
    (typeof session.legacy_token === 'string' && session.legacy_token.trim()) ||
    (typeof session.token === 'string' && session.token.trim()) ||
    null;

  return {
    user: session.user || null,
    expires_at: session.expires_at || session.expiresAt || null,
    auth_mode: session.auth_mode || (legacyToken ? 'legacy_bearer' : 'cookie'),
    ...(legacyToken ? { legacy_token: legacyToken } : {}),
  };
}

export function getStoredSession() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? normalizeSession(JSON.parse(raw)) : null;
  } catch (error) {
    console.error('Erro ao ler sessao armazenada:', error);
    return null;
  }
}

export function setStoredSession(session) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!session) {
    clearStoredSession();
    return;
  }

  const normalized = normalizeSession(session);
  if (!normalized) {
    clearStoredSession();
    return;
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(normalized));
}

export function clearStoredSession() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

export function getStoredToken() {
  return getStoredSession()?.legacy_token || null;
}

export function getStoredUser() {
  return getStoredSession()?.user || null;
}
