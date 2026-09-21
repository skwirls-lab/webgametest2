import { CELL, COLS, ROWS, MUSH_HP, COLORS, PLAYER_TOP } from './config.js';
import { randInt } from './util.js';

/**
 * The mushroom field. Stored as flat arrays: hp 0..4 plus a poison flag.
 * Mushrooms block both the player and the centipede, so this is the level geometry.
 */
export class Field {
  constructor() {
    this.hp = new Uint8Array(COLS * ROWS);
    this.poison = new Uint8Array(COLS * ROWS);
    this.pulse = new Float32Array(COLS * ROWS);
  }

  reset() {
    this.hp.fill(0);
    this.poison.fill(0);
    this.pulse.fill(0);
  }

  idx(cx, cy) { return cy * COLS + cx; }
  inside(cx, cy) { return cx >= 0 && cx < COLS && cy >= 0 && cy < ROWS; }
  has(cx, cy) { return this.inside(cx, cy) && this.hp[this.idx(cx, cy)] > 0; }
  isPoison(cx, cy) { return this.inside(cx, cy) && this.poison[this.idx(cx, cy)] > 0; }

  cellAt(x, y) {
    return { cx: Math.floor(x / CELL), cy: Math.floor(y / CELL) };
  }

  center(cx, cy) {
    return { x: cx * CELL + CELL / 2, y: cy * CELL + CELL / 2 };
  }

  plant(cx, cy, hp = MUSH_HP) {
    if (!this.inside(cx, cy)) return false;
    if (cy < 1 || cy >= ROWS - 1) return false;
    const i = this.idx(cx, cy);
    if (this.hp[i] > 0) return false;
    this.hp[i] = hp;
    this.pulse[i] = 1;
    return true;
  }

  /** Scatters mushrooms, keeping the player's immediate spawn area clear. */
  populate(count) {
    let placed = 0;
    let guard = count * 12;
    while (placed < count && guard-- > 0) {
      const cx = randInt(0, COLS - 1);
      const cy = randInt(2, ROWS - 4);
      const y = cy * CELL;
      // keep a breathing corridor around the player's start
      if (y > PLAYER_TOP && Math.abs(cx - COLS / 2) < 3) continue;
      if (this.plant(cx, cy)) placed++;
    }
  }

  poisonCell(cx, cy) {
    if (!this.has(cx, cy)) return false;
    const i = this.idx(cx, cy);
    if (this.poison[i]) return false;
    this.poison[i] = 1;
    this.pulse[i] = 1;
    return true;
  }

  /** Returns 'hit' | 'destroyed' | null */
  damage(cx, cy, amount = 1) {
    if (!this.has(cx, cy)) return null;
    const i = this.idx(cx, cy);
    this.hp[i] = Math.max(0, this.hp[i] - amount);
    this.pulse[i] = 1;
    if (this.hp[i] === 0) {
      this.poison[i] = 0;
      return 'destroyed';
    }
    return 'hit';
  }

  clear(cx, cy) {
    if (!this.inside(cx, cy)) return;
    const i = this.idx(cx, cy);
    this.hp[i] = 0;
    this.poison[i] = 0;
  }

  /** Heals every mushroom (classic behaviour after a life is lost). Returns stages healed. */
  healAll() {
    let healed = 0;
    for (let i = 0; i < this.hp.length; i++) {
      if (this.hp[i] > 0 && this.hp[i] < MUSH_HP) {
        healed += MUSH_HP - this.hp[i];
        this.hp[i] = MUSH_HP;
        this.pulse[i] = 1;
      }
      this.poison[i] = 0;
    }
    return healed;
  }

  count() {
    let n = 0;
    for (let i = 0; i < this.hp.length; i++) if (this.hp[i] > 0) n++;
    return n;
  }

  /** Circle-vs-mushroom overlap test used for player movement blocking. */
  blocks(x, y, r) {
    const min = this.cellAt(x - r, y - r);
    const max = this.cellAt(x + r, y + r);
    for (let cy = min.cy; cy <= max.cy; cy++) {
      for (let cx = min.cx; cx <= max.cx; cx++) {
        if (!this.has(cx, cy)) continue;
        const left = cx * CELL + 3, top = cy * CELL + 3;
        const right = left + CELL - 6, bottom = top + CELL - 6;
        const nx = Math.max(left, Math.min(x, right));
        const ny = Math.max(top, Math.min(y, bottom));
        const dx = x - nx, dy = y - ny;
        if (dx * dx + dy * dy < r * r) return { cx, cy };
      }
    }
    return null;
  }

  update(dt) {
    for (let i = 0; i < this.pulse.length; i++) {
      if (this.pulse[i] > 0) this.pulse[i] = Math.max(0, this.pulse[i] - dt * 3.2);
    }
  }

  render(ctx, time) {
    for (let cy = 0; cy < ROWS; cy++) {
      for (let cx = 0; cx < COLS; cx++) {
        const i = this.idx(cx, cy);
        const hp = this.hp[i];
        if (!hp) continue;
        this.drawMushroom(ctx, cx, cy, hp, this.poison[i] > 0, this.pulse[i], time);
      }
    }
  }

  drawMushroom(ctx, cx, cy, hp, poisoned, pulse, time) {
    const x = cx * CELL + CELL / 2;
    const y = cy * CELL + CELL / 2;
    const k = hp / MUSH_HP;
    const base = poisoned ? COLORS.poison : COLORS.mush;
    const bright = poisoned ? '#b6ffd9' : COLORS.mushHot;
    const capR = (CELL / 2 - 1.5) * (0.55 + 0.45 * k);
    const bob = Math.sin(time * 2 + cx * 0.6 + cy * 0.9) * 0.6;

    ctx.save();
    ctx.translate(x, y + bob);
    // stem
    ctx.fillStyle = poisoned ? 'rgba(67,255,158,0.35)' : 'rgba(122,92,255,0.35)';
    ctx.fillRect(-2.5, 0, 5, capR * 0.9);
    // cap
    const g = ctx.createLinearGradient(0, -capR, 0, capR * 0.6);
    g.addColorStop(0, bright);
    g.addColorStop(1, base);
    ctx.fillStyle = g;
    ctx.shadowColor = base;
    ctx.shadowBlur = 10 + pulse * 16;
    ctx.beginPath();
    ctx.arc(0, 0, capR, Math.PI, 0);
    ctx.lineTo(capR * 0.82, capR * 0.32);
    ctx.lineTo(-capR * 0.82, capR * 0.32);
    ctx.closePath();
    ctx.fill();
    // speckles hint at remaining hp
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(5,3,15,0.55)';
    for (let s = 0; s < hp; s++) {
      const a = Math.PI + (s + 0.5) * (Math.PI / hp);
      ctx.beginPath();
      ctx.arc(Math.cos(a) * capR * 0.5, Math.sin(a) * capR * 0.5, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    if (pulse > 0) {
      ctx.globalAlpha = pulse * 0.8;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(0, 0, capR * 0.9, Math.PI, 0);
      ctx.fill();
    }
    ctx.restore();
  }
}
