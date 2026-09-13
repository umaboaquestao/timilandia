import { questions as defaultQuestions } from '../src/questions.js';

const app = document.querySelector('#app');
const projectUrl = 'https://zwyvepsxmerblrwfqtxw.supabase.co';
const anonKey = 'sb_publishable_mUTBuM4Ycd6XyRf0I2hBbA_WMCda7eb';
const adminPassword = '654321';
let client; let liveSession; let player; let isHost = false; let liveChannel; let refreshTimer;

const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
const brand = () => '<header class="brand"><span class="brand-mark">T</span><div><strong>TiMI</strong><small>QUIZ LIVE</small></div></header>';
async function db() { if (!client) { const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'); client = createClient(projectUrl, anonKey); } return client; }
function questions() { try { const saved = JSON.parse(localStorage.getItem('timi-quiz-questions-v1')); return Array.isArray(saved) && saved.length ? saved : defaultQuestions; } catch { return defaultQuestions; } }
function stopSubscription() { if (liveChannel) client.removeChannel(liveChannel); liveChannel = null; }
function stopRefresh() { if (refreshTimer) clearInterval(refreshTimer); refreshTimer = null; }
function makeCode() { return `TIMI${Math.random().toString(36).slice(2, 6).toUpperCase()}`; }
function availableQuizzes() { const saved = questions(); return [{ id: 'original', name: 'Quiz TiMI original', description: 'As perguntas oficiais sobre mobilidade.', questions: defaultQuestions }, ...(saved !== defaultQuestions ? [{ id: 'browser', name: 'Quiz guardado neste browser', description: 'As perguntas configuradas no modo administração.', questions: saved }] : [])]; }

function home(message = '') {
  stopSubscription(); isHost = false; liveSession = null; player = null;
  app.innerHTML = `<div class="shell">${brand()}<section class="hero"><div class="eyebrow">Jogo em equipa</div><h1>TiMI Quiz Live</h1><p>Entra com o código da sala e responde às perguntas em tempo real.</p></section><section class="setup-panel"><form id="join-form"><label for="player-name">O teu nome</label><input id="player-name" maxlength="24" required placeholder="Ex.: Sofia"/><label for="room-code">Código da sala</label><input id="room-code" maxlength="10" required placeholder="Ex.: TIMI8X4P"/><button class="primary-button">Entrar na sala <b>→</b></button></form><p class="prototype-note">${escapeHtml(message)}</p></section><footer><a href="?admin">Criar uma sala como anfitrião</a></footer></div>`;
  document.querySelector('#join-form').addEventListener('submit', join);
}
async function join(event) {
  event.preventDefault(); const name = document.querySelector('#player-name').value.trim(); const code = document.querySelector('#room-code').value.trim().toUpperCase(); const supabase = await db();
  const { data: found, error } = await supabase.from('quiz_sessions').select('*').eq('room_code', code).neq('status', 'finished').single();
  if (error || !found) return home('Não encontrámos essa sala. Confirma o código com o anfitrião.');
  const { data: joined, error: joinError } = await supabase.from('quiz_players').insert({ session_id: found.id, name }).select().single();
  if (joinError) return home('Esse nome já está na sala. Escolhe outro nome.');
  liveSession = found; player = joined; subscribe(); playerScreen();
}
function login(message = '') {
  stopSubscription(); app.innerHTML = `<div class="shell result-shell">${brand()}<main class="result-card"><div class="eyebrow">Área reservada</div><h1>Anfitrião</h1><p>Introduz a senha para criar e conduzir uma sala live.</p><form id="host-login"><label for="host-password">Senha</label><input id="host-password" type="password" inputmode="numeric" autofocus required/><p class="prototype-note">${escapeHtml(message)}</p><button class="primary-button">Entrar <b>→</b></button></form></main></div>`;
  document.querySelector('#host-login').addEventListener('submit', e => { e.preventDefault(); document.querySelector('#host-password').value === adminPassword ? hostSetup() : login('Senha incorreta.'); });
}
function hostSetup() {
  isHost = true; const quizzes = availableQuizzes(); app.innerHTML = `<div class="shell result-shell">${brand()}<main class="result-card"><div class="eyebrow">Anfitrião</div><h1>Criar sala</h1><p>Escolhe o quiz desta sessão.</p><form id="quiz-choice"><label for="quiz-select">Quiz</label><select id="quiz-select">${quizzes.map(quiz => `<option value="${quiz.id}">${escapeHtml(quiz.name)} (${quiz.questions.length} perguntas)</option>`).join('')}</select><p id="quiz-description" class="prototype-note">${escapeHtml(quizzes[0].description)}</p><button class="primary-button">Criar sala live <b>→</b></button></form></main></div>`;
  const select = document.querySelector('#quiz-select'); const description = document.querySelector('#quiz-description'); select.addEventListener('change', () => { description.textContent = quizzes.find(quiz => quiz.id === select.value).description; }); document.querySelector('#quiz-choice').addEventListener('submit', createRoom);
}
async function createRoom(event) {
  event.preventDefault(); const selected = availableQuizzes().find(quiz => quiz.id === document.querySelector('#quiz-select').value) || availableQuizzes()[0]; const supabase = await db(); const { data, error } = await supabase.from('quiz_sessions').insert({ room_code: makeCode(), host_token: crypto.randomUUID(), questions: selected.questions, status: 'lobby' }).select().single();
  if (error) return window.alert(error.message); liveSession = data; subscribe(); hostScreen();
}
async function subscribe() {
  stopSubscription(); stopRefresh(); const supabase = await db(); liveChannel = supabase.channel(`timi-live-${liveSession.id}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_sessions', filter: `id=eq.${liveSession.id}` }, payload => { liveSession = payload.new; isHost ? hostScreen() : playerScreen(); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_players', filter: `session_id=eq.${liveSession.id}` }, () => { if (isHost) hostScreen(); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_answers', filter: `session_id=eq.${liveSession.id}` }, () => { if (isHost) hostScreen(); }).subscribe(); refreshTimer = setInterval(async () => { const { data } = await supabase.from('quiz_sessions').select('*').eq('id', liveSession.id).single(); if (data && (data.status !== liveSession.status || data.question_index !== liveSession.question_index)) { liveSession = data; isHost ? hostScreen() : playerScreen(); } }, 1500);
}
async function hostScreen() {
  const supabase = await db(); const { data: players = [] } = await supabase.from('quiz_players').select('*').eq('session_id', liveSession.id).order('score', { ascending: false }); const { data: answers = [] } = await supabase.from('quiz_answers').select('id').eq('session_id', liveSession.id).eq('question_index', liveSession.question_index);
  const all = liveSession.questions || []; const current = all[liveSession.question_index]; const final = liveSession.question_index >= all.length - 1; const action = liveSession.status === 'lobby' ? 'Começar pergunta 1' : final ? 'Terminar quiz' : 'Próxima pergunta';
  app.innerHTML = `<div class="shell"><header class="quiz-header">${brand()}<div class="player-chip"><span>Código</span><b>${escapeHtml(liveSession.room_code)}</b></div></header><main class="question-stage"><div class="eyebrow">${players.length} participantes</div><h1>${liveSession.status === 'lobby' ? 'Partilha o código e aguarda a equipa.' : escapeHtml(current?.question || 'Quiz terminado')}</h1><p class="prototype-note">${liveSession.status === 'question' ? `${answers.length} respostas recebidas` : 'Quando estiverem prontos, começa a primeira pergunta.'}</p><button id="advance" class="primary-button">${action} <b>→</b></button><div class="leaderboard"><h2>Classificação</h2><ol>${players.map(p => `<li><span>${escapeHtml(p.name)}</span><strong>${p.score}</strong></li>`).join('') || '<li>A aguardar participantes…</li>'}</ol></div></main></div>`;
  document.querySelector('#advance').addEventListener('click', advance);
}
async function advance() {
  const supabase = await db(); const all = liveSession.questions || []; const next = liveSession.status === 'lobby' ? { status: 'question', question_index: 0, question_started_at: new Date().toISOString() } : liveSession.question_index >= all.length - 1 ? { status: 'finished' } : { status: 'question', question_index: liveSession.question_index + 1, question_started_at: new Date().toISOString() }; const { error } = await supabase.from('quiz_sessions').update(next).eq('id', liveSession.id); if (error) return window.alert(error.message); liveSession = { ...liveSession, ...next }; hostScreen();
}
function playerScreen() {
  if (liveSession.status === 'lobby') return wait('Entraste na sala!', 'A aguardar que o anfitrião comece.'); if (liveSession.status === 'finished') return wait('Quiz terminado', 'Obrigado por participares!'); const question = liveSession.questions?.[liveSession.question_index]; if (!question) return wait('A preparar', 'A próxima pergunta está a chegar.');
  app.innerHTML = `<div class="shell quiz-shell"><header class="quiz-header">${brand()}<div class="player-chip"><span>${escapeHtml(player.name)}</span><b>${player.score || 0}</b></div></header><main class="question-stage"><div class="question-meta"><span>Pergunta ${liveSession.question_index + 1} de ${liveSession.questions.length}</span><span class="time-badge">LIVE</span></div><h1>${escapeHtml(question.question)}</h1><div class="answer-grid">${question.answers.map((answer, index) => `<button class="answer-button" data-answer="${index}"><span>${'ABCD'[index]}</span>${escapeHtml(answer)}</button>`).join('')}</div></main></div>`;
  document.querySelectorAll('[data-answer]').forEach(button => button.addEventListener('click', () => answer(Number(button.dataset.answer))));
}
async function answer(answerIndex) {
  document.querySelectorAll('[data-answer]').forEach(button => button.disabled = true); const supabase = await db(); const { error } = await supabase.rpc('submit_quiz_answer', { p_session_id: liveSession.id, p_player_id: player.id, p_question_index: liveSession.question_index, p_answer_index: answerIndex }); wait('Resposta enviada', error ? 'A aguardar a próxima pergunta.' : 'Boa! Aguarda pela próxima pergunta.');
}
function wait(title, text) { app.innerHTML = `<div class="shell result-shell">${brand()}<main class="result-card"><div class="eyebrow">TiMI Quiz Live</div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(text)}</p></main></div>`; }
new URLSearchParams(location.search).has('admin') ? login() : home();
