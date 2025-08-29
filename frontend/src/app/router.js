// Simple SPA router utilities
// - loadPartial: fetches an HTML partial
// - initRouter: sets up hash-based routing and renders header + view + footer
// - navigate: programmatic navigation
import { bindHeader } from '../modules/header.js';
import { me, login as loginService } from '../services/auth.service.js';
import { getUsers } from '../services/users.service.js';
import { getTeams } from '../services/teams.service.js';

const __partialCache = new Map();
export async function loadPartial(path) {
  if (__partialCache.has(path)) return __partialCache.get(path);
  const res = await fetch(path, { credentials: 'same-origin' });
  if (!res.ok) throw new Error(`Failed to load: ${path}`);
  const html = await res.text();
  __partialCache.set(path, html);
  return html;
}

export function qs(sel, root = document) {
  return root.querySelector(sel);
}

export function qsa(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

// Forzar scroll al inicio en cada cambio de vista
function forceScrollTop() {
  try {
    const root = document.getElementById('viewRoot');
    if (root && typeof root.scrollTo === 'function') {
      root.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  } catch (_) {}
  try {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  } catch (_) {
    window.scrollTo(0, 0);
  }
}

const routes = {
  login: './src/pages/views/login.html',
  main: './src/pages/views/main.html',
  profiles: './src/pages/views/profiles.html',
  teams: './src/pages/views/teams.html',
  'profiles-new': './src/pages/views/profiles-new.html',
  'teams-new': './src/pages/views/teams-new.html',
  account: './src/pages/views/users/account.html',
  'account-edit': './src/pages/views/users/account-edit.html',
  'profiles-edit-admin': './src/pages/views/users/admin-edit.html',
};

function getRouteFromHash() {
  const hash = (location.hash || '').replace(/^#\/?/, '');
  // expect formats like "login", "main", "profiles", "teams"
  return routes[hash] ? hash : 'login';
}

let routeHooks = {};
export function setRouteHooks(hooks) {
  routeHooks = { ...routeHooks, ...hooks };
}

let __hooksRegistered = false;
async function ensureDefaultHooks() {
  if (__hooksRegistered) return;
  try {
    const { loadAndRenderProfiles } = await import('../modules/profiles.js');
    const { loadAndRenderTeams } = await import('../modules/teams.js');
    const { mountCreateUserPage } = await import('../pages/create-user.js');
    const { mountCreateTeamPage } = await import('../pages/create-team.js');
    const { mountAccountPage } = await import('../pages/users/account.js');
    const { mountAccountEditPage } = await import('../pages/users/account-edit.js');
    const { mountAdminUserEditPage } = await import('../pages/users/admin-edit.js');
    setRouteHooks({
      profiles: loadAndRenderProfiles,
      teams: loadAndRenderTeams,
      'profiles-new': mountCreateUserPage,
      'teams-new': mountCreateTeamPage,
      account: mountAccountPage,
      'account-edit': mountAccountEditPage,
      'profiles-edit-admin': mountAdminUserEditPage,
    });
    __hooksRegistered = true;
  } catch (e) {
    console.warn('[router] No se pudieron registrar hooks por defecto aún', e);
  }
}

// Control de versiones de render para evitar condiciones de carrera al navegar rápido
let __renderVersion = 0;

export async function renderRoute(route) {
  const myVersion = ++__renderVersion;
  const app = document.getElementById('app');
  if (!app) throw new Error('Missing #app container');
  const headerPath = './src/pages/views/partials/header.html';
  const footerPath = './src/pages/views/partials/footer.html';
  const viewPath = routes[route] || routes.main;
  // Cache de instancias de vistas montadas en DOM
  if (!renderRoute.__viewInstances) renderRoute.__viewInstances = new Map();
  const viewInstances = renderRoute.__viewInstances;
  // Helper: obtener o crear el layout persistente (header + main + footer)
  const ensureLayout = async () => {
    let headerEl = app.querySelector('header');
    let mainEl = app.querySelector('main');
    let footerEl = app.querySelector('footer');
    if (!headerEl || !footerEl || !mainEl) {
      const [headerHtml, footerHtml] = await Promise.all([
        loadPartial(headerPath).catch(() => ''),
        loadPartial(footerPath).catch(() => ''),
      ]);
      app.innerHTML = `${headerHtml}\n<main id="viewRoot"></main>\n${footerHtml}`;
      headerEl = app.querySelector('header');
      mainEl = app.querySelector('main');
      footerEl = app.querySelector('footer');
      try { await bindHeader(); } catch (e) { console.warn('[router] bindHeader failed', e); }
    }
    if (!mainEl.id) mainEl.id = 'viewRoot';
    // Reservar altura para evitar que el contenido se mueva mientras carga la primera vista
    // 64px (navbar) + 240px (footer mínimo) -> el main ocupa el resto del viewport
    try {
      mainEl.style.minHeight = 'calc(100vh - 64px - 240px)';
    } catch(_) {}
    return { headerEl, mainEl, footerEl };
  };

  if (route === 'login') {
    // Render login view sin header/footer persistentes
    const view = await loadPartial(viewPath);
    if (myVersion !== __renderVersion) return; // render obsoleto
    app.innerHTML = `<main>${view}</main>`;
    // Asegurar que el scroll esté arriba al entrar a login
    forceScrollTop();
  } else {
    // Guard: exigir sesión antes de renderizar rutas protegidas
    try {
      await me();
    } catch (_) {
      await navigate('login');
      return;
    }
    // Asegurar hooks registrados aunque no se haya pasado por login
    await ensureDefaultHooks();
    // Ocultar rápidamente cualquier contenido previo antes de awaits para evitar parpadeos
    const existingMain = app.querySelector('main');
    if (existingMain) Array.from(existingMain.children).forEach((c) => { c.style.display = 'none'; });
    const { mainEl } = await ensureLayout();
    if (myVersion !== __renderVersion) return; // render obsoleto
    // Prefetch de datos según la ruta para que el módulo pinte de inmediato
    let prefetch = Promise.resolve();
    if (route === 'profiles') prefetch = getUsers().catch(() => {});
    if (route === 'profiles-new') prefetch = getUsers().catch(() => {});
    if (route === 'teams') prefetch = getTeams().catch(() => {});

    // Ocultar todas las vistas actuales
    Array.from(mainEl.children).forEach((c) => { c.style.display = 'none'; });

    // Si la vista ya existe, mostrarla y ejecutar su hook nuevamente (para refrescar contenido)
    if (viewInstances.has(route)) {
      const container = viewInstances.get(route);
      container.style.display = '';
      await prefetch; // asegurar datos listos si aplica
      try {
        const hook = routeHooks[route];
        if (typeof hook === 'function') await hook();
      } catch (err) {
        console.error('[router] route hook error (show cached)', route, err);
      }
    } else {
      // Crear contenedor para la nueva vista y montar HTML
      const container = document.createElement('section');
      container.setAttribute('data-route', route);
      try {
        // Cargar HTML de la vista y prefetch de datos en paralelo
        const [viewHtml] = await Promise.all([
          loadPartial(viewPath),
          prefetch,
        ]);
        if (myVersion !== __renderVersion) return; // render obsoleto
        container.innerHTML = viewHtml;
        container.style.display = '';
      } catch (e) {
        console.error('[router] Error cargando vista', route, e);
        container.innerHTML = `<div class="error" style="padding:16px;color:#ef4444;">
          Error al cargar la vista. Intenta recargar. Detalle: ${e?.message || e}
        </div>`;
      }
      // Asegurar visibilidad explícita de la nueva vista
      container.style.display = '';
      mainEl.appendChild(container);
      viewInstances.set(route, container);
      // Ejecutar hook de ruta solo al primer montaje
      try {
        const hook = routeHooks[route];
        if (typeof hook === 'function') await hook();
      } catch (err) {
        console.error('[router] route hook error (first mount)', route, err);
      }
    }
    // Llevar scroll al inicio tras montar/mostrar la vista protegida
    forceScrollTop();
  }

  // Attach a lightweight login handler when on login route
  if (route === 'login') {
    const form = app.querySelector('#loginForm');
    const email = app.querySelector('#email');
    const password = app.querySelector('#password');
    const err = app.querySelector('#formError');
    if (form && email && password) {
      form.onsubmit = async (ev) => {
        ev.preventDefault();
        err && (err.textContent = '');
        try {
          await loginService(email.value.trim(), password.value);
          // Precargar datos clave para que las vistas estén listas al entrar
          await Promise.all([
            getUsers().catch(() => {}),
            getTeams().catch(() => {}),
          ]);
          // Navigate to main on success
          await navigate('main');
        } catch (e) {
          if (err) err.textContent = e.message || 'Error al iniciar sesión';
        }
      };
    }
  }
  // Nota: los hooks de rutas protegidas se ejecutan al primer montaje arriba.
  // Aquí mantenemos compatibilidad ejecutando el hook en login (que no se cachea)
  if (route === 'login') {
    try {
      const hook = routeHooks[route];
      if (typeof hook === 'function') await hook();
    } catch (err) {
      console.error('[router] route hook error', route, err);
    }
  }
}

export async function navigate(route) {
  // update hash to keep back/forward working
  const norm = route.replace(/^#\/?/, '');
  if (location.hash !== `#/${norm}`) {
    location.hash = `#/${norm}`;
  } else {
    await renderRoute(norm);
  }
}

let __routerInitialized = false;
export function initRouter() {
  if (__routerInitialized) return;
  __routerInitialized = true;
  window.addEventListener('hashchange', () => {
    const r = getRouteFromHash();
    renderRoute(r);
  });
  const initial = getRouteFromHash();
  renderRoute(initial);
}
