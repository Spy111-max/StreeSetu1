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
  const seed = String(seedText || 'Women startup product').trim();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#a0f3d1"/><stop offset="100%" stop-color="#dbfff0"/></linearGradient></defs><rect width="900" height="900" fill="url(#g)"/><circle cx="190" cy="195" r="120" fill="rgba(255,255,255,0.26)"/><circle cx="705" cy="250" r="150" fill="rgba(255,255,255,0.18)"/><circle cx="520" cy="650" r="210" fill="rgba(255,255,255,0.12)"/><text x="50%" y="51%" text-anchor="middle" dominant-baseline="middle" font-size="58" font-weight="700" fill="#1e3e35" font-family="Outfit, sans-serif">${seed}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
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
