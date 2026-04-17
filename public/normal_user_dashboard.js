const buyerWelcome = document.getElementById('buyerWelcome');
const buyerMeta = document.getElementById('buyerMeta');
const buyerLogoutBtn = document.getElementById('buyerLogoutBtn');
const buyerTabs = document.querySelectorAll('#buyerTabs .dashboard-tab');
const buyerPanels = document.querySelectorAll('.dashboard-panel');
const buyerProducts = document.getElementById('buyerProducts');
const buyerReviews = document.getElementById('buyerReviews');
const buyerStories = document.getElementById('buyerStories');
const buyerReels = document.getElementById('buyerReels');
const buyerCommunities = document.getElementById('buyerCommunities');
const buyerMessages = document.getElementById('buyerMessages');
const buyerReceiverSelect = document.getElementById('buyerReceiverSelect');
const buyerMessageForm = document.getElementById('buyerMessageForm');
const buyerMessageMsg = document.getElementById('buyerMessageMsg');
const buyerSettingsForm = document.getElementById('buyerSettingsForm');
const buyerSettingsMsg = document.getElementById('buyerSettingsMsg');
const buyerPasswordForm = document.getElementById('buyerPasswordForm');
const buyerPasswordMsg = document.getElementById('buyerPasswordMsg');

function setMessage(element, text, isSuccess = false) {
  element.textContent = text;
  element.style.color = isSuccess ? '#1b6f63' : '#7b1c11';
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fallbackPhoto(seedText) {
  const seed = String(seedText || 'Women handmade product').trim();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ffb58f"/><stop offset="100%" stop-color="#ffd9c4"/></linearGradient></defs><rect width="900" height="900" fill="url(#g)"/><circle cx="190" cy="195" r="120" fill="rgba(255,255,255,0.24)"/><circle cx="705" cy="250" r="150" fill="rgba(255,255,255,0.18)"/><circle cx="520" cy="650" r="210" fill="rgba(255,255,255,0.12)"/><text x="50%" y="51%" text-anchor="middle" dominant-baseline="middle" font-size="58" font-weight="700" fill="#3f2a1f" font-family="Outfit, sans-serif">${seed}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function currency(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value || 0));
}

function starRating(value) {
  return '★'.repeat(Math.max(1, Math.round(Number(value || 0)))) + '☆'.repeat(Math.max(0, 5 - Math.round(Number(value || 0))));
}

function setActivePanel(targetId) {
  buyerTabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.target === targetId));
  buyerPanels.forEach((panel) => panel.classList.toggle('active', panel.id === targetId));
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }
  return data;
}

function renderEmpty(element, text) {
  element.innerHTML = `<div class="empty-state">${text}</div>`;
}

function renderSkeleton(target, count, skeletonClass) {
  target.innerHTML = Array.from({ length: count }, () => `<article class="${skeletonClass}"></article>`).join('');
}

function renderHomeSkeleton() {
  buyerStories.innerHTML = Array.from({ length: 6 }, () => '<article class="story-item skeleton-story"></article>').join('');
  renderSkeleton(buyerReels, 4, 'reel-card skeleton-card');
  renderSkeleton(buyerProducts, 3, 'post-card skeleton-card');
  renderSkeleton(buyerReviews, 4, 'mini-card skeleton-card');
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
        await loadHome();
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
        await loadHome();
      } catch (error) {
        alert(error.message);
      }
    });
  });

  buyerProducts.querySelectorAll('.share-btn').forEach((button) => {
    button.addEventListener('click', async () => {
      const productName = button.dataset.name || 'Product';
      const shareText = `Check out ${productName} on StreeSetu`;
      const shareUrl = window.location.href;
      if (navigator.share) {
        try {
          await navigator.share({ title: 'StreeSetu', text: shareText, url: shareUrl });
          return;
        } catch (error) {
          // Fallback to clipboard below.
        }
      }

      await navigator.clipboard.writeText(`${shareText} - ${shareUrl}`);
      alert('Share link copied to clipboard.');
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
      const shareText = `Trending on StreeSetu: ${productName}`;
      const shareUrl = window.location.href;
      if (navigator.share) {
        try {
          await navigator.share({ title: 'StreeSetu Reel', text: shareText, url: shareUrl });
          return;
        } catch (error) {
          // Fallback to clipboard below.
        }
      }

      await navigator.clipboard.writeText(`${shareText} - ${shareUrl}`);
      alert('Reel link copied to clipboard.');
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

function renderCommunities(communities) {
  if (!communities.length) {
    renderEmpty(buyerCommunities, 'No communities found.');
    return;
  }

  buyerCommunities.innerHTML = communities
    .map(
      (community) => `
        <article class="community-card">
          <p class="pill small-pill">${community.topic}</p>
          <h3>${community.title}</h3>
          <p>${community.description}</p>
          <span class="meta-line">${community.members_count} members</span>
        </article>
      `
    )
    .join('');
}

function renderMessages(messages) {
  if (!messages.length) {
    renderEmpty(buyerMessages, 'Your conversations will appear here.');
    return;
  }

  buyerMessages.innerHTML = messages
    .map(
      (message) => `
        <article class="mini-card">
          <strong>${message.sender_name}</strong>
          <p>${message.message_text}</p>
          <span class="meta-line">To ${message.receiver_name} • ${new Date(message.created_at).toLocaleString()}</span>
        </article>
      `
    )
    .join('');
}

function renderEntrepreneurs(entrepreneurs) {
  buyerReceiverSelect.innerHTML = entrepreneurs
    .map(
      (entrepreneur) => `<option value="${entrepreneur.id}">${entrepreneur.full_name} ${entrepreneur.business_name ? `• ${entrepreneur.business_name}` : ''}</option>`
    )
    .join('');
}

async function loadHome() {
  renderHomeSkeleton();
  const data = await fetchJson('/api/dashboard/buyer/home');
  const products = data.products || [];
  renderStories(products);
  renderReels(products);
  renderProducts(products);
  renderReviews(data.reviews || []);
}

async function loadMessages() {
  const data = await fetchJson('/api/dashboard/buyer/messages');
  renderEntrepreneurs(data.entrepreneurs || []);
  renderMessages(data.messages || []);
}

async function loadCommunities() {
  const data = await fetchJson('/api/dashboard/communities');
  renderCommunities(data.communities || []);
}

async function loadSettings() {
  const data = await fetchJson('/api/dashboard/buyer/settings');
  const settings = data.settings || {};
  buyerSettingsForm.fullName.value = settings.full_name || '';
  buyerSettingsForm.phone.value = settings.phone || '';
  buyerSettingsForm.city.value = settings.city || '';
  buyerSettingsForm.profilePictureUrl.value = settings.profile_picture_url || '';
  buyerSettingsForm.themePreference.value = settings.theme_preference || 'light';
  document.body.dataset.theme = settings.theme_preference || 'light';
}

async function loadProfile() {
  const data = await fetchJson('/api/dashboard/me');
  const user = data.user || {};
  buyerWelcome.textContent = `Welcome, ${user.fullName || 'Buyer'}`;
  buyerMeta.textContent = `${user.city || ''}${user.email ? ` • ${user.email}` : ''}`;
}

buyerTabs.forEach((tab) => {
  tab.addEventListener('click', async () => {
    setActivePanel(tab.dataset.target);
    if (tab.dataset.target === 'buyerHomePanel') await loadHome();
    if (tab.dataset.target === 'buyerMessagesPanel') await loadMessages();
    if (tab.dataset.target === 'buyerCommunitiesPanel') await loadCommunities();
    if (tab.dataset.target === 'buyerSettingsPanel') await loadSettings();
  });
});

buyerMessageForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage(buyerMessageMsg, 'Sending...');
  const formData = new FormData(buyerMessageForm);
  try {
    await fetchJson('/api/dashboard/buyer/messages', {
      method: 'POST',
      body: JSON.stringify({
        receiverId: formData.get('receiverId'),
        messageText: formData.get('messageText')
      })
    });
    buyerMessageForm.reset();
    await loadMessages();
    setMessage(buyerMessageMsg, 'Message sent.', true);
  } catch (error) {
    setMessage(buyerMessageMsg, error.message);
  }
});

buyerSettingsForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage(buyerSettingsMsg, 'Saving...');
  const formData = new FormData(buyerSettingsForm);
  try {
    await fetchJson('/api/dashboard/buyer/settings', {
      method: 'POST',
      body: JSON.stringify(Object.fromEntries(formData.entries()))
    });
    document.body.dataset.theme = formData.get('themePreference');
    setMessage(buyerSettingsMsg, 'Settings saved.', true);
    await loadProfile();
  } catch (error) {
    setMessage(buyerSettingsMsg, error.message);
  }
});

buyerPasswordForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage(buyerPasswordMsg, 'Updating...');
  const formData = new FormData(buyerPasswordForm);
  try {
    await fetchJson('/api/dashboard/change-password', {
      method: 'POST',
      body: JSON.stringify(Object.fromEntries(formData.entries()))
    });
    buyerPasswordForm.reset();
    setMessage(buyerPasswordMsg, 'Password updated.', true);
  } catch (error) {
    setMessage(buyerPasswordMsg, error.message);
  }
});

buyerLogoutBtn.addEventListener('click', async () => {
  await fetchJson('/api/logout', { method: 'POST' });
  window.location.href = '/';
});

async function init() {
  await loadProfile();
  await loadHome();
}

async function recoverRouteOnError() {
  try {
    const response = await fetch('/api/me', { cache: 'no-store' });
    if (!response.ok) {
      window.location.href = '/';
      return;
    }

    const data = await response.json();
    const role = data?.user?.role;
    if (role === 'entrepreneur') {
      window.location.href = '/enterprenur_user_dashboard.html';
      return;
    }

    window.location.href = '/normal_user_dashboard.html';
  } catch (error) {
    window.location.href = '/';
  }
}

init().catch(() => {
  recoverRouteOnError();
});