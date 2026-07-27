import { mkdir, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const TEMP = path.join(ROOT, ".tmp-portfolio");
const CHROME =
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PAGE_URL =
  "file:///C:/_HK/workspace/harutodo/docs/portfolio/site/index.html";

const viewports = [
  { name: "desktop", width: 1440, height: 1000, mobile: false, hash: "" },
  { name: "tablet", width: 768, height: 960, mobile: false, hash: "" },
  { name: "mobile", width: 375, height: 812, mobile: true, hash: "" },
  {
    name: "desktop-product",
    width: 1440,
    height: 1000,
    mobile: false,
    hash: "#product",
  },
  {
    name: "mobile-product",
    width: 375,
    height: 812,
    mobile: true,
    hash: "#product",
  },
  {
    name: "desktop-calendar",
    width: 1440,
    height: 1000,
    mobile: false,
    hash: "#product",
    slideIndex: 4,
  },
  {
    name: "desktop-calendar-create",
    width: 1440,
    height: 1000,
    mobile: false,
    hash: "#product",
    slideIndex: 5,
  },
  {
    name: "desktop-calendar-location-search",
    width: 1440,
    height: 1000,
    mobile: false,
    hash: "#product",
    slideIndex: 6,
  },
  {
    name: "desktop-calendar-location-selected",
    width: 1440,
    height: 1000,
    mobile: false,
    hash: "#product",
    slideIndex: 7,
  },
  {
    name: "mobile-calendar-location-selected",
    width: 375,
    height: 812,
    mobile: true,
    hash: "#product",
    slideIndex: 7,
  },
  {
    name: "desktop-mypage",
    width: 1440,
    height: 1000,
    mobile: false,
    hash: "#product",
    slideIndex: 8,
  },
  {
    name: "mobile-mypage",
    width: 375,
    height: 812,
    mobile: true,
    hash: "#product",
    slideIndex: 8,
  },
  {
    name: "desktop-carousel-controls",
    width: 1440,
    height: 1000,
    mobile: false,
    hash: "#product-carousel-controls",
  },
  {
    name: "mobile-carousel-controls",
    width: 375,
    height: 812,
    mobile: true,
    hash: "#product-carousel-controls",
  },
  {
    name: "desktop-feedback",
    width: 1440,
    height: 1000,
    mobile: false,
    hash: "#feedback",
  },
  {
    name: "mobile-feedback",
    width: 375,
    height: 812,
    mobile: true,
    hash: "#feedback",
  },
  {
    name: "mobile-problem",
    width: 375,
    height: 812,
    mobile: true,
    hash: "#problem",
  },
  {
    name: "desktop-ai-process",
    width: 1440,
    height: 1000,
    mobile: false,
    hash: "#ai-process",
  },
  {
    name: "mobile-ai-process",
    width: 375,
    height: 812,
    mobile: true,
    hash: "#ai-process",
  },
  {
    name: "desktop-ai-workflow",
    width: 1440,
    height: 1000,
    mobile: false,
    hash: "#ai-workflow",
  },
  {
    name: "mobile-ai-workflow",
    width: 375,
    height: 812,
    mobile: true,
    hash: "#ai-workflow",
  },
  {
    name: "desktop-ai-evidence",
    width: 1440,
    height: 1000,
    mobile: false,
    hash: "#ai-evidence",
  },
  {
    name: "mobile-ai-evidence",
    width: 375,
    height: 812,
    mobile: true,
    hash: "#ai-evidence",
  },
  {
    name: "mobile-decisions",
    width: 375,
    height: 812,
    mobile: true,
    hash: "#decisions",
  },
  {
    name: "mobile-architecture",
    width: 375,
    height: 812,
    mobile: true,
    hash: "#architecture",
  },
  {
    name: "mobile-cases",
    width: 375,
    height: 812,
    mobile: true,
    hash: "#cases",
  },
  {
    name: "desktop-naver-case",
    width: 1440,
    height: 1000,
    mobile: false,
    hash: "#case-naver",
  },
  {
    name: "mobile-naver-case",
    width: 375,
    height: 812,
    mobile: true,
    hash: "#case-naver",
  },
  {
    name: "desktop-widget-case",
    width: 1440,
    height: 1000,
    mobile: false,
    hash: "#case-widget",
  },
  {
    name: "mobile-widget-case",
    width: 375,
    height: 812,
    mobile: true,
    hash: "#case-widget",
  },
  {
    name: "mobile-reflection",
    width: 375,
    height: 812,
    mobile: true,
    hash: "#reflection",
  },
];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForJson(url, timeoutMs = 15_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch {}
    await delay(150);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function createCdp(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  let sequence = 0;
  const pending = new Map();
  const opened = new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  });

  return {
    async send(method, params = {}) {
      await opened;
      const id = ++sequence;
      const result = new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
      });
      socket.send(JSON.stringify({ id, method, params }));
      return result;
    },
    close() {
      socket.close();
    },
  };
}

async function render(viewport, index) {
  const profile = path.join(TEMP, `layout-${viewport.name}-profile`);
  const screenshot = path.join(TEMP, `layout-${viewport.name}.png`);
  const debugPort = 9230 + index;
  await rm(profile, { recursive: true, force: true });

  const chrome = spawn(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-first-run",
      "--allow-file-access-from-files",
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${profile}`,
      "about:blank",
    ],
    { stdio: "ignore", windowsHide: true }
  );

  let cdp;
  try {
    const targets = await waitForJson(
      `http://127.0.0.1:${debugPort}/json/list`
    );
    const page = targets.find((target) => target.type === "page");
    if (!page?.webSocketDebuggerUrl) throw new Error("Page target missing");
    cdp = createCdp(page.webSocketDebuggerUrl);
    await cdp.send("Page.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
      mobile: viewport.mobile,
    });
    await cdp.send("Page.navigate", { url: `${PAGE_URL}${viewport.hash}` });
    await delay(1000);
    if (viewport.hash) {
      const scrollBlock =
        viewport.hash === "#product-carousel-controls" ? "center" : "start";
      await cdp.send("Runtime.evaluate", {
        expression: `document.querySelector(${JSON.stringify(
          viewport.hash
        )})?.scrollIntoView({ behavior: "instant", block: "${scrollBlock}" })`,
      });
      await delay(250);
    }
    if (Number.isInteger(viewport.slideIndex)) {
      await cdp.send("Runtime.evaluate", {
        expression: `document.querySelector('[data-index="${viewport.slideIndex}"]')?.click()`,
      });
      await delay(250);
    }
    const result = await cdp.send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: false,
    });
    await import("node:fs/promises").then(({ writeFile }) =>
      writeFile(screenshot, Buffer.from(result.data, "base64"))
    );
  } finally {
    cdp?.close();
    chrome.kill();
    await delay(250);
    await rm(profile, { recursive: true, force: true }).catch(() => {});
  }
}

await mkdir(TEMP, { recursive: true });
for (const [index, viewport] of viewports.entries()) {
  await render(viewport, index);
}

console.log(
  JSON.stringify({
    rendered: viewports.map(({ name, width, height }) => ({
      name,
      width,
      height,
      file: `.tmp-portfolio/layout-${name}.png`,
    })),
  })
);
