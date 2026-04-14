import { fetchJson, renderEmpty, setMessage } from '../core.js';

const businessBuyerSelect = document.getElementById('businessBuyerSelect');
const businessEntrepreneurSelect = document.getElementById('businessEntrepreneurSelect');
const businessB2CForm = document.getElementById('businessB2CForm');
const businessB2BForm = document.getElementById('businessB2BForm');
const businessB2CMsg = document.getElementById('businessB2CMsg');
const businessB2BMsg = document.getElementById('businessB2BMsg');
const businessB2CFeed = document.getElementById('businessB2CFeed');
const businessB2BFeed = document.getElementById('businessB2BFeed');

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

function fillSelect(select, items, labelBuilder) {
  select.innerHTML = items.map((item) => `<option value="${item.id}">${labelBuilder(item)}</option>`).join('');
}

export async function loadEntrepreneurMessages() {
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

export function initEntrepreneurMessagesTab() {
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
      await loadEntrepreneurMessages();
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
      await loadEntrepreneurMessages();
      setMessage(businessB2BMsg, 'Message sent.', true);
    } catch (error) {
      setMessage(businessB2BMsg, error.message);
    }
  });
}
