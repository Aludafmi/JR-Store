// Config
const WHATSAPP_NUMBER = "51944952234";
const PRODUCTS_JSON = "products.json";

// Utilidades
function formatPrice(p) { return `S/ ${Number(p).toFixed(2)}`; }
function escapeHtml(str) { return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
function buildWhatsAppLink(productName) { return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hola JR Store, tengo interés en ' + productName)}`; }

// Elementos
const productGrid = document.getElementById('productGrid');
const carouselTrack = document.getElementById('carouselTrack');
const categoriesWrap = document.getElementById('categoriesWrap');
const searchInput = document.getElementById('search');
const searchBtn = document.getElementById('searchBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');

const paginationWrap = document.getElementById('pagination'); // nuevo
let PRODUCTS = [];

// --- Nuevas variables para paginación y filtros ---
let DAILY_ORDERED = []; // productos ordenados diariamente (determinístico)
let currentPage = 1;
const PAGE_SIZE = 12;
let currentCategory = 'Todos';
let currentQuery = '';

// --- Seeded shuffle (determinista por fecha) ---
function mulberry32(a) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}
function seededShuffle(arr, seedStr) {
  const arrCopy = arr.slice();
  // seed from YYYY-MM-DD
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) h = (h << 5) - h + seedStr.charCodeAt(i) | 0;
  const rnd = mulberry32(h >>> 0);
  for (let i = arrCopy.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arrCopy[i], arrCopy[j]] = [arrCopy[j], arrCopy[i]];
  }
  return arrCopy;
}

// Cargar JSON de productos
fetch(PRODUCTS_JSON)
  .then(r => r.ok ? r.json() : Promise.reject(new Error('No se pudo cargar products.json')))
  .then(data => {
    PRODUCTS = Array.isArray(data) ? data : [];
    // crear orden aleatorio determinista por día
    const today = new Date().toISOString().slice(0,10);
    DAILY_ORDERED = seededShuffle(PRODUCTS, today);
    renderCategories();
    renderProductsPage();
    renderCarousel();
  })
  .catch(err => {
    console.error(err);
    productGrid.innerHTML = '<div class="muted">Error cargando productos. Verifica products.json en el servidor.</div>';
  });

// Renderizar categorías únicas
function uniqueCategories(list) {
  const set = new Set(list.map(x => x.category));
  return ['Todos', ...Array.from(set)];
}

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
      // marca visual
      Array.from(categoriesWrap.children).forEach(ch => ch.classList.remove('active'));
      btn.classList.add('active');
      renderProductsPage();
    });
    categoriesWrap.appendChild(btn);
  });
}

// Renderizar tarjetas (función usada por la paginación)
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
        card.dataset.name = p.name || '';
        card.innerHTML = `
            <img class="product-img" src="${escapeHtml(p.image || 'images/image-missing.png')}" 
                 alt="${escapeHtml(p.name || '')}" 
                 onerror="this.src='images/image-missing.png'">
            <h3>${escapeHtml(p.name || '')}</h3>
            <p>${escapeHtml(p.description || '')}</p>
            <div class="card-footer">
                <div class="price">${formatPrice(p.price || 0)}</div>
                <a class="compra-whatsapp" href="${buildWhatsAppLink(p.name || '')}" 
                   target="_blank" rel="noopener">Comprar</a>
            </div>`;
        productGrid.appendChild(card);
    });
    
    // añadir listeners de lightbox a imágenes renderizadas
    document.querySelectorAll('.product-img').forEach(img => {
        img.addEventListener('click', (e) => openLightbox(e.currentTarget.src, e.currentTarget.alt));
    });
}

// Obtener lista filtrada respetando el orden diario
function getFilteredProducts() {
  const q = (currentQuery || '').toLowerCase().trim();
  return DAILY_ORDERED.filter(p => {
    const matchCat = (currentCategory === 'Todos') || (p.category === currentCategory);
    const matchQ = q === '' || (p.name || '').toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
    return matchCat && matchQ;
  });
}

// Renderización con paginación
function renderProductsPage() {
  const filtered = getFilteredProducts();
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);
  renderProducts(pageItems);
  renderPaginationControls(currentPage, totalPages);
}

// Paginación UI
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
  pagePrev.addEventListener('click', () => { currentPage = Math.max(1, currentPage - 1); renderProductsPage(); });
  pageNext.addEventListener('click', () => { currentPage = Math.min(totalPages, currentPage + 1); renderProductsPage(); });
}

// Renderizar carrusel top 10 por demand (auto giratorio e infinito)
let carouselInterval = null;
const CAROUSEL_STEP_PX = 170;
const CAROUSEL_DELAY_MS = 2200;
let currentSlide = 0;
const ITEMS_VISIBLE = 3; // Cuántos items se ven a la vez

function renderCarousel() {
    const top = PRODUCTS.slice().sort((a, b) => (b.demand || 0) - (a.demand || 0)).slice(0, 10);
    carouselTrack.innerHTML = '';
    
    if (!top.length) {
        carouselTrack.innerHTML = '<div class="muted">No hay productos estrella configurados.</div>';
        return;
    }

    // Renderizar items
    top.forEach(p => {
        const item = document.createElement('div');
        item.className = 'carousel-item';
        item.innerHTML = `
            <img class="carousel-img" src="${escapeHtml(p.image || 'images/image-missing.png')}" 
                 alt="${escapeHtml(p.name || '')}" 
                 onerror="this.src='images/image-missing.png'">
            <div style="font-weight:600;margin-top:8px">${escapeHtml(p.name || '')}</div>
            <div style="color:var(--muted);font-size:0.9rem">${formatPrice(p.price || 0)}</div>`;
        carouselTrack.appendChild(item);
    });

    // Crear puntos de navegación
    const dotsContainer = document.createElement('div');
    dotsContainer.className = 'carousel-dots';
    const numDots = Math.ceil(top.length / ITEMS_VISIBLE);
    
    for (let i = 0; i < numDots; i++) {
        const dot = document.createElement('button');
        dot.className = `carousel-dot${i === 0 ? ' active' : ''}`;
        dot.addEventListener('click', () => {
            goToSlide(i);
            stopCarouselAuto();
            setTimeout(startCarouselAuto, 2000);
        });
        dotsContainer.appendChild(dot);
    }

    // Reemplazar controles anteriores con puntos
    const oldControls = document.querySelector('.carousel-controls');
    oldControls.innerHTML = '';
    oldControls.appendChild(dotsContainer);

    // Listeners para lightbox
    document.querySelectorAll('.carousel-img').forEach(img => 
        img.addEventListener('click', (e) => openLightbox(e.currentTarget.src, e.currentTarget.alt))
    );

    startCarouselAuto();
}

function goToSlide(index) {
    const itemWidth = 240 + 15; // ancho item + gap
    currentSlide = index;
    carouselTrack.scrollTo({
        left: index * itemWidth * ITEMS_VISIBLE,
        behavior: 'smooth'
    });
    updateDots();
}

function updateDots() {
    const dots = document.querySelectorAll('.carousel-dot');
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === currentSlide);
    });
}

function startCarouselAuto() {
    stopCarouselAuto();
    carouselInterval = setInterval(() => {
        const dots = document.querySelectorAll('.carousel-dot');
        currentSlide = (currentSlide + 1) % dots.length;
        goToSlide(currentSlide);
    }, CAROUSEL_DELAY_MS);
}

function stopCarouselAuto() {
  if (carouselInterval) { clearInterval(carouselInterval); carouselInterval = null; }
}

// Pausar al hover
carouselTrack.addEventListener('mouseenter', stopCarouselAuto);
carouselTrack.addEventListener('mouseleave', startCarouselAuto);

// Filtros y búsqueda (ahora actualizan currentQuery y vuelven a renderizar paginación)
function filterCategory(cat) {
  currentCategory = cat;
  currentPage = 1;
  renderProductsPage();
}

function applySearch() {
  currentQuery = (searchInput.value || '').toLowerCase().trim();
  currentPage = 1;
  renderProductsPage();
}

// Carrusel controles manuales (mantener)
function carouselScroll(dir) {
  const offset = CAROUSEL_STEP_PX * dir;
  carouselTrack.scrollBy({ left: offset, behavior: 'smooth' });
  // reiniciar auto para dar tiempo al usuario
  stopCarouselAuto();
  setTimeout(startCarouselAuto, 2000);
}

// Event listeners
searchBtn.addEventListener('click', applySearch);
searchInput.addEventListener('input', applySearch);


// --- Lightbox / modal de imagen ---
const lightbox = document.createElement('div');
lightbox.id = 'lightbox';
lightbox.className = 'lightbox';
lightbox.innerHTML = `<div class="lightbox-backdrop"></div><div class="lightbox-content"><button class="lightbox-close" aria-label="Cerrar">×</button><img class="lightbox-img" src="" alt=""></div>`;
document.body.appendChild(lightbox);
const lbBackdrop = lightbox.querySelector('.lightbox-backdrop');
const lbClose = lightbox.querySelector('.lightbox-close');
const lbImg = lightbox.querySelector('.lightbox-img');

function openLightbox(src, alt = '') {
  lbImg.src = src;
  lbImg.alt = alt;
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  lightbox.classList.remove('open');
  document.body.style.overflow = '';
  lbImg.src = '';
}
lbBackdrop.addEventListener('click', closeLightbox);
lbClose.addEventListener('click', closeLightbox);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });
