// KEY and zoom layout check (Phase 7c item 1).
//   node scripts/check-key-layout.mjs [baseUrl]
// For Decade, Position and Region, with and without a team, at 1440, 1280 and 1024 wide: the zoom control stays
// at the same place, the KEY ends at least 16 px left of it, and both sit on the bottom row.
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:3100";
const box = (page, sel) => page.locator(sel).first().boundingBox();
const browser = await chromium.launch();
let failures = 0;

for (const width of [1440, 1280, 1024]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.waitForFunction(() => !document.body.innerText.includes("Loading the map"));
  let zoomRef = null;
  for (const team of [null, "CHI"]) {
    await page.selectOption("#team-select", team ?? "");
    for (const mode of ["Decade", "Position", "Region"]) {
      await page.getByRole("radio", { name: mode }).click();
      await page.waitForTimeout(450);
      const key = await box(page, "[data-box=key]");
      const zoom = await box(page, "[data-box=zoom]");
      const row = await box(page, "[data-box=map-bottom]");
      zoomRef ??= zoom;
      const gap = zoom.x - (key.x + key.width);
      const same = ["x", "y", "width", "height"].every((k) => Math.abs(zoom[k] - zoomRef[k]) < 0.5);
      const bottoms = Math.abs(key.y + key.height - (row.y + row.height)) < 0.5 && Math.abs(zoom.y + zoom.height - (row.y + row.height)) < 0.5;
      const ok = gap >= 15.5 && same && bottoms;
      if (!ok) failures++;
      console.log(
        `${ok ? "ok  " : "FAIL"} ${width} ${mode.padEnd(8)} team=${team ?? "none"}  key ${Math.round(key.width)}x${Math.round(key.height)}  gap ${gap.toFixed(1)}  zoom ${same ? "fixed" : "MOVED"}  bottoms ${bottoms ? "aligned" : "OFF"}`,
      );
    }
  }
  await page.close();
}
await browser.close();
console.log(failures ? `${failures} failures` : "KEY layout: all pass");
process.exit(failures ? 1 : 0);
