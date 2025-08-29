import { api } from './api.js';

export async function listPlaces() {
  try {
    const { data } = await api.get('/general/places');
    return Array.isArray(data) ? data : [];
  } catch (_) {
    return [];
  }
}

export async function listClans() {
  try {
    const { data } = await api.get('/general/clans');
    return Array.isArray(data) ? data : [];
  } catch (_) {
    return [];
  }
}
