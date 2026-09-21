// Core dimensions. The playfield is a grid; everything else is free-moving pixels.
export const CELL = 24;
export const COLS = 28;
export const ROWS = 32;
export const W = COLS * CELL; // 672
export const H = ROWS * CELL; // 768

// A reserved band at the top of the canvas that the DOM HUD sits over, so the
// swarm never fights the score readout for pixels.
export const HUD_H = 104;
export const CANVAS_H = H + HUD_H;

// The bottom band the player is confined to (classic Centipede rule).
export const PLAYER_ZONE_ROWS = 7;
export const PLAYER_TOP = (ROWS - PLAYER_ZONE_ROWS) * CELL;

export const MUSH_HP = 4;

export const COLORS = {
  bg0: '#05030f',
  bg1: '#0b0725',
  grid: 'rgba(122,92,255,0.07)',
  player: '#5ffbf1',
  playerDark: '#1d7f8c',
  bullet: '#fdf6a0',
  mush: '#8a5cff',
  mushHot: '#c9a7ff',
  poison: '#43ff9e',
  head: '#ff4d9d',
  body: '#ffb03a',
  spider: '#b46bff',
  flea: '#59a6ff',
  scorpion: '#43ff9e',
  boss: '#ff3b6b',
  danger: '#ff4d6d'
};

export const DIFFICULTIES = {
  chill: {
    name: 'CHILL',
    blurb: 'Slower swarm, 5 lives. Learn the dance.',
    lives: 5,
    speed: 0.82,
    enemyRate: 0.7,
    segments: 9,
    dropRate: 0.16,
    scoreMult: 0.8
  },
  classic: {
    name: 'CLASSIC',
    blurb: 'The arcade tuning. 3 lives, fair but hungry.',
    lives: 3,
    speed: 1,
    enemyRate: 1,
    segments: 11,
    dropRate: 0.11,
    scoreMult: 1
  },
  insane: {
    name: 'INSANE',
    blurb: 'Two lives, double venom, no mercy.',
    lives: 2,
    speed: 1.28,
    enemyRate: 1.55,
    segments: 13,
    dropRate: 0.08,
    scoreMult: 1.6
  }
};

export const SCORE = {
  mushHit: 5,
  mushKill: 25,
  body: 100,
  head: 250,
  spider: 600,
  flea: 300,
  scorpion: 1000,
  bossNode: 350,
  boss: 7500,
  waveClear: 500
};

// Power-up catalogue. `dur` of 0 means an instant effect.
export const POWERUPS = {
  rapid:  { key: 'rapid',  label: 'R', name: 'RAPID FIRE', color: '#ffd166', dur: 11 },
  spread: { key: 'spread', label: 'W', name: 'WIDE SHOT',  color: '#5ffbf1', dur: 11 },
  pierce: { key: 'pierce', label: 'P', name: 'PIERCER',    color: '#ff8fd0', dur: 9 },
  shield: { key: 'shield', label: 'S', name: 'SHIELD',     color: '#7a5cff', dur: 0 },
  time:   { key: 'time',   label: 'T', name: 'TIME WARP',  color: '#8affc1', dur: 7 },
  bomb:   { key: 'bomb',   label: 'B', name: 'SPORE BOMB', color: '#ff6b6b', dur: 0 },
  life:   { key: 'life',   label: '+', name: 'EXTRA LIFE', color: '#ffffff', dur: 0 }
};

export const SURGE = {
  max: 100,
  dur: 6,
  gainSegment: 5,
  gainHead: 9,
  gainEnemy: 16,
  gainMush: 0.5
};
