import { api } from './api.js';
import bcrypt from 'bcryptjs';

let __usersCache = { data: null, ts: 0 };
const DEFAULT_TTL = 30000; // 30s
const __userTeamsCache = new Map(); // userId -> { data, ts, inFlight }

// Actualización extendida (admin) de usuario: cohorte, ciudad, horario, clan, inglés, etc.
export async function updateUserAdmin(id, data) {
  // El backend resolverá place_id y clan_id a partir de los nombres incluidos en data
  // Campos útiles: name, cohort, email, phone, place, disponibility, schedule, role, clan, description, english_level
  return api.put(`/users/admin/${id}`, data);
}

export async function getUsers({ force = false, ttlMs = DEFAULT_TTL } = {}) {
  const now = Date.now();
  const fresh = __usersCache.data && (now - __usersCache.ts) < ttlMs;
  if (!force && fresh) return __usersCache.data;
  const data = await api.get('/users');
  __usersCache = { data, ts: now };
  return data;
}

export function invalidateUsers() {
  __usersCache = { data: null, ts: 0 };
}

export function isUsersCacheFresh(ttlMs = DEFAULT_TTL) {
  const now = Date.now();
  return Boolean(__usersCache.data) && (now - __usersCache.ts) < ttlMs;
}

export async function getUser(id) {
  return api.get(`/users/${id}`);
}

export async function deleteUser(id) {
  return api.del(`/users/${id}`);
}

export async function updateUser(id, data) {
  // Backend espera: name, email, phone, disponibility, description
  return api.put(`/users/${id}`, data);
}

export async function changePassword(id, { password, newPassword }) {
  // El backend guarda directamente el valor recibido; debemos enviar la nueva contraseña ya hasheada
  const salt = await bcrypt.genSalt(15);
  const hashed = await bcrypt.hash(newPassword, salt);
  return api.put(`/users/password/${id}`, { password, newPassword: hashed });
}

// Registro de usuarios (solo admin)
export async function registerUser(data) {
  // POST /register espera, además de email/password/role, campos usados por el backend:
  // name, cohort, phone, place (ciudad), disponibility, schedule, clan (nombre), description, english_level
  // El backend resolverá place_id y clan_id y encriptará password.
  return api.post('/register', data);
}

// Equipos por usuario con caché + deduplicación
export async function getUserTeams(userId, { ttlMs = DEFAULT_TTL } = {}) {
  if (!userId) throw new Error('userId requerido');
  const key = String(userId);
  const now = Date.now();
  let entry = __userTeamsCache.get(key);
  if (entry && entry.data && (now - entry.ts) < ttlMs) return entry.data;
  if (entry && entry.inFlight) return entry.inFlight;
  // iniciar request
  const p = api.get(`/users/teams/${key}`).then((data) => {
    __userTeamsCache.set(key, { data, ts: Date.now(), inFlight: null });
    return data;
  }).catch((e) => {
    // limpiar inFlight en error pero mantener estructura
    __userTeamsCache.set(key, { data: (entry && entry.data) || null, ts: entry?.ts || 0, inFlight: null });
    throw e;
  });
  __userTeamsCache.set(key, { data: entry?.data || null, ts: entry?.ts || 0, inFlight: p });
  return p;
}
