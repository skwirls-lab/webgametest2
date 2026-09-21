import { COLORS } from './config.js';

export class Bullets {
  constructor() {
    this.items = [];
    this.enemy = [];
  }

  reset() {
    this.items.length = 0;
    this.enemy.length = 0;
  }

  spawn(x, y, vx, vy, opts = {}) {
    this.items.push({
      x, y, vx, vy,
      r: opts.r ?? 3,
      pierce: !!opts.pierce,
      dmg: opts.dmg ?? 1,
      hits: 0,
      dead: false,
      trail: []
    });
  }

  spawnEnemy(x, y, vx, vy, opts = {}) {
    this.enemy.push({
      x, y, vx, vy,
      r: opts.r ?? 5,
      color: opts.color ?? COLORS.boss,
      dead: false,
      age: 0
    });
  }

  update(dt, bounds) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const b = this.items[i];
      b.trail.push(b.x, b.y);
      if (b.trail.length > 6) b.trail.splice(0, 2);
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.dead || b.y < -20 || b.y > bounds.h + 20 || b.x < -20 || b.x > bounds.w + 20) {
        this.items.splice(i, 1);
      }
    }
    for (let i = this.enemy.length - 1; i >= 0; i--) {
      const b = this.enemy[i];
      b.age += dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.dead || b.y > bounds.h + 20 || b.y < -40 || b.x < -30 || b.x > bounds.w + 30) {
        this.enemy.splice(i, 1);
      }
    }
  }

  render(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const b of this.items) {
      ctx.strokeStyle = b.pierce ? '#ff8fd0' : COLORS.bullet;
      ctx.lineWidth = b.pierce ? 4 : 3;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y + 12);
      ctx.lineTo(b.x, b.y - 8);
      ctx.stroke();
    }
    for (const b of this.enemy) {
      ctx.fillStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r + Math.sin(b.age * 22) * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
