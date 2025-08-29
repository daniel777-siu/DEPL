import { qs, navigate } from '../../app/router.js';
import { me } from '../../services/auth.service.js';
import { updateUser } from '../../services/users.service.js';
import { showToast } from '../../app/toast.js';

export async function mountAccountEditPage() {
  const section = document.querySelector('#accountEditView');
  if (!section) return;
  let current;
  try {
    current = await me();
  } catch (_) {
    showToast('Debes iniciar sesión', { type: 'info' });
    await navigate('login');
    return;
  }
  // Precargar valores
  const name = qs('#editName', section);
  const phone = qs('#editPhone', section);
  const dispo = qs('#editDisponibility', section);
  const desc = qs('#editDescription', section);
  const email = qs('#editEmail', section);
  const role = qs('#editRole', section);
  // Solo lectura para reflejar perfil
  const cohort = qs('#editCohort', section);
  const place = qs('#editPlace', section);
  const schedule = qs('#editSchedule', section);
  const clan = qs('#editClan', section);
  const english = qs('#editEnglish', section);
  if (name) name.value = current.name || '';
  if (phone) phone.value = current.phone || '';
  if (dispo) dispo.value = current.disponibility || '';
  if (desc) desc.value = current.description || '';
  if (email) email.value = current.email || '';
  if (role) role.value = current.role || '';
  if (cohort) cohort.value = current.cohort || '';
  if (place) place.value = current.place || current.city || '';
  if (schedule) schedule.value = current.schedule || '';
  if (clan) clan.value = current.clan || '';
  if (english) english.value = current.english_level || current.english || '';

  // Guardar cambios
  const form = qs('#accountEditForm', section);
  if (form) {
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      // Solo enviar campos cambiados y válidos
      const payload = {};
      if (name && name.value.trim() !== (current.name || '')) payload.name = name.value.trim();
      if (email && email.value.trim() !== (current.email || '')) payload.email = email.value.trim();
      if (phone && phone.value.trim() !== (current.phone || '')) payload.phone = phone.value.trim();
      if (typeof dispo?.value === 'string' && dispo.value.trim() && dispo.value.trim() !== (current.disponibility || '')) {
        payload.disponibility = dispo.value.trim();
      }
      if (desc && (desc.value.trim() !== (current.description || ''))) payload.description = desc.value.trim();
      if (Object.keys(payload).length === 0) {
        showToast('No hay cambios para guardar', { type: 'info' });
        return;
      }
      const btn = form.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;
      try {
        // Avisar si campos extra fueron modificados (no se guardan)
        const extrasChanged = (
          (cohort && cohort.value.trim() !== (current.cohort || '')) ||
          (place && place.value.trim() !== (current.place || current.city || '')) ||
          (schedule && schedule.value.trim() !== (current.schedule || '')) ||
          (clan && clan.value.trim() !== (current.clan || '')) ||
          (english && english.value.trim() !== (current.english_level || current.english || ''))
        );
        if (extrasChanged) {
          showToast('Nota: cohorte, ciudad, horario, clan e inglés aún no se guardan desde aquí', { type: 'info' });
        }
        await updateUser(current.id, payload);
        showToast('Perfil actualizado', { type: 'success' });
        await navigate('account');
      } catch (e) {
        showToast(e.message || 'Error al actualizar', { type: 'error' });
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  }

  const back = qs('#accBackBtn', section);
  if (back) back.addEventListener('click', () => navigate('account'));

  // Cambio de contraseña (requiere contraseña actual según backend)
  const pwdForm = qs('#changePasswordForm', section);
  if (pwdForm) {
    pwdForm.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const curr = qs('#currPassword', section);
      const next = qs('#newPassword', section);
      const currVal = curr?.value?.trim() || '';
      const nextVal = next?.value?.trim() || '';
      if (!currVal || !nextVal) {
        showToast('Ingresa tu contraseña actual y la nueva', { type: 'warning' });
        return;
      }
      const btn = pwdForm.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;
      try {
        await import('../../services/users.service.js').then(m => m.changePassword(current.id, { password: currVal, newPassword: nextVal }));
        showToast('Contraseña actualizada', { type: 'success' });
        if (curr) curr.value = '';
        if (next) next.value = '';
      } catch (e) {
        showToast(e.message || 'Error al cambiar contraseña', { type: 'error' });
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  }
}
