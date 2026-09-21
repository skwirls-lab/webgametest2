import { W, H, PLAYER_TOP, COLORS, CELL } from './config.js';
import { clamp, hitCircle, lerp } from './util.js';

/**
 * HIVE QUEEN - the wave-5 (and every 5th wave) boss.
 * Free-moving head with a trail-following body. Three phases that get nastier
 * as her health drops. Only the head takes real damage; the body armours her.
 */
export class Boss {
  constructor(wave, game) {
    this.wave = wave;
    this.tier = Math.floor(wave / 5);
    this.maxHp = 70 + this.tier * 45;
    this.hp = this.maxHp;
    this.x = W / 2;
    this.y = CELL * 4.6;
    this.r = 26;
    this.t = 0;
    this.dir = 1;
    this.speed = 96 + this.tier * 12;
    this.trail = [];
    this.nodes = [];
    for (let i = 0; i < 9; i++) {
      this.nodes.push({ x: this.x, y: this.y, r: 15 - i * 0.6, hp: 3 + this.tier });
    }
    this.fireTimer = 1.6;
    this.spawnTimer = 5;
    this.chargeTimer = 9;
    this.charging = 0;
    this.flash = 0;
    this.dead = false;
    this.entering = 1.4;
    this.game = game;
  }

  get phase() {
    const k = this.hp / this.maxHp;
    if (k > 0.6) return 1;
    if (k > 0.3) return 2;
    return 3;
  }

  update(dt, game) {
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt * 6);
    if (this.entering > 0) {
      this.entering -= dt;
      this.y = lerp(-40, CELL * 4.6, clamp(1 - this.entering / 1.4, 0, 1));
      this.pushTrail();
      this.followBody(dt);
      return;
    }

    const phase = this.phase;
    const speed = this.speed * (1 + (phase - 1) * 0.28);

    if (this.charging > 0) {
      // phase-3 dive: she lunges toward the player's lane then retreats
      this.charging -= dt;
      const targetY = Math.min(PLAYER_TOP - CELL, H * 0.6);
      this.y += (this.charging > 0.6 ? 1 : -1) * 260 * dt;
      this.y = clamp(this.y, CELL * 3.4, targetY);
      this.x += this.dir * speed * 0.5 * dt;
    } else {
      this.x += this.dir * speed * dt;
      this.y = CELL * 4.6 + Math.sin(this.t * 1.5) * CELL * 1.5 + (phase - 1) * CELL * 0.8;
    }
    if (this.x > W - this.r - 6) { this.x = W - this.r - 6; this.dir = -1; }
    if (this.x < this.r + 6) { this.x = this.r + 6; this.dir = 1; }

    this.pushTrail();
    this.followBody(dt);

    // attacks
    this.fireTimer -= dt;
    if (this.fireTimer <= 0) {
      this.fireTimer = [2.0, 1.4, 0.95][phase - 1] / (1 + this.tier * 0.12);
      this.volley(game, phase);
    }

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = phase === 1 ? 9 : 6.5;
      game.spawnBossMinions(this);
    }

    if (phase === 3) {
      this.chargeTimer -= dt;
      if (this.chargeTimer <= 0 && this.charging <= 0) {
        this.chargeTimer = 7.5;
        this.charging = 1.2;
        game.audio.sfx('boss');
        game.shaker.add(8);
      }
    }
  }

  pushTrail() {
    this.trail.unshift({ x: this.x, y: this.y });
    if (this.trail.length > 220) this.trail.pop();
  }

  followBody(dt) {
    // each node sits a fixed distance back along the head's path
    const spacing = 15;
    let acc = 0;
    let ti = 0;
    for (let i = 0; i < this.nodes.length; i++) {
      const want = spacing * (i + 1);
      while (acc < want && ti < this.trail.length - 1) {
        const a = this.trail[ti];
        const b = this.trail[ti + 1];
        acc += Math.hypot(b.x - a.x, b.y - a.y);
        ti++;
      }
      const p = this.trail[Math.min(ti, this.trail.length - 1)] || { x: this.x, y: this.y };
      const n = this.nodes[i];
      n.x = lerp(n.x, p.x, Math.min(1, dt * 18));
      n.y = lerp(n.y, p.y, Math.min(1, dt * 18));
    }
  }

  volley(game, phase) {
    const shots = phase === 1 ? 2 : phase === 2 ? 3 : 5;
    const px = game.player.x;
    const py = game.player.y;
    const baseAngle = Math.atan2(py - this.y, px - this.x);
    for (let i = 0; i < shots; i++) {
      const spread = (i - (shots - 1) / 2) * 0.22;
      const a = baseAngle + spread;
      const sp = 260 + phase * 40;
      game.bullets.spawnEnemy(this.x, this.y + this.r * 0.6, Math.cos(a) * sp, Math.sin(a) * sp, {
        color: COLORS.boss, r: 6
      });
    }
    game.audio.sfx('bossHit');
  }

  /** Bullets only wound her through the head; the body soaks shots. */
  hitTest(x, y, r) {
    if (hitCircle(this.x, this.y, this.r, x, y, r)) return { part: 'head' };
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      if (hitCircle(n.x, n.y, n.r, x, y, r)) return { part: 'node', index: i, node: n };
    }
    return null;
  }

  damage(hit, dmg) {
    this.flash = 1;
    if (hit.part === 'head') {
      this.hp -= dmg;
      if (this.hp <= 0) {
        this.hp = 0;
        this.dead = true;
        return 'killed';
      }
      return 'hit';
    }
    hit.node.hp -= dmg;
    if (hit.node.hp <= 0) {
      this.nodes.splice(hit.index, 1);
      return 'node';
    }
    return 'hit';
  }

  playerCollision(player) {
    if (!player.alive) return null;
    if (player.hits(this.x, this.y, this.r * 0.8)) return this;
    for (const n of this.nodes) {
      if (player.hits(n.x, n.y, n.r * 0.8)) return this;
    }
    return null;
  }

  render(ctx, time) {
    // body from tail to head so the head draws on top
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const n = this.nodes[i];
      ctx.save();
      ctx.translate(n.x, n.y);
      ctx.shadowColor = COLORS.boss;
      ctx.shadowBlur = 14;
      const g = ctx.createRadialGradient(-2, -2, 1, 0, 0, n.r);
      g.addColorStop(0, '#ffd2dd');
      g.addColorStop(0.5, COLORS.boss);
      g.addColorStop(1, '#3d0418');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, n.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, n.r - 2, -0.6, 3.2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    const pulse = 1 + Math.sin(time * 6) * 0.04;
    ctx.scale(pulse, pulse);
    ctx.shadowColor = this.charging > 0 ? '#fff' : COLORS.boss;
    ctx.shadowBlur = 28;
    const g = ctx.createRadialGradient(-6, -8, 2, 0, 0, this.r);
    g.addColorStop(0, '#fff');
    g.addColorStop(0.4, '#ff7aa2');
    g.addColorStop(1, '#6b0224');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, this.r, 0, Math.PI * 2);
    ctx.fill();

    // mandibles
    ctx.shadowBlur = 10;
    ctx.strokeStyle = '#ffd2dd';
    ctx.lineWidth = 3;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * this.r * 0.5, this.r * 0.55);
      ctx.quadraticCurveTo(s * this.r * 1.1, this.r * 1.1, s * this.r * 0.35, this.r * 1.35);
      ctx.stroke();
    }
    // crown
    ctx.fillStyle = '#ffe79a';
    ctx.shadowColor = '#ffe79a';
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 9 - 3, -this.r * 0.85);
      ctx.lineTo(i * 9 + 3, -this.r * 0.85);
      ctx.lineTo(i * 9, -this.r * 1.35 - Math.abs(i) * -2);
      ctx.closePath();
      ctx.fill();
    }
    // eyes
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#12010a';
    ctx.beginPath();
    ctx.ellipse(-8, -2, 4.5, 6, 0.2, 0, Math.PI * 2);
    ctx.ellipse(8, -2, 4.5, 6, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this.phase === 3 ? '#ff2bd6' : '#5ffbf1';
    ctx.beginPath();
    ctx.arc(-8, -3, 1.9, 0, Math.PI * 2);
    ctx.arc(8, -3, 1.9, 0, Math.PI * 2);
    ctx.fill();

    if (this.flash > 0) {
      ctx.globalAlpha = this.flash * 0.9;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(0, 0, this.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
