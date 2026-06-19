import { LEVEL1_DESIGN, TILE_SIZE, getLevelById, getTile, isSolidTile, level1, listLevels } from "./tilemap.js";
import { InputController } from "./input.js";
import { PhysicsSystem, approach, clamp, rectsOverlap } from "./physics.js";
import { GAME_STATES, coinRect, createGameState, createPlayer, goalRect } from "./entities.js";
import { Renderer, VIEW_WIDTH } from "./renderer.js";

const FIXED_STEP = 1 / 60;
const MAX_FRAME_STEPS = 5;

export const GAME_STATE_EVENTS = Object.freeze({
  RESET: "reset",
  START: "start",
  RESPAWN: "respawn",
  WIN: "win",
  LOSE: "lose",
});

const GAME_STATE_TRANSITIONS = Object.freeze({
  [GAME_STATES.READY]: Object.freeze({
    [GAME_STATE_EVENTS.RESET]: GAME_STATES.READY,
    [GAME_STATE_EVENTS.START]: GAME_STATES.PLAYING,
  }),
  [GAME_STATES.PLAYING]: Object.freeze({
    [GAME_STATE_EVENTS.RESET]: GAME_STATES.READY,
    [GAME_STATE_EVENTS.RESPAWN]: GAME_STATES.PLAYING,
    [GAME_STATE_EVENTS.WIN]: GAME_STATES.WON,
    [GAME_STATE_EVENTS.LOSE]: GAME_STATES.LOST,
  }),
  [GAME_STATES.WON]: Object.freeze({
    [GAME_STATE_EVENTS.RESET]: GAME_STATES.READY,
  }),
  [GAME_STATES.LOST]: Object.freeze({
    [GAME_STATE_EVENTS.RESET]: GAME_STATES.READY,
  }),
});

export const GAME_STATE_MACHINE = Object.freeze({
  initial: GAME_STATES.READY,
  terminal: Object.freeze([GAME_STATES.WON, GAME_STATES.LOST]),
  transitions: GAME_STATE_TRANSITIONS,
});

export function getStateTransition(fromState, event) {
  return GAME_STATE_TRANSITIONS[fromState]?.[event] ?? null;
}

export function canTransitionGameState(fromState, event) {
  return getStateTransition(fromState, event) !== null;
}

export class GameEngine {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.levels = options.levels ?? listLevels();
    this.level = this.resolveLevel(options.levelId ?? options.level ?? level1);
    this.input = options.input ?? new InputController(options.inputTarget);
    this.physics = options.physics ?? new PhysicsSystem(this.level);
    this.renderer = options.renderer ?? new Renderer(canvas);
    this.fixedStep = options.fixedStep ?? FIXED_STEP;
    this.maxFrameSteps = options.maxFrameSteps ?? MAX_FRAME_STEPS;
    this.lastTime = 0;
    this.accumulator = 0;
    this.frameRequest = 0;
    this.running = false;

    this.resize = this.resize.bind(this);
    this.loop = this.loop.bind(this);
    this.reset();

    if (typeof window !== "undefined") {
      window.addEventListener("resize", this.resize);
    }
  }

  resolveLevel(levelOrId) {
    if (typeof levelOrId === "string") {
      const localLevel = this.levels.find((level) => level.id === levelOrId);
      const registeredLevel = localLevel ?? getLevelById(levelOrId);
      if (!registeredLevel) {
        throw new RangeError(`Unknown TileMap level id "${levelOrId}".`);
      }

      return registeredLevel;
    }

    if (levelOrId && typeof levelOrId === "object" && Array.isArray(levelOrId.tiles)) {
      return levelOrId;
    }

    throw new TypeError("GameEngine requires a TileMap level object or registered level id.");
  }

  setLevel(levelOrId, options = {}) {
    this.level = this.resolveLevel(levelOrId);
    this.physics.setLevel?.(this.level);

    if (options.reset !== false) {
      this.reset();
    }

    return this.level;
  }

  getAvailableLevels() {
    return this.levels;
  }

  reset() {
    const state = createGameState(this.level);
    this.player = state.player;
    this.coins = state.coins;
    this.enemies = state.enemies;
    this.cameraX = state.cameraX;
    this.elapsed = state.elapsed;
    this.score = state.score;
    this.lives = state.lives;
    this.state = state.state;
    this.previousState = null;
    this.stateElapsed = 0;
    this.lastStateEvent = GAME_STATE_EVENTS.RESET;
    this.transitionCount = 0;
    this.messageTimer = state.messageTimer;
    this.accumulator = 0;
  }

  transitionState(event, payload = {}) {
    const nextState = getStateTransition(this.state, event);
    if (!nextState) {
      return false;
    }

    const previousState = this.state;
    this.state = nextState;
    this.previousState = previousState;
    this.lastStateEvent = event;
    this.transitionCount += 1;

    if (previousState !== nextState) {
      this.stateElapsed = 0;
      this.enterState(nextState, previousState, event, payload);
    }

    return true;
  }

  enterState(nextState) {
    if (nextState === GAME_STATES.WON || nextState === GAME_STATES.LOST) {
      this.player.vx = 0;
      this.player.jumpHold = 0;
      this.messageTimer = 0;
    }
  }

  start() {
    if (this.running || typeof requestAnimationFrame === "undefined") {
      return;
    }

    this.running = true;
    this.frameRequest = requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
    if (this.frameRequest && typeof cancelAnimationFrame !== "undefined") {
      cancelAnimationFrame(this.frameRequest);
    }
  }

  destroy() {
    this.stop();
    this.input.destroy();
    if (typeof window !== "undefined") {
      window.removeEventListener("resize", this.resize);
    }
  }

  resize() {
    this.renderer.resize();
  }

  loop(time) {
    if (!this.running) {
      return;
    }

    const delta = Math.min(0.1, (time - this.lastTime) / 1000 || 0);
    this.lastTime = time;
    this.accumulator += delta;

    let steps = 0;
    while (this.accumulator >= this.fixedStep && steps < this.maxFrameSteps) {
      this.update(this.fixedStep);
      this.accumulator -= this.fixedStep;
      steps += 1;
    }

    this.draw();
    this.frameRequest = requestAnimationFrame(this.loop);
  }

  update(dt) {
    if (this.input.consumeResetRequest()) {
      this.reset();
      return;
    }

    this.stateElapsed += dt;

    if (this.state === GAME_STATES.PLAYING) {
      this.elapsed += dt;
      this.updatePlayer(dt);
      this.updateEnemies(dt);
      this.collectCoins();
      this.resolveEnemyCollisions();
      this.checkGoal();
      this.checkFallOut();
    } else if (this.state === GAME_STATES.READY && this.input.consumeStartRequest()) {
      this.transitionState(GAME_STATE_EVENTS.START);
    }

    if (this.player.invulnerable > 0) {
      this.player.invulnerable -= dt;
    }

    if (this.messageTimer > 0) {
      this.messageTimer -= dt;
    }

    this.cameraX = clamp(
      this.player.x + this.player.width * 0.5 - VIEW_WIDTH * 0.42,
      0,
      Math.max(0, this.level.pixelWidth - VIEW_WIDTH),
    );
  }

  updatePlayer(dt) {
    const player = this.player;
    const left = this.input.isPressed("left");
    const right = this.input.isPressed("right");
    const jump = this.input.isPressed("jump");
    const acceleration = player.grounded ? 1850 : 1150;
    const friction = player.grounded ? 1450 : 420;
    const maxSpeed = 205;

    if (left === right) {
      player.vx = approach(player.vx, 0, friction * dt);
    } else if (left) {
      player.vx = clamp(player.vx - acceleration * dt, -maxSpeed, maxSpeed);
      player.facing = -1;
    } else if (right) {
      player.vx = clamp(player.vx + acceleration * dt, -maxSpeed, maxSpeed);
      player.facing = 1;
    }

    if (this.input.consumeJumpBuffer() && player.grounded) {
      player.vy = -585;
      player.grounded = false;
      player.jumpHold = 0.16;
    }

    if (jump && player.jumpHold > 0 && player.vy < 0) {
      player.vy -= 980 * dt;
      player.jumpHold -= dt;
    } else {
      player.jumpHold = 0;
    }

    this.physics.applyGravity(player, dt);
    this.physics.moveWithTiles(player, player.vx * dt, player.vy * dt, {
      onHazard: () => this.damagePlayer(),
    });
    player.x = clamp(player.x, 0, this.level.pixelWidth - player.width);
  }

  updateEnemies(dt) {
    for (const enemy of this.enemies) {
      if (enemy.defeated) {
        continue;
      }

      this.physics.applyGravity(enemy, dt);
      this.physics.moveWithTiles(enemy, enemy.vx * dt, enemy.vy * dt);

      const direction = enemy.direction < 0 ? -1 : 1;
      const forwardX = direction < 0 ? enemy.x - 2 : enemy.x + enemy.width + 2;
      const footY = enemy.y + enemy.height + 2;
      const wallTile = getTile(this.level, Math.floor(forwardX / TILE_SIZE), Math.floor((enemy.y + enemy.height * 0.5) / TILE_SIZE));
      const floorTile = getTile(this.level, Math.floor(forwardX / TILE_SIZE), Math.floor(footY / TILE_SIZE));

      if (enemy.vx === 0 || isSolidTile(wallTile) || !isSolidTile(floorTile)) {
        enemy.direction *= -1;
        enemy.vx = enemy.direction * enemy.speed;
      }
    }
  }

  collectCoins() {
    for (const coin of this.coins) {
      if (coin.collected) {
        continue;
      }

      if (rectsOverlap(this.player, coinRect(coin))) {
        coin.collected = true;
        this.score += 100;
        this.messageTimer = 0.7;
      }
    }
  }

  resolveEnemyCollisions() {
    for (const enemy of this.enemies) {
      if (enemy.defeated || !rectsOverlap(this.player, enemy)) {
        continue;
      }

      const playerBottom = this.player.y + this.player.height;
      const enemyTop = enemy.y + 6;
      if (this.player.vy > 80 && playerBottom <= enemyTop + 14) {
        enemy.defeated = true;
        this.player.vy = -360;
        this.score += 250;
      } else {
        this.damagePlayer();
      }
    }
  }

  damagePlayer() {
    if (this.player.invulnerable > 0 || this.state !== GAME_STATES.PLAYING) {
      return;
    }

    this.lives -= 1;
    if (this.lives <= 0) {
      this.transitionState(GAME_STATE_EVENTS.LOSE);
      return;
    }

    this.transitionState(GAME_STATE_EVENTS.RESPAWN);
    this.player = createPlayer(this.level);
    this.player.invulnerable = 1.4;
    this.messageTimer = 1.2;
  }

  checkGoal() {
    if (!rectsOverlap(this.player, goalRect(this.level.goal))) {
      return;
    }

    if (this.transitionState(GAME_STATE_EVENTS.WIN)) {
      this.score += Math.max(0, Math.round(5000 - this.elapsed * 35));
    }
  }

  checkFallOut() {
    if (this.player.y > this.level.pixelHeight + 96) {
      this.damagePlayer();
    }
  }

  draw() {
    this.renderer.render({
      level: this.level,
      player: this.player,
      coins: this.coins,
      enemies: this.enemies,
      cameraX: this.cameraX,
      score: this.score,
      lives: this.lives,
      state: this.state,
      previousState: this.previousState,
      stateElapsed: this.stateElapsed,
      lastStateEvent: this.lastStateEvent,
      messageTimer: this.messageTimer,
    });
  }
}

export function ensureCanvas() {
  let canvas = document.querySelector("canvas[data-retro-platformer]");
  if (canvas) {
    return canvas;
  }

  canvas = document.createElement("canvas");
  canvas.dataset.retroPlatformer = "true";
  canvas.setAttribute("aria-label", "Playable retro platformer Level 1");
  canvas.tabIndex = 0;
  document.body.append(canvas);
  document.body.style.margin = "0";
  document.body.style.minHeight = "100vh";
  document.body.style.display = "grid";
  document.body.style.placeItems = "center";
  document.body.style.background = "#17243a";
  return canvas;
}

export function startLevel1(canvas = ensureCanvas()) {
  const game = new GameEngine(canvas);
  game.start();
  canvas.focus();
  return game;
}

export { LEVEL1_DESIGN };
