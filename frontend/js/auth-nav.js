// Atualiza o nav para mostrar link de Painel / botão Sair quando autenticado
document.addEventListener('DOMContentLoaded', () => {
  function getAuth() {
    try { const raw = localStorage.getItem('tv_auth'); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }

  const nav = document.querySelector('nav');
  if (!nav) return;

  // find existing login link (if any)
  let loginLink = Array.from(nav.querySelectorAll('a')).find(a => a.getAttribute('href') && a.getAttribute('href').endsWith('login.html'));

  const auth = getAuth();
  if (auth) {
    // If logged in, do NOT show an "Editar" link in the nav — keep editing on the pages.
    // Replace the login link (if present) with a logout button, or append logout if missing.
    const sairBtn = document.createElement('button');
    sairBtn.type = 'button';
    sairBtn.textContent = 'Sair';
    sairBtn.className = 'btn ghost';
    sairBtn.style.marginLeft = '10px';
    sairBtn.addEventListener('click', () => { localStorage.removeItem('tv_auth'); window.location.reload(); });

    if (loginLink) {
      loginLink.replaceWith(sairBtn);
    } else {
      nav.appendChild(sairBtn);
    }
  } else {
    // not authenticated: ensure there's a login link
    if (!loginLink) {
      const a = document.createElement('a');
      a.href = 'login.html';
      a.textContent = 'Login';
      nav.appendChild(a);
    }
  }
});
