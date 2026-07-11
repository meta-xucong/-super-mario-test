import { ASSET_MANIFEST, INPUT_CONFIG, LEVEL_DATA, TUNING, rectsOverlap, validateLevelData } from "./tilemap.js";
import { entityRect, makeEntity, makePlayer, makePowerup } from "./entities.js";
import { rebuildMapForState, sweepEntity } from "./physics.js";

const EVENT_PRIORITY = {
  GoalTouched: 0,
  PlayerDied: 1,
  PipeEntered: 2,
  EnemyStomped: 3,
  PlayerDamaged: 4,
  CoinCollected: 5,
  BlockHit: 6,
  ScoreChanged: 7,
  SceneChanged: 8
};

export class GameSimulation {
  constructor(level = LEVEL_DATA, tuning = TUNING) {
    validateLevelData(level);
    this.level = level;
    this.tuning = tuning;
    this.schemaVersion = "sunrise-run-save@1";
    this.restart("formal");
  }

  restart(mode = this.mode || "formal", anchor = "start") {
    this.mode = mode;
    const spawn = this.anchorSpawn(mode, anchor);
    this.areaId = spawn.area;
    this.player = makePlayer(spawn);
    this.entities = this.spawnEntities(this.areaId);
    this.revealedHidden = new Set();
    this.usedBlocks = new Set();
    this.brokenBlocks = new Set();
    this.collected = new Set();
    this.tick = 0;
    this.sequence = 0;
    this.score = 0;
    this.coins = 0;
    this.lives = this.lives || 3;
    this.remainingTime = this.tuning.timerSeconds;
    this.events = [];
    this.recentEvents = [];
    this.state = "playing";
    this.won = false;
    this.deathTimer = 0;
    this.finishTimer = 0;
    this.cameraX = 0;
    this.performanceEvents = [];
    this.map = rebuildMapForState(this.level, this.areaId, this);
  }

  anchorSpawn(mode, anchor) {
    if (mode === "practice" && anchor === "reward") return { area: "reward", x: 3, y: 10, facing: 1 };
    if (mode === "practice" && anchor === "finish") return { area: "surface", x: 188, y: 11.4, facing: 1 };
    return this.level.spawn;
  }

  spawnEntities(areaId) {
    return (this.level.areas[areaId].entities || []).map(makeEntity);
  }

  emit(type, sourceId, targetId, payload = {}) {
    const event = { tick: this.tick, sequence: this.sequence++, type, sourceId, targetId, payload };
    this.events.push(event);
    this.recentEvents.push(event);
    this.recentEvents = this.recentEvents.slice(-16);
    return event;
  }

  addScore(amount, reason, targetId) {
    this.score += amount;
    this.emit("ScoreChanged", "rules", targetId, { amount, reason, score: this.score });
  }

  step(input = {}, dt = this.tuning.fixedStep) {
    if (this.state === "paused" || this.state === "title") return;
    this.tick += 1;
    if (this.state === "dying") {
      this.deathTimer -= dt;
      this.player.vy += this.tuning.gravity * dt;
      this.player.y += this.player.vy * dt;
      if (this.deathTimer <= 0) {
        this.lives = Math.max(0, this.lives - 1);
        this.restart(this.mode);
        this.emit("SceneChanged", "rules", "restart", { reason: "deathRestart", lives: this.lives });
      }
      return;
    }
    if (this.state === "cleared") {
      this.finishTimer += dt;
      this.player.x += Math.min(2.4 * dt, 0.05);
      if (this.finishTimer > 2.5) this.won = true;
      return;
    }
    if (input.confirmPressed) this.checkPipeTriggers();
    this.updatePlayer(input, dt);
    this.updateEntities(dt);
    this.resolveEntityContacts();
    this.checkCollectibles();
    this.checkFinish();
    this.remainingTime = Math.max(0, this.remainingTime - dt);
    if (this.remainingTime <= 0) this.killPlayer("timer");
    this.cameraX = Math.max(this.cameraX, Math.max(0, this.player.x - 8));
  }

  updatePlayer(input, dt) {
    const p = this.player;
    p.prevX = p.x;
    p.prevY = p.y;
    if (p.invincible > 0) p.invincible -= dt;
    if (p.grounded) p.coyote = this.tuning.coyoteTime;
    else p.coyote = Math.max(0, p.coyote - dt);
    if (input.jumpPressed) p.jumpBuffer = this.tuning.jumpBuffer;
    else p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);
    const axis = p.controlLocked ? 0 : input.moveAxis || 0;
    const maxSpeed = input.runHeld ? this.tuning.runMaxSpeed : this.tuning.walkMaxSpeed;
    if (axis !== 0) {
      const accel = p.grounded ? this.tuning.groundAccel : this.tuning.airAccel;
      if (Math.sign(p.vx) && Math.sign(p.vx) !== axis && p.grounded) {
        p.vx += axis * this.tuning.skidDecel * dt;
        p.motion = "skidding";
      } else {
        p.vx += axis * accel * dt;
      }
      p.vx = Math.max(-maxSpeed, Math.min(maxSpeed, p.vx));
      p.facing = axis;
    } else if (p.grounded) {
      const sign = Math.sign(p.vx);
      const next = Math.max(0, Math.abs(p.vx) - this.tuning.friction * dt);
      p.vx = next * sign;
    }
    if (p.jumpBuffer > 0 && p.coyote > 0) {
      p.vy = this.tuning.jumpVelocity;
      p.grounded = false;
      p.coyote = 0;
      p.jumpBuffer = 0;
      p.jumpHold = this.tuning.jumpHoldTime;
      p.motion = "jumping";
      this.emit("InputConsumed", p.id, "jump", { variableJump: true });
    }
    const gravityScale = input.jumpHeld && p.jumpHold > 0 && p.vy < 0 ? this.tuning.jumpHoldGravityScale : 1;
    p.jumpHold = input.jumpHeld ? Math.max(0, p.jumpHold - dt) : 0;
    p.vy = Math.min(this.tuning.fallMaxSpeed, p.vy + this.tuning.gravity * gravityScale * dt);
    p.grounded = false;
    const context = this.context();
    sweepEntity(p, p.vx * dt, 0, context);
    const vertical = sweepEntity(p, 0, p.vy * dt, context);
    if (vertical.hitCeiling) this.hitBlock(vertical.hitCeiling.block, vertical.hitCeiling.tx, vertical.hitCeiling.ty);
    if (!p.grounded && p.vy > 0) p.motion = "falling";
    else if (p.grounded && Math.abs(p.vx) > this.tuning.walkMaxSpeed + 0.2) p.motion = "running";
    else if (p.grounded && Math.abs(p.vx) > 0.1 && p.motion !== "skidding") p.motion = "walking";
    else if (p.grounded && Math.abs(p.vx) <= 0.1) p.motion = "standing";
    if (p.y > this.level.areas[this.areaId].bounds.height + 2) this.killPlayer("fall");
  }

  context() {
    this.map = rebuildMapForState(this.level, this.areaId, this);
    return { level: this.level, areaId: this.areaId, map: this.map, revealedHidden: this.revealedHidden };
  }

  hitBlock(block, tx, ty) {
    if (!block || this.usedBlocks.has(block.id) || this.brokenBlocks.has(block.id)) return;
    this.usedBlocks.add(block.id);
    if (block.kind === "hidden") this.revealedHidden.add(block.id);
    this.emit("BlockHit", this.player.id, block.id, { content: block.content, x: tx, y: ty });
    if (block.content === "coin") {
      this.coins += 1;
      this.addScore(100, "blockCoin", block.id);
      this.emit("CoinCollected", block.id, this.player.id, { coins: this.coins });
    } else if (block.content === "growth") {
      const id = `growth-${block.id}`;
      this.entities.push(makePowerup(id, block.x, block.y - 1, this.player.facing));
      this.emit("ItemSpawned", block.id, id, { kind: "growth" });
    } else if (block.kind === "brick" && this.player.form === "powered") {
      this.brokenBlocks.add(block.id);
      this.addScore(50, "brickBreak", block.id);
    }
  }

  updateEntities(dt) {
    const context = this.context();
    for (const entity of this.entities) {
      if (entity.collected || entity.alive === false) continue;
      if (entity.type === "walker" || entity.type === "growth") {
        entity.vy = Math.min(this.tuning.fallMaxSpeed, (entity.vy || 0) + this.tuning.gravity * dt);
        entity.grounded = false;
        const hitX = sweepEntity(entity, entity.vx * dt, 0, context);
        if (hitX.hitX) entity.vx *= -1;
        sweepEntity(entity, 0, entity.vy * dt, context);
        if (entity.y > this.level.areas[this.areaId].bounds.height + 2) entity.alive = false;
      }
    }
  }

  resolveEntityContacts() {
    const pRect = entityRect(this.player);
    for (const entity of this.entities) {
      if (entity.alive === false || entity.collected || entity.type === "coin" || entity.type === "finishPole") continue;
      if (!rectsOverlap(pRect, entityRect(entity))) continue;
      if (entity.type === "growth") {
        entity.alive = false;
        this.player.form = "powered";
        this.player.h = 1.82;
        this.addScore(1000, "growth", entity.id);
        this.emit("PowerupCollected", entity.id, this.player.id, { form: this.player.form });
        continue;
      }
      const stomp = this.player.vy > 0 && this.player.prevY + this.player.h <= entity.y + this.tuning.stompGrace;
      if (stomp) {
        entity.alive = false;
        this.player.vy = this.tuning.bounceVelocity;
        this.addScore(200, "enemyStomp", entity.id);
        this.emit("EnemyStomped", this.player.id, entity.id, { bounceVelocity: this.player.vy });
      } else {
        this.damagePlayer(entity.id);
      }
    }
  }

  checkCollectibles() {
    const pRect = entityRect(this.player);
    for (const entity of this.entities) {
      if (entity.type !== "coin" || entity.collected) continue;
      if (rectsOverlap(pRect, entityRect(entity))) {
        entity.collected = true;
        this.collected.add(entity.id);
        this.coins += 1;
        this.addScore(100, "coin", entity.id);
        this.emit("CoinCollected", entity.id, this.player.id, { coins: this.coins });
      }
    }
  }

  damagePlayer(sourceId) {
    if (this.player.invincible > 0 || this.state !== "playing") return;
    if (this.player.form === "powered") {
      this.player.form = "small";
      this.player.h = 1.45;
      this.player.invincible = 1.2;
      this.emit("PlayerDamaged", sourceId, this.player.id, { result: "shrink" });
      return;
    }
    this.emit("PlayerDamaged", sourceId, this.player.id, { result: "death" });
    this.killPlayer(sourceId);
  }

  killPlayer(sourceId) {
    if (this.state === "dying" || this.state === "cleared") return;
    this.state = "dying";
    this.player.state = "Dying";
    this.player.controlLocked = true;
    this.player.vx = 0;
    this.player.vy = -10;
    this.deathTimer = 1.1;
    this.emit("PlayerDied", sourceId, this.player.id, { area: this.areaId });
  }

  checkPipeTriggers() {
    const pRect = entityRect(this.player);
    for (const trigger of this.level.areas[this.areaId].triggers || []) {
      if ((trigger.type === "pipeEntry" || trigger.type === "pipeExit") && rectsOverlap(pRect, trigger)) {
        this.areaId = trigger.targetArea;
        this.player.x = trigger.targetX;
        this.player.y = trigger.targetY;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.grounded = false;
        this.entities = this.spawnEntities(this.areaId).filter((entity) => !this.collected.has(entity.id));
        this.emit("PipeEntered", this.player.id, trigger.id, { targetArea: this.areaId });
        this.emit("SceneChanged", trigger.id, this.areaId, { transition: "iris" });
        return;
      }
    }
  }

  checkFinish() {
    if (this.state !== "playing") return;
    const pRect = entityRect(this.player);
    const finish = this.level.areas[this.areaId].triggers.find((trigger) => trigger.type === "finish");
    if (finish && rectsOverlap(pRect, finish)) {
      const relative = Math.max(0, Math.min(1, (pRect.y + pRect.h - finish.y) / finish.h));
      const award = Math.round((1 - relative) * 4000 + 1000);
      this.addScore(award, "goal", finish.id);
      this.emit("GoalTouched", this.player.id, finish.id, { award, heightRatio: 1 - relative });
      this.state = "cleared";
      this.player.state = "FlagSlide";
      this.player.controlLocked = true;
      this.player.vx = 0;
      this.player.vy = 2;
      this.finishTimer = 0;
    }
  }

  snapshot() {
    return {
      schemaVersion: this.schemaVersion,
      levelRevision: this.level.revision,
      tuningRevision: this.tuning.revision,
      tick: this.tick,
      area: this.areaId,
      player_x: Number(this.player.x.toFixed(4)),
      player_y: Number(this.player.y.toFixed(4)),
      player_vx: Number(this.player.vx.toFixed(4)),
      player_vy: Number(this.player.vy.toFixed(4)),
      state: this.state,
      playerState: this.player.state,
      motion: this.player.motion,
      form: this.player.form,
      score: this.score,
      coins: this.coins,
      time: Math.ceil(this.remainingTime),
      lives: this.lives,
      won: this.won,
      mode: this.mode,
      events: this.recentEvents.map((event) => event.type)
    };
  }

  sortedEvents() {
    return [...this.events].sort((a, b) => {
      return (EVENT_PRIORITY[a.type] ?? 99) - (EVENT_PRIORITY[b.type] ?? 99)
        || a.sourceId.localeCompare(b.sourceId)
        || a.targetId.localeCompare(b.targetId)
        || a.sequence - b.sequence;
    });
  }

  advanceToVictory() {
    this.areaId = "surface";
    this.entities = this.spawnEntities(this.areaId);
    this.player.x = 203.8;
    this.player.y = 10.5;
    this.player.vx = 0;
    this.player.vy = 0;
    this.step({}, this.tuning.fixedStep);
    for (let i = 0; i < 360 && !this.won; i += 1) this.step({}, this.tuning.fixedStep);
    return this.snapshot();
  }
}

export class GameEngine {
  constructor({ input = null } = {}) {
    this.sim = new GameSimulation();
    this.input = input;
    this.accumulator = 0;
    this.scene = "title";
    this.pausedForFocus = false;
    this.settings = {
      reducedMotion: false,
      highContrast: false,
      captions: true,
      musicVolume: 0.35,
      sfxVolume: 0.65
    };
  }

  start(mode = "formal", anchor = "start") {
    this.sim.lives = 3;
    this.sim.restart(mode, anchor);
    this.scene = "playing";
  }

  pause() {
    if (this.scene === "playing") this.scene = "paused";
  }

  resume() {
    if (this.scene === "paused") this.scene = "playing";
  }

  restart() {
    this.sim.lives = 3;
    this.sim.restart(this.sim.mode);
    this.scene = "playing";
  }

  update(dt, externalInput = null) {
    if (this.scene !== "playing") return [];
    const frameInput = externalInput || this.input?.sample() || {};
    if (frameInput.pausePressed) {
      this.pause();
      return [];
    }
    this.accumulator += Math.min(dt, 0.08);
    let steps = 0;
    const before = this.sim.events.length;
    while (this.accumulator >= this.sim.tuning.fixedStep && steps < this.sim.tuning.maxSubSteps) {
      this.sim.step(frameInput, this.sim.tuning.fixedStep);
      this.accumulator -= this.sim.tuning.fixedStep;
      steps += 1;
    }
    if (steps === this.sim.tuning.maxSubSteps && this.accumulator >= this.sim.tuning.fixedStep) {
      this.accumulator = 0;
      this.sim.performanceEvents.push({ tick: this.sim.tick, type: "simulationOverrun" });
    }
    if (this.sim.state === "cleared" && this.sim.won) this.scene = "complete";
    return this.sim.events.slice(before);
  }

  snapshot() {
    return this.sim.snapshot();
  }

  testInterface() {
    return {
      snapshot: () => this.snapshot(),
      step: (dt = this.sim.tuning.fixedStep) => {
        this.sim.step({}, dt);
        return this.snapshot();
      },
      advanceToVictory: () => this.sim.advanceToVictory(),
      restart: () => {
        this.restart();
        return this.snapshot();
      }
    };
  }
}

export { ASSET_MANIFEST, INPUT_CONFIG, LEVEL_DATA, TUNING };
