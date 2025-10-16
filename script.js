// Config
const WHATSAPP_NUMBER = "51944952234"; // sin signos, para wa.me
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

let PRODUCTS = [];

// Cargar JSON de productos
fetch(PRODUCTS_JSON)
  .then(r => r.ok ? r.json() : Promise.reject(new Error('No se pudo cargar products.json')))
  .then(data => {
    PRODUCTS = Array.isArray(data) ? data : [];
    renderCategories();
    renderProducts(PRODUCTS);
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
    btn.addEventListener('click', () => filterCategory(c));
    categoriesWrap.appendChild(btn);
  });
}

// Renderizar tarjetas
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
      <img src="${escapeHtml(p.image || 'images/image-missing.png')}" alt="${escapeHtml(p.name || '')}" onerror="this.src='images/image-missing.png'">
      <h3>${escapeHtml(p.name || '')}</h3>
      <p>${escapeHtml(p.description || '')}</p>
      <div class="price">${formatPrice(p.price || 0)}</div>
      <div style="margin-top:10px">
        <a class="compra-whatsapp" href="${buildWhatsAppLink(p.name || '')}" target="_blank" rel="noopener">Comprar</a>
      </div>`;
    productGrid.appendChild(card);
  });
}

// Renderizar carrusel top 8 por demand
function renderCarousel() {
  const top = PRODUCTS.slice().sort((a, b) => (b.demand || 0) - (a.demand || 0)).slice(0, 8);
  carouselTrack.innerHTML = '';
  if (!top.length) {
    carouselTrack.innerHTML = '<div class="muted">No hay productos estrella configurados.</div>';
    return;
  }
  top.forEach(p => {
    const item = document.createElement('div');
    item.className = 'carousel-item';
    item.innerHTML = `
      <img src="${escapeHtml(p.image || 'images/image-missing.png')}" alt="${escapeHtml(p.name || '')}" onerror="this.src='images/image-missing.png'">
      <div style="font-weight:600;margin-top:6px">${escapeHtml(p.name || '')}</div>
      <div style="color:var(--muted);font-size:0.9rem">${formatPrice(p.price || 0)}</div>`;
    carouselTrack.appendChild(item);
  });
}

// Filtros y búsqueda
function filterCategory(cat) {
  const cards = document.querySelectorAll('#productGrid .card');
  cards.forEach(c => {
    c.style.display = (cat === 'Todos' || c.dataset.category === cat) ? 'block' : 'none';
  });
}

function applySearch() {
  const q = (searchInput.value || '').toLowerCase().trim();
  const cards = document.querySelectorAll('#productGrid .card');
  cards.forEach(c => {
    const name = (c.dataset.name || '').toLowerCase();
    const cat = (c.dataset.category || '').toLowerCase();
    c.style.display = (q === '' || name.includes(q) || cat.includes(q)) ? 'block' : 'none';
  });
}

// Carrusel controles
function carouselScroll(dir) {
  const offset = 170 * dir;
  carouselTrack.scrollBy({ left: offset, behavior: 'smooth' });
}

// Event listeners
searchBtn.addEventListener('click', applySearch);
searchInput.addEventListener('input', applySearch);
prevBtn.addEventListener('click', () => carouselScroll(-1));
nextBtn.addEventListener('click', () => carouselScroll(1));
