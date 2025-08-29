import { loadPartial, qs, navigate } from '../../app/router.js';
import { me } from '../../services/auth.service.js';
import { getUser } from '../../services/users.service.js';
import { listPlaces, listClans } from '../../services/general.service.js';
import { listAllLanguagues, listUserLanguagues, assignLanguague } from '../../services/languagues.service.js';
import { showToast } from '../../app/toast.js';

export async function mountAccountPage() {
  const root = document.querySelector('[data-route="account"]') || document.getElementById('accountViewRoot');
  const container = root || document.getElementById('viewRoot');
  const section = container?.querySelector('#accountView');
  if (!section) return;

  // Cargar datos del usuario
  let current;
  try {
    current = await me();
  } catch (_) {
    showToast('Debes iniciar sesión', { type: 'info' });
    await navigate('login');
    return;
  }

  // Intentar completar con datos completos del usuario desde /users/:id
  let full = {};
  try {
    const res = await getUser(current.id);
    full = Array.isArray(res) ? (res[0] || {}) : (res || {});
  } catch (_) { /* no-op, usamos lo que tengamos */ }

  // Mezclar datos (priorizar completos si existen)
  const merged = { ...current, ...full };

  // Pintar datos básicos
  const emailEl = qs('#accEmail', section);
  const roleEl = qs('#accRole', section);
  if (emailEl) emailEl.textContent = merged.email || '';
  if (roleEl) roleEl.textContent = merged.role || '';

  // Encabezado (avatar)
  const emailHeader = qs('#accEmailHeader', section);
  const roleHeader = qs('#accRoleHeader', section);
  if (emailHeader) emailHeader.textContent = current.email || '';
  if (roleHeader) roleHeader.textContent = current.role || '';

  // Campos adicionales del perfil
  const setText = (id, value) => {
    const el = qs(id, section);
    if (el) el.textContent = (value ?? '—').toString();
  };
  setText('#accName', merged.name || merged.fullname || '—');
  setText('#accCohort', merged.cohort || '—');
  setText('#accPhone', merged.phone || '—');
  setText('#accPlace', merged.place || merged.city || '—');
  setText('#accDisponibility', merged.disponibility || merged.availability || '—');
  setText('#accSchedule', merged.schedule || '—');
  setText('#accClan', merged.clan || '—');
  setText('#accEnglish', merged.english_level || merged.english || '—');
  setText('#accDescription', merged.description || '—');

  // Resolver place_id y clan_id a nombres si es posible (sin modificar backend)
  try {
    const [places, clans] = await Promise.all([
      (!merged.place && merged.place_id) ? listPlaces() : Promise.resolve(null),
      (!merged.clan && merged.clan_id) ? listClans() : Promise.resolve(null),
    ]);
    if (Array.isArray(places) && merged.place_id) {
      const p = places.find(x => String(x.id) === String(merged.place_id));
      if (p && p.city) setText('#accPlace', p.city);
    }
    if (Array.isArray(clans) && merged.clan_id) {
      const c = clans.find(x => String(x.id) === String(merged.clan_id));
      if (c && (c.clan_name || c.name)) setText('#accClan', c.clan_name || c.name);
    }
  } catch (_) { /* silencioso */ }

  // Cargar lenguajes
  const selectAll = qs('#langSelect', section);
  const listUser = qs('#userLangList', section);
  const checklist = qs('#langChecklist', section);
  // helper para obtener etiqueta de lenguaje de forma robusta
  const langLabel = (obj) => {
    const cand = obj?.languague ?? obj?.language ?? obj?.name ?? obj?.label ?? obj?.title;
    const s = (cand == null ? '' : String(cand)).trim();
    return s || `Sin nombre (id ${obj?.id ?? '?'})`;
  };

  try {
    const [all, userLs] = await Promise.all([
      listAllLanguagues(),
      listUserLanguagues(merged.id || current.id),
    ]);
    if (Array.isArray(all) && selectAll) {
      selectAll.innerHTML = '<option value="" disabled selected>Selecciona un lenguaje...</option>' +
        all.map(l => `<option value="${l.id}">${l.languague || l.language || l.name}</option>`).join('');
    }
    if (Array.isArray(all) && checklist) {
      if (!all.length) {
        checklist.innerHTML = '<div class="muted" style="grid-column:1/-1;">No hay lenguajes disponibles.</div>';
      } else {
        // El backend de userLanguagues devuelve: u.id, u.name, l.languague (NO el id del lenguaje)
        // Por eso comparamos por nombre de lenguaje normalizado.
        const assignedNames = new Set((Array.isArray(userLs) ? userLs : [])
          .map(ul => langLabel(ul).toString().trim().toLowerCase())
          .filter(Boolean));
        checklist.innerHTML = all.map(l => {
          const label = langLabel(l);
          const id = Number(l.id);
          const isAssigned = assignedNames.has(String(label || '').trim().toLowerCase());
          const checked = isAssigned ? 'checked' : '';
          const disabled = isAssigned ? 'disabled' : '';
          return `<label style="display:flex;align-items:center;gap:8px;background:#0f142e;border:1px solid #2d3349;border-radius:8px;padding:8px;opacity:${disabled ? '0.7' : '1'};color:#e5e7eb;" title="${encodeURIComponent(JSON.stringify(l))}">
              <input type="checkbox" value="${id}" ${checked} ${disabled} />
              <span>${label}</span>
            </label>`;
        }).join('');
      }
    }
    if (Array.isArray(userLs) && listUser) {
      listUser.innerHTML = userLs.length
        ? userLs.map(ul => `<li><span class="chip" style="display:inline-block;background:#171E4A;color:#fff;border:1px solid #2d3349;border-radius:999px;padding:4px 10px;font-size:.85rem;">${langLabel(ul)}</span></li>`).join('')
        : '<li class="muted">Aún no tienes lenguajes asignados.</li>';
    }
  } catch (e) {
    console.error(e);
    if (listUser) listUser.innerHTML = '<li class="error">No se pudieron cargar lenguajes.</li>';
  }

  // Asignar lenguaje
  const form = qs('#assignLangForm', section);
  if (form) {
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const languague_id = selectAll?.value;
      if (!languague_id) {
        showToast('Selecciona un lenguaje', { type: 'warning' });
        return;
      }
      // evitar duplicados
      try {
        const currentLs = await listUserLanguagues(merged.id || current.id);
        const exists = (currentLs || []).some(ul => String(ul.id || ul.languague_id || ul.language_id) === String(languague_id));
        if (exists) {
          showToast('Ese lenguaje ya está asignado', { type: 'info' });
          return;
        }
      } catch(_) {}
      const btn = form.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;
      try {
        await assignLanguague({ user_id: merged.id || current.id, languague_id: Number(languague_id) });
        showToast('Lenguaje asignado', { type: 'success' });
        // refrescar lista del usuario
        const userLs = await listUserLanguagues(merged.id || current.id);
        if (Array.isArray(userLs) && listUser) {
          listUser.innerHTML = userLs.length
            ? userLs.map(ul => `<li><span class=\"chip\" style=\"display:inline-block;background:#171E4A;color:#fff;border:1px solid #2d3349;border-radius:999px;padding:4px 10px;font-size:.85rem;\">${langLabel(ul)}</span></li>`).join('')
            : '<li class="muted">Aún no tienes lenguajes asignados.</li>';
        }
      } catch (e) {
        showToast(e.message || 'Error al asignar lenguaje', { type: 'error' });
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  }

  // Asignación múltiple de lenguajes
  const bulkForm = qs('#bulkAssignLangForm', section);
  if (bulkForm) {
    bulkForm.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const inputs = checklist ? Array.from(checklist.querySelectorAll('input[type="checkbox"]')) : [];
      const selected = inputs.filter(i => i.checked && !i.disabled).map(i => Number(i.value));
      if (!selected.length) {
        showToast('Selecciona al menos un lenguaje', { type: 'warning' });
        return;
      }
      const btn = bulkForm.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;
      try {
        await Promise.all(selected.map(id => assignLanguague({ user_id: current.id, languague_id: id })));
        showToast('Lenguajes asignados', { type: 'success' });
        // refrescar lista del usuario
        const userLs = await listUserLanguagues(current.id);
        if (Array.isArray(userLs) && listUser) {
          listUser.innerHTML = userLs.length
            ? userLs.map(ul => `<li><span class=\"chip\" style=\"display:inline-block;background:#171E4A;color:#fff;border:1px solid #2d3349;border-radius:999px;padding:4px 10px;font-size:.85rem;\">${ul.languague || ul.language || ul.name}</span></li>`).join('')
            : '<li class="muted">Aún no tienes lenguajes asignados.</li>';
        }
        // bloquear los ya asignados (comparando por nombre)
        const assignedNames = new Set((userLs || [])
          .map(ul => langLabel(ul).toString().trim().toLowerCase())
          .filter(Boolean));
        if (checklist) Array.from(checklist.querySelectorAll('label')).forEach((labelEl) => {
          const nameEl = labelEl.querySelector('span');
          const input = labelEl.querySelector('input[type="checkbox"]');
          const labelName = (nameEl?.textContent || '').trim().toLowerCase();
          if (assignedNames.has(labelName) && input) {
            input.checked = true;
            input.disabled = true;
            labelEl.style.opacity = '0.7';
          }
        });
      } catch (e) {
        showToast(e.message || 'Error al asignar lenguajes', { type: 'error' });
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  }

  // Navegar a editar perfil
  const editBtn = qs('#accEditBtn', section);
  if (editBtn) {
    editBtn.addEventListener('click', async () => {
      await navigate('account-edit');
    });
  }

  // Si es admin, permitir editar campos extendidos desde su propio perfil
  if (current?.role === 'admin') {
    const footer = section.querySelector('.card-footer');
    if (footer) {
      // Evitar duplicados si la vista se monta varias veces
      let adminBtn = footer.querySelector('[data-admin-edit-btn="true"]');
      if (!adminBtn) {
        adminBtn = document.createElement('a');
        adminBtn.setAttribute('data-admin-edit-btn', 'true');
        adminBtn.href = 'javascript:void(0)';
        adminBtn.textContent = 'Editar (admin)';
        adminBtn.setAttribute('role', 'button');
        // estilo más bonito y consistente con la paleta
        adminBtn.className = '';
        adminBtn.style.cssText = 'margin-left:8px;background:#171E4A;color:#fff;border:none;border-radius:8px;padding:10px 14px;text-decoration:none;box-shadow:0 4px 10px rgba(23,30,74,0.25);font-weight:600;';
        adminBtn.addEventListener('click', () => {
          try { sessionStorage.setItem('adminEditUserId', String(current.id || current._id)); } catch(_) {}
          navigate('profiles-edit-admin');
        });
        footer.appendChild(adminBtn);
      }
    }
  }
}
