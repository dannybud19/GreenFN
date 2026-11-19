// The grid fills the map area (Phase 7f).
//   node scripts/check-frame.mjs [baseUrl]
// At 1x, at 1440x900, 1280x800 and 1024x768: the grid's outer lines (0 and 100 on both axes) are within 2 px of
// the frame edges: left just right of the down-axis numbers, top just below the across-axis numbers, right and
// bottom 16 px in from the map container. The dots keep the data's aspect ratio (within 0.5%) and fill the frame
// (8 px margin) on at least one axis.
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:3100";
const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail ? `  (${detail})` : ""}`);
};

// The data's own aspect ratio, from map.json.
const map = await (await fetch(base + "/data/map.json")).json();
let minX = Infinity;
let maxX = -Infinity;
let minY = Infinity;
let maxY = -Infinity;
for (const seasons of Object.values(map))
  for (const [, x, y] of seasons) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
const dataAspect = (maxX - minX) / (maxY - minY);

const browser = await chromium.launch();
for (const [w, h] of [
  [1440, 900],
  [1280, 800],
  [1024, 768],
]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.waitForFunction(() => !document.body.innerText.includes("Loading the map"));
  await page.waitForTimeout(700);
  const m = await page.evaluate(() => {
    const box = (sel) => document.querySelector(sel).getBoundingClientRect();
    const card = box("[data-box=map]");
    const plotEl = document.querySelector("[aria-roledescription=map]");
    const down = [...document.querySelectorAll("[data-gy-label]")].map((e) => e.getBoundingClientRect());
    const across = [...document.querySelectorAll("[data-gx-label]")].map((e) => e.getBoundingClientRect());
    const dots = plotEl.dataset.dots.split(",").map(Number);
    const frame = plotEl.dataset.frame.split(",").map(Number);
    return {
      line: { left: box('[data-gx="0"]').x, right: box('[data-gx="100"]').x, top: box('[data-gy="0"]').y, bottom: box('[data-gy="100"]').y },
      want: {
        left: Math.max(...down.map((r) => r.x + r.width)) + 8, // just right of the down numbers (8 px gap)
        right: card.x + card.width - 16,
        top: Math.max(...across.map((r) => r.y + r.height)) + 6, // just below the across numbers (6 px gap)
        bottom: card.y + card.height - 16,
      },
      dots: { w: dots[2] - dots[0], h: dots[3] - dots[1], gapL: dots[0] - frame[0], gapR: frame[2] - dots[2], gapT: dots[1] - frame[1], gapB: frame[3] - dots[3] },
      zoom: plotEl.dataset.zoom,
    };
  });
  const offs = Object.keys(m.want).map((k) => `${k} ${(m.line[k] - m.want[k]).toFixed(1)}`);
  const worst = Math.max(...Object.keys(m.want).map((k) => Math.abs(m.line[k] - m.want[k])));
  check(`${w}x${h} 1x: outer grid lines within 2 px of the frame edges`, m.zoom === "1.00" && worst <= 2, offs.join(", "));
  const aspect = m.dots.w / m.dots.h;
  check(`${w}x${h}: dots keep the data's aspect ratio`, Math.abs(aspect / dataAspect - 1) <= 0.005, `dots ${aspect.toFixed(4)} vs data ${dataAspect.toFixed(4)}`);
  const fills = (Math.abs(m.dots.gapL - 8) < 1 && Math.abs(m.dots.gapR - 8) < 1) || (Math.abs(m.dots.gapT - 8) < 1 && Math.abs(m.dots.gapB - 8) < 1);
  const centred = Math.abs(m.dots.gapL - m.dots.gapR) < 1 && Math.abs(m.dots.gapT - m.dots.gapB) < 1;
  check(`${w}x${h}: dots as large as fits (8 px margin) and centred`, fills && centred, `gaps L ${m.dots.gapL.toFixed(1)} R ${m.dots.gapR.toFixed(1)} T ${m.dots.gapT.toFixed(1)} B ${m.dots.gapB.toFixed(1)}`);
  await page.close();
}
await browser.close();
const failed = results.filter((r) => !r).length;
console.log(failed ? `${failed} failed` : `frame checks: all ${results.length} pass`);
process.exit(failed ? 1 : 0);
