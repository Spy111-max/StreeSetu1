import { fetchJson, renderEmpty, setMessage, escapeHtml } from '../core.js';
import { createCommunityCenter } from '../../shared/community-center.js';

const buyerCommunityBrowseView = document.getElementById('buyerCommunityBrowseView');
const buyerCommunityChatView = document.getElementById('buyerCommunityChatView');
const buyerCommunityBackBtn = document.getElementById('buyerCommunityBackBtn');

function openCommunityWorkspace(communityId) {
  if (!buyerCommunityBrowseView || !buyerCommunityChatView) {
    return;
  }

  buyerCommunityBrowseView.hidden = true;
  buyerCommunityChatView.hidden = false;
  if (Number.isInteger(Number(communityId)) && Number(communityId) > 0) {
    buyerCommunityCenter.openCommunity(Number(communityId));
  }
}

function closeCommunityWorkspace() {
  if (!buyerCommunityBrowseView || !buyerCommunityChatView) {
    return;
  }

  buyerCommunityChatView.hidden = true;
  buyerCommunityBrowseView.hidden = false;
}

const buyerCommunityCenter = createCommunityCenter({
  role: 'customer',
  fetchJson,
  renderEmpty,
  setMessage,
  escapeHtml,
  showJoinedOnlyList: true,
  onOpenCommunity: openCommunityWorkspace,
  elements: {
    list: document.getElementById('buyerCommunities'),
    suggestions: document.getElementById('buyerCommunitySuggestions'),
    chatFeed: document.getElementById('buyerCommunityChatFeed'),
    chatTitle: document.getElementById('buyerCommunityChatTitle'),
    chatMeta: document.getElementById('buyerCommunityChatMeta'),
    form: document.getElementById('buyerCommunityChatForm'),
    input: document.getElementById('buyerCommunityChatInput'),
    message: document.getElementById('buyerCommunityChatMsg')
  }
});

if (buyerCommunityBackBtn) {
  buyerCommunityBackBtn.addEventListener('click', closeCommunityWorkspace);
}

export async function loadBuyerCommunities() {
  await buyerCommunityCenter.load();

  const snapshot = buyerCommunityCenter.getSnapshot();
  if (snapshot.joinedIds.length) {
    openCommunityWorkspace(snapshot.activeCommunityId || snapshot.joinedIds[0]);
    return;
  }

  closeCommunityWorkspace();
}
