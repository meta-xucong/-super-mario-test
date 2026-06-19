import { LEVEL1_DESIGN, TILE_SIZE, getTile, isSolidTile } from "./tilemap.js";
import { approach, clamp, makeRect, rectsOverlap } from "./physics.js";

export const PLAYER_WIDTH = LEVEL1_DESIGN.player.size.width;
export const PLAYER_HEIGHT = LEVEL1_DESIGN.player.size.height;

export const ENTITY_KINDS = Object.freeze({
  PLAYER: "player",
  ENEMY: "enemy",
  COIN: "coin",
  FLAG: "flag",
});

export const GAME_STATES = Object.freeze({
  READY: "ready",
  PLAYING: "playing",
  WON: "won",
  LOST: "lost",
});

export const SCORE_VALUES = Object.freeze({
  COIN: 100,
  ENEMY_STOMP: 250,
  FLAG_BASE_BONUS: 5000,
});

export const PLAYER_BEHAVIOR = Object.freeze({
  kind: ENTITY_KINDS.PLAYER,
  width: PLAYER_WIDTH,
  height: PLAYER_HEIGHT,
  groundAcceleration: 1850,
  airAcceleration: 1150,
  groundFriction: 1450,
  airFriction: 420,
  maxWalkSpeed: 205,
  jumpImpulse: -585,
  jumpHoldSeconds: 0.16,
  jumpHoldAcceleration: -980,
  respawnInvulnerableSeconds: 1.4,
  hazardRespawnMessageSeconds: 1.2,
});

export const COIN_BEHAVIOR = Object.freeze({
  kind: ENTITY_KINDS.COIN,
  triggerWidth: 16,
  triggerHeight: 16,
  scoreValue: SCORE_VALUES.COIN,
  messageSeconds: 0.7,
});

export const ENEMY_AI_TYPES = Object.freeze({
  BASIC_WALKER: "basic-walker",
});

export const BASIC_WALKING_ENEMY_AI = Object.freeze({
  kind: ENTITY_KINDS.ENEMY,
  type: ENEMY_AI_TYPES.BASIC_WALKER,
  defaultSpeed: 44,
  edgeProbeDistance: 2,
  wallProbeHeightRatio: 0.5,
  stompMinFallSpeed: 80,
  stompTopInset: 6,
  stompWindow: 14,
  stompBounce: -360,
  scoreValue: SCORE_VALUES.ENEMY_STOMP,
  turnsOnWall: true,
  turnsAtLedge: true,
});

export const ENEMY_BEHAVIOR = BASIC_WALKING_ENEMY_AI;

export const FLAG_BEHAVIOR = Object.freeze({
  kind: ENTITY_KINDS.FLAG,
  triggerWidth: 36,
  triggerInsetX: -8,
  defaultHeight: TILE_SIZE * 4,
  completionBonusBase: SCORE_VALUES.FLAG_BASE_BONUS,
  completionBonusDecayPerSecond: 35,
  touchWins: true,
});

export const ENTITY_BEHAVIORS = Object.freeze({
  player: PLAYER_BEHAVIOR,
  coin: COIN_BEHAVIOR,
  enemy: ENEMY_BEHAVIOR,
  flag: FLAG_BEHAVIOR,
});

function normalizeDirection(direction, fallback = -1) {
  if (direction < 0) {
    return -1;
  }

  if (direction > 0) {
    return 1;
  }

  return fallback < 0 ? -1 : 1;
}

export function createPlayer(level) {
  return {
    kind: ENTITY_KINDS.PLAYER,
    behavior: PLAYER_BEHAVIOR.kind,
    x: level.playerStart.x,
    y: level.playerStart.y,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    vx: 0,
    vy: 0,
    facing: 1,
    grounded: false,
    invulnerable: 0,
    jumpHold: 0,
  };
}

export function createCoin(rawCoin) {
  return {
    kind: ENTITY_KINDS.COIN,
    behavior: COIN_BEHAVIOR.kind,
    id: rawCoin.id,
    x: rawCoin.x,
    y: rawCoin.y,
    width: COIN_BEHAVIOR.triggerWidth,
    height: COIN_BEHAVIOR.triggerHeight,
    scoreValue: COIN_BEHAVIOR.scoreValue,
    collected: Boolean(rawCoin.collected),
  };
}

export function createEnemy(rawEnemy) {
  const direction = normalizeDirection(rawEnemy.direction, -1);
  const speed = rawEnemy.speed || BASIC_WALKING_ENEMY_AI.defaultSpeed;

  return {
    kind: ENTITY_KINDS.ENEMY,
    id: rawEnemy.id,
    type: rawEnemy.type,
    ai: rawEnemy.ai || ENEMY_AI_TYPES.BASIC_WALKER,
    behavior: ENEMY_BEHAVIOR.type,
    x: rawEnemy.x,
    y: rawEnemy.y,
    width: rawEnemy.width,
    height: rawEnemy.height,
    direction,
    speed,
    vx: direction * speed,
    vy: rawEnemy.vy || 0,
    grounded: false,
    stompable: true,
    scoreValue: ENEMY_BEHAVIOR.scoreValue,
    defeated: Boolean(rawEnemy.defeated),
  };
}

export function createFlag(rawGoal) {
  return {
    kind: ENTITY_KINDS.FLAG,
    behavior: FLAG_BEHAVIOR.kind,
    id: rawGoal.id || "level-goal-flag",
    x: rawGoal.x,
    y: rawGoal.y,
    width: rawGoal.width || FLAG_BEHAVIOR.triggerWidth,
    height: rawGoal.height || FLAG_BEHAVIOR.defaultHeight,
    triggered: Boolean(rawGoal.triggered),
  };
}

export const createGoal = createFlag;

export function createRuntimeEntities(level) {
  return {
    player: createPlayer(level),
    coins: level.coins.map(createCoin),
    enemies: level.enemies.map(createEnemy),
    flag: createFlag(level.goal),
  };
}

export function createGameState(level) {
  return {
    ...createRuntimeEntities(level),
    cameraX: 0,
    elapsed: 0,
    score: 0,
    lives: 3,
    state: GAME_STATES.READY,
    messageTimer: 0,
  };
}

export function coinRect(coin) {
  const width = coin.width || COIN_BEHAVIOR.triggerWidth;
  const height = coin.height || COIN_BEHAVIOR.triggerHeight;
  return makeRect(coin.x - width * 0.5, coin.y - height * 0.5, width, height);
}

export function flagRect(flag) {
  return makeRect(
    flag.x + FLAG_BEHAVIOR.triggerInsetX,
    flag.y,
    flag.width || FLAG_BEHAVIOR.triggerWidth,
    flag.height || FLAG_BEHAVIOR.defaultHeight,
  );
}

export function goalRect(goal) {
  return flagRect(goal);
}

export function activeEnemies(enemies) {
  return enemies.filter((enemy) => !enemy.defeated);
}

export function collectedCoinCount(coins) {
  return coins.filter((coin) => coin.collected).length;
}

export function canCollectCoin(player, coin) {
  return !coin.collected && rectsOverlap(player, coinRect(coin));
}

export function resolveCoinCollection(player, coin, state) {
  if (!canCollectCoin(player, coin)) {
    return { collected: false, scoreDelta: 0 };
  }

  coin.collected = true;

  const scoreDelta = coin.scoreValue ?? COIN_BEHAVIOR.scoreValue;
  if (state) {
    state.score = (state.score || 0) + scoreDelta;
    state.messageTimer = COIN_BEHAVIOR.messageSeconds;
  }

  return { collected: true, scoreDelta };
}

export function collectCoin(player, coin, state) {
  return resolveCoinCollection(player, coin, state);
}

export function collectCoinsForPlayer(player, coins, state) {
  return coins.reduce((total, coin) => total + resolveCoinCollection(player, coin, state).scoreDelta, 0);
}

export function isFlagTriggered(player, flag) {
  return FLAG_BEHAVIOR.touchWins && rectsOverlap(player, flagRect(flag));
}

export function isGoalTriggered(player, goal) {
  return isFlagTriggered(player, goal);
}

export function isVictoryTriggered(player, goal) {
  return isGoalTriggered(player, goal);
}

export function getVictoryBonus(elapsed = 0) {
  const safeElapsed = Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
  return Math.max(
    0,
    Math.round(FLAG_BEHAVIOR.completionBonusBase - safeElapsed * FLAG_BEHAVIOR.completionBonusDecayPerSecond),
  );
}

export function resolveFlagVictory(state, flag, elapsed = state?.elapsed || 0) {
  if (!state?.player || !flag || state.state === GAME_STATES.WON || !isFlagTriggered(state.player, flag)) {
    return { won: false, scoreDelta: 0 };
  }

  const scoreDelta = getVictoryBonus(elapsed);
  state.state = GAME_STATES.WON;
  state.score = (state.score || 0) + scoreDelta;
  if ("triggered" in flag) {
    flag.triggered = true;
  }

  return { won: true, scoreDelta };
}

export function checkFlagVictory(state, flag, elapsed) {
  return resolveFlagVictory(state, flag, elapsed);
}

export function checkGoalVictory(state, goal, elapsed) {
  return resolveFlagVictory(state, goal, elapsed);
}

export function checkVictory(state, goal, elapsed) {
  return resolveFlagVictory(state, goal, elapsed);
}

export function checkGoal(player, goal) {
  return isGoalTriggered(player, goal);
}

export function isEnemyStomp(player, enemy) {
  if (enemy.defeated || enemy.stompable === false || !rectsOverlap(player, enemy)) {
    return false;
  }

  const playerBottom = player.y + player.height;
  const enemyTop = enemy.y + ENEMY_BEHAVIOR.stompTopInset;
  return player.vy > ENEMY_BEHAVIOR.stompMinFallSpeed && playerBottom <= enemyTop + ENEMY_BEHAVIOR.stompWindow;
}

export function resolvePlayerEnemyCollision(player, enemy) {
  if (enemy.defeated || !rectsOverlap(player, enemy)) {
    return { type: "none", scoreDelta: 0 };
  }

  if (isEnemyStomp(player, enemy)) {
    enemy.defeated = true;
    player.vy = ENEMY_BEHAVIOR.stompBounce;
    return { type: "stomp", scoreDelta: enemy.scoreValue ?? ENEMY_BEHAVIOR.scoreValue };
  }

  return { type: "damage", scoreDelta: 0 };
}

export function resolveEnemyCollision(player, enemy) {
  return resolvePlayerEnemyCollision(player, enemy);
}

export function turnWalkingEnemy(enemy) {
  enemy.direction = normalizeDirection(-enemy.direction, 1);
  enemy.speed = enemy.speed || ENEMY_BEHAVIOR.defaultSpeed;
  enemy.vx = enemy.direction * enemy.speed;
  return enemy;
}

export function getWalkingEnemyTurnSignal(enemy, level) {
  if (!level) {
    return {
      shouldTurn: false,
      wallAhead: false,
      ledgeAhead: false,
      wallTile: undefined,
      floorTile: undefined,
      forwardX: enemy.x,
      floorProbeY: enemy.y + enemy.height,
    };
  }

  const tileSize = level?.tileSize || TILE_SIZE;
  const direction = normalizeDirection(enemy.direction || enemy.vx, -1);
  const forwardX =
    direction < 0
      ? enemy.x - ENEMY_BEHAVIOR.edgeProbeDistance
      : enemy.x + enemy.width + ENEMY_BEHAVIOR.edgeProbeDistance;
  const wallProbeY = enemy.y + enemy.height * ENEMY_BEHAVIOR.wallProbeHeightRatio;
  const floorProbeY = enemy.y + enemy.height + ENEMY_BEHAVIOR.edgeProbeDistance;
  const wallTile = getTile(level, Math.floor(forwardX / tileSize), Math.floor(wallProbeY / tileSize));
  const floorTile = getTile(level, Math.floor(forwardX / tileSize), Math.floor(floorProbeY / tileSize));
  const wallAhead = ENEMY_BEHAVIOR.turnsOnWall && isSolidTile(wallTile);
  const ledgeAhead = ENEMY_BEHAVIOR.turnsAtLedge && !isSolidTile(floorTile);

  return {
    shouldTurn: enemy.vx === 0 || wallAhead || ledgeAhead,
    wallAhead,
    ledgeAhead,
    wallTile,
    floorTile,
    forwardX,
    floorProbeY,
  };
}

export function updateBasicWalkingEnemy(enemy, level, physics, dt) {
  if (enemy.defeated) {
    return enemy;
  }

  const step = Number.isFinite(dt) && dt > 0 ? dt : 0;
  enemy.direction = normalizeDirection(enemy.direction || enemy.vx, -1);
  enemy.speed = enemy.speed || ENEMY_BEHAVIOR.defaultSpeed;
  enemy.vx = enemy.direction * enemy.speed;

  if (physics?.applyGravity && physics?.moveWithTiles) {
    physics.applyGravity(enemy, step);
    physics.moveWithTiles(enemy, enemy.vx * step, enemy.vy * step);
  } else {
    const gravity = level?.gravity ?? 1750;
    const maxFallSpeed = level?.maxFallSpeed ?? 900;
    enemy.vy = clamp((enemy.vy || 0) + gravity * step, -800, maxFallSpeed);
    enemy.x += enemy.vx * step;
    enemy.y += enemy.vy * step;
  }

  if (getWalkingEnemyTurnSignal(enemy, level).shouldTurn) {
    turnWalkingEnemy(enemy);
  }

  return enemy;
}

export function updateEnemyAI(enemy, level, physics, dt) {
  if ((enemy.ai || ENEMY_AI_TYPES.BASIC_WALKER) === ENEMY_AI_TYPES.BASIC_WALKER) {
    return updateBasicWalkingEnemy(enemy, level, physics, dt);
  }

  return enemy;
}

export function updateEnemiesAI(enemies, level, physics, dt) {
  for (const enemy of enemies) {
    updateEnemyAI(enemy, level, physics, dt);
  }

  return enemies;
}

export function updatePlayerBehavior(player, input, physics, level, dt, hooks = {}) {
  const step = Number.isFinite(dt) && dt > 0 ? dt : 0;
  const left = Boolean(input?.isPressed?.("left") ?? input?.left);
  const right = Boolean(input?.isPressed?.("right") ?? input?.right);
  const jump = Boolean(input?.isPressed?.("jump") ?? input?.jump);
  const jumpRequested = Boolean(input?.consumeJumpBuffer?.() ?? input?.jumpPressed ?? input?.jumpBuffered);
  const acceleration = player.grounded ? PLAYER_BEHAVIOR.groundAcceleration : PLAYER_BEHAVIOR.airAcceleration;
  const friction = player.grounded ? PLAYER_BEHAVIOR.groundFriction : PLAYER_BEHAVIOR.airFriction;

  if (left === right) {
    player.vx = approach(player.vx, 0, friction * step);
  } else if (left) {
    player.vx = clamp(player.vx - acceleration * step, -PLAYER_BEHAVIOR.maxWalkSpeed, PLAYER_BEHAVIOR.maxWalkSpeed);
    player.facing = -1;
  } else if (right) {
    player.vx = clamp(player.vx + acceleration * step, -PLAYER_BEHAVIOR.maxWalkSpeed, PLAYER_BEHAVIOR.maxWalkSpeed);
    player.facing = 1;
  }

  if (jumpRequested && player.grounded) {
    player.vy = PLAYER_BEHAVIOR.jumpImpulse;
    player.grounded = false;
    player.jumpHold = PLAYER_BEHAVIOR.jumpHoldSeconds;
  }

  if (jump && player.jumpHold > 0 && player.vy < 0) {
    player.vy += PLAYER_BEHAVIOR.jumpHoldAcceleration * step;
    player.jumpHold -= step;
  } else {
    player.jumpHold = 0;
  }

  if (physics?.applyGravity && physics?.moveWithTiles) {
    physics.applyGravity(player, step);
    physics.moveWithTiles(player, player.vx * step, player.vy * step, hooks);
  }

  if (level?.pixelWidth) {
    player.x = clamp(player.x, 0, level.pixelWidth - player.width);
  }

  return player;
}
