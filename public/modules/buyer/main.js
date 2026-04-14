import { fetchJson, recoverRouteOnError } from './core.js';
import { initBuyerHomeTab, loadBuyerHome } from './tabs/home.js';
import { initBuyerMessagesTab, loadBuyerMessages } from './tabs/messages.js';
import { loadBuyerCommunities } from './tabs/communities.js';
import { initBuyerSettingsTab, loadBuyerSettings } from './tabs/settings.js';

const buyerWelcome = document.getElementById('buyerWelcome');
const buyerMeta = document.getElementById('buyerMeta');
const buyerLogoutBtn = document.getElementById('buyerLogoutBtn');
const buyerTabs = document.querySelectorAll('#buyerTabs .dashboard-tab');
const buyerPanels = document.querySelectorAll('.dashboard-panel');

function setActivePanel(targetId) {
  buyerTabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.target === targetId));
  buyerPanels.forEach((panel) => panel.classList.toggle('active', panel.id === targetId));
}

async function loadBuyerProfile() {
  const data = await fetchJson('/api/dashboard/me');
  const user = data.user || {};
  buyerWelcome.textContent = `Welcome, ${user.fullName || 'Buyer'}`;
  buyerMeta.textContent = `${user.city || ''}${user.email ? ` • ${user.email}` : ''}`;
}

function initTabs() {
  buyerTabs.forEach((tab) => {
    tab.addEventListener('click', async () => {
      setActivePanel(tab.dataset.target);
      if (tab.dataset.target === 'buyerHomePanel') await loadBuyerHome();
      if (tab.dataset.target === 'buyerMessagesPanel') await loadBuyerMessages();
      if (tab.dataset.target === 'buyerCommunitiesPanel') await loadBuyerCommunities();
      if (tab.dataset.target === 'buyerSettingsPanel') await loadBuyerSettings();
    });
  });
}

function initGlobalActions() {
  buyerLogoutBtn.addEventListener('click', async () => {
    await fetchJson('/api/logout', { method: 'POST' });
    window.location.href = '/';
  });
}

async function init() {
  initTabs();
  initGlobalActions();
  initBuyerHomeTab();
  initBuyerMessagesTab();
  initBuyerSettingsTab(loadBuyerProfile);
  await loadBuyerProfile();
  await loadBuyerHome();
}

init().catch((error) => {
  if (error && (error.status === 401 || error.status === 403)) {
    recoverRouteOnError();
    return;
  }

  console.error('Buyer dashboard initialization failed:', error);
});
