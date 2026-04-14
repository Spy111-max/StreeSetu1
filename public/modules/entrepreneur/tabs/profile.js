import { fetchJson, setMessage } from '../core.js';

const businessSettingsForm = document.getElementById('businessSettingsForm');
const businessSettingsMsg = document.getElementById('businessSettingsMsg');
const businessPasswordForm = document.getElementById('businessPasswordForm');
const businessPasswordMsg = document.getElementById('businessPasswordMsg');

export async function loadEntrepreneurSettings() {
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

export function initEntrepreneurProfileTab(onProfileRefresh) {
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
      await onProfileRefresh();
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
}
