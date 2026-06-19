import { ensureCanvas, startLevel1 } from "./engine.js";

export function bootstrapLevel1() {
  if (typeof window !== "undefined" && window.meadowRunLevel1) {
    return window.meadowRunLevel1;
  }

  const canvas = ensureCanvas();
  const game = startLevel1(canvas);

  if (typeof window !== "undefined") {
    window.meadowRunLevel1 = game;
  }

  return game;
}

if (typeof window !== "undefined") {
  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", bootstrapLevel1, { once: true });
  } else {
    bootstrapLevel1();
  }
}
