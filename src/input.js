import { clamp } from './util.js';

const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  KeyJ: 'fire', KeyZ: 'fire', Enter: 'fire',
  Space: 'dash',
  ShiftLeft: 'surge', ShiftRight: 'surge', KeyE: 'surge', KeyK: 'surge'
};

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.held = new Set();
    this.pressed = new Set();
    this.pointer = { active: false, x: 0, y: 0, firing: false };
    this.onPause = null;
    this.onAnyKey = null;
    this.gamepadIndex = null;
    this.prevPad = {};

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const action = KEYMAP[e.code];
      if (action) {
        e.preventDefault();
        this.held.add(action);
        this.pressed.add(action);
      }
      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        this.onPause?.();
      }
      if (e.code === 'Space') e.preventDefault();
      this.onAnyKey?.(e);
    });

    window.addEventListener('keyup', (e) => {
      const action = KEYMAP[e.code];
      if (action) this.held.delete(action);
    });

    window.addEventListener('blur', () => this.held.clear());

    const toLocal = (ev) => {
      const r = canvas.getBoundingClientRect();
      return {
        x: ((ev.clientX - r.left) / r.width) * canvas.logicalW,
        y: ((ev.clientY - r.top) / r.height) * canvas.logicalH - (canvas.logicalOffsetY || 0)
      };
    };

    canvas.addEventListener('pointerdown', (ev) => {
      canvas.setPointerCapture?.(ev.pointerId);
      const p = toLocal(ev);
      this.pointer.active = true;
      this.pointer.firing = true;
      this.pointer.x = p.x;
      this.pointer.y = p.y;
    });
    canvas.addEventListener('pointermove', (ev) => {
      if (!this.pointer.active) return;
      const p = toLocal(ev);
      this.pointer.x = p.x;
      this.pointer.y = p.y;
    });
    const release = () => {
      this.pointer.active = false;
      this.pointer.firing = false;
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('gamepadconnected', (e) => { this.gamepadIndex = e.gamepad.index; });
    window.addEventListener('gamepaddisconnected', () => { this.gamepadIndex = null; });
  }

  /** Binds an on-screen touch button to an action. */
  bindButton(el, action) {
    if (!el) return;
    const down = (e) => {
      e.preventDefault();
      this.held.add(action);
      this.pressed.add(action);
    };
    const up = (e) => {
      e.preventDefault();
      this.held.delete(action);
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointerleave', up);
    el.addEventListener('pointercancel', up);
  }

  pollGamepad() {
    if (this.gamepadIndex === null || !navigator.getGamepads) return;
    const pad = navigator.getGamepads()[this.gamepadIndex];
    if (!pad) return;
    const dz = 0.28;
    const ax = pad.axes[0] || 0;
    const ay = pad.axes[1] || 0;
    const set = (action, on) => {
      if (on) {
        if (!this.prevPad[action]) this.pressed.add(action);
        this.held.add(action);
      } else if (this.prevPad[action]) {
        this.held.delete(action);
      }
      this.prevPad[action] = on;
    };
    const dpad = (i) => pad.buttons[i] && pad.buttons[i].pressed;
    set('left', ax < -dz || dpad(14));
    set('right', ax > dz || dpad(15));
    set('up', ay < -dz || dpad(12));
    set('down', ay > dz || dpad(13));
    set('fire', (pad.buttons[7] && pad.buttons[7].pressed) || (pad.buttons[2] && pad.buttons[2].pressed));
    set('dash', pad.buttons[0] && pad.buttons[0].pressed);
    set('surge', pad.buttons[1] && pad.buttons[1].pressed);
    if (pad.buttons[9] && pad.buttons[9].pressed) {
      if (!this.prevPad.start) this.onPause?.();
      this.prevPad.start = true;
    } else {
      this.prevPad.start = false;
    }
  }

  isHeld(a) { return this.held.has(a); }
  consume(a) {
    if (this.pressed.has(a)) {
      this.pressed.delete(a);
      return true;
    }
    return false;
  }
  endFrame() { this.pressed.clear(); }

  /** Movement axis in [-1,1], keyboard/pad only. */
  axis() {
    let x = 0, y = 0;
    if (this.isHeld('left')) x -= 1;
    if (this.isHeld('right')) x += 1;
    if (this.isHeld('up')) y -= 1;
    if (this.isHeld('down')) y += 1;
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    return { x: clamp(x, -1, 1), y: clamp(y, -1, 1) };
  }
}
