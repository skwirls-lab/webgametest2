import { W, H, PLAYER_TOP, COLORS, CELL } from './config.js';
import { clamp, hitCircle } from './util.js';

const BASE_SPEED = 300;
const DASH_SPEED = 900;
const DASH_TIME = 0.16;
const DASH_COOLDOWN = 1.3;
const BASE_COOLDOWN = 0.16;

export class Player {
  constructor(game) {
    this.game = game;
    this.r = 11;
    this.reset();
  }

  reset() {
    this.x = W / 2;
    this.y = H - CELL * 1.6;
    this.vx = 0;
    this.vy = 0;
    this.aim = -1;
    this.fireTimer = 0;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.dashDir = { x: 0, y: -1 };
    this.invuln = 1.2;
    this.alive = true;
    this.deadTimer = 0;
    this.thrust = 0;
  }

  get dashing() { return this.dashTimer > 0; }
  get invulnerable() { return this.invuln > 0 || this.dashing; }

  update(dt, input, game) {
    if (!this.alive) {
      this.deadTimer -= dt;
      return;
    }
    this.invuln = Math.max(0, this.invuln - dt);
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);

    let ax = 0, ay = 0;
    const axis = input.axis();
    ax = axis.x;
    ay = axis.y;

    // pointer / touch steering takes over while held
    if (input.pointer.active) {
      const dx = input.pointer.x - this.x;
      const dy = input.pointer.y - this.y;
      const len = Math.hypot(dx, dy);
      if (len > 4) {
        ax = clamp(dx / 40, -1, 1);
        ay = clamp(dy / 40, -1, 1);
      } else {
        ax = 0; ay = 0;
      }
    }

    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      ax = this.dashDir.x;
      ay = this.dashDir.y;
    } else if (input.consume('dash') && this.dashCooldown <= 0) {
      const len = Math.hypot(ax, ay);
      this.dashDir = len > 0.1 ? { x: ax / len, y: ay / len } : { x: 0, y: -1 };
      this.dashTimer = DASH_TIME;
      this.dashCooldown = DASH_COOLDOWN;
      game.audio.sfx('dash');
      game.particles.ring(this.x, this.y, COLORS.player, 18, 14);
    }

    const speed = (this.dashing ? DASH_SPEED : BASE_SPEED) * (game.timeScale < 1 ? 1.12 : 1);
    const step = speed * dt;
    this.thrust = Math.hypot(ax, ay);

    // Axis-separated movement so mushrooms feel like walls, not glue.
    const tryMove = (dx, dy) => {
      const nx = clamp(this.x + dx, this.r, W - this.r);
      const ny = clamp(this.y + dy, PLAYER_TOP + this.r, H - this.r);
      if (dx !== 0) {
        if (!game.field.blocks(nx, this.y, this.r - 2)) this.x = nx;
      }
      if (dy !== 0) {
        if (!game.field.blocks(this.x, ny, this.r - 2)) this.y = ny;
      }
    };
    tryMove(ax * step, 0);
    tryMove(0, ay * step);

    if (this.dashing) {
      game.particles.spawn(this.x, this.y, {
        vx: -this.dashDir.x * 60, vy: -this.dashDir.y * 60,
        color: COLORS.player, life: 0.3, size: 4, drag: 3
      });
    }

    // firing
    this.fireTimer -= dt;
    const wantsFire = game.settings.autofire || input.isHeld('fire') || input.pointer.firing;
    if (wantsFire && this.fireTimer <= 0) {
      this.shoot(game);
      this.fireTimer = this.cooldown(game);
    }
  }

  cooldown(game) {
    let cd = BASE_COOLDOWN;
    if (game.hasPower('rapid')) cd *= 0.45;
    if (game.surgeActive) cd *= 0.55;
    return cd;
  }

  shoot(game) {
    const pierce = game.hasPower('pierce') || game.surgeActive;
    const spread = game.hasPower('spread');
    const make = (vx, vy) => game.bullets.spawn(this.x, this.y - this.r - 2, vx, vy, { pierce });
    make(0, -1320);
    if (spread) {
      make(-330, -1240);
      make(330, -1240);
    }
    game.stats.shots += spread ? 3 : 1;
    game.audio.sfx('shoot');
    game.particles.spawn(this.x, this.y - this.r, {
      vx: 0, vy: 90, color: COLORS.bullet, life: 0.16, size: 3
    });
  }

  hits(x, y, r) {
    return this.alive && hitCircle(this.x, this.y, this.r - 1, x, y, r);
  }

  kill() {
    this.alive = false;
    this.deadTimer = 1.15;
  }

  render(ctx, time) {
    if (!this.alive) return;
    const blink = this.invuln > 0 && Math.floor(time * 18) % 2 === 0;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.globalAlpha = blink ? 0.35 : 1;

    // engine glow
    const flame = 6 + this.thrust * 7 + Math.sin(time * 40) * 1.5;
    ctx.globalCompositeOperation = 'lighter';
    const fg = ctx.createLinearGradient(0, 8, 0, 8 + flame);
    fg.addColorStop(0, 'rgba(95,251,241,0.9)');
    fg.addColorStop(1, 'rgba(95,251,241,0)');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.moveTo(-4, 8);
    ctx.lineTo(4, 8);
    ctx.lineTo(0, 8 + flame);
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    // hull
    ctx.shadowColor = COLORS.player;
    ctx.shadowBlur = 16;
    const g = ctx.createLinearGradient(0, -14, 0, 12);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.45, COLORS.player);
    g.addColorStop(1, COLORS.playerDark);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(10, 6);
    ctx.lineTo(4, 10);
    ctx.lineTo(-4, 10);
    ctx.lineTo(-10, 6);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#05030f';
    ctx.fillRect(-1.6, -6, 3.2, 8);
    ctx.restore();
  }

  renderShield(ctx, time) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.strokeStyle = 'rgba(122,92,255,0.85)';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#7a5cff';
    ctx.shadowBlur = 18;
    ctx.globalAlpha = 0.6 + Math.sin(time * 6) * 0.2;
    ctx.beginPath();
    ctx.arc(0, 0, this.r + 8 + Math.sin(time * 5) * 1.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
