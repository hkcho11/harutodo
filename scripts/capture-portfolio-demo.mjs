import { readFile, mkdir, writeFile, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const ROOT = process.cwd();
const PORT = 3000;
const DEBUG_PORT = 9223;
const BASE_URL = `http://localhost:${PORT}`;
const ASSET_DIR = path.join(ROOT, "docs", "portfolio", "assets");
const PROFILE_DIR = path.join(ROOT, ".tmp-portfolio", "chrome-profile");
const CHROME =
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForHttp(url, timeoutMs = 30_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await delay(300);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function waitForJson(url, timeoutMs = 15_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch {}
    await delay(200);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function createCdp(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  let sequence = 0;
  const pending = new Map();

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id) return;
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  });

  const opened = new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
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

async function evaluate(cdp, expression) {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? "Browser evaluation failed");
  }
  return result.result.value;
}

async function waitFor(cdp, expression, timeoutMs = 15_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await evaluate(cdp, expression)) return;
    await delay(180);
  }
  throw new Error(`Browser condition timed out: ${expression}`);
}

async function waitForSplashToFinish(cdp) {
  await waitFor(
    cdp,
    `![...document.querySelectorAll("div.fixed")].some(
      (element) => element.textContent.includes("커플의 하루를 함께")
    )`,
    5_000
  );
}

async function setInput(cdp, selector, value) {
  await evaluate(
    cdp,
    `(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!element) return false;
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value"
      ).set;
      setter.call(element, ${JSON.stringify(value)});
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    })()`
  );
}

async function click(cdp, expression) {
  const clicked = await evaluate(
    cdp,
    `(() => {
      const element = ${expression};
      if (!element) return false;
      element.click();
      return true;
    })()`
  );
  if (!clicked) throw new Error(`Could not click: ${expression}`);
}

async function clickButtonText(cdp, text, scope = "document") {
  await click(
    cdp,
    `[...${scope}.querySelectorAll("button")].find(
      (button) => button.textContent.trim() === ${JSON.stringify(text)}
    )`
  );
}

async function capture(cdp, name) {
  await delay(450);
  await evaluate(
    cdp,
    `document.querySelectorAll("nextjs-portal").forEach(
      (portal) => portal.remove()
    )`
  );
  const result = await cdp.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  });
  const png = Buffer.from(result.data, "base64");
  const output = path.join(ASSET_DIR, `${name}.webp`);
  await sharp(png).webp({ quality: 86 }).toFile(output);
}

async function navigate(cdp, url) {
  await cdp.send("Page.navigate", { url });
  await waitFor(cdp, "document.readyState === 'complete'");
}

const session = JSON.parse(
  await readFile(".tmp-portfolio/demo-session.json", "utf8")
);
await mkdir(ASSET_DIR, { recursive: true });
await rm(PROFILE_DIR, { recursive: true, force: true });

const nextProcess = spawn(
  process.execPath,
  [
    path.join(ROOT, "node_modules", "next", "dist", "bin", "next"),
    "dev",
    "--turbopack",
    "-p",
    String(PORT),
  ],
  {
    cwd: ROOT,
    stdio: "ignore",
    windowsHide: true,
  }
);

let chromeProcess;
let cdp;
try {
  await waitForHttp(`${BASE_URL}/login`);

  chromeProcess = spawn(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-first-run",
      `--remote-debugging-port=${DEBUG_PORT}`,
      `--user-data-dir=${PROFILE_DIR}`,
      "--window-size=390,844",
      "--force-device-scale-factor=1",
      `${BASE_URL}/login`,
    ],
    { stdio: "ignore", windowsHide: true }
  );

  const targets = await waitForJson(
    `http://127.0.0.1:${DEBUG_PORT}/json/list`
  );
  const pageTarget = targets.find((target) => target.type === "page");
  if (!pageTarget?.webSocketDebuggerUrl) {
    throw new Error("Chrome page target was not found");
  }

  cdp = createCdp(pageTarget.webSocketDebuggerUrl);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });

  await navigate(cdp, `${BASE_URL}/login`);
  await waitFor(cdp, "Boolean(document.querySelector('#email'))");
  await waitForSplashToFinish(cdp);
  await setInput(cdp, "#email", session.email);
  await setInput(cdp, "#password", session.password);
  await click(cdp, `document.querySelector('button[type="submit"]')`);
  try {
    await waitFor(
      cdp,
      `location.pathname === "/" && Boolean(document.querySelector('button[aria-label="할 일 추가"]'))`,
      25_000
    );
  } catch (error) {
    const browserState = await evaluate(
      cdp,
      `({
        href: location.href,
        title: document.title,
        body: document.body.innerText.slice(0, 600)
      })`
    );
    throw new Error(
      `Login flow failed: ${JSON.stringify(browserState)}`,
      { cause: error }
    );
  }
  await waitForSplashToFinish(cdp);
  const pushDismissVisible = await evaluate(
    cdp,
    `[...document.querySelectorAll('button[aria-label="닫기"]')].some(
      (button) => button.closest("div")?.textContent.includes("파트너 알림 받기")
    )`
  );
  if (pushDismissVisible) {
    await click(
      cdp,
      `[...document.querySelectorAll('button[aria-label="닫기"]')].find(
        (button) => button.closest("div")?.textContent.includes("파트너 알림 받기")
      )`
    );
    await delay(250);
  }

  await capture(cdp, "product-home-read");

  await click(
    cdp,
    `document.querySelector('button[aria-label="할 일 추가"]')`
  );
  await waitFor(
    cdp,
    `Boolean(document.querySelector('input[placeholder="할 일 제목"]'))`
  );
  await setInput(
    cdp,
    'input[placeholder="할 일 제목"]',
    "세탁물 찾아오기"
  );
  await capture(cdp, "product-todo-create");
  await clickButtonText(cdp, "추가");
  await waitFor(
    cdp,
    `[...document.querySelectorAll("button")].some(
      (button) => button.getAttribute("aria-label") === "세탁물 찾아오기 편집"
    )`
  );
  await capture(cdp, "product-todo-created");

  await click(
    cdp,
    `[...document.querySelectorAll("button")].find(
      (button) => button.getAttribute("aria-label") === "세탁물 찾아오기 편집"
    )`
  );
  await waitFor(cdp, `document.body.textContent.includes("할 일 편집")`);
  await setInput(
    cdp,
    'input[placeholder="할 일 제목"]',
    "세탁물 찾아오고 옷장 정리"
  );
  await capture(cdp, "product-todo-update");
  await clickButtonText(cdp, "저장");
  await waitFor(
    cdp,
    `[...document.querySelectorAll("button")].some(
      (button) => button.getAttribute("aria-label") === "세탁물 찾아오고 옷장 정리 편집"
    )`
  );

  await click(
    cdp,
    `[...document.querySelectorAll("button")].find(
      (button) => button.getAttribute("aria-label") === "완료 처리"
        && button.parentElement?.textContent.includes("세탁물 찾아오고 옷장 정리")
    )`
  );
  await waitFor(
    cdp,
    `[...document.querySelectorAll("button")].some(
      (button) => button.getAttribute("aria-label") === "완료 해제"
        && button.parentElement?.textContent.includes("세탁물 찾아오고 옷장 정리")
    )`
  );
  await capture(cdp, "product-todo-completed");

  await click(
    cdp,
    `[...document.querySelectorAll("button")].find(
      (button) => button.getAttribute("aria-label") === "세탁물 찾아오고 옷장 정리 편집"
    )`
  );
  await waitFor(cdp, `Boolean(document.querySelector('button[aria-label="삭제"]'))`);
  await click(cdp, `document.querySelector('button[aria-label="삭제"]')`);
  await waitFor(
    cdp,
    `Boolean(document.querySelector('[role="dialog"][aria-label="할 일을 삭제할까요?"]'))`
  );
  await capture(cdp, "product-todo-delete");
  await clickButtonText(
    cdp,
    "삭제",
    `document.querySelector('[role="dialog"][aria-label="할 일을 삭제할까요?"]')`
  );
  await waitFor(
    cdp,
    `![...document.querySelectorAll("button")].some(
      (button) => button.getAttribute("aria-label") === "세탁물 찾아오고 옷장 정리 편집"
    )`
  );

  await navigate(cdp, `${BASE_URL}/calendar`);
  await waitFor(
    cdp,
    `location.pathname === "/calendar" && document.readyState === "complete"`
  );
  await waitForSplashToFinish(cdp);
  const tomorrowIso = new Date(Date.now() + 24 * 60 * 60 * 1000)
    .toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  await click(
    cdp,
    `document.querySelector('button[aria-label="${tomorrowIso}"]')`
  );
  await waitFor(
    cdp,
    `Boolean(document.querySelector('[role="dialog"]'))`
  );
  await capture(cdp, "product-calendar");

  await click(
    cdp,
    `document.querySelector('[role="dialog"] button[aria-label="닫기"]')`
  );
  await waitFor(
    cdp,
    `!Boolean(document.querySelector('[role="dialog"]'))`
  );
  await click(
    cdp,
    `document.querySelector('button[aria-label="일정 추가"]')`
  );
  await waitFor(
    cdp,
    `Boolean(document.querySelector('input[placeholder="일정 제목"]'))`
  );
  await setInput(
    cdp,
    'input[placeholder="일정 제목"]',
    "주말 브런치"
  );
  await capture(cdp, "product-calendar-create");

  await evaluate(
    cdp,
    `document.querySelector('input[placeholder="장소 검색"]')
      ?.scrollIntoView({ behavior: "instant", block: "center" })`
  );
  await setInput(
    cdp,
    'input[placeholder="장소 검색"]',
    "성수 카페"
  );
  await waitFor(
    cdp,
    `(() => {
      const input = document.querySelector('input[placeholder="장소 검색"]');
      return Boolean(input?.parentElement?.parentElement?.querySelector("ul button"));
    })()`,
    20_000
  );
  await capture(cdp, "product-calendar-location-search");

  const locationSelected = await evaluate(
    cdp,
    `(() => {
      const button = document.querySelector('input[placeholder="장소 검색"]')
        ?.parentElement?.parentElement?.querySelector("ul button");
      if (!button) return false;
      button.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      return true;
    })()`
  );
  if (!locationSelected) throw new Error("Location result could not be selected");
  await waitFor(
    cdp,
    `Boolean(document.querySelector('button[aria-label="장소 삭제"]'))`
  );
  await evaluate(
    cdp,
    `document.querySelector('button[aria-label="장소 삭제"]')
      ?.scrollIntoView({ behavior: "instant", block: "center" })`
  );
  await waitFor(
    cdp,
    `Boolean(document.querySelector('button[aria-label="장소 삭제"]')
      ?.parentElement?.nextElementSibling?.querySelector("img"))`,
    10_000
  );
  await capture(cdp, "product-calendar-location-selected");

  await navigate(cdp, `${BASE_URL}/mypage`);
  await waitFor(
    cdp,
    `location.pathname === "/mypage"
      && [...document.querySelectorAll("h1")].some(
        (heading) => heading.textContent.trim() === "마이페이지"
      )`
  );
  await waitForSplashToFinish(cdp);
  await capture(cdp, "product-mypage");

  const files = [
    "product-home-read.webp",
    "product-todo-create.webp",
    "product-todo-created.webp",
    "product-todo-update.webp",
    "product-todo-completed.webp",
    "product-todo-delete.webp",
    "product-calendar.webp",
    "product-calendar-create.webp",
    "product-calendar-location-search.webp",
    "product-calendar-location-selected.webp",
    "product-mypage.webp",
  ];
  await writeFile(
    ".tmp-portfolio/capture-result.json",
    JSON.stringify({ captured: files }, null, 2)
  );
  console.log(JSON.stringify({ captured: files.length, files }));
} finally {
  cdp?.close();
  chromeProcess?.kill();
  nextProcess.kill();
  await delay(400);
  await rm(PROFILE_DIR, { recursive: true, force: true }).catch(() => {});
}
