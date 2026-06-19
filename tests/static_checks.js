import { readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));

const REQUIRED_FILES = Object.freeze([
  "index.html",
  "src/main.js",
  "src/engine.js",
  "src/input.js",
  "src/physics.js",
  "src/tilemap.js",
  "src/entities.js",
  "src/renderer.js",
  "tests/static_checks.js",
]);

const EXPECTED_MODULE_TOKENS = Object.freeze({
  "src/main.js": ['from "./engine.js"', "bootstrapLevel1"],
  "src/engine.js": [
    'from "./tilemap.js"',
    'from "./input.js"',
    'from "./physics.js"',
    'from "./entities.js"',
    'from "./renderer.js"',
    "class GameEngine",
    "startLevel1",
  ],
  "src/input.js": ["class InputController", "INPUT_BINDINGS"],
  "src/physics.js": ["class PhysicsSystem", "rectsOverlap", "moveWithTiles"],
  "src/tilemap.js": ["createTileMapLevel", "LEVEL1_DEFINITION", "TILE_TYPES"],
  "src/entities.js": ["createPlayer", "createEnemy", "SCORE_VALUES", "GAME_STATES"],
  "src/renderer.js": ["class Renderer", "drawTiles", "drawHud"],
});

const errors = [];

function readProjectFile(relativePath) {
  return readFileSync(join(rootDir, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    errors.push(message);
  }
}

for (const relativePath of REQUIRED_FILES) {
  const absolutePath = join(rootDir, relativePath);
  try {
    assert(statSync(absolutePath).isFile(), `${relativePath} must be a file.`);
  } catch {
    errors.push(`${relativePath} is missing.`);
  }
}

const html = readProjectFile("index.html");
assert(html.includes('data-requirement="REQ-009"'), "index.html must expose REQ-009 in visible requirement trace.");
assert(html.includes('"REQ-009"'), "index.html requirement JSON must include REQ-009.");
assert(
  html.includes('<script type="module" src="./src/main.js"></script>'),
  "index.html must load the browser bootstrap through src/main.js.",
);

const main = readProjectFile("src/main.js");
assert(!main.includes("class RetroPlatformer"), "src/main.js must stay a thin bootstrap, not a monolithic game.");
assert(!main.includes("getContext(\"2d\")"), "src/main.js must not own renderer responsibilities.");

for (const [relativePath, tokens] of Object.entries(EXPECTED_MODULE_TOKENS)) {
  const source = readProjectFile(relativePath);
  for (const token of tokens) {
    assert(source.includes(token), `${relativePath} must include ${token}.`);
  }
}

if (errors.length > 0) {
  console.error(`Static artifact inspection failed with ${errors.length} issue(s):`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Static artifact inspection passed: REQ-009 file structure is present and traceable.");
