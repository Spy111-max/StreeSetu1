const tabs = document.querySelectorAll('.tab');
const forms = document.querySelectorAll('.form');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const loginMsg = document.getElementById('loginMsg');
const signupMsg = document.getElementById('signupMsg');
const roleSelect = document.getElementById('roleSelect');
const entrepreneurFields = document.getElementById('entrepreneurFields');

function setMessage(element, text, isSuccess = false) {
  element.style.color = isSuccess ? '#1b6f63' : '#7b1c11';
  element.textContent = text;
}

function setEntrepreneurFieldState() {
  const isEntrepreneur = roleSelect.value === 'entrepreneur';
  entrepreneurFields.hidden = !isEntrepreneur;

  const fields = entrepreneurFields.querySelectorAll('input');
  fields.forEach((field) => {
    field.required = isEntrepreneur;
    field.disabled = !isEntrepreneur;
    if (!isEntrepreneur) {
      field.value = '';
    }
  });
}

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((item) => item.classList.remove('active'));
    forms.forEach((form) => form.classList.remove('active'));

    tab.classList.add('active');
    document.getElementById(tab.dataset.target).classList.add('active');

    loginMsg.textContent = '';
    signupMsg.textContent = '';
  });
});

roleSelect.addEventListener('change', setEntrepreneurFieldState);
setEntrepreneurFieldState();

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage(loginMsg, 'Checking credentials...');

  const payload = Object.fromEntries(new FormData(loginForm).entries());

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(loginMsg, data.message || 'Login failed.');
      return;
    }

    setMessage(loginMsg, 'Login successful. Redirecting...', true);
    window.location.href = data.redirectTo || '/normal_user_dashboard.html';
  } catch (error) {
    setMessage(loginMsg, 'Unable to login right now.');
  }
});

signupForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage(signupMsg, 'Creating account...');

  const payload = Object.fromEntries(new FormData(signupForm).entries());

  try {
    const response = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(signupMsg, data.message || 'Signup failed.');
      return;
    }

    let successText = data.message;
    if (data.entrepreneurApprovalPending) {
      successText += ' Your entrepreneur account will be available after admin approval.';
    }
    setMessage(signupMsg, successText, true);
    signupForm.reset();
    setEntrepreneurFieldState();

    tabs[0].click();
  } catch (error) {
    setMessage(signupMsg, 'Unable to signup right now.');
  }
});

