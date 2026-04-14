const businessWelcome = document.getElementById('businessWelcome');
const businessMeta = document.getElementById('businessMeta');
const businessLogoutBtn = document.getElementById('businessLogoutBtn');
const businessTabs = document.querySelectorAll('#businessTabs .dashboard-tab');
const businessPanels = document.querySelectorAll('.dashboard-panel');
const businessOtherProducts = document.getElementById('businessOtherProducts');
const businessMyProducts = document.getElementById('businessMyProducts');
const businessCreatorStrip = document.getElementById('businessCreatorStrip');
const businessReels = document.getElementById('businessReels');
const businessBuyerSelect = document.getElementById('businessBuyerSelect');
const businessEntrepreneurSelect = document.getElementById('businessEntrepreneurSelect');
const businessB2CForm = document.getElementById('businessB2CForm');
const businessB2BForm = document.getElementById('businessB2BForm');
const businessB2CMsg = document.getElementById('businessB2CMsg');
const businessB2BMsg = document.getElementById('businessB2BMsg');
const businessB2CFeed = document.getElementById('businessB2CFeed');
const businessB2BFeed = document.getElementById('businessB2BFeed');
const businessCommunities = document.getElementById('businessCommunities');
const businessTotals = document.getElementById('businessTotals');
const businessFinanceForm = document.getElementById('businessFinanceForm');
const businessFinanceMsg = document.getElementById('businessFinanceMsg');
const businessFinanceRecords = document.getElementById('businessFinanceRecords');
const businessSettingsForm = document.getElementById('businessSettingsForm');
const businessSettingsMsg = document.getElementById('businessSettingsMsg');
const businessPasswordForm = document.getElementById('businessPasswordForm');
const businessPasswordMsg = document.getElementById('businessPasswordMsg');
const businessLaunchForm = document.getElementById('businessLaunchForm');
const businessLaunchMsg = document.getElementById('businessLaunchMsg');
const businessQuickLaunchForm = document.getElementById('businessQuickLaunchForm');
const businessQuickLaunchMsg = document.getElementById('businessQuickLaunchMsg');

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
  const seed = encodeURIComponent(seedText || 'StreeSetu');
  return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='820' height='820' viewBox='0 0 820 820'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='%23a0f3d1'/><stop offset='100%' stop-color='%23dbfff0'/></linearGradient></defs><rect width='820' height='820' fill='url(%23g)'/><text x='50%' y='54%' text-anchor='middle' font-size='58' fill='%231e3e35' font-family='Outfit, sans-serif'>${seed}</text></svg>`;
}

function currency(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value || 0));
}

function setActivePanel(targetId) {
  businessTabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.target === targetId));
  businessPanels.forEach((panel) => panel.classList.toggle('active', panel.id === targetId));
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
      const shareText = `StreeSetu creator pick: ${productName}`;
      const shareUrl = window.location.href;
      if (navigator.share) {
        try {
          await navigator.share({ title: 'StreeSetu Creator', text: shareText, url: shareUrl });
          return;
        } catch (error) {
          // Fallback to clipboard below.
        }
      }

      await navigator.clipboard.writeText(`${shareText} - ${shareUrl}`);
      alert('Share link copied to clipboard.');
    });
  });
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
      const shareText = `Trending market reel: ${productName}`;
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

  businessReels.querySelectorAll('.reel-card').forEach((reel) => {
    reel.addEventListener('dblclick', () => {
      reel.classList.remove('liked-flash');
      void reel.offsetWidth;
      reel.classList.add('liked-flash');
    });
  });
}

function renderMessages(element, messages, emptyText) {
  if (!messages.length) {
    renderEmpty(element, emptyText);
    return;
  }

  element.innerHTML = messages
    .map(
      (message) => `
        <article class="mini-card">
          <strong>${message.sender_name}</strong>
          <p>${message.message_text}</p>
          <span class="meta-line">${message.receiver_name} • ${new Date(message.created_at).toLocaleString()}</span>
        </article>
      `
    )
    .join('');
}

function renderCommunities(communities) {
  if (!communities.length) {
    renderEmpty(businessCommunities, 'No communities available.');
    return;
  }

  businessCommunities.innerHTML = communities
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

function renderTotals(totals) {
  businessTotals.innerHTML = `
    <div class="stat-card"><strong>${currency(totals.revenue)}</strong><span>Total revenue</span></div>
    <div class="stat-card"><strong>${Number(totals.items_sold || 0)}</strong><span>Items sold</span></div>
    <div class="stat-card"><strong>${Number(totals.product_count || 0)}</strong><span>Products</span></div>
    <div class="stat-card"><strong>${Number(totals.order_count || 0)}</strong><span>Orders</span></div>
  `;
}

function renderFinanceRecords(records) {
  if (!records.length) {
    renderEmpty(businessFinanceRecords, 'No finance records yet.');
    return;
  }

  businessFinanceRecords.innerHTML = records
    .map(
      (record) => `
        <article class="mini-card">
          <div class="item-topline">
            <strong>${record.period.toUpperCase()} • ${record.record_date}</strong>
            <span>${currency(record.revenue)}</span>
          </div>
          <p>Expenses: ${currency(record.expenses)} • Orders: ${record.orders_count}</p>
          <p>${record.notes || 'No notes recorded.'}</p>
        </article>
      `
    )
    .join('');
}

function fillSelect(select, items, labelBuilder) {
  select.innerHTML = items.map((item) => `<option value="${item.id}">${labelBuilder(item)}</option>`).join('');
}

async function loadProfile() {
  const data = await fetchJson('/api/dashboard/me');
  const user = data.user || {};
  businessWelcome.textContent = `Welcome, ${user.fullName || 'Business User'}`;
  businessMeta.textContent = `${user.business_name || ''}${user.city ? ` • ${user.city}` : ''}`;
  document.body.dataset.theme = user.theme_preference || 'light';
}

async function loadHome() {
  renderHomeSkeleton();
  const data = await fetchJson('/api/dashboard/entrepreneur/home');
  const products = data.products || [];
  renderCreatorStrip(products);
  renderReels(products);
  renderProductList(businessOtherProducts, products, 'Other entrepreneur products will appear here.', true);
  renderProductList(businessMyProducts, data.myProducts || [], 'Your launched products will appear here.');
}

async function loadMessages() {
  const data = await fetchJson('/api/dashboard/entrepreneur/messages');
  const buyers = data.buyers || [];
  const businesses = data.businesses || [];
  fillSelect(businessBuyerSelect, buyers, (buyer) => `${buyer.full_name} • ${buyer.email}`);
  fillSelect(businessEntrepreneurSelect, businesses, (business) => `${business.full_name} ${business.business_name ? `• ${business.business_name}` : ''}`);
  renderMessages(
    businessB2CFeed,
    data.messages.filter((message) => message.sender_role === 'customer' || message.receiver_role === 'customer'),
    'No B2C conversations yet.'
  );
  renderMessages(
    businessB2BFeed,
    data.messages.filter((message) => message.sender_role === 'entrepreneur' || message.receiver_role === 'entrepreneur'),
    'No B2B conversations yet.'
  );
}

async function loadCommunities() {
  const data = await fetchJson('/api/dashboard/communities');
  renderCommunities(data.communities || []);
}

async function loadAnalytics() {
  const data = await fetchJson('/api/dashboard/entrepreneur/analytics');
  renderTotals(data.totals || {});
  renderFinanceRecords(data.records || []);
}

async function loadSettings() {
  const data = await fetchJson('/api/dashboard/entrepreneur/settings');
  const settings = data.settings || {};
  businessSettingsForm.fullName.value = settings.full_name || '';
  businessSettingsForm.phone.value = settings.phone || '';
  businessSettingsForm.city.value = settings.city || '';
  businessSettingsForm.businessName.value = settings.business_name || '';
  businessSettingsForm.businessCategory.value = settings.business_category || '';
  businessSettingsForm.businessDescription.value = settings.business_description || '';
  businessSettingsForm.instagramHandle.value = settings.instagram_handle || '';
  businessSettingsForm.profilePictureUrl.value = settings.profile_picture_url || '';
  businessSettingsForm.themePreference.value = settings.theme_preference || 'light';
}

businessTabs.forEach((tab) => {
  tab.addEventListener('click', async () => {
    setActivePanel(tab.dataset.target);
    if (tab.dataset.target === 'businessHomePanel') await loadHome();
    if (tab.dataset.target === 'businessMessagesPanel') await loadMessages();
    if (tab.dataset.target === 'businessCommunitiesPanel') await loadCommunities();
    if (tab.dataset.target === 'businessAnalyticsPanel') await loadAnalytics();
    if (tab.dataset.target === 'businessProfilePanel') await loadSettings();
  });
});

businessB2CForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage(businessB2CMsg, 'Sending...');
  const formData = new FormData(businessB2CForm);
  try {
    await fetchJson('/api/dashboard/entrepreneur/messages', {
      method: 'POST',
      body: JSON.stringify(Object.fromEntries(formData.entries()))
    });
    businessB2CForm.reset();
    await loadMessages();
    setMessage(businessB2CMsg, 'Message sent.', true);
  } catch (error) {
    setMessage(businessB2CMsg, error.message);
  }
});

businessB2BForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage(businessB2BMsg, 'Sending...');
  const formData = new FormData(businessB2BForm);
  try {
    await fetchJson('/api/dashboard/entrepreneur/messages', {
      method: 'POST',
      body: JSON.stringify(Object.fromEntries(formData.entries()))
    });
    businessB2BForm.reset();
    await loadMessages();
    setMessage(businessB2BMsg, 'Message sent.', true);
  } catch (error) {
    setMessage(businessB2BMsg, error.message);
  }
});

businessFinanceForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage(businessFinanceMsg, 'Saving...');
  const formData = new FormData(businessFinanceForm);
  try {
    await fetchJson('/api/dashboard/entrepreneur/analytics', {
      method: 'POST',
      body: JSON.stringify(Object.fromEntries(formData.entries()))
    });
    businessFinanceForm.reset();
    await loadAnalytics();
    setMessage(businessFinanceMsg, 'Finance record saved.', true);
  } catch (error) {
    setMessage(businessFinanceMsg, error.message);
  }
});

businessSettingsForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage(businessSettingsMsg, 'Saving...');
  const formData = new FormData(businessSettingsForm);
  try {
    await fetchJson('/api/dashboard/entrepreneur/settings', {
      method: 'POST',
      body: JSON.stringify(Object.fromEntries(formData.entries()))
    });
    document.body.dataset.theme = formData.get('themePreference');
    setMessage(businessSettingsMsg, 'Settings saved.', true);
    await loadProfile();
  } catch (error) {
    setMessage(businessSettingsMsg, error.message);
  }
});

businessPasswordForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage(businessPasswordMsg, 'Updating...');
  const formData = new FormData(businessPasswordForm);
  try {
    await fetchJson('/api/dashboard/change-password', {
      method: 'POST',
      body: JSON.stringify(Object.fromEntries(formData.entries()))
    });
    businessPasswordForm.reset();
    setMessage(businessPasswordMsg, 'Password updated.', true);
  } catch (error) {
    setMessage(businessPasswordMsg, error.message);
  }
});

businessLaunchForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage(businessLaunchMsg, 'Launching...');
  const formData = new FormData(businessLaunchForm);
  try {
    await fetchJson('/api/dashboard/entrepreneur/products', {
      method: 'POST',
      body: JSON.stringify(Object.fromEntries(formData.entries()))
    });
    businessLaunchForm.reset();
    await loadHome();
    await loadAnalytics();
    setMessage(businessLaunchMsg, 'Product launched.', true);
  } catch (error) {
    setMessage(businessLaunchMsg, error.message);
  }
});

businessQuickLaunchForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage(businessQuickLaunchMsg, 'Posting...');
  const formData = new FormData(businessQuickLaunchForm);
  try {
    await fetchJson('/api/dashboard/entrepreneur/products', {
      method: 'POST',
      body: JSON.stringify(Object.fromEntries(formData.entries()))
    });
    businessQuickLaunchForm.reset();
    await loadHome();
    await loadAnalytics();
    setMessage(businessQuickLaunchMsg, 'Product posted to your storefront.', true);
  } catch (error) {
    setMessage(businessQuickLaunchMsg, error.message);
  }
});

businessLogoutBtn.addEventListener('click', async () => {
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
    if (role === 'customer') {
      window.location.href = '/normal_user_dashboard.html';
      return;
    }

    window.location.href = '/enterprenur_user_dashboard.html';
  } catch (error) {
    window.location.href = '/';
  }
}

init().catch(() => {
  recoverRouteOnError();
});