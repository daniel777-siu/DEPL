import { getUsers, invalidateUsers, registerUser } from '../services/users.service.js';
import { navigate, qs } from '../app/router.js';
import { showToast } from '../app/toast.js';

export async function mountCreateUserPage() {
  const root = document.querySelector('#createUserView');
  if (!root) return; // vista no presente

  const form = qs('#createUserForm', root);
  const dlCities = qs('#datalistCities', root);
  const dlClans = qs('#datalistClans', root);
  const clanSelect = qs('select[name="clan"]', root);

  // Catálogo de clanes según BD
  const CLANS = ['lovelace','administracion','Hoper','Linus','Ghostling'];

  // Prefill datalists desde usuarios existentes (no hay endpoints de catálogo)
  try {
    const users = await getUsers().catch(() => []);
    const cities = new Set();
    const clans = new Set();
    for (const u of Array.isArray(users) ? users : []) {
      const city = (u.place || u.city || u.city_name || u.location || '').toString().trim();
      const clan = (u.clan || u.clan_name || '').toString().trim();
      if (city) cities.add(city);
      if (clan) clans.add(clan);
    }
    if (dlCities) dlCities.innerHTML = Array.from(cities).map(c => `<option value="${c}"></option>`).join('');
    if (dlClans) dlClans.innerHTML = Array.from(clans).map(c => `<option value="${c}"></option>`).join('');
    if (clanSelect) {
      const options = CLANS
        .map(c => `<option value="${c}">${c}</option>`)
        .join('');
      // preserva el placeholder existente
      clanSelect.insertAdjacentHTML('beforeend', options);
    }
  } catch (e) {
    // silencioso: el usuario podrá escribir manualmente
    console.warn('[create-user] datalists no disponibles', e);
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      try {
        await registerUser(data);
        invalidateUsers();
        showToast('Usuario creado correctamente', { type: 'success' });
        await navigate('profiles');
      } catch (err) {
        showToast(err?.message || 'Error al crear usuario', { type: 'error' });
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }
}
