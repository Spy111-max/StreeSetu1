import { fetchJson, renderEmpty } from '../core.js';

const buyerCommunities = document.getElementById('buyerCommunities');

function renderCommunities(communities) {
  if (!communities.length) {
    renderEmpty(buyerCommunities, 'No communities found.');
    return;
  }

  buyerCommunities.innerHTML = communities
    .map(
      (community) => `
        <article class="community-card">
          <p class="pill small-pill">${community.topic}</p>
          <h3>${community.title}</h3>
          <p>${community.description}</p>
          <span class="meta-line">${community.members_count} members</span>
        </article>
      `
    )
    .join('');
}

export async function loadBuyerCommunities() {
  const data = await fetchJson('/api/dashboard/communities');
  renderCommunities(data.communities || []);
}
