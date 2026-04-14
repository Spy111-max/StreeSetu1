async function redirectByRole() {
	try {
		const response = await fetch('/api/me', { cache: 'no-store' });
		if (!response.ok) {
			window.location.replace('/');
			return;
		}

		const data = await response.json();
		const role = data?.user?.role;

		if (role === 'entrepreneur') {
			window.location.replace('/enterprenur_user_dashboard.html');
			return;
		}

		window.location.replace('/normal_user_dashboard.html');
	} catch (error) {
		window.location.replace('/');
	}
}

redirectByRole();
