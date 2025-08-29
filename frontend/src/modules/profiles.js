import { me } from '../services/auth.service.js';
import { getUsers, deleteUser, registerUser, invalidateUsers, isUsersCacheFresh, getUserTeams, updateUserAdmin } from '../services/users.service.js';
import { listUserLanguagues } from '../services/languagues.service.js';
import { navigate } from '../app/router.js';

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'class') node.className = v;
    else if (k === 'style') node.setAttribute('style', v);
    else node.setAttribute(k, v);
  });
  children.forEach((c) => node.append(c));
  return node;
}

async function bindActions(isAdmin) {
  const actions = document.querySelector('#profilesView .profiles-actions');
  if (!actions) return;
  actions.innerHTML = '';
  // Botón Refrescar (visible para todos)
  const refreshBtn = el('button', { type: 'button', style: 'background:#e5e7eb;color:#111827;border:none;border-radius:8px;padding:8px 12px;cursor:pointer;margin-right:8px;' }, ['Refrescar']);
  refreshBtn.addEventListener('click', async () => {
    invalidateUsers();
    await loadAndRenderProfiles(true);
  });
  actions.append(refreshBtn);

  if (!isAdmin) return; // solo admin ve acciones de gestión
  const addBtn = el('button', { type: 'button', style: 'background:#171E4A;color:#fff;border:none;border-radius:8px;padding:8px 12px;cursor:pointer;' }, ['Añadir usuario']);
  addBtn.addEventListener('click', async () => {
    const { navigate } = await import('../app/router.js');
    navigate('profiles-new');
  });
  actions.append(addBtn);
}

// Deprecated: openCreateUserModal removido. Ahora se usa navegación a la ruta 'profiles-new'.

export async function loadAndRenderProfiles(force = false) {
  const grid = document.getElementById('profilesGrid');
  if (!grid) return;
  // Asegurar clase de grid estilada
  grid.classList.add('perfiles');
  const fresh = isUsersCacheFresh();
  if (force || !fresh) {
    grid.innerHTML = '<div class="muted" style="grid-column:1/-1;color:#6b7280;">Cargando perfiles…</div>';
  }
  try {
    const current = await me().catch(() => null);
    const isAdmin = current?.role === 'admin';
    const currentId = current?.id || current?._id;
    await bindActions(isAdmin);
    const users = await getUsers({ force });
    if (!Array.isArray(users) || users.length === 0) {
      grid.innerHTML = '<div class="muted" style="grid-column:1/-1;color:#6b7280;">No hay perfiles disponibles.</div>';
      return;
    }
    grid.innerHTML = '';
    users.forEach((u) => {
      // Identificador desde el inicio (lo usamos para obtener fallback de nombres)
      const userId = u.id || u._id;
      const name = u.name || u.fullname || u.username || `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Usuario';
      const email = u.email || '';
      const cohort = u.cohort || '—';
      const phone = u.phone || '—';
      // Fallback de nombres guardados localmente si el backend solo trae IDs
      let map = null;
      try { const all = JSON.parse(localStorage.getItem('users:textMeta') || '{}'); map = all && userId ? all[String(userId)] : null; } catch(_) {}
      const city = u.place || u.city || (map && map.place) || '—';
      const dispo = u.disponibility || u.availability || '—';
      const schedule = u.schedule || '—';
      const role = u.role || '—';
      const clan = u.clan || (map && map.clan) || '—';
      const english = u.english_level || u.english || '—';
      const desc = u.description || '—';

      // Tarjeta con estética del sitio (layout de columna para fijar barra de acciones abajo)
      const card = el('article', { class: 'perfil', 'data-user-id': String(userId || ''), style: 'display:flex;flex-direction:column;justify-content:space-between;' });
      const foto = el('div', { class: 'foto' });
      const avatar = el('div', { class: 'avatar-icon' });
      // Ícono anónimo SVG (consistente con estilos)
      avatar.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 12c2.761 0 5-2.686 5-6s-2.239-6-5-6-5 2.686-5 6 2.239 6 5 6zm0 2c-4.418 0-8 2.91-8 6.5V22h16v-1.5c0-3.59-3.582-6.5-8-6.5z"/></svg>';
      foto.append(avatar);

      const info = el('div', { class: 'info' });
      info.append(
        el('h3', {}, [name]),
        el('p', {}, [email])
      );
      // Mostrar pill de clan justo bajo el nombre si existe
      if (clan && clan !== '—') {
        const clanPill = el('span', { class: 'clan-pill', style: 'display:inline-flex;align-items:center;gap:6px;background:#171E4A;color:#fff;border-radius:999px;padding:4px 10px;margin-top:6px;font-size:12px;' }, [
          clan
        ]);
        info.append(clanPill);
      }

      // Bloque de metadatos
      const meta = el('div', { class: 'perfil-meta', style: 'padding:6px 12px 10px;' });
      const items = [
        ['Cohorte', cohort],
        ['Teléfono', phone],
        ['Ciudad', city],
        ['Disponibilidad', dispo],
        ['Horario', schedule],
        ['Rol', role],
        ['Clan', clan],
        ['Inglés', english],
      ];
      const ul = el('ul', { style: 'list-style:none;padding:0;margin:8px 0 0;display:grid;grid-template-columns:1fr 1fr;gap:6px 10px;' });
      items.forEach(([label, value]) => {
        const li = el('li', { class: 'muted', style: 'font-size:12px;color:#6b7280;' });
        li.append(`${label}: `, el('strong', { style: 'color:#111827;font-weight:600;font-size:12px;' }, [String(value)]));
        ul.append(li);
      });
      const descEl = el('p', { class: 'muted', style: 'margin:8px 0 0;font-size:12px;color:#6b7280;white-space:pre-wrap;' }, [desc]);
      // Contenedor de lenguajes (se carga asíncrono)
      const langsBox = el('div', { class: 'perfil-langs', style: 'margin:10px 0 0;padding-top:6px;border-top:1px solid #e5e7eb;' });
      const langsTitle = el('div', { class: 'muted', style: 'font-size:12px;color:#6b7280;margin-bottom:6px;' }, ['Lenguajes']);
      const langsList = el('div', { class: 'langs-list', style: 'display:flex;flex-wrap:wrap;gap:6px;' });
      langsList.append(el('span', { class: 'muted', style: 'font-size:12px;color:#9ca3af;' }, ['Cargando…']));
      langsBox.append(langsTitle, langsList);
      // Contenedor de equipos (se carga asíncrono)
      const teamsBox = el('div', { class: 'perfil-teams', style: 'margin:10px 0 0;padding-top:6px;border-top:1px solid #e5e7eb;' });
      const teamsTitle = el('div', { class: 'muted', style: 'font-size:12px;color:#6b7280;margin-bottom:6px;' }, ['Equipos']);
      const teamsList = el('div', { class: 'teams-list', style: 'display:flex;flex-wrap:wrap;gap:6px;' });
      // Placeholder inicial para evitar parpadeo
      const placeholder = el('span', { class: 'muted', style: 'font-size:12px;color:#9ca3af;' }, ['Cargando…']);
      teamsList.append(placeholder);
      teamsBox.append(teamsTitle, teamsList);
      meta.append(ul, descEl, langsBox, teamsBox);

      card.append(foto, info, meta);
      if (isAdmin) {
        const adminBar = el('div', { style: 'margin-top:auto;display:flex;gap:8px;align-items:center;justify-content:flex-end;padding-top:8px;' });
        const editBtn = el('button', { type: 'button', style: 'align-self:center;background:#171E4A;color:#fff;border:none;border-radius:6px;padding:6px 10px;cursor:pointer;' }, ['Editar (admin)']);
        editBtn.addEventListener('click', () => {
          const uid = u.id || u._id;
          if (!uid) return;
          try { sessionStorage.setItem('adminEditUserId', String(uid)); } catch(_) {}
          navigate('profiles-edit-admin');
        });
        adminBar.append(editBtn);
        const delBtn = el('button', { type: 'button', style: 'align-self:center;background:#ef4444;color:#fff;border:none;border-radius:6px;padding:6px 10px;cursor:pointer;' }, ['Eliminar']);
        delBtn.addEventListener('click', async () => {
          // Proteger autoeliminación
          const targetId = u.id || u._id;
          if (currentId && targetId && String(targetId) === String(currentId)) {
            alert('No puedes eliminar tu propio usuario.');
            return;
          }
          if (!confirm(`Eliminar usuario ${email}?`)) return;
          try {
            await deleteUser(targetId);
            invalidateUsers();
            card.remove();
          } catch (e) {
            alert(`Error al eliminar: ${e.message}`);
          }
        });
        adminBar.append(delBtn);
        card.append(adminBar);
      }
      grid.append(card);

      // Cargar lenguajes del usuario de forma no bloqueante
      if (userId) {
        listUserLanguagues(userId).then((langs) => {
          langsList.innerHTML = '';
          if (!Array.isArray(langs) || langs.length === 0) {
            langsList.append(el('span', { class: 'muted', style: 'font-size:12px;color:#9ca3af;' }, ['Sin lenguajes']))
            return;
          }
          langs.forEach((lg) => {
            const label = (lg?.languague || lg?.language || lg?.name || '').toString().trim();
            if (!label) return;
            const chip = el('span', { class: 'lang-chip', style: 'background:#171E4A;color:#fff;border-radius:999px;padding:4px 8px;font-size:12px;display:inline-flex;align-items:center;' }, [label]);
            langsList.append(chip);
          });
        }).catch(() => {
          langsList.innerHTML = '';
          langsList.append(el('span', { class: 'muted', style: 'font-size:12px;color:#ef4444;' }, ['Error al cargar lenguajes']))
        });
      }

      // Cargar equipos del usuario de forma no bloqueante
      if (userId) {
        getUserTeams(userId).then((teams) => {
          teamsList.innerHTML = '';
          if (!Array.isArray(teams) || teams.length === 0) {
            teamsList.append(el('span', { class: 'muted', style: 'font-size:12px;color:#9ca3af;' }, ['Sin equipos']));
            return;
          }
          teams.forEach((t) => {
            const name = t.project_name || t.team_name || 'Equipo';
            const pill = el('span', { class: 'team-pill', style: 'background:#f3f4f6;color:#111827;border-radius:999px;padding:4px 8px;font-size:12px;display:inline-flex;align-items:center;gap:6px;' });
            const dot = el('span', { style: 'width:6px;height:6px;border-radius:999px;background:#171E4A;display:inline-block;' });
            const link = el('a', { href: '#/teams', style: 'color:#171E4A;text-decoration:none;font-weight:600;' }, [name]);
            pill.append(dot, link);
            teamsList.append(pill);
          });
        }).catch(() => {
          teamsList.innerHTML = '';
          teamsList.append(el('span', { class: 'muted', style: 'font-size:12px;color:#ef4444;' }, ['Error al cargar equipos']));
        });
      }
    });
    // Si hay un objetivo de scroll pendiente desde otra vista (ej. teams -> profiles)
    if (window.__scrollToUserId) {
      const target = grid.querySelector(`[data-user-id="${window.__scrollToUserId}"]`);
      if (target) {
        // Resaltar y hacer scroll suave
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const oldBg = target.style.backgroundColor;
        target.style.transition = 'background-color 0.6s ease';
        target.style.backgroundColor = 'rgba(162,89,255,0.18)';
        setTimeout(() => { target.style.backgroundColor = oldBg || ''; }, 1200);
      }
      // limpiar bandera para siguientes navegaciones
      window.__scrollToUserId = null;
    }
  } catch (err) {
    grid.innerHTML = `<div class="error" style="grid-column:1/-1;color:#ef4444;">Error: ${err.message}</div>`;
  }
}
