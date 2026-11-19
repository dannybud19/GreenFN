// Career playback checks (Phase 7d section 2).
//   node scripts/check-playback.mjs [baseUrl]
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:3100";
const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail ? `  (${detail})` : ""}`);
};
const browser = await chromium.launch();

async function open(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...opts });
  const page = await ctx.newPage();
  await page.goto(base + "/player/jordami01", { waitUntil: "networkidle" });
  await page.waitForFunction(() => !document.body.innerText.includes("Loading the map"));
  await page.waitForTimeout(800);
  return { ctx, page };
}
const state = (page) =>
  page.evaluate(() => {
    const b = document.querySelector("[data-box=playback]");
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return {
      count: b.querySelector(".tabular-nums.text-muted")?.textContent ?? "",
      prevDisabled: b.querySelector("[aria-label='Previous season']").disabled,
      nextDisabled: b.querySelector("[aria-label='Next season']").disabled,
      badges: [...b.querySelectorAll("[data-badge]")].map((e) => e.dataset.badge),
      labels: [...b.querySelectorAll("[data-stat] .sr-only")].map((e) => e.textContent),
      height: r.height,
      reds: document.querySelectorAll("circle[data-season]").length,
      zoom: +document.querySelector("[aria-roledescription=map]").dataset.zoom,
      tag: !!document.querySelector("[data-name-tag]"),
    };
  });

{
  const { ctx, page } = await open();
  await page.locator("[data-play-button]").click();
  await page.waitForTimeout(150);
  let s = await state(page);
  check("Play career shows the bar on the first season", s && s.count === "01/14", s?.count);
  check("first season: ‹ disabled, no badges", s.prevDisabled && s.badges.length === 0, JSON.stringify(s.badges));
  check("only the first season is on the map", s.reds === 1, `${s.reds} red dots`);
  check("the bar is one slim line", s.height <= 44, `${s.height} px`);
  await page.waitForTimeout(400);
  check("no name tag during playback (after its fade)", !(await state(page)).tag);
  await page.waitForTimeout(400);
  s = await state(page);
  check("the map zooms to fit his career (more than 1x, at most 4x)", s.zoom > 1 && s.zoom <= 4, `zoom ${s.zoom}`);
  check("seasons advance every 900 ms", s.count === "02/14", s.count);
  check("pause label while playing", (await page.locator("[data-play-button]").innerText()).includes("Pause"));
  await page.waitForTimeout(900 * 5);
  await page.locator("[data-play-button]").click(); // pause
  await page.waitForTimeout(300); // last season's badges finish fading out (100 ms)
  s = await state(page);
  check("pause stops playback mid-career", (await page.locator("[data-play-button]").innerText()).includes("Play"), s.count);
  const later = await state(page);
  await page.waitForTimeout(1200);
  check("paused: the season does not advance", (await state(page)).count === later.count);
  check("badges show for later seasons", s.badges.length === 3, JSON.stringify(s.badges));
  check("each stat has a full screen-reader label", s.labels.every((l) => /from last season$/.test(l)), s.labels.join(" | "));
  // Step through to find a mix of up and down badges, then to the last season.
  let mixed = false;
  for (let k = 0; k < 14; k++) {
    const t = await state(page);
    if (t.badges.includes("up") && t.badges.includes("down")) mixed = true;
    if (t.nextDisabled) break;
    await page.getByRole("button", { name: "Next season" }).click();
    await page.waitForTimeout(120);
  }
  s = await state(page);
  check("some season shows a mix of up and down badges", mixed);
  check("last season: › disabled, label Replay", s.count === "14/14" && s.nextDisabled && (await page.locator("[data-play-button]").innerText()).includes("Replay"), s.count);
  check("disabled arrows are skipped by the keyboard", await page.getByRole("button", { name: "Next season" }).evaluate((b) => b.disabled && b.tabIndex >= -1));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(900);
  s = await state(page);
  const zoom = await page.locator("[aria-roledescription=map]").getAttribute("data-zoom");
  check("Esc stops playback and restores the normal view", s === null && zoom === "1.00", `zoom ${zoom}`);
  const tagBack = await page.evaluate(() => !!document.querySelector("[data-name-tag]") && document.querySelectorAll("circle[data-season]").length === 14);
  check("normal view: all 14 seasons and the name tag are back", tagBack);
  await ctx.close();
}

{
  // Switching player while playing restarts for the new player; Clear stops.
  const { ctx, page } = await open();
  await page.locator("[data-play-button]").click();
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: /Kobe Bryant/ }).first().click();
  await page.waitForTimeout(500); // let the why card finish opening
  await page.getByRole("button", { name: /Open Kobe Bryant/ }).click();
  await page.waitForFunction(() => document.querySelector("[data-box=playback]")?.innerText.toUpperCase().includes("KOBE"), null, { timeout: 5000 });
  const s = await state(page);
  check("switching player restarts playback for the new player (from his first seasons)", /^0[1-3]\/19$/.test(s.count), s?.count);
  await page.getByRole("button", { name: /Clear/ }).click();
  await page.waitForTimeout(300);
  check("Clear stops playback", (await state(page)) === null);
  await ctx.close();
}

{
  // Reduced motion: one season every 250 ms, no pulse.
  const { ctx, page } = await open({ reducedMotion: "reduce" });
  await page.locator("[data-play-button]").click();
  await page.waitForTimeout(1100);
  const s = await state(page);
  const pulse = await page.evaluate(() => [...document.querySelectorAll("circle")].some((c) => !c.dataset.season && c.getAttribute("fill") === "var(--red)"));
  check("reduced motion: 250 ms per season", +s.count.split("/")[0] >= 4, s.count);
  check("reduced motion: no pulse", !pulse);
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(failed ? `${failed} failed` : `playback checks: all ${results.length} pass`);
process.exit(failed ? 1 : 0);
