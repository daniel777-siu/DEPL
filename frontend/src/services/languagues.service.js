import { api } from './api.js';

export async function listAllLanguagues() {
  try {
    const data = await api.get('/languagues');
    return Array.isArray(data) ? data : [];
  } catch (_) {
    return [];
  }
}

export async function listUserLanguagues(userId) {
  if (!userId) return [];
  try {
    const data = await api.get(`/languagues/${userId}`);
    return Array.isArray(data) ? data : [];
  } catch (_) {
    // Evitar romper la vista si el backend falla
    return [];
  }
}

export async function assignLanguague({ user_id, languague_id }) {
  return await api.post('/languagues', { user_id, languague_id });
}
