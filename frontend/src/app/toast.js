let __toastRoot = null;

function ensureRoot() {
  if (!__toastRoot) {
    __toastRoot = document.createElement('div');
    __toastRoot.id = 'toast-root';
    document.body.appendChild(__toastRoot);
  }
  return __toastRoot;
}

export function showToast(message, { type = 'info', duration = 2800 } = {}) {
  const root = ensureRoot();
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span class="toast-msg">${message}</span>`;
  root.appendChild(el);
  // Force reflow then animate in
  requestAnimationFrame(() => el.classList.add('in'));
  const timer = setTimeout(() => hide(), duration);

  function hide() {
    el.classList.remove('in');
    el.classList.add('out');
    setTimeout(() => {
      el.remove();
      clearTimeout(timer);
    }, 240);
  }

  return { hide };
}
