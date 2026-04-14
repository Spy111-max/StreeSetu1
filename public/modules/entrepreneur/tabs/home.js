import {
  copyOrShare,
  currency,
  escapeHtml,
  fallbackPhoto,
  fetchJson,
  renderEmpty,
  renderSkeleton
} from '../core.js';

const businessOtherProducts = document.getElementById('businessOtherProducts');
const businessMyProducts = document.getElementById('businessMyProducts');
const businessCreatorStrip = document.getElementById('businessCreatorStrip');
const businessReels = document.getElementById('businessReels');
const businessSearchInput = document.getElementById('businessSearchInput');
const businessCategoryFilter = document.getElementById('businessCategoryFilter');
const businessSortSelect = document.getElementById('businessSortSelect');
const businessFeedCount = document.getElementById('businessFeedCount');

let marketProductsCache = [];
let myProductsCache = [];
let controlsBound = false;

function renderHomeSkeleton() {
  businessCreatorStrip.innerHTML = Array.from({ length: 6 }, () => '<article class="story-item skeleton-story"></article>').join('');
  renderSkeleton(businessReels, 4, 'reel-card skeleton-card');
  renderSkeleton(businessOtherProducts, 3, 'post-card compact-post skeleton-card');
  renderSkeleton(businessMyProducts, 3, 'post-card compact-post skeleton-card');
}

function renderCreatorStrip(products) {
  if (!products.length) {
    businessCreatorStrip.innerHTML = '';
    return;
  }

  const unique = new Map();
  products.forEach((product) => {
    const key = product.entrepreneur_name || product.name;
    if (!unique.has(key)) {
      unique.set(key, product);
    }
  });

  businessCreatorStrip.innerHTML = [...unique.values()]
    .slice(0, 10)
    .map((product) => {
      const founder = escapeHtml(product.entrepreneur_name || 'Founder');
      const image = product.image_url || fallbackPhoto(founder.split(' ')[0]);
      return `
        <article class="story-item">
          <img src="${image}" alt="${founder}" />
          <span>${founder}</span>
        </article>
      `;
    })
    .join('');
}

function bindProductInteractions(element) {
  element.querySelectorAll('.post-media').forEach((media) => {
    media.addEventListener('dblclick', () => {
      media.classList.remove('liked-flash');
      void media.offsetWidth;
      media.classList.add('liked-flash');
    });
  });

  element.querySelectorAll('.share-btn').forEach((button) => {
    button.addEventListener('click', async () => {
      const productName = button.dataset.name || 'Product';
      await copyOrShare('StreeSetu Creator', `StreeSetu creator pick: ${productName}`, window.location.href, 'Share link copied to clipboard.');
    });
  });
}

function renderProductList(element, products, emptyText, showOwner = false) {
  if (!products.length) {
    renderEmpty(element, emptyText);
    return;
  }

  element.innerHTML = products
    .map(
      (product) => `
        <article class="post-card compact-post">
          <div class="post-media">
            <img src="${product.image_url || fallbackPhoto(escapeHtml(product.name))}" alt="${escapeHtml(product.name)}" />
          </div>
          <div class="post-body">
            <div class="item-topline">
              <strong>${escapeHtml(product.name)}</strong>
              <span>${currency(product.price)}</span>
            </div>
            <p>${escapeHtml(product.description)}</p>
            ${showOwner ? `<span class="meta-line">By ${escapeHtml(product.entrepreneur_name || 'Founder')}${product.business_name ? ` • ${escapeHtml(product.business_name)}` : ''}</span>` : ''}
            <span class="meta-line">Stock ${product.stock}</span>
            <div class="social-actions">
              <button type="button" class="social-btn like-btn">Like</button>
              <button type="button" class="social-btn share-btn" data-name="${escapeHtml(product.name)}">Share</button>
            </div>
          </div>
        </article>
      `
    )
    .join('');

  bindProductInteractions(element);
}

function renderReels(products) {
  if (!products.length) {
    renderEmpty(businessReels, 'No reels available yet.');
    return;
  }

  businessReels.innerHTML = products
    .slice(0, 8)
    .map(
      (product) => `
        <article class="reel-card">
          <img src="${product.image_url || fallbackPhoto(escapeHtml(product.name))}" alt="${escapeHtml(product.name)}" />
          <div class="reel-overlay">
            <strong>${escapeHtml(product.name)}</strong>
            <span>${currency(product.price)}</span>
            <button type="button" class="social-btn reel-share-btn" data-name="${escapeHtml(product.name)}">Share</button>
          </div>
        </article>
      `
    )
    .join('');

  businessReels.querySelectorAll('.reel-share-btn').forEach((button) => {
    button.addEventListener('click', async () => {
      const productName = button.dataset.name || 'Product';
      await copyOrShare('StreeSetu Reel', `Trending market reel: ${productName}`, window.location.href, 'Reel link copied to clipboard.');
    });
  });

  businessReels.querySelectorAll('.reel-card').forEach((reel) => {
    reel.addEventListener('dblclick', () => {
      reel.classList.remove('liked-flash');
      void reel.offsetWidth;
      reel.classList.add('liked-flash');
    });
  });
}

function setupBusinessCategoryOptions(products) {
  const categories = [...new Set(products.map((item) => (item.business_category || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  businessCategoryFilter.innerHTML =
    '<option value="all">All categories</option>' +
    categories.map((category) => `<option value="${category}">${category}</option>`).join('');
}

function getFilteredMarketProducts() {
  const searchTerm = (businessSearchInput.value || '').trim().toLowerCase();
  const category = businessCategoryFilter.value || 'all';
  const sortBy = businessSortSelect.value || 'newest';

  let filtered = marketProductsCache.filter((item) => {
    const matchesCategory = category === 'all' || (item.business_category || '').trim() === category;
    const matchesSearch =
      !searchTerm ||
      (item.name || '').toLowerCase().includes(searchTerm) ||
      (item.description || '').toLowerCase().includes(searchTerm) ||
      (item.business_name || '').toLowerCase().includes(searchTerm) ||
      (item.entrepreneur_name || '').toLowerCase().includes(searchTerm);
    return matchesCategory && matchesSearch;
  });

  filtered = [...filtered].sort((a, b) => {
    if (sortBy === 'price-low') return Number(a.price || 0) - Number(b.price || 0);
    if (sortBy === 'price-high') return Number(b.price || 0) - Number(a.price || 0);
    return (b.created_at || '').localeCompare(a.created_at || '');
  });

  return filtered;
}

function applyBusinessFilters() {
  const filtered = getFilteredMarketProducts();
  renderCreatorStrip(filtered);
  renderReels(filtered);
  renderProductList(businessOtherProducts, filtered, 'Other entrepreneur products will appear here.', true);
  renderProductList(businessMyProducts, myProductsCache, 'Your launched products will appear here.');
  businessFeedCount.textContent = `${filtered.length} market products`;
}

function initBusinessHomeControls() {
  if (controlsBound) {
    return;
  }

  const apply = () => applyBusinessFilters();
  businessSearchInput.addEventListener('input', apply);
  businessCategoryFilter.addEventListener('change', apply);
  businessSortSelect.addEventListener('change', apply);
  controlsBound = true;
}

export async function loadEntrepreneurHome() {
  renderHomeSkeleton();
  const data = await fetchJson('/api/dashboard/entrepreneur/home');
  marketProductsCache = data.products || [];
  myProductsCache = data.myProducts || [];
  setupBusinessCategoryOptions(marketProductsCache);
  applyBusinessFilters();
}

export function initEntrepreneurHomeTab() {
  initBusinessHomeControls();
}
