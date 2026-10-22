// Carrega conteúdo editável salvo em localStorage para as páginas públicas
document.addEventListener('DOMContentLoaded', () => {
  console.log('[content-load] DOMContentLoaded');
  function getAuth() {
    try { const raw = localStorage.getItem('tv_auth'); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }

  const isAdmin = (() => { const a = getAuth(); return a && a.role === 'admin'; })();

  // helpers
  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  }
  function normalizeText(s) {
    if (!s) return '';
    try {
      return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    } catch (e) { return String(s).toLowerCase().trim(); }
  }
  function parseDateFromString(s) {
    if (!s) return null;
    try {
      const str = String(s).trim();
      // if format YYYY-MM-DD
      const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (isoMatch) return new Date(str);
      // if format dd/mm/yyyy
      const dm = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (dm) {
        const dd = parseInt(dm[1],10), mm = parseInt(dm[2],10)-1, yy = parseInt(dm[3],10);
        return new Date(yy, mm, dd);
      }
      // if it's a range like 'dd/mm/yyyy — dd/mm/yyyy' take the first
      if (str.indexOf('—') !== -1) {
        return parseDateFromString(str.split('—')[0].trim());
      }
      // fallback to Date parse
      const d = new Date(str);
      return isNaN(d.getTime()) ? null : d;
    } catch (e) { return null; }
  }

  function saveContactsToStorage(arr) {
    try {
      localStorage.setItem('contacts', JSON.stringify(arr));
      const html = arr.map(c => `<div class=\"contact-card\"><h3>${escapeHtml(c.name||'')}</h3>${c.email?`<p><a href=\"mailto:${escapeHtml(c.email)}\">${escapeHtml(c.email)}</a></p>`:''}${c.phone?`<p>${escapeHtml(c.phone)}</p>`:''}${c.address?`<p>${escapeHtml(c.address)}</p>`:''}</div>`).join('\n');
      localStorage.setItem('contacts_html', html);
    } catch (e) { /* ignore */ }
  }

  async function saveEventsToStorage(arr) {
    const response = await fetch('/api/events');
    if (!response.ok) throw new Error('Não foi possível consultar os eventos.');
    const storedEvents = await response.json();
    const currentIds = new Set(arr.filter(ev => ev.id != null).map(ev => String(ev.id)));

    for (const stored of storedEvents) {
      if (!currentIds.has(String(stored.id))) {
        const removed = await fetch(`/api/events/${stored.id}`, { method: 'DELETE' });
        if (!removed.ok && removed.status !== 404) throw new Error('Não foi possível excluir um evento.');
      }
    }

    for (const ev of arr) {
      const form = new FormData();
      ['title', 'date', 'start', 'end', 'location', 'park', 'category', 'description'].forEach(key => {
        form.append(key, ev[key] == null ? '' : String(ev[key]));
      });
      form.append('featured', ev.featured ? 'true' : 'false');
      if (ev._removeImage) form.append('removeImage', 'true');

      if (ev._imageFile instanceof File) {
        form.append('imageFile', ev._imageFile);
      } else if (typeof ev.image === 'string' && ev.image.startsWith('data:image/')) {
        const parts = ev.image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
        if (parts) {
          const bytes = Uint8Array.from(atob(parts[2]), char => char.charCodeAt(0));
          const extension = parts[1].split('/')[1].replace('jpeg', 'jpg');
          form.append('imageFile', new File([bytes], `evento.${extension}`, { type: parts[1] }));
        }
      } else {
        form.append('image', ev.image || '');
      }

      const method = ev.id == null ? 'POST' : 'PUT';
      const url = ev.id == null ? '/api/events' : `/api/events/${ev.id}`;
      const savedResponse = await fetch(url, { method, body: form });
      const saved = await savedResponse.json().catch(() => ({}));
      if (!savedResponse.ok) throw new Error(saved.error || 'Não foi possível salvar o evento.');
      Object.assign(ev, saved);
      delete ev._imageFile;
      delete ev._removeImage;
    }

    try { localStorage.setItem('events', JSON.stringify(arr)); } catch (e) { /* ignore */ }
  }
  // parse fallback HTML into structured objects (used when JSON not present)
  function parseContactsHtml(html) {
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
          const texts = ps.map(p => p.textContent.trim());
          const email = mailEl ? (mailEl.getAttribute('href')||'').replace(/^mailto:/,'') : '';
          // remove email paragraph from texts
          const nonMail = ps.filter(p => !p.querySelector('a')).map(p=>p.textContent.trim());
          const phone = nonMail[0] || '';
          const address = nonMail[1] || '';
          parsed.push({ name: nameEl?nameEl.textContent.trim(): '', email, phone, address });
        });
      }
      return parsed;
    } catch (e) { return []; }
  }

  function parseEventsHtml(html) {
    try {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = html;
      const nodes = wrapper.querySelectorAll('.event-card');
      const parsed = [];
      if (nodes.length) {
        nodes.forEach(n => {
          const titleEl = n.querySelector('h3');
          const metaEl = n.querySelector('.event-meta');
          const descEl = n.querySelector('p');
          // prefer explicit data-attributes if present
          const start = n.dataset.start || '';
          const end = n.dataset.end || '';
          const park = n.dataset.park || '';
          const category = n.dataset.category || '';
          const location = n.dataset.location || '';
            // try to read image src if present in fallback HTML
            const imgEl = n.querySelector('img');
            const image = imgEl ? (imgEl.getAttribute('src') || '') : '';
            // try to read featured flag if present
            const featuredRaw = (typeof n.dataset.featured !== 'undefined') ? String(n.dataset.featured) : undefined;
            const featured = (typeof featuredRaw === 'undefined') ? undefined : (featuredRaw === 'true' || featuredRaw === '1');
            // fallback to parsing visible meta text
          let dateDisplay = '';
          if (metaEl) {
            const txt = metaEl.textContent || '';
            const parts = txt.split('—').map(s=>s.trim());
            if (!start && parts[0]) dateDisplay = parts[0] || '';
          }
          parsed.push({ title: titleEl?titleEl.textContent.trim(): '', date: dateDisplay, start, end, park, category, location, image, featured, description: descEl?descEl.textContent.trim(): '' });
        });
      }
      return parsed;
    } catch (e) { return []; }
  }

  // Render contacts with inline edit controls for admin
  const contactsEl = document.getElementById('editable-contacts');
  if (contactsEl) {
    let contacts = [];
    const raw = localStorage.getItem('contacts');
    if (raw) {
      try { contacts = JSON.parse(raw); } catch (e) { contacts = []; }
    } else {
      const fallback = localStorage.getItem('contacts_html');
      if (fallback) contacts = parseContactsHtml(fallback);
    }

    function renderContacts() {
      contactsEl.innerHTML = '';
      // admin toolbar
      if (isAdmin) {
        const bar = document.createElement('div'); bar.className = 'edit-bar';
        const addBtn = document.createElement('button'); addBtn.className = 'edit-btn primary'; addBtn.textContent = 'Adicionar Contato';
        addBtn.addEventListener('click', () => { contacts.push({ name:'', email:'', phone:'', address:'' }); renderContacts(); startEdit(contacts.length-1); });
        const saveAll = document.createElement('button'); saveAll.className = 'edit-btn'; saveAll.textContent = 'Salvar Alterações';
        saveAll.addEventListener('click', () => { saveContactsToStorage(contacts); window.location.reload(); });
        bar.appendChild(addBtn); bar.appendChild(saveAll);
        contactsEl.appendChild(bar);
      }

      if (!contacts.length) {
        const empty = document.createElement('div'); empty.className = 'small-muted'; empty.textContent = 'Nenhum contato cadastrado.'; contactsEl.appendChild(empty); return;
      }

      contacts.forEach((c, idx) => {
        const card = document.createElement('div'); card.className = 'contact-card';
        const title = document.createElement('h3'); title.textContent = c.name || 'Contato'; card.appendChild(title);
        if (c.email) { const p = document.createElement('p'); p.innerHTML = `<a href=\"mailto:${escapeHtml(c.email)}\">${escapeHtml(c.email)}</a>`; card.appendChild(p); }
        if (c.phone) { const p = document.createElement('p'); p.textContent = c.phone; card.appendChild(p); }
        if (c.address) { const p = document.createElement('p'); p.textContent = c.address; card.appendChild(p); }

        if (isAdmin) {
          const actions = document.createElement('div'); actions.className = 'inline-actions';
          const editBtn = document.createElement('button'); editBtn.className = 'edit-btn'; editBtn.textContent = 'Editar';
          editBtn.addEventListener('click', () => startEdit(idx));
          const delBtn = document.createElement('button'); delBtn.className = 'edit-btn'; delBtn.textContent = 'Remover';
          delBtn.addEventListener('click', () => { if (confirm('Deseja realmente excluir este contato?')) { contacts.splice(idx,1); saveContactsToStorage(contacts); renderContacts(); } });
          actions.appendChild(editBtn); actions.appendChild(delBtn); card.appendChild(actions);
        }

        contactsEl.appendChild(card);
      });
    }

    function startEdit(idx) {
      const current = contacts[idx];
      const cards = contactsEl.querySelectorAll('.contact-card');
      const card = cards[idx];
      if (!card) return renderContacts();
      card.classList.add('card-editing');
      card.innerHTML = '';
      const nameIn = document.createElement('input'); nameIn.className='inline-input'; nameIn.placeholder='Nome'; nameIn.value = current.name||'';
      const emailIn = document.createElement('input'); emailIn.className='inline-input'; emailIn.placeholder='E-mail'; emailIn.value = current.email||'';
      const phoneIn = document.createElement('input'); phoneIn.className='inline-input'; phoneIn.placeholder='Telefone'; phoneIn.value = current.phone||'';
      const addrIn = document.createElement('textarea'); addrIn.className='inline-textarea'; addrIn.placeholder='Endereço'; addrIn.value = current.address||'';
      card.appendChild(nameIn); card.appendChild(emailIn); card.appendChild(phoneIn); card.appendChild(addrIn);
      const actions = document.createElement('div'); actions.className='inline-actions';
      const saveBtn = document.createElement('button'); saveBtn.className='edit-btn primary'; saveBtn.textContent='Salvar';
      const cancelBtn = document.createElement('button'); cancelBtn.className='edit-btn'; cancelBtn.textContent='Cancelar';
      saveBtn.addEventListener('click', () => {
        // basic validation: name or email
        if (!(nameIn.value.trim() || emailIn.value.trim())) { alert('Informe nome ou e-mail.'); return; }
        contacts[idx] = { name: nameIn.value.trim(), email: emailIn.value.trim(), phone: phoneIn.value.trim(), address: addrIn.value.trim() };
        saveContactsToStorage(contacts);
        renderContacts();
      });
      cancelBtn.addEventListener('click', () => renderContacts());
      actions.appendChild(saveBtn); actions.appendChild(cancelBtn); card.appendChild(actions);
    }

    renderContacts();
  }

  // Render events with inline edit controls for admin
  const eventsEl = document.getElementById('editable-events');
  const featuredEl = document.getElementById('featured-events');
  if (eventsEl) {
    let events = [];

    function toIsoDate(value) {
      if (!value) return '';
      const text = String(value).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
      const match = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (match) return `${match[3]}-${String(match[2]).padStart(2, '0')}-${String(match[1]).padStart(2, '0')}`;
      return '';
    }

    async function loadEventsFromApi() {
      const response = await fetch('/api/events');
      if (!response.ok) throw new Error('Não foi possível carregar os eventos.');
      let records = await response.json();
      if (!records.length) {
        const raw = localStorage.getItem('events');
        if (raw) {
          try { records = JSON.parse(raw); } catch (e) { records = []; }
        } else {
          const fallback = localStorage.getItem('events_html');
          if (fallback) records = parseEventsHtml(fallback);
        }
        if (records.length) {
          records = records.map(({ id, ...ev }) => ({
            ...ev,
            start: ev.start || toIsoDate(ev.date),
            end: ev.end || '',
            featured: ev.featured === true || ev.featured === 'true' || ev.featured === 1 || ev.featured === '1'
          }));
          await saveEventsToStorage(records);
        }
      }
      events = records.map(ev => ({
        ...ev,
        start: ev.start || toIsoDate(ev.date),
        end: ev.end || '',
        featured: ev.featured === true || ev.featured === 'true' || ev.featured === 1 || ev.featured === '1'
      }));
      renderEvents();
    }

    // local filter state to avoid race when recreating DOM controls
    let filterState = { park: 'all', category: 'all', start: '', end: '' };

    function renderEvents() {
      console.log('[content-load] renderEvents start, events length=', events.length);
      eventsEl.innerHTML = '';
      // ensure filter container exists (we just cleared eventsEl so recreate/reattach)
      let filterBarEl = document.getElementById('filter-bar');
      if (!filterBarEl) {
        filterBarEl = document.createElement('div');
        filterBarEl.id = 'filter-bar';
        filterBarEl.className = 'filter-bar';
        eventsEl.appendChild(filterBarEl);
      } else {
        if (!eventsEl.contains(filterBarEl)) eventsEl.appendChild(filterBarEl);
      }
      // read filter values from state (updated by control events)
      const parkVal = filterState.park || 'all';
      const catVal = filterState.category || 'all';
      const startVal = filterState.start || '';
      const endVal = filterState.end || '';
        function buildFilterControls() {
          console.log('[content-load] buildFilterControls, filterBarEl=', !!filterBarEl);
          if (!filterBarEl) return;
          filterBarEl.innerHTML = '';
          const parks = Array.from(new Set(events.map(e => (e.park || e.location || '').trim()).filter(Boolean)));
          const existingCats = Array.from(new Set(events.map(e => (e.category || '').trim()).filter(Boolean)));
          const defaultCats = ['Cultura','Trilha','Esporte','Lazer'];
          const cats = defaultCats.concat(existingCats.filter(c=>!defaultCats.includes(c)));

          // label + icon
          const label = document.createElement('div'); label.className = 'filter-label';
          label.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden><path d="M10 18h4v-2h-4v2zm-7-7h18v-2H3v2zm3-7v2h12V4H6z" fill="currentColor"/></svg><span style="margin-left:8px;font-weight:700;color:var(--texto);">Filtrar</span>';

          const parkSelect = document.createElement('select'); parkSelect.id = 'filter-park'; parkSelect.className='filter-select';
          const optAll = document.createElement('option'); optAll.value='all'; optAll.textContent='Parque'; parkSelect.appendChild(optAll);
          parks.forEach(p => { const o = document.createElement('option'); o.value = p; o.textContent = p; parkSelect.appendChild(o); });

          const catSelect = document.createElement('select'); catSelect.id='filter-cat'; catSelect.className='filter-select';
          const oAll = document.createElement('option'); oAll.value='all'; oAll.textContent='Categorias'; catSelect.appendChild(oAll);
          cats.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; catSelect.appendChild(o); });

          const startInp = document.createElement('input'); startInp.type='date'; startInp.id='filter-start'; startInp.className='filter-date'; startInp.placeholder='Data início';
          const endInp = document.createElement('input'); endInp.type='date'; endInp.id='filter-end'; endInp.className='filter-date'; endInp.placeholder='Data fim';
          const clearBtn = document.createElement('button'); clearBtn.className='edit-btn'; clearBtn.textContent='Limpar filtros';

          // set control values from state
          if (parkVal) parkSelect.value = parkVal;
          if (catVal) catSelect.value = catVal;
          if (startVal) startInp.value = startVal;
          if (endVal) endInp.value = endVal;

          // when filters change, update state then re-render
          parkSelect.addEventListener('change', (e) => { filterState.park = e.target.value || 'all'; renderEvents(); });
          catSelect.addEventListener('change', (e) => { filterState.category = e.target.value || 'all'; renderEvents(); });
          startInp.addEventListener('change', (e) => { filterState.start = e.target.value || ''; renderEvents(); });
          endInp.addEventListener('change', (e) => { filterState.end = e.target.value || ''; renderEvents(); });
          clearBtn.addEventListener('click', (e) => { e.preventDefault(); filterState = { park:'all', category:'all', start:'', end:'' }; renderEvents(); });

          filterBarEl.appendChild(label);
          console.log('[content-load] filter controls appended');
          filterBarEl.appendChild(parkSelect);
          filterBarEl.appendChild(catSelect);
          filterBarEl.appendChild(startInp);
          filterBarEl.appendChild(endInp);
          filterBarEl.appendChild(clearBtn);
        }
        // initial build
        buildFilterControls();

      function passesFilter(ev) {
        // park/location filter
        if (parkVal && parkVal !== 'all') {
          const loc = (ev.park || ev.location || '').trim();
          const matchPark = loc && (normalizeText(loc) === normalizeText(parkVal));
          console.log('[content-load] park filter:', { parkVal, evPark: loc, matchPark });
          if (!matchPark) return false;
        }
        // category
        if (catVal && catVal !== 'all') {
          const evCat = (ev.category || '').trim();
          const matchCat = evCat && (normalizeText(evCat) === normalizeText(catVal));
          console.log('[content-load] cat filter:', { catVal, evCat, matchCat });
          if (!matchCat) return false;
        }
        // date range
        if (startVal) {
          const dEv = parseDateFromString(ev.start || ev.date);
          const dStart = new Date(startVal);
          if (!dEv || dEv < dStart) return false;
        }
        if (endVal) {
          const dEv = parseDateFromString(ev.start || ev.date);
          const dEnd = new Date(endVal);
          // include the end date whole day
          if (!dEv || dEv > new Date(dEnd.getFullYear(), dEnd.getMonth(), dEnd.getDate(), 23,59,59)) return false;
        }
        return true;
      }
      // render featured area if present
      if (featuredEl) {
        featuredEl.innerHTML = '';
        // apply filters to decide which events are considered for featured
        const candidates = events.map((ev, i) => ({ ev, i })).filter(o => passesFilter(o.ev));
        // prefer events explicitly marked as featured among the filtered set; fallback to first 3 filtered
        // show only explicitly featured events (no fallback to first items)
        let featured = candidates.filter(o => {
          const f = o.ev.featured;
          if (typeof f === 'string') return (normalizeText(f) === 'true' || f === '1');
          return !!f;
        }).map(o => o.ev);
        featured.slice(0,3).forEach((ev) => {
          const card = document.createElement('div'); card.className = 'featured-card';
          if (ev.image) { const img = document.createElement('img'); img.src = ev.image; img.alt = ev.title || 'Imagem'; card.appendChild(img); }
          const badge = document.createElement('div'); badge.className = 'badge'; badge.textContent = ev.category || 'Evento';
          const datePill = document.createElement('div'); datePill.className = 'date-pill'; datePill.textContent = ev.date || '';
          const title = document.createElement('div'); title.className = 'title'; title.textContent = ev.title || '';
          card.appendChild(badge); card.appendChild(datePill); card.appendChild(title);
          if (isAdmin) {
            const actions = document.createElement('div'); actions.className = 'featured-actions';
            const idx = events.indexOf(ev);
            const editBtn = document.createElement('button'); editBtn.className='edit-btn'; editBtn.textContent='Editar'; editBtn.addEventListener('click', () => startEditEvent(idx));
            const delBtn = document.createElement('button'); delBtn.className='edit-btn'; delBtn.textContent='Remover'; delBtn.addEventListener('click', async ()=>{ if (confirm('Deseja realmente excluir este evento?')) { events.splice(idx,1); try { await saveEventsToStorage(events); renderEvents(); } catch (error) { alert(error.message); } } });
            actions.appendChild(editBtn); actions.appendChild(delBtn); card.appendChild(actions);
          }
          featuredEl.appendChild(card);
        });
      }
      if (isAdmin) {
        const bar = document.createElement('div'); bar.className = 'edit-bar';
        const addBtn = document.createElement('button'); addBtn.className = 'edit-btn primary'; addBtn.textContent = 'Adicionar Evento';
        addBtn.addEventListener('click', () => { events.push({ title:'', date:'', start:'', end:'', location:'', park:'', description:'', image:'', featured:false, category:'' }); renderEvents(); startEditEvent(events.length-1); });
        const saveAll = document.createElement('button'); saveAll.className = 'edit-btn'; saveAll.textContent = 'Salvar Alterações';
        saveAll.addEventListener('click', async () => { try { await saveEventsToStorage(events); window.location.reload(); } catch (error) { alert(error.message); } });
        bar.appendChild(addBtn); bar.appendChild(saveAll); eventsEl.appendChild(bar);
      }

      // render only events that pass filters
      const filtered = events.map((ev, i) => ({ ev, i })).filter(o => passesFilter(o.ev));
      if (!filtered.length) { const empty = document.createElement('div'); empty.className='small-muted'; empty.textContent='Nenhum evento cadastrado.'; eventsEl.appendChild(empty); return; }

      // render events as a responsive grid (two columns on desktop)
      const grid = document.createElement('div'); grid.className = 'events-grid';
      filtered.forEach(({ ev, i: idx }) => {
        const card = document.createElement('div'); card.className='event-card'; card.dataset.index = String(idx);
        // image (full width)
        if (ev.image) {
          const img = document.createElement('img'); img.className = 'event-thumb'; img.src = ev.image; img.alt = ev.title || 'Imagem do evento'; card.appendChild(img);
        }
        // category badge (we append overlay badge only when there is an image;
        // otherwise it will be inserted inline inside the content so it doesn't
        // overlap the title)
        const badge = document.createElement('div'); badge.className = 'badge'; badge.textContent = ev.category || 'Evento';

        const content = document.createElement('div'); content.className = 'card-content';
        const title = document.createElement('h3'); title.textContent = ev.title || 'Evento'; content.appendChild(title);

        // place badge: overlay on the image when image exists, otherwise inline
        if (ev.image) {
          card.appendChild(badge);
        } else {
          badge.classList.add('badge-inline');
          content.insertBefore(badge, title);
        }

        // meta row with calendar and location icons
        const meta = document.createElement('div'); meta.className = 'meta-row';
        const cal = document.createElement('span'); cal.className = 'meta-item meta-date';
        cal.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden><path d="M7 10h5v5H7z" fill="currentColor" opacity="0.08"/><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-1.99.9-1.99 2L3 20c0 1.1.89 2 1.99 2H19c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z" fill="currentColor"/></svg> ' + (ev.date || '');
        const loc = document.createElement('span'); loc.className = 'meta-item meta-loc';
        loc.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" fill="currentColor"/></svg> ' + (ev.location || '');
        meta.appendChild(cal); meta.appendChild(loc);
        content.appendChild(meta);

        if (ev.description) { const p = document.createElement('p'); p.className='meta-desc'; p.textContent = ev.description; content.appendChild(p); }

        if (isAdmin) {
          const actions = document.createElement('div'); actions.className='inline-actions';
          const editBtn = document.createElement('button'); editBtn.className='edit-btn'; editBtn.textContent='Editar'; editBtn.addEventListener('click', ()=>startEditEvent(idx));
          const delBtn = document.createElement('button'); delBtn.className='edit-btn'; delBtn.textContent='Remover'; delBtn.addEventListener('click', async ()=>{ if (confirm('Deseja realmente excluir este evento?')) { events.splice(idx,1); try { await saveEventsToStorage(events); renderEvents(); } catch (error) { alert(error.message); } } });
          actions.appendChild(editBtn); actions.appendChild(delBtn);
          content.appendChild(actions);
        }

        card.appendChild(content);
        grid.appendChild(card);
      });
      eventsEl.appendChild(grid);
    }

    function startEditEvent(idx) {
      const current = events[idx];
      let card = eventsEl.querySelector(`.event-card[data-index="${idx}"]`);
      if (!card) { filterState = { park: 'all', category: 'all', start: '', end: '' }; renderEvents(); card = eventsEl.querySelector(`.event-card[data-index="${idx}"]`); }
      if (!card) return;
      card.classList.add('card-editing');
      card.innerHTML = '';
      const titleIn = document.createElement('input'); titleIn.className='inline-input'; titleIn.placeholder='Título'; titleIn.value = current.title||'';
      const startIn = document.createElement('input'); startIn.className='inline-input'; startIn.type='date'; startIn.placeholder='Data início'; startIn.value = current.start || current.date || '';
      const endIn = document.createElement('input'); endIn.className='inline-input'; endIn.type='date'; endIn.placeholder='Data fim (opcional)'; endIn.value = current.end || '';
      const locIn = document.createElement('input'); locIn.className='inline-input'; locIn.placeholder='Local'; locIn.value = current.location||'';
      const parkIn = document.createElement('input'); parkIn.className='inline-input'; parkIn.placeholder='Parque (ex: Serra dos Órgãos)'; parkIn.value = current.park||'';
      const categoryIn = document.createElement('input'); categoryIn.className='inline-input'; categoryIn.placeholder='Categoria (ex: Trilha)'; categoryIn.value = current.category||'';

      // image URL input (kept for flexibility) and file upload input
      const imgIn = document.createElement('input'); imgIn.className='inline-input'; imgIn.placeholder='URL da imagem (opcional)'; imgIn.value = current.image||'';
      const fileIn = document.createElement('input'); fileIn.type = 'file'; fileIn.accept = 'image/*'; fileIn.style.marginTop = '8px'; fileIn.title = 'Arraste uma imagem para este campo ou clique para selecionar';
      const preview = document.createElement('img'); preview.className = 'img-preview';
      if (current.image) { preview.src = current.image; preview.style.display = 'block'; }

      // checkbox to mark featured
      const featuredIn = document.createElement('label'); featuredIn.style.display = 'inline-block'; featuredIn.style.margin = '8px 0'; const featCheckbox = document.createElement('input'); featCheckbox.type='checkbox'; featCheckbox.style.marginRight='8px'; featCheckbox.checked = !!current.featured; featuredIn.appendChild(featCheckbox); featuredIn.appendChild(document.createTextNode('Destacar evento'));

      const descIn = document.createElement('textarea'); descIn.className='inline-textarea'; descIn.placeholder='Descrição'; descIn.value = current.description||'';

      let selectedImageFile = null;
      imgIn.addEventListener('input', () => {
        if (!imgIn.value.startsWith('data:image/')) selectedImageFile = null;
        current._removeImage = false;
        if (imgIn.value) { preview.src = imgIn.value; preview.style.display = 'block'; }
        else { preview.removeAttribute('src'); preview.style.display = 'none'; }
      });
      function previewImageFile(file) {
        if (!file) return;
        if (!file.type.startsWith('image/')) { alert('Selecione um arquivo de imagem válido.'); return; }
        selectedImageFile = file;
        current._removeImage = false;
        const reader = new FileReader();
        reader.onload = () => {
          imgIn.value = reader.result;
          preview.src = reader.result;
          preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
      }
      fileIn.addEventListener('change', (e) => previewImageFile(e.target.files && e.target.files[0]));
      [fileIn, preview].forEach(target => {
        target.addEventListener('dragover', event => { event.preventDefault(); });
        target.addEventListener('drop', event => {
          event.preventDefault();
          const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
          if (file) {
            previewImageFile(file);
            try { fileIn.files = event.dataTransfer.files; } catch (e) { /* ignore */ }
          }
        });
      });

      const removeImgBtn = document.createElement('button'); removeImgBtn.className = 'edit-btn'; removeImgBtn.textContent = 'Remover imagem'; removeImgBtn.style.marginLeft = '8px';
      removeImgBtn.addEventListener('click', (ev) => { ev.preventDefault(); imgIn.value = ''; preview.src = ''; preview.style.display = 'none'; fileIn.value = null; selectedImageFile = null; current._removeImage = true; });

      card.appendChild(titleIn);
      const row = document.createElement('div'); row.className='field-row'; row.appendChild(startIn); row.appendChild(endIn); row.appendChild(locIn); card.appendChild(row);
      const row2 = document.createElement('div'); row2.className='field-row'; row2.appendChild(parkIn); row2.appendChild(categoryIn); card.appendChild(row2);
      card.appendChild(imgIn);
      card.appendChild(fileIn);
      card.appendChild(preview);
      card.appendChild(removeImgBtn);
      card.appendChild(featuredIn);
      card.appendChild(descIn);

      const actions = document.createElement('div'); actions.className='inline-actions';
      const saveBtn = document.createElement('button'); saveBtn.className='edit-btn primary'; saveBtn.textContent='Salvar';
      const cancelBtn = document.createElement('button'); cancelBtn.className='edit-btn'; cancelBtn.textContent='Cancelar';
      saveBtn.addEventListener('click', async ()=>{
        if (!titleIn.value.trim() || !startIn.value.trim()) { alert('Título e data de início são obrigatórios.'); return; }
        // format a human-friendly date string
        function fmt(d) { if (!d) return ''; try { const dt = new Date(d); return dt.toLocaleDateString('pt-BR'); } catch(e){ return d; } }
        const displayDate = startIn.value ? (fmt(startIn.value) + (endIn.value ? ' — '+fmt(endIn.value) : '')) : (current.date||'');
        events[idx] = {
          title: titleIn.value.trim(),
          date: displayDate,
          start: startIn.value || '',
          end: endIn.value || '',
          location: locIn.value.trim(),
          park: parkIn.value.trim(),
          category: categoryIn.value.trim(),
          description: descIn.value.trim(),
          image: selectedImageFile ? (current.image || '') : imgIn.value.trim(),
          _imageFile: selectedImageFile || undefined,
          _removeImage: current._removeImage || false,
          featured: !!featCheckbox.checked,
          id: current.id
        };
        try { await saveEventsToStorage(events); renderEvents(); } catch (error) { alert(error.message); }
      });
      cancelBtn.addEventListener('click', ()=>renderEvents());
      actions.appendChild(saveBtn); actions.appendChild(cancelBtn); card.appendChild(actions);
    }

    loadEventsFromApi().catch(err => {
      console.error('[content-load] Não foi possível carregar eventos:', err);
      renderEvents();
    });
  }
});
