import { loadPartial, qs, initRouter, navigate, setRouteHooks } from '../app/router.js';
import { loadAndRenderProfiles } from '../modules/profiles.js';
import { loadAndRenderTeams } from '../modules/teams.js';
import { login, setCurrentUser } from '../services/auth.service.js';

async function bootstrap() {
  const app = document.getElementById('app');
  if (!app) throw new Error('Missing #app container');
  // Renderizar SIEMPRE el formulario de login con footer (sin header)
  const [loginView, footer] = await Promise.all([
    loadPartial('./src/pages/views/login.html'),
    loadPartial('./src/pages/views/partials/footer.html').catch(() => ''),
  ]);
  app.innerHTML = `${loginView}\n${footer}`;
  // Ocultar SOLO el scroll horizontal en la página de login
  const prevOverflowX = document.documentElement.style.overflowX;
  document.documentElement.style.overflowX = 'hidden';
  const form = qs('#loginForm', app);
  const errorSpan = qs('#formError', app);

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = form.email?.value?.trim();
      const password = form.password?.value?.trim();
      if (!email || !password) {
        if (errorSpan) errorSpan.textContent = 'Por favor ingresa email y contraseña.';
        return;
      }
      if (errorSpan) errorSpan.textContent = '';
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      try {
        const { user } = await login(email, password);
        // Guardar usuario básico (id, email, role) para fallback de me()
        try { setCurrentUser(user); } catch (_) {}
        // Inicializar router y registrar hooks
        initRouter();
        const { mountCreateUserPage } = await import('./create-user.js');
        const { mountCreateTeamPage } = await import('./create-team.js');
        const { mountAccountPage } = await import('./users/account.js');
        const { mountAccountEditPage } = await import('./users/account-edit.js');
        setRouteHooks({
          profiles: loadAndRenderProfiles,
          teams: loadAndRenderTeams,
          'profiles-new': mountCreateUserPage,
          'teams-new': mountCreateTeamPage,
          account: mountAccountPage,
          'account-edit': mountAccountEditPage,
        });
        // Restaurar overflow-x antes de salir del login
        document.documentElement.style.overflowX = prevOverflowX || '';
        await navigate('main');
      } catch (err) {
        if (errorSpan) {
          if (err && err.status === 401) {
            errorSpan.textContent = 'Credenciales inválidas. Verifica tu email y contraseña.';
          } else {
            errorSpan.textContent = err.message || 'Error de conexión';
          }
        }
        // Limpiar solo el campo de contraseña por seguridad
        if (form.password) form.password.value = '';
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
