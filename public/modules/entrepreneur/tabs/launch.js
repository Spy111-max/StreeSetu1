import { fetchJson, setMessage } from '../core.js';

const businessLaunchForm = document.getElementById('businessLaunchForm');
const businessLaunchMsg = document.getElementById('businessLaunchMsg');
const businessQuickLaunchForm = document.getElementById('businessQuickLaunchForm');
const businessQuickLaunchMsg = document.getElementById('businessQuickLaunchMsg');

export function initEntrepreneurLaunchTab(onAfterPost) {
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
      await onAfterPost();
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
      await onAfterPost();
      setMessage(businessQuickLaunchMsg, 'Product posted to your storefront.', true);
    } catch (error) {
      setMessage(businessQuickLaunchMsg, error.message);
    }
  });
}
