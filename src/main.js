import { W, CANVAS_H, HUD_H, POWERUPS } from './config.js';
import { formatScore } from './util.js';
import { AudioEngine } from './audio.js';
import { Input } from './input.js';
import { Game } from './game.js';
import { loadSettings, saveSettings, loadScores, saveScore, bestScore } from './storage.js';

const $ = (sel) => document.querySelector(sel);
const canvas = $('#game');
const hud = $('#hud');
const touch = $('#touch');

// ---------------------------------------------------------------- canvas fit
canvas.logicalW = W;
canvas.logicalH = CANVAS_H;
canvas.logicalOffsetY = HUD_H;

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(CANVAS_H * dpr);
  canvas.scaleX = dpr;
  canvas.scaleY = dpr;
}
resize();
window.addEventListener('resize', () => {
  resize();
  if (game && game.state !== 'playing') game.render();
});
window.addEventListener('orientationchange', () => setTimeout(resize, 120));

// ------------------------------------------------------------------ services
const settings = loadSettings();
const audio = new AudioEngine();
const input = new Input(canvas);

audio.setVolume(settings.volume);
audio.setMusicEnabled(settings.music);
document.body.classList.toggle('no-crt', !settings.crt);

let audioReady = false;
function unlockAudio() {
  if (audioReady) return;
  audioReady = true;
  audio.init();
  audio.setVolume(settings.volume);
  audio.setMusicEnabled(settings.music);
}
['pointerdown', 'keydown', 'touchstart'].forEach((ev) =>
  window.addEventListener(ev, unlockAudio, { once: false })
);

// ------------------------------------------------------------------- screens
const screens = {
  title: $('#screen-title'),
  pause: $('#screen-pause'),
  over: $('#screen-over'),
  help: $('#screen-help'),
  scores: $('#screen-scores'),
  settings: $('#screen-settings')
};

let current = 'title';
let backTo = 'title';

function showScreen(name) {
  Object.entries(screens).forEach(([key, el]) => el.classList.toggle('active', key === name));
  current = name;
  if (name) hud.classList.toggle('hidden', name === 'title');
}

function hideScreens() {
  Object.values(screens).forEach((el) => el.classList.remove('active'));
  current = null;
  hud.classList.remove('hidden');
}

function openSubScreen(name) {
  backTo = current || 'title';
  audio.sfx('ui');
  showScreen(name);
}

document.querySelectorAll('[data-back]').forEach((btn) =>
  btn.addEventListener('click', () => {
    audio.sfx('ui');
    showScreen(backTo);
  })
);

// ----------------------------------------------------------------------- HUD
const hudScore = $('#hud-score');
const hudWave = $('#hud-wave');
const hudLives = $('#hud-lives');
const comboFill = $('#combo-fill');
const comboMult = $('#combo-mult');
const surgeMeter = $('#surge-meter');
const surgeFill = $('#surge-fill');
const surgeText = $('#surge-text');
const chipHost = $('#powerchips');

let lastLives = -1;
let lastChipKey = '';

function renderHud(s) {
  hudScore.textContent = formatScore(s.score);
  hudWave.textContent = s.wave;

  if (s.lives !== lastLives) {
    lastLives = s.lives;
    hudLives.innerHTML = '';
    const shown = Math.min(s.lives, 8);
    for (let i = 0; i < shown; i++) {
      const pip = document.createElement('span');
      pip.className = 'life-pip' + (i >= 3 ? ' extra' : '');
      hudLives.appendChild(pip);
    }
    if (s.lives > 8) {
      const extra = document.createElement('span');
      extra.style.cssText = 'font-size:12px;align-self:center;color:#ffb03a';
      extra.textContent = `+${s.lives - 8}`;
      hudLives.appendChild(extra);
    }
  }

  const comboPct = s.combo > 0 ? Math.max(6, s.comboRatio * 100) : 0;
  comboFill.style.width = `${comboPct}%`;
  comboMult.textContent = `x${s.multiplier}`;

  surgeMeter.classList.toggle('ready', s.surge >= 1 && !s.surgeActive);
  surgeMeter.classList.toggle('active', s.surgeActive);
  if (s.surgeActive) {
    surgeFill.style.width = `${s.surgeRatio * 100}%`;
    surgeText.textContent = 'SURGE ACTIVE';
  } else {
    surgeFill.style.width = `${s.surge * 100}%`;
    surgeText.textContent = s.surge >= 1 ? 'SURGE READY — SHIFT' : 'SURGE';
  }

  // power-up chips (rebuilt only when the active set changes)
  const keys = Object.keys(s.powers);
  const sig = keys.join(',');
  if (sig !== lastChipKey) {
    lastChipKey = sig;
    chipHost.innerHTML = '';
    for (const key of keys) {
      const def = POWERUPS[key];
      if (!def) continue;
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.style.color = def.color;
      chip.dataset.key = key;
      chip.innerHTML = `<i>${def.label}</i><span>${def.name}</span><b></b>`;
      chipHost.appendChild(chip);
    }
  }
  for (const chip of chipHost.children) {
    const t = s.powers[chip.dataset.key];
    chip.querySelector('b').textContent = typeof t === 'number' && t > 1 ? `${t.toFixed(0)}s` : '';
  }
}

// ------------------------------------------------------------------ the game
const game = new Game({
  canvas,
  audio,
  input,
  settings,
  onHud: renderHud,
  onGameOver: (result) => showGameOver(result)
});

// handy for debugging from the console
window.__game = game;

function startRun() {
  unlockAudio();
  hideScreens();
  lastLives = -1;
  lastChipKey = '';
  game.start(settings.difficulty);
}

/** Leaves the run and repaints a fresh idle field behind the title screen. */
function returnToTitle() {
  game.stop();
  game.field.reset();
  game.field.populate(30);
  game.centipede.reset();
  game.enemies.reset();
  game.powerups.reset();
  game.particles.reset();
  game.bullets.reset();
  game.render();
  $('#title-best').textContent = formatScore(bestScore());
  showScreen('title');
}

input.onPause = () => {
  if (game.state === 'playing') {
    if (game.pause()) showScreen('pause');
  } else if (game.state === 'paused' && current === 'pause') {
    hideScreens();
    game.resume();
  }
};

// ------------------------------------------------------------- title screen
$('#title-best').textContent = formatScore(bestScore());

const diffGrid = $('#diff-grid');
function syncDifficulty() {
  diffGrid.querySelectorAll('.diff').forEach((b) =>
    b.classList.toggle('selected', b.dataset.diff === settings.difficulty)
  );
}
diffGrid.addEventListener('click', (e) => {
  const btn = e.target.closest('.diff');
  if (!btn) return;
  settings.difficulty = btn.dataset.diff;
  saveSettings(settings);
  syncDifficulty();
  audio.sfx('ui');
});
syncDifficulty();

$('#btn-play').addEventListener('click', startRun);
$('#btn-help').addEventListener('click', () => openSubScreen('help'));
$('#btn-scores').addEventListener('click', () => {
  renderScores();
  openSubScreen('scores');
});
$('#btn-settings').addEventListener('click', () => openSubScreen('settings'));

window.addEventListener('keydown', (e) => {
  if (e.code !== 'Enter') return;
  if (current === 'title') startRun();
  else if (current === 'over' && document.activeElement !== $('#initials')) startRun();
  else if (current === 'pause') input.onPause();
});

// -------------------------------------------------------------------- pause
$('#btn-resume').addEventListener('click', () => {
  audio.sfx('ui');
  hideScreens();
  game.resume();
});
$('#btn-pause-settings').addEventListener('click', () => openSubScreen('settings'));
$('#btn-quit').addEventListener('click', () => {
  audio.sfx('ui');
  returnToTitle();
});

// ---------------------------------------------------------------- game over
let pendingResult = null;

function showGameOver(result) {
  pendingResult = result;
  $('#final-score').textContent = formatScore(result.score);
  $('#stat-wave').textContent = result.wave;
  $('#stat-combo').textContent = result.bestCombo;
  $('#stat-acc').textContent = `${result.accuracy}%`;
  $('#stat-kills').textContent = result.kills;
  const row = $('#name-row');
  row.classList.remove('saved');
  $('#btn-save-score').disabled = false;
  const initials = $('#initials');
  initials.value = localStorage.getItem('neon-centipede/tag') || '';
  const best = bestScore();
  $('.over-title').textContent = result.score > 0 && result.score >= best ? 'NEW BEST!' : 'RUN OVER';
  showScreen('over');
}

$('#btn-save-score').addEventListener('click', () => {
  if (!pendingResult) return;
  const raw = ($('#initials').value || 'AAA').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3) || 'AAA';
  try { localStorage.setItem('neon-centipede/tag', raw); } catch { /* ignore */ }
  saveScore({
    name: raw,
    score: pendingResult.score,
    wave: pendingResult.wave,
    difficulty: pendingResult.difficulty,
    date: Date.now()
  });
  pendingResult = null;
  $('#name-row').classList.add('saved');
  $('#btn-save-score').disabled = true;
  $('#title-best').textContent = formatScore(bestScore());
  audio.sfx('powerup');
  renderScores();
});

$('#btn-again').addEventListener('click', startRun);
$('#btn-over-scores').addEventListener('click', () => {
  renderScores();
  openSubScreen('scores');
});
$('#btn-over-menu').addEventListener('click', () => {
  audio.sfx('ui');
  returnToTitle();
});

// --------------------------------------------------------------- leaderboard
function renderScores() {
  const list = $('#score-list');
  const scores = loadScores();
  list.innerHTML = '';
  if (!scores.length) {
    const li = document.createElement('li');
    li.style.cssText = 'grid-template-columns:1fr;border-color:transparent;background:none';
    li.innerHTML = '<span class="empty">No runs yet. The board is yours to take.</span>';
    list.appendChild(li);
    return;
  }
  scores.forEach((s, i) => {
    const li = document.createElement('li');
    if (i === 0) li.classList.add('top');
    const diff = (s.difficulty || 'classic').slice(0, 3).toUpperCase();
    li.innerHTML =
      `<span class="who">${s.name || 'AAA'}</span>` +
      `<span class="sc">${formatScore(s.score)}</span>` +
      `<span class="meta">W${s.wave || 1} · ${diff}</span>`;
    list.appendChild(li);
  });
}

// ------------------------------------------------------------------ settings
const setVolume = $('#set-volume');
const setMusic = $('#set-music');
const setShake = $('#set-shake');
const setCrt = $('#set-crt');
const setAutofire = $('#set-autofire');

setVolume.value = settings.volume;
setMusic.checked = settings.music;
setShake.checked = settings.shake;
setCrt.checked = settings.crt;
setAutofire.checked = settings.autofire;

setVolume.addEventListener('input', () => {
  settings.volume = parseFloat(setVolume.value);
  audio.setVolume(settings.volume);
  saveSettings(settings);
});
setMusic.addEventListener('change', () => {
  settings.music = setMusic.checked;
  audio.setMusicEnabled(settings.music);
  if (settings.music && game.state === 'playing') audio.startMusic();
  saveSettings(settings);
});
setShake.addEventListener('change', () => {
  settings.shake = setShake.checked;
  game.shaker.enabled = settings.shake;
  saveSettings(settings);
});
setCrt.addEventListener('change', () => {
  settings.crt = setCrt.checked;
  document.body.classList.toggle('no-crt', !settings.crt);
  saveSettings(settings);
});
setAutofire.addEventListener('change', () => {
  settings.autofire = setAutofire.checked;
  saveSettings(settings);
});

// --------------------------------------------------------------- pickup list
const pickupHost = $('#pickup-list');
const PICKUP_BLURBS = {
  rapid: 'Fire rate way up for a few seconds.',
  spread: 'Three-way shot — great for clearing lanes.',
  pierce: 'Rounds punch straight through everything.',
  shield: 'Absorbs one hit. Stays until you need it.',
  time: 'Slows the whole swarm while you keep full speed.',
  bomb: 'Instant blast: clears mushrooms and shreds segments.',
  life: 'One more life. Rare.'
};
Object.values(POWERUPS).forEach((def) => {
  const li = document.createElement('li');
  li.innerHTML =
    `<i class="dot" style="background:${def.color};box-shadow:0 0 10px ${def.color}"></i>` +
    `<span><b>${def.name}</b> — ${PICKUP_BLURBS[def.key]}</span>`;
  pickupHost.appendChild(li);
});

// ------------------------------------------------------- touch / mobile bits
const coarse = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
if (coarse) {
  document.body.classList.add('has-touch');
  touch.classList.remove('hidden');
  input.bindButton($('#tbtn-dash'), 'dash');
  input.bindButton($('#tbtn-surge'), 'surge');
  $('#tbtn-pause').addEventListener('click', () => input.onPause());
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.state === 'playing') {
    game.pause();
    showScreen('pause');
  }
});

// Draw one idle frame so the playfield is visible behind the title screen.
game.field.populate(30);
game.render();
