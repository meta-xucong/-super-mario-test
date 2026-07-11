import { TILE_EMPTY, buildCollisionMap, getBlockAt } from "./tilemap.js";

const EPS = 0.0001;

export function isSolidAt(map, x, y) {
  const cell = map.get(`${Math.floor(x)},${Math.floor(y)}`);
  return Boolean(cell && cell.value !== TILE_EMPTY);
}

export function solidCellAt(map, tx, ty) {
  return map.get(`${tx},${ty}`) || null;
}

export function sweepEntity(entity, dx, dy, context) {
  entity.prevX = entity.x;
  entity.prevY = entity.y;
  const result = { hitX: false, hitY: false, hitCeiling: null, landed: false };
  if (dx !== 0) {
    entity.x += dx;
    const direction = Math.sign(dx);
    const edge = direction > 0 ? entity.x + entity.w : entity.x;
    const fromY = Math.floor(entity.y + EPS);
    const toY = Math.floor(entity.y + entity.h - EPS);
    for (let ty = fromY; ty <= toY; ty += 1) {
      const tx = Math.floor(edge + (direction > 0 ? -EPS : EPS));
      if (isSolidAt(context.map, tx, ty)) {
        entity.x = direction > 0 ? tx - entity.w - EPS : tx + 1 + EPS;
        entity.vx = 0;
        result.hitX = true;
        break;
      }
    }
  }
  if (dy !== 0) {
    entity.y += dy;
    const direction = Math.sign(dy);
    const edge = direction > 0 ? entity.y + entity.h : entity.y;
    const fromX = Math.floor(entity.x + EPS);
    const toX = Math.floor(entity.x + entity.w - EPS);
    for (let tx = fromX; tx <= toX; tx += 1) {
      const ty = Math.floor(edge + (direction > 0 ? -EPS : EPS));
      const cell = solidCellAt(context.map, tx, ty);
      const hidden = direction < 0 ? getBlockAt(context.level, context.areaId, tx, ty) : null;
      if (cell || (hidden && hidden.kind === "hidden" && !context.revealedHidden.has(hidden.id))) {
        entity.y = direction > 0 ? ty - entity.h - EPS : ty + 1 + EPS;
        entity.vy = 0;
        result.hitY = true;
        if (direction > 0) {
          result.landed = true;
          entity.grounded = true;
        } else {
          result.hitCeiling = { tx, ty, block: hidden || getBlockAt(context.level, context.areaId, tx, ty) };
        }
        break;
      }
    }
  }
  return result;
}

export function rebuildMapForState(level, areaId, state) {
  return buildCollisionMap(level, areaId, state.revealedHidden, state.brokenBlocks);
}
