export const TILE_EMPTY = 0;
export const TILE_SOLID = 1;
export const TILE_REWARD = 2;
export const TILE_HAZARD = 3;

export const LEVEL_DATA = {
  schemaVersion: "sunrise-run-level-schema@1",
  revision: "layout-r1",
  tuningRevision: "tuning-r1",
  inputRevision: "input-r1",
  assetRevision: "asset-r1",
  id: "sunrise-ridge-1",
  title: "First Ridge",
  tileSize: 16,
  bounds: { width: 230, height: 16 },
  spawn: { area: "surface", x: 3, y: 11.4, facing: 1, referenceId: "REF-SELF-001", screenRange: "S00" },
  finish: { entityId: "finish-pole-001", referenceId: "REF-PLAY-001", screenRange: "S10" },
  freeze: {
    packageId: "freeze-layout-r1",
    layoutJson: "embedded:src/tilemap.js#LEVEL_DATA",
    entityList: "embedded:src/tilemap.js#entities",
    triggerList: "embedded:src/tilemap.js#triggers",
    collisionMap: "generated:buildCollisionMap",
    diffBaselineHash: "layout-r1-no-diff",
    signoff: {
      recorder: "Alchemy frontend worker",
      reviewer: "QA reviewer pending",
      date: "2026-07-11"
    }
  },
  areas: {
    surface: {
      id: "surface",
      bounds: { width: 230, height: 16 },
      ground: [
        { id: "ground-001", x: 0, y: 13, w: 68, h: 3, referenceId: "REF-PLAY-001", screenRange: "S00-S03" },
        { id: "ground-002", x: 71, y: 13, w: 18, h: 3, referenceId: "REF-PLAY-001", screenRange: "S03-S04" },
        { id: "ground-003", x: 92, y: 13, w: 63, h: 3, referenceId: "REF-PLAY-001", screenRange: "S04-S07" },
        { id: "ground-004", x: 159, y: 13, w: 71, h: 3, referenceId: "REF-PLAY-001", screenRange: "S08-S10" }
      ],
      structures: [
        { id: "pipe-entry-001", type: "pipe", x: 56, y: 11, w: 2, h: 2, referenceId: "REF-PLAY-002", screenRange: "S02" },
        { id: "pipe-exit-001", type: "pipe", x: 104, y: 11, w: 2, h: 2, referenceId: "REF-PLAY-002", screenRange: "S05" },
        { id: "step-001", type: "step", x: 171, y: 12, w: 1, h: 1, referenceId: "REF-PLAY-001", screenRange: "S08" },
        { id: "step-002", type: "step", x: 172, y: 11, w: 1, h: 2, referenceId: "REF-PLAY-001", screenRange: "S08" },
        { id: "step-003", type: "step", x: 173, y: 10, w: 1, h: 3, referenceId: "REF-PLAY-001", screenRange: "S08" },
        { id: "step-004", type: "step", x: 174, y: 9, w: 1, h: 4, referenceId: "REF-PLAY-001", screenRange: "S08" },
        { id: "step-005", type: "step", x: 181, y: 9, w: 1, h: 4, referenceId: "REF-PLAY-001", screenRange: "S09" },
        { id: "step-006", type: "step", x: 182, y: 10, w: 1, h: 3, referenceId: "REF-PLAY-001", screenRange: "S09" },
        { id: "step-007", type: "step", x: 183, y: 11, w: 1, h: 2, referenceId: "REF-PLAY-001", screenRange: "S09" },
        { id: "step-008", type: "step", x: 184, y: 12, w: 1, h: 1, referenceId: "REF-PLAY-001", screenRange: "S09" },
        { id: "castle-001", type: "castle", x: 215, y: 9, w: 9, h: 4, referenceId: "REF-PLAY-001", screenRange: "S10" }
      ],
      blocks: [
        { id: "block-brick-001", kind: "brick", content: "empty", x: 16, y: 9, referenceId: "REF-PLAY-001", screenRange: "S01" },
        { id: "block-reward-001", kind: "question", content: "coin", x: 17, y: 9, referenceId: "REF-PLAY-001", screenRange: "S01" },
        { id: "block-brick-002", kind: "brick", content: "empty", x: 18, y: 9, referenceId: "REF-PLAY-001", screenRange: "S01" },
        { id: "block-reward-002", kind: "question", content: "growth", x: 21, y: 9, referenceId: "REF-PLAY-001", screenRange: "S01" },
        { id: "block-brick-003", kind: "brick", content: "empty", x: 22, y: 9, referenceId: "REF-PLAY-001", screenRange: "S01" },
        { id: "block-brick-004", kind: "brick", content: "coin", x: 23, y: 9, referenceId: "REF-PLAY-001", screenRange: "S01" },
        { id: "block-hidden-001", kind: "hidden", content: "coin", x: 64, y: 8, referenceId: "REF-PLAY-001", screenRange: "S03" },
        { id: "block-bridge-001", kind: "brick", content: "empty", x: 78, y: 8, referenceId: "REF-PLAY-001", screenRange: "S04" },
        { id: "block-bridge-002", kind: "question", content: "coin", x: 79, y: 8, referenceId: "REF-PLAY-001", screenRange: "S04" },
        { id: "block-bridge-003", kind: "brick", content: "empty", x: 80, y: 8, referenceId: "REF-PLAY-001", screenRange: "S04" },
        { id: "block-bridge-004", kind: "question", content: "coin", x: 81, y: 8, referenceId: "REF-PLAY-001", screenRange: "S04" },
        { id: "block-bridge-005", kind: "brick", content: "empty", x: 82, y: 8, referenceId: "REF-PLAY-001", screenRange: "S04" }
      ],
      entities: [
        { id: "walker-001", type: "walker", x: 20, y: 12, direction: -1, referenceId: "REF-PLAY-001", screenRange: "S01" },
        { id: "walker-002", type: "walker", x: 74, y: 12, direction: -1, referenceId: "REF-PLAY-001", screenRange: "S04" },
        { id: "walker-003", type: "walker", x: 116, y: 12, direction: -1, referenceId: "REF-PLAY-001", screenRange: "S06" },
        { id: "walker-004", type: "walker", x: 133, y: 12, direction: -1, referenceId: "REF-PLAY-001", screenRange: "S07" },
        { id: "coin-surface-001", type: "coin", x: 50, y: 8, referenceId: "REF-PLAY-001", screenRange: "S02" },
        { id: "coin-surface-002", type: "coin", x: 52, y: 7, referenceId: "REF-PLAY-001", screenRange: "S02" },
        { id: "coin-surface-003", type: "coin", x: 54, y: 8, referenceId: "REF-PLAY-001", screenRange: "S02" },
        { id: "finish-pole-001", type: "finishPole", x: 204, y: 5, h: 8, referenceId: "REF-PLAY-001", screenRange: "S10" }
      ],
      triggers: [
        {
          id: "trigger-pipe-entry-001",
          type: "pipeEntry",
          x: 56,
          y: 10,
          w: 2,
          h: 3,
          action: "confirm",
          targetArea: "reward",
          targetX: 3,
          targetY: 10,
          referenceId: "REF-PLAY-002",
          screenRange: "S02"
        },
        {
          id: "trigger-finish-001",
          type: "finish",
          x: 204,
          y: 5,
          w: 1,
          h: 8,
          referenceId: "REF-PLAY-001",
          screenRange: "S10"
        }
      ]
    },
    reward: {
      id: "reward",
      bounds: { width: 48, height: 15 },
      ground: [
        { id: "reward-ground-001", x: 0, y: 12, w: 48, h: 3, referenceId: "REF-PLAY-002", screenRange: "B00-B01" }
      ],
      structures: [
        { id: "reward-ceiling-001", type: "ceiling", x: 0, y: 0, w: 48, h: 1, referenceId: "REF-PLAY-002", screenRange: "B00-B01" },
        { id: "reward-exit-pipe-001", type: "pipe", x: 42, y: 10, w: 2, h: 2, referenceId: "REF-PLAY-002", screenRange: "B01" }
      ],
      blocks: [
        { id: "reward-block-001", kind: "brick", content: "coin", x: 12, y: 8, referenceId: "REF-PLAY-002", screenRange: "B00" },
        { id: "reward-block-002", kind: "brick", content: "coin", x: 13, y: 8, referenceId: "REF-PLAY-002", screenRange: "B00" },
        { id: "reward-block-003", kind: "brick", content: "coin", x: 14, y: 8, referenceId: "REF-PLAY-002", screenRange: "B00" }
      ],
      entities: Array.from({ length: 12 }, (_, index) => ({
        id: `coin-reward-${String(index + 1).padStart(3, "0")}`,
        type: "coin",
        x: 8 + index * 2,
        y: 9,
        referenceId: "REF-PLAY-002",
        screenRange: index < 7 ? "B00" : "B01"
      })),
      triggers: [
        {
          id: "trigger-reward-exit-001",
          type: "pipeExit",
          x: 42,
          y: 9,
          w: 2,
          h: 3,
          action: "confirm",
          targetArea: "surface",
          targetX: 106.5,
          targetY: 10,
          referenceId: "REF-PLAY-002",
          screenRange: "B01"
        }
      ]
    }
  }
};

export const TUNING = {
  schemaVersion: "sunrise-run-tuning@1",
  revision: "tuning-r1",
  gravity: 48,
  jumpHoldGravityScale: 0.42,
  jumpVelocity: -19,
  bounceVelocity: -13.5,
  fallMaxSpeed: 26,
  walkMaxSpeed: 6.2,
  runMaxSpeed: 9.2,
  groundAccel: 70,
  airAccel: 38,
  friction: 52,
  skidDecel: 86,
  coyoteTime: 0.08,
  jumpBuffer: 0.1,
  jumpHoldTime: 0.18,
  stompGrace: 0.18,
  fixedStep: 1 / 120,
  maxSubSteps: 8,
  timerSeconds: 300
};

export const INPUT_CONFIG = {
  schemaVersion: "sunrise-run-input@1",
  revision: "input-r1",
  actions: ["moveLeft", "moveRight", "run", "jump", "pause", "confirm", "back"],
  bindings: {
    moveLeft: ["ArrowLeft", "KeyA"],
    moveRight: ["ArrowRight", "KeyD"],
    run: ["ShiftLeft", "ShiftRight"],
    jump: ["Space", "KeyZ"],
    pause: ["Escape"],
    confirm: ["Enter", "KeyE"],
    back: ["Backspace"]
  },
  gamepad: {
    moveLeft: ["Axis0Negative", "DPadLeft"],
    moveRight: ["Axis0Positive", "DPadRight"],
    run: ["RightShoulder"],
    jump: ["South"],
    pause: ["Menu"],
    confirm: ["South"],
    back: ["East"]
  }
};

export const ASSET_MANIFEST = {
  schemaVersion: "sunrise-run-assets@1",
  revision: "asset-r1",
  art: "procedural-canvas-original",
  audio: "procedural-web-audio-original",
  fonts: "system-ui",
  sourceAudit: "No protected art, audio, names, logos, frame redraws, or extracted data are stored."
};

export function requireField(value, path) {
  if (value === undefined || value === null || value === "") {
    throw new Error(`Invalid level data at ${path}`);
  }
}

export function validateLevelData(level = LEVEL_DATA) {
  requireField(level.schemaVersion, "schemaVersion");
  requireField(level.revision, "revision");
  requireField(level.tuningRevision, "tuningRevision");
  requireField(level.inputRevision, "inputRevision");
  requireField(level.assetRevision, "assetRevision");
  requireField(level.spawn?.x, "spawn.x");
  const ids = new Set();
  let finishCount = 0;
  for (const [areaId, area] of Object.entries(level.areas || {})) {
    requireField(area.bounds?.width, `areas.${areaId}.bounds.width`);
    for (const collection of ["ground", "structures", "blocks", "entities", "triggers"]) {
      for (const object of area[collection] || []) {
        const id = object.id || object.entityId || object.triggerId;
        requireField(id, `areas.${areaId}.${collection}.id`);
        if (ids.has(id)) throw new Error(`Duplicate stable ID ${id}`);
        ids.add(id);
        requireField(object.referenceId, `areas.${areaId}.${collection}.${id}.referenceId`);
        requireField(object.screenRange, `areas.${areaId}.${collection}.${id}.screenRange`);
        if (object.type === "finish" || object.type === "finishPole") finishCount += 1;
      }
    }
  }
  if (finishCount !== 2) throw new Error(`Expected one finish entity and one finish trigger, got ${finishCount}`);
  return true;
}

export function buildCollisionMap(level = LEVEL_DATA, areaId = "surface", revealedHidden = new Set(), brokenBlocks = new Set()) {
  const area = level.areas[areaId];
  if (!area) throw new Error(`Invalid level data at areas.${areaId}`);
  const map = new Map();
  const place = (x, y, value, sourceId) => {
    map.set(`${x},${y}`, { value, sourceId });
  };
  const fill = (object, value = TILE_SOLID) => {
    for (let yy = object.y; yy < object.y + object.h; yy += 1) {
      for (let xx = object.x; xx < object.x + object.w; xx += 1) place(xx, yy, value, object.id);
    }
  };
  for (const object of area.ground || []) fill(object);
  for (const object of area.structures || []) {
    if (object.type !== "castle") fill(object);
  }
  for (const block of area.blocks || []) {
    if (brokenBlocks.has(block.id)) continue;
    if (block.kind !== "hidden" || revealedHidden.has(block.id)) place(block.x, block.y, TILE_REWARD, block.id);
    if (block.kind !== "hidden") place(block.x, block.y, TILE_REWARD, block.id);
  }
  return map;
}

export function getBlockAt(level, areaId, x, y) {
  return (level.areas[areaId].blocks || []).find((block) => block.x === x && block.y === y) || null;
}

export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function screenForX(x) {
  return `S${String(Math.max(0, Math.floor(x / 20))).padStart(2, "0")}`;
}
