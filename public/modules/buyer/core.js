export function setMessage(element, text, isSuccess = false) {
  element.textContent = text;
  element.style.color = isSuccess ? '#1b6f63' : '#7b1c11';
}

export function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const REAL_IMAGE_FALLBACKS = [
  'https://images.pexels.com/photos/3184405/pexels-photo-3184405.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/1181406/pexels-photo-1181406.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/4348404/pexels-photo-4348404.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/6863256/pexels-photo-6863256.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/5816284/pexels-photo-5816284.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/6347547/pexels-photo-6347547.jpeg?auto=compress&cs=tinysrgb&w=1200'
];

function hashString(input = '') {
  let hash = 0;
  const text = String(input || 'streesetu-image-seed');
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function fallbackPhoto(seedText) {
  const seed = String(seedText || 'women entrepreneur business product').trim().toLowerCase();
  const index = hashString(seed) % REAL_IMAGE_FALLBACKS.length;
  return REAL_IMAGE_FALLBACKS[index];
}

export function currency(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value || 0));
}

export function starRating(value) {
  return '★'.repeat(Math.max(1, Math.round(Number(value || 0)))) + '☆'.repeat(Math.max(0, 5 - Math.round(Number(value || 0))));
}

export async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || 'Request failed');
    error.status = response.status;
    throw error;
  }
  return data;
}

export function renderEmpty(element, text) {
  element.innerHTML = `<div class="empty-state">${text}</div>`;
}

export function renderSkeleton(target, count, skeletonClass) {
  target.innerHTML = Array.from({ length: count }, () => `<article class="${skeletonClass}"></article>`).join('');
}

export async function copyOrShare(title, text, url, successMessage) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return;
    } catch (error) {
      // Fall through to clipboard.
    }
  }

  await navigator.clipboard.writeText(`${text} - ${url}`);
  alert(successMessage);
}

export async function recoverRouteOnError() {
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
