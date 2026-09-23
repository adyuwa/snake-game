// ─────────────────────────────────────────────
//  貪吃蛇 Snake — game.js
// ─────────────────────────────────────────────

const GRID_W = 25;   // cells wide
const GRID_H = 25;   // cells tall

// ── DOM refs ──
const screens = {
  start: document.getElementById('start-screen'),
  game:  document.getElementById('game-screen'),
  pause: document.getElementById('pause-screen'),
  over:  document.getElementById('over-screen'),
};
const canvas      = document.getElementById('game-canvas');
const ctx         = canvas.getContext('2d');
const scoreEl     = document.getElementById('score');
const bestEl      = document.getElementById('best');
const speedLabel  = document.getElementById('speed-label');
const finalScore  = document.getElementById('final-score');
const newBestMsg  = document.getElementById('new-best-msg');
const bestDisplay = document.getElementById('best-score-display');
const pauseBtn    = document.getElementById('pause-btn');
const dpadArea    = document.getElementById('dpad-area');
const hintText    = document.getElementById('controls-hint-text');

// ── Responsive canvas ──
// CELL px 由螢幕可用空間動態計算
let CELL = 20;

function isTouchDevice() {
  return window.matchMedia('(pointer: coarse)').matches;
}

function calcCell() {
  // HUD 高度約 48px，D-Pad 若是手機則預留 150px（兩排 64px + gap + padding）
  const hudH   = 48;
  const dpadH  = isTouchDevice() ? (64 * 2 + 6 + 16 + getSafeAreaBottom()) : 8;
  const safeT  = getSafeAreaTop();
  const safeL  = getSafeAreaLeft();
  const safeR  = getSafeAreaRight();

  const availW = window.innerWidth  - safeL - safeR - 2;   // 1px border × 2
  const availH = window.innerHeight - safeT - hudH - dpadH - 2;

  const cellByW = Math.floor(availW / GRID_W);
  const cellByH = Math.floor(availH / GRID_H);
  return Math.max(10, Math.min(cellByW, cellByH));
}

function getSafeAreaTop()    { return parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sat')) || 0; }
function getSafeAreaBottom() { return parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sab')) || 0; }
function getSafeAreaLeft()   { return parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sal')) || 0; }
function getSafeAreaRight()  { return parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sar')) || 0; }

function resizeCanvas() {
  CELL = calcCell();
  canvas.width  = GRID_W * CELL;
  canvas.height = GRID_H * CELL;
}

resizeCanvas();
window.addEventListener('resize', () => { resizeCanvas(); draw(); });
// 螢幕旋轉
window.addEventListener('orientationchange', () => {
  setTimeout(() => { resizeCanvas(); draw(); }, 200);
});

// ── Difficulty buttons ──
let selectedSpeed = 150;
const speedNames  = { 150: '慢', 100: '中', 60: '快' };
document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedSpeed = parseInt(btn.dataset.speed);
  });
});

// 根據裝置更新提示文字
if (isTouchDevice() && hintText) {
  hintText.innerHTML = '<span>滑動螢幕或使用下方方向鍵控制</span>';
}

// ── Screen helpers ──
function showScreen(id) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[id].classList.add('active');
  if (id === 'game') resizeCanvas();
}

// ── State ──
let snake, dir, nextDir, food, bonusFood;
let score, bestScore, gameLoop, speed;
let paused = false;
let bonusTimer = 0;
const BONUS_DURATION = 80;

// ── Best score ──
function loadBest() {
  bestScore = parseInt(localStorage.getItem('snakeBest') || '0');
  bestEl.textContent = bestScore;
  if (bestScore > 0) bestDisplay.textContent = `最高紀錄：${bestScore} 分`;
}
function saveBest() {
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('snakeBest', bestScore);
    return true;
  }
  return false;
}
loadBest();

// ── Spawn food ──
function randomCell(exclude = []) {
  let pos;
  do {
    pos = { x: Math.floor(Math.random() * GRID_W), y: Math.floor(Math.random() * GRID_H) };
  } while (exclude.some(p => p.x === pos.x && p.y === pos.y));
  return pos;
}
function spawnFood()  { food = randomCell(snake); }
function spawnBonus() { bonusFood = randomCell([...snake, food]); bonusTimer = BONUS_DURATION; }

// ── Init game ──
function initGame() {
  speed = selectedSpeed;
  score = 0;
  scoreEl.textContent = 0;
  bestEl.textContent = bestScore;
  speedLabel.textContent = `速度 ${speedNames[speed]}`;
  paused = false;
  bonusFood = null;
  bonusTimer = 0;

  const midX = Math.floor(GRID_W / 2);
  const midY = Math.floor(GRID_H / 2);
  snake = [
    { x: midX,     y: midY },
    { x: midX - 1, y: midY },
    { x: midX - 2, y: midY },
  ];
  dir     = { x: 1, y: 0 };
  nextDir = { x: 1, y: 0 };
  spawnFood();
}

// ── Draw ──
const COLORS = {
  head:      '#3fb950',
  body:      '#238636',
  bodyDark:  '#196127',
  food:      '#f85149',
  foodGlow:  'rgba(248,81,73,.35)',
  bonus:     '#d29922',
  bonusGlow: 'rgba(210,153,34,.4)',
  grid:      'rgba(255,255,255,.025)',
  eyeWhite:  '#e6edf3',
  eyePupil:  '#0d1117',
};

function drawGrid() {
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= GRID_W; x++) {
    ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, GRID_H * CELL); ctx.stroke();
  }
  for (let y = 0; y <= GRID_H; y++) {
    ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(GRID_W * CELL, y * CELL); ctx.stroke();
  }
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawCell(x, y, color, r = 3, inset = 2) {
  ctx.fillStyle = color;
  roundRect(x * CELL + inset, y * CELL + inset, CELL - inset * 2, CELL - inset * 2, r);
  ctx.fill();
}

function drawSnake() {
  for (let i = snake.length - 1; i >= 1; i--) {
    const ratio = 1 - i / snake.length * 0.45;
    const shade = i % 2 === 0 ? COLORS.body : COLORS.bodyDark;
    ctx.globalAlpha = ratio;
    drawCell(snake[i].x, snake[i].y, shade, 3);
  }
  ctx.globalAlpha = 1;

  const h = snake[0];
  drawCell(h.x, h.y, COLORS.head, 5, 1);

  // 眼睛隨方向移動
  const ex1 = { x: 0, y: 0 }, ex2 = { x: 0, y: 0 };
  const eyeOff = Math.max(2, CELL * 0.7);
  const eyeSide = Math.max(2, CELL * 0.2);
  const eyeEdge = Math.max(2, CELL * 0.65);
  if (dir.x === 1)       { ex1.x = eyeOff; ex1.y = eyeSide; ex2.x = eyeOff; ex2.y = CELL - eyeSide; }
  else if (dir.x === -1) { ex1.x = CELL - eyeOff; ex1.y = eyeSide; ex2.x = CELL - eyeOff; ex2.y = CELL - eyeSide; }
  else if (dir.y === -1) { ex1.x = eyeSide; ex1.y = CELL - eyeOff; ex2.x = CELL - eyeSide; ex2.y = CELL - eyeOff; }
  else                   { ex1.x = eyeSide; ex1.y = eyeOff; ex2.x = CELL - eyeSide; ex2.y = eyeOff; }

  const er = Math.max(1.2, CELL * 0.15);
  ctx.fillStyle = COLORS.eyeWhite;
  ctx.beginPath(); ctx.arc(h.x * CELL + ex1.x, h.y * CELL + ex1.y, er, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(h.x * CELL + ex2.x, h.y * CELL + ex2.y, er, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = COLORS.eyePupil;
  ctx.beginPath(); ctx.arc(h.x * CELL + ex1.x, h.y * CELL + ex1.y, er * 0.55, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(h.x * CELL + ex2.x, h.y * CELL + ex2.y, er * 0.55, 0, Math.PI * 2); ctx.fill();
}

function drawFood(f, color, glowColor) {
  const cx = f.x * CELL + CELL / 2, cy = f.y * CELL + CELL / 2;
  const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, CELL);
  grad.addColorStop(0, glowColor);
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(cx, cy, CELL, 0, Math.PI * 2); ctx.fill();
  drawCell(f.x, f.y, color, 8, 3);
  ctx.fillStyle = 'rgba(255,255,255,.25)';
  ctx.beginPath(); ctx.arc(cx - CELL * 0.15, cy - CELL * 0.15, CELL * 0.15, 0, Math.PI * 2); ctx.fill();
}

function drawBonus() {
  if (!bonusFood) return;
  if (bonusTimer < 20 && bonusTimer % 4 < 2) return;
  const cx = bonusFood.x * CELL + CELL / 2, cy = bonusFood.y * CELL + CELL / 2;
  ctx.strokeStyle = COLORS.bonus;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, CELL / 2 + 2, -Math.PI / 2, -Math.PI / 2 + (bonusTimer / BONUS_DURATION) * Math.PI * 2);
  ctx.stroke();
  drawFood(bonusFood, COLORS.bonus, COLORS.bonusGlow);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  if (food)      drawFood(food, COLORS.food, COLORS.foodGlow);
  drawBonus();
  if (snake)     drawSnake();
}

// ── Tick ──
function tick() {
  dir = { ...nextDir };
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

  if (head.x < 0 || head.x >= GRID_W || head.y < 0 || head.y >= GRID_H) return gameOver();
  if (snake.some(s => s.x === head.x && s.y === head.y)) return gameOver();

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score++;
    scoreEl.textContent = score;
    spawnFood();
    if (score % 5 === 0 && !bonusFood) spawnBonus();
  } else if (bonusFood && head.x === bonusFood.x && head.y === bonusFood.y) {
    score += 3;
    scoreEl.textContent = score;
    bonusFood = null;
    bonusTimer = 0;
  } else {
    snake.pop();
  }

  if (bonusFood) {
    bonusTimer--;
    if (bonusTimer <= 0) { bonusFood = null; bonusTimer = 0; }
  }

  draw();
}

// ── Game Over ──
function gameOver() {
  clearInterval(gameLoop);
  ctx.fillStyle = 'rgba(248,81,73,.15)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  setTimeout(() => {
    finalScore.textContent = score;
    const isNew = saveBest();
    bestEl.textContent = bestScore;
    newBestMsg.classList.toggle('hidden', !isNew);
    showScreen('over');
  }, 300);
}

// ── Start / Pause / Resume ──
function startGame() {
  resizeCanvas();
  initGame();
  showScreen('game');
  gameLoop = setInterval(tick, speed);
}

function pauseGame() {
  if (paused) return;
  paused = true;
  clearInterval(gameLoop);
  showScreen('pause');
}

function resumeGame() {
  paused = false;
  showScreen('game');
  gameLoop = setInterval(tick, speed);
}

// ── Keyboard input ──
const KEY_MAP = {
  ArrowUp:    { x: 0, y: -1 }, w: { x: 0, y: -1 }, W: { x: 0, y: -1 },
  ArrowDown:  { x: 0, y:  1 }, s: { x: 0, y:  1 }, S: { x: 0, y:  1 },
  ArrowLeft:  { x:-1, y:  0 }, a: { x:-1, y:  0 }, A: { x:-1, y:  0 },
  ArrowRight: { x: 1, y:  0 }, d: { x: 1, y:  0 }, D: { x: 1, y:  0 },
};
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (screens.game.classList.contains('active')) pauseGame();
    else if (screens.pause.classList.contains('active')) resumeGame();
    return;
  }
  const d = KEY_MAP[e.key];
  if (!d) return;
  e.preventDefault();
  if (d.x !== 0 && d.x === -dir.x) return;
  if (d.y !== 0 && d.y === -dir.y) return;
  nextDir = d;
});

// ── Button wiring ──
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('resume-btn').addEventListener('click', resumeGame);
document.getElementById('quit-btn').addEventListener('click', () => {
  clearInterval(gameLoop);
  loadBest();
  showScreen('start');
});
document.getElementById('replay-btn').addEventListener('click', startGame);
document.getElementById('menu-btn').addEventListener('click', () => {
  loadBest();
  showScreen('start');
});
pauseBtn.addEventListener('click', pauseGame);

// ── D-Pad 觸控方向鍵 ──
function applyDir(d) {
  if (!screens.game.classList.contains('active')) return;
  if (d.x !== 0 && d.x === -dir.x) return;
  if (d.y !== 0 && d.y === -dir.y) return;
  nextDir = d;
}

function buildDPad() {
  const container = document.createElement('div');
  container.id = 'touch-controls';
  container.innerHTML = `
    <div class="touch-row">
      <button class="touch-btn" data-dir="up" aria-label="上">▲</button>
    </div>
    <div class="touch-row">
      <button class="touch-btn" data-dir="left"  aria-label="左">◀</button>
      <button class="touch-btn" data-dir="down"  aria-label="下">▼</button>
      <button class="touch-btn" data-dir="right" aria-label="右">▶</button>
    </div>`;
  document.body.appendChild(container);

  const dirMap = {
    up:    { x: 0, y: -1 },
    down:  { x: 0, y:  1 },
    left:  { x:-1, y:  0 },
    right: { x: 1, y:  0 },
  };

  container.querySelectorAll('.touch-btn').forEach(btn => {
    // touchstart 提供即時反應（不等 touchend）
    btn.addEventListener('touchstart', e => {
      e.preventDefault();
      applyDir(dirMap[btn.dataset.dir]);
    }, { passive: false });
    // 鍵盤也可點按
    btn.addEventListener('mousedown', () => applyDir(dirMap[btn.dataset.dir]));
  });
}
buildDPad();

// ── 滑動手勢 (整個遊戲畫面) ──
let touchStartX = 0, touchStartY = 0;
const SWIPE_THRESHOLD = 20;

document.addEventListener('touchstart', e => {
  if (!screens.game.classList.contains('active')) return;
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, { passive: true });

document.addEventListener('touchend', e => {
  if (!screens.game.classList.contains('active')) return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return;
  let d;
  if (Math.abs(dx) > Math.abs(dy)) d = dx > 0 ? { x:1,y:0 } : { x:-1,y:0 };
  else                              d = dy > 0 ? { x:0,y:1 } : { x:0,y:-1 };
  applyDir(d);
}, { passive: true });

// ── 手機 Back 按鈕 (Capacitor) ──
document.addEventListener('backbutton', () => {
  if (screens.game.classList.contains('active')) pauseGame();
  else if (screens.pause.classList.contains('active')) resumeGame();
}, false);

// ── App 切換到背景時自動暫停 ──
document.addEventListener('visibilitychange', () => {
  if (document.hidden && screens.game.classList.contains('active')) pauseGame();
});
