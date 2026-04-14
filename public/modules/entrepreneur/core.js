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

export function fallbackPhoto(seedText) {
  const seed = encodeURIComponent((seedText || 'women startup product').toLowerCase());
  return `https://source.unsplash.com/900x900/?${seed},product,small-business`;
}

export function currency(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value || 0));
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
    if (role === 'customer') {
      window.location.href = '/normal_user_dashboard.html';
      return;
    }

    window.location.href = '/enterprenur_user_dashboard.html';
  } catch (error) {
    window.location.href = '/';
  }
}
