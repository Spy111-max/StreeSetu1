import {
  copyOrShare,
  currency,
  escapeHtml,
  fallbackPhoto,
  fetchJson,
  renderEmpty,
  renderSkeleton,
  starRating
} from '../core.js';

const buyerProducts = document.getElementById('buyerProducts');
const buyerReviews = document.getElementById('buyerReviews');
const buyerStories = document.getElementById('buyerStories');
const buyerReels = document.getElementById('buyerReels');
const buyerSearchInput = document.getElementById('buyerSearchInput');
const buyerCategoryFilter = document.getElementById('buyerCategoryFilter');
const buyerSortSelect = document.getElementById('buyerSortSelect');
const buyerFeedCount = document.getElementById('buyerFeedCount');

let buyerAllProducts = [];
let buyerControlsBound = false;

function renderHomeSkeleton() {
  buyerStories.innerHTML = Array.from({ length: 6 }, () => '<article class="story-item skeleton-story"></article>').join('');
  renderSkeleton(buyerReels, 4, 'reel-card skeleton-card');
  renderSkeleton(buyerProducts, 3, 'post-card skeleton-card');
  if (buyerReviews) {
    renderSkeleton(buyerReviews, 4, 'mini-card skeleton-card');
  }
}

function renderStories(products) {
  if (!products.length) {
    buyerStories.innerHTML = '';
    return;
  }

  const byEntrepreneur = new Map();
  products.forEach((product) => {
    const key = product.entrepreneur_name || 'Women Founder';
    if (!byEntrepreneur.has(key)) {
      byEntrepreneur.set(key, product);
    }
  });

  buyerStories.innerHTML = [...byEntrepreneur.values()]
    .slice(0, 10)
    .map((product) => {
      const name = escapeHtml(product.entrepreneur_name || 'Women Founder');
      const image = product.image_url || fallbackPhoto(name.split(' ')[0]);
      return `
        <article class="story-item">
          <img src="${image}" alt="${name}" />
          <span>${name}</span>
        </article>
      `;
    })
    .join('');
}

function bindProductInteractions() {
  buyerProducts.querySelectorAll('.order-form').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const productId = Number.parseInt(form.dataset.productId, 10);
      try {
        await fetchJson('/api/dashboard/buyer/orders', {
          method: 'POST',
          body: JSON.stringify({ productId, quantity: formData.get('quantity') })
        });
        await loadBuyerHome();
      } catch (error) {
        alert(error.message);
      }
    });
  });

  buyerProducts.querySelectorAll('.review-form').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const productId = Number.parseInt(form.dataset.productId, 10);
      try {
        await fetchJson('/api/dashboard/buyer/reviews', {
          method: 'POST',
          body: JSON.stringify({
            productId,
            rating: formData.get('rating'),
            comment: formData.get('comment')
          })
        });
        await loadBuyerHome();
      } catch (error) {
        alert(error.message);
      }
    });
  });

  buyerProducts.querySelectorAll('.share-btn').forEach((button) => {
    button.addEventListener('click', async () => {
      const productName = button.dataset.name || 'Product';
      await copyOrShare('StreeSetu', `Check out ${productName} on StreeSetu`, window.location.href, 'Share link copied to clipboard.');
    });
  });

  buyerProducts.querySelectorAll('.post-media').forEach((media) => {
    media.addEventListener('dblclick', () => {
      media.classList.remove('liked-flash');
      void media.offsetWidth;
      media.classList.add('liked-flash');
    });
  });
}

function renderProducts(products) {
  if (!products.length) {
    renderEmpty(buyerProducts, 'No products available yet.');
    return;
  }

  buyerProducts.innerHTML = products
    .map(
      (product) => `
        <article class="post-card">
          <header class="post-top">
            <div>
              <strong>${escapeHtml(product.entrepreneur_name || 'Women Founder')}</strong>
              <p>${escapeHtml(product.business_name || 'Independent Store')}</p>
            </div>
            <span class="pill small-pill">New</span>
          </header>
          <div class="post-media">
            <img src="${product.image_url || fallbackPhoto(escapeHtml(product.name))}" alt="${escapeHtml(product.name)}" />
          </div>
          <div class="post-body">
            <div class="item-topline">
              <strong>${escapeHtml(product.name)}</strong>
              <span>${currency(product.price)}</span>
            </div>
            <p>${escapeHtml(product.description)}</p>
            <p class="meta-line">Rating ${starRating(product.average_rating)} (${product.review_count}) • Stock ${product.stock}</p>
            <div class="social-actions">
              <button type="button" class="social-btn like-btn">Likes ${Math.max(8, Number(product.review_count || 0) * 3 + 4)}</button>
              <button type="button" class="social-btn">Comments ${Math.max(2, Number(product.review_count || 0))}</button>
              <button type="button" class="social-btn share-btn" data-name="${escapeHtml(product.name)}">Share</button>
            </div>
            <form class="inline-form order-form" data-product-id="${product.id}">
              <input type="number" name="quantity" min="1" value="1" />
              <button type="submit" class="btn-primary small-btn">Order</button>
            </form>
            <form class="inline-form review-form" data-product-id="${product.id}">
              <select name="rating">
                <option value="5">5</option>
                <option value="4">4</option>
                <option value="3">3</option>
                <option value="2">2</option>
                <option value="1">1</option>
              </select>
              <input name="comment" type="text" placeholder="Leave a review" />
              <button type="submit" class="btn-ghost small-btn">Review</button>
            </form>
          </div>
        </article>
      `
    )
    .join('');

  bindProductInteractions();
}

function renderReels(products) {
  if (!products.length) {
    renderEmpty(buyerReels, 'No reels available yet.');
    return;
  }

  buyerReels.innerHTML = products
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

  buyerReels.querySelectorAll('.reel-share-btn').forEach((button) => {
    button.addEventListener('click', async () => {
      const productName = button.dataset.name || 'Product';
      await copyOrShare('StreeSetu Reel', `Trending on StreeSetu: ${productName}`, window.location.href, 'Reel link copied to clipboard.');
    });
  });

  buyerReels.querySelectorAll('.reel-card').forEach((reel) => {
    reel.addEventListener('dblclick', () => {
      reel.classList.remove('liked-flash');
      void reel.offsetWidth;
      reel.classList.add('liked-flash');
    });
  });
}

function renderReviews(reviews) {
  if (!buyerReviews) {
    return;
  }

  if (!reviews.length) {
    renderEmpty(buyerReviews, 'Reviews will appear here after customers start engaging.');
    return;
  }

  buyerReviews.innerHTML = reviews
    .map(
      (review) => `
        <article class="mini-card">
          <strong>${review.product_name}</strong>
          <p>${starRating(review.rating)} by ${review.buyer_name}</p>
          <p>${review.comment}</p>
          <span class="meta-line">${review.entrepreneur_name}</span>
        </article>
      `
    )
    .join('');
}

function setupBuyerCategoryOptions(products) {
  const categories = [...new Set(products.map((item) => (item.business_category || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  buyerCategoryFilter.innerHTML =
    '<option value="all">All categories</option>' +
    categories.map((category) => `<option value="${category}">${category}</option>`).join('');
}

function getBuyerFilteredProducts() {
  const searchTerm = (buyerSearchInput.value || '').trim().toLowerCase();
  const category = buyerCategoryFilter.value || 'all';
  const sortBy = buyerSortSelect.value || 'newest';

  let filtered = buyerAllProducts.filter((item) => {
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
    if (sortBy === 'rating') return Number(b.average_rating || 0) - Number(a.average_rating || 0);
    return (b.created_at || '').localeCompare(a.created_at || '');
  });

  return filtered;
}

function applyBuyerFilters() {
  const filteredProducts = getBuyerFilteredProducts();
  renderStories(filteredProducts);
  renderReels(filteredProducts);
  renderProducts(filteredProducts);
  buyerFeedCount.textContent = `${filteredProducts.length} products in feed`;
}

function initBuyerHomeControls() {
  if (buyerControlsBound) {
    return;
  }

  const apply = () => applyBuyerFilters();
  buyerSearchInput.addEventListener('input', apply);
  buyerCategoryFilter.addEventListener('change', apply);
  buyerSortSelect.addEventListener('change', apply);
  buyerControlsBound = true;
}

export async function loadBuyerHome() {
  renderHomeSkeleton();
  const data = await fetchJson('/api/dashboard/buyer/home');
  const products = data.products || [];
  buyerAllProducts = products;
  setupBuyerCategoryOptions(products);
  applyBuyerFilters();
  renderReviews(data.reviews || []);
}

export function initBuyerHomeTab() {
  initBuyerHomeControls();
}
