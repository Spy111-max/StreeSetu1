const welcomeText = document.getElementById('welcomeText');
const logoutBtn = document.getElementById('logoutBtn');

async function loadUser() {
  try {
    const response = await fetch('/api/me');
    if (!response.ok) {
      window.location.href = '/';
      return;
    }

    const data = await response.json();
    welcomeText.textContent = `Welcome, ${data.user.fullName}`;
  } catch (error) {
    window.location.href = '/';
  }
}

logoutBtn.addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/';
});

loadUser();
