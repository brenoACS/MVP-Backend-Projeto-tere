// ===== Slider Script =====
const slides = Array.from(document.querySelectorAll('.slide'));
const titleEl = document.querySelector('.title');
const leftBtn = document.querySelector('.arrow.left');
const rightBtn = document.querySelector('.arrow.right');
const dotsContainer = document.querySelector('.dots');
let index = 0;
let timer = null;
// Só inicializa o slider principal se os elementos existirem nesta página
if (slides.length && titleEl && leftBtn && rightBtn && dotsContainer) {
  // Criar dots dinamicamente
  function createDots() {
    slides.forEach((_, i) => {
      const dot = document.createElement('div');
      dot.className = 'dot' + (i === 0 ? ' active' : '');
      dot.dataset.index = i;
      dot.addEventListener('click', () => goToSlide(i));
      dotsContainer.appendChild(dot);
    });
  }

  // Atualizar slider
  function updateSlider() {
    slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === index);
    });

    const activeSlide = slides[index];
    const newTitle = activeSlide ? activeSlide.dataset.title || '' : '';
    titleEl.textContent = newTitle;

    document.querySelectorAll('.dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
  }

  // Controle
  function prevSlide() {
    index = (index - 1 + slides.length) % slides.length;
    updateSlider();
    resetTimer();
  }

  function nextSlide() {
    index = (index + 1) % slides.length;
    updateSlider();
    resetTimer();
  }

  function goToSlide(i) {
    index = i;
    updateSlider();
    resetTimer();
  }

  // Auto-play
  function resetTimer() {
    clearInterval(timer);
    timer = setInterval(nextSlide, 6000);
  }

  // Eventos
  leftBtn.addEventListener('click', prevSlide);
  rightBtn.addEventListener('click', nextSlide);

  // Pausar autoplay no hover (se existir)
  const hero = document.querySelector('.hero');
  if (hero) {
    hero.addEventListener('mouseenter', () => clearInterval(timer));
    hero.addEventListener('mouseleave', resetTimer);
  }

  // Navegação por teclado
  window.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') prevSlide();
    if (event.key === 'ArrowRight') nextSlide();
  });

  // Inicialização
  createDots();
  updateSlider();
  resetTimer();
}

// ===== Trails Slider (seção de trilhas) - dados no HTML =====
(function() {
  let items = Array.from(document.querySelectorAll('.trails-data .trail-item'));
  const imgEl = document.querySelector('.trail-image img');
  const infoEl = document.querySelector('.trail-info');
  const prevBtn = document.querySelector('.trails-arrow.left');
  const nextBtn = document.querySelector('.trails-arrow.right');
  const dotsContainerTrails = document.querySelector('.trails-dots');
  if (!items.length || !imgEl || !infoEl || !prevBtn || !nextBtn || !dotsContainerTrails) return;

  let tIndex = 0;
  let tTimer = null;

  // Verificar se é admin
  function isAdmin() {
    try {
      const raw = localStorage.getItem('tv_auth');
      if (!raw) return false;
      const auth = JSON.parse(raw);
      return auth && auth.role === 'admin';
    } catch (e) {
      return false;
    }
  }

  function renderTrail(i) {
    // Atualiza a lista de items antes de renderizar
    items = Array.from(document.querySelectorAll('.trails-data .trail-item'));
    
    // Garante que o índice está dentro dos limites
    if (i >= items.length) i = items.length - 1;
    if (i < 0) i = 0;
    tIndex = i;
    
    const item = items[i];
    if (!item) return;
    
    const itemImg = item.querySelector('.trail-image img');
    const itemInfo = item.querySelector('.trail-info');
    if (itemImg) {
      imgEl.src = itemImg.src;
      imgEl.alt = itemImg.alt || '';
    }
    if (itemInfo) {
      infoEl.innerHTML = itemInfo.innerHTML;
    }
    // atualizar dots
    dotsContainerTrails.querySelectorAll('.dot').forEach((d, idx) => d.classList.toggle('active', idx === i));
  }

  function createTrailDots() {
    dotsContainerTrails.innerHTML = '';
    items.forEach((_, i) => {
      const d = document.createElement('span');
      d.className = 'dot small' + (i === 0 ? ' active' : '');
      d.dataset.index = i;
      d.addEventListener('click', () => goTo(i));
      dotsContainerTrails.appendChild(d);
    });
  }

  function prev() { 
    tIndex = (tIndex - 1 + items.length) % items.length; 
    renderTrail(tIndex); 
    if (!isAdmin()) resetTimerTrails();
  }
  
  function next() { 
    tIndex = (tIndex + 1) % items.length; 
    renderTrail(tIndex); 
    if (!isAdmin()) resetTimerTrails();
  }
  
  function goTo(i) { 
    tIndex = i; 
    renderTrail(tIndex); 
    if (!isAdmin()) resetTimerTrails();
  }

  prevBtn.addEventListener('click', prev);
  nextBtn.addEventListener('click', next);

  function resetTimerTrails() {
    clearInterval(tTimer);
    tTimer = setInterval(next, 6000);
  }

  // teclado - desabilita se for admin ou se estiver em campo de input
  window.addEventListener('keydown', (e) => {
    if (isAdmin()) return;
    if (document.activeElement && ['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) return;
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'ArrowRight') next();
  });

  // Expor funções globais para o park-admin.js atualizar o slider
  window.updateTrailsSlider = function(index) {
    items = Array.from(document.querySelectorAll('.trails-data .trail-item'));
    createTrailDots();
    renderTrail(index !== undefined ? index : tIndex);
  };
  
  window.getCurrentTrailIndex = function() {
    return tIndex;
  };

  // init
  createTrailDots();
  renderTrail(0);
  
  // Só inicia auto-play se não for admin
  if (!isAdmin()) {
    resetTimerTrails();
  }
})();