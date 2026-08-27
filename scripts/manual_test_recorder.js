/**
 * Headed browser with click / input / navigation logging for manual QA sessions.
 * Usage: node scripts/manual_test_recorder.js [path] [issueKey]
 * Env: BASE_URL from .env (loaded by caller). Optional LOGIN_EMAIL / LOGIN_PASSWORD.
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const startPath = process.argv[2] || "/";
const issueKey = process.argv[3] || "session";
const baseUrl = (process.env.BASE_URL || "https://preprod.os-hub.net").replace(/\/$/, "");
const sessionsDir = path.join(__dirname, "..", ".cursor", "sessions");
fs.mkdirSync(sessionsDir, { recursive: true });
const logPath = path.join(sessionsDir, `${issueKey}-steps.jsonl`);
fs.writeFileSync(logPath, "");

function log(event) {
  const row = { t: new Date().toISOString(), ...event };
  fs.appendFileSync(logPath, JSON.stringify(row) + "\n");
  console.log(JSON.stringify(row));
}

function labelOf(el) {
  if (!el) return "";
  const parts = [
    el.role,
    el.name,
    el.tag,
    el.id && `#${el.id}`,
    el.testId && `[data-testid=${el.testId}]`,
    el.href,
    el.text,
  ].filter(Boolean);
  return parts.join(" ").replace(/\s+/g, " ").trim().slice(0, 160);
}

async function attachRecorder(page) {
  await page.exposeBinding("__qaRecord", (_source, payload) => {
    log(payload);
  });

  await page.addInitScript(() => {
    const describe = (el) => {
      if (!el || el.nodeType !== 1) return null;
      const text = (el.innerText || el.textContent || "").trim().slice(0, 80);
      return {
        tag: el.tagName?.toLowerCase(),
        id: el.id || null,
        role: el.getAttribute("role") || el.tagName?.toLowerCase(),
        name:
          el.getAttribute("aria-label") ||
          el.getAttribute("name") ||
          el.getAttribute("placeholder") ||
          el.getAttribute("title") ||
          null,
        testId: el.getAttribute("data-testid") || null,
        href: el.href || el.getAttribute("href") || null,
        type: el.getAttribute("type") || null,
        text: text || null,
      };
    };

    const record = (type, el, extra = {}) => {
      try {
        window.__qaRecord({ type, target: describe(el), url: location.href, ...extra });
      } catch (_) {}
    };

    document.addEventListener(
      "click",
      (e) => {
        const el = e.target?.closest?.("a,button,input,select,textarea,[role='button'],[role='link'],[role='tab'],[role='menuitem']") || e.target;
        record("click", el);
      },
      true
    );

    document.addEventListener(
      "change",
      (e) => {
        const el = e.target;
        if (!el) return;
        const sensitive = /password|token|secret|passwd/i.test(
          `${el.type || ""} ${el.name || ""} ${el.id || ""}`
        );
        record("change", el, {
          value: sensitive ? "***" : String(el.value ?? "").slice(0, 120),
        });
      },
      true
    );
  });

  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) {
      log({ type: "navigate", url: frame.url() });
    }
  });
}

(async () => {
  process.env.PLAYWRIGHT_BROWSERS_PATH =
    process.env.PLAYWRIGHT_BROWSERS_PATH ||
    `${process.env.HOME}/Library/Caches/ms-playwright`;

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();
  await attachRecorder(page);

  const startUrl = startPath.startsWith("http") ? startPath : `${baseUrl}${startPath.startsWith("/") ? "" : "/"}${startPath}`;
  const loginEmail = process.env.LOGIN_EMAIL || "";
  const loginPassword = process.env.LOGIN_PASSWORD || "";

  log({ type: "session_start", url: startUrl, issueKey, logPath });

  if (loginEmail && loginPassword) {
    await page.goto(`${baseUrl}/auth/login`, { waitUntil: "domcontentloaded" });
    const accept = page.getByRole("button", { name: "ACCEPT" });
    if (await accept.isVisible().catch(() => false)) {
      await accept.click().catch(() => {});
    }
    await page.locator("#LOGIN_EMAIL").fill(loginEmail);
    await page.locator("#LOGIN_PASSWORD").fill(loginPassword);
    await Promise.all([
      page.waitForURL((url) => !url.pathname.includes("/auth/login"), { timeout: 30000 }),
      page.getByRole("button", { name: "LOG IN" }).click(),
    ]);
    await page.getByRole("button", { name: "My Account" }).waitFor({ timeout: 30000 });
    log({ type: "auto_login", email: loginEmail, url: page.url() });
  }

  await page.goto(startUrl, { waitUntil: "domcontentloaded" });
  log({ type: "ready", url: page.url(), logPath });
  console.error(`Recording to ${logPath}`);
  console.error("Close the browser window when done.");

  await new Promise((resolve) => {
    browser.on("disconnected", resolve);
  });
  log({ type: "session_end" });
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
