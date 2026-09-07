import { mkdir, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const TEMP = path.join(ROOT, ".tmp-portfolio");
const CHROME =
  process.env.PORTFOLIO_BROWSER_PATH ??
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PAGE_URL =
  "file:///C:/_HK/workspace/harutodo/docs/portfolio/site/index.html";

const viewports = [
  { name: "desktop", width: 1440, height: 1000, mobile: false, hash: "" },
  { name: "tablet", width: 768, height: 960, mobile: false, hash: "" },
  {
    name: "tablet-section-headings",
    width: 783,
    height: 960,
    mobile: false,
    hash: "#cases",
    expectSectionHeadingsSideBySide: true,
  },
  { name: "mobile", width: 375, height: 812, mobile: true, hash: "" },
  {
    name: "mobile-navigation",
    width: 375,
    height: 812,
    mobile: true,
    hash: "#product",
    openNavigation: true,
  },
  {
    name: "desktop-product",
    width: 1440,
    height: 1000,
    mobile: false,
    hash: "#product",
  },
  {
    name: "tablet-product-783",
    width: 783,
    height: 960,
    mobile: false,
    hash: "#product",
  },
  {
    name: "tablet-product-700",
    width: 700,
    height: 960,
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
    name: "desktop-product-image-dialog",
    width: 1440,
    height: 1000,
    mobile: false,
    hash: "#product",
    openImageDialog: true,
  },
  {
    name: "mobile-product-image-dialog",
    width: 375,
    height: 812,
    mobile: true,
    hash: "#product",
    openImageDialog: true,
  },
  {
    name: "desktop-carryover",
    width: 1440,
    height: 1000,
    mobile: false,
    hash: "#product",
    slideIndex: 2,
  },
  {
    name: "mobile-carryover",
    width: 375,
    height: 812,
    mobile: true,
    hash: "#product",
    slideIndex: 2,
  },
  {
    name: "desktop-calendar",
    width: 1440,
    height: 1000,
    mobile: false,
    hash: "#product",
    slideIndex: 3,
  },
  {
    name: "desktop-calendar-create",
    width: 1440,
    height: 1000,
    mobile: false,
    hash: "#product",
    slideIndex: 4,
  },
  {
    name: "desktop-calendar-location-search",
    width: 1440,
    height: 1000,
    mobile: false,
    hash: "#product",
    slideIndex: 5,
  },
  {
    name: "desktop-calendar-location-selected",
    width: 1440,
    height: 1000,
    mobile: false,
    hash: "#product",
    slideIndex: 6,
  },
  {
    name: "mobile-calendar-location-selected",
    width: 375,
    height: 812,
    mobile: true,
    hash: "#product",
    slideIndex: 6,
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
    name: "desktop-ai-stages",
    width: 1440,
    height: 1000,
    mobile: false,
    hash: "#ai-stages",
  },
  {
    name: "mobile-ai-stages",
    width: 375,
    height: 812,
    mobile: true,
    hash: "#ai-stages",
  },
  {
    name: "desktop-decisions",
    width: 1440,
    height: 1000,
    mobile: false,
    hash: "#decisions",
  },
  {
    name: "mobile-decisions",
    width: 375,
    height: 812,
    mobile: true,
    hash: "#decisions",
  },
  {
    name: "desktop-architecture",
    width: 1440,
    height: 1000,
    mobile: false,
    hash: "#architecture",
  },
  {
    name: "tablet-architecture",
    width: 783,
    height: 960,
    mobile: false,
    hash: "#architecture",
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
    name: "desktop-realtime-case",
    width: 1440,
    height: 1000,
    mobile: false,
    hash: "#case-realtime",
  },
  {
    name: "mobile-notifications-case",
    width: 375,
    height: 812,
    mobile: true,
    hash: "#case-notifications",
  },
  {
    name: "desktop-external-calendar-case",
    width: 1440,
    height: 1000,
    mobile: false,
    hash: "#case-external-calendar",
  },
  {
    name: "mobile-external-calendar-case",
    width: 375,
    height: 812,
    mobile: true,
    hash: "#case-external-calendar",
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
      ...(process.env.PORTFOLIO_DISABLE_BROWSER_SANDBOX === "1"
        ? ["--no-sandbox"]
        : []),
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
    if (viewport.openNavigation) {
      const navigationResult = await cdp.send("Runtime.evaluate", {
        expression: `(() => {
          document.querySelector('.nav-toggle')?.click();
          const header = document.querySelector('.site-header');
          const toggle = document.querySelector('.nav-toggle');
          return {
            open: header?.classList.contains('nav-open') ?? false,
            expanded: toggle?.getAttribute('aria-expanded') ?? null,
          };
        })()`,
        returnByValue: true,
      });
      if (
        !navigationResult.result.value.open ||
        navigationResult.result.value.expanded !== "true"
      ) {
        throw new Error(`Mobile navigation did not open at ${viewport.width}px`);
      }
      await delay(250);
    }
    if (viewport.openImageDialog) {
      const dialogResult = await cdp.send("Runtime.evaluate", {
        expression: `(() => {
          document.querySelector('.carousel-slide:not([hidden]) .carousel-visual')?.click();
          const dialog = document.querySelector('[data-image-dialog]');
          const image = dialog?.querySelector('[data-image-dialog-image]');
          return {
            open: dialog?.open ?? false,
            hasImage: Boolean(image?.getAttribute('src')),
            hasAlt: Boolean(image?.getAttribute('alt')),
          };
        })()`,
        returnByValue: true,
      });
      const dialogState = dialogResult.result.value;
      if (!dialogState.open || !dialogState.hasImage || !dialogState.hasAlt) {
        throw new Error(`Product image dialog did not open at ${viewport.width}px`);
      }
      await delay(250);
    }
    const pageAudit = await cdp.send("Runtime.evaluate", {
      expression: `(() => ({
        horizontalOverflow: document.documentElement.scrollWidth - window.innerWidth,
        missingButtonNames: Array.from(document.querySelectorAll('button')).filter(
          (button) => !button.textContent.trim() && !button.getAttribute('aria-label')
        ).length,
        missingNavTargets: Array.from(document.querySelectorAll('#portfolio-nav a[href^="#"]')).filter(
          (link) => !document.querySelector(link.getAttribute('href'))
        ).length,
        missingCarouselNames: Array.from(document.querySelectorAll('[data-index]')).filter(
          (button) => !button.getAttribute('aria-label')
        ).length,
        carouselArrowOverlaps: (() => {
          const visual = document.querySelector('.carousel-slide:not([hidden]) .carousel-visual');
          if (!visual) return 0;
          const visualRect = visual.getBoundingClientRect();
          return Array.from(document.querySelectorAll('.carousel-edge-arrow')).filter((arrow) => {
            const arrowRect = arrow.getBoundingClientRect();
            return !(
              arrowRect.right <= visualRect.left ||
              arrowRect.left >= visualRect.right ||
              arrowRect.bottom <= visualRect.top ||
              arrowRect.top >= visualRect.bottom
            );
          }).length;
        })(),
      }))()`,
      returnByValue: true,
    });
    const audit = pageAudit.result.value;
    if (audit.horizontalOverflow > 1) {
      throw new Error(
        `Horizontal overflow of ${audit.horizontalOverflow}px at ${viewport.width}px`,
      );
    }
    if (
      audit.missingButtonNames > 0 ||
      audit.missingNavTargets > 0 ||
      audit.missingCarouselNames > 0 ||
      audit.carouselArrowOverlaps > 0
    ) {
      throw new Error(
        `Accessibility audit failed at ${viewport.width}px: ${JSON.stringify(audit)}`,
      );
    }
    if (viewport.expectSectionHeadingsSideBySide) {
      const evaluation = await cdp.send("Runtime.evaluate", {
        expression: `(() => Array.from(document.querySelectorAll('.section-heading')).map((heading) => {
          const title = heading.querySelector('h2');
          const description = heading.querySelector(':scope > p');
          if (!title || !description) return { id: heading.closest('section')?.id ?? 'unknown', sideBySide: true, skipped: true };
          const titleRect = title.getBoundingClientRect();
          const descriptionRect = description.getBoundingClientRect();
          return {
            id: heading.closest('section')?.id ?? 'unknown',
            sideBySide: descriptionRect.left > titleRect.left + 24,
          };
        }))()`,
        returnByValue: true,
      });
      const failedHeadings = evaluation.result.value.filter(
        (heading) => !heading.sideBySide
      );
      if (failedHeadings.length > 0) {
        throw new Error(
          `Section headings are not side by side at ${viewport.width}px: ${failedHeadings
            .map((heading) => heading.id)
            .join(", ")}`
        );
      }
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
