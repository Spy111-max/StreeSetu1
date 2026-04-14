import { fetchJson, recoverRouteOnError } from './core.js';
import { initEntrepreneurHomeTab, loadEntrepreneurHome } from './tabs/home.js';
import { initEntrepreneurMessagesTab, loadEntrepreneurMessages } from './tabs/messages.js';
import { loadEntrepreneurCommunities } from './tabs/communities.js';
import { initEntrepreneurAnalyticsTab, loadEntrepreneurAnalytics } from './tabs/analytics.js';
import { initEntrepreneurProfileTab, loadEntrepreneurSettings } from './tabs/profile.js';
import { initEntrepreneurLaunchTab } from './tabs/launch.js';

const businessWelcome = document.getElementById('businessWelcome');
const businessMeta = document.getElementById('businessMeta');
const businessLogoutBtn = document.getElementById('businessLogoutBtn');
const businessTabs = document.querySelectorAll('#businessTabs .dashboard-tab');
const businessPanels = document.querySelectorAll('.dashboard-panel');

function setActivePanel(targetId) {
  businessTabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.target === targetId));
  businessPanels.forEach((panel) => panel.classList.toggle('active', panel.id === targetId));
}

async function loadEntrepreneurProfile() {
  const data = await fetchJson('/api/dashboard/me');
  const user = data.user || {};
  businessWelcome.textContent = `Welcome, ${user.fullName || 'Business User'}`;
  businessMeta.textContent = `${user.business_name || ''}${user.city ? ` • ${user.city}` : ''}`;
  document.body.dataset.theme = user.theme_preference || 'light';
}

async function refreshHomeAndAnalytics() {
  await loadEntrepreneurHome();
  await loadEntrepreneurAnalytics();
}

function initTabs() {
  businessTabs.forEach((tab) => {
    tab.addEventListener('click', async () => {
      setActivePanel(tab.dataset.target);
      if (tab.dataset.target === 'businessHomePanel') await loadEntrepreneurHome();
      if (tab.dataset.target === 'businessMessagesPanel') await loadEntrepreneurMessages();
      if (tab.dataset.target === 'businessCommunitiesPanel') await loadEntrepreneurCommunities();
      if (tab.dataset.target === 'businessAnalyticsPanel') await loadEntrepreneurAnalytics();
      if (tab.dataset.target === 'businessProfilePanel') await loadEntrepreneurSettings();
    });
  });
}

function initGlobalActions() {
  businessLogoutBtn.addEventListener('click', async () => {
    await fetchJson('/api/logout', { method: 'POST' });
    window.location.href = '/';
  });
}

async function init() {
  initTabs();
  initGlobalActions();
  initEntrepreneurHomeTab();
  initEntrepreneurMessagesTab();
  initEntrepreneurAnalyticsTab();
  initEntrepreneurProfileTab(loadEntrepreneurProfile);
  initEntrepreneurLaunchTab(refreshHomeAndAnalytics);
  await loadEntrepreneurProfile();
  await loadEntrepreneurHome();
}

init().catch((error) => {
  if (error && (error.status === 401 || error.status === 403)) {
    recoverRouteOnError();
    return;
  }

  console.error('Entrepreneur dashboard initialization failed:', error);
});
