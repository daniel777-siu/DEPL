// Generic API client centralizado en services
const API_BASE = '';

async function request(path, { method = 'GET', headers = {}, body, json = true } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: json ? { 'Content-Type': 'application/json', ...headers } : headers,
    credentials: 'include',
    body: body != null ? (json ? JSON.stringify(body) : body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch (_) { /* puede no haber cuerpo */ }
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  del: (path) => request(path, { method: 'DELETE' }),
};
