// Sencillo gestor de modales. Renderiza dentro de un contenedor específico
// Uso:
// import { openModal, closeModal } from '../app/modal.js'
// const dispose = openModal({
//   container: document.querySelector('#teamsView') || document.body,
//   title: 'Título',
//   content: nodeOrHtmlString,
//   actions: [
//     { label: 'Cerrar', variant: 'secondary', onClick: close },
//     { label: 'Guardar', variant: 'primary', onClick: async () => {} },
//   ]
// })

export function closeModal(modalEl) {
  const el = modalEl || document.querySelector('.modal');
  if (el && el.parentNode) el.parentNode.removeChild(el);
}

export function openModal({ container, title = '', content = '', actions = [] } = {}) {
  const host = container || document.body;
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal(modal);
  });

  const wrap = document.createElement('div');
  wrap.className = 'modal-content';

  // Header
  const header = document.createElement('div');
  header.className = 'modal-header';
  const h = document.createElement('h3');
  h.className = 'modal-title';
  h.textContent = title || '';
  const btnX = document.createElement('button');
  btnX.className = 'modal-close';
  btnX.innerHTML = '✕';
  btnX.addEventListener('click', () => closeModal(modal));
  header.append(h, btnX);

  // Body
  const body = document.createElement('div');
  if (typeof content === 'string') {
    body.innerHTML = content;
  } else if (content instanceof Node) {
    body.appendChild(content);
  }

  // Footer
  const footer = document.createElement('div');
  footer.className = 'modal-actions';
  actions.forEach(({ label, variant = 'secondary', onClick }) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.className = variant === 'primary' ? 'btn-primary' : 'btn-secondary';
    b.addEventListener('click', async () => {
      try {
        if (typeof onClick === 'function') await onClick({ close: () => closeModal(modal) });
      } finally {
        // noop
      }
    });
    footer.appendChild(b);
  });

  wrap.append(header, body, footer);
  modal.appendChild(wrap);
  host.appendChild(modal);
  return () => closeModal(modal);
}
