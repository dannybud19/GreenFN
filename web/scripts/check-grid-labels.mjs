// Grid numbers attached to the grid (Phase 7e).
//   node scripts/check-grid-labels.mjs [baseUrl]
// At 1x, 4x and 8x (and 4x dragged to the corners): every number's centre is within 1 px of its own grid line, and
// each number sits within 12 px of the grid's edge, or of the map area's edge when the grid edge is off screen.
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:3100";
const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail ? `  (${detail})` : ""}`);
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(base + "/", { waitUntil: "networkidle" });
await page.waitForFunction(() => !document.body.innerText.includes("Loading the map"));
await page.waitForTimeout(800);
const plot = page.locator("[aria-roledescription=map]");
const rect = await plot.boundingBox();

const measure = () =>
  page.evaluate(() => {
    const area = document.querySelector("[aria-roledescription=map]").getBoundingClientRect();
    const box = (e) => e.getBoundingClientRect();
    const top0 = document.querySelector('[data-gy="0"]'); // the grid's top edge, if in view
    const left0 = document.querySelector('[data-gx="0"]'); // the grid's left edge, if in view
    const topEdge = top0 && box(top0).y >= area.y ? box(top0).y : null;
    const leftEdge = left0 && box(left0).x >= area.x ? box(left0).x : null;
    let worstLine = 0;
    let worstEdge = 0;
    const across = [...document.querySelectorAll("[data-gx-label]")];
    const down = [...document.querySelectorAll("[data-gy-label]")];
    for (const l of across) {
      const r = box(l);
      const line = box(document.querySelector(`[data-gx="${l.dataset.gxLabel}"]`));
      worstLine = Math.max(worstLine, Math.abs(r.x + r.width / 2 - line.x));
      const d = topEdge !== null ? topEdge - (r.y + r.height) : r.y - area.y; // gap to the grid edge, or from the area's top
      worstEdge = Math.max(worstEdge, d < -0.5 ? 99 : d);
    }
    for (const l of down) {
      const r = box(l);
      const line = box(document.querySelector(`[data-gy="${l.dataset.gyLabel}"]`));
      worstLine = Math.max(worstLine, Math.abs(r.y + r.height / 2 - line.y));
      const d = leftEdge !== null ? leftEdge - (r.x + r.width) : r.x - area.x;
      worstEdge = Math.max(worstEdge, d < -0.5 ? 99 : d);
    }
    // Overlaps between neighbouring numbers on the same axis.
    const overlap = (ls, horizontal) =>
      ls
        .map(box)
        .sort((a, b) => (horizontal ? a.x - b.x : a.y - b.y))
        .some((r, i, arr) => i > 0 && (horizontal ? arr[i - 1].x + arr[i - 1].width > r.x : arr[i - 1].y + arr[i - 1].height > r.y));
    // Is any part of the grid in view? (A major line crossing the area.)
    const inView = [...document.querySelectorAll("[data-gx], [data-gy]")].some((e) => {
      const r = box(e);
      return r.x <= area.x + area.width && r.x + r.width >= area.x && r.y <= area.y + area.height && r.y + r.height >= area.y;
    });
    return {
      inView,
      n: across.length + down.length,
      across: across.map((l) => l.textContent),
      worstLine,
      worstEdge,
      topEdge: topEdge !== null,
      leftEdge: leftEdge !== null,
      overlaps: overlap(across, true) || overlap(down, false),
      zoom: document.querySelector("[aria-roledescription=map]").dataset.zoom,
    };
  });

async function verify(name) {
  const m = await measure();
  if (!m.inView) {
    check(`${name}: grid entirely off screen, so no numbers`, m.n === 0, `${m.n} numbers`);
    return m;
  }
  const edges = `${m.topEdge ? "grid top" : "area top"}, ${m.leftEdge ? "grid left" : "area left"}`;
  check(`${name}: every number within 1 px of its line`, m.n > 0 && m.worstLine <= 1, `${m.n} numbers, worst ${m.worstLine.toFixed(2)} px`);
  check(`${name}: numbers within 12 px of the edge (${edges})`, m.worstEdge <= 12, `worst ${m.worstEdge.toFixed(1)} px`);
  check(`${name}: no two numbers overlap`, !m.overlaps);
  return m;
}
const drag = async (dx, dy) => {
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.mouse.down();
  await page.mouse.move(rect.x + rect.width / 2 + dx, rect.y + rect.height / 2 + dy, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(200);
};
const zoomIn = async (n) => {
  for (let i = 0; i < n; i++) {
    await page.getByRole("button", { name: "Zoom in" }).click();
    await page.waitForTimeout(450);
  }
};

const m1 = await verify("1x");
check("1x: labels 0, 10, 20 ... 100 across", m1.across.join(",") === "0,10,20,30,40,50,60,70,80,90,100", m1.across.join(","));
await zoomIn(2);
await verify("4x centre");
await drag(4000, 4000);
await verify("4x dragged past the top-left corner");
await drag(-480, -560);
await verify("4x with the grid's top-left edges in view");
await drag(-8000, -8000);
await verify("4x dragged to the bottom-right corner");
await plot.focus();
await page.keyboard.press("0"); // reset to 1x, centred
await page.waitForTimeout(450);
await zoomIn(3);
await verify("8x centre");

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(failed ? `${failed} failed` : `grid label checks: all ${results.length} pass`);
process.exit(failed ? 1 : 0);
