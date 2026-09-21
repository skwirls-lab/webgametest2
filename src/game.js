import {
  CELL, COLS, ROWS, W, H, HUD_H, CANVAS_H, PLAYER_TOP, COLORS, DIFFICULTIES, SCORE, SURGE
} from './config.js';
import { clamp, rand, randInt, chance, formatScore } from './util.js';
import { Field } from './field.js';
import { Player } from './player.js';
import { Bullets } from './bullets.js';
import { Centipede } from './centipede.js';
import { Enemies } from './enemies.js';
import { PowerUps } from './powerups.js';
import { Particles, Shaker } from './particles.js';
import { Boss } from './boss.js';

const COMBO_WINDOW = 2.4;

export class Game {
  constructor({ canvas, audio, input, settings, onHud, onGameOver, onBanner }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.audio = audio;
    this.input = input;
    this.settings = settings;
    this.onHud = onHud;
    this.onGameOver = onGameOver;
    this.onBanner = onBanner;

    this.field = new Field();
    this.player = new Player(this);
    this.bullets = new Bullets();
    this.centipede = new Centipede();
    this.enemies = new Enemies();
    this.powerups = new PowerUps();
    this.particles = new Particles();
    this.shaker = new Shaker();

    this.state = 'idle';
    this.time = 0;
    this.raf = null;
    this.lastFrame = 0;
    this.stars = Array.from({ length: 70 }, () => ({
      x: rand(W), y: rand(H), z: rand(1, 0.2), s: rand(1.8, 0.5)
    }));
  }

  // ---------------------------------------------------------------- lifecycle
  start(difficultyKey) {
    this.diff = DIFFICULTIES[difficultyKey] || DIFFICULTIES.classic;
    this.difficultyKey = difficultyKey;
    this.score = 0;
    this.lives = this.diff.lives;
    this.wave = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.surge = 0;
    this.surgeTime = 0;
    this.powers = {};
    this.shield = false;
    this.freeze = 0;
    this.timeScale = 1;
    this.boss = null;
    this.waveBreak = 0;
    this.banner = null;
    this.gameTime = 0;
    this.stats = { shots: 0, hits: 0, kills: 0, mush: 0, bestCombo: 0, waves: 0 };

    this.field.reset();
    this.player.reset();
    this.bullets.reset();
    this.centipede.reset();
    this.enemies.reset();
    this.powerups.reset();
    this.particles.reset();
    this.shaker.amount = 0;
    this.shaker.enabled = this.settings.shake;

    this.state = 'playing';
    this.startWave(1);
    this.audio.startMusic();
    this.audio.setIntensity(0.2);
    this.pushHud();
    this.runLoop();
  }

  stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    this.state = 'idle';
    this.audio.stopMusic();
  }

  pause() {
    if (this.state !== 'playing') return false;
    this.state = 'paused';
    this.audio.stopMusic();
    return true;
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.lastFrame = performance.now();
    this.audio.startMusic();
  }

  runLoop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.lastFrame = performance.now();
    const step = (now) => {
      this.raf = requestAnimationFrame(step);
      const raw = Math.min(0.05, (now - this.lastFrame) / 1000);
      this.lastFrame = now;
      if (this.state === 'playing') this.update(raw);
      this.render();
      this.input.endFrame();
    };
    this.raf = requestAnimationFrame(step);
  }

  // ------------------------------------------------------------------- waves
  startWave(n) {
    this.wave = n;
    this.isBossWave = n % 5 === 0;
    const armor = Math.min(2, Math.floor((n - 1) / 6));

    const target = Math.min(68, 30 + n * 3);
    this.field.populate(Math.max(0, target - this.field.count()));

    if (this.isBossWave) {
      this.boss = new Boss(n, this);
      this.audio.sfx('boss');
      this.setBanner('HIVE QUEEN', `WAVE ${n} — BOSS`, COLORS.boss);
      this.shaker.add(10);
    } else {
      const len = Math.min(16, this.diff.segments + Math.floor((n - 1) * 0.7));
      this.centipede.spawnChain(len, { fromRight: chance(0.5), armor });
      // later waves send a second, shorter chain
      if (n >= 4) {
        this.centipede.spawnChain(Math.max(3, Math.floor(len / 2)), {
          row: 1, fromRight: chance(0.5), armor
        });
      }
      this.setBanner(`WAVE ${n}`, this.waveTagline(n), COLORS.player);
      this.audio.sfx('wave');
    }

    this.spiderTimer = rand(7, 3) / this.diff.enemyRate;
    this.fleaTimer = rand(9, 5) / this.diff.enemyRate;
    this.scorpionTimer = rand(16, 9) / this.diff.enemyRate;
    this.audio.setIntensity(clamp(0.2 + n * 0.07, 0, 1));
  }

  waveTagline(n) {
    const lines = [
      'THE SWARM DESCENDS', 'KEEP THE FIELD CLEAN', 'MIND THE SPIDERS',
      'POISON SPREADS', 'HOLD YOUR LANE', 'CHAIN YOUR SHOTS'
    ];
    return lines[(n - 1) % lines.length];
  }

  setBanner(text, sub, color) {
    this.banner = { text, sub, color, time: 0, life: 2.1 };
    this.onBanner?.(text, sub);
  }

  completeWave() {
    this.waveBreak = 2.2;
    this.stats.waves = this.wave;
    const bonus = SCORE.waveClear * this.wave;
    this.addScore(bonus, W / 2, H / 2 - 40, { label: `WAVE BONUS +${formatScore(bonus)}`, raw: true });
    this.setBanner('WAVE CLEAR', `+${formatScore(bonus)} BONUS`, COLORS.poison);
    this.audio.sfx('wave');
    // a small thank-you drop between waves
    if (chance(0.7)) this.powerups.drop(W / 2 + rand(80, -80), H / 2);
  }

  // ------------------------------------------------------------------ scoring
  addScore(base, x, y, opts = {}) {
    const mult = opts.raw ? 1 : this.multiplier * (this.surgeActive ? 2 : 1);
    const gained = Math.round(base * mult * (opts.raw ? 1 : this.diff.scoreMult));
    this.score += gained;
    if (x != null) {
      this.particles.text(
        x, y,
        opts.label || `+${formatScore(gained)}`,
        opts.color || (this.multiplier > 1 ? COLORS.bullet : '#dfe6ff'),
        opts.size || (this.multiplier >= 4 ? 19 : 15)
      );
    }
    return gained;
  }

  get multiplier() {
    return clamp(1 + Math.floor(this.combo / 4), 1, 8);
  }

  get surgeActive() { return this.surgeTime > 0; }

  bumpCombo(amount = 1) {
    this.combo += amount;
    this.comboTimer = COMBO_WINDOW;
    this.stats.bestCombo = Math.max(this.stats.bestCombo, this.combo);
  }

  addSurge(v) {
    if (this.surgeActive) return;
    this.surge = clamp(this.surge + v, 0, SURGE.max);
  }

  hasPower(key) { return (this.powers[key] || 0) > 0 || (key === 'shield' && this.shield); }

  activateSurge() {
    if (this.surge < SURGE.max || this.surgeActive) return;
    this.surge = 0;
    this.surgeTime = SURGE.dur;
    this.audio.sfx('surge');
    this.shaker.add(6);
    this.particles.ring(this.player.x, this.player.y, COLORS.bullet, 60, 34);
    this.setBanner('SURGE', 'x2 SCORE — PIERCING ROUNDS', COLORS.bullet);
  }

  collect(key, def, x, y) {
    this.audio.sfx('powerup');
    this.particles.ring(x, y, def.color, 34, 20);
    this.particles.text(x, y - 16, def.name, def.color, 17);
    if (key === 'shield') {
      this.shield = true;
    } else if (key === 'life') {
      this.lives++;
    } else if (key === 'bomb') {
      this.detonate(x, y);
    } else {
      this.powers[key] = def.dur;
    }
    this.pushHud();
  }

  detonate(x, y) {
    const radius = 150;
    this.shaker.add(14);
    this.freeze = 0.06;
    this.particles.ring(x, y, COLORS.danger, 90, 40);
    this.particles.burst(x, y, '#ffd166', 50, 420);
    this.audio.sfx('enemy');
    // clear mushrooms
    const cell = this.field.cellAt(x, y);
    const cr = Math.ceil(radius / CELL);
    for (let cy = cell.cy - cr; cy <= cell.cy + cr; cy++) {
      for (let cx = cell.cx - cr; cx <= cell.cx + cr; cx++) {
        const c = this.field.center(cx, cy);
        if (Math.hypot(c.x - x, c.y - y) > radius) continue;
        if (this.field.has(cx, cy)) {
          this.field.clear(cx, cy);
          this.particles.burst(c.x, c.y, COLORS.mush, 5, 100);
          this.addScore(SCORE.mushKill, null, null);
        }
      }
    }
    // shred segments
    for (const found of this.centipede.segmentsInRadius(x, y, radius)) {
      const hit = this.centipede.locate(found.seg);
      if (!hit) continue;
      if (this.centipede.damage(hit, 99) === 'killed') this.killSegment(hit, true);
    }
    for (const e of [...this.enemies.items]) {
      if (Math.hypot(e.x - x, e.y - y) <= radius) this.killEnemy(e, false);
    }
  }

  // ------------------------------------------------------------------ updates
  update(raw) {
    let dt = raw;
    if (this.freeze > 0) {
      this.freeze -= raw;
      dt = raw * 0.12;
    }
    this.time += dt;
    this.gameTime += dt;

    if (this.input.consume('surge')) this.activateSurge();
    this.input.pollGamepad();

    // timers
    for (const key of Object.keys(this.powers)) {
      this.powers[key] -= dt;
      if (this.powers[key] <= 0) delete this.powers[key];
    }
    if (this.surgeTime > 0) this.surgeTime = Math.max(0, this.surgeTime - dt);
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }
    if (this.banner) {
      this.banner.time += dt;
      if (this.banner.time > this.banner.life) this.banner = null;
    }

    this.timeScale = (this.hasPower('time') ? 0.42 : 1) * (this.surgeActive ? 0.82 : 1);
    const edt = dt * this.timeScale;

    this.player.update(dt, this.input, this);
    this.bullets.update(dt, { w: W, h: H });
    this.field.update(dt);
    this.centipede.update(edt, this.field, this.diff.speed * (1 + (this.wave - 1) * 0.055));
    this.enemies.update(edt, this);
    if (this.boss) {
      this.boss.update(edt, this);
      if (this.boss.dead) this.finishBoss();
    }
    this.powerups.update(dt, this.player, (k, d, x, y) => this.collect(k, d, x, y));
    this.particles.update(dt);
    this.shaker.enabled = this.settings.shake;
    this.shaker.update(dt);

    this.spawnCycle(edt);
    this.collide();

    if (!this.player.alive && this.player.deadTimer <= 0) this.respawn();

    // wave progression
    if (this.state === 'playing' && this.player.alive) {
      if (this.waveBreak > 0) {
        this.waveBreak -= dt;
        if (this.waveBreak <= 0) this.startWave(this.wave + 1);
      } else if (!this.boss && this.centipede.total === 0) {
        this.completeWave();
      }
    }

    this.audio.setIntensity(clamp(0.18 + this.wave * 0.06 + (this.surgeActive ? 0.3 : 0), 0, 1));
    this.pushHud();
  }

  spawnCycle(dt) {
    if (this.waveBreak > 0) return;
    const rate = this.diff.enemyRate * (1 + (this.wave - 1) * 0.06);

    this.spiderTimer -= dt;
    if (this.spiderTimer <= 0 && this.enemies.count('spider') < (this.wave > 6 ? 2 : 1)) {
      this.spiderTimer = rand(11, 5) / rate;
      this.enemies.spawnSpider(1 + (this.wave - 1) * 0.04);
    }

    this.fleaTimer -= dt;
    if (this.fleaTimer <= 0) {
      this.fleaTimer = rand(8, 4) / rate;
      // classic rule: fleas show up when the player's zone gets too clear
      if (this.mushroomsInZone() < 6 + this.wave * 0.3) {
        this.enemies.spawnFlea(this.player.x, 1 + (this.wave - 1) * 0.03);
      }
    }

    if (this.wave >= 3) {
      this.scorpionTimer -= dt;
      if (this.scorpionTimer <= 0) {
        this.scorpionTimer = rand(22, 12) / rate;
        this.enemies.spawnScorpion(1 + (this.wave - 1) * 0.03);
      }
    }
  }

  mushroomsInZone() {
    let n = 0;
    const startRow = ROWS - 8;
    for (let cy = startRow; cy < ROWS; cy++) {
      for (let cx = 0; cx < COLS; cx++) if (this.field.has(cx, cy)) n++;
    }
    return n;
  }

  spawnBossMinions(boss) {
    if (chance(0.5)) {
      this.centipede.spawnChain(randInt(3, 5), { row: 1, fromRight: chance(0.5), armor: boss.tier > 1 ? 1 : 0 });
    } else {
      this.enemies.spawnFlea(this.player.x, 1.1);
      if (boss.phase > 1) this.enemies.spawnSpider(1.1);
    }
  }

  finishBoss() {
    const b = this.boss;
    this.boss = null;
    this.shaker.add(22);
    this.freeze = 0.12;
    this.audio.sfx('death');
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        this.particles.burst(b.x + rand(60, -60), b.y + rand(60, -60), COLORS.boss, 30, 340);
        this.audio.sfx('enemy');
      }, i * 110);
    }
    this.addScore(SCORE.boss, b.x, b.y, { color: COLORS.boss, size: 24 });
    this.powerups.drop(b.x - 26, b.y, 'life');
    this.powerups.drop(b.x + 26, b.y);
    this.setBanner('QUEEN SLAIN', 'THE HIVE SCREAMS', COLORS.boss);
    this.stats.kills++;
  }

  // --------------------------------------------------------------- collisions
  collide() {
    const { bullets, centipede, enemies, field, player, particles } = this;

    // player bullets
    for (let i = bullets.items.length - 1; i >= 0; i--) {
      const b = bullets.items[i];
      let consumed = false;

      if (this.boss) {
        const hit = this.boss.hitTest(b.x, b.y, b.r);
        if (hit) {
          this.stats.hits++;
          const res = this.boss.damage(hit, b.dmg);
          particles.burst(b.x, b.y, hit.part === 'head' ? '#fff' : COLORS.boss, 6, 140);
          this.audio.sfx('bossHit');
          if (res === 'node') {
            this.addScore(SCORE.bossNode, b.x, b.y);
            this.bumpCombo();
            this.addSurge(SURGE.gainSegment);
            particles.burst(b.x, b.y, COLORS.boss, 18, 240);
          } else if (hit.part === 'head') {
            this.addScore(12, null, null);
            this.addSurge(1);
          }
          if (!b.pierce) consumed = true;
        }
      }

      if (!consumed) {
        const hit = centipede.hitTest(b.x, b.y, b.r);
        if (hit) {
          this.stats.hits++;
          const res = centipede.damage(hit, b.dmg);
          if (res === 'killed') this.killSegment(hit, false);
          else {
            particles.burst(b.x, b.y, '#fff', 5, 120);
            this.audio.sfx('mush');
          }
          if (!b.pierce) consumed = true;
        }
      }

      if (!consumed) {
        const e = enemies.hitTest(b.x, b.y, b.r);
        if (e) {
          this.stats.hits++;
          e.hp -= b.dmg;
          e.flash = 1;
          if (e.hp <= 0) this.killEnemy(e, true);
          else {
            if (e.type === 'flea') e.vy *= 1.7;
            particles.burst(b.x, b.y, '#fff', 6, 140);
            this.audio.sfx('mush');
          }
          if (!b.pierce) consumed = true;
        }
      }

      if (!consumed) {
        const c = field.cellAt(b.x, b.y);
        if (field.has(c.cx, c.cy)) {
          const res = field.damage(c.cx, c.cy, b.dmg);
          this.stats.hits++;
          const p = field.center(c.cx, c.cy);
          if (res === 'destroyed') {
            this.stats.mush++;
            this.addScore(SCORE.mushKill, p.x, p.y);
            this.addSurge(SURGE.gainMush);
            particles.burst(p.x, p.y, COLORS.mush, 14, 190);
            this.audio.sfx('mushKill');
          } else {
            this.addScore(SCORE.mushHit, null, null);
            particles.burst(b.x, b.y, COLORS.mushHot, 4, 90);
            this.audio.sfx('mush');
          }
          if (!b.pierce) consumed = true;
        }
      }

      if (consumed) bullets.items.splice(i, 1);
    }

    // enemy bullets
    for (let i = bullets.enemy.length - 1; i >= 0; i--) {
      const b = bullets.enemy[i];
      if (player.alive && player.hits(b.x, b.y, b.r)) {
        bullets.enemy.splice(i, 1);
        this.hurt(b.x, b.y);
        continue;
      }
      const c = field.cellAt(b.x, b.y);
      if (field.has(c.cx, c.cy) && chance(0.6)) {
        field.damage(c.cx, c.cy, 1);
        particles.burst(b.x, b.y, COLORS.boss, 5, 90);
        bullets.enemy.splice(i, 1);
      }
    }

    // bodies vs player
    const seg = centipede.playerCollision(player);
    if (seg) this.hurt(seg.x, seg.y);
    const enemy = enemies.playerCollision(player);
    if (enemy) this.hurt(enemy.x, enemy.y);
    if (this.boss && this.boss.playerCollision(player)) this.hurt(player.x, player.y - 20);
  }

  killSegment(hit, silent) {
    const { seg } = hit;
    this.stats.kills++;
    this.bumpCombo();
    const isHead = seg.head;
    this.addScore(isHead ? SCORE.head : SCORE.body, seg.x, seg.y);
    this.addSurge(isHead ? SURGE.gainHead : SURGE.gainSegment);
    this.particles.burst(seg.x, seg.y, isHead ? COLORS.head : COLORS.body, isHead ? 24 : 16, 260);
    this.particles.ring(seg.x, seg.y, isHead ? COLORS.head : COLORS.body, 16, 10);
    if (!silent) this.audio.sfx(isHead ? 'head' : 'segment');
    this.shaker.add(isHead ? 3.5 : 1.6);
    // a mushroom sprouts where a segment falls
    if (chance(0.85)) this.field.plant(seg.cx, seg.cy);
    if (chance(this.diff.dropRate)) this.powerups.drop(seg.x, seg.y);
    if (this.multiplier >= 4 && chance(0.3)) {
      this.particles.text(seg.x, seg.y - 22, `x${this.multiplier}`, COLORS.bullet, 15);
    }
  }

  killEnemy(e, scorePopup) {
    this.stats.kills++;
    this.bumpCombo();
    this.addSurge(SURGE.gainEnemy);
    let base = SCORE.flea;
    let color = COLORS.flea;
    if (e.type === 'spider') {
      // closer spiders are worth more, like the original's proximity bonus
      const d = Math.hypot(e.x - this.player.x, e.y - this.player.y);
      base = d < 60 ? SCORE.spider * 1.5 : d < 140 ? SCORE.spider : SCORE.spider * 0.6;
      color = COLORS.spider;
    } else if (e.type === 'scorpion') {
      base = SCORE.scorpion;
      color = COLORS.scorpion;
    }
    this.addScore(base, e.x, e.y, { color });
    this.particles.burst(e.x, e.y, color, 26, 300);
    this.particles.ring(e.x, e.y, color, 26, 16);
    this.audio.sfx('enemy');
    this.shaker.add(4);
    if (chance(e.type === 'spider' ? 0.5 : 0.35)) this.powerups.drop(e.x, e.y);
    this.enemies.remove(e);
  }

  hurt(x, y) {
    const p = this.player;
    if (!p.alive || p.invulnerable) return;
    if (this.shield) {
      this.shield = false;
      p.invuln = 1.1;
      this.audio.sfx('dash');
      this.particles.ring(p.x, p.y, '#7a5cff', 50, 28);
      this.particles.text(p.x, p.y - 26, 'SHIELD DOWN', '#7a5cff', 16);
      this.shaker.add(7);
      this.freeze = 0.05;
      this.pushHud();
      return;
    }
    this.lives--;
    this.combo = 0;
    this.surge = Math.max(0, this.surge - 30);
    this.surgeTime = 0;
    this.powers = {};
    p.kill();
    this.audio.sfx('death');
    this.shaker.add(20);
    this.freeze = 0.14;
    this.particles.burst(p.x, p.y, COLORS.player, 40, 340);
    this.particles.ring(p.x, p.y, '#fff', 70, 30);
    this.particles.text(x, y - 20, this.lives > 0 ? 'HIT!' : 'GAME OVER', COLORS.danger, 20);
    this.pushHud();
  }

  respawn() {
    if (this.lives <= 0) {
      this.gameOver();
      return;
    }
    // clear the player's zone so the respawn is survivable
    for (const e of [...this.enemies.items]) {
      if (e.y > PLAYER_TOP - CELL) {
        this.particles.burst(e.x, e.y, '#fff', 12, 180);
        this.enemies.remove(e);
      }
    }
    for (const found of this.centipede.segmentsInRadius(this.player.x, H, 190)) {
      const hit = this.centipede.locate(found.seg);
      if (!hit) continue;
      this.centipede.damage(hit, 99);
      this.particles.burst(hit.seg.x, hit.seg.y, COLORS.body, 10, 160);
    }
    this.bullets.enemy.length = 0;
    const healed = this.field.healAll();
    if (healed) this.addScore(healed * 2, null, null, { raw: true });
    this.player.reset();
    this.pushHud();
  }

  gameOver() {
    this.state = 'over';
    this.audio.stopMusic();
    this.audio.sfx('gameover');
    this.stats.waves = Math.max(this.stats.waves, this.wave - (this.waveBreak > 0 ? 1 : 0));
    const accuracy = this.stats.shots ? Math.round((this.stats.hits / this.stats.shots) * 100) : 0;
    this.onGameOver?.({
      score: this.score,
      wave: this.wave,
      bestCombo: this.stats.bestCombo,
      accuracy,
      kills: this.stats.kills,
      difficulty: this.difficultyKey,
      time: this.gameTime
    });
  }

  pushHud() {
    this.onHud?.({
      score: this.score,
      lives: this.lives,
      wave: this.wave,
      combo: this.combo,
      multiplier: this.multiplier,
      comboRatio: clamp(this.comboTimer / COMBO_WINDOW, 0, 1),
      surge: this.surge / SURGE.max,
      surgeActive: this.surgeActive,
      surgeRatio: this.surgeActive ? this.surgeTime / SURGE.dur : 0,
      powers: { ...this.powers, ...(this.shield ? { shield: 1 } : {}) },
      boss: this.boss ? { hp: this.boss.hp / this.boss.maxHp, phase: this.boss.phase } : null
    });
  }

  // ------------------------------------------------------------------ drawing
  render() {
    const ctx = this.ctx;
    ctx.save();
    ctx.setTransform(this.canvas.scaleX, 0, 0, this.canvas.scaleY, 0, 0);
    ctx.clearRect(0, 0, W, CANVAS_H);

    ctx.save();
    ctx.translate(0, HUD_H);

    this.drawBackground(ctx);

    ctx.save();
    ctx.translate(this.shaker.x, this.shaker.y);

    if (this.surgeActive) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(253,246,160,0.045)';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    this.field.render(ctx, this.time);
    this.powerups.render(ctx, this.time);
    if (this.boss) this.boss.render(ctx, this.time);
    this.centipede.render(ctx, this.time);
    this.enemies.render(ctx, this.time);
    this.bullets.render(ctx);
    this.player.render(ctx, this.time);
    if (this.shield && this.player.alive) this.player.renderShield(ctx, this.time);
    this.particles.render(ctx);

    ctx.restore();

    this.drawOverlay(ctx);
    ctx.restore();

    this.drawHudBand(ctx);
    ctx.restore();
  }

  /** Backdrop for the DOM heads-up display. */
  drawHudBand(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, HUD_H);
    g.addColorStop(0, '#0a0620');
    g.addColorStop(1, '#06040f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, HUD_H);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const bar = ctx.createLinearGradient(0, 0, W, 0);
    bar.addColorStop(0, 'rgba(95,251,241,0)');
    bar.addColorStop(0.5, 'rgba(122,92,255,0.55)');
    bar.addColorStop(1, 'rgba(255,77,157,0)');
    ctx.fillStyle = bar;
    ctx.fillRect(0, HUD_H - 2, W, 2);
    ctx.globalAlpha = 0.35;
    ctx.fillRect(0, HUD_H - 12, W, 10);
    ctx.restore();
  }

  drawBackground(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0b0725');
    g.addColorStop(0.55, '#07041a');
    g.addColorStop(1, '#120830');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // drifting stars
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const s of this.stars) {
      const y = (s.y + this.time * 12 * s.z) % H;
      ctx.globalAlpha = 0.15 + s.z * 0.35;
      ctx.fillStyle = '#9ec7ff';
      ctx.fillRect(s.x, y, s.s, s.s);
    }
    ctx.restore();

    // grid
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= COLS; x++) {
      ctx.moveTo(x * CELL + 0.5, 0);
      ctx.lineTo(x * CELL + 0.5, H);
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.moveTo(0, y * CELL + 0.5);
      ctx.lineTo(W, y * CELL + 0.5);
    }
    ctx.stroke();

    // the line the swarm has to cross to reach you
    const pulse = 0.35 + Math.sin(this.time * 2.2) * 0.12;
    ctx.save();
    ctx.strokeStyle = `rgba(255,77,109,${pulse})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 10]);
    ctx.lineDashOffset = -this.time * 26;
    ctx.beginPath();
    ctx.moveTo(0, PLAYER_TOP);
    ctx.lineTo(W, PLAYER_TOP);
    ctx.stroke();
    ctx.restore();

    const zg = ctx.createLinearGradient(0, PLAYER_TOP, 0, H);
    zg.addColorStop(0, 'rgba(255,77,109,0.05)');
    zg.addColorStop(1, 'rgba(95,251,241,0.04)');
    ctx.fillStyle = zg;
    ctx.fillRect(0, PLAYER_TOP, W, H - PLAYER_TOP);
  }

  drawOverlay(ctx) {
    // boss health bar
    if (this.boss) {
      const bw = W * 0.7;
      const bx = (W - bw) / 2;
      const by = 10;
      ctx.save();
      ctx.fillStyle = 'rgba(5,3,15,0.7)';
      ctx.fillRect(bx - 2, by - 2, bw + 4, 14);
      const k = clamp(this.boss.hp / this.boss.maxHp, 0, 1);
      const g = ctx.createLinearGradient(bx, 0, bx + bw, 0);
      g.addColorStop(0, '#ff3b6b');
      g.addColorStop(1, '#ffb03a');
      ctx.fillStyle = g;
      ctx.shadowColor = '#ff3b6b';
      ctx.shadowBlur = 14;
      ctx.fillRect(bx, by, bw * k, 10);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.strokeRect(bx - 0.5, by - 0.5, bw + 1, 11);
      ctx.fillStyle = '#ffd2dd';
      ctx.font = '600 11px "Rajdhani", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`HIVE QUEEN  ·  PHASE ${this.boss.phase}`, W / 2, by + 24);
      ctx.restore();
    }

    // centre banner
    if (this.banner) {
      const b = this.banner;
      const k = b.time / b.life;
      const alpha = k < 0.15 ? k / 0.15 : k > 0.75 ? (1 - k) / 0.25 : 1;
      ctx.save();
      ctx.globalAlpha = clamp(alpha, 0, 1);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const y = H * 0.36;
      ctx.font = '700 46px "Orbitron", "Rajdhani", system-ui, sans-serif';
      ctx.fillStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 26;
      ctx.fillText(b.text, W / 2, y);
      ctx.font = '600 16px "Rajdhani", system-ui, sans-serif';
      ctx.shadowBlur = 10;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText(b.sub || '', W / 2, y + 34);
      ctx.restore();
    }

    if (this.state === 'paused') {
      ctx.save();
      ctx.fillStyle = 'rgba(5,3,15,0.55)';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }
}
