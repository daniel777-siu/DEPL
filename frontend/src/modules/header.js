import { me, logout } from '../services/auth.service.js';

export async function bindHeader() {
  const emailEl = document.getElementById('currentUserEmail');
  const roleEl = document.getElementById('currentUserRole');
  const logoutBtn = document.getElementById('logoutBtn');
  try {
    const user = await me().catch(() => null);
    if (emailEl) emailEl.textContent = user?.email ? user.email : '';
    if (roleEl) roleEl.textContent = user?.role ? user.role : '';
  } catch (_) {
    if (emailEl) emailEl.textContent = '';
    if (roleEl) roleEl.textContent = '';
  }
  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      try {
        await logout();
      } finally {
        // Force a clean reload back to login
        location.href = location.pathname;
      }
    };
  }
}
