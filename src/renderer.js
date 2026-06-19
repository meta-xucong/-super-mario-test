import { LEVEL1_DESIGN, TILE_SIZE, TILE_TYPES } from "./tilemap.js";
import { collectedCoinCount } from "./entities.js";

export const VIEW_WIDTH = 800;
export const VIEW_HEIGHT = 480;

export const COLORS = Object.freeze({
  sky: "#7ec8ff",
  skyDeep: "#48a6ec",
  cloud: "#f6fbff",
  hill: "#57b75b",
  hillShadow: "#3d994a",
  groundTop: "#67b552",
  ground: "#9b683f",
  groundDark: "#6e432c",
  brick: "#c67b43",
  brickLight: "#e0a05c",
  player: "#2d5edb",
  playerHat: "#f0c64a",
  playerBoot: "#25324c",
  enemy: "#7d4a28",
  enemyLeaf: "#61b957",
  coin: "#ffd54d",
  coinEdge: "#d99a1b",
  goal: "#f8f8f2",
  goalPole: "#e8f0f8",
  uiText: "#142136",
  panel: "rgba(255, 255, 255, 0.78)",
});

export class Renderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.viewWidth = options.viewWidth ?? VIEW_WIDTH;
    this.viewHeight = options.viewHeight ?? VIEW_HEIGHT;
    this.resize(options.pixelRatio);
  }

  resize(pixelRatio = typeof window !== "undefined" ? window.devicePixelRatio : 1) {
    const scale = Math.max(1, Math.floor(pixelRatio || 1));
    this.canvas.width = this.viewWidth * scale;
    this.canvas.height = this.viewHeight * scale;
    this.canvas.style.width = `${this.viewWidth}px`;
    this.canvas.style.height = `${this.viewHeight}px`;
    this.ctx.setTransform(scale, 0, 0, scale, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  }

  render(snapshot) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.viewWidth, this.viewHeight);
    this.drawBackground(ctx, snapshot.cameraX);
    ctx.save();
    ctx.translate(-Math.round(snapshot.cameraX), 0);
    this.drawTiles(ctx, snapshot.level, snapshot.cameraX);
    this.drawCoins(ctx, snapshot.coins);
    this.drawEnemies(ctx, snapshot.enemies);
    this.drawGoal(ctx, snapshot.level.goal);
    this.drawPlayer(ctx, snapshot.player);
    ctx.restore();
    this.drawHud(ctx, snapshot);
    this.drawStateMessage(ctx, snapshot);
  }

  drawBackground(ctx, cameraX) {
    const gradient = ctx.createLinearGradient(0, 0, 0, this.viewHeight);
    gradient.addColorStop(0, COLORS.sky);
    gradient.addColorStop(1, COLORS.skyDeep);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);

    const parallax = cameraX * 0.28;
    this.drawCloud(ctx, 130 - (parallax % 520), 68, 1.1);
    this.drawCloud(ctx, 440 - (parallax % 620), 112, 0.85);
    this.drawCloud(ctx, 780 - (parallax % 680), 58, 1);
    this.drawHills(ctx, -((cameraX * 0.16) % 360));
  }

  drawCloud(ctx, x, y, scale) {
    ctx.fillStyle = COLORS.cloud;
    ctx.fillRect(x, y + 12 * scale, 78 * scale, 18 * scale);
    ctx.fillRect(x + 14 * scale, y, 24 * scale, 26 * scale);
    ctx.fillRect(x + 40 * scale, y + 5 * scale, 30 * scale, 22 * scale);
  }

  drawHills(ctx, offset) {
    for (let x = offset - 360; x < this.viewWidth + 360; x += 360) {
      ctx.fillStyle = COLORS.hillShadow;
      ctx.beginPath();
      ctx.moveTo(x, this.viewHeight - 96);
      ctx.lineTo(x + 175, this.viewHeight - 232);
      ctx.lineTo(x + 350, this.viewHeight - 96);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = COLORS.hill;
      ctx.beginPath();
      ctx.moveTo(x + 62, this.viewHeight - 92);
      ctx.lineTo(x + 205, this.viewHeight - 196);
      ctx.lineTo(x + 350, this.viewHeight - 92);
      ctx.closePath();
      ctx.fill();
    }
  }

  drawTiles(ctx, level, cameraX) {
    const startX = Math.max(0, Math.floor(cameraX / TILE_SIZE) - 1);
    const endX = Math.min(level.width - 1, Math.ceil((cameraX + this.viewWidth) / TILE_SIZE) + 1);

    for (let y = 0; y < level.height; y += 1) {
      for (let x = startX; x <= endX; x += 1) {
        const tile = level.tiles[y][x];
        if (tile === TILE_TYPES.EMPTY || tile === TILE_TYPES.START) {
          continue;
        }

        this.drawTile(ctx, tile, x * TILE_SIZE, y * TILE_SIZE);
      }
    }
  }

  drawTile(ctx, tile, x, y) {
    if (tile === TILE_TYPES.GROUND) {
      ctx.fillStyle = COLORS.ground;
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      ctx.fillStyle = COLORS.groundTop;
      ctx.fillRect(x, y, TILE_SIZE, 8);
      ctx.fillStyle = COLORS.groundDark;
      ctx.fillRect(x + 4, y + 14, 6, 6);
      ctx.fillRect(x + 20, y + 22, 7, 5);
      return;
    }

    if (tile === TILE_TYPES.BRICK) {
      ctx.fillStyle = COLORS.brick;
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      ctx.fillStyle = COLORS.brickLight;
      ctx.fillRect(x + 2, y + 3, TILE_SIZE - 4, 5);
      ctx.fillStyle = "rgba(86, 45, 31, 0.38)";
      ctx.fillRect(x, y + 15, TILE_SIZE, 2);
      ctx.fillRect(x + 15, y, 2, 16);
      ctx.fillRect(x + 6, y + 17, 2, 15);
      ctx.fillRect(x + 24, y + 17, 2, 15);
      return;
    }

    if (tile === TILE_TYPES.GOAL) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
      ctx.fillRect(x + 12, y, 8, TILE_SIZE);
    }
  }

  drawCoins(ctx, coins) {
    for (const coin of coins) {
      if (coin.collected) {
        continue;
      }

      ctx.fillStyle = COLORS.coinEdge;
      ctx.fillRect(coin.x - 7, coin.y - 8, 14, 16);
      ctx.fillStyle = COLORS.coin;
      ctx.fillRect(coin.x - 5, coin.y - 6, 10, 12);
      ctx.fillStyle = "#fff2a3";
      ctx.fillRect(coin.x - 1, coin.y - 5, 2, 10);
    }
  }

  drawEnemies(ctx, enemies) {
    for (const enemy of enemies) {
      if (enemy.defeated) {
        continue;
      }

      ctx.fillStyle = COLORS.enemy;
      ctx.fillRect(enemy.x, enemy.y + 5, enemy.width, enemy.height - 5);
      ctx.fillStyle = COLORS.enemyLeaf;
      ctx.fillRect(enemy.x + 5, enemy.y, 12, 8);
      ctx.fillStyle = "#261a16";
      ctx.fillRect(enemy.x + 5, enemy.y + 13, 4, 4);
      ctx.fillRect(enemy.x + 14, enemy.y + 13, 4, 4);
      ctx.fillStyle = COLORS.enemy;
      ctx.fillRect(enemy.x - 2, enemy.y + enemy.height - 4, 8, 4);
      ctx.fillRect(enemy.x + enemy.width - 6, enemy.y + enemy.height - 4, 8, 4);
    }
  }

  drawGoal(ctx, goal) {
    ctx.fillStyle = COLORS.goalPole;
    ctx.fillRect(goal.x + 12, goal.y, 5, goal.height);
    ctx.fillStyle = "#4fd18b";
    ctx.fillRect(goal.x + 17, goal.y + 7, 42, 23);
    ctx.fillStyle = "#2a9f67";
    ctx.fillRect(goal.x + 49, goal.y + 30, 10, 10);
    ctx.fillStyle = COLORS.goal;
    ctx.fillRect(goal.x + 23, goal.y + 13, 18, 4);
  }

  drawPlayer(ctx, player) {
    if (player.invulnerable > 0 && Math.floor(player.invulnerable * 14) % 2 === 0) {
      return;
    }

    ctx.fillStyle = COLORS.playerBoot;
    ctx.fillRect(player.x + 2, player.y + player.height - 4, 8, 5);
    ctx.fillRect(player.x + player.width - 10, player.y + player.height - 4, 8, 5);
    ctx.fillStyle = COLORS.player;
    ctx.fillRect(player.x + 3, player.y + 9, player.width - 6, player.height - 11);
    ctx.fillStyle = COLORS.playerHat;
    ctx.fillRect(player.x + 2, player.y + 2, player.width - 4, 8);
    ctx.fillStyle = "#f6b77c";
    ctx.fillRect(player.x + 6, player.y + 10, player.width - 10, 8);
    ctx.fillStyle = COLORS.uiText;
    const eyeX = player.facing > 0 ? player.x + player.width - 8 : player.x + 6;
    ctx.fillRect(eyeX, player.y + 12, 3, 3);
  }

  drawHud(ctx, snapshot) {
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(14, 12, 360, 38);
    ctx.fillStyle = COLORS.uiText;
    ctx.font = "16px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    ctx.fillText(`Score ${String(snapshot.score).padStart(5, "0")}`, 28, 36);
    ctx.fillText(`Coins ${collectedCoinCount(snapshot.coins)}/${snapshot.coins.length}`, 165, 36);
    ctx.fillText(`Lives ${snapshot.lives}`, 288, 36);
  }

  drawStateMessage(ctx, snapshot) {
    let title = "";
    let detail = "";

    if (snapshot.state === "ready") {
      title = LEVEL1_DESIGN.title;
      detail = "Arrows/A-D move  Space/W jump  R restart";
    } else if (snapshot.state === "won") {
      title = "Level Complete";
      detail = `Final score ${snapshot.score}  Press R to run again`;
    } else if (snapshot.state === "lost") {
      title = "Try Again";
      detail = "Press R to restart Level 1";
    } else if (snapshot.messageTimer > 0) {
      title = "Keep Going";
      detail = "Reach the pennant at the end";
    }

    if (!title) {
      return;
    }

    ctx.fillStyle = "rgba(255, 255, 255, 0.86)";
    ctx.fillRect(160, 178, 480, 90);
    ctx.strokeStyle = "rgba(20, 33, 54, 0.18)";
    ctx.strokeRect(160.5, 178.5, 479, 89);
    ctx.fillStyle = COLORS.uiText;
    ctx.textAlign = "center";
    ctx.font = "24px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    ctx.fillText(title, this.viewWidth / 2, 214);
    ctx.font = "14px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    ctx.fillText(detail, this.viewWidth / 2, 242);
    ctx.textAlign = "left";
  }
}
