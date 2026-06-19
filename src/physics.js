import { TILE_SIZE, TILE_TYPES, getTile, isHazardTile, isSolidTile } from "./tilemap.js";

export const DEFAULT_WORLD_PHYSICS = Object.freeze({
  gravity: 1750,
  maxFallSpeed: 900,
  maxRiseSpeed: 800,
  sweepStepRatio: 0.5,
  groundProbeDistance: 1,
});

export const DEFAULT_PLAYER_PHYSICS = Object.freeze({
  groundAcceleration: 1850,
  airAcceleration: 1150,
  groundFriction: 1450,
  airFriction: 420,
  maxWalkSpeed: 205,
  jumpImpulse: -585,
  jumpHoldSeconds: 0.16,
  jumpHoldAcceleration: -980,
});

export const COLLISION_SIDES = Object.freeze({
  LEFT: "left",
  RIGHT: "right",
  TOP: "top",
  BOTTOM: "bottom",
});

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function approach(value, target, amount) {
  if (value < target) {
    return Math.min(target, value + amount);
  }

  return Math.max(target, value - amount);
}

export function makeRect(x, y, width, height) {
  return { x, y, width, height };
}

export function rectsOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function getAabb(entity) {
  return makeRect(entity.x, entity.y, entity.width, entity.height);
}

export function getAabbIntersection(a, b) {
  if (!rectsOverlap(a, b)) {
    return makeRect(0, 0, 0, 0);
  }

  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  return makeRect(x, y, Math.min(a.x + a.width, b.x + b.width) - x, Math.min(a.y + a.height, b.y + b.height) - y);
}

export function getAabbPenetration(a, b) {
  if (!rectsOverlap(a, b)) {
    return { x: 0, y: 0 };
  }

  const aCenterX = a.x + a.width * 0.5;
  const bCenterX = b.x + b.width * 0.5;
  const aCenterY = a.y + a.height * 0.5;
  const bCenterY = b.y + b.height * 0.5;
  const overlapX = a.width * 0.5 + b.width * 0.5 - Math.abs(aCenterX - bCenterX);
  const overlapY = a.height * 0.5 + b.height * 0.5 - Math.abs(aCenterY - bCenterY);

  return {
    x: aCenterX < bCenterX ? -overlapX : overlapX,
    y: aCenterY < bCenterY ? -overlapY : overlapY,
  };
}

export function createCollisionResult() {
  return {
    left: false,
    right: false,
    top: false,
    bottom: false,
    grounded: false,
    tiles: [],
    hazards: [],
  };
}

function finiteOr(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function normalizeStep(dt) {
  return Number.isFinite(dt) && dt > 0 ? dt : 0;
}

function mergePlayerPhysics(options = {}) {
  return { ...DEFAULT_PLAYER_PHYSICS, ...options };
}

function getControlState(input) {
  const left = Boolean(input?.left ?? input?.isPressed?.("left"));
  const right = Boolean(input?.right ?? input?.isPressed?.("right"));
  const axis = Number.isFinite(input?.axis) ? clamp(input.axis, -1, 1) : (right ? 1 : 0) - (left ? 1 : 0);
  const jumpHeld = Boolean(input?.jumpHeld ?? input?.jump ?? input?.isPressed?.("jump"));
  const jumpPressed = Boolean(
    input?.jumpPressed ?? input?.jumpRequested ?? input?.jumpBuffered ?? input?.consumeJumpBuffer?.(),
  );

  return { axis, jumpHeld, jumpPressed };
}

function addUniqueTileHit(list, hit) {
  if (list.some((item) => item.tileX === hit.tileX && item.tileY === hit.tileY && item.side === hit.side)) {
    return false;
  }

  list.push(hit);
  return true;
}

export class PhysicsSystem {
  constructor(level, options = {}) {
    this.options = { ...DEFAULT_WORLD_PHYSICS, ...options };
    this.setLevel(level);
  }

  setLevel(level) {
    this.level = level;
    this.tileSize = level?.tileSize ?? TILE_SIZE;
    this.gravity = level?.gravity ?? this.options.gravity;
    this.maxFallSpeed = level?.maxFallSpeed ?? this.options.maxFallSpeed;
    this.maxRiseSpeed = this.options.maxRiseSpeed;
    this.sweepStepRatio = this.options.sweepStepRatio;
    this.groundProbeDistance = this.options.groundProbeDistance;
  }

  applyGravity(entity, dt) {
    const step = normalizeStep(dt);
    entity.vy = clamp(finiteOr(entity.vy) + this.gravity * step, -this.maxRiseSpeed, this.maxFallSpeed);
    return entity.vy;
  }

  applyHorizontalControl(entity, inputAxis, dt, options = {}) {
    const step = normalizeStep(dt);
    const settings = mergePlayerPhysics(options);
    const axis = clamp(finiteOr(inputAxis), -1, 1);
    const acceleration = entity.grounded ? settings.groundAcceleration : settings.airAcceleration;
    const friction = entity.grounded ? settings.groundFriction : settings.airFriction;

    if (axis === 0) {
      entity.vx = approach(finiteOr(entity.vx), 0, friction * step);
    } else {
      entity.vx = clamp(
        finiteOr(entity.vx) + axis * acceleration * step,
        -settings.maxWalkSpeed,
        settings.maxWalkSpeed,
      );
      entity.facing = axis < 0 ? -1 : 1;
    }

    return entity.vx;
  }

  beginJump(entity, options = {}) {
    const settings = mergePlayerPhysics(options);
    if (!entity.grounded) {
      return false;
    }

    entity.vy = settings.jumpImpulse;
    entity.grounded = false;
    entity.jumpHold = settings.jumpHoldSeconds;
    return true;
  }

  sustainJump(entity, jumpHeld, dt, options = {}) {
    const step = normalizeStep(dt);
    const settings = mergePlayerPhysics(options);

    if (jumpHeld && finiteOr(entity.jumpHold) > 0 && finiteOr(entity.vy) < 0) {
      entity.vy = clamp(
        finiteOr(entity.vy) + settings.jumpHoldAcceleration * step,
        -this.maxRiseSpeed,
        this.maxFallSpeed,
      );
      entity.jumpHold = Math.max(0, finiteOr(entity.jumpHold) - step);
      return true;
    }

    entity.jumpHold = 0;
    return false;
  }

  updatePlayer(entity, input, dt, hooks = {}, options = {}) {
    const step = normalizeStep(dt);
    const controls = getControlState(input);

    this.applyHorizontalControl(entity, controls.axis, step, options);
    if (controls.jumpPressed) {
      this.beginJump(entity, options);
    }
    this.sustainJump(entity, controls.jumpHeld, step, options);
    this.applyGravity(entity, step);

    return this.moveWithTiles(entity, finiteOr(entity.vx) * step, finiteOr(entity.vy) * step, hooks);
  }

  applyVelocity(entity, dt, hooks = {}) {
    const step = normalizeStep(dt);
    this.applyGravity(entity, step);
    return this.moveWithTiles(entity, finiteOr(entity.vx) * step, finiteOr(entity.vy) * step, hooks);
  }

  moveWithTiles(entity, dx, dy, hooks = {}) {
    const result = createCollisionResult();
    const safeDx = finiteOr(dx);
    const safeDy = finiteOr(dy);
    const steps = this.getSweepStepCount(entity, safeDx, safeDy);
    const stepX = safeDx / steps;
    const stepY = safeDy / steps;
    let blockedX = false;
    let blockedY = false;

    entity.grounded = false;

    for (let step = 0; step < steps; step += 1) {
      if (!blockedX && stepX !== 0) {
        const beforeLeft = result.left;
        const beforeRight = result.right;
        this.moveAxis(entity, "x", stepX, hooks, result);
        blockedX = result.left !== beforeLeft || result.right !== beforeRight;
      }

      if (!blockedY && stepY !== 0) {
        const beforeTop = result.top;
        const beforeBottom = result.bottom;
        this.moveAxis(entity, "y", stepY, hooks, result);
        blockedY = result.top !== beforeTop || result.bottom !== beforeBottom;
      }
    }

    if (!result.bottom && this.isEntityGrounded(entity)) {
      entity.grounded = true;
      result.bottom = true;
    }

    result.grounded = Boolean(entity.grounded);
    return result;
  }

  getSweepStepCount(entity, dx, dy) {
    const width = Math.max(1, finiteOr(entity.width, this.tileSize));
    const height = Math.max(1, finiteOr(entity.height, this.tileSize));
    const maxStep = Math.max(1, Math.min(this.tileSize, width, height) * this.sweepStepRatio);
    return Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / maxStep));
  }

  moveAxis(entity, axis, amount, hooks, result) {
    entity[axis] += amount;
    return this.resolveTileAxis(entity, axis, amount, hooks, result);
  }

  resolveTileAxis(entity, axis, amount, hooks = {}, result = createCollisionResult()) {
    const bounds = this.getOverlappingTileBounds(entity);

    for (let tileY = bounds.top; tileY <= bounds.bottom; tileY += 1) {
      for (let tileX = bounds.left; tileX <= bounds.right; tileX += 1) {
        const tile = getTile(this.level, tileX, tileY);
        const solid = isSolidTile(tile);
        const hazard = isHazardTile(tile);

        if (!solid && !hazard) {
          continue;
        }

        const tileRect = makeRect(tileX * this.tileSize, tileY * this.tileSize, this.tileSize, this.tileSize);
        if (!rectsOverlap(entity, tileRect)) {
          continue;
        }

        if (hazard) {
          const hazardHit = { tile, tileX, tileY, rect: tileRect };
          if (!result.hazards.some((hit) => hit.tileX === tileX && hit.tileY === tileY)) {
            result.hazards.push(hazardHit);
            hooks.onHazard?.(entity, tile, tileRect, hazardHit);
          }

          if (!solid) {
            continue;
          }
        }

        let side;
        if (axis === "x") {
          if (amount > 0) {
            entity.x = tileRect.x - entity.width;
            result.right = true;
            side = COLLISION_SIDES.RIGHT;
          } else {
            entity.x = tileRect.x + tileRect.width;
            result.left = true;
            side = COLLISION_SIDES.LEFT;
          }

          entity.vx = 0;
        } else {
          if (amount > 0) {
            entity.y = tileRect.y - entity.height;
            entity.grounded = true;
            result.bottom = true;
            side = COLLISION_SIDES.BOTTOM;
          } else {
            entity.y = tileRect.y + tileRect.height;
            result.top = true;
            side = COLLISION_SIDES.TOP;
          }

          entity.vy = 0;
        }

        const collisionHit = { tile, tileX, tileY, rect: tileRect, axis, side };
        addUniqueTileHit(result.tiles, collisionHit);
        hooks.onTileCollision?.(entity, tile, tileRect, axis, collisionHit);
      }
    }

    result.grounded = Boolean(entity.grounded);
    return result;
  }

  getOverlappingTileBounds(entity, margin = 0) {
    return {
      left: Math.floor((entity.x - margin) / this.tileSize),
      right: Math.floor((entity.x + entity.width + margin - 1) / this.tileSize),
      top: Math.floor((entity.y - margin) / this.tileSize),
      bottom: Math.floor((entity.y + entity.height + margin - 1) / this.tileSize),
    };
  }

  isEntityGrounded(entity, distance = this.groundProbeDistance) {
    const probe = makeRect(entity.x, entity.y + distance, entity.width, entity.height);
    const bounds = this.getOverlappingTileBounds(probe);

    for (let tileY = bounds.top; tileY <= bounds.bottom; tileY += 1) {
      for (let tileX = bounds.left; tileX <= bounds.right; tileX += 1) {
        const tile = getTile(this.level, tileX, tileY);
        if (!isSolidTile(tile)) {
          continue;
        }

        if (rectsOverlap(probe, makeRect(tileX * this.tileSize, tileY * this.tileSize, this.tileSize, this.tileSize))) {
          return true;
        }
      }
    }

    return false;
  }

  tileAtPixel(x, y) {
    if (!this.level) {
      return TILE_TYPES.EMPTY;
    }

    return getTile(this.level, Math.floor(x / this.tileSize), Math.floor(y / this.tileSize));
  }

  isSolidAtPixel(x, y) {
    return isSolidTile(this.tileAtPixel(x, y));
  }

  isHazardAtPixel(x, y) {
    return isHazardTile(this.tileAtPixel(x, y));
  }
}
