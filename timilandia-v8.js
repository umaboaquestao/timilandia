const canvas = document.querySelector('#game-canvas');
const context = canvas.getContext('2d');
const gameOverPanel = document.querySelector('#game-over');
const restartButton = document.querySelector('#restart-button');
const energyValue = document.querySelector('#energy-value');
const coinsValue = document.querySelector('#coins-value');
const livesValue = document.querySelector('#lives-value');
const timerValue = document.querySelector('#timer-value');
const scoreValue = document.querySelector('#score-value');
const finalScore = document.querySelector('#final-score');
const missionList = document.querySelector('#mission-list');
const scoreForm = document.querySelector('#score-form');
const playerName = document.querySelector('#player-name');
const leaderboard = document.querySelector('#leaderboard');

const missions = [
  { id: 'energy', label: 'Recolhe energia', target: 4, unit: '✦', value: (game) => game.collectedEnergy },
  { id: 'coins', label: 'Apanha moedas', target: 3, unit: '●', value: (game) => game.collectedCoins },
  { id: 'distance', label: 'Pedala pela cidade', target: 10000, unit: 'km', value: (game) => Math.floor(game.distanceTravelled) },
];
const leaderboardKey = 'timilandia-top-scores';
const journeyTimeLimit = 120;

const world = { width: 2400, height: 1600 };
const roadLines = [
  { x: 0, y: 645, width: 2400, height: 130, direction: 'horizontal' },
  { x: 1010, y: 0, width: 140, height: 1600, direction: 'vertical' },
  { x: 0, y: 1125, width: 2400, height: 82, direction: 'horizontal' },
  { x: 1690, y: 0, width: 100, height: 1600, direction: 'vertical' },
];
const buildings = [
  { x: 155, y: 165, width: 290, height: 240, color: '#245a61' },
  { x: 540, y: 120, width: 300, height: 320, color: '#214f5b' },
  { x: 1270, y: 130, width: 285, height: 310, color: '#285f62' },
  { x: 1930, y: 155, width: 310, height: 280, color: '#20515e' },
  { x: 140, y: 880, width: 320, height: 170, color: '#20555b' },
  { x: 545, y: 900, width: 300, height: 155, color: '#286265' },
  { x: 1235, y: 870, width: 320, height: 175, color: '#20515e' },
  { x: 1900, y: 870, width: 330, height: 180, color: '#286265' },
  { x: 205, y: 1280, width: 290, height: 180, color: '#245a61' },
  { x: 590, y: 1290, width: 310, height: 170, color: '#21535d' },
  { x: 1240, y: 1300, width: 280, height: 160, color: '#286265' },
  { x: 1950, y: 1280, width: 300, height: 185, color: '#20515e' },
];
const trees = [
  [90, 110], [480, 520], [875, 185], [120, 520], [870, 510], [1580, 215], [1810, 530], [2290, 520],
  [910, 890], [1595, 920], [1815, 1170], [1040, 1360], [1840, 1390], [2310, 1190], [80, 1390],
];
const startingEnergy = [[270, 535], [740, 560], [1340, 560], [2020, 550], [460, 815], [1210, 820], [1790, 820], [2230, 820], [340, 1190], [880, 1190], [1370, 1230], [2040, 1200]];
const startingCoins = [[530, 535], [1150, 520], [1510, 815], [2160, 800], [610, 1180], [1630, 1190], [2280, 1170], [1120, 1420]];
const startingPollution = [
  { x: 690, y: 700, radius: 37 }, { x: 1450, y: 700, radius: 42 }, { x: 2050, y: 700, radius: 34 },
  { x: 830, y: 1080, radius: 31 }, { x: 1830, y: 1060, radius: 44 }, { x: 1110, y: 1240, radius: 33 },
];
const keys = new Set();
let deviceScale = 1;
let lastTime = 0;
let animationFrame;
let state;

function newGame() {
  state = {
    player: { x: 1180, y: 820, angle: 0, speed: 0, radius: 20, invulnerable: 0 },
    dog: { x: 820, y: 820, radius: 24, pulse: Math.random() * Math.PI * 2 },
    energy: startingEnergy.map(([x, y]) => ({ x, y, radius: 17, pulse: Math.random() * Math.PI * 2 })),
    coins: startingCoins.map(([x, y]) => ({ x, y, radius: 14, pulse: Math.random() * Math.PI * 2 })),
    pollution: startingPollution.map((item) => ({ ...item, pulse: Math.random() * Math.PI * 2 })),
    camera: { x: 0, y: 0 },
    collectedEnergy: 0,
    collectedCoins: 0,
    lives: 3,
    score: 0,
    distanceTravelled: 0,
    timeRemaining: journeyTimeLimit,
    completedMissions: new Set(),
    running: true,
  };
  gameOverPanel.hidden = true;
  leaderboard.hidden = true;
  scoreForm.hidden = false;
  playerName.value = '';
  renderMissions();
  updateHud();
  cancelAnimationFrame(animationFrame);
  lastTime = performance.now();
  animationFrame = requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
  const bounds = canvas.getBoundingClientRect();
  deviceScale = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(bounds.width * deviceScale);
  canvas.height = Math.floor(bounds.height * deviceScale);
  context.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
}

function gameLoop(now) {
  const elapsed = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  if (state.running) update(elapsed);
  draw(now / 1000);
  if (state.running) animationFrame = requestAnimationFrame(gameLoop);
}

function update(delta) {
  const player = state.player;
  let horizontal = 0;
  let vertical = 0;
  if (keys.has('arrowleft') || keys.has('a')) horizontal -= 1;
  if (keys.has('arrowright') || keys.has('d')) horizontal += 1;
  if (keys.has('arrowup') || keys.has('w')) vertical -= 1;
  if (keys.has('arrowdown') || keys.has('s')) vertical += 1;
  const inputLength = Math.hypot(horizontal, vertical) || 1;
  horizontal /= inputLength;
  vertical /= inputLength;
  const hasInput = Boolean(horizontal || vertical);
  const targetSpeed = hasInput ? 245 : 0;
  player.speed += (targetSpeed - player.speed) * Math.min(delta * 9, 1);
  if (hasInput) player.angle = Math.atan2(vertical, horizontal);
  const nextX = player.x + horizontal * player.speed * delta;
  const nextY = player.y + vertical * player.speed * delta;
  player.x = Math.max(player.radius + 10, Math.min(world.width - player.radius - 10, nextX));
  player.y = Math.max(player.radius + 10, Math.min(world.height - player.radius - 10, nextY));
  state.distanceTravelled += Math.hypot(horizontal * player.speed * delta, vertical * player.speed * delta);
  player.invulnerable = Math.max(0, player.invulnerable - delta);
  state.timeRemaining = Math.max(0, state.timeRemaining - delta);
  updateDog(delta);

  collectItems(state.energy, 30, () => { state.collectedEnergy += 1; state.score += 100; });
  collectItems(state.coins, 29, () => { state.collectedCoins += 1; state.score += 150; });
  for (const hazard of state.pollution) {
    if (player.invulnerable <= 0 && distance(player, hazard) < player.radius + hazard.radius - 4) {
      state.lives -= 1;
      state.score = Math.max(0, state.score - 100);
      player.invulnerable = 1.35;
      player.x = 1180;
      player.y = 820;
      state.dog.x = 820;
      state.dog.y = 820;
      if (state.lives <= 0) endGame();
      break;
    }
  }
  if (player.invulnerable <= 0 && distance(player, state.dog) < player.radius + state.dog.radius - 3) {
    state.lives -= 1;
    state.score = Math.max(0, state.score - 100);
    player.invulnerable = 1.35;
    player.x = 1180;
    player.y = 820;
    state.dog.x = 820;
    state.dog.y = 820;
    if (state.lives <= 0) endGame();
  }
  if (state.timeRemaining <= 0) endGame();
  state.camera.x += ((player.x - viewportWidth() / 2) - state.camera.x) * Math.min(delta * 5, 1);
  state.camera.y += ((player.y - viewportHeight() / 2) - state.camera.y) * Math.min(delta * 5, 1);
  state.camera.x = Math.max(0, Math.min(world.width - viewportWidth(), state.camera.x));
  state.camera.y = Math.max(0, Math.min(world.height - viewportHeight(), state.camera.y));
  checkMissions();
  updateHud();
}

function collectItems(items, collisionDistance, onCollect) {
  const player = state.player;
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (distance(player, items[index]) < collisionDistance) {
      items.splice(index, 1);
      onCollect();
    }
  }
}

function updateDog(delta) {
  const dog = state.dog;
  const player = state.player;
  const angle = Math.atan2(player.y - dog.y, player.x - dog.x);
  dog.x += Math.cos(angle) * 82 * delta;
  dog.y += Math.sin(angle) * 82 * delta;
}

function endGame() {
  state.running = false;
  finalScore.textContent = String(state.score).padStart(4, '0');
  gameOverPanel.hidden = false;
}

function renderMissions() {
  missionList.innerHTML = missions.map((mission) => `<div class="mission-item" data-mission="${mission.id}"><p><span>${mission.label}</span><span class="mission-count">${mission.unit === 'km' ? '0.0/10 km' : `0/${mission.target}`}</span></p><div class="mission-progress"><span style="width: 0%"></span></div></div>`).join('');
}

function checkMissions() {
  for (const mission of missions) {
    const current = Math.min(mission.target, mission.value(state));
    const item = missionList.querySelector(`[data-mission="${mission.id}"]`);
    if (!item) continue;
    item.querySelector('.mission-count').textContent = mission.unit === 'km' ? `${(current / 1000).toFixed(1)}/10 km` : `${current}/${mission.target}`;
    item.querySelector('.mission-progress span').style.width = `${(current / mission.target) * 100}%`;
    if (current >= mission.target && !state.completedMissions.has(mission.id)) {
      state.completedMissions.add(mission.id);
      state.score += 250;
      item.classList.add('complete');
      item.querySelector('.mission-count').textContent = 'Feita!';
    }
  }
}

function getScores() {
  try { return JSON.parse(localStorage.getItem(leaderboardKey) || '[]'); } catch { return []; }
}

function saveScore(name) {
  const scores = [...getScores(), { name: name.trim().slice(0, 14) || 'Ciclista', score: state.score }]
    .sort((first, second) => second.score - first.score).slice(0, 10);
  try { localStorage.setItem(leaderboardKey, JSON.stringify(scores)); } catch { }
  renderLeaderboard(scores);
}

function renderLeaderboard(scores = getScores()) {
  leaderboard.innerHTML = `<h2>Top 10 da TiMIlandia</h2><ol>${scores.map((entry) => `<li><span>${escapeHtml(entry.name)}</span><strong>${String(entry.score).padStart(4, '0')}</strong></li>`).join('')}</ol>`;
  leaderboard.hidden = false;
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

function updateHud() {
  energyValue.textContent = state.collectedEnergy;
  coinsValue.textContent = state.collectedCoins;
  livesValue.textContent = state.lives;
  const seconds = Math.min(journeyTimeLimit, Math.ceil(state.timeRemaining));
  timerValue.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  timerValue.parentElement.parentElement.classList.toggle('urgent', seconds <= 20);
  scoreValue.textContent = String(state.score).padStart(4, '0');
}

function draw(time) {
  const width = viewportWidth();
  const height = viewportHeight();
  context.clearRect(0, 0, width, height);
  context.save();
  context.translate(-state.camera.x, -state.camera.y);
  drawWorld(time);
  drawPlayer(time);
  context.restore();
}

function drawWorld(time) {
  context.fillStyle = '#17484d';
  context.fillRect(0, 0, world.width, world.height);
  context.strokeStyle = 'rgba(201, 251, 131, .05)';
  context.lineWidth = 1;
  for (let x = 0; x <= world.width; x += 80) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, world.height); context.stroke(); }
  for (let y = 0; y <= world.height; y += 80) { context.beginPath(); context.moveTo(0, y); context.lineTo(world.width, y); context.stroke(); }
  for (const road of roadLines) drawRoad(road);
  for (const building of buildings) drawBuilding(building);
  for (const [x, y] of trees) drawTree(x, y);
  for (const item of state.energy) drawEnergy(item, time);
  for (const item of state.coins) drawCoin(item, time);
  for (const hazard of state.pollution) drawPollution(hazard, time);
  drawStation();
  drawDog(time);
}

function drawRoad(road) {
  context.fillStyle = '#274f55';
  context.fillRect(road.x, road.y, road.width, road.height);
  context.strokeStyle = 'rgba(245, 241, 197, .28)';
  context.lineWidth = 3;
  context.setLineDash([18, 22]);
  context.beginPath();
  if (road.direction === 'horizontal') { context.moveTo(road.x, road.y + road.height / 2); context.lineTo(road.x + road.width, road.y + road.height / 2); } else { context.moveTo(road.x + road.width / 2, road.y); context.lineTo(road.x + road.width / 2, road.y + road.height); }
  context.stroke(); context.setLineDash([]);
  context.strokeStyle = 'rgba(201, 251, 131, .1)'; context.lineWidth = 1; context.strokeRect(road.x, road.y, road.width, road.height);
}

function drawBuilding(building) {
  context.fillStyle = 'rgba(2, 27, 37, .28)'; context.fillRect(building.x + 10, building.y + 12, building.width, building.height);
  context.fillStyle = building.color; context.fillRect(building.x, building.y, building.width, building.height);
  context.strokeStyle = 'rgba(201, 251, 131, .22)'; context.lineWidth = 2; context.strokeRect(building.x, building.y, building.width, building.height);
  for (let x = building.x + 24; x < building.x + building.width - 15; x += 35) { context.fillStyle = 'rgba(201, 251, 131, .42)'; context.fillRect(x, building.y + 25, 12, 5); context.fillStyle = 'rgba(117, 224, 220, .22)'; context.fillRect(x, building.y + 52, 19, 8); }
  context.fillStyle = 'rgba(7, 29, 42, .35)'; context.fillRect(building.x + building.width * .42, building.y + building.height - 62, 42, 62);
}

function drawTree(x, y) {
  context.fillStyle = 'rgba(4, 30, 31, .25)'; context.beginPath(); context.ellipse(x + 7, y + 21, 29, 10, 0, 0, Math.PI * 2); context.fill();
  context.fillStyle = '#8bc768'; context.fillRect(x - 4, y + 7, 8, 27);
  context.fillStyle = '#5fae6b'; context.beginPath(); context.arc(x, y, 21, 0, Math.PI * 2); context.fill(); context.fillStyle = '#8ad36d'; context.beginPath(); context.arc(x - 9, y - 7, 12, 0, Math.PI * 2); context.fill();
}

function drawEnergy(item, time) {
  const scale = 1 + Math.sin(time * 4 + item.pulse) * .1;
  context.save(); context.translate(item.x, item.y); context.scale(scale, scale); context.shadowColor = '#c9fb83'; context.shadowBlur = 18; context.fillStyle = '#c9fb83'; context.beginPath(); context.moveTo(3, -15); context.lineTo(-8, 2); context.lineTo(-1, 2); context.lineTo(-5, 15); context.lineTo(9, -4); context.lineTo(2, -4); context.closePath(); context.fill(); context.restore();
}

function drawCoin(item, time) {
  const scale = .92 + Math.sin(time * 4 + item.pulse) * .08;
  context.save(); context.translate(item.x, item.y); context.scale(scale, scale); context.shadowColor = '#f4d35e'; context.shadowBlur = 15; context.fillStyle = '#f4d35e'; context.beginPath(); context.arc(0, 0, 13, 0, Math.PI * 2); context.fill(); context.shadowBlur = 0; context.strokeStyle = '#fff0a3'; context.lineWidth = 2; context.stroke(); context.fillStyle = '#a56b28'; context.font = '700 13px Space Grotesk'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText('T', 0, 1); context.restore();
}

function drawPollution(hazard, time) {
  const pulse = 1 + Math.sin(time * 3 + hazard.pulse) * .08;
  context.save(); context.translate(hazard.x, hazard.y); context.scale(pulse, pulse); context.fillStyle = 'rgba(240, 124, 103, .2)'; context.beginPath(); context.arc(0, 0, hazard.radius + 10, 0, Math.PI * 2); context.fill(); context.fillStyle = '#e95e59'; context.beginPath(); context.arc(0, 0, hazard.radius, 0, Math.PI * 2); context.fill(); context.strokeStyle = '#ffb078'; context.lineWidth = 3; context.stroke(); context.strokeStyle = '#7b303d'; context.lineWidth = 5; context.beginPath(); context.moveTo(-12, -12); context.lineTo(12, 12); context.moveTo(12, -12); context.lineTo(-12, 12); context.stroke(); context.restore();
}

function drawStation() {
  context.fillStyle = '#c9fb83'; context.fillRect(1065, 735, 90, 22); context.fillStyle = '#0b3340'; context.font = '700 12px Space Grotesk'; context.textAlign = 'center'; context.fillText('TiMI', 1110, 751); context.fillStyle = '#f4f1c5'; context.fillRect(1090, 758, 40, 52); context.fillStyle = '#17484d'; context.fillRect(1097, 770, 26, 40);
}

function drawPlayer(time) {
  const player = state.player;
  if (player.invulnerable > 0 && Math.floor(time * 12) % 2 === 0) return;
  context.save(); context.translate(player.x, player.y); context.rotate(player.angle); context.shadowColor = '#071d2a'; context.shadowBlur = 8; context.strokeStyle = '#f7ffe9'; context.lineWidth = 5; context.beginPath(); context.arc(-14, 0, 12, 0, Math.PI * 2); context.arc(16, 0, 12, 0, Math.PI * 2); context.stroke(); context.shadowBlur = 0; context.strokeStyle = '#f4d35e'; context.lineWidth = 5; context.beginPath(); context.moveTo(-14, 0); context.lineTo(-2, -15); context.lineTo(10, 0); context.lineTo(-14, 0); context.moveTo(-2, -15); context.lineTo(16, 0); context.moveTo(-2, -15); context.lineTo(7, -20); context.stroke(); context.fillStyle = '#c9fb83'; context.beginPath(); context.arc(2, -10, 8, 0, Math.PI * 2); context.fill(); context.fillStyle = '#f07c67'; context.beginPath(); context.arc(8, -22, 5, 0, Math.PI * 2); context.fill(); context.restore();
}

function drawDog(time) {
  const dog = state.dog;
  const player = state.player;
  const angle = Math.atan2(player.y - dog.y, player.x - dog.x);
  const bounce = Math.sin(time * 10 + dog.pulse) * 2;
  context.save();
  context.translate(dog.x, dog.y + bounce);
  context.rotate(angle);
  context.shadowColor = '#071d2a';
  context.shadowBlur = 9;
  context.fillStyle = '#f4a261';
  context.beginPath();
  context.ellipse(0, 0, 24, 17, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#d96b4c';
  context.beginPath();
  context.ellipse(19, -2, 15, 13, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#7b303d';
  context.beginPath();
  context.ellipse(23, -12, 7, 13, -.4, 0, Math.PI * 2);
  context.ellipse(23, 8, 7, 13, .4, 0, Math.PI * 2);
  context.fill();
  context.shadowBlur = 0;
  context.fillStyle = '#fff8df';
  context.beginPath();
  context.arc(24, -6, 3, 0, Math.PI * 2);
  context.arc(24, 6, 3, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#092b3a';
  context.beginPath();
  context.arc(25, -6, 1.5, 0, Math.PI * 2);
  context.arc(25, 6, 1.5, 0, Math.PI * 2);
  context.arc(34, 0, 4, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function distance(first, second) { return Math.hypot(first.x - second.x, first.y - second.y); }
function viewportWidth() { return canvas.clientWidth; }
function viewportHeight() { return canvas.clientHeight; }

window.addEventListener('resize', resizeCanvas);
window.addEventListener('keydown', (event) => { if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault(); keys.add(event.key.toLowerCase()); });
window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
restartButton.addEventListener('click', newGame);
scoreForm.addEventListener('submit', (event) => {
  event.preventDefault();
  saveScore(playerName.value);
  scoreForm.hidden = true;
});
document.querySelectorAll('[data-control]').forEach((button) => {
  const control = button.dataset.control;
  button.addEventListener('pointerdown', (event) => { event.preventDefault(); keys.add(control); });
  button.addEventListener('pointerup', () => keys.delete(control));
  button.addEventListener('pointerleave', () => keys.delete(control));
});
resizeCanvas();
newGame();
