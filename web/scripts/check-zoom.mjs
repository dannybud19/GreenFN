// Map pan and zoom checks in a real browser (Phase 7c item 2).
//   node scripts/check-zoom.mjs [baseUrl]
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:3100";
const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail ? `  (${detail})` : ""}`);
};
const browser = await chromium.launch();

async function open(ctxOpts = {}, path = "/player/jordami01") {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...ctxOpts });
  const page = await ctx.newPage();
  await page.goto(base + path, { waitUntil: "networkidle" });
  await page.waitForFunction(() => !document.body.innerText.includes("Loading the map"));
  await page.waitForTimeout(900);
  const plot = page.locator("[aria-roledescription=map]");
  const rect = await plot.boundingBox();
  return { ctx, page, plot, rect };
}
const zoomOf = (plot) => plot.getAttribute("data-zoom").then(Number);
// Position of the first red (selected) season dot and the leader line start, in page coordinates.
const redDot = (page) =>
  page.evaluate(() => {
    const c = [...document.querySelectorAll("circle")].find((e) => e.getAttribute("fill") === "var(--red)");
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });

{
  const { ctx, page, plot, rect } = await open();
  const dot = await redDot(page);

  // Wheel over a selected dot zooms around it, and the page does not scroll.
  await page.mouse.move(Math.round(dot.x), Math.round(dot.y));
  const scrollBefore = await page.evaluate(() => [window.scrollY, document.scrollingElement.scrollTop]);
  for (let i = 0; i < 6; i++) await page.mouse.wheel(0, -120);
  await page.waitForTimeout(300);
  const z1 = await zoomOf(plot);
  const dotAfter = await redDot(page);
  const scrollAfter = await page.evaluate(() => [window.scrollY, document.scrollingElement.scrollTop]);
  check("wheel zooms in", z1 > 1.5, `zoom ${z1}`);
  // The pointer sits at whole pixels, so the dot starts a fraction of a pixel away; zooming around the pointer
  // scales that offset by the zoom and nothing more.
  const pointer = { x: Math.round(dot.x), y: Math.round(dot.y) };
  const off0 = Math.hypot(dot.x - pointer.x, dot.y - pointer.y);
  const off1 = Math.hypot(dotAfter.x - pointer.x, dotAfter.y - pointer.y);
  check("wheel zooms around the pointer (the point under it stays put)", Math.abs(off1 - off0 * z1) < 1, `offset ${off0.toFixed(2)} px -> ${off1.toFixed(2)} px at ${z1}x`);
  check("wheel over the map does not scroll the page", JSON.stringify(scrollBefore) === JSON.stringify(scrollAfter));

  // ctrlKey wheel (macOS trackpad pinch) zooms too.
  const z1b = await zoomOf(plot);
  await page.keyboard.down("Control");
  await page.mouse.wheel(0, 40);
  await page.keyboard.up("Control");
  await page.waitForTimeout(200);
  check("ctrl+wheel (trackpad pinch) zooms", (await zoomOf(plot)) < z1b, `${z1b} -> ${await zoomOf(plot)}`);

  // Leader line, red dots and name tag stay attached at this zoom.
  const attached = await page.evaluate(() => {
    const line = [...document.querySelectorAll("line")].find((l) => l.getAttribute("stroke") === "var(--ink)");
    const reds = [...document.querySelectorAll("circle")].filter((e) => e.getAttribute("fill") === "var(--red)");
    const ok = reds.some((c) => Math.abs(+c.getAttribute("cx") - +line.getAttribute("x1")) < 0.01 && Math.abs(+c.getAttribute("cy") - +line.getAttribute("y1")) < 0.01);
    return ok;
  });
  check("name tag leader stays on the selected season while zoomed", attached);

  // Drag past 4 px pans 1:1 and does not select anything.
  const url = page.url();
  const before = await redDot(page);
  await page.mouse.move(rect.x + 200, rect.y + 200);
  await page.mouse.down();
  await page.mouse.move(rect.x + 260, rect.y + 230, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(150);
  const after = await redDot(page);
  check("drag pans the map 1:1", Math.abs(after.x - before.x - 60) < 1.5 && Math.abs(after.y - before.y - 30) < 1.5, `dx ${(after.x - before.x).toFixed(1)}, dy ${(after.y - before.y).toFixed(1)}`);
  check("a drag is not a click (selection unchanged)", page.url() === url);

  // Buttons zoom around the centre, value updates; 0 resets to 1x centred.
  await page.keyboard.press("Escape");
  await plot.focus();
  await page.keyboard.press("0");
  await page.waitForTimeout(450);
  check("0 resets to 1x", (await zoomOf(plot)) === 1);
  await page.getByRole("button", { name: "Zoom in" }).click();
  await page.waitForTimeout(450);
  const zb = await zoomOf(plot);
  const label = await page.locator("[data-box=zoom] button").nth(1).innerText();
  check("+ button zooms one step with easing and the value updates", zb === 2 && label.startsWith("2.0"), `zoom ${zb}, label ${label}`);
  await page.locator("[data-box=zoom] button").nth(1).dblclick();
  await page.waitForTimeout(450);
  check("double-clicking the value resets to 1x", (await zoomOf(plot)) === 1);

  // Double-click on the map zooms in one step around the pointer.
  await page.mouse.dblclick(rect.x + rect.width * 0.3, rect.y + rect.height * 0.6);
  await page.waitForTimeout(500);
  check("double-click zooms in one step", (await zoomOf(plot)) === 2, `zoom ${await zoomOf(plot)}`);

  // Zoom range capped at 8x; labels for off-screen columns are hidden.
  for (let i = 0; i < 40; i++) await page.mouse.wheel(0, -200);
  await page.waitForTimeout(300);
  const zmax = await zoomOf(plot);
  const labels = await page.evaluate(() => [...document.querySelectorAll("[aria-hidden=true] > span.text-axis")].length);
  check("zoom capped at 8x", zmax === 8, `zoom ${zmax}`);
  check("off-screen grid labels hidden", labels < 14, `${labels} of 14 labels shown`);

  // Panning is clamped: drag very far, dots still in view.
  await page.mouse.move(rect.x + 400, rect.y + 300);
  await page.mouse.down();
  await page.mouse.move(rect.x + 400 + 5000, rect.y + 300 + 5000, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(200);
  const tf = await plot.evaluate((e) => ({ k: +e.dataset.zoom, x: +e.dataset.tx, y: +e.dataset.ty }));
  const covers = tf.x <= 0.01 && tf.x >= rect.width * (1 - tf.k) - 0.01 && tf.y <= 0.01 && tf.y >= rect.height * (1 - tf.k) - 0.01;
  check("panning is limited: the 1x frame still covers the map", covers, JSON.stringify(tf));

  // A short click (under 4 px) still selects the season under it.
  await page.keyboard.press("0");
  await page.waitForTimeout(450);
  const target = await page.evaluate(() => {
    const c = document.querySelector("[aria-roledescription=map] canvas");
    const r = c.getBoundingClientRect();
    const ctx = c.getContext("2d");
    const s = c.width / r.width;
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    for (let y = Math.floor(c.height * 0.55); y < c.height; y += 3)
      for (let x = Math.floor(c.width * 0.2); x < c.width; x += 3) if (d[(y * c.width + x) * 4 + 3] > 0) return { x: r.x + x / s, y: r.y + y / s };
    return null;
  });
  await page.mouse.move(target.x, target.y);
  await page.mouse.down();
  await page.mouse.move(target.x + 2, target.y + 1);
  await page.mouse.up();
  await page.waitForTimeout(500);
  check("a short click (2 px) selects the season under it", page.url() !== url, page.url().split("/").pop());
  await ctx.close();
}

{
  // Touch: one finger pans, two fingers pinch (CDP touch events on a phone-sized touch context).
  const { ctx, page, plot, rect } = await open({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const cdp = await ctx.newCDPSession(page);
  const touch = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts.map(([x, y], id) => ({ x, y, id })) });
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + 70; // the top of the plot: the lower part sits under the phone bottom sheet
  await touch("touchStart", [[cx - 20, cy], [cx + 20, cy]]);
  for (let i = 1; i <= 8; i++) await touch("touchMove", [[cx - 20 - i * 8, cy], [cx + 20 + i * 8, cy]]);
  await touch("touchEnd", []);
  await page.waitForTimeout(200);
  const zp = await zoomOf(plot);
  check("touch pinch zooms on a phone", zp > 2.5, `zoom ${zp}`);
  await ctx.close();
}

{
  // Reduced motion: button zoom jumps without easing.
  const { ctx, page, plot } = await open({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Zoom in" }).click();
  await page.waitForTimeout(60);
  check("reduced motion: button zoom jumps", (await zoomOf(plot)) === 2, `zoom after 60 ms ${await zoomOf(plot)}`);
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(failed ? `${failed} failed` : `zoom checks: all ${results.length} pass`);
process.exit(failed ? 1 : 0);
