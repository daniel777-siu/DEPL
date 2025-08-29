import { createTeam, invalidateTeams } from '../services/teams.service.js';
import { navigate, qs } from '../app/router.js';
import { showToast } from '../app/toast.js';
import { me } from '../services/auth.service.js';

export async function mountCreateTeamPage() {
  const root = document.querySelector('#createTeamView');
  if (!root) return;

  const form = qs('#createTeamForm', root);
  if (!form) return;
  // Evitar registrar múltiples listeners si la vista se volviera a montar
  if (form.dataset.bound === '1') return;
  form.dataset.bound = '1';

  // Verificar sesión al montar la vista
  let currentUserId = null;
  try {
    const session = await me();
    currentUserId = session?.id ?? null;
  } catch (e) {
    showToast('Debes iniciar sesión para crear un equipo', { type: 'info' });
    await navigate('login');
    return;
  }

  let creating = false;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (creating) return; // bloquear envíos concurrentes
    const data = Object.fromEntries(new FormData(form).entries());
    data.team_name = (data.team_name || '').toString().trim();
    data.description = (data.description || '').toString().trim();
    if (!data.team_name) {
      showToast('El nombre del equipo es obligatorio', { type: 'warning' });
      return;
    }
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    creating = true;
    try {
      if (!currentUserId) throw new Error('Sesión inválida. Inicia sesión de nuevo.');
      await createTeam({ team_name: data.team_name, description: data.description || '', user_id: currentUserId });
      invalidateTeams();
      showToast('Equipo creado correctamente', { type: 'success' });
      await navigate('teams');
    } catch (err) {
      showToast(err?.message || 'Error al crear equipo', { type: 'error' });
    } finally {
      creating = false;
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}
