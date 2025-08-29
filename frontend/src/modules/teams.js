import { me } from '../services/auth.service.js';
import { getTeams, createTeam, deleteTeam, invalidateTeams, isTeamsCacheFresh, getTeamUsers, joinTeam, updateTeam } from '../services/teams.service.js';
import { getUser, getUserTeams } from '../services/users.service.js';
import { listUserLanguagues } from '../services/languagues.service.js';
import { openModal, closeModal } from '../app/modal.js';

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

async function showUserProfileModal(userId) {
  try {
    let u = await getUser(userId);
    if (Array.isArray(u)) u = u[0] || {};
    const userIdNorm = u.id || u._id || userId;
    const name = u.name || u.fullname || u.username || `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Usuario';
    const email = u.email || '';
    const cohort = u.cohort || '—';
    const phone = u.phone || '—';
    let map = null;
    try { const all = JSON.parse(localStorage.getItem('users:textMeta') || '{}'); map = all && userIdNorm ? all[String(userIdNorm)] : null; } catch(_) {}
    const city = u.place || u.city || (map && map.place) || '—';
    const dispo = u.disponibility || u.availability || '—';
    const schedule = u.schedule || '—';
    const role = u.role || '—';
    const clan = u.clan || (map && map.clan) || '—';
    const english = u.english_level || u.english || '—';
    const desc = u.description || '—';

    const card = el('article', { class: 'perfil', style: 'display:flex;flex-direction:column;gap:8px;' });
    const header = el('div', { style: 'display:flex;gap:12px;align-items:center;' });
    const avatar = el('div', { class: 'avatar-icon' });
    avatar.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 12c2.761 0 5-2.686 5-6s-2.239-6-5-6-5 2.686-5 6 2.239 6 5 6zm0 2c-4.418 0-8 2.91-8 6.5V22h16v-1.5c0-3.59-3.582-6.5-8-6.5z"/></svg>';
    const titleBox = el('div');
    const h3 = el('h3', {}, [name]);
    const mail = el('p', { class: 'muted', style: 'color:#6b7280;margin:0;' }, [email]);
    titleBox.append(h3, mail);
    header.append(avatar, titleBox);

    if (clan && clan !== '—') {
      const clanPill = el('span', { class: 'clan-pill', style: 'display:inline-flex;align-items:center;gap:6px;background:#171E4A;color:#fff;border-radius:999px;padding:4px 10px;margin-top:2px;font-size:12px;align-self:flex-start;' }, [clan]);
      titleBox.append(clanPill);
    }

    const meta = el('div', { class: 'perfil-meta', style: 'padding:6px 0 0;' });
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

    const langsBox = el('div', { class: 'perfil-langs', style: 'margin:10px 0 0;padding-top:6px;border-top:1px solid #e5e7eb;' });
    const langsTitle = el('div', { class: 'muted', style: 'font-size:12px;color:#6b7280;margin-bottom:6px;' }, ['Lenguajes']);
    const langsList = el('div', { class: 'langs-list', style: 'display:flex;flex-wrap:wrap;gap:6px;' });
    langsList.append(el('span', { class: 'muted', style: 'font-size:12px;color:#9ca3af;' }, ['Cargando…']));
    langsBox.append(langsTitle, langsList);

    const teamsBox = el('div', { class: 'perfil-teams', style: 'margin:10px 0 0;padding-top:6px;border-top:1px solid #e5e7eb;' });
    const teamsTitle = el('div', { class: 'muted', style: 'font-size:12px;color:#6b7280;margin-bottom:6px;' }, ['Equipos']);
    const teamsList = el('div', { class: 'teams-list', style: 'display:flex;flex-wrap:wrap;gap:6px;' });
    teamsList.append(el('span', { class: 'muted', style: 'font-size:12px;color:#9ca3af;' }, ['Cargando…']));
    teamsBox.append(teamsTitle, teamsList);

    meta.append(ul, descEl, langsBox, teamsBox);
    card.append(header, meta);

    // Cargas no bloqueantes
    listUserLanguagues(userIdNorm).then((langs) => {
      langsList.innerHTML = '';
      if (!Array.isArray(langs) || langs.length === 0) {
        langsList.append(el('span', { class: 'muted', style: 'font-size:12px;color:#9ca3af;' }, ['Sin lenguajes']));
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
      langsList.append(el('span', { class: 'muted', style: 'font-size:12px;color:#ef4444;' }, ['Error al cargar lenguajes']));
    });

    getUserTeams(userIdNorm).then((teams) => {
      teamsList.innerHTML = '';
      if (!Array.isArray(teams) || teams.length === 0) {
        teamsList.append(el('span', { class: 'muted', style: 'font-size:12px;color:#9ca3af;' }, ['Sin equipos']));
        return;
      }
      teams.forEach((t) => {
        const n = t.project_name || t.team_name || 'Equipo';
        const pill = el('span', { class: 'team-pill', style: 'background:#f3f4f6;color:#111827;border-radius:999px;padding:4px 8px;font-size:12px;display:inline-flex;align-items:center;gap:6px;' });
        const dot = el('span', { style: 'width:6px;height:6px;border-radius:999px;background:#171E4A;display:inline-block;' });
        const link = el('a', { href: '#/teams', style: 'color:#171E4A;text-decoration:none;font-weight:600;' }, [n]);
        pill.append(dot, link);
        teamsList.append(pill);
      });
    }).catch(() => {
      teamsList.innerHTML = '';
      teamsList.append(el('span', { class: 'muted', style: 'font-size:12px;color:#ef4444;' }, ['Error al cargar equipos']));
    });

    openModal({
      container: document.querySelector('#teamsView'),
      title: 'Perfil',
      content: card,
      actions: [ { label: 'Cerrar', variant: 'secondary', onClick: ({ close }) => close() } ]
    });
  } catch (e) {
    openModal({ container: document.querySelector('#teamsView'), title: 'Error', content: `<p>${e.message}</p>`, actions: [ { label: 'Cerrar', variant: 'secondary', onClick: ({ close }) => close() } ] });
  }
}

async function bindActions(isAdmin) {
  const actions = document.querySelector('#teamsView .teams-actions');
  if (!actions) return;
  actions.innerHTML = '';
  // Botón Refrescar (visible para todos)
  const refreshBtn = el('button', { type: 'button', style: 'background:#e5e7eb;color:#111827;border:none;border-radius:8px;padding:8px 12px;cursor:pointer;margin-right:8px;' }, ['Refrescar']);
  refreshBtn.addEventListener('click', async () => {
    invalidateTeams();
    await loadAndRenderTeams(true);
  });
  actions.append(refreshBtn);

  // Botón Crear equipo (visible para todos los roles)
  const addBtn = el('button', { type: 'button', style: 'background:#171E4A;color:#fff;border:none;border-radius:8px;padding:8px 12px;cursor:pointer;' }, ['Crear equipo']);
  addBtn.addEventListener('click', async () => {
    const { navigate } = await import('../app/router.js');
    navigate('teams-new');
  });
  actions.append(addBtn);
}

// Deprecated: openCreateTeamModal removido. Ahora se usa navegación a la ruta 'teams-new'.

export async function loadAndRenderTeams(force = false) {
  const grid = document.getElementById('teamsGrid');
  if (!grid) return;
  // Asegurar clase de grid estilada
  grid.classList.add('teams');
  const fresh = isTeamsCacheFresh();
  if (force || !fresh) {
    grid.innerHTML = '<div class="muted" style="grid-column:1/-1;color:#6b7280;">Cargando equipos…</div>';
  }
  try {
    const current = await me().catch(() => null);
    await bindActions(false);
    const teams = await getTeams({ force });
    if (!Array.isArray(teams) || teams.length === 0) {
      grid.innerHTML = '<div class="muted" style="grid-column:1/-1;color:#6b7280;">No hay equipos disponibles.</div>';
      return;
    }
    grid.innerHTML = '';
    teams.forEach((t) => {
      const name = t.name || t.team_name || 'Equipo';
      const description = t.description || t.about || '';

      // Tarjeta con estructura similar a perfiles
      const card = el('article', { class: 'team-card' });

      const foto = el('div', { class: 'foto' });
      const avatar = el('div', { class: 'avatar-icon' });
      avatar.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 12c2.761 0 5-2.686 5-6s-2.239-6-5-6-5 2.686-5 6 2.239 6 5 6zm0 2c-4.418 0-8 2.91-8 6.5V22h16v-1.5c0-3.59-3.582-6.5-8-6.5z"/></svg>';
      foto.append(avatar);

      const info = el('div', { class: 'info' });
      const title = el('h3', {}, [name]);
      const desc = el('p', {}, [description || '—']);
      info.append(title, desc);

      card.append(foto, info);

      const actions = el('div', { class: 'actions' });
      // Ver miembros (todos los roles)
      const membersBtn = el('button', { type: 'button', class: 'btnMembers' }, ['Ver miembros']);
      membersBtn.addEventListener('click', async () => {
        const teamId = t.id || t._id;
        if (!teamId) return openModal({ container: document.querySelector('#teamsView'), title: 'Error', content: '<p>ID de equipo no encontrado.</p>', actions: [ { label: 'Cerrar', variant: 'secondary', onClick: ({ close }) => close() } ] });
        membersBtn.disabled = true;
        try {
          const list = await getTeamUsers(teamId);
          const container = document.createElement('div');
          container.className = 'theme-neo';
          const header = document.createElement('div');
          header.className = 'team-header';
          header.innerHTML = `
            <div class="avatar-lg"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 12c2.761 0 5-2.686 5-6s-2.239-6-5-6-5 2.686-5 6 2.239 6 5 6zm0 2c-4.418 0-8 2.91-8 6.5V22h16v-1.5c0-3.59-3.582-6.5-8-6.5z"/></svg></div>
            <div class="team-meta"><h3>${name}</h3><div style="color:#6b7280">Miembros</div></div>
          `;
          const hr = document.createElement('hr');
          const ul = document.createElement('ul');
          ul.style.margin = '0';
          ul.style.paddingLeft = '18px';
          if (Array.isArray(list) && list.length) {
            list.forEach(m => {
              const li = document.createElement('li');
              const a = document.createElement('a');
              a.href = '#';
              a.textContent = m.name || 'Usuario';
              a.className = 'member-link';
              a.style.color = '#171E4A';
              a.style.textDecoration = 'none';
              a.style.fontWeight = '600';
              a.dataset.userId = String(m.user_id);
              a.addEventListener('click', async (ev) => {
                ev.preventDefault();
                // Abrir tarjeta de perfil en modal
                await showUserProfileModal(String(m.user_id));
              });
              const role = document.createElement('span');
              role.textContent = ` (${m.team_role})`;
              role.style.color = '#6b7280';
              li.append(a, role);
              ul.appendChild(li);
            });
          } else {
            ul.innerHTML = '<li>Sin miembros</li>';
          }
          container.append(header, hr, ul);
          openModal({ container: document.querySelector('#teamsView'), title: 'Miembros del equipo', content: container, actions: [ { label: 'Cerrar', variant: 'secondary', onClick: ({ close }) => close() } ] });
        } catch (e) {
          openModal({ container: document.querySelector('#teamsView'), title: 'Error', content: `<p>${e.message}</p>`, actions: [ { label: 'Cerrar', variant: 'secondary', onClick: ({ close }) => close() } ] });
        } finally {
          membersBtn.disabled = false;
        }
      });
      actions.append(membersBtn);

      // Unirse al equipo (si hay sesión)
      if (current && current.id) {
        const joinBtn = el('button', { type: 'button', class: 'btnJoin' }, ['Unirme']);
        joinBtn.addEventListener('click', async () => {
          const teamId = t.id || t._id;
          if (!teamId) return alert('ID de equipo no encontrado.');
          const dispose = openModal({
            container: document.querySelector('#teamsView'),
            title: 'Unirse al equipo',
            content: `<p>¿Deseas unirte a <strong>${name}</strong> como miembro?</p>`,
            actions: [
              { label: 'Cancelar', variant: 'secondary', onClick: ({ close }) => close() },
              { label: 'Unirme', variant: 'primary', onClick: async ({ close }) => {
                  joinBtn.disabled = true;
                  try {
                    await joinTeam({ team_id: teamId, user_id: current.id, team_role: 'member' });
                    close();
                    openModal({ container: document.querySelector('#teamsView'), title: 'Éxito', content: '<p>Te uniste al equipo.</p>', actions: [ { label: 'Cerrar', variant: 'primary', onClick: ({ close }) => close() } ] });
                  } catch (e) {
                    openModal({ container: document.querySelector('#teamsView'), title: 'Error', content: `<p>${e.message}</p>`, actions: [ { label: 'Cerrar', variant: 'secondary', onClick: ({ close }) => close() } ] });
                  } finally {
                    joinBtn.disabled = false;
                  }
                }
              }
            ]
          });
        });
        actions.append(joinBtn);
      }

      // Acciones de gestión: Editar y Eliminar
      if (current && current.id) {
        const teamId = t.id || t._id;
        const isAdmin = String(current.role || '').toLowerCase() === 'admin';

        const bindManageActions = () => {
          // Evitar duplicados si ya se añadieron
          if (card.dataset.manageBound === '1') return;
          card.dataset.manageBound = '1';

          // Insignia para rol (líder o admin)
          if (!info.querySelector('.leader-badge')) {
            const badge = el('div', { class: 'leader-badge' });
            badge.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5 7l3 3 4-6 4 6 3-3v11H5V7zm0 13h14v2H5v-2z"/></svg><span>' + (isAdmin ? 'Admin' : 'Líder') + '</span>';
            info.appendChild(badge);
          }

          const editBtn = el('button', { type: 'button', class: 'btnEditTeam' }, ['Editar']);
          editBtn.addEventListener('click', async () => {
            if (!teamId) return alert('ID de equipo no encontrado.');
            const form = document.createElement('form');
            form.className = 'form-grid';
            form.innerHTML = `
              <div class="form-row"><label>Nombre</label><input name="team_name" value="${name}" required /></div>
              <div class="form-row full"><label>Descripción</label><textarea name="description" rows="3">${description || ''}</textarea></div>
            `;
            openModal({
              container: document.querySelector('#teamsView'),
              title: 'Editar equipo',
              content: form,
              actions: [
                { label: 'Cancelar', variant: 'secondary', onClick: ({ close }) => close() },
                { label: 'Guardar', variant: 'primary', onClick: async ({ close }) => {
                    const data = Object.fromEntries(new FormData(form).entries());
                    await updateTeam(teamId, { team_name: data.team_name, description: data.description || '' });
                    title.textContent = data.team_name;
                    desc.textContent = (data.description || '—');
                    close();
                  }
                }
              ]
            });
          });

          const delBtn = el('button', { type: 'button', class: 'btnDeleteTeam' }, ['Eliminar']);
          delBtn.addEventListener('click', async () => {
            if (!teamId) return alert('ID de equipo no encontrado.');
            openModal({
              container: document.querySelector('#teamsView'),
              title: 'Eliminar equipo',
              content: `<p>¿Seguro que deseas eliminar <strong>${name}</strong>?</p>`,
              actions: [
                { label: 'Cancelar', variant: 'secondary', onClick: ({ close }) => close() },
                { label: 'Eliminar', variant: 'primary', onClick: async ({ close }) => {
                    try {
                      await deleteTeam(teamId);
                      invalidateTeams();
                      card.remove();
                      close();
                    } catch (e) {
                      openModal({ container: document.querySelector('#teamsView'), title: 'Error', content: `<p>${e.message}</p>`, actions: [ { label: 'Cerrar', variant: 'secondary', onClick: ({ close }) => close() } ] });
                    }
                  }
                }
              ]
            });
          });
          actions.append(editBtn, delBtn);
        };

        if (isAdmin) {
          // Admin puede gestionar sin ser líder
          bindManageActions();
        } else {
          // Evaluar liderazgo de forma perezosa para no bloquear el render inicial
          getTeamUsers(teamId).then((list) => {
            const isLeader = Array.isArray(list) && !!list.find(u => String(u.user_id) === String(current.id) && (u.team_role === 'leader'));
            if (!isLeader) return;
            bindManageActions();
          }).catch(() => {});
        }
      }
      card.append(actions);
      grid.append(card);
    });
  } catch (err) {
    grid.innerHTML = `<div class="error" style="grid-column:1/-1;color:#ef4444;">Error: ${err.message}</div>`;
  }
}
