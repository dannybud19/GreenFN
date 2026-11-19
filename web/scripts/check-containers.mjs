// Fixed container sizes (Phase 7c item 4).
//   node scripts/check-containers.mjs [baseUrl]
// The map bento, GREENFN block, right panel, search box and team dropdown must have identical x, y, width and
// height in every state, at 1440 x 900, in both themes. Player names must stay on one line.
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:3100";
const BOXES = ["map", "brand", "panel", "search", "team"];

async function ready(page, path) {
  await page.goto(base + path, { waitUntil: "networkidle" });
  await page.waitForFunction(() => !document.body.innerText.includes("Loading the map"));
  await page.waitForTimeout(700);
}

const browser = await chromium.launch();
const players = await (await fetch(base + "/data/players.json")).json();
const longest = players.reduce((a, p) => (p.name.length > a.name.length ? p : a));

const STATES = [
  ["Start screen", (p) => ready(p, "/")],
  ["Michael Jordan", (p) => ready(p, "/player/jordami01")],
  ["Shai Gilgeous-Alexander", (p) => ready(p, "/player/gilgesh01")],
  ["Anfernee Simons", (p) => ready(p, "/player/simonan01")],
  [`Longest name: ${longest.name} (${longest.name.length})`, (p) => ready(p, `/player/${longest.id}`)],
  [
    "Chicago Bulls team view",
    async (p) => {
      await ready(p, "/");
      await p.selectOption("#team-select", "CHI");
      await p.waitForTimeout(700);
    },
  ],
  [
    "Region colour mode",
    async (p) => {
      await ready(p, "/player/jordami01");
      await p.getByRole("radio", { name: "Region" }).click();
      await p.waitForTimeout(600);
    },
  ],
  [
    "Jordan, career playback running",
    async (p) => {
      await ready(p, "/player/jordami01");
      await p.locator("[data-play-button]").click();
      await p.waitForTimeout(3200);
    },
  ],
  [
    "Jordan, playback paused on the last season",
    async (p) => {
      await ready(p, "/player/jordami01");
      await p.locator("[data-play-button]").click();
      await p.waitForTimeout(200);
      await p.locator("[data-play-button]").click();
      for (let i = 0; i < 13; i++) await p.getByRole("button", { name: "Next season" }).click();
      await p.waitForTimeout(800);
    },
  ],
  [
    "Search focused with text",
    async (p) => {
      await ready(p, "/");
      await p.fill("#player-search", "Giannis Antetokounmpo");
      await p.waitForTimeout(400);
    },
  ],
];

let failures = 0;
for (const theme of ["light", "dark"]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: theme });
  const page = await ctx.newPage();
  let ref = null;
  for (const [name, run] of STATES) {
    await run(page);
    const boxes = {};
    for (const b of BOXES) boxes[b] = await page.locator(`[data-box=${b}]`).first().boundingBox();
    const nameLine = await page.evaluate(() => {
      const h = document.querySelector("h2[data-fit-size]");
      if (!h) return null;
      return { size: +h.dataset.fitSize, height: h.getBoundingClientRect().height, truncated: h.scrollWidth > h.clientWidth, title: h.title };
    });
    ref ??= boxes;
    const diffs = BOXES.filter((b) => ["x", "y", "width", "height"].some((k) => Math.abs(boxes[b][k] - ref[b][k]) > 0.01));
    const nameOk = !nameLine || (nameLine.height === 33 && nameLine.title.length > 0);
    const ok = diffs.length === 0 && nameOk;
    if (!ok) failures++;
    console.log(
      `${ok ? "ok  " : "FAIL"} ${theme.padEnd(5)} ${name.padEnd(44)} ${diffs.length ? `changed: ${diffs.join(", ")}` : "all 5 containers identical"}` +
        (nameLine ? `  name ${nameLine.size}px, one line${nameLine.truncated ? ", truncated" : ""}` : ""),
    );
  }
  if (theme === "light") console.log(`  boxes: ${BOXES.map((b) => `${b} ${ref[b].x},${ref[b].y} ${ref[b].width}x${ref[b].height}`).join(" | ")}`);
  await ctx.close();
}
await browser.close();
console.log(failures ? `${failures} failures` : "Container sizes: identical in every state, both themes");
process.exit(failures ? 1 : 0);
