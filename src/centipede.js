import { CELL, COLS, ROWS, PLAYER_ZONE_ROWS, COLORS } from './config.js';
import { hitCircle, rand } from './util.js';

const BOUNCE_TOP = ROWS - PLAYER_ZONE_ROWS; // once down here, the swarm bounces in your face

class Segment {
  constructor(cx, cy, dir, head, hp) {
    this.cx = cx;
    this.cy = cy;
    this.x = cx * CELL + CELL / 2;
    this.y = cy * CELL + CELL / 2;
    this.dir = dir;
    this.ydir = 1;
    this.head = head;
    this.hp = hp;
    this.maxHp = hp;
    this.r = CELL * 0.44;
    this.queue = [];
    this.target = null;
    this.plunge = false;
    this.wiggle = rand(Math.PI * 2);
    this.flash = 0;
  }
}

export class Centipede {
  constructor() {
    this.chains = [];
    this.baseSpeed = 84;
  }

  reset() { this.chains.length = 0; }

  get total() {
    let n = 0;
    for (const c of this.chains) n += c.length;
    return n;
  }

  /** Spawns a chain entering from one side of the top row. */
  spawnChain(length, { row = 0, fromRight = false, armor = 0 } = {}) {
    const dir = fromRight ? -1 : 1;
    const startCx = fromRight ? COLS - 1 : 0;
    const chain = [];
    for (let i = 0; i < length; i++) {
      const cx = startCx - dir * i;
      const hp = i === 0 ? 2 + armor : 1 + armor;
      const seg = new Segment(cx, row, dir, i === 0, hp);
      // Pre-seed the trail so the chain marches in lockstep from frame one.
      if (i > 0) seg.queue.push({ cx: startCx - dir * (i - 1), cy: row });
      chain.push(seg);
    }
    this.chains.push(chain);
  }

  spawnHead(cx, cy, dir, armor = 0) {
    const seg = new Segment(cx, cy, dir, true, 2 + armor);
    this.chains.push([seg]);
  }

  chainSpeed(chain, mult) {
    const len = Math.min(chain.length, 6);
    return this.baseSpeed * mult * (1 + 0.5 * (1 - len / 6));
  }

  update(dt, field, speedMult) {
    for (let ci = this.chains.length - 1; ci >= 0; ci--) {
      const chain = this.chains[ci];
      if (!chain.length) {
        this.chains.splice(ci, 1);
        continue;
      }
      const speed = this.chainSpeed(chain, speedMult);
      for (let i = 0; i < chain.length; i++) {
        const seg = chain[i];
        seg.flash = Math.max(0, seg.flash - dt * 6);
        seg.wiggle += dt * 9;
        this.moveSegment(seg, chain[i + 1], field, speed, dt);
      }
    }
  }

  moveSegment(seg, follower, field, speed, dt) {
    let budget = speed * dt;
    let guard = 6;
    while (budget > 0 && guard-- > 0) {
      if (!seg.target) {
        this.pickTarget(seg, field);
        if (!seg.target) break;
      }
      const tx = seg.target.cx * CELL + CELL / 2;
      const ty = seg.target.cy * CELL + CELL / 2;
      const dx = tx - seg.x;
      const dy = ty - seg.y;
      const d = Math.hypot(dx, dy);
      if (d <= budget || d < 0.001) {
        seg.x = tx;
        seg.y = ty;
        seg.cx = seg.target.cx;
        seg.cy = seg.target.cy;
        budget -= d;
        seg.target = null;
        // hand our just-vacated waypoint to whoever follows
        if (follower) follower.queue.push({ cx: seg.cx, cy: seg.cy });
      } else {
        seg.x += (dx / d) * budget;
        seg.y += (dy / d) * budget;
        budget = 0;
      }
    }
  }

  pickTarget(seg, field) {
    if (!seg.head && seg.queue.length) {
      const next = seg.queue.shift();
      // stale waypoint (a split happened) - fall back to marching
      if (Math.abs(next.cx - seg.cx) + Math.abs(next.cy - seg.cy) <= 1) {
        seg.target = next;
        if (next.cx !== seg.cx) seg.dir = Math.sign(next.cx - seg.cx);
        if (next.cy !== seg.cy) seg.ydir = Math.sign(next.cy - seg.cy);
        return;
      }
      seg.queue.length = 0;
    }

    if (seg.plunge) {
      this.descend(seg);
      if (seg.cy >= ROWS - 1) {
        seg.plunge = false;
        seg.ydir = -1;
      }
      return;
    }

    const ncx = seg.cx + seg.dir;
    const wall = ncx < 0 || ncx >= COLS;
    const blocked = wall || field.has(ncx, seg.cy);
    if (blocked) {
      if (!wall && field.isPoison(ncx, seg.cy)) {
        seg.plunge = true;
        seg.ydir = 1;
        this.descend(seg);
        return;
      }
      seg.dir *= -1;
      this.descend(seg);
      return;
    }
    seg.target = { cx: ncx, cy: seg.cy };
  }

  descend(seg) {
    let ny = seg.cy + seg.ydir;
    if (ny > ROWS - 1) {
      seg.ydir = -1;
      ny = seg.cy - 1;
    } else if (ny < BOUNCE_TOP && seg.ydir < 0) {
      seg.ydir = 1;
      ny = seg.cy + 1;
    }
    if (ny < 0) ny = 0;
    seg.target = { cx: seg.cx, cy: Math.min(ROWS - 1, ny) };
  }

  /** Returns {chain, index, seg} for the first segment overlapping the circle. */
  hitTest(x, y, r) {
    for (let ci = 0; ci < this.chains.length; ci++) {
      const chain = this.chains[ci];
      for (let i = 0; i < chain.length; i++) {
        const seg = chain[i];
        if (hitCircle(seg.x, seg.y, seg.r, x, y, r)) return { chain, chainIndex: ci, index: i, seg };
      }
    }
    return null;
  }

  /**
   * Applies damage. Returns 'hit' or 'killed'. Killing a mid-chain segment
   * splits the tail into a new chain with its own head.
   */
  damage(hit, dmg = 1) {
    const { chain, index, seg } = hit;
    seg.hp -= dmg;
    seg.flash = 1;
    if (seg.hp > 0) return 'hit';

    const tail = chain.slice(index + 1);
    chain.length = index;
    if (tail.length) {
      const newHead = tail[0];
      newHead.head = true;
      newHead.hp = Math.max(newHead.hp, 1);
      newHead.queue.length = 0;
      newHead.target = null;
      this.chains.push(tail);
    }
    if (!chain.length) {
      const i = this.chains.indexOf(chain);
      if (i >= 0) this.chains.splice(i, 1);
    }
    return 'killed';
  }

  /** Re-finds a segment after splits have shuffled the chains. */
  locate(seg) {
    for (const chain of this.chains) {
      const index = chain.indexOf(seg);
      if (index >= 0) return { chain, index, seg };
    }
    return null;
  }

  /** Circle sweep used by bombs and the surge blast. */
  segmentsInRadius(x, y, radius) {
    const found = [];
    for (let ci = 0; ci < this.chains.length; ci++) {
      const chain = this.chains[ci];
      for (let i = 0; i < chain.length; i++) {
        const seg = chain[i];
        if (hitCircle(seg.x, seg.y, seg.r, x, y, radius)) found.push({ chain, chainIndex: ci, index: i, seg });
      }
    }
    return found;
  }

  playerCollision(player) {
    if (!player.alive) return null;
    for (const chain of this.chains) {
      for (const seg of chain) {
        if (player.hits(seg.x, seg.y, seg.r * 0.85)) return seg;
      }
    }
    return null;
  }

  render(ctx, time) {
    ctx.save();
    for (const chain of this.chains) {
      for (let i = chain.length - 1; i >= 0; i--) {
        const seg = chain[i];
        this.drawSegment(ctx, seg, i, time);
      }
    }
    ctx.restore();
  }

  drawSegment(ctx, seg, index, time) {
    const armored = seg.maxHp > (seg.head ? 2 : 1);
    const base = seg.head ? COLORS.head : COLORS.body;
    const color = armored ? '#ff2bd6' : base;
    const wob = Math.sin(seg.wiggle) * 1.6;
    const perpX = seg.ydir !== 0 && seg.target && seg.target.cx === seg.cx ? 1 : 0;

    ctx.save();
    ctx.translate(seg.x + wob * perpX, seg.y + wob * (1 - perpX));
    ctx.shadowColor = color;
    ctx.shadowBlur = seg.head ? 20 : 12;

    // legs
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1.6;
    const legPhase = Math.sin(seg.wiggle * 1.6);
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * seg.r * 0.5, 0);
      ctx.lineTo(s * (seg.r + 4), legPhase * 4);
      ctx.stroke();
    }

    const g = ctx.createRadialGradient(-2, -3, 1, 0, 0, seg.r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.35, color);
    g.addColorStop(1, 'rgba(10,4,26,0.95)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, seg.r, 0, Math.PI * 2);
    ctx.fill();

    if (armored) {
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, 0, seg.r - 2.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (seg.head) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#05030f';
      const ex = seg.dir * 2.5;
      ctx.beginPath();
      ctx.arc(ex - 3, -2.5, 2, 0, Math.PI * 2);
      ctx.arc(ex + 3, -2.5, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(ex - 3, -3, 0.8, 0, Math.PI * 2);
      ctx.arc(ex + 3, -3, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    if (seg.flash > 0) {
      ctx.globalAlpha = seg.flash;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(0, 0, seg.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
