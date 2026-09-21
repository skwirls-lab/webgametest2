import { POWERUPS, H } from './config.js';
import { hitCircle, pick, chance } from './util.js';

const WEIGHTED = [
  'rapid', 'rapid', 'spread', 'spread', 'pierce', 'pierce',
  'shield', 'shield', 'time', 'bomb'
];

export class PowerUps {
  constructor() {
    this.items = [];
  }

  reset() { this.items.length = 0; }

  drop(x, y, forced = null) {
    const key = forced || (chance(0.04) ? 'life' : pick(WEIGHTED));
    this.items.push({
      x, y, key,
      def: POWERUPS[key],
      vy: 70,
      vx: 0,
      r: 13,
      age: 0
    });
  }

  update(dt, player, onCollect) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i];
      p.age += dt;
      // gentle magnet once the player is close, so pickups feel good
      if (player.alive) {
        const dx = player.x - p.x;
        const dy = player.y - p.y;
        const d = Math.hypot(dx, dy);
        if (d < 110) {
          p.vx += (dx / d) * 260 * dt;
          p.vy += (dy / d) * 260 * dt;
        }
      }
      p.vx *= Math.exp(-1.6 * dt);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (player.alive && hitCircle(player.x, player.y, player.r + 4, p.x, p.y, p.r)) {
        this.items.splice(i, 1);
        onCollect(p.key, p.def, p.x, p.y);
        continue;
      }
      if (p.y > H + 30) this.items.splice(i, 1);
    }
  }

  render(ctx, time) {
    for (const p of this.items) {
      const bob = Math.sin(time * 4 + p.age * 3) * 2.5;
      const spin = Math.sin(time * 2.6 + p.age) * 0.25;
      ctx.save();
      ctx.translate(p.x, p.y + bob);
      ctx.rotate(spin);
      ctx.shadowColor = p.def.color;
      ctx.shadowBlur = 18;
      ctx.strokeStyle = p.def.color;
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(5,3,15,0.75)';
      ctx.beginPath();
      const r = p.r;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
        const px = Math.cos(a) * r, py = Math.sin(a) * r;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 8;
      ctx.fillStyle = p.def.color;
      ctx.font = '700 14px "Rajdhani", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.def.label, 0, 1);
      ctx.restore();
    }
  }
}
