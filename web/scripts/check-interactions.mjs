// Interaction checks in a real browser: lambda reorders comps and resets, theme toggle persists, /map redirects.
//   node scripts/check-interactions.mjs [baseUrl]

import { chromium } from "playwright";
const base = process.argv[2] ?? "http://localhost:3100";
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = []; p.on("pageerror", (e) => errs.push(e.message));
await p.goto(base + "/player/jordami01", { waitUntil: "networkidle" });
const names = () => p.$$eval("[aria-controls^='why-']", (els) => els.map((e) => e.querySelector("span:nth-child(2)").textContent));
const before = await names();
await p.locator("#lambda").fill("1");
await p.waitForTimeout(1500);
const after = await names();
await p.getByRole("button", { name: "Back to default" }).click(); await p.waitForTimeout(800);
const reset = await names();
await p.getByRole("switch", { name: "Dark theme" }).click(); await p.waitForTimeout(400);
const theme = await p.evaluate(() => [document.documentElement.dataset.theme, localStorage.getItem("greenfn-theme")]);
await p.reload({ waitUntil: "networkidle" });
const persisted = await p.evaluate(() => document.documentElement.dataset.theme);
await p.goto(base + "/map"); const red = p.url();
console.log(JSON.stringify({ before, after, sameAsBefore: JSON.stringify(reset) === JSON.stringify(before), theme, persisted, red, errs }, null, 1));
await b.close();
