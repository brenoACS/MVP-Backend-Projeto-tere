// Simple front-end login demo
// Demo credentials (replace with server-side auth in production)
const DEMO_USER = { email: 'user@exemplo.com', password: 'senha123' };
const ADMIN_USER = { email: 'admin@unifeso.com.br', password: 'admin' };

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  // If already authenticated, redirect away from login page
  try {
    const authRaw = localStorage.getItem('tv_auth');
    if (authRaw) {
      const auth = JSON.parse(authRaw);
      if (auth && auth.role === 'admin') {
        window.location.href = 'contato.html';
        return;
      }
      if (auth && auth.role === 'user') {
        window.location.href = 'index.html';
        return;
      }
    }
  } catch (e) {
    // ignore parse errors
  }
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const errorBox = document.getElementById('loginError');
  const toggle = document.querySelector('.toggle-pass');

  if (!form) return; // nothing to do on other pages

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.hidden = false;
    emailInput.setAttribute('aria-invalid', 'true');
    passwordInput.setAttribute('aria-invalid', 'true');
  }

  function clearError() {
    errorBox.textContent = '';
    errorBox.hidden = true;
    emailInput.removeAttribute('aria-invalid');
    passwordInput.removeAttribute('aria-invalid');
  }

  toggle?.addEventListener('click', () => {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    toggle.setAttribute('aria-label', type === 'password' ? 'Mostrar senha' : 'Ocultar senha');
  });

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    clearError();

    const email = (emailInput.value || '').trim();
    const password = (passwordInput.value || '').trim();

    if (!email || !password) {
      showError('Preencha e-mail e senha.');
      return;
    }

    // Basic validation: accept demo user or admin user (front-end demo only)
    if (email.toLowerCase() === ADMIN_USER.email && password === ADMIN_USER.password) {
      try { localStorage.setItem('tv_auth', JSON.stringify({ email: ADMIN_USER.email, role: 'admin' })); } catch (e) {}
      // Redirect admin to contato page where editing is available inline
      window.location.href = 'contato.html';
      return;
    }

    if (email.toLowerCase() === DEMO_USER.email && password === DEMO_USER.password) {
      try { localStorage.setItem('tv_auth', JSON.stringify({ email: DEMO_USER.email, role: 'user' })); } catch (e) {}
      window.location.href = 'index.html';
      return;
    }

    showError('E-mail ou senha incorretos. Verifique e tente novamente.');
  });

  // Clear error while typing
  emailInput.addEventListener('input', clearError);
  passwordInput.addEventListener('input', clearError);
});
