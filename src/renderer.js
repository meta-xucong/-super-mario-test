import { LEVEL_DATA, TILE_REWARD, buildCollisionMap } from "./tilemap.js";

const COLORS = {
  skyTop: "#7bd5ff",
  skyBottom: "#e9fbff",
  ridgeBack: "#6aa681",
  ridgeMid: "#3f7b63",
  ground: "#6a4b32",
  groundTop: "#93b957",
  reward: "#e2a843",
  brick: "#b46a3c",
  pipe: "#2f9d78",
  player: "#f05d4f",
  playerPowered: "#7f52ff",
  playerTrim: "#fff4cf",
  enemy: "#4a2e64",
  enemyTrim: "#ffdd57",
  coin: "#ffd447",
  flag: "#f8f7ec",
  pole: "#424f60",
  castle: "#66515d",
  outline: "#172230"
};

export class Renderer {
  constructor(canvas, engine) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.engine = engine;
    this.scale = 48;
    this.viewTilesX = canvas.width / this.scale;
    this.viewTilesY = canvas.height / this.scale;
    this.frame = 0;
  }

  render() {
    this.frame += 1;
    const sim = this.engine.sim;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const area = LEVEL_DATA.areas[sim.areaId];
    const cameraX = Math.min(Math.max(0, sim.cameraX), Math.max(0, area.bounds.width - this.viewTilesX));
    this.drawBackground(ctx, cameraX, sim.areaId);
    this.drawTiles(ctx, sim, cameraX);
    this.drawEntities(ctx, sim, cameraX);
    this.drawPlayer(ctx, sim, cameraX);
    if (this.engine.settings.reducedMotion) this.drawReducedMotionMarker(ctx);
  }

  tx(x, cameraX) { return (x - cameraX) * this.scale; }
  ty(y) { return y * this.scale; }

  drawBackground(ctx, cameraX, areaId) {
    const gradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    if (areaId === "reward") {
      gradient.addColorStop(0, "#172238");
      gradient.addColorStop(1, "#314052");
    } else {
      gradient.addColorStop(0, COLORS.skyTop);
      gradient.addColorStop(1, COLORS.skyBottom);
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    if (areaId === "reward") {
      for (let i = 0; i < 18; i += 1) {
        ctx.fillStyle = i % 2 ? "#23324a" : "#283957";
        ctx.fillRect((i * 160 - cameraX * 12) % (this.canvas.width + 160) - 80, 40 + (i % 4) * 28, 110, 16);
      }
      return;
    }
    ctx.fillStyle = COLORS.ridgeBack;
    this.drawHills(ctx, cameraX * 0.18, 500, 170, 0.55);
    ctx.fillStyle = COLORS.ridgeMid;
    this.drawHills(ctx, cameraX * 0.32, 565, 120, 0.8);
    ctx.fillStyle = "rgba(255, 255, 255, 0.58)";
    for (let i = 0; i < 6; i += 1) {
      const x = (i * 260 - cameraX * 10) % (this.canvas.width + 260) - 90;
      ctx.beginPath();
      ctx.ellipse(x, 90 + (i % 3) * 28, 64, 18, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 56, 92, 46, 14, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawHills(ctx, offset, baseY, height, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(0, this.canvas.height);
    for (let x = -80; x <= this.canvas.width + 160; x += 80) {
      const y = baseY - Math.sin((x + offset) * 0.009) * height * 0.45 - height;
      ctx.quadraticCurveTo(x + 40, y, x + 80, baseY);
    }
    ctx.lineTo(this.canvas.width, this.canvas.height);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawTiles(ctx, sim, cameraX) {
    const area = LEVEL_DATA.areas[sim.areaId];
    const map = buildCollisionMap(LEVEL_DATA, sim.areaId, sim.revealedHidden, sim.brokenBlocks);
    for (const [key, cell] of map) {
      const [x, y] = key.split(",").map(Number);
      if (x < cameraX - 1 || x > cameraX + this.viewTilesX + 1) continue;
      const px = this.tx(x, cameraX);
      const py = this.ty(y);
      const block = area.blocks?.find((candidate) => candidate.id === cell.sourceId);
      const structure = area.structures?.find((candidate) => candidate.id === cell.sourceId);
      if (block) {
        this.drawBlock(ctx, block, px, py);
      } else if (cell.value === TILE_REWARD) {
        this.drawBlock(ctx, { kind: "question" }, px, py);
      } else if (structure?.type === "pipe") {
        this.drawPipeTile(ctx, px, py);
      } else if (structure?.type === "step") {
        this.drawStone(ctx, px, py);
      } else {
        this.drawGround(ctx, px, py, y);
      }
    }
    if (sim.areaId === "surface") this.drawFinishAndCastle(ctx, cameraX);
  }

  drawGround(ctx, px, py, y) {
    ctx.fillStyle = y === 13 || y === 12 || y === 11 || y === 10 || y === 9 ? COLORS.groundTop : COLORS.ground;
    ctx.fillRect(px, py, this.scale, this.scale);
    ctx.strokeStyle = "rgba(23, 34, 48, 0.26)";
    ctx.strokeRect(px, py, this.scale, this.scale);
  }

  drawStone(ctx, px, py) {
    ctx.fillStyle = "#8b826d";
    ctx.fillRect(px, py, this.scale, this.scale);
    ctx.fillStyle = "#b8ac8b";
    ctx.fillRect(px + 5, py + 5, this.scale - 10, 7);
    ctx.strokeStyle = COLORS.outline;
    ctx.strokeRect(px, py, this.scale, this.scale);
  }

  drawPipeTile(ctx, px, py) {
    ctx.fillStyle = COLORS.pipe;
    ctx.fillRect(px, py, this.scale, this.scale);
    ctx.fillStyle = "#7ee0bf";
    ctx.fillRect(px + 5, py, 8, this.scale);
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 2;
    ctx.strokeRect(px, py, this.scale, this.scale);
  }

  drawBlock(ctx, block, px, py) {
    if (block.kind === "hidden") return;
    ctx.fillStyle = block.kind === "question" ? COLORS.reward : COLORS.brick;
    ctx.fillRect(px + 2, py + 2, this.scale - 4, this.scale - 4);
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 2, py + 2, this.scale - 4, this.scale - 4);
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    if (block.kind === "question") {
      ctx.beginPath();
      ctx.arc(px + this.scale / 2, py + this.scale / 2, 7, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(px + 6, py + 14, this.scale - 12, 3);
      ctx.fillRect(px + 6, py + 30, this.scale - 12, 3);
    }
  }

  drawFinishAndCastle(ctx, cameraX) {
    const poleX = this.tx(204.5, cameraX);
    ctx.fillStyle = COLORS.pole;
    ctx.fillRect(poleX, this.ty(5), 8, this.scale * 8);
    ctx.fillStyle = COLORS.flag;
    ctx.beginPath();
    ctx.moveTo(poleX + 8, this.ty(5.2));
    ctx.lineTo(poleX + 76, this.ty(5.7));
    ctx.lineTo(poleX + 8, this.ty(6.4));
    ctx.closePath();
    ctx.fill();
    const castleX = this.tx(215, cameraX);
    ctx.fillStyle = COLORS.castle;
    ctx.fillRect(castleX, this.ty(9), this.scale * 9, this.scale * 4);
    ctx.fillStyle = "#2a2330";
    ctx.fillRect(castleX + this.scale * 4, this.ty(11), this.scale, this.scale * 2);
    ctx.fillStyle = "#887486";
    for (let i = 0; i < 5; i += 1) ctx.fillRect(castleX + i * this.scale * 1.7, this.ty(8.4), this.scale, this.scale * 0.7);
  }

  drawEntities(ctx, sim, cameraX) {
    for (const entity of sim.entities) {
      if (entity.alive === false || entity.collected) continue;
      const px = this.tx(entity.x, cameraX);
      const py = this.ty(entity.y);
      if (px < -80 || px > this.canvas.width + 80) continue;
      if (entity.type === "walker") this.drawWalker(ctx, px, py, entity);
      if (entity.type === "growth") this.drawGrowth(ctx, px, py);
      if (entity.type === "coin") this.drawCoin(ctx, px, py);
    }
  }

  drawWalker(ctx, px, py, entity) {
    ctx.fillStyle = COLORS.enemy;
    ctx.beginPath();
    ctx.roundRect(px, py + 7, entity.w * this.scale, entity.h * this.scale - 7, 11);
    ctx.fill();
    ctx.fillStyle = COLORS.enemyTrim;
    ctx.fillRect(px + 9, py + 18, 8, 8);
    ctx.fillRect(px + 25, py + 18, 8, 8);
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  drawGrowth(ctx, px, py) {
    ctx.fillStyle = "#67d17c";
    ctx.beginPath();
    ctx.roundRect(px, py, this.scale * 0.78, this.scale * 0.78, 8);
    ctx.fill();
    ctx.fillStyle = "#eaff9b";
    ctx.fillRect(px + 9, py + 9, 10, 10);
    ctx.fillRect(px + 25, py + 21, 8, 8);
  }

  drawCoin(ctx, px, py) {
    ctx.fillStyle = COLORS.coin;
    ctx.beginPath();
    ctx.ellipse(px + 13, py + 13, 11, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#7a5520";
    ctx.stroke();
  }

  drawPlayer(ctx, sim, cameraX) {
    const p = sim.player;
    const px = this.tx(p.x, cameraX);
    const py = this.ty(p.y);
    const blink = p.invincible > 0 && Math.floor(this.frame / 4) % 2 === 0;
    if (blink) return;
    ctxSave(this.ctx, () => {
      this.ctx.translate(px + p.w * this.scale / 2, py + p.h * this.scale / 2);
      if (p.motion === "skidding" && !this.engine.settings.reducedMotion) this.ctx.rotate(-p.facing * 0.12);
      this.ctx.translate(-p.w * this.scale / 2, -p.h * this.scale / 2);
      this.ctx.fillStyle = p.form === "powered" ? COLORS.playerPowered : COLORS.player;
      this.ctx.beginPath();
      this.ctx.roundRect(0, 0, p.w * this.scale, p.h * this.scale, 12);
      this.ctx.fill();
      this.ctx.fillStyle = COLORS.playerTrim;
      this.ctx.fillRect(8, 11, p.w * this.scale - 16, 10);
      this.ctx.fillStyle = COLORS.outline;
      const eyeX = p.facing > 0 ? p.w * this.scale - 16 : 10;
      this.ctx.fillRect(eyeX, 24, 5, 7);
      this.ctx.fillStyle = "#25364a";
      this.ctx.fillRect(7, p.h * this.scale - 10, 14, 8);
      this.ctx.fillRect(p.w * this.scale - 21, p.h * this.scale - 10, 14, 8);
    });
  }

  drawReducedMotionMarker(ctx) {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(this.canvas.width - 116, this.canvas.height - 34, 104, 22);
    ctx.fillStyle = "#fff";
    ctx.font = "14px system-ui";
    ctx.fillText("Reduced motion", this.canvas.width - 108, this.canvas.height - 18);
  }
}

function ctxSave(ctx, fn) {
  ctx.save();
  try { fn(); } finally { ctx.restore(); }
}
