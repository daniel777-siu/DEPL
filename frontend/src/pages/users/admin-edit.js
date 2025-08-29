import { navigate } from '../../app/router.js';
import { getUser, getUsers, updateUserAdmin, invalidateUsers } from '../../services/users.service.js';
import { listPlaces, listClans } from '../../services/general.service.js';

export async function mountAdminUserEditPage() {
  // Obtener el id que dejamos en sessionStorage desde perfiles
  const id = (() => {
    try { return sessionStorage.getItem('adminEditUserId'); } catch(_) { return null; }
  })();
  const root = document.querySelector('[data-route="profiles-edit-admin"]') || document;
  const form = root.querySelector('#adminUserEditForm');
  const citiesList = root.querySelector('#citiesList');
  const clansList = root.querySelector('#clansList');
  const helper = document.createElement('div');
  helper.className = 'helper';
  helper.style.color = '#fca5a5';
  helper.style.marginTop = '6px';
  form && form.appendChild(helper);

  if (!id) {
    if (helper) helper.textContent = 'No se encontró el usuario a editar.';
    return;
  }

  // Cargar catálogos locales y de usuarios para datalist
  try {
    const catalog = await buildCatalogs();
    fillDatalist(citiesList, catalog.cities);
    fillDatalist(clansList, catalog.clans);
  } catch(_) {}

  // Prefill
  try {
    const data = await getUser(id);
    const u = Array.isArray(data) ? data[0] : data; // según backend getOne devuelve array
    if (!u) throw new Error('Usuario no encontrado');
    setVal(root, '#f_name', u.name || '');
    setVal(root, '#f_email', u.email || '');
    setVal(root, '#f_phone', u.phone || '');
    setVal(root, '#f_cohort', u.cohort || '');
    // backend espera place por nombre de ciudad, y clan por nombre
    setVal(root, '#f_place', u.place || u.city || '');
    setVal(root, '#f_disponibility', u.disponibility || '');
    setVal(root, '#f_schedule', u.schedule || '');
    setVal(root, '#f_role', u.role || '');
    setVal(root, '#f_clan', u.clan || '');
    setVal(root, '#f_english_level', u.english_level || u.english || '');
    setVal(root, '#f_description', u.description || '');

    // Si no hay nombres, mostrar IDs actuales como referencia
    const meta = document.createElement('div');
    meta.className = 'helper';
    meta.style.color = '#9ca3af';
    meta.textContent = `Actual: place_id=${u.place_id ?? '—'}, clan_id=${u.clan_id ?? '—'}`;
    form && form.insertBefore(meta, form.firstChild);
  } catch (e) {
    if (helper) helper.textContent = e.message || 'Error cargando el usuario';
  }

  if (form) {
    form.onsubmit = async (ev) => {
      ev.preventDefault();
      helper.textContent = '';
      const payload = collect(root);
      // Validaciones mínimas para evitar 500 en backend (place/clan requeridos para resolver IDs)
      if (!payload.place || !payload.clan) {
        helper.textContent = 'Ciudad y Clan son obligatorios y deben existir en los catálogos.';
        return;
      }
      try {
        await updateUserAdmin(id, payload);
        // Actualizar catálogos locales
        try { updateLocalCatalogs(payload.place, payload.clan); } catch(_) {}
        // Guardar nombres por usuario para que perfiles pueda mostrarlos
        try {
          const key = 'users:textMeta';
          const map = JSON.parse(localStorage.getItem(key) || '{}');
          map[String(id)] = { place: payload.place, clan: payload.clan };
          localStorage.setItem(key, JSON.stringify(map));
        } catch(_) {}
        invalidateUsers();
        await navigate('profiles');
      } catch (e) {
        helper.textContent = (e && e.message) || 'Error al guardar';
      }
    };
  }
}

function setVal(root, sel, v) {
  const el = root.querySelector(sel);
  if (el) el.value = v;
}

function val(root, sel) {
  const el = root.querySelector(sel);
  return el ? el.value.trim() : '';
}

function collect(root) {
  return {
    name: val(root, '#f_name'),
    cohort: val(root, '#f_cohort'),
    email: val(root, '#f_email'),
    phone: val(root, '#f_phone'),
    place: val(root, '#f_place'), // requerido por generalClient.cityId
    disponibility: val(root, '#f_disponibility'),
    schedule: val(root, '#f_schedule'),
    role: val(root, '#f_role'),
    clan: val(root, '#f_clan'), // requerido por generalClient.clanId
    description: val(root, '#f_description'),
    english_level: val(root, '#f_english_level'),
  };
}

async function buildCatalogs() {
  const out = { cities: new Set(), clans: new Set() };
  // primero, catálogos oficiales si existen
  try {
    const [places, clans] = await Promise.all([
      listPlaces(),
      listClans(),
    ]);
    (Array.isArray(places) ? places : []).forEach(p => {
      const name = p.city || p.place || p.name;
      if (name) out.cities.add(String(name));
    });
    (Array.isArray(clans) ? clans : []).forEach(c => {
      const name = c.clan_name || c.name || c.clan;
      if (name) out.clans.add(String(name));
    });
  } catch(_) {}
  // desde usuarios
  try {
    const list = await getUsers({ force: true });
    (Array.isArray(list) ? list : []).forEach((u) => {
      if (u.place) out.cities.add(String(u.place));
      if (u.city) out.cities.add(String(u.city));
      if (u.clan) out.clans.add(String(u.clan));
    });
  } catch(_) {}
  // desde localStorage
  try {
    const cs = JSON.parse(localStorage.getItem('catalog:cities') || '[]');
    const ks = JSON.parse(localStorage.getItem('catalog:clans') || '[]');
    cs.forEach((c) => out.cities.add(String(c)));
    ks.forEach((k) => out.clans.add(String(k)));
  } catch(_) {}
  return { cities: Array.from(out.cities).sort(), clans: Array.from(out.clans).sort() };
}

function fillDatalist(node, items) {
  if (!node || !Array.isArray(items)) return;
  node.innerHTML = '';
  items.forEach((v) => {
    const opt = document.createElement('option');
    opt.value = v;
    node.appendChild(opt);
  });
}

function updateLocalCatalogs(city, clan) {
  try {
    const cs = new Set(JSON.parse(localStorage.getItem('catalog:cities') || '[]'));
    const ks = new Set(JSON.parse(localStorage.getItem('catalog:clans') || '[]'));
    if (city) cs.add(String(city));
    if (clan) ks.add(String(clan));
    localStorage.setItem('catalog:cities', JSON.stringify(Array.from(cs)));
    localStorage.setItem('catalog:clans', JSON.stringify(Array.from(ks)));
  } catch(_) {}
}
