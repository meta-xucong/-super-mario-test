export const TILE_SIZE = 32;

export const TILE_TYPES = Object.freeze({
  EMPTY: 0,
  GROUND: 1,
  BRICK: 2,
  PLATFORM: 3,
  HAZARD: 4,
  START: 5,
  GOAL: 6,
  HILL: 7,
  CLOUD: 8,
});

export const TILE_DEFINITIONS = Object.freeze({
  [TILE_TYPES.EMPTY]: Object.freeze({
    id: "empty",
    solid: false,
    hazard: false,
    decorative: false,
    interactive: false,
  }),
  [TILE_TYPES.GROUND]: Object.freeze({
    id: "ground",
    solid: true,
    hazard: false,
    decorative: false,
    interactive: false,
  }),
  [TILE_TYPES.BRICK]: Object.freeze({
    id: "brick",
    solid: true,
    hazard: false,
    decorative: false,
    interactive: false,
  }),
  [TILE_TYPES.PLATFORM]: Object.freeze({
    id: "platform",
    solid: true,
    hazard: false,
    decorative: false,
    interactive: false,
  }),
  [TILE_TYPES.HAZARD]: Object.freeze({
    id: "hazard",
    solid: false,
    hazard: true,
    decorative: false,
    interactive: true,
  }),
  [TILE_TYPES.START]: Object.freeze({
    id: "start",
    solid: false,
    hazard: false,
    decorative: false,
    interactive: true,
  }),
  [TILE_TYPES.GOAL]: Object.freeze({
    id: "goal",
    solid: false,
    hazard: false,
    decorative: false,
    interactive: true,
  }),
  [TILE_TYPES.HILL]: Object.freeze({
    id: "hill",
    solid: false,
    hazard: false,
    decorative: true,
    interactive: false,
  }),
  [TILE_TYPES.CLOUD]: Object.freeze({
    id: "cloud",
    solid: false,
    hazard: false,
    decorative: true,
    interactive: false,
  }),
});

export const LEVEL1_DESIGN = Object.freeze({
  id: "level-1",
  title: "Level 1 - Meadow Run",
  intent:
    "An original retro side-scrolling first level that teaches movement, jumping, coin collection, enemy avoidance, and goal capture in one continuous run.",
  copyrightNote:
    "The level, character naming, color language, enemy identity, and layout are original and intentionally avoid protected commercial-game characters, names, artwork, and exact level layouts.",
  engineeringRequirements: Object.freeze([
    "60 FPS canvas rendering with fixed-step simulation.",
    "TileMap-driven world data with solid, decorative, hazard, start, and goal tile semantics.",
    "AABB entity collisions against tile solids and interactive entities.",
    "Player walk, jump, gravity, stomp, damage, respawn, scoring, win, and restart states.",
    "Simple ground enemy AI that patrols inside platform bounds.",
    "Collectible coins and a goal trigger that complete the level.",
  ]),
  player: Object.freeze({
    spawnTile: Object.freeze({ x: 2, y: 10 }),
    size: Object.freeze({ width: 22, height: 30 }),
    controls: Object.freeze({
      moveLeft: "ArrowLeft / A",
      moveRight: "ArrowRight / D",
      jump: "Space / ArrowUp / W",
      restart: "R",
    }),
  }),
  winCondition:
    "Touch the wind pennant goal at the far right after crossing the complete Level 1 route.",
});

const TOKEN_TO_TILE = Object.freeze({
  ".": TILE_TYPES.EMPTY,
  "1": TILE_TYPES.GROUND,
  "2": TILE_TYPES.BRICK,
  "=": TILE_TYPES.PLATFORM,
  "^": TILE_TYPES.HAZARD,
  "h": TILE_TYPES.HILL,
  "c": TILE_TYPES.CLOUD,
  "S": TILE_TYPES.START,
  "G": TILE_TYPES.GOAL,
  "g": TILE_TYPES.GOAL,
});

export const LEVEL_ENTITY_TOKENS = Object.freeze({
  COIN: "C",
  ENEMY: "E",
});

export const LEVEL_SCHEMA_VERSION = 1;

const LEVEL1_DEFINITION = Object.freeze({
  schemaVersion: LEVEL_SCHEMA_VERSION,
  id: LEVEL1_DESIGN.id,
  title: LEVEL1_DESIGN.title,
  tileSize: TILE_SIZE,
  background: "#7ec8ff",
  gravity: 1750,
  maxFallSpeed: 900,
  rows: Object.freeze([
    "........................................................................................................",
    "........................................................................................................",
    "........................................................................................................",
    ".............CC..........................................C.C............................................",
    "............2222.....................C...............2222222.........................C..................",
    "..............................C....2222...........................................2222.............G....",
    "..................C.........2222.....................C..................C..........................g....",
    ".....S..........2222......................E.........2222...............2222.........................g....",
    "...........E......................222.........................E.....................222..............g....",
    "11111111111111111111111...111111111111111111111111111111...1111111111111...111111111111111111111111111",
    "11111111111111111111111...111111111111111111111111111111...1111111111111...111111111111111111111111111",
    "11111111111111111111111...111111111111111111111111111111...1111111111111...111111111111111111111111111",
  ]),
});

export const LEVEL_DEFINITIONS = Object.freeze([LEVEL1_DEFINITION]);

function freezeList(items) {
  return Object.freeze(items.map((item) => Object.freeze({ ...item })));
}

function assertLevelDefinition(definition) {
  if (!definition || typeof definition !== "object") {
    throw new TypeError("TileMap level definition must be an object.");
  }

  if (!definition.id || typeof definition.id !== "string") {
    throw new TypeError("TileMap level definition requires a string id.");
  }

  if (!definition.title || typeof definition.title !== "string") {
    throw new TypeError(`TileMap level "${definition.id}" requires a string title.`);
  }

  if (!Array.isArray(definition.rows) || definition.rows.length === 0) {
    throw new TypeError(`TileMap level "${definition.id}" requires at least one row.`);
  }

  if (definition.rows.some((row) => typeof row !== "string" || row.length === 0)) {
    throw new TypeError(`TileMap level "${definition.id}" rows must be non-empty strings.`);
  }

  const tileSize = definition.tileSize ?? TILE_SIZE;
  if (!Number.isInteger(tileSize) || tileSize <= 0) {
    throw new TypeError(`TileMap level "${definition.id}" tileSize must be a positive integer.`);
  }
}

export function getLevelDimensions(rows) {
  return Object.freeze({
    width: rows.reduce((max, row) => Math.max(max, row.length), 0),
    height: rows.length,
  });
}

function createCoin(x, y, tileSize) {
  return {
    id: `coin-${x}-${y}`,
    x: x * tileSize + tileSize * 0.5,
    y: y * tileSize + tileSize * 0.5,
    collected: false,
  };
}

function createEnemy(x, y, tileSize) {
  return {
    id: `sprout-${x}-${y}`,
    type: "sprout",
    x: x * tileSize + 5,
    y: y * tileSize + 2,
    width: 22,
    height: 24,
    direction: -1,
    speed: 44,
    defeated: false,
  };
}

function normalizeLevelDefinition(definition) {
  assertLevelDefinition(definition);
  const tileSize = definition.tileSize ?? TILE_SIZE;
  const dimensions = getLevelDimensions(definition.rows);

  return Object.freeze({
    schemaVersion: definition.schemaVersion ?? LEVEL_SCHEMA_VERSION,
    id: definition.id,
    title: definition.title,
    tileSize,
    width: dimensions.width,
    height: dimensions.height,
    rows: Object.freeze([...definition.rows]),
    background: definition.background ?? "#7ec8ff",
    gravity: definition.gravity ?? 1750,
    maxFallSpeed: definition.maxFallSpeed ?? 900,
    defaultPlayerStart: Object.freeze({
      x: definition.defaultPlayerStart?.x ?? tileSize * 2,
      y: definition.defaultPlayerStart?.y ?? tileSize * 8,
    }),
    defaultGoal: Object.freeze({
      x: definition.defaultGoal?.x ?? tileSize * (dimensions.width - 4),
      y: definition.defaultGoal?.y ?? tileSize * 6,
      height: definition.defaultGoal?.height ?? tileSize * 4,
    }),
  });
}

export function createTileMapLevel(definition) {
  const normalized = normalizeLevelDefinition(definition);
  const { rows, tileSize, width, height } = normalized;
  const coins = [];
  const enemies = [];
  let playerStart = { ...normalized.defaultPlayerStart };
  let goal = { ...normalized.defaultGoal };
  let startCount = 0;
  let goalCount = 0;

  const tiles = rows.map((row, y) => {
    return Array.from({ length: width }, (_, x) => {
      const token = row[x] || ".";
      if (token === LEVEL_ENTITY_TOKENS.COIN) {
        coins.push(createCoin(x, y, tileSize));
        return TILE_TYPES.EMPTY;
      }

      if (token === LEVEL_ENTITY_TOKENS.ENEMY) {
        enemies.push(createEnemy(x, y, tileSize));
        return TILE_TYPES.EMPTY;
      }

      if (token === "S") {
        startCount += 1;
        playerStart = { x: x * tileSize + 5, y: y * tileSize - 2 };
        return TILE_TYPES.START;
      }

      if (token === "G") {
        goalCount += 1;
        goal = { x: x * tileSize + 9, y: y * tileSize, height: tileSize * 4 };
      }

      const tile = TOKEN_TO_TILE[token];
      if (tile === undefined) {
        throw new TypeError(`Unknown TileMap token "${token}" at ${normalized.id}:${x},${y}.`);
      }

      return tile;
    });
  });

  if (startCount !== 1) {
    throw new TypeError(`TileMap level "${normalized.id}" must contain exactly one S start tile.`);
  }

  if (goalCount !== 1) {
    throw new TypeError(`TileMap level "${normalized.id}" must contain exactly one G goal head tile.`);
  }

  return Object.freeze({
    schemaVersion: normalized.schemaVersion,
    id: normalized.id,
    title: normalized.title,
    tileSize,
    width,
    height,
    pixelWidth: width * tileSize,
    pixelHeight: height * tileSize,
    background: normalized.background,
    gravity: normalized.gravity,
    maxFallSpeed: normalized.maxFallSpeed,
    playerStart: Object.freeze(playerStart),
    goal: Object.freeze(goal),
    coins: freezeList(coins),
    enemies: freezeList(enemies),
    tiles: Object.freeze(tiles.map((row) => Object.freeze(row))),
  });
}

export const LEVELS = Object.freeze(LEVEL_DEFINITIONS.map(createTileMapLevel));
export const LEVEL_BY_ID = Object.freeze(Object.fromEntries(LEVELS.map((level) => [level.id, level])));
export const level1 = LEVEL_BY_ID[LEVEL1_DESIGN.id];

export function getLevelById(id) {
  return LEVEL_BY_ID[id] ?? null;
}

export function listLevels() {
  return LEVELS;
}

export function getTile(level, tileX, tileY) {
  if (tileY < 0 || tileY >= level.height || tileX < 0 || tileX >= level.width) {
    return TILE_TYPES.EMPTY;
  }
  return level.tiles[tileY][tileX] ?? TILE_TYPES.EMPTY;
}

export function isSolidTile(tile) {
  return Boolean(TILE_DEFINITIONS[tile]?.solid);
}

export function isHazardTile(tile) {
  return Boolean(TILE_DEFINITIONS[tile]?.hazard);
}

export function isDecorativeTile(tile) {
  return Boolean(TILE_DEFINITIONS[tile]?.decorative);
}

export function isInteractiveTile(tile) {
  return Boolean(TILE_DEFINITIONS[tile]?.interactive);
}

