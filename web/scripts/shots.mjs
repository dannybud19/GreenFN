// Screenshots of the dashboard states with Playwright (phase7b_plan.md section 8).
//   node scripts/shots.mjs [baseUrl] [outDir] [only]
// Saves <state>-<theme>.png for each state at 1440 x 900, plus a phone view at 390 x 844.
import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:3100";
const out = path.resolve(process.argv[3] ?? "../notes/design/built");
const only = process.argv[4];
mkdirSync(out, { recursive: true });

const settle = (page, ms = 1200) => page.waitForTimeout(ms);

async function ready(page, url) {
  await page.goto(base + url, { waitUntil: "networkidle" });
  await page.waitForFunction(() => !document.body.innerText.includes("Loading the map"));
  await settle(page);
}

const STATES = {
  start: async (page) => ready(page, "/"),
  legends: async (page) => {
    await ready(page, "/");
    await page.getByRole("tab", { name: "Legends" }).click();
    await settle(page, 600);
  },
  team: async (page) => {
    await ready(page, "/");
    await page.selectOption("#team-select", "CHI");
    await settle(page, 1200);
  },
  player: async (page) => {
    await ready(page, "/");
    await page.fill("#player-search", "Michael Jor");
    await settle(page, 400);
    await page.keyboard.press("Enter");
    await settle(page, 1800);
  },
  comp: async (page) => {
    await ready(page, "/player/jordami01");
    await page.getByRole("button", { name: /Kobe Bryant/ }).click();
    await settle(page, 1200);
    await page.locator("[data-why-scroll]").evaluate((el) => (el.scrollTop = 60));
    await settle(page, 500);
  },
  "region-key": async (page) => {
    await ready(page, "/");
    await page.getByRole("radio", { name: "Region" }).click();
    await settle(page, 700);
  },
  "zoom-4x-jordan": async (page) => {
    await ready(page, "/player/jordami01");
    // Double-click the middle of his seasons twice: 1x to 2x to 4x around them.
    const c = await page.evaluate(() => {
      const r = [...document.querySelectorAll("circle")].filter((e) => e.getAttribute("fill") === "var(--red)").map((e) => e.getBoundingClientRect());
      return { x: r.reduce((a, q) => a + q.x + q.width / 2, 0) / r.length, y: r.reduce((a, q) => a + q.y + q.height / 2, 0) / r.length };
    });
    await page.mouse.dblclick(c.x, c.y);
    await settle(page, 600);
    await page.mouse.dblclick(c.x, c.y);
    await settle(page, 900);
    await page.mouse.move(2, 2);
    await settle(page, 400);
  },
  "long-name": async (page) => {
    await ready(page, "/player/alexani01");
  },
  "search-focused": async (page) => {
    await ready(page, "/");
    await page.keyboard.press("Tab");
    await page.keyboard.type("Shai");
    await settle(page, 600);
  },
  about: async (page) => {
    await ready(page, "/player/jordami01");
    await page.getByRole("button", { name: "About GreenFN" }).click();
    await settle(page, 700);
  },
};

const browser = await chromium.launch();
const reduce = process.env.REDUCED === "1";
for (const theme of ["light", "dark"]) {
  for (const [name, run] of Object.entries(STATES)) {
    if (only && !only.split(",").includes(name)) continue;
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: theme, reducedMotion: reduce ? "reduce" : "no-preference" });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await run(page);
    const file = path.join(out, `${name}-${theme}${reduce ? "-reduced" : ""}.png`);
    await page.screenshot({ path: file });
    console.log(`${file}${errors.length ? `  ERRORS: ${errors.join(" | ")}` : ""}`);
    await ctx.close();
  }
  if (!only || only.includes("phone")) {
    for (const [name, url] of [["phone", "/player/jordami01"], ["phone-start", "/"]]) {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: theme, isMobile: true, hasTouch: true });
      const page = await ctx.newPage();
      await ready(page, url);
      const file = path.join(out, `${name}-${theme}.png`);
      await page.screenshot({ path: file });
      console.log(file);
      await ctx.close();
    }
  }
}
await browser.close();
