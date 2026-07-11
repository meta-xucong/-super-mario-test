import { GameEngine } from "./engine.js";
import { InputManager } from "./input.js";
import { Renderer } from "./renderer.js";
import { INPUT_CONFIG } from "./tilemap.js";

const canvas = document.getElementById("gameCanvas");
const app = document.getElementById("app");
const input = new InputManager(window, INPUT_CONFIG);
const engine = new GameEngine({ input });
const renderer = new Renderer(canvas, engine);

const els = {
  menu: document.getElementById("menu"),
  settings: document.getElementById("settings"),
  pause: document.getElementById("pause"),
  complete: document.getElementById("complete"),
  completeStats: document.getElementById("completeStats"),
  caption: document.getElementById("caption"),
  hudScore: document.getElementById("hudScore"),
  hudCoins: document.getElementById("hudCoins"),
  hudLevel: document.getElementById("hudLevel"),
  hudTime: document.getElementById("hudTime"),
  hudLives: document.getElementById("hudLives"),
  bindList: document.getElementById("bindList"),
  conflict: document.getElementById("conflict")
};

const audio = makeAudioDirector(engine);
let lastTime = performance.now();

function show(panel) {
  for (const key of ["menu", "settings", "pause", "complete"]) els[key].classList.add("hidden");
  if (panel) els[panel].classList.remove("hidden");
}

function start(mode, anchor = "start") {
  audio.unlock();
  engine.start(mode, anchor);
  canvas.focus();
  show(null);
}

document.getElementById("startFormal").addEventListener("click", () => start("formal"));
document.getElementById("startPractice").addEventListener("click", () => start("practice", "reward"));
document.getElementById("openSettings").addEventListener("click", () => show("settings"));
document.getElementById("settingsBack").addEventListener("click", () => show(engine.scene === "paused" ? "pause" : "menu"));
document.getElementById("resumeGame").addEventListener("click", () => {
  engine.resume();
  show(null);
  canvas.focus();
});
document.getElementById("restartGame").addEventListener("click", () => {
  engine.restart();
  show(null);
  canvas.focus();
});
document.getElementById("pauseSettings").addEventListener("click", () => show("settings"));
document.getElementById("quitGame").addEventListener("click", () => {
  engine.scene = "title";
  show("menu");
});
document.getElementById("completeRestart").addEventListener("click", () => start("formal"));
document.getElementById("completeMenu").addEventListener("click", () => {
  engine.scene = "title";
  show("menu");
});

for (const [id, key] of [
  ["musicVolume", "musicVolume"],
  ["sfxVolume", "sfxVolume"],
  ["reducedMotion", "reducedMotion"],
  ["highContrast", "highContrast"],
  ["captions", "captions"]
]) {
  document.getElementById(id).addEventListener("input", (event) => {
    const inputEl = event.currentTarget;
    engine.settings[key] = inputEl.type === "checkbox" ? inputEl.checked : Number(inputEl.value);
    app.classList.toggle("high-contrast", engine.settings.highContrast);
  });
}

window.addEventListener("blur", () => {
  if (engine.scene === "playing") {
    engine.pause();
    engine.pausedForFocus = true;
    show("pause");
  }
});

window.addEventListener("keydown", (event) => {
  if (event.code === "Escape" && engine.scene === "playing") {
    engine.pause();
    show("pause");
  }
});

function renderBindings() {
  els.bindList.innerHTML = "";
  for (const action of input.config.actions) {
    const label = document.createElement("label");
    label.textContent = action;
    const value = document.createElement("span");
    value.textContent = input.config.bindings[action].join(" / ");
    const button = document.createElement("button");
    button.textContent = "Rebind";
    button.addEventListener("click", () => {
      button.textContent = "Press key";
      input.beginRebind(action);
    });
    els.bindList.append(label, value, button);
  }
  updateConflicts(input.conflicts());
}

function updateConflicts(conflicts) {
  els.conflict.textContent = conflicts.length ? `Resolve binding conflict: ${conflicts.join(", ")}` : "";
}

input.onChange = (conflicts) => {
  renderBindings();
  updateConflicts(conflicts);
};
renderBindings();

function updateHud() {
  const snap = engine.snapshot();
  els.hudScore.textContent = `Score ${String(snap.score).padStart(6, "0")}`;
  els.hudCoins.textContent = `Sparks ${String(snap.coins).padStart(2, "0")}`;
  els.hudLevel.textContent = snap.mode === "practice" ? "Practice" : "Ridge 1";
  els.hudTime.textContent = `Time ${snap.time}`;
  els.hudLives.textContent = `Lives ${snap.lives}`;
  if (engine.scene === "complete") {
    els.completeStats.textContent = `Score ${snap.score}, sparks ${snap.coins}, remaining time ${snap.time}.`;
    show("complete");
  }
}

function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  const events = engine.update(dt);
  audio.consume(events);
  updateHud();
  renderer.render();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
window.__ALCHEMY_GAME_TEST__ = engine.testInterface();

function makeAudioDirector(engineRef) {
  let ctx = null;
  let musicGain = null;
  let sfxGain = null;
  let musicTimer = null;
  const musicNodes = [];
  let lastCaption = 0;
  const eventLabels = {
    CoinCollected: "spark collected",
    BlockHit: "block struck",
    EnemyStomped: "enemy bounced",
    PlayerDamaged: "player hurt",
    PlayerDied: "run restarted",
    PipeEntered: "tunnel transition",
    GoalTouched: "finish reached",
    ScoreChanged: "score updated"
  };
  return {
    unlock() {
      if (!ctx) {
        ctx = new AudioContext();
        musicGain = ctx.createGain();
        sfxGain = ctx.createGain();
        musicGain.connect(ctx.destination);
        sfxGain.connect(ctx.destination);
        const bass = ctx.createOscillator();
        const lead = ctx.createOscillator();
        bass.type = "sine";
        lead.type = "triangle";
        bass.connect(musicGain);
        lead.connect(musicGain);
        bass.start();
        lead.start();
        musicNodes.push(bass, lead);
        const motif = [196, 247, 294, 330, 294, 247, 220, 247];
        let index = 0;
        musicTimer = setInterval(() => {
          if (!ctx) return;
          const note = motif[index % motif.length];
          bass.frequency.setTargetAtTime(note / 2, ctx.currentTime, 0.04);
          lead.frequency.setTargetAtTime(note, ctx.currentTime, 0.04);
          index += 1;
        }, 260);
      }
      if (ctx.state === "suspended") ctx.resume();
      this.updateMix();
    },
    consume(events) {
      this.updateMix();
      for (const event of events) {
        if (eventLabels[event.type]) this.caption(eventLabels[event.type]);
        if (!ctx || engineRef.settings.sfxVolume <= 0) continue;
        const frequency = {
          CoinCollected: 880,
          BlockHit: 220,
          EnemyStomped: 520,
          PlayerDamaged: 140,
          PlayerDied: 110,
          PipeEntered: 330,
          GoalTouched: 660
        }[event.type];
        if (frequency) this.beep(frequency, 0.08);
      }
    },
    beep(frequency, length) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = frequency;
      gain.gain.value = engineRef.settings.sfxVolume * 0.09;
      osc.connect(gain).connect(sfxGain);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + length);
      osc.stop(ctx.currentTime + length);
    },
    updateMix() {
      if (!ctx) return;
      musicGain.gain.setTargetAtTime(engineRef.settings.musicVolume * 0.045, ctx.currentTime, 0.05);
      sfxGain.gain.setTargetAtTime(engineRef.settings.sfxVolume, ctx.currentTime, 0.02);
      if (engineRef.scene === "paused") musicGain.gain.setTargetAtTime(engineRef.settings.musicVolume * 0.018, ctx.currentTime, 0.05);
      if (musicTimer === null && musicNodes.length === 0) this.unlock();
    },
    caption(text) {
      if (!engineRef.settings.captions) return;
      const now = performance.now();
      if (now - lastCaption < 80 && text === els.caption.textContent) return;
      lastCaption = now;
      els.caption.textContent = `[${text}]`;
      els.caption.classList.remove("hidden");
      clearTimeout(this.timer);
      this.timer = setTimeout(() => els.caption.classList.add("hidden"), 1300);
    }
  };
}
