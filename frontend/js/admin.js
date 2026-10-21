// Admin page script: requires admin authentication stored in localStorage under 'tv_auth'
const ADMIN_EMAIL = 'admin@unifeso.com.br';

function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = `toast show ${type === 'error' ? 'error' : 'success'}`;
  setTimeout(() => { toast.className = 'toast'; }, 3800);
}

document.addEventListener('DOMContentLoaded', () => {
  const authRaw = localStorage.getItem('tv_auth');
  let auth = null;
  try { auth = authRaw ? JSON.parse(authRaw) : null; } catch (e) { auth = null; }
  if (!auth || auth.email !== ADMIN_EMAIL) {
    window.location.href = 'login.html';
    return;
  }

  // state
  let contacts = [];
  let events = [];

  const contactsList = document.getElementById('contactsList');
  const eventsList = document.getElementById('eventsList');
  const addContactBtn = document.getElementById('addContactBtn');
  const addEventBtn = document.getElementById('addEventBtn');
  const saveContactsBtn = document.getElementById('saveContacts');
  const saveEventsBtn = document.getElementById('saveEvents');
  const loadContactsBtn = document.getElementById('loadContacts');
  const loadEventsBtn = document.getElementById('loadEvents');
  const logoutBtn = document.getElementById('logoutBtn');

  function createInput({ tag = 'input', value = '', placeholder = '', cls = '', attrs = {} } = {}) {
    const el = document.createElement(tag === 'textarea' ? 'textarea' : 'input');
    if (tag === 'textarea') el.rows = 3;
    el.className = `form-input ${cls}`.trim();
    if (tag !== 'textarea') el.type = attrs.type || 'text';
    el.placeholder = placeholder;
    el.value = value || '';
    Object.keys(attrs).forEach(k => el.setAttribute(k, attrs[k]));
    return el;
  }

  function renderContacts() {
    contactsList.innerHTML = '';
    if (!contacts.length) {
      contactsList.innerHTML = '<div class="small">Nenhum contato. Clique em "Adicionar Contato" para criar um.</div>';
      return;
    }

    contacts.forEach((c, idx) => {
      const card = document.createElement('div');
      card.className = 'item-card';

      const fields = document.createElement('div');
      fields.className = 'item-fields';

      const name = createInput({ value: c.name || '', placeholder: 'Nome *' });
      const email = createInput({ value: c.email || '', placeholder: 'E-mail *', attrs: { type: 'email' } });
      const phone = createInput({ value: c.phone || '', placeholder: 'Telefone' });
      const address = createInput({ tag: 'textarea', value: c.address || '', placeholder: 'Endereço' });

      name.addEventListener('input', e => contacts[idx].name = e.target.value);
      email.addEventListener('input', e => contacts[idx].email = e.target.value);
      phone.addEventListener('input', e => contacts[idx].phone = e.target.value);
      address.addEventListener('input', e => contacts[idx].address = e.target.value);

      fields.appendChild(name);
      fields.appendChild(email);
      fields.appendChild(phone);
      fields.appendChild(address);

      const actions = document.createElement('div');
      actions.className = 'item-actions';
      const del = document.createElement('button');
      del.className = 'btn';
      del.textContent = 'Remover';
      del.addEventListener('click', () => {
        contacts.splice(idx, 1);
        renderContacts();
      });

      actions.appendChild(del);

      card.appendChild(fields);
      card.appendChild(actions);
      contactsList.appendChild(card);
    });
  }

  function renderEvents() {
    eventsList.innerHTML = '';
    if (!events.length) {
      eventsList.innerHTML = '<div class="small">Nenhum evento. Clique em "Adicionar Evento" para criar um.</div>';
      return;
    }

    events.forEach((ev, idx) => {
      const card = document.createElement('div');
      card.className = 'item-card';

      const fields = document.createElement('div');
      fields.className = 'item-fields';

      const title = createInput({ value: ev.title || '', placeholder: 'Título *' });
      const date = createInput({ value: ev.date || '', placeholder: 'Data (dd/mm/aaaa) *' });
      const location = createInput({ value: ev.location || '', placeholder: 'Local' });
      const desc = createInput({ tag: 'textarea', value: ev.description || '', placeholder: 'Descrição' });

      title.addEventListener('input', e => events[idx].title = e.target.value);
      date.addEventListener('input', e => { events[idx].date = e.target.value; events[idx].start = toISODate(e.target.value) || events[idx].start || ''; });
      location.addEventListener('input', e => events[idx].location = e.target.value);
      desc.addEventListener('input', e => events[idx].description = e.target.value);

      fields.appendChild(title);
      const row = document.createElement('div'); row.className = 'field-row'; row.appendChild(date); row.appendChild(location);
      fields.appendChild(row);
      fields.appendChild(desc);

      const actions = document.createElement('div');
      actions.className = 'item-actions';
      const del = document.createElement('button');
      del.className = 'btn';
      del.textContent = 'Remover';
      del.addEventListener('click', () => {
        events.splice(idx, 1);
        renderEvents();
      });

      actions.appendChild(del);

      card.appendChild(fields);
      card.appendChild(actions);
      eventsList.appendChild(card);
    });
  }

  function addContact(def = {}) {
    contacts.push({ name: def.name || '', email: def.email || '', phone: def.phone || '', address: def.address || '' });
    renderContacts();
  }

  function addEvent(def = {}) {
    events.push({ title: def.title || '', date: def.date || '', location: def.location || '', description: def.description || '' });
    renderEvents();
  }

  function validateContacts() {
    for (let i = 0; i < contacts.length; i++) {
      const c = contacts[i];
      if ((!c.name || !c.name.trim()) && (!c.email || !c.email.trim())) {
        return { ok: false, msg: `Contato ${i+1}: informe nome ou e-mail.` };
      }
      if (c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) {
        return { ok: false, msg: `Contato ${i+1}: e-mail inválido.` };
      }
    }
    return { ok: true };
  }

  function validateEvents() {
    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      if (!e.title || !e.title.trim()) return { ok: false, msg: `Evento ${i+1}: título obrigatório.` };
      if (!e.date || !e.date.trim()) return { ok: false, msg: `Evento ${i+1}: data obrigatória.` };
    }
    return { ok: true };
  }

  function saveContacts() {
    const v = validateContacts();
    if (!v.ok) { showToast(v.msg, 'error'); return; }
    try {
      localStorage.setItem('contacts', JSON.stringify(contacts));
      // also store a simple HTML fallback for older pages
      const html = contacts.map(c => `<div class=\"contact-card\"><h3>${escapeHtml(c.name || '')}</h3><p><a href=\"mailto:${escapeHtml(c.email||'')}\">${escapeHtml(c.email||'')}</a></p><p>${escapeHtml(c.phone||'')}</p><p>${escapeHtml(c.address||'')}</p></div>`).join('\n');
      localStorage.setItem('contacts_html', html);
      showToast('Contatos salvos com sucesso.');
    } catch (e) {
      showToast('Erro ao salvar contatos.', 'error');
    }
  }

  function toISODate(value) {
    if (!value) return '';
    const text = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) return '';
    return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  }

  async function saveEvents() {
    const v = validateEvents();
    if (!v.ok) { showToast(v.msg, 'error'); return; }
    try {
      const response = await fetch('/api/events');
      if (!response.ok) throw new Error('Não foi possível consultar os eventos no banco de dados.');
      const storedEvents = await response.json();
      const currentIds = new Set(events.filter(ev => ev.id != null).map(ev => String(ev.id)));

      for (const stored of storedEvents) {
        if (!currentIds.has(String(stored.id))) {
          const removed = await fetch(`/api/events/${stored.id}`, { method: 'DELETE' });
          if (!removed.ok && removed.status !== 404) throw new Error('Não foi possível excluir um evento.');
        }
      }

      for (const ev of events) {
        const startDate = ev.start || toISODate(ev.date);
        if (!startDate) throw new Error(`Informe a data do evento "${ev.title}" no formato dd/mm/aaaa.`);
        const form = new FormData();
        form.append('title', ev.title || '');
        form.append('date', ev.date || startDate);
        form.append('start', startDate);
        form.append('end', ev.end || '');
        form.append('location', ev.location || '');
        form.append('park', ev.park || '');
        form.append('category', ev.category || '');
        form.append('description', ev.description || '');
        form.append('featured', ev.featured ? 'true' : 'false');
        form.append('image', ev.image || '');
        const method = ev.id == null ? 'POST' : 'PUT';
        const url = ev.id == null ? '/api/events' : `/api/events/${ev.id}`;
        const savedResponse = await fetch(url, { method, body: form });
        const saved = await savedResponse.json().catch(() => ({}));
        if (!savedResponse.ok) throw new Error(saved.error || 'Não foi possível salvar o evento.');
        Object.assign(ev, saved);
      }
      showToast('Eventos salvos no banco de dados com sucesso.');
    } catch (error) {
      showToast(error.message || 'Erro ao salvar eventos.', 'error');
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  }

  function loadInitialData() {
    // contacts: prefer structured JSON; if only HTML fallback exists, parse it
    const raw = localStorage.getItem('contacts');
    if (raw) {
      try { contacts = JSON.parse(raw); } catch (e) { contacts = []; }
    } else {
      const html = localStorage.getItem('contacts_html');
      if (html) {
        // parse HTML into structured contacts
        try {
          const wrapper = document.createElement('div');
          wrapper.innerHTML = html;
          const nodes = wrapper.querySelectorAll('.contact-card');
          const parsed = [];
          if (nodes.length) {
            nodes.forEach(n => {
              const nameEl = n.querySelector('h3');
              const mailEl = n.querySelector('a[href^="mailto:"]');
              const ps = Array.from(n.querySelectorAll('p'));
              const phone = ps.length > 0 ? (ps.filter(p => !p.querySelector('a'))[0]?.textContent || '') : '';
              const address = ps.length > 1 ? (ps.filter(p => !p.querySelector('a'))[1]?.textContent || '') : '';
              parsed.push({ name: nameEl ? nameEl.textContent.trim() : '', email: mailEl ? (mailEl.getAttribute('href')||'').replace(/^mailto:/,'') : '', phone: phone.trim(), address: address.trim() });
            });
          } else {
            // fallback: try splitting top-level children
            Array.from(wrapper.children).forEach(n => {
              if (n.tagName.toLowerCase() === 'div') {
                const nameEl = n.querySelector('h3');
                const mailEl = n.querySelector('a[href^="mailto:"]');
                const ps = Array.from(n.querySelectorAll('p'));
                const phone = ps.length > 0 ? (ps.filter(p => !p.querySelector('a'))[0]?.textContent || '') : '';
                const address = ps.length > 1 ? (ps.filter(p => !p.querySelector('a'))[1]?.textContent || '') : '';
                parsed.push({ name: nameEl ? nameEl.textContent.trim() : '', email: mailEl ? (mailEl.getAttribute('href')||'').replace(/^mailto:/,'') : '', phone: phone.trim(), address: address.trim() });
              }
            });
          }
          contacts = parsed.length ? parsed : [{ name: '', email: '', phone: '', address: '' }];
        } catch (e) {
          contacts = [{ name: '', email: '', phone: '', address: '' }];
        }
      }
    }


  }

  async function loadEventsFromApi() {
    const response = await fetch('/api/events');
    if (!response.ok) throw new Error('Não foi possível carregar os eventos do banco de dados.');
    let records = await response.json();

    // Importa dados antigos deste navegador apenas quando o banco ainda está vazio.
    if (!records.length) {
      let legacy = [];
      try {
        const raw = localStorage.getItem('events');
        if (raw) legacy = JSON.parse(raw);
      } catch (error) { legacy = []; }
      if (!Array.isArray(legacy) || !legacy.length) {
        events = [];
        renderEvents();
        return;
      }
      for (const old of legacy) {
        const startDate = old.start || toISODate(old.date);
        if (!old.title || !startDate) continue;
        const form = new FormData();
        form.append('title', old.title || '');
        form.append('date', old.date || startDate);
        form.append('start', startDate);
        form.append('end', old.end || '');
        form.append('location', old.location || '');
        form.append('park', old.park || '');
        form.append('category', old.category || '');
        form.append('description', old.description || '');
        form.append('featured', old.featured ? 'true' : 'false');
        form.append('image', old.image || '');
        const imported = await fetch('/api/events', { method: 'POST', body: form });
        if (!imported.ok) continue;
      }
      const refreshed = await fetch('/api/events');
      if (!refreshed.ok) throw new Error('Não foi possível recarregar os eventos importados.');
      records = await refreshed.json();
    }
    events = records.map(ev => ({ ...ev, date: ev.date || ev.start || '', featured: !!ev.featured }));
    renderEvents();
  }

  // wire
  addContactBtn.addEventListener('click', () => addContact());
  addEventBtn.addEventListener('click', () => addEvent());
  saveContactsBtn.addEventListener('click', saveContacts);
  saveEventsBtn.addEventListener('click', saveEvents);
  loadContactsBtn.addEventListener('click', () => { loadInitialData(); renderContacts(); showToast('Contatos recarregados.'); });
  loadEventsBtn.addEventListener('click', async () => { try { await loadEventsFromApi(); showToast('Eventos recarregados do banco de dados.'); } catch (error) { showToast(error.message, 'error'); } });
  logoutBtn.addEventListener('click', () => { localStorage.removeItem('tv_auth'); window.location.href = 'login.html'; });

  // initial
  loadInitialData();
  if (!contacts.length) addContact();
  renderContacts();
  loadEventsFromApi().catch(error => { showToast(error.message || 'Não foi possível carregar os eventos.', 'error'); renderEvents(); });
});
