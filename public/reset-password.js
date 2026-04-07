const forgotForm = document.getElementById('forgotForm');
const resetForm = document.getElementById('resetForm');
const forgotMsg = document.getElementById('forgotMsg');
const resetMsg = document.getElementById('resetMsg');

function setMessage(element, text, isSuccess = false) {
  element.style.color = isSuccess ? '#1b6f63' : '#7b1c11';
  element.textContent = text;
}

forgotForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage(forgotMsg, 'Generating reset token...');

  const payload = Object.fromEntries(new FormData(forgotForm).entries());

  try {
    const response = await fetch('/api/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();

    if (!response.ok) {
      setMessage(forgotMsg, data.message || 'Failed to generate token.');
      return;
    }

    let text = data.message;
    if (data.resetToken) {
      text += ` Token: ${data.resetToken}`;
    }
    setMessage(forgotMsg, text, true);
  } catch (error) {
    setMessage(forgotMsg, 'Unable to process request right now.');
  }
});

resetForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage(resetMsg, 'Verifying token and resetting password...');

  const payload = Object.fromEntries(new FormData(resetForm).entries());

  try {
    const response = await fetch('/api/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();

    if (!response.ok) {
      setMessage(resetMsg, data.message || 'Reset failed.');
      return;
    }

    setMessage(resetMsg, data.message, true);
    resetForm.reset();
  } catch (error) {
    setMessage(resetMsg, 'Unable to reset password right now.');
  }
});
