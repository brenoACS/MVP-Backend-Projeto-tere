// Mostrar botões de editar/remover nas páginas de parque quando admin autenticado
document.addEventListener('DOMContentLoaded', () => {
  function getAuth() {
    try { const raw = localStorage.getItem('tv_auth'); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }

  const auth = getAuth();
  if (!auth || auth.role !== 'admin') return;

  // mark page as admin-mode so CSS reveals admin controls
  try { document.body.classList.add('admin-mode'); } catch (e) { /* ignore */ }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  }

  // Referência aos itens originais de trilhas (na div oculta)
  const trailsDataContainer = document.querySelector('.trails-data');
  let trailItems = Array.from(document.querySelectorAll('.trails-data .trail-item'));
  let currentTrailIndex = 0;

  // Adicionar botão "Adicionar Trilha" na seção de trilhas
  function addNewTrailButton() {
    const trilhasSection = document.querySelector('.trilhas');
    console.log('[park-admin] trilhasSection encontrada:', !!trilhasSection);
    if (!trilhasSection) return;

    // Verifica se já existe o botão
    if (document.getElementById('add-trail-btn')) {
      console.log('[park-admin] Botão já existe, pulando criação');
      return;
    }

    const btnContainer = document.createElement('div');
    btnContainer.style.textAlign = 'center';
    btnContainer.style.marginTop = '20px';
    btnContainer.style.marginBottom = '10px';

    const addBtn = document.createElement('button');
    addBtn.id = 'add-trail-btn';
    addBtn.className = 'edit-btn primary';
    addBtn.textContent = '+ Adicionar Nova Trilha';
    addBtn.style.padding = '10px 20px';
    addBtn.style.fontSize = '16px';
    addBtn.addEventListener('click', (e) => {
      console.log('[park-admin] Botão Adicionar clicado');
      e.preventDefault();
      createNewTrail();
    });

    btnContainer.appendChild(addBtn);
    trilhasSection.insertBefore(btnContainer, trilhasSection.firstChild);
    console.log('[park-admin] Botão Adicionar Nova Trilha criado');
  }

  // Criar nova trilha
  function createNewTrail() {
    console.log('[park-admin] createNewTrail chamada');
    console.log('[park-admin] trailsDataContainer:', !!trailsDataContainer);
    
    if (!trailsDataContainer) {
      alert('Erro: Container de trilhas não encontrado.');
      return;
    }

    // Criar novo item de trilha vazio
    const newTrailItem = document.createElement('div');
    newTrailItem.className = 'trail-item';
    
    const trailImage = document.createElement('div');
    trailImage.className = 'trail-image';
    const img = document.createElement('img');
    img.src = './src/placeholder-trail.jpg'; // placeholder
    img.alt = 'Nova Trilha';
    trailImage.appendChild(img);

    const trailInfo = document.createElement('div');
    trailInfo.className = 'trail-info';
    
    const h3 = document.createElement('h3');
    h3.textContent = 'Nova Trilha';
    trailInfo.appendChild(h3);

    const recP = document.createElement('p');
    recP.className = 'trail-meta';
    recP.innerHTML = '<strong>Recomendada:</strong> ★★★☆☆';
    trailInfo.appendChild(recP);

    const diffP = document.createElement('p');
    diffP.className = 'trail-meta';
    diffP.innerHTML = '<strong>Dificuldade:</strong> Moderada';
    trailInfo.appendChild(diffP);

    const kmP = document.createElement('p');
    kmP.className = 'trail-meta';
    kmP.innerHTML = '<strong>Km:</strong> ~ 0 km';
    trailInfo.appendChild(kmP);

    const descP = document.createElement('p');
    descP.className = 'trail-desc';
    descP.textContent = 'Descrição da nova trilha.';
    trailInfo.appendChild(descP);

    newTrailItem.appendChild(trailImage);
    newTrailItem.appendChild(trailInfo);
    
    // Adiciona ao container de trilhas
    trailsDataContainer.appendChild(newTrailItem);
    
    // Atualiza a lista de trilhas
    trailItems = Array.from(document.querySelectorAll('.trails-data .trail-item'));
    
    // Obtém o índice da nova trilha (última da lista)
    const newIndex = trailItems.length - 1;
    
    // Atualiza o slider visível com a nova trilha
    const visibleInfo = document.querySelector('.trail-slide .trail-info');
    const visibleImg = document.querySelector('.trail-slide .trail-image img');
    
    if (visibleInfo && visibleImg) {
      // Mostra a imagem placeholder
      visibleImg.src = './src/placeholder-trail.jpg';
      visibleImg.alt = 'Nova Trilha';
      
      // Abre direto no modo de edição
      openNewTrailEditor(visibleInfo, newTrailItem, newIndex);
    }
  }

  // Abrir editor para nova trilha
  function openNewTrailEditor(visibleInfo, item, index) {
    console.log('[park-admin] Abrindo editor para nova trilha');
    
    currentTrailIndex = index;
    
    // Adiciona classe de edição
    visibleInfo.classList.add('card-editing');
    visibleInfo.innerHTML = '';
    
    // Título
    const title = document.createElement('h4');
    title.textContent = 'Cadastrar Nova Trilha';
    title.style.marginBottom = '12px';
    title.style.color = 'var(--accent)';
    visibleInfo.appendChild(title);
    
    // Campos de edição
    const nameInput = document.createElement('input');
    nameInput.className = 'inline-input';
    nameInput.placeholder = 'Nome da Trilha *';
    nameInput.style.marginBottom = '8px';
    
    const recInput = document.createElement('input');
    recInput.className = 'inline-input';
    recInput.placeholder = 'Recomendação (ex: ★★★★★)';
    recInput.value = '★★★☆☆';
    recInput.style.marginBottom = '8px';
    
    const diffInput = document.createElement('input');
    diffInput.className = 'inline-input';
    diffInput.placeholder = 'Dificuldade (ex: Difícil, Moderada, Fácil)';
    diffInput.value = 'Moderada';
    diffInput.style.marginBottom = '8px';
    
    const kmInput = document.createElement('input');
    kmInput.className = 'inline-input';
    kmInput.placeholder = 'Distância (ex: ~ 6,8 km)';
    kmInput.style.marginBottom = '8px';
    
    const descTextarea = document.createElement('textarea');
    descTextarea.className = 'inline-textarea';
    descTextarea.placeholder = 'Descrição da trilha';
    descTextarea.style.marginBottom = '8px';
    descTextarea.rows = 3;
    
    const imageInput = document.createElement('input');
    imageInput.className = 'inline-input';
    imageInput.placeholder = 'URL da imagem ou selecione arquivo abaixo';
    imageInput.value = './src/placeholder-trail.jpg';
    imageInput.style.marginBottom = '8px';
    
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.marginBottom = '8px';
    
    const preview = document.createElement('img');
    preview.className = 'img-preview';
    preview.src = './src/placeholder-trail.jpg';
    preview.style.display = 'block';
    preview.style.marginBottom = '8px';
    preview.style.maxWidth = '200px';
    preview.style.borderRadius = '4px';
    
    // File reader: quando usuário seleciona arquivo, converte para dataURL
    fileInput.addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      if (!f.type.startsWith('image/')) {
        alert('Selecione um arquivo de imagem válido.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        imageInput.value = reader.result; // data URL
        preview.src = reader.result;
        preview.style.display = 'block';
      };
      reader.readAsDataURL(f);
    });
    
    // Atualiza preview quando URL for digitada
    imageInput.addEventListener('input', () => {
      if (imageInput.value.trim()) {
        preview.src = imageInput.value.trim();
        preview.style.display = 'block';
      }
    });
    
    const removeImgBtn = document.createElement('button');
    removeImgBtn.className = 'edit-btn';
    removeImgBtn.textContent = 'Remover imagem';
    removeImgBtn.style.marginBottom = '8px';
    removeImgBtn.addEventListener('click', (e) => {
      e.preventDefault();
      imageInput.value = './src/placeholder-trail.jpg';
      preview.src = './src/placeholder-trail.jpg';
      preview.style.display = 'block';
      fileInput.value = null;
    });
    
    const hint = document.createElement('p');
    hint.className = 'small-muted';
    hint.textContent = '* Campos obrigatórios';
    hint.style.marginBottom = '8px';
    
    visibleInfo.appendChild(nameInput);
    visibleInfo.appendChild(recInput);
    visibleInfo.appendChild(diffInput);
    visibleInfo.appendChild(kmInput);
    visibleInfo.appendChild(descTextarea);
    visibleInfo.appendChild(imageInput);
    visibleInfo.appendChild(fileInput);
    visibleInfo.appendChild(preview);
    visibleInfo.appendChild(removeImgBtn);
    visibleInfo.appendChild(hint);
    
    // Botões de ação
    const actions = document.createElement('div');
    actions.className = 'inline-actions';
    actions.style.marginTop = '12px';
    
    const saveBtn = document.createElement('button');
    saveBtn.className = 'edit-btn primary';
    saveBtn.textContent = 'Salvar Trilha';
    saveBtn.addEventListener('click', () => {
      if (!nameInput.value.trim()) {
        alert('O nome da trilha é obrigatório.');
        nameInput.focus();
        return;
      }
      
      const newData = {
        name: nameInput.value.trim(),
        recommendation: recInput.value.trim(),
        difficulty: diffInput.value.trim(),
        km: kmInput.value.trim(),
        description: descTextarea.value.trim(),
        image: imageInput.value.trim(),
        imageAlt: nameInput.value.trim()
      };
      
      visibleInfo.classList.remove('card-editing');
      updateTrailItem(item, newData);
      
      // Atualiza também a imagem visível
      const visibleImg = document.querySelector('.trail-slide .trail-image img');
      if (visibleImg && newData.image) {
        visibleImg.src = newData.image;
        visibleImg.alt = newData.imageAlt || newData.name;
      }
      
      alert('Trilha criada com sucesso!');
    });
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'edit-btn';
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.addEventListener('click', () => {
      if (confirm('Deseja cancelar? A nova trilha será removida.')) {
        // Remove a trilha criada
        item.remove();
        trailItems = Array.from(document.querySelectorAll('.trails-data .trail-item'));
        
        // Volta para a primeira trilha
        if (trailItems.length > 0) {
          currentTrailIndex = 0;
          triggerSliderUpdate();
        } else {
          visibleInfo.innerHTML = '<p>Nenhuma trilha cadastrada.</p>';
        }
      }
    });
    
    actions.appendChild(saveBtn);
    actions.appendChild(cancelBtn);
    visibleInfo.appendChild(actions);
    
    // Foca no campo de nome
    setTimeout(() => nameInput.focus(), 100);
  }

  // Parser de trilhas para extrair dados estruturados do HTML
  function parseTrailInfo(item) {
    const info = item.querySelector('.trail-info');
    if (!info) return null;
    
    const h3 = info.querySelector('h3');
    const name = h3 ? h3.textContent.trim() : '';
    
    const metaEls = info.querySelectorAll('.trail-meta');
    let recommendation = '', difficulty = '', km = '';
    
    metaEls.forEach(meta => {
      const text = meta.textContent || '';
      if (text.includes('Recomendada:')) {
        recommendation = text.replace('Recomendada:', '').trim();
      } else if (text.includes('Dificuldade:')) {
        difficulty = text.replace('Dificuldade:', '').trim();
      } else if (text.includes('Km:')) {
        km = text.replace('Km:', '').trim();
      }
    });
    
    const descEl = info.querySelector('.trail-desc');
    const description = descEl ? descEl.textContent.trim() : '';
    
    const imgEl = item.querySelector('.trail-image img');
    const image = imgEl ? imgEl.getAttribute('src') : '';
    const imageAlt = imgEl ? imgEl.getAttribute('alt') : '';
    
    return { name, recommendation, difficulty, km, description, image, imageAlt };
  }

  // Função para atualizar o HTML da trilha com os novos dados (no item original)
  function updateTrailItem(item, data) {
    const info = item.querySelector('.trail-info');
    if (!info) return;
    
    // Limpa o conteúdo atual
    info.innerHTML = '';
    
    // Reconstrói o conteúdo
    const h3 = document.createElement('h3');
    h3.textContent = data.name || 'Trilha';
    info.appendChild(h3);
    
    if (data.recommendation) {
      const p = document.createElement('p');
      p.className = 'trail-meta';
      p.innerHTML = `<strong>Recomendada:</strong> ${escapeHtml(data.recommendation)}`;
      info.appendChild(p);
    }
    
    if (data.difficulty) {
      const p = document.createElement('p');
      p.className = 'trail-meta';
      p.innerHTML = `<strong>Dificuldade:</strong> ${escapeHtml(data.difficulty)}`;
      info.appendChild(p);
    }
    
    if (data.km) {
      const p = document.createElement('p');
      p.className = 'trail-meta';
      p.innerHTML = `<strong>Km:</strong> ${escapeHtml(data.km)}`;
      info.appendChild(p);
    }
    
    if (data.description) {
      const p = document.createElement('p');
      p.className = 'trail-desc';
      p.textContent = data.description;
      info.appendChild(p);
    }
    
    // Atualiza a imagem se houver
    if (data.image) {
      const imgEl = item.querySelector('.trail-image img');
      if (imgEl) {
        imgEl.setAttribute('src', data.image);
        if (data.imageAlt) imgEl.setAttribute('alt', data.imageAlt);
      }
    }
    
    // Força o slider a re-renderizar a trilha atual
    triggerSliderUpdate();
  }

  // Função para forçar atualização do slider
  function triggerSliderUpdate() {
    // Atualiza a lista de trilhas
    trailItems = Array.from(document.querySelectorAll('.trails-data .trail-item'));
    
    // Chama a função global do script.js para atualizar o slider
    if (window.updateTrailsSlider) {
      window.updateTrailsSlider(currentTrailIndex);
    }
    
    // Re-anexa os botões de admin
    const visibleInfo = document.querySelector('.trail-slide .trail-info');
    if (visibleInfo) {
      attachAdminButtons(visibleInfo, currentTrailIndex);
    }
  }
  
  // Removida função updateTrailDots - agora é feita pelo script.js

  // Função para iniciar edição de uma trilha
  function startEditTrail(index) {
    const item = trailItems[index];
    if (!item) return;
    
    const data = parseTrailInfo(item);
    if (!data) return;
    
    const visibleInfo = document.querySelector('.trail-slide .trail-info');
    if (!visibleInfo) return;
    
    // Adiciona classe de edição
    visibleInfo.classList.add('card-editing');
    visibleInfo.innerHTML = '';
    
    // Campos de edição
    const nameInput = document.createElement('input');
    nameInput.className = 'inline-input';
    nameInput.placeholder = 'Nome da Trilha';
    nameInput.value = data.name || '';
    nameInput.style.marginBottom = '8px';
    
    const recInput = document.createElement('input');
    recInput.className = 'inline-input';
    recInput.placeholder = 'Recomendação (ex: ★★★★★)';
    recInput.value = data.recommendation || '';
    recInput.style.marginBottom = '8px';
    
    const diffInput = document.createElement('input');
    diffInput.className = 'inline-input';
    diffInput.placeholder = 'Dificuldade (ex: Difícil, Moderada, Fácil)';
    diffInput.value = data.difficulty || '';
    diffInput.style.marginBottom = '8px';
    
    const kmInput = document.createElement('input');
    kmInput.className = 'inline-input';
    kmInput.placeholder = 'Distância (ex: ~ 6,8 km)';
    kmInput.value = data.km || '';
    kmInput.style.marginBottom = '8px';
    
    const descTextarea = document.createElement('textarea');
    descTextarea.className = 'inline-textarea';
    descTextarea.placeholder = 'Descrição da trilha';
    descTextarea.value = data.description || '';
    descTextarea.style.marginBottom = '8px';
    descTextarea.rows = 3;
    
    const imageInput = document.createElement('input');
    imageInput.className = 'inline-input';
    imageInput.placeholder = 'URL da imagem ou selecione arquivo abaixo';
    imageInput.value = data.image || '';
    imageInput.style.marginBottom = '8px';
    
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.marginBottom = '8px';
    
    const preview = document.createElement('img');
    preview.className = 'img-preview';
    if (data.image) {
      preview.src = data.image;
      preview.style.display = 'block';
    }
    preview.style.marginBottom = '8px';
    preview.style.maxWidth = '200px';
    preview.style.borderRadius = '4px';
    
    // File reader: quando usuário seleciona arquivo, converte para dataURL
    fileInput.addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      if (!f.type.startsWith('image/')) {
        alert('Selecione um arquivo de imagem válido.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        imageInput.value = reader.result; // data URL
        preview.src = reader.result;
        preview.style.display = 'block';
      };
      reader.readAsDataURL(f);
    });
    
    // Atualiza preview quando URL for digitada
    imageInput.addEventListener('input', () => {
      if (imageInput.value.trim()) {
        preview.src = imageInput.value.trim();
        preview.style.display = 'block';
      }
    });
    
    const removeImgBtn = document.createElement('button');
    removeImgBtn.className = 'edit-btn';
    removeImgBtn.textContent = 'Remover imagem';
    removeImgBtn.style.marginBottom = '8px';
    removeImgBtn.addEventListener('click', (e) => {
      e.preventDefault();
      imageInput.value = '';
      preview.src = '';
      preview.style.display = 'none';
      fileInput.value = null;
    });
    
    visibleInfo.appendChild(nameInput);
    visibleInfo.appendChild(recInput);
    visibleInfo.appendChild(diffInput);
    visibleInfo.appendChild(kmInput);
    visibleInfo.appendChild(descTextarea);
    visibleInfo.appendChild(imageInput);
    visibleInfo.appendChild(fileInput);
    visibleInfo.appendChild(preview);
    visibleInfo.appendChild(removeImgBtn);
    
    // Botões de ação
    const actions = document.createElement('div');
    actions.className = 'inline-actions';
    actions.style.marginTop = '12px';
    
    const saveBtn = document.createElement('button');
    saveBtn.className = 'edit-btn primary';
    saveBtn.textContent = 'Salvar';
    saveBtn.addEventListener('click', () => {
      if (!nameInput.value.trim()) {
        alert('O nome da trilha é obrigatório.');
        return;
      }
      
      const updatedData = {
        name: nameInput.value.trim(),
        recommendation: recInput.value.trim(),
        difficulty: diffInput.value.trim(),
        km: kmInput.value.trim(),
        description: descTextarea.value.trim(),
        image: imageInput.value.trim(),
        imageAlt: nameInput.value.trim()
      };
      
      visibleInfo.classList.remove('card-editing');
      updateTrailItem(item, updatedData);
      
      // Atualiza também a imagem visível
      const visibleImg = document.querySelector('.trail-slide .trail-image img');
      if (visibleImg && updatedData.image) {
        visibleImg.src = updatedData.image;
        visibleImg.alt = updatedData.imageAlt || updatedData.name;
      }
    });
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'edit-btn';
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.addEventListener('click', () => {
      visibleInfo.classList.remove('card-editing');
      triggerSliderUpdate();
    });
    
    actions.appendChild(saveBtn);
    actions.appendChild(cancelBtn);
    visibleInfo.appendChild(actions);
  }

  // Função para anexar botões de admin ao elemento visível do slider
  function attachAdminButtons(infoEl, index) {
    if (!infoEl) return;
    
    // Remove botões existentes se houver
    const existing = infoEl.querySelector('.admin-trail-actions');
    if (existing) existing.remove();
    
    const box = document.createElement('div');
    box.className = 'admin-trail-actions';
    box.style.marginTop = '8px';
    
    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'edit-btn';
    editBtn.textContent = 'Editar';
    editBtn.addEventListener('click', () => startEditTrail(index));
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'edit-btn';
    removeBtn.textContent = 'Remover';
    removeBtn.addEventListener('click', () => {
      if (confirm('Deseja realmente excluir esta trilha?')) {
        trailItems[index].remove();
        // Força reload da página para atualizar o slider
        location.reload();
      }
    });
    
    box.appendChild(editBtn);
    box.appendChild(removeBtn);
    infoEl.appendChild(box);
  }

  // Observer para detectar quando o slider atualiza o conteúdo
  function observeSlider() {
    const visibleInfo = document.querySelector('.trail-slide .trail-info');
    if (!visibleInfo) {
      // Tenta novamente após um delay
      setTimeout(observeSlider, 500);
      return;
    }

    // Anexa botões inicialmente
    attachAdminButtons(visibleInfo, 0);

    // Observa mudanças no conteúdo
    const observer = new MutationObserver(() => {
      // Atualiza a lista de trilhas sempre que o observer detecta mudança
      trailItems = Array.from(document.querySelectorAll('.trails-data .trail-item'));
      
      // Detecta qual trilha está sendo exibida baseado no conteúdo
      const h3Text = visibleInfo.querySelector('h3')?.textContent || '';
      const index = trailItems.findIndex(item => {
        const itemH3 = item.querySelector('.trail-info h3')?.textContent || '';
        return itemH3 === h3Text;
      });
      
      if (index !== -1) {
        currentTrailIndex = index;
        // Remove botões existentes antes de adicionar novos
        const existing = visibleInfo.querySelector('.admin-trail-actions');
        if (!existing) {
          attachAdminButtons(visibleInfo, index);
        }
      }
    });

    observer.observe(visibleInfo, { childList: true, subtree: true });
  }

  // Adiciona botão de nova trilha
  addNewTrailButton();

  // Inicia observação após o DOM estar pronto
  if (trailItems.length > 0) {
    setTimeout(observeSlider, 100);
  }
});
