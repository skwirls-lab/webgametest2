import { CELL, ROWS, W, H, PLAYER_TOP, COLORS } from './config.js';
import { rand, randInt, chance, hitCircle, clamp } from './util.js';

// Scorpions keep clear of the bottom band.
const PLAYER_ZONE_SAFE = 10;

/**
 * The supporting cast. Each enemy is a small state machine; the manager owns
 * spawning, updating and hit testing so game.js stays readable.
 */
export class Enemies {
  constructor() {
    this.items = [];
  }

  reset() { this.items.length = 0; }

  count(type) {
    return this.items.reduce((n, e) => n + (e.type === type ? 1 : 0), 0);
  }

  spawnSpider(speedMult = 1) {
    const fromLeft = chance(0.5);
    this.items.push({
      type: 'spider',
      x: fromLeft ? -20 : W + 20,
      y: rand(H - CELL * 2, PLAYER_TOP + CELL),
      vx: (fromLeft ? 1 : -1) * rand(170, 110) * speedMult,
      vy: (chance(0.5) ? 1 : -1) * rand(170, 110) * speedMult,
      r: 13,
      hp: 2,
      flash: 0,
      age: 0,
      legPhase: rand(Math.PI * 2)
    });
  }

  spawnFlea(targetX, speedMult = 1) {
    this.items.push({
      type: 'flea',
      x: clamp(targetX + rand(60, -60), CELL, W - CELL),
      y: -20,
      vx: 0,
      vy: rand(300, 230) * speedMult,
      r: 11,
      hp: 2,
      flash: 0,
      age: 0,
      lastPlant: -999
    });
  }

  spawnScorpion(speedMult = 1) {
    const fromLeft = chance(0.5);
    const row = randInt(3, ROWS - PLAYER_ZONE_SAFE);
    this.items.push({
      type: 'scorpion',
      x: fromLeft ? -20 : W + 20,
      y: row * CELL + CELL / 2,
      vx: (fromLeft ? 1 : -1) * rand(190, 140) * speedMult,
      vy: 0,
      r: 12,
      hp: 1,
      flash: 0,
      age: 0,
      tailPhase: 0
    });
  }

  update(dt, game) {
    const { field, particles } = game;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const e = this.items[i];
      e.age += dt;
      e.flash = Math.max(0, e.flash - dt * 6);

      if (e.type === 'spider') {
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        const top = PLAYER_TOP + 8;
        if (e.y < top) { e.y = top; e.vy = Math.abs(e.vy); }
        if (e.y > H - 12) { e.y = H - 12; e.vy = -Math.abs(e.vy); }
        if (chance(dt * 1.4)) e.vy = -e.vy;
        e.legPhase += dt * 14;
        // spiders clear mushrooms out of the way
        const c = field.cellAt(e.x, e.y);
        if (field.has(c.cx, c.cy) && chance(0.6)) {
          field.clear(c.cx, c.cy);
          particles.burst(c.cx * CELL + CELL / 2, c.cy * CELL + CELL / 2, COLORS.mush, 8, 120);
        }
        if (e.x < -40 || e.x > W + 40) this.items.splice(i, 1);
      } else if (e.type === 'flea') {
        e.y += e.vy * dt;
        particles.trail(e.x + rand(4, -4), e.y - 8, COLORS.flea);
        // leaves a trail of fresh mushrooms behind it
        if (e.y - e.lastPlant > CELL * 1.6) {
          e.lastPlant = e.y;
          const c = field.cellAt(e.x, e.y);
          if (chance(0.75)) field.plant(c.cx, c.cy);
        }
        if (e.y > H + 20) this.items.splice(i, 1);
      } else if (e.type === 'scorpion') {
        e.x += e.vx * dt;
        e.tailPhase += dt * 8;
        const c = field.cellAt(e.x, e.y);
        if (field.poisonCell(c.cx, c.cy)) {
          particles.burst(c.cx * CELL + CELL / 2, c.cy * CELL + CELL / 2, COLORS.poison, 6, 90);
        }
        if (e.x < -40 || e.x > W + 40) this.items.splice(i, 1);
      }
    }
  }

  hitTest(x, y, r) {
    for (const e of this.items) {
      if (hitCircle(e.x, e.y, e.r, x, y, r)) return e;
    }
    return null;
  }

  remove(e) {
    const i = this.items.indexOf(e);
    if (i >= 0) this.items.splice(i, 1);
  }

  playerCollision(player) {
    if (!player.alive) return null;
    for (const e of this.items) {
      if (e.type === 'scorpion') continue; // scorpions stay out of the player zone
      if (player.hits(e.x, e.y, e.r * 0.8)) return e;
    }
    return null;
  }

  render(ctx, time) {
    for (const e of this.items) {
      ctx.save();
      ctx.translate(e.x, e.y);
      if (e.type === 'spider') this.drawSpider(ctx, e);
      else if (e.type === 'flea') this.drawFlea(ctx, e);
      else this.drawScorpion(ctx, e);
      if (e.flash > 0) {
        ctx.globalAlpha = e.flash;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(0, 0, e.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  drawSpider(ctx, e) {
    ctx.shadowColor = COLORS.spider;
    ctx.shadowBlur = 16;
    ctx.strokeStyle = COLORS.spider;
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI + Math.PI / 8;
      const sw = Math.sin(e.legPhase + i) * 4;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(
          Math.cos(a) * e.r * s, Math.sin(a) * e.r + sw,
          Math.cos(a) * (e.r + 9) * s, Math.sin(a) * (e.r + 6) + sw
        );
        ctx.stroke();
      }
    }
    const g = ctx.createRadialGradient(-2, -2, 1, 0, 0, e.r);
    g.addColorStop(0, '#f0e3ff');
    g.addColorStop(0.5, COLORS.spider);
    g.addColorStop(1, '#2a0f52');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, e.r * 0.95, e.r * 0.78, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ff3b6b';
    ctx.beginPath();
    ctx.arc(-3.5, -3, 1.8, 0, Math.PI * 2);
    ctx.arc(3.5, -3, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  drawFlea(ctx, e) {
    ctx.shadowColor = COLORS.flea;
    ctx.shadowBlur = 18;
    ctx.fillStyle = COLORS.flea;
    ctx.beginPath();
    ctx.moveTo(0, e.r);
    ctx.lineTo(e.r * 0.8, -e.r * 0.4);
    ctx.lineTo(0, -e.r);
    ctx.lineTo(-e.r * 0.8, -e.r * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(-2, -e.r * 0.4, 4, e.r * 0.9);
    if (e.hp < 2) {
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.arc(0, 0, e.r + 3, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawScorpion(ctx, e) {
    const face = Math.sign(e.vx) || 1;
    ctx.scale(face, 1);
    ctx.shadowColor = COLORS.scorpion;
    ctx.shadowBlur = 16;
    ctx.fillStyle = COLORS.scorpion;
    ctx.beginPath();
    ctx.ellipse(0, 0, e.r, e.r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = COLORS.scorpion;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-e.r * 0.8, 0);
    ctx.quadraticCurveTo(-e.r * 1.6, -6 + Math.sin(e.tailPhase) * 2, -e.r * 1.1, -12);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(e.r * 0.8, -1);
    ctx.lineTo(e.r * 1.5, -5);
    ctx.moveTo(e.r * 0.8, 1);
    ctx.lineTo(e.r * 1.5, 5);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#05130c';
    ctx.fillRect(e.r * 0.2, -1.5, 3, 3);
  }
}
