// Pan clamp and grid labels (map pan/zoom fix).
//   node scripts/check-pan.mjs [baseUrl]
// 1. At 1x a drag must not move the map at all.
// 2. At 4x, dragging far in all four directions stops exactly 25% of the container past the 1x frame:
//    tx in [W(1-k) - W/4, W/4] and ty in [H(1-k) - H/4, H/4].
// 3. Every number label sits on its own major grid line, after every move.
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:3100";
const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail ? `  (${detail})` : ""}`);
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(base + "/player/jordami01", { waitUntil: "networkidle" });
await page.waitForFunction(() => !document.body.innerText.includes("Loading the map"));
await page.waitForTimeout(900);
const plot = page.locator("[aria-roledescription=map]");
const rect = await plot.boundingBox();
const W = rect.width;
const H = rect.height;

const transform = () => plot.evaluate((e) => ({ k: +e.dataset.zoom, x: +e.dataset.tx, y: +e.dataset.ty }));
const drag = async (dx, dy) => {
  const sx = rect.x + W / 2;
  const sy = rect.y + H / 2;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(sx + dx, sy + dy, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(150);
};
// Labels vs grid lines: each number label's centre must sit exactly on its own major grid line.
const labelsTrack = () =>
  page.evaluate(() => {
    let worst = 0;
    let shown = 0;
    for (const l of document.querySelectorAll("[data-gx-label]")) {
      const line = document.querySelector(`[data-gx="${l.dataset.gxLabel}"]`).getBoundingClientRect();
      const r = l.getBoundingClientRect();
      worst = Math.max(worst, Math.abs(r.x + r.width / 2 - line.x));
      shown++;
    }
    for (const l of document.querySelectorAll("[data-gy-label]")) {
      const line = document.querySelector(`[data-gy="${l.dataset.gyLabel}"]`).getBoundingClientRect();
      const r = l.getBoundingClientRect();
      worst = Math.max(worst, Math.abs(r.y + r.height / 2 - line.y));
      shown++;
    }
    return { worst, shown };
  });

// 1. At 1x the map does not move.
const t0 = await transform();
await drag(220, -140);
const t1 = await transform();
check("1x: drag leaves the transform unchanged", t0.k === 1 && t1.x === 0 && t1.y === 0 && t1.k === 1, `before ${JSON.stringify(t0)}, after ${JSON.stringify(t1)}`);
let lab = await labelsTrack();
check("1x: labels sit on their grid lines", lab.worst < 1, `${lab.shown} labels, worst offset ${lab.worst.toFixed(2)} px`);

// 2. Zoom to 4x, then drag far each way.
await page.getByRole("button", { name: "Zoom in" }).click();
await page.waitForTimeout(450);
await page.getByRole("button", { name: "Zoom in" }).click();
await page.waitForTimeout(450);
const tz = await transform();
check("zoomed to 4x", tz.k === 4, JSON.stringify(tz));
// Zoomed in (full give from 1.5x), the pan may go 25% of the container past the 1x frame on each side, no further.
const G = 0.25;
const covers = (t) => t.x <= G * W + 0.01 && t.x >= W * (1 - t.k) - G * W - 0.01 && t.y <= G * H + 0.01 && t.y >= H * (1 - t.k) - G * H - 0.01;
for (const [name, dx, dy, edge] of [
  ["right", 5000, 0, (t) => Math.abs(t.x - G * W) < 0.01],
  ["left", -5000, 0, (t) => Math.abs(t.x - (W * (1 - t.k) - G * W)) < 0.01],
  ["down", 0, 5000, (t) => Math.abs(t.y - G * H) < 0.01],
  ["up", 0, -5000, (t) => Math.abs(t.y - (H * (1 - t.k) - G * H)) < 0.01],
]) {
  await drag(dx, dy);
  const t = await transform();
  lab = await labelsTrack();
  check(`4x: drag far ${name}: stops exactly 25% past the frame edge`, covers(t) && edge(t), `tx ${t.x}, ty ${t.y}, range x [${(W * (1 - t.k) - G * W).toFixed(1)}, ${(G * W).toFixed(1)}] y [${(H * (1 - t.k) - G * H).toFixed(1)}, ${(G * H).toFixed(1)}]`);
  check(`4x after ${name}: labels move with the grid lines`, lab.worst < 1, `${lab.shown} labels, worst ${lab.worst.toFixed(2)} px`);
}

// Wheel and resize respect the clamp too.
await page.mouse.move(rect.x + 5, rect.y + 5);
for (let i = 0; i < 10; i++) await page.mouse.wheel(0, 300);
await page.waitForTimeout(200);
const tw = await transform();
check("wheel out to 1x snaps back to the frame", tw.k === 1 && tw.x === 0 && tw.y === 0, JSON.stringify(tw));
await page.getByRole("button", { name: "Zoom in" }).click();
await page.waitForTimeout(450);
await page.setViewportSize({ width: 1280, height: 860 });
await page.waitForTimeout(500);
const r2 = await plot.boundingBox();
const tr = await transform();
check(
  "resize keeps the zoom and re-clamps to the new size",
  tr.k === 2 && tr.x <= G * r2.width + 0.01 && tr.x >= r2.width * (1 - tr.k) - G * r2.width - 0.01 && tr.y <= G * r2.height + 0.01 && tr.y >= r2.height * (1 - tr.k) - G * r2.height - 0.01,
  `${JSON.stringify(tr)} in ${Math.round(r2.width)}x${Math.round(r2.height)}`,
);

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(failed ? `${failed} failed` : `pan checks: all ${results.length} pass`);
process.exit(failed ? 1 : 0);
