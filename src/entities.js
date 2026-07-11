export function makePlayer(spawn) {
  return {
    id: "player-001",
    x: spawn.x,
    y: spawn.y,
    prevX: spawn.x,
    prevY: spawn.y,
    w: 0.78,
    h: 1.45,
    vx: 0,
    vy: 0,
    facing: spawn.facing || 1,
    grounded: false,
    coyote: 0,
    jumpBuffer: 0,
    jumpHold: 0,
    invincible: 0,
    form: "small",
    motion: "standing",
    state: "Ready",
    alive: true,
    controlLocked: false
  };
}

export function makeEntity(definition) {
  if (definition.type === "walker") {
    return {
      ...definition,
      w: 0.82,
      h: 0.82,
      vx: (definition.direction || -1) * 1.25,
      vy: 0,
      alive: true,
      grounded: false
    };
  }
  if (definition.type === "coin") {
    return { ...definition, w: 0.52, h: 0.52, collected: false };
  }
  if (definition.type === "finishPole") {
    return { ...definition, w: 0.28, h: definition.h || 8 };
  }
  return { ...definition, w: definition.w || 1, h: definition.h || 1 };
}

export function makePowerup(id, x, y, direction = 1) {
  return {
    id,
    type: "growth",
    x,
    y,
    w: 0.78,
    h: 0.78,
    vx: direction * 1.8,
    vy: -3,
    alive: true,
    grounded: false,
    referenceId: "REF-SELF-001",
    screenRange: "runtime"
  };
}

export function entityRect(entity) {
  return { x: entity.x, y: entity.y, w: entity.w, h: entity.h };
}
