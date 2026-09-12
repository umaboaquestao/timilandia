import { questions as defaultQuestions } from './questions.js';

const app = document.querySelector('#app');
const storageKey = 'timi-quiz-questions-v1';
let quizQuestions = loadQuestions();
let currentQuestion = 0;
let score = 0;
let playerName = '';
let timerId;

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function escapeHtml(value = '') { return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]); }
function normalizeQuestion(question) {
  if (!question || typeof question.question !== 'string' || !Array.isArray(question.answers) || question.answers.length !== 4) return null;
  const answers = question.answers.map((answer) => String(answer).trim());
  const correct = Number(question.correct);
  const time = Math.max(5, Math.min(120, Number(question.time) || 20));
  if (!question.question.trim() || answers.some((answer) => !answer) || !Number.isInteger(correct) || correct < 0 || correct > 3) return null;
  return { question: question.question.trim(), answers, correct, time };
}
function loadQuestions() {
  try { const saved = JSON.parse(localStorage.getItem(storageKey)); if (Array.isArray(saved)) { const valid = saved.map(normalizeQuestion).filter(Boolean); if (valid.length) return valid; } } catch { /* defaults */ }
  return clone(defaultQuestions);
}
function saveQuestions() { localStorage.setItem(storageKey, JSON.stringify(quizQuestions)); }
function adminUrl() { const url = new URL(window.location.href); url.search = '?admin'; return url.href; }
function quizUrl() { const url = new URL(window.location.href); url.search = ''; return url.href; }
function brand() { return '<header class="brand"><span class="brand-mark">T</span><div><strong>TiMI</strong><small>QUIZ</small></div></header>'; }

function renderHome() {
  clearInterval(timerId);
  app.innerHTML = `<div class="shell">${brand()}<section class="hero"><div class="eyebrow">Mobilidade que aproxima</div><h1>Quanto sabes sobre a mobilidade do futuro?</h1><p>Um quiz rápido para aprender, desafiar a equipa e descobrir quem conhece melhor a TiMI.</p></section><section class="setup-panel"><form id="entry-form"><label for="name-input">Como te chamamos?</label><input id="name-input" maxlength="24" placeholder="O teu nome" required autofocus /><button class="primary-button" type="submit">Começar o quiz <b>→</b></button></form><p class="prototype-note">${quizQuestions.length} perguntas · responde antes de o tempo acabar</p></section><footer><span>Partilha este link com a equipa</span><span>•</span><a href="${escapeHtml(adminUrl())}">Modo administração</a></footer></div>`;
  document.querySelector('#entry-form').addEventListener('submit', (event) => { event.preventDefault(); playerName = document.querySelector('#name-input').value.trim() || 'Ciclista'; currentQuestion = 0; score = 0; renderQuiz(); });
}
function renderQuiz() {
  clearInterval(timerId); const question = quizQuestions[currentQuestion]; if (!question) return renderResult(); const progress = (currentQuestion / quizQuestions.length) * 100;
  app.innerHTML = `<div class="shell quiz-shell"><header class="quiz-header">${brand()}<div class="player-chip"><span>${escapeHtml(playerName)}</span><b>${String(score).padStart(3, '0')}</b></div></header><div class="progress-track"><span style="width:${progress}%"></span></div><main class="question-stage"><div class="question-meta"><span>Pergunta ${currentQuestion + 1} de ${quizQuestions.length}</span><span class="time-badge" id="timer">${question.time}s</span></div><h1>${escapeHtml(question.question)}</h1><div class="answer-grid">${question.answers.map((answer, index) => `<button class="answer-button answer-${index}" data-answer="${index}" type="button"><span>${String.fromCharCode(65 + index)}</span>${escapeHtml(answer)}</button>`).join('')}</div></main><div class="quiz-footer"><span>Olá, ${escapeHtml(playerName)}.</span><span>Escolhe a resposta certa</span></div></div>`;
  let remaining = question.time;
  timerId = setInterval(() => { remaining -= 1; const timer = document.querySelector('#timer'); if (timer) timer.textContent = `${remaining}s`; if (remaining <= 0) answerQuestion(-1, remaining); }, 1000);
  document.querySelectorAll('[data-answer]').forEach((button) => button.addEventListener('click', () => answerQuestion(Number(button.dataset.answer), remaining)));
}
function answerQuestion(answer, remaining) {
  if (!timerId) return; clearInterval(timerId); timerId = null; const question = quizQuestions[currentQuestion]; const buttons = document.querySelectorAll('[data-answer]');
  buttons.forEach((button) => { button.disabled = true; if (Number(button.dataset.answer) === question.correct) button.classList.add('correct'); }); const chosen = document.querySelector(`[data-answer="${answer}"]`);
  if (answer === question.correct) { score += 100 + Math.max(0, remaining) * 5; chosen.classList.add('selected-correct'); } else if (chosen) chosen.classList.add('selected-wrong');
  setTimeout(() => { currentQuestion += 1; renderQuiz(); }, 850);
}
function renderResult() {
  clearInterval(timerId); const maxScore = quizQuestions.reduce((total, question) => total + 100 + question.time * 5, 0);
  app.innerHTML = `<div class="shell result-shell">${brand()}<main class="result-card"><div class="eyebrow">Viagem concluída</div><h1>Boa viagem, ${escapeHtml(playerName || 'ciclista')}!</h1><p>Terminaste o quiz TiMI. Cada resposta é uma escolha por uma cidade mais simples e sustentável.</p><div class="score-display"><small>A tua pontuação</small><strong>${String(score).padStart(3, '0')}</strong><span>até ${maxScore} pontos</span></div><button id="restart-button" class="primary-button" type="button">Jogar novamente <b>→</b></button></main></div>`;
  document.querySelector('#restart-button').addEventListener('click', renderHome);
}
function renderAdmin() {
  clearInterval(timerId);
  app.innerHTML = `<div class="shell admin-shell">${brand()}<header class="admin-header"><div><div class="eyebrow">Área de administração</div><h1>Perguntas do quiz</h1><p>Altera, adiciona ou remove perguntas. Guarda no browser e exporta o ficheiro para publicar a versão final.</p></div><a class="secondary-button" href="${escapeHtml(quizUrl())}">Ver quiz →</a></header><div class="admin-actions"><button id="add-question" class="primary-button" type="button">+ Adicionar pergunta</button><button id="export-questions" class="secondary-button" type="button">Exportar perguntas</button><label class="secondary-button import-label">Importar perguntas<input id="import-questions" type="file" accept="application/json" hidden /></label><button id="reset-questions" class="text-button" type="button">Repor originais</button></div><p class="save-status" id="save-status">${quizQuestions.length} perguntas guardadas neste browser.</p><section id="question-editor" class="question-editor"></section></div>`;
  renderQuestionEditor();
  document.querySelector('#add-question').addEventListener('click', () => { quizQuestions.push({ question: 'Nova pergunta', answers: ['Resposta A', 'Resposta B', 'Resposta C', 'Resposta D'], correct: 0, time: 20 }); saveQuestions(); renderAdmin(); });
  document.querySelector('#export-questions').addEventListener('click', exportQuestions);
  document.querySelector('#import-questions').addEventListener('change', importQuestions);
  document.querySelector('#reset-questions').addEventListener('click', () => { if (window.confirm('Repor as perguntas originais? As alterações deste browser serão substituídas.')) { quizQuestions = clone(defaultQuestions); saveQuestions(); renderAdmin(); } });
}
function renderQuestionEditor() {
  const editor = document.querySelector('#question-editor');
  editor.innerHTML = quizQuestions.map((question, index) => `<article class="editor-card" data-index="${index}"><div class="editor-card-header"><strong>Pergunta ${index + 1}</strong><button class="delete-button" type="button" data-delete="${index}" ${quizQuestions.length === 1 ? 'disabled' : ''}>Remover</button></div><label>Pergunta<textarea data-field="question" rows="2">${escapeHtml(question.question)}</textarea></label><div class="answer-fields">${question.answers.map((answer, answerIndex) => `<label>Resposta ${String.fromCharCode(65 + answerIndex)}<input data-field="answer" data-answer-index="${answerIndex}" value="${escapeHtml(answer)}" /></label>`).join('')}</div><div class="editor-options"><label>Resposta certa<select data-field="correct">${question.answers.map((_, answerIndex) => `<option value="${answerIndex}" ${question.correct === answerIndex ? 'selected' : ''}>Resposta ${String.fromCharCode(65 + answerIndex)}</option>`).join('')}</select></label><label>Tempo (segundos)<input data-field="time" type="number" min="5" max="120" value="${question.time}" /></label></div></article>`).join('');
  editor.addEventListener('input', handleEditorChange); editor.addEventListener('change', handleEditorChange);
  editor.querySelectorAll('[data-delete]').forEach((button) => button.addEventListener('click', () => { quizQuestions.splice(Number(button.dataset.delete), 1); saveQuestions(); renderAdmin(); }));
}
function handleEditorChange(event) { const field = event.target.dataset.field; if (!field) return; const index = Number(event.target.closest('.editor-card').dataset.index); const question = quizQuestions[index]; if (field === 'answer') question.answers[Number(event.target.dataset.answerIndex)] = event.target.value; else if (field === 'correct' || field === 'time') question[field] = Number(event.target.value); else question[field] = event.target.value; saveQuestions(); document.querySelector('#save-status').textContent = `Alterações guardadas · ${quizQuestions.length} perguntas.`; }
function exportQuestions() { const blob = new Blob([JSON.stringify(quizQuestions, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'timi-quiz-perguntas.json'; link.click(); URL.revokeObjectURL(url); }
function importQuestions(event) { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { try { const loaded = JSON.parse(reader.result); const valid = Array.isArray(loaded) ? loaded.map(normalizeQuestion).filter(Boolean) : []; if (!valid.length || valid.length !== loaded.length) throw new Error(); quizQuestions = valid; saveQuestions(); renderAdmin(); } catch { window.alert('O ficheiro não contém perguntas válidas.'); } }; reader.readAsText(file); }
if (new URLSearchParams(window.location.search).has('admin')) renderAdmin(); else renderHome();

