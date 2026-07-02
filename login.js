const form = document.getElementById('loginForm');
const errorEl = document.getElementById('formError');
const submitBtn = document.getElementById('submitBtn');

form.addEventListener('submit', (e) => {
  e.preventDefault();
  errorEl.textContent = '';

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();

  if (!name || !email) {
    errorEl.textContent = 'Sila isi nama dan emel.';
    return;
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    errorEl.textContent = 'Format emel tidak sah.';
    return;
  }

  submitBtn.disabled = true;

  // Simpan penumpang terus di browser (tiada server diperlukan)
  const player = { name, email };
  sessionStorage.setItem('lq_player', JSON.stringify(player));
  window.location.href = 'quiz.html';
});
