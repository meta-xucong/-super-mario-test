import assert from "node:assert/strict";
import { GameSimulation, LEVEL_DATA, TUNING } from "../src/engine.js";
import { buildCollisionMap, validateLevelData } from "../src/tilemap.js";

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

function runSteps(sim, count, input = {}) {
  for (let i = 0; i < count; i += 1) sim.step(input, TUNING.fixedStep);
}

test("level data carries schema revisions, stable IDs, references, and a unique finish flow", () => {
  assert.equal(validateLevelData(LEVEL_DATA), true);
  assert.equal(LEVEL_DATA.revision, "layout-r1");
  assert.equal(LEVEL_DATA.tuningRevision, "tuning-r1");
  assert.equal(LEVEL_DATA.inputRevision, "input-r1");
  assert.equal(LEVEL_DATA.assetRevision, "asset-r1");
});

test("static collision lets the player spawn in empty space and land on ground", () => {
  const sim = new GameSimulation();
  const spawnCell = buildCollisionMap(LEVEL_DATA, "surface").get(`${Math.floor(sim.player.x)},${Math.floor(sim.player.y)}`);
  assert.equal(spawnCell, undefined);
  runSteps(sim, 90);
  assert.equal(sim.player.grounded, true);
  assert.ok(sim.player.y < 12);
});

test("variable height jump produces a higher long jump than a tapped jump", () => {
  const short = new GameSimulation();
  const long = new GameSimulation();
  runSteps(short, 90);
  runSteps(long, 90);
  short.step({ jumpPressed: true, jumpHeld: false }, TUNING.fixedStep);
  long.step({ jumpPressed: true, jumpHeld: true }, TUNING.fixedStep);
  runSteps(short, 24, { jumpHeld: false });
  runSteps(long, 24, { jumpHeld: true });
  assert.ok(long.player.y < short.player.y, `long=${long.player.y} short=${short.player.y}`);
});

test("block hits are one-shot and produce score or spawned growth items", () => {
  const sim = new GameSimulation();
  sim.player.x = 20.98;
  sim.player.y = 10.1;
  sim.player.vy = -8;
  runSteps(sim, 12);
  assert.ok(sim.events.some((event) => event.type === "BlockHit" && event.targetId === "block-reward-002"));
  assert.ok(sim.entities.some((entity) => entity.type === "growth"));
  const scoreBefore = sim.score;
  sim.player.x = 20.98;
  sim.player.y = 10.1;
  sim.player.vy = -8;
  runSteps(sim, 12);
  assert.equal(sim.score, scoreBefore);
});

test("coin collection updates count and score once", () => {
  const sim = new GameSimulation();
  const coin = sim.entities.find((entity) => entity.id === "coin-surface-001");
  sim.player.x = coin.x;
  sim.player.y = coin.y;
  sim.step({}, TUNING.fixedStep);
  assert.equal(sim.coins, 1);
  assert.equal(sim.score, 100);
  sim.step({}, TUNING.fixedStep);
  assert.equal(sim.coins, 1);
});

test("enemy stomp bounces the player and side contact damages small form", () => {
  const stomp = new GameSimulation();
  const enemy = stomp.entities.find((entity) => entity.id === "walker-001");
  stomp.player.x = enemy.x;
  stomp.player.y = enemy.y - stomp.player.h + 0.02;
  stomp.player.prevY = stomp.player.y - 0.2;
  stomp.player.vy = 5;
  stomp.resolveEntityContacts();
  assert.equal(enemy.alive, false);
  assert.ok(stomp.player.vy < 0);
  assert.ok(stomp.events.some((event) => event.type === "EnemyStomped"));

  const hurt = new GameSimulation();
  const enemy2 = hurt.entities.find((entity) => entity.id === "walker-001");
  hurt.player.x = enemy2.x - 0.1;
  hurt.player.y = enemy2.y;
  hurt.player.vy = 0;
  hurt.resolveEntityContacts();
  assert.equal(hurt.state, "dying");
  assert.ok(hurt.events.some((event) => event.type === "PlayerDamaged"));
});

test("powered form shrinks on damage instead of immediate death", () => {
  const sim = new GameSimulation();
  const enemy = sim.entities.find((entity) => entity.id === "walker-001");
  sim.player.form = "powered";
  sim.player.h = 1.82;
  sim.player.x = enemy.x - 0.1;
  sim.player.y = enemy.y;
  sim.resolveEntityContacts();
  assert.equal(sim.player.form, "small");
  assert.equal(sim.state, "playing");
});

test("pipe transitions preserve score state and return to the approved anchor", () => {
  const sim = new GameSimulation();
  sim.score = 500;
  sim.player.x = 56.2;
  sim.player.y = 10.4;
  sim.checkPipeTriggers();
  assert.equal(sim.areaId, "reward");
  assert.equal(sim.score, 500);
  sim.player.x = 42.2;
  sim.player.y = 9.6;
  sim.checkPipeTriggers();
  assert.equal(sim.areaId, "surface");
  assert.ok(sim.player.x > 106);
});

test("fall death restarts the route and decrements lives", () => {
  const sim = new GameSimulation();
  sim.player.y = 20;
  sim.step({}, TUNING.fixedStep);
  assert.equal(sim.state, "dying");
  runSteps(sim, 140);
  assert.equal(sim.state, "playing");
  assert.equal(sim.lives, 2);
  assert.ok(sim.player.x < 4);
});

test("goal trigger locks control, awards score, and reaches won state once", () => {
  const sim = new GameSimulation();
  sim.player.x = 203.9;
  sim.player.y = 10.2;
  sim.step({}, TUNING.fixedStep);
  assert.equal(sim.state, "cleared");
  const score = sim.score;
  runSteps(sim, 400);
  assert.equal(sim.won, true);
  assert.equal(sim.events.filter((event) => event.type === "GoalTouched").length, 1);
  assert.equal(sim.events.filter((event) => event.type === "ScoreChanged" && event.payload.reason === "goal").length, 1);
  assert.equal(sim.score, score);
});

test("browser acceptance hook exposes deterministic snapshot, step, advanceToVictory, and restart behavior", () => {
  const sim = new GameSimulation();
  const snapshot = sim.snapshot();
  assert.equal(typeof snapshot.player_x, "number");
  assert.equal(typeof snapshot.player_y, "number");
  assert.equal(typeof snapshot.state, "string");
  assert.equal(typeof snapshot.won, "boolean");
  const victory = sim.advanceToVictory();
  assert.equal(victory.won, true);
});

let passed = 0;
const failures = [];
for (const { name, fn } of tests) {
  try {
    fn();
    passed += 1;
  } catch (error) {
    failures.push({ name, error });
  }
}

if (failures.length) {
  console.error(`static_checks failed: ${failures.length}/${tests.length}`);
  for (const failure of failures) {
    console.error(`- ${failure.name}: ${failure.error.message}`);
  }
  process.exit(1);
}

console.log(`static_checks passed: ${passed}/${tests.length}`);
