const SCORES_KEY = 'neon-centipede/scores/v1';
const SETTINGS_KEY = 'neon-centipede/settings/v1';

const DEFAULT_SETTINGS = {
  volume: 0.7,
  music: true,
  shake: true,
  crt: true,
  autofire: true,
  difficulty: 'classic'
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode / blocked storage: run without persistence */
  }
}

export function loadSettings() {
  return read(SETTINGS_KEY, DEFAULT_SETTINGS);
}

export function saveSettings(settings) {
  write(SETTINGS_KEY, settings);
}

export function loadScores() {
  try {
    const raw = localStorage.getItem(SCORES_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveScore(entry) {
  const list = loadScores();
  list.push(entry);
  list.sort((a, b) => b.score - a.score);
  const top = list.slice(0, 10);
  write(SCORES_KEY, top);
  return top;
}

export function bestScore() {
  const list = loadScores();
  return list.length ? list[0].score : 0;
}
