import { fetchJson, renderEmpty, setMessage, escapeHtml } from '../core.js';
import { createCommunityCenter } from '../../shared/community-center.js';

const businessCommunityBrowseView = document.getElementById('businessCommunityBrowseView');
const businessCommunityChatView = document.getElementById('businessCommunityChatView');
const businessCommunityBackBtn = document.getElementById('businessCommunityBackBtn');

function openCommunityWorkspace(communityId) {
  if (!businessCommunityBrowseView || !businessCommunityChatView) {
    return;
  }

  businessCommunityBrowseView.hidden = true;
  businessCommunityChatView.hidden = false;
  if (Number.isInteger(Number(communityId)) && Number(communityId) > 0) {
    entrepreneurCommunityCenter.openCommunity(Number(communityId));
  }
}

function closeCommunityWorkspace() {
  if (!businessCommunityBrowseView || !businessCommunityChatView) {
    return;
  }

  businessCommunityChatView.hidden = true;
  businessCommunityBrowseView.hidden = false;
}

const entrepreneurCommunityCenter = createCommunityCenter({
  role: 'entrepreneur',
  fetchJson,
  renderEmpty,
  setMessage,
  escapeHtml,
  showJoinedOnlyList: true,
  onOpenCommunity: openCommunityWorkspace,
  elements: {
    list: document.getElementById('businessCommunities'),
    suggestions: document.getElementById('businessCommunitySuggestions'),
    chatFeed: document.getElementById('businessCommunityChatFeed'),
    chatTitle: document.getElementById('businessCommunityChatTitle'),
    chatMeta: document.getElementById('businessCommunityChatMeta'),
    form: document.getElementById('businessCommunityChatForm'),
    input: document.getElementById('businessCommunityChatInput'),
    message: document.getElementById('businessCommunityChatMsg')
  }
});

if (businessCommunityBackBtn) {
  businessCommunityBackBtn.addEventListener('click', closeCommunityWorkspace);
}

export async function loadEntrepreneurCommunities() {
  await entrepreneurCommunityCenter.load();

  const snapshot = entrepreneurCommunityCenter.getSnapshot();
  if (snapshot.joinedIds.length) {
    openCommunityWorkspace(snapshot.activeCommunityId || snapshot.joinedIds[0]);
    return;
  }

  closeCommunityWorkspace();
}
