// Config
const WHATSAPP_NUMBER = "51944952234";
const PRODUCTS_JSON = "products.json";

// Utilidades
function formatPrice(p) { return `S/ ${Number(p).toFixed(2)}`; }
function escapeHtml(str) { return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
function buildWhatsAppLink(productName) {
  const num = (typeof META !== 'undefined' && META.phone) ? (META.phone.replace(/\D/g, '')) : WHATSAPP_NUMBER;
  return `https://wa.me/${num}?text=${encodeURIComponent('Hola ' + (META.name || 'Tienda') + ', tengo interés en ' + productName)}`;
}

// Elementos
const productGrid = document.getElementById('productGrid');
const carouselTrack = document.getElementById('carouselTrack');
const categoriesWrap = document.getElementById('categoriesWrap');
const searchInput = document.getElementById('search');
const searchBtn = document.getElementById('searchBtn');
const paginationWrap = document.getElementById('pagination');
const catToggleBtn = document.getElementById('catToggle');
const starBtn = document.getElementById('starBtn');
const homeBtn = document.getElementById('homeBtn');
const headerEl = document.querySelector('header');

let PRODUCTS = [];
let META = {
  name: 'JR Store',
  logo: 'images/logo 3.png',
  slogan: 'Tu tienda online de confianza.',
  address: '',
  phone: '+51 944 952 234',
  welcome: ''
};

// paginación y filtros
let DAILY_ORDERED = [];
let currentPage = 1;
const PAGE_SIZE = 12;
let currentCategory = 'TODOS';
let currentQuery = '';

// shuffle no determinista por carga
function shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// aplicar altura header a CSS var para sticky correcto
function updateHeaderHeightVar() {
  if (!headerEl) return;
  const h = headerEl.offsetHeight;
  document.documentElement.style.setProperty('--header-height', h + 'px');
}
window.addEventListener('load', updateHeaderHeightVar);
window.addEventListener('resize', updateHeaderHeightVar);

// cargar JSON
fetch(PRODUCTS_JSON)
  .then(r => r.ok ? r.json() : Promise.reject(new Error('No se pudo cargar products.json')))
  .then(data => {
    if (data && Array.isArray(data.products)) {
      PRODUCTS = data.products;
      META = Object.assign(META, data.meta || {});
    } else if (Array.isArray(data)) {
      PRODUCTS = data;
    } else {
      PRODUCTS = [];
    }

    // inyectar meta en DOM
    try {
      document.getElementById('logo').src = META.logo || 'images/logo 3.png';
      document.getElementById('brandName').textContent = META.name || 'Tienda';
      document.getElementById('sloganText').textContent = META.slogan || '';
      document.getElementById('welcomeTitle').textContent = META.welcomeTitle || (`Bienvenidos a ${META.name || ''}`);
      document.getElementById('welcomeText').innerHTML = META.welcome || '';
      document.getElementById('footerAddress').textContent = META.address || '';
      document.getElementById('footerPhone').textContent = META.phone || '';
      document.getElementById('footerBrand').textContent = META.name || '';
      document.querySelector('.footer-copy').textContent = META.copy || `© ${new Date().getFullYear()} ${META.name}. Todos los derechos reservados.`;
      if (META.title) document.title = META.title; else if (META.name) document.title = `${META.name} - Tienda online`;
      // actualizar waHeader
      const waHeader = document.getElementById('waHeader');
      if (waHeader && META.phone) waHeader.href = `https://wa.me/${META.phone.replace(/\D/g,'')}`;
    } catch (e) { console.warn(e); }

    // orden aleatorio en cada carga
    DAILY_ORDERED = shuffle(PRODUCTS);
    renderCategories();
    renderProductsPage();
    renderCarousel();
  })
  .catch(err => {
    console.error(err);
    if (productGrid) productGrid.innerHTML = '<div class="muted">Error cargando products.json</div>';
  });

// util: categorías únicas
function uniqueCategories(list) {
  const set = new Set(list.map(x => x.category || 'Sin categoría'));
  return ['TODOS', ...Array.from(set)];
}

// render categorías y persistir botón activo
function renderCategories() {
  const cats = uniqueCategories(PRODUCTS);
  categoriesWrap.innerHTML = '';
  cats.forEach(c => {
    const btn = document.createElement('button');
    btn.textContent = c;
    btn.className = 'cat-btn';
    if (c === currentCategory) btn.classList.add('active');
    btn.addEventListener('click', () => {
      currentCategory = c;
      currentPage = 1;
      Array.from(categoriesWrap.children).forEach(ch => ch.classList.remove('active'));
      btn.classList.add('active');
      renderProductsPage();
      // cerrar drawer en móvil
      if (window.innerWidth <= 600) categoriesWrap.classList.remove('open');
    });
    categoriesWrap.appendChild(btn);
  });
}

// render productos (solo inserta HTML; listeners centralizados)
function renderProducts(list) {
  productGrid.innerHTML = '';
  if (!list.length) {
    productGrid.innerHTML = '<div class="muted">No hay productos para mostrar.</div>';
    return;
  }
  list.forEach(p => {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.category = p.category || '';
    card.innerHTML = `
      <img class="product-img" src="${escapeHtml(p.image || 'images/image-missing.png')}" alt="${escapeHtml(p.name||'')}" onerror="this.src='images/image-missing.png'">
      <h3>${escapeHtml(p.name || '')}</h3>
      <p>${escapeHtml(p.description || '')}</p>
      <div class="card-footer">
        <div class="price">${formatPrice(p.price || 0)}</div>
        <a class="compra-whatsapp" href="${buildWhatsAppLink(p.name || '')}" target="_blank" rel="noopener">Comprar</a>
      </div>`;
    productGrid.appendChild(card);
  });
  // attach listeners para imágenes y botones de compra en grid
  attachImageAndBuyListeners();
}

// filtros + búsqueda
function getFilteredProducts() {
  const q = (currentQuery || '').toLowerCase().trim();
  return DAILY_ORDERED.filter(p => {
    const matchCat = (currentCategory === 'TODOS') || (p.category === currentCategory);
    const matchQ = !q || (p.name||'').toLowerCase().includes(q) || (p.category||'').toLowerCase().includes(q) || (p.description||'').toLowerCase().includes(q);
    return matchCat && matchQ;
  });
}

function renderProductsPage() {
  const filtered = getFilteredProducts();
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);
  renderProducts(pageItems);
  renderPaginationControls(currentPage, totalPages);
}

function renderPaginationControls(page, totalPages) {
  if (!paginationWrap) return;
  paginationWrap.innerHTML = `
    <div class="pagi-left">
      <button id="pagePrev" class="ctrl">Anterior</button>
      <button id="pageNext" class="ctrl">Siguiente</button>
    </div>
    <div class="pagi-info">Página ${page} de ${totalPages} — ${getFilteredProducts().length} resultados</div>
  `;
  const pagePrev = document.getElementById('pagePrev');
  const pageNext = document.getElementById('pageNext');
  pagePrev.disabled = (page <= 1);
  pageNext.disabled = (page >= totalPages);
  pagePrev.addEventListener('click', () => { currentPage = Math.max(1, currentPage - 1); renderProductsPage(); document.getElementById('productos').scrollIntoView({behavior:'smooth'}); });
  pageNext.addEventListener('click', () => { currentPage = Math.min(totalPages, currentPage + 1); renderProductsPage(); document.getElementById('productos').scrollIntoView({behavior:'smooth'}); });
}

// LIGHTBOX (centralizado)
const lightbox = document.createElement('div');
lightbox.id = 'lightbox';
lightbox.className = 'lightbox';
lightbox.innerHTML = `
  <div class="lightbox-backdrop"></div>
  <div class="lightbox-content">
    <button class="lightbox-close" aria-label="Cerrar">×</button>
    <img class="lightbox-img" src="" alt="">
    <div class="lightbox-actions">
      <a class="lb-buy" target="_blank" rel="noopener">Comprar</a>
    </div>
  </div>`;
document.body.appendChild(lightbox);
const lbBackdrop = lightbox.querySelector('.lightbox-backdrop');
const lbClose = lightbox.querySelector('.lightbox-close');
const lbImg = lightbox.querySelector('.lightbox-img');
const lbBuy = lightbox.querySelector('.lb-buy');

function openLightbox(src, name) {
  lbImg.src = src;
  lbImg.alt = name || '';
  lbBuy.href = buildWhatsAppLink(name || '');
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  lightbox.classList.remove('open');
  document.body.style.overflow = '';
  lbImg.src = '';
  lbBuy.href = '#';
}
lbBackdrop.addEventListener('click', closeLightbox);
lbClose.addEventListener('click', closeLightbox);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });

// attach listeners for product images and buy links (grid + carousel)
function attachImageAndBuyListeners() {
  // product images
  document.querySelectorAll('.product-img').forEach(img => {
    img.dataset.ignoreClick = '0';
    img.onclick = (e) => {
      if (img.dataset.ignoreClick === '1') { img.dataset.ignoreClick = '0'; return; }
      openLightbox(img.src, img.alt);
    };
  });
  // compra botones in grid
  document.querySelectorAll('.compra-whatsapp').forEach(a => {
    // find product name from nearby card h3 or data
    a.onclick = null; // preserve native link behavior (opens wa)
    // ensure href uses META.phone (already built), but update if meta changed
  });
  // carousel images will be handled by same handler when present
}

// CAROUSEL: render + puntos + arrastre global (no duplicar handlers)
let carouselInterval = null;
const CAROUSEL_DELAY_MS = 2200;
let currentSlide = 0;
const ITEMS_VISIBLE = 3;

function renderCarousel() {
  const top = PRODUCTS.slice().sort((a,b) => (b.demand||0)-(a.demand||0)).slice(0,8);
  carouselTrack.innerHTML = '';
  if (!top.length) { carouselTrack.innerHTML = '<div class="muted">No hay productos estrella configurados.</div>'; return; }
  top.forEach(p => {
    const item = document.createElement('div');
    item.className = 'carousel-item';
    item.innerHTML = `
      <img class="carousel-img" src="${escapeHtml(p.image || 'images/image-missing.png')}" alt="${escapeHtml(p.name||'')}" onerror="this.src='images/image-missing.png'">
      <div style="font-weight:600;margin-top:8px">${escapeHtml(p.name||'')}</div>
      <div style="color:var(--muted);font-size:0.9rem">${formatPrice(p.price||0)}</div>`;
    carouselTrack.appendChild(item);
  });

  // puntos
  const dotsContainer = document.createElement('div');
  dotsContainer.className = 'carousel-dots';
  const numDots = Math.ceil(top.length / ITEMS_VISIBLE);
  for (let i=0;i<numDots;i++){
    const dot = document.createElement('button');
    dot.className = 'carousel-dot' + (i===0 ? ' active' : '');
    dot.addEventListener('click', ()=> { goToSlide(i); stopCarouselAuto(); setTimeout(startCarouselAuto,2000); });
    dotsContainer.appendChild(dot);
  }
  const controls = document.querySelector('.carousel-controls');
  if (controls) { controls.innerHTML=''; controls.appendChild(dotsContainer); }

  // attach carousel image handlers (use same openLightbox but respect ignoreClick)
  document.querySelectorAll('.carousel-img').forEach(img => {
    img.dataset.ignoreClick = '0';
    img.onclick = (e) => {
      if (img.dataset.ignoreClick === '1') { img.dataset.ignoreClick = '0'; return; }
      openLightbox(img.src, img.alt);
    };
  });

  // iniciar auto y actualizar dots según scroll
  updateDotsOnScroll();
  startCarouselAuto();
}

// drag handlers para carousel (registrar solo una vez)
let dragState = { isDown:false, startX:0, scrollStart:0, activeId:null, moved:false };
function enableCarouselDrag() {
  if (!carouselTrack) return;
  // pointerdown
  carouselTrack.onpointerdown = (e) => {
    dragState.isDown = true;
    dragState.moved = false;
    dragState.activeId = e.pointerId;
    dragState.startX = e.clientX;
    dragState.scrollStart = carouselTrack.scrollLeft;
    carouselTrack.classList.add('dragging');
    carouselTrack.setPointerCapture(dragState.activeId);
    stopCarouselAuto();
  };
  carouselTrack.onpointermove = (e) => {
    if (!dragState.isDown || e.pointerId !== dragState.activeId) return;
    const dx = e.clientX - dragState.startX;
    if (Math.abs(dx) > 6) dragState.moved = true;
    if (dragState.moved) {
      carouselTrack.scrollLeft = dragState.scrollStart - dx;
      // marcar imgs para ignorar click
      document.querySelectorAll('.carousel-img').forEach(img => img.dataset.ignoreClick = '1');
    }
    updateDotsOnScroll();
  };
  const end = (e) => {
    if (!dragState.isDown) return;
    dragState.isDown = false;
    carouselTrack.classList.remove('dragging');
    try { carouselTrack.releasePointerCapture(dragState.activeId); } catch(_) {}
    // if click without move -> let click handler open image
    // reset ignoreClick shortly
    setTimeout(()=> document.querySelectorAll('.carousel-img').forEach(img=> img.dataset.ignoreClick='0'), 50);
    setTimeout(startCarouselAuto, 800);
  };
  carouselTrack.onpointerup = end;
  carouselTrack.onpointercancel = end;
  carouselTrack.onpointerleave = end;

  // scroll listener for dots update
  carouselTrack.onscroll = updateDotsOnScroll;
}
enableCarouselDrag();

function updateDotsOnScroll() {
  const dots = document.querySelectorAll('.carousel-dot');
  if (!dots.length) return;
  const item = document.querySelector('.carousel-item');
  if (!item) return;
  const style = getComputedStyle(item);
  const gap = parseInt(style.marginRight || 15);
  const itemWidth = item.offsetWidth + gap;
  const index = Math.round(carouselTrack.scrollLeft / (itemWidth * ITEMS_VISIBLE));
  currentSlide = Math.max(0, Math.min(dots.length-1, index));
  updateDots();
}

function updateDots() {
  const dots = document.querySelectorAll('.carousel-dot');
  dots.forEach((d,i)=> d.classList.toggle('active', i===currentSlide));
}

function goToSlide(index) {
  const item = document.querySelector('.carousel-item');
  if (!item) return;
  const style = getComputedStyle(item);
  const gap = parseInt(style.marginRight || 15);
  const itemWidth = item.offsetWidth + gap;
  currentSlide = index;
  carouselTrack.scrollTo({ left: index * itemWidth * ITEMS_VISIBLE, behavior: 'smooth' });
  updateDots();
}

function startCarouselAuto() {
  stopCarouselAuto();
  carouselInterval = setInterval(()=> {
    const dots = document.querySelectorAll('.carousel-dot');
    if (!dots.length) return;
    currentSlide = (currentSlide + 1) % dots.length;
    goToSlide(currentSlide);
  }, CAROUSEL_DELAY_MS);
}
function stopCarouselAuto() { if (carouselInterval) { clearInterval(carouselInterval); carouselInterval = null; } }

// eventos UI: búsqueda, toggle categorias, starBtn, homeBtn
searchBtn.addEventListener('click', ()=> { currentQuery = (searchInput.value||'').toLowerCase().trim(); currentPage=1; renderProductsPage(); });
searchInput.addEventListener('input', ()=> { currentQuery = (searchInput.value||'').toLowerCase().trim(); currentPage=1; renderProductsPage(); });

if (catToggleBtn) {
  catToggleBtn.addEventListener('click', ()=> {
    categoriesWrap.classList.toggle('open');
    catToggleBtn.setAttribute('aria-expanded', categoriesWrap.classList.contains('open') ? 'true' : 'false');
  });
}

// starBtn: scroll a titulo de carousel
if (starBtn) {
  starBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const title = document.getElementById('carouselTitle');
    if (title) title.scrollIntoView({behavior:'smooth', block:'start'});
  });
}

// homeBtn: refrescar la página
if (homeBtn) {
  homeBtn.addEventListener('click', (e) => {location.reload(); });
}

// Exponer renderProductos/Carousel a la carga inicial (ya usadas arriba)
