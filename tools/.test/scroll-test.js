// Headless scroll-snap verification against the local server.
// Uses installed Edge via playwright-core (no browser download needed).
const { chromium } = require("playwright-core");

(async () => {
  const browser = await chromium.launch({
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE ERR:", m.text()); });
  page.on("pageerror", (e) => console.log("PAGE ERR:", e.message));

  await page.goto("http://127.0.0.1:8932/", { waitUntil: "load" });
  await page.waitForTimeout(1200);

  const stops = await page.evaluate(() => window.__homeStops || null);
  console.log("stops:", stops);

  // simulate wheel flick down and wait for the carry to settle
  async function flick(dir) {
    await page.evaluate((d) => {
      window.dispatchEvent(new WheelEvent("wheel", { deltaY: d * 120, cancelable: true, bubbles: true }));
    }, dir);
    await page.waitForTimeout(1300); // carry lasts 850ms
    return page.evaluate(() => window.scrollY);
  }

  const y0 = await page.evaluate(() => window.scrollY);
  const y1 = await flick(1);
  const y2 = await flick(1);
  const y3 = await flick(1);
  const y4 = await flick(1);
  const y5 = await flick(1);
  const back = await flick(-1);

  console.log("scrollY sequence:", [y0, y1, y2, y3, y4, y5, "back->", back]);
  const advancing = y1 > y0 && y2 > y1 && y3 > y2;
  const reversible = back < y5;
  console.log(advancing && reversible ? "SCROLL: PASS" : "SCROLL: FAIL");

  await browser.close();
})().catch((e) => { console.error("FATAL", e.message); process.exit(1); });
