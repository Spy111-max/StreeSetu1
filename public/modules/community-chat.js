import { fetchJson, renderEmpty, setMessage, escapeHtml } from './core.js';
import { createCommunityCenter } from './shared/community-center.js';

const query = new URLSearchParams(window.location.search);
const initialCommunityId = Number(query.get('communityId') || '0');

async function init() {
  const profileData = await fetchJson('/api/dashboard/me');
  const user = profileData.user || {};
  const role = user.role === 'entrepreneur' ? 'entrepreneur' : 'customer';

  const communityCenter = createCommunityCenter({
    role,
    fetchJson,
    renderEmpty,
    setMessage,
    escapeHtml,
    elements: {
      list: document.getElementById('communityPageCommunities'),
      suggestions: document.getElementById('communityPageSuggestions'),
      chatFeed: document.getElementById('communityPageChatFeed'),
      chatTitle: document.getElementById('communityPageChatTitle'),
      chatMeta: document.getElementById('communityPageChatMeta'),
      form: document.getElementById('communityPageChatForm'),
      input: document.getElementById('communityPageChatInput'),
      message: document.getElementById('communityPageChatMsg')
    }
  });

  await communityCenter.load();

  if (Number.isInteger(initialCommunityId) && initialCommunityId > 0) {
    communityCenter.openCommunity(initialCommunityId);
  }

  document.body.dataset.theme = user.theme_preference || 'light';
  document.getElementById('communityPageTitle').textContent = user.fullName ? `${user.fullName}'s community room` : 'Community room';
  document.getElementById('communityPageMeta').textContent = user.city
    ? `Chat as ${user.fullName || 'you'} from ${user.city}. Join, leave, and post in real time.`
    : 'Join, leave, and post in real time.';
}

init().catch((error) => {
  console.error('Community page initialization failed:', error);
});