import { api } from './api.js';

export async function getProfiles() {
  return api.get('/users');
}
