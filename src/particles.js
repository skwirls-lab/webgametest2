import { rand } from './util.js';

export class Particles {
  constructor(limit = 900) {
    this.items = [];
    this.texts = [];
    this.limit = limit;
  }

  reset() {
    this.items.length = 0;
    this.texts.length = 0;
  }

  spawn(x, y, opts = {}) {
    if (this.items.length >= this.limit) return;
    this.items.push({
      x, y,
      vx: opts.vx ?? rand(60, -60),
      vy: opts.vy ?? rand(60, -60),
      life: opts.life ?? rand(0.7, 0.3),
      age: 0,
      size: opts.size ?? rand(3.4, 1.4),
      color: opts.color ?? '#fff',
      drag: opts.drag ?? 1.8,
      gravity: opts.gravity ?? 0,
      shape: opts.shape ?? 'dot'
    });
  }

  burst(x, y, color, count = 14, power = 200, opts = {}) {
    for (let i = 0; i < count; i++) {
      const a = rand(Math.PI * 2);
      const s = rand(power, power * 0.25);
      this.spawn(x, y, {
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        color,
        life: rand(0.8, 0.25),
        size: rand(4, 1.5),
        ...opts
      });
    }
  }

  ring(x, y, color, radius = 40, count = 22) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      this.spawn(x, y, {
        vx: Math.cos(a) * radius * 3,
        vy: Math.sin(a) * radius * 3,
        color,
        life: 0.4,
        size: 2.6,
        drag: 6
      });
    }
  }

  trail(x, y, color) {
    this.spawn(x, y, {
      vx: rand(24, -24),
      vy: rand(50, 10),
      color,
      life: rand(0.4, 0.18),
      size: rand(3, 1.2),
      drag: 3
    });
  }

  text(x, y, str, color = '#fff', size = 16) {
    this.texts.push({ x, y, str, color, size, age: 0, life: 0.95, vy: -46 });
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i];
      p.age += dt;
      if (p.age >= p.life) {
        this.items.splice(i, 1);
        continue;
      }
      const d = Math.exp(-p.drag * dt);
      p.vx *= d;
      p.vy = p.vy * d + p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.age += dt;
      if (t.age >= t.life) {
        this.texts.splice(i, 1);
        continue;
      }
      t.y += t.vy * dt;
      t.vy *= Math.exp(-2.4 * dt);
    }
  }

  render(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.items) {
      const k = 1 - p.age / p.life;
      ctx.globalAlpha = Math.max(0, k);
      ctx.fillStyle = p.color;
      const s = p.size * (0.4 + k * 0.9);
      if (p.shape === 'square') {
        ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of this.texts) {
      const k = 1 - t.age / t.life;
      ctx.globalAlpha = Math.max(0, Math.min(1, k * 1.6));
      ctx.font = `700 ${t.size}px "Rajdhani", "Segoe UI", system-ui, sans-serif`;
      ctx.fillStyle = t.color;
      ctx.shadowColor = t.color;
      ctx.shadowBlur = 12;
      ctx.fillText(t.str, t.x, t.y);
    }
    ctx.restore();
  }
}

/** Short-lived full-screen flashes and camera shake. */
export class Shaker {
  constructor() {
    this.amount = 0;
    this.x = 0;
    this.y = 0;
    this.enabled = true;
  }
  add(v) { this.amount = Math.min(26, this.amount + v); }
  update(dt) {
    this.amount *= Math.exp(-6 * dt);
    if (this.amount < 0.05) this.amount = 0;
    const a = this.enabled ? this.amount : 0;
    this.x = rand(a, -a);
    this.y = rand(a, -a);
  }
}
