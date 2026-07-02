const player = JSON.parse(sessionStorage.getItem('lq_player') || 'null');
if (!player) {
  window.location.href = 'index.html';
}
document.getElementById('passengerName').textContent = player.name;

const GATES = [
  { lang: 'th', flag: '🇹🇭', label: 'Thai', native: 'ภาษาไทย'},
  { lang: 'zh', flag: '🇨🇳', label: 'Chinese', native: '中文'},
  { lang: 'en', flag: '🇬🇧', label: 'English', native: 'English'}
];

const completed = JSON.parse(sessionStorage.getItem('lq_completed') || '[]');

const gateSelect = document.getElementById('gateSelect');
const gateGrid = document.getElementById('gateGrid');
const quizPanel = document.getElementById('quizPanel');
const resultsPanel = document.getElementById('resultsPanel');

let QUESTIONS_DATA = null; // loaded once from questions.json
let currentQuiz = null;    // { lang, label, flag, font, questions }
let currentIndex = 0;
let userAnswers = [];

async function loadQuestions() {
  if (QUESTIONS_DATA) return QUESTIONS_DATA;
  const res = await fetch('questions.json');
  QUESTIONS_DATA = await res.json();
  return QUESTIONS_DATA;
}

function renderGates() {
  gateGrid.innerHTML = '';
  GATES.forEach((g) => {
    const btn = document.createElement('button');
    btn.className = 'gate-card';
    btn.innerHTML = `
      <span class="gate-flag">${g.flag}</span>
      <span class="gate-label">${g.label}</span>
      <span class="gate-native">${g.native}</span>
    `;
    btn.addEventListener('click', () => startQuiz(g.lang));
    btn.style.color = 'white';
    gateGrid.appendChild(btn);
  });
  updateStamps();
}

function updateStamps() {
  document.querySelectorAll('.stamp').forEach((el) => {
    if (completed.includes(el.dataset.lang)) el.classList.add('done');
  });
}

async function startQuiz(lang) {
  const data = await loadQuestions();
  const d = data[lang];
  if (!d) return;

  currentQuiz = { lang, label: d.label, flag: d.flag, font: d.font, questions: d.questions };
  currentIndex = 0;
  userAnswers = new Array(d.questions.length).fill(null);

  gateSelect.classList.add('hidden');
  resultsPanel.classList.add('hidden');
  quizPanel.classList.remove('hidden');

  document.getElementById('quizEyebrow').textContent = `GATE · ${d.flag} ${d.label.toUpperCase()}`;
  document.getElementById('quizQuestion').style.fontFamily = d.font;
  renderProgress();
  renderQuestion();
}

function renderProgress() {
  const track = document.getElementById('progressTrack');
  track.innerHTML = '';
  currentQuiz.questions.forEach((_, i) => {
    const dot = document.createElement('div');
    dot.className = 'progress-dot' + (i < currentIndex ? ' filled' : '');
    track.appendChild(dot);
  });
}

function renderQuestion() {
  const q = currentQuiz.questions[currentIndex];
  document.getElementById('quizQuestion').textContent = q.q;
  document.getElementById('quizCount').textContent = `${currentIndex + 1} / ${currentQuiz.questions.length}`;

  const optionsEl = document.getElementById('quizOptions');
  optionsEl.innerHTML = '';
  const letters = ['A', 'B', 'C', 'D'];

  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.innerHTML = `<span class="opt-letter">${letters[i]}</span><span>${opt}</span>`;
    btn.addEventListener('click', () => selectAnswer(i));
    optionsEl.appendChild(btn);
  });
}

function selectAnswer(i) {
  userAnswers[currentIndex] = i;
  renderProgress();

  // brief visual pause, then advance
  const buttons = document.querySelectorAll('.option-btn');
  buttons.forEach((b) => (b.disabled = true));
  buttons[i].classList.add('correct');

  setTimeout(() => {
    if (currentIndex < currentQuiz.questions.length - 1) {
      currentIndex += 1;
      renderProgress();
      renderQuestion();
    } else {
      finishQuiz();
    }
  }, 250);
}

function finishQuiz() {
  const questions = currentQuiz.questions;
  let score = 0;
  const results = questions.map((q, i) => {
    const chosen = userAnswers[i];
    const isCorrect = chosen === q.answer;
    if (isCorrect) score += 1;
    return { chosen, correct: q.answer, isCorrect };
  });

  // Simpan rekod skor terus di browser (localStorage) sebab
  // hosting statik (contoh: GitHub Pages) tidak boleh tulis fail scores.json
  const record = {
    name: player.name,
    email: player.email,
    lang: currentQuiz.lang,
    score,
    total: questions.length,
    when: new Date().toISOString()
  };
  const scores = JSON.parse(localStorage.getItem('lq_scores') || '[]');
  scores.push(record);
  localStorage.setItem('lq_scores', JSON.stringify(scores));

  if (!completed.includes(currentQuiz.lang)) {
    completed.push(currentQuiz.lang);
    sessionStorage.setItem('lq_completed', JSON.stringify(completed));
  }
  updateStamps();

  showResults({ score, total: questions.length, results });
}

function showResults(data) {
  quizPanel.classList.add('hidden');
  resultsPanel.classList.remove('hidden');

  document.getElementById('resultsTitle').textContent =
    `${currentQuiz.flag} ${currentQuiz.label} — ${data.score}/${data.total}`;
  document.getElementById('scoreValue').textContent = data.score;
  document.getElementById('scoreTotal').textContent = `/${data.total}`;

  const circumference = 377;
  const ratio = data.total ? data.score / data.total : 0;
  const ringFg = document.getElementById('ringFg');
  ringFg.style.strokeDashoffset = circumference;
  requestAnimationFrame(() => {
    ringFg.style.strokeDashoffset = String(circumference * (1 - ratio));
  });

  const list = document.getElementById('resultsList');
  list.innerHTML = '';
  data.results.forEach((r, i) => {
    const row = document.createElement('div');
    row.className = 'result-row ' + (r.isCorrect ? 'correct' : 'wrong');
    const q = currentQuiz.questions[i];
    const chosenText = r.chosen === null ? '—' : q.options[r.chosen];
    const correctText = q.options[r.correct];
    row.innerHTML = r.isCorrect
      ? `<span class="r-icon">✓</span><span>Q${i + 1}: ${chosenText}</span>`
      : `<span class="r-icon">✕</span><span>Q${i + 1}: you chose "${chosenText}" — correct was "${correctText}"</span>`;
    list.appendChild(row);
  });
}

document.getElementById('backGate').addEventListener('click', () => {
  quizPanel.classList.add('hidden');
  gateSelect.classList.remove('hidden');
});

document.getElementById('tryAnother').addEventListener('click', () => {
  resultsPanel.classList.add('hidden');
  gateSelect.classList.remove('hidden');
});

// ---- Exit / keluar ----
const exitBtn = document.getElementById('exitBtn');
const exitOverlay = document.getElementById('exitOverlay');
const exitCancel = document.getElementById('exitCancel');
const exitConfirm = document.getElementById('exitConfirm');

exitBtn.addEventListener('click', () => {
  exitOverlay.classList.remove('hidden');
});

exitCancel.addEventListener('click', () => {
  exitOverlay.classList.add('hidden');
});

exitOverlay.addEventListener('click', (e) => {
  if (e.target === exitOverlay) exitOverlay.classList.add('hidden');
});

exitConfirm.addEventListener('click', () => {
  sessionStorage.removeItem('lq_player');
  sessionStorage.removeItem('lq_completed');
  window.location.href = 'index.html';
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !exitOverlay.classList.contains('hidden')) {
    exitOverlay.classList.add('hidden');
  }
});

renderGates();
loadQuestions(); // pre-fetch supaya gate pertama terus laju
