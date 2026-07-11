import { INPUT_CONFIG } from "./tilemap.js";

const RESERVED_SINGLETONS = new Set(["F5", "F11", "F12"]);

export class InputManager {
  constructor(target = window, config = INPUT_CONFIG) {
    this.config = structuredClone(config);
    this.downCodes = new Set();
    this.actions = this.emptyActions();
    this.previousActions = this.emptyActions();
    this.rebinding = null;
    this.target = target;
    this.onChange = () => {};
    target.addEventListener("keydown", (event) => this.onKey(event, true));
    target.addEventListener("keyup", (event) => this.onKey(event, false));
    window.addEventListener("blur", () => this.clearEdges());
  }

  emptyActions() {
    return Object.fromEntries(this.config.actions.map((action) => [action, false]));
  }

  onKey(event, isDown) {
    if (this.rebinding && isDown) {
      this.bind(this.rebinding, event.code);
      this.rebinding = null;
      event.preventDefault();
      return;
    }
    if (isDown) this.downCodes.add(event.code);
    else this.downCodes.delete(event.code);
    if (this.codeHasAction(event.code)) event.preventDefault();
  }

  codeHasAction(code) {
    return Object.values(this.config.bindings).some((codes) => codes.includes(code));
  }

  beginRebind(action) {
    this.rebinding = action;
  }

  bind(action, code) {
    const existing = this.config.bindings[action] || [];
    if (!existing.includes(code)) this.config.bindings[action] = [code, ...existing.slice(0, 1)];
    this.onChange(this.conflicts());
  }

  conflicts() {
    const owners = new Map();
    const conflicts = [];
    for (const [action, codes] of Object.entries(this.config.bindings)) {
      for (const code of codes) {
        if (owners.has(code) && !conflicts.includes(code)) conflicts.push(code);
        owners.set(code, action);
      }
      if (codes.length === 1 && RESERVED_SINGLETONS.has(codes[0])) conflicts.push(codes[0]);
    }
    return conflicts;
  }

  sampleGamepad() {
    const pads = typeof navigator === "undefined" ? [] : navigator.getGamepads?.() || [];
    const pad = Array.from(pads).find(Boolean);
    const state = {};
    if (!pad) return state;
    state.moveLeft = (pad.axes[0] || 0) < -0.35 || pad.buttons[14]?.pressed;
    state.moveRight = (pad.axes[0] || 0) > 0.35 || pad.buttons[15]?.pressed;
    state.run = Boolean(pad.buttons[5]?.pressed);
    state.jump = Boolean(pad.buttons[0]?.pressed);
    state.pause = Boolean(pad.buttons[9]?.pressed);
    state.confirm = Boolean(pad.buttons[0]?.pressed);
    state.back = Boolean(pad.buttons[1]?.pressed);
    return state;
  }

  sample() {
    this.previousActions = { ...this.actions };
    const gamepad = this.sampleGamepad();
    const next = this.emptyActions();
    for (const action of this.config.actions) {
      next[action] = Boolean(gamepad[action]) || (this.config.bindings[action] || []).some((code) => this.downCodes.has(code));
    }
    this.actions = next;
    return this.frame();
  }

  frame() {
    const axis = (this.actions.moveRight ? 1 : 0) - (this.actions.moveLeft ? 1 : 0);
    return {
      moveAxis: axis,
      jumpPressed: this.actions.jump && !this.previousActions.jump,
      jumpHeld: this.actions.jump,
      runHeld: this.actions.run,
      pausePressed: this.actions.pause && !this.previousActions.pause,
      confirmPressed: this.actions.confirm && !this.previousActions.confirm,
      backPressed: this.actions.back && !this.previousActions.back
    };
  }

  clearEdges() {
    this.downCodes.clear();
    this.actions = this.emptyActions();
    this.previousActions = this.emptyActions();
  }
}
