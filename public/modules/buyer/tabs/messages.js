import { fetchJson, renderEmpty, setMessage } from '../core.js';

const buyerMessages = document.getElementById('buyerMessages');
const buyerReceiverSelect = document.getElementById('buyerReceiverSelect');
const buyerMessageForm = document.getElementById('buyerMessageForm');
const buyerMessageMsg = document.getElementById('buyerMessageMsg');

function renderMessages(messages) {
  if (!messages.length) {
    renderEmpty(buyerMessages, 'Your conversations will appear here.');
    return;
  }

  buyerMessages.innerHTML = messages
    .map(
      (message) => `
        <article class="mini-card">
          <strong>${message.sender_name}</strong>
          <p>${message.message_text}</p>
          <span class="meta-line">To ${message.receiver_name} • ${new Date(message.created_at).toLocaleString()}</span>
        </article>
      `
    )
    .join('');
}

function renderEntrepreneurs(entrepreneurs) {
  buyerReceiverSelect.innerHTML = entrepreneurs
    .map(
      (entrepreneur) => `<option value="${entrepreneur.id}">${entrepreneur.full_name} ${entrepreneur.business_name ? `• ${entrepreneur.business_name}` : ''}</option>`
    )
    .join('');
}

export async function loadBuyerMessages() {
  const data = await fetchJson('/api/dashboard/buyer/messages');
  renderEntrepreneurs(data.entrepreneurs || []);
  renderMessages(data.messages || []);
}

export function initBuyerMessagesTab() {
  buyerMessageForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage(buyerMessageMsg, 'Sending...');
    const formData = new FormData(buyerMessageForm);
    try {
      await fetchJson('/api/dashboard/buyer/messages', {
        method: 'POST',
        body: JSON.stringify({
          receiverId: formData.get('receiverId'),
          messageText: formData.get('messageText')
        })
      });
      buyerMessageForm.reset();
      await loadBuyerMessages();
      setMessage(buyerMessageMsg, 'Message sent.', true);
    } catch (error) {
      setMessage(buyerMessageMsg, error.message);
    }
  });
}
