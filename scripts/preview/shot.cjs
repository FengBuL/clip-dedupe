// node shot.cjs '[{"theme":"light","w":1200,"q":"?scene=groups","out":"/tmp/a.png"}]'
const puppeteer = require((process.env.PREVIEW_DEPS || "/tmp/cdprev") + "/node_modules/puppeteer-core");
const path = require("path");
const OUT = path.join(__dirname, "..", "..", ".preview-build");
(async () => {
  const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox", "--allow-file-access-from-files", "--font-render-hinting=none"] });
  for (const j of JSON.parse(process.argv[2])) {
    const p = await b.newPage();
    p.on("console", (m) => { if (m.type() !== "log") console.log("console", m.type(), m.text()); });
    p.on("pageerror", (e) => console.log("pageerror", e.message));
    await p.setViewport({ width: j.w, height: j.h || 900, deviceScaleFactor: j.dpr || 2, isMobile: !!j.mobile, hasTouch: !!j.mobile });
    await p.goto(`file://${OUT}/${j.theme}.html${j.q || ""}`);
    await p.waitForFunction("window.__ready || window.__err", { timeout: 15000 });
    const err = await p.evaluate("window.__err");
    if (err) console.log("ERR", err);
    await new Promise((r) => setTimeout(r, 300));
    if (j.full) {
      const h = await p.evaluate(() => { const v = document.querySelector(".view-content"); v.style.height = "auto"; v.style.overflow = "visible"; return Math.min(document.documentElement.scrollHeight, 6000); });
      await p.setViewport({ width: j.w, height: h, deviceScaleFactor: j.dpr || 2, isMobile: !!j.mobile, hasTouch: !!j.mobile });
      await new Promise((r) => setTimeout(r, 300));
    }
    if (j.hover) {
      const el = await p.$(j.hover);
      const box = await el.boundingBox();
      await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await new Promise((r) => setTimeout(r, 500));
    }
    const overflow = await p.evaluate(() => { const out = []; const W = document.documentElement.clientWidth; document.querySelectorAll(".cd-root *").forEach((e) => { const r = e.getBoundingClientRect(); if (r.right > W + 1 && r.width > 0 && !e.closest(".cd-help-pop")) out.push((e.className.baseVal ?? e.className) + ":" + Math.round(r.right)); }); return out.slice(0, 8); });
    if (overflow.length) console.log(j.out, "OVERFLOW", overflow);
    await p.screenshot({ path: j.out });
    console.log("saved", j.out);
    await p.close();
  }
  await b.close();
})();
