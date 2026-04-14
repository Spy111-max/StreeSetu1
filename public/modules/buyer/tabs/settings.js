import { fetchJson, setMessage } from '../core.js';

const buyerSettingsForm = document.getElementById('buyerSettingsForm');
const buyerSettingsMsg = document.getElementById('buyerSettingsMsg');
const buyerPasswordForm = document.getElementById('buyerPasswordForm');
const buyerPasswordMsg = document.getElementById('buyerPasswordMsg');

export async function loadBuyerSettings() {
  const data = await fetchJson('/api/dashboard/buyer/settings');
  const settings = data.settings || {};
  buyerSettingsForm.fullName.value = settings.full_name || '';
  buyerSettingsForm.phone.value = settings.phone || '';
  buyerSettingsForm.city.value = settings.city || '';
  buyerSettingsForm.profilePictureUrl.value = settings.profile_picture_url || '';
  buyerSettingsForm.themePreference.value = settings.theme_preference || 'light';
  document.body.dataset.theme = settings.theme_preference || 'light';
}

export function initBuyerSettingsTab(onProfileRefresh) {
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
      await onProfileRefresh();
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
}
