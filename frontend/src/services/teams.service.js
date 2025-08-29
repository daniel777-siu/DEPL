import { api } from './api.js';

let __teamsCache = { data: null, ts: 0 };
const DEFAULT_TTL = 30000; // 30s
const USERS_TTL = 30000; // 30s
const __teamUsersCache = new Map(); // teamId -> { data, ts, inFlight }

export async function getTeams({ force = false, ttlMs = DEFAULT_TTL } = {}) {
  const now = Date.now();
  const fresh = __teamsCache.data && (now - __teamsCache.ts) < ttlMs;
  if (!force && fresh) return __teamsCache.data;
  const data = await api.get('/teams');
  __teamsCache = { data, ts: now };
  return data;
}

export function invalidateTeams() {
  __teamsCache = { data: null, ts: 0 };
}

export function isTeamsCacheFresh(ttlMs = DEFAULT_TTL) {
  const now = Date.now();
  return Boolean(__teamsCache.data) && (now - __teamsCache.ts) < ttlMs;
}

export async function createTeam(data) {
  // POST /teams (requiere autenticación; control de permisos en backend)
  return api.post('/teams', data);
}

export async function deleteTeam(id) {
  return api.del(`/teams/${id}`);
}

// NUEVOS ENDPOINTS
export async function getTeam(id) {
  return api.get(`/teams/${id}`);
}

export async function getTeamUsers(id, { ttlMs = USERS_TTL } = {}) {
  // Cache con TTL + deduplicación de requests concurrentes
  const rec = __teamUsersCache.get(id) || { data: null, ts: 0, inFlight: null };
  const now = Date.now();
  const fresh = rec.data && (now - rec.ts) < ttlMs;
  if (fresh) return rec.data;
  if (rec.inFlight) return rec.inFlight;

  const promise = api.get(`/teams/users/${id}`).then((data) => {
    __teamUsersCache.set(id, { data, ts: Date.now(), inFlight: null });
    return data;
  }).finally(() => {
    const cur = __teamUsersCache.get(id);
    if (cur && cur.inFlight) {
      __teamUsersCache.set(id, { data: cur.data, ts: cur.ts, inFlight: null });
    }
  });
  __teamUsersCache.set(id, { data: rec.data, ts: rec.ts, inFlight: promise });
  return promise;
}

export async function joinTeam({ team_id, user_id, team_role = 'member' }) {
  return api.post('/teams/join', { team_id, user_id, team_role });
}

export async function updateTeam(id, data) {
  // data: { team_name, description }
  return api.put(`/teams/${id}`, data);
}
