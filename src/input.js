export const INPUT_BINDINGS = Object.freeze({
  left: Object.freeze(["ArrowLeft", "KeyA"]),
  right: Object.freeze(["ArrowRight", "KeyD"]),
  jump: Object.freeze(["Space", "ArrowUp", "KeyW"]),
  restart: Object.freeze(["KeyR"]),
});

export class InputController {
  constructor(target = typeof window !== "undefined" ? window : undefined, bindings = INPUT_BINDINGS) {
    this.target = target;
    this.bindings = bindings;
    this.keysDown = new Set();
    this.jumpBuffered = false;
    this.startRequested = false;
    this.resetRequested = false;

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.clear = this.clear.bind(this);

    this.attach();
  }

  attach() {
    if (!this.target?.addEventListener) {
      return;
    }

    this.target.addEventListener("keydown", this.handleKeyDown);
    this.target.addEventListener("keyup", this.handleKeyUp);
    this.target.addEventListener("blur", this.clear);
  }

  destroy() {
    if (!this.target?.removeEventListener) {
      return;
    }

    this.target.removeEventListener("keydown", this.handleKeyDown);
    this.target.removeEventListener("keyup", this.handleKeyUp);
    this.target.removeEventListener("blur", this.clear);
  }

  handleKeyDown(event) {
    const action = this.getActionForCode(event.code);
    if (!action) {
      return;
    }

    event.preventDefault();

    if (action === "jump" && !this.keysDown.has(event.code)) {
      this.jumpBuffered = true;
      this.startRequested = true;
    } else if (action === "left" || action === "right") {
      this.startRequested = true;
    } else if (action === "restart") {
      this.resetRequested = true;
    }

    this.keysDown.add(event.code);
  }

  handleKeyUp(event) {
    this.keysDown.delete(event.code);
  }

  getActionForCode(code) {
    for (const [action, codes] of Object.entries(this.bindings)) {
      if (codes.includes(code)) {
        return action;
      }
    }

    return "";
  }

  isPressed(action) {
    const codes = this.bindings[action] ?? [];
    return codes.some((code) => this.keysDown.has(code));
  }

  consumeJumpBuffer() {
    const buffered = this.jumpBuffered;
    this.jumpBuffered = false;
    return buffered;
  }

  consumeStartRequest() {
    const requested = this.startRequested;
    this.startRequested = false;
    return requested;
  }

  consumeResetRequest() {
    const requested = this.resetRequested;
    this.resetRequested = false;
    return requested;
  }

  clear() {
    this.keysDown.clear();
    this.jumpBuffered = false;
    this.startRequested = false;
  }
}
