import { api } from './api.js';

const CURRENT_USER_KEY = 'sf:currentUser';

export function setCurrentUser(user) {
  try { sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user || null)); } catch (_) {}
}

export function getCurrentUser() {
  try {
    const raw = sessionStorage.getItem(CURRENT_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) { return null; }
}

export async function login(email, password) {
  return api.post('/login', { email, password });
}

export async function me() {
  // Intentar endpoint /me si existe; si falla (404/500), usar sessionStorage
  try {
    const data = await api.get('/me');
    if (data && data.id) setCurrentUser(data);
    return data;
  } catch (err) {
    if (err && (err.status === 404 || err.status === 500)) {
      const local = getCurrentUser();
      if (local && local.id) return local;
    }
    throw err;
  }
}

export async function logout() {
  try { await api.post('/logout'); } finally { setCurrentUser(null); }
}

// Registro (solo admin) – se usa en profiles.js
export async function register(payload) {
  return api.post('/register', payload);
}
