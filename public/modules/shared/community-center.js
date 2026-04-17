const COMMUNITY_KEYWORDS = {
  'She Means Business': ['startup', 'growth', 'sales', 'founder', 'branding', 'launch'],
  'Women in Craft': ['craft', 'handmade', 'packaging', 'artisanal', 'design', 'market'],
  'Finance For Founders': ['finance', 'funding', 'pricing', 'bookkeeping', 'cash flow', 'profit'],
  'Digital Dukan Circle': ['e-commerce', 'social selling', 'marketplace', 'conversion', 'online store', 'catalogue'],
  'Wellness Women Collective': ['wellness', 'balance', 'mindset', 'health', 'routine', 'community']
};

const ROLE_SIGNAL_BANK = {
  customer: ['business', 'wellness', 'finance', 'community', 'shopping', 'e-commerce', 'women-led'],
  entrepreneur: ['startup', 'brand', 'marketing', 'funding', 'growth', 'pricing', 'founder', 'sales']
};

const MEMBER_NAME_BANK = {
  customer: ['Riya', 'Meera', 'Ananya', 'Sana'],
  entrepreneur: ['Kavya', 'Pooja', 'Naina', 'Aditi']
};

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function uniqueSignals(values) {
  return [...new Set(values.map((value) => normalizeText(value)).filter(Boolean))];
}

function safeParseJson(value, fallback) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function getCommunityKeywords(community) {
  const keywords = COMMUNITY_KEYWORDS[community.title] || COMMUNITY_KEYWORDS[community.topic] || [];
  return uniqueSignals([community.title, community.topic, community.description, ...keywords]);
}

function getRoleSignals(role, profile) {
  const profileSignals = [
    profile?.full_name,
    profile?.city,
    profile?.business_name,
    profile?.business_category,
    profile?.business_description
  ];

  return uniqueSignals([...(ROLE_SIGNAL_BANK[role] || ROLE_SIGNAL_BANK.customer), ...profileSignals]);
}

function formatTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function truncate(value, maxLength = 96) {
  const text = String(value || '').trim();
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1)}…`;
}

function createSeedMessages(community, role) {
  const memberNames = MEMBER_NAME_BANK[role] || MEMBER_NAME_BANK.customer;
  const topic = community.topic.toLowerCase();
  const seedTime = Date.now();

  return [
    {
      senderName: memberNames[0],
      senderRole: 'member',
      messageText: `I joined this room to trade practical ideas around ${topic}.`,
      createdAt: new Date(seedTime - 5400000).toISOString(),
      isSelf: false
    },
    {
      senderName: memberNames[1],
      senderRole: 'member',
      messageText: 'A useful first post is a clear question or one quick win from your week.',
      createdAt: new Date(seedTime - 2700000).toISOString(),
      isSelf: false
    },
    {
      senderName: memberNames[2],
      senderRole: 'member',
      messageText: 'People usually respond fast when the thread stays specific and actionable.',
      createdAt: new Date(seedTime - 900000).toISOString(),
      isSelf: false
    }
  ];
}

function createReplyText(community, text) {
  const normalized = normalizeText(text);
  const topic = community.topic.toLowerCase();

  if (normalized.includes('join')) {
    return `Welcome to ${community.title}. Share what you are building and the room will respond quickly.`;
  }

  if (normalized.includes('price') || normalized.includes('pricing')) {
    return `That pricing angle fits ${topic}. Try sharing a range and asking what buyers would expect.`;
  }

  if (normalized.includes('launch') || normalized.includes('start')) {
    return `A soft launch update will work well here. People in ${community.title} usually like details and a clear ask.`;
  }

  if (normalized.includes('help') || normalized.includes('idea')) {
    return `Good question. Post one concrete example and the group can react to it directly.`;
  }

  return `That is a useful note for ${community.title}. Keep the updates coming and people will jump in.`;
}

function createCommunitySignals(state, communities) {
  const signals = [];
  const joinedCommunities = communities.filter((community) => state.joinedIds.has(community.id));
  const activeActivity = Object.entries(state.activityByCommunity)
    .filter(([, count]) => Number(count) > 0)
    .sort((left, right) => Number(right[1]) - Number(left[1]))
    .slice(0, 3)
    .map(([communityId]) => communities.find((community) => community.id === Number(communityId)))
    .filter(Boolean);

  for (const community of [...joinedCommunities, ...activeActivity]) {
    signals.push(...getCommunityKeywords(community));
  }

  return uniqueSignals(signals);
}

function scoreSuggestion(community, state, communities, profile, role) {
  if (state.joinedIds.has(community.id)) {
    return Number.NEGATIVE_INFINITY;
  }

  const haystack = normalizeText(`${community.title} ${community.topic} ${community.description}`);
  const signals = createCommunitySignals(state, communities);
  const roleSignals = getRoleSignals(role, profile);
  let score = Number(state.activityByCommunity[community.id] || 0) * 2;

  for (const signal of roleSignals) {
    if (haystack.includes(signal)) {
      score += signal.length > 6 ? 3 : 2;
    }
  }

  for (const signal of signals) {
    if (haystack.includes(signal)) {
      score += signal.length > 6 ? 4 : 2;
    }
  }

  const category = normalizeText(profile?.business_category);
  if (category && haystack.includes(category)) {
    score += 5;
  }

  return score;
}

function buildSuggestionReason(community, profile, role, state, communities) {
  const haystack = normalizeText(`${community.title} ${community.topic} ${community.description}`);
  const roleSignals = getRoleSignals(role, profile);
  const sharedSignals = createCommunitySignals(state, communities);
  const matchedSignal = [...roleSignals, ...sharedSignals].find((signal) => signal && haystack.includes(signal));

  if (matchedSignal) {
    return `Matched with ${matchedSignal}`;
  }

  if (profile?.business_category) {
    return `Aligned with ${profile.business_category}`;
  }

  return 'Popular in your network';
}

function getMessagePreview(messages) {
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage) {
    return 'No messages yet.';
  }

  return truncate(lastMessage.messageText, 84);
}

export function createCommunityCenter({
  role,
  fetchJson,
  renderEmpty,
  setMessage,
  escapeHtml,
  onOpenCommunity,
  showJoinedOnlyList = false,
  profileUrl = '/api/dashboard/me',
  communitiesUrl = '/api/dashboard/communities',
  elements
}) {
  const storageKeyPrefix = `streesetu-community-center:${role}`;
  const state = {
    profile: null,
    communities: [],
    joinedIds: new Set(),
    activeCommunityId: null,
    messagesByCommunity: {},
    activityByCommunity: {}
  };
  let storageKey = `${storageKeyPrefix}:guest`;
  let listenersBound = false;

  function updateStatus(text, isSuccess = false) {
    if (!elements.message) {
      return;
    }

    setMessage(elements.message, text, isSuccess);
  }

  function getActiveCommunity() {
    return state.communities.find((community) => community.id === state.activeCommunityId) || null;
  }

  function getJoinedCount(communityId) {
    return state.joinedIds.has(communityId);
  }

  function ensureStateShape() {
    for (const community of state.communities) {
      const communityId = Number(community.id);
      const existingMessages = state.messagesByCommunity[communityId];
      if (!Array.isArray(existingMessages) || existingMessages.length === 0) {
        state.messagesByCommunity[communityId] = createSeedMessages(community, role);
      } else {
        state.messagesByCommunity[communityId] = existingMessages.map((message) => ({
          senderName: message.senderName || 'Member',
          senderRole: message.senderRole || 'member',
          messageText: message.messageText || '',
          createdAt: message.createdAt || new Date().toISOString(),
          isSelf: Boolean(message.isSelf)
        }));
      }

      if (typeof state.activityByCommunity[communityId] !== 'number') {
        state.activityByCommunity[communityId] = 0;
      }
    }

    if (!state.activeCommunityId || !state.communities.some((community) => community.id === state.activeCommunityId)) {
      const joinedCommunity = state.communities.find((community) => state.joinedIds.has(community.id));
      state.activeCommunityId = joinedCommunity?.id || state.communities[0]?.id || null;
    }
  }

  function loadStorage(profileId) {
    storageKey = `${storageKeyPrefix}:${profileId || 'guest'}`;
    let storedValue = null;
    try {
      storedValue = localStorage.getItem(storageKey);
    } catch (error) {
      storedValue = null;
    }

    const storedState = safeParseJson(storedValue, null);
    if (!storedState) {
      state.joinedIds = new Set();
      state.activeCommunityId = null;
      state.messagesByCommunity = {};
      state.activityByCommunity = {};
      return;
    }

    state.joinedIds = new Set(Array.isArray(storedState.joinedIds) ? storedState.joinedIds.map((value) => Number(value)) : []);
    state.activeCommunityId = storedState.activeCommunityId ? Number(storedState.activeCommunityId) : null;
    state.messagesByCommunity = storedState.messagesByCommunity || {};
    state.activityByCommunity = storedState.activityByCommunity || {};
  }

  function persistState() {
    const payload = {
      joinedIds: [...state.joinedIds],
      activeCommunityId: state.activeCommunityId,
      messagesByCommunity: state.messagesByCommunity,
      activityByCommunity: state.activityByCommunity
    };

    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (error) {
      // Ignore storage failures in private mode or low-storage conditions.
    }
  }

  function setActiveCommunity(communityId) {
    state.activeCommunityId = Number(communityId);
    persistState();
    renderAll();
  }

  function openCommunityTarget(communityId) {
    setActiveCommunity(communityId);

    if (typeof onOpenCommunity === 'function') {
      onOpenCommunity(communityId);
      return;
    }
  }

  function joinCommunity(communityId) {
    const numericId = Number(communityId);
    if (state.joinedIds.has(numericId)) {
      return false;
    }

    state.joinedIds.add(numericId);
    state.activeCommunityId = numericId;
    state.activityByCommunity[numericId] = Number(state.activityByCommunity[numericId] || 0) + 1;
    updateStatus('Joined the community.', true);
    return true;
  }

  function toggleJoin(communityId) {
    const numericId = Number(communityId);
    if (state.joinedIds.has(numericId)) {
      state.joinedIds.delete(numericId);
      if (state.activeCommunityId === numericId) {
        const fallbackCommunity = state.communities.find((community) => state.joinedIds.has(community.id)) || state.communities[0] || null;
        state.activeCommunityId = fallbackCommunity?.id || null;
      }
      updateStatus('Left the community.', true);
    } else {
      joinCommunity(numericId);
    }

    persistState();
    renderAll();
  }

  function addChatMessage(communityId, messageText, isSelf, senderName, senderRole) {
    const numericId = Number(communityId);
    const messages = state.messagesByCommunity[numericId] || [];
    messages.push({
      senderName,
      senderRole,
      messageText,
      createdAt: new Date().toISOString(),
      isSelf
    });
    state.messagesByCommunity[numericId] = messages;
  }

  function handleChatSubmit(event) {
    event.preventDefault();
    const activeCommunity = getActiveCommunity();
    if (!activeCommunity) {
      updateStatus('Select a community first.');
      return;
    }

    if (!state.joinedIds.has(activeCommunity.id)) {
      updateStatus('Join the community before sending a message.');
      return;
    }

    const formData = new FormData(elements.form);
    const messageText = String(formData.get('messageText') || '').trim();
    if (!messageText) {
      updateStatus('Write a message before sending.');
      return;
    }

    addChatMessage(activeCommunity.id, messageText, true, 'You', 'member');
    addChatMessage(activeCommunity.id, createReplyText(activeCommunity, messageText), false, MEMBER_NAME_BANK[role][0], 'member');
    state.activityByCommunity[activeCommunity.id] = Number(state.activityByCommunity[activeCommunity.id] || 0) + 2;
    elements.form.reset();
    persistState();
    renderAll();
    updateStatus('Message posted to the community.', true);
  }

  function handleActionClick(event) {
    const actionButton = event.target.closest('[data-action]');
    if (!actionButton) {
      return;
    }

    const communityId = Number(actionButton.dataset.communityId);
    if (!Number.isInteger(communityId) || communityId <= 0) {
      return;
    }

    if (actionButton.dataset.action === 'join-toggle') {
      toggleJoin(communityId);
      return;
    }

    if (actionButton.dataset.action === 'join-open') {
      joinCommunity(communityId);
      persistState();
      openCommunityTarget(communityId);
      return;
    }

    if (actionButton.dataset.action === 'select-community') {
      if (showJoinedOnlyList && !state.joinedIds.has(communityId)) {
        joinCommunity(communityId);
        persistState();
      }
      openCommunityTarget(communityId);
    }
  }

  function renderCommunities() {
    if (!elements.list) {
      return;
    }

    const visibleCommunities = showJoinedOnlyList
      ? state.communities.filter((community) => state.joinedIds.has(Number(community.id)))
      : state.communities;

    if (!visibleCommunities.length) {
      renderEmpty(
        elements.list,
        showJoinedOnlyList
          ? 'You have not joined any communities yet. Join one from Suggestions to start chatting.'
          : 'No communities available yet.'
      );
      return;
    }

    elements.list.innerHTML = visibleCommunities
      .map((community) => {
        const communityId = Number(community.id);
        const joined = getJoinedCount(communityId);
        const selected = state.activeCommunityId === communityId;
        const messages = state.messagesByCommunity[communityId] || [];
        const lastMessage = getMessagePreview(messages);

        return `
          <article class="community-card ${selected ? 'community-card-active' : ''}">
            <div class="community-card-head">
              <div>
                <p class="pill small-pill">${escapeHtml(community.topic)}</p>
                <h3>${escapeHtml(community.title)}</h3>
              </div>
              <span class="community-badge ${joined ? 'community-badge-joined' : 'community-badge-preview'}">${joined ? 'Joined' : 'Preview'}</span>
            </div>
            <p>${escapeHtml(community.description)}</p>
            <div class="community-card-meta">
              <span class="meta-line">${community.members_count} members</span>
              <span class="meta-line">Last update: ${escapeHtml(lastMessage)}</span>
            </div>
            <div class="community-actions">
              <button type="button" class="btn-ghost small-btn" data-action="select-community" data-community-id="${communityId}">${selected ? 'Viewing' : 'Open chat page'}</button>
              <button type="button" class="btn-primary small-btn" data-action="join-toggle" data-community-id="${communityId}">${joined ? 'Leave' : 'Join'}</button>
            </div>
          </article>
        `;
      })
      .join('');
  }

  function renderSuggestions() {
    if (!elements.suggestions) {
      return;
    }

    const suggestions = state.communities
      .map((community) => ({
        community,
        score: scoreSuggestion(community, state, state.communities, state.profile, role)
      }))
      .filter(({ score }) => Number.isFinite(score) && score > Number.NEGATIVE_INFINITY)
      .sort((left, right) => right.score - left.score)
      .slice(0, 3);

    if (!suggestions.length) {
      renderEmpty(elements.suggestions, 'No new suggestions right now. Join more spaces to improve recommendations.');
      return;
    }

    elements.suggestions.innerHTML = suggestions
      .map(({ community }) => {
        const communityId = Number(community.id);
        const reason = buildSuggestionReason(community, state.profile, role, state, state.communities);

        return `
          <article class="community-suggestion-item">
            <div class="community-card-head">
              <div>
                <p class="pill small-pill">Suggested</p>
                <h3>${escapeHtml(community.title)}</h3>
              </div>
            </div>
            <p>${escapeHtml(community.description)}</p>
            <div class="community-card-meta">
              <span class="meta-line">${escapeHtml(community.topic)}</span>
              <span class="meta-line">${escapeHtml(reason)}</span>
            </div>
            <button type="button" class="btn-primary small-btn" data-action="join-open" data-community-id="${communityId}">Join and open chat</button>
          </article>
        `;
      })
      .join('');
  }

  function renderChat() {
    if (!elements.chatFeed) {
      return;
    }

    const activeCommunity = getActiveCommunity();
    if (!activeCommunity) {
      renderEmpty(elements.chatFeed, 'Select a community to view its conversation.');
      if (elements.chatTitle) {
        elements.chatTitle.textContent = 'Community chat';
      }
      if (elements.chatMeta) {
        elements.chatMeta.textContent = 'Choose a community from the list or join a suggested one.';
      }
      if (elements.input) {
        elements.input.disabled = true;
        elements.input.placeholder = 'Join a community to start chatting';
      }
      return;
    }

    const joined = state.joinedIds.has(activeCommunity.id);
    const messages = state.messagesByCommunity[activeCommunity.id] || [];

    if (elements.chatTitle) {
      elements.chatTitle.textContent = activeCommunity.title;
    }

    if (elements.chatMeta) {
      elements.chatMeta.textContent = joined
        ? `${activeCommunity.topic} • You are in this community and can post messages.`
        : `${activeCommunity.topic} • Preview mode. Join to send a message.`;
    }

    if (!messages.length) {
      renderEmpty(elements.chatFeed, 'The conversation is quiet right now.');
    } else {
      elements.chatFeed.innerHTML = messages
        .map((message) => {
          const messageClass = message.isSelf ? 'community-message self' : 'community-message';
          const senderLabel = message.isSelf ? 'You' : message.senderName;

          return `
            <article class="${messageClass}">
              <div class="community-message-meta">
                <strong>${escapeHtml(senderLabel)}</strong>
                <span>${escapeHtml(formatTimestamp(message.createdAt))}</span>
              </div>
              <p>${escapeHtml(message.messageText)}</p>
            </article>
          `;
        })
        .join('');
    }

    if (elements.input) {
      elements.input.disabled = !joined;
      elements.input.placeholder = joined
        ? `Message ${activeCommunity.title}`
        : 'Join the community to post a message';
    }
  }

  function renderAll() {
    renderCommunities();
    renderSuggestions();
    renderChat();
  }

  function bindListeners() {
    if (listenersBound) {
      return;
    }

    if (elements.list) {
      elements.list.addEventListener('click', handleActionClick);
    }

    if (elements.suggestions) {
      elements.suggestions.addEventListener('click', handleActionClick);
    }

    if (elements.form) {
      elements.form.addEventListener('submit', handleChatSubmit);
    }

    listenersBound = true;
  }

  async function load() {
    const [profileData, communitiesData] = await Promise.all([fetchJson(profileUrl), fetchJson(communitiesUrl)]);
    state.profile = profileData.user || {};
    state.communities = Array.isArray(communitiesData.communities)
      ? communitiesData.communities.map((community) => ({ ...community, id: Number(community.id) }))
      : [];

    loadStorage(state.profile.id);
    ensureStateShape();
    bindListeners();
    persistState();
    renderAll();
  }

  return {
    load,
    openCommunity: setActiveCommunity,
    getSnapshot: () => ({
      communities: state.communities.map((community) => ({ ...community })),
      joinedIds: [...state.joinedIds],
      activeCommunityId: state.activeCommunityId
    })
  };
}