// 하루투두 Scriptable 위젯 — 월간 캘린더
// --------------------------------------------------
// 설치:
//  Mac) Finder → iCloud Drive → Scriptable 폴더에 이 파일 복사
//  iPhone) Scriptable 앱에서 자동으로 인식됨
//  첫 실행) 앱에서 ▶ 실행 → 이메일/비밀번호 로그인 → 홈 화면 위젯 추가
// --------------------------------------------------

// ===== CONFIG =====
const APP_URL = "https://harutodo.vercel.app";
const SUPABASE_URL = "https://eefgpaqjdhgsqljknsfp.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZmdwYXFqZGhnc3Fsamtuc2ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4NTYxMDEsImV4cCI6MjA5NTQzMjEwMX0.qZtidXlb8Hh_fYozDZ-bYDgjVnWxWroY0q7LzSE5UQ4";
const KEYCHAIN_KEY = "harutodo_widget_v1";

// ===== 컬러 =====
const C = {
  bg:       "#FAFCF5",
  text:     "#334033",
  muted:    "#72806C",
  border:   "#E3ECD9",
  today:    "#B9DFA7",  // 연두 — 오늘 배경 / me 바
  sun:      "#C97264",  // 빨강 — 일요일
  sat:      "#6B9F7A",  // 초록 — 토요일
  dotEvent: "#B8DCE8",  // 스카이 — partner 바
  dotTodo:  "#F2C6A0",  // 살구 — together 바 / 할 일 dot
};

// ===== 인증 =====
async function getAccessToken() {
  if (!Keychain.contains(KEYCHAIN_KEY)) return null;
  let refreshToken;
  try {
    refreshToken = JSON.parse(Keychain.get(KEYCHAIN_KEY)).refresh_token;
  } catch { return null; }

  const req = new Request(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`);
  req.method = "POST";
  req.headers = { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" };
  req.body = JSON.stringify({ refresh_token: refreshToken });
  try {
    const data = await req.loadJSON();
    if (data.access_token && data.refresh_token) {
      Keychain.set(KEYCHAIN_KEY, JSON.stringify({ refresh_token: data.refresh_token }));
      return data.access_token;
    }
  } catch {}
  return null;
}

async function setup() {
  const alert = new Alert();
  alert.title = "하루투두 로그인";
  alert.message = "앱 계정 이메일과 비밀번호를 입력하세요";
  alert.addTextField("이메일");
  alert.addSecureTextField("비밀번호");
  alert.addAction("로그인");
  alert.addCancelAction("취소");
  const choice = await alert.presentAlert();
  if (choice === -1) return;

  const req = new Request(`${SUPABASE_URL}/auth/v1/token?grant_type=password`);
  req.method = "POST";
  req.headers = { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" };
  req.body = JSON.stringify({
    email: alert.textFieldValue(0),
    password: alert.textFieldValue(1),
  });
  try {
    const data = await req.loadJSON();
    if (data.refresh_token) {
      Keychain.set(KEYCHAIN_KEY, JSON.stringify({ refresh_token: data.refresh_token }));
      const ok = new Alert();
      ok.title = "연결 완료 ✓";
      ok.message = "홈 화면에 Scriptable 위젯을 추가하세요.";
      ok.addAction("확인");
      await ok.presentAlert();
    } else {
      throw new Error(data.error_description ?? "로그인 실패");
    }
  } catch (e) {
    const err = new Alert();
    err.title = "로그인 실패";
    err.message = String(e);
    err.addAction("확인");
    await err.presentAlert();
  }
}

// ===== 데이터 =====
async function fetchMonth(token, year, month) {
  const req = new Request(`${APP_URL}/api/widget/month?year=${year}&month=${month}`);
  req.headers = { Authorization: `Bearer ${token}` };
  const data = await req.loadJSON();
  if (data.error) throw new Error(data.error);
  return data;
}

async function fetchToday(token) {
  const req = new Request(`${APP_URL}/api/widget/today`);
  req.headers = { Authorization: `Bearer ${token}` };
  return await req.loadJSON();
}

// ===== 캘린더 이미지 (월간 바 레이아웃) =====
function buildCalendarImage(monthData, imgW, imgH) {
  const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];
  const { year, month, today, events, hasTodoByDate } = monthData;

  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const prevMonthDays = new Date(year, month - 1, 0).getDate();
  const ROWS = Math.max(5, Math.ceil((firstDay + daysInMonth) / 7));

  const HEADER_H = 18;
  const CELL_W = imgW / 7;
  const CELL_H = (imgH - HEADER_H) / ROWS;

  const DATE_FONT = 12;
  const DATE_H = DATE_FONT + 4;   // 16 — date number + today circle area
  const BAR_H = 8;                 // event bar height
  const BAR_GAP = 1;               // vertical gap between lanes
  const BAR_PAD = 1;               // gap between date area and first bar
  const BAR_FONT = 8;
  const DOT_R = 3;

  // Dynamically fit 4 lanes in 5-row months, 3 lanes in 6-row months
  const MAX_LANES = Math.min(4, Math.floor((CELL_H - DATE_H - BAR_PAD) / (BAR_H + BAR_GAP)));

  // "YYYY-MM-DD" → integer day number (UTC, avoids timezone shifts)
  function dateToDay(s) {
    const [y, m, d] = s.split("-").map(Number);
    return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
  }

  // Date string for any grid cell (including prev/next month overflow cells)
  function cellDateStr(cellIdx) {
    const offset = cellIdx - firstDay;
    let d, mo, y;
    if (offset < 0) {
      d = prevMonthDays + offset + 1; mo = month - 1; y = year;
      if (mo === 0) { mo = 12; y--; }
    } else if (offset >= daysInMonth) {
      d = offset - daysInMonth + 1; mo = month + 1; y = year;
      if (mo === 13) { mo = 1; y++; }
    } else {
      d = offset + 1; mo = month; y = year;
    }
    return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  // Greedy lane assignment for one week row (Sun..Sat)
  // Returns [{evt, lane, startCol, endCol, isStart}]
  function computeWeekBars(wsDayNum) {
    const weDayNum = wsDayNum + 6;

    const overlapping = (events ?? []).filter(evt => {
      const evStart = dateToDay(evt.date);
      const evEnd = dateToDay(evt.end_date ?? evt.date);
      return evStart <= weDayNum && evEnd >= wsDayNum;
    });

    // Sort by clipped start col, then by span length descending (longest first)
    overlapping.sort((a, b) => {
      const aS = Math.max(dateToDay(a.date), wsDayNum);
      const bS = Math.max(dateToDay(b.date), wsDayNum);
      if (aS !== bS) return aS - bS;
      const aE = Math.min(dateToDay(a.end_date ?? a.date), weDayNum);
      const bE = Math.min(dateToDay(b.end_date ?? b.date), weDayNum);
      return (bE - bS) - (aE - aS);
    });

    const bars = [];
    const laneEnd = []; // laneEnd[l] = endCol of last bar placed in lane l

    for (const evt of overlapping) {
      const evStart = dateToDay(evt.date);
      const evEnd = dateToDay(evt.end_date ?? evt.date);
      const startCol = Math.max(evStart, wsDayNum) - wsDayNum;
      const endCol = Math.min(evEnd, weDayNum) - wsDayNum;
      const isStart = evStart >= wsDayNum;

      // Find first lane with no overlap
      let lane = laneEnd.findIndex(e => e < startCol);
      if (lane === -1) lane = laneEnd.length;
      laneEnd[lane] = endCol;

      bars.push({ evt, lane, startCol, endCol, isStart });
    }

    return bars;
  }

  const ctx = new DrawContext();
  ctx.size = new Size(imgW, imgH);
  ctx.opaque = false;
  ctx.respectScreenScale = true;

  // Day-of-week header
  for (let i = 0; i < 7; i++) {
    ctx.setFont(Font.boldSystemFont(9));
    ctx.setTextColor(new Color(i === 0 ? C.sun : i === 6 ? C.sat : C.muted));
    ctx.setTextAlignedCenter();
    ctx.drawTextInRect(DAY_NAMES[i], new Rect(i * CELL_W, 0, CELL_W, HEADER_H));
  }

  for (let row = 0; row < ROWS; row++) {
    const cellIdx0 = row * 7;
    const wsDayNum = dateToDay(cellDateStr(cellIdx0));
    const bars = computeWeekBars(wsDayNum);
    const rowY = HEADER_H + row * CELL_H;

    // Count overflow events per date (events assigned to lane >= MAX_LANES)
    const overflowByDate = {};
    for (const bar of bars) {
      if (bar.lane >= MAX_LANES) {
        for (let c = bar.startCol; c <= bar.endCol; c++) {
          const ds = cellDateStr(cellIdx0 + c);
          overflowByDate[ds] = (overflowByDate[ds] ?? 0) + 1;
        }
      }
    }

    // 1. Today highlight circle (drawn before date number)
    for (let col = 0; col < 7; col++) {
      const ds = cellDateStr(cellIdx0 + col);
      if (ds !== today) continue;
      const x = col * CELL_W;
      const cirD = DATE_H;
      ctx.setFillColor(new Color(C.today));
      ctx.fillEllipse(new Rect(x + (CELL_W - cirD) / 2, rowY + 1, cirD, cirD));
    }

    // 2. Date numbers
    for (let col = 0; col < 7; col++) {
      const cellIdx = cellIdx0 + col;
      const offset = cellIdx - firstDay;
      const isCurMonth = offset >= 0 && offset < daysInMonth;
      const d = offset < 0
        ? prevMonthDays + offset + 1
        : offset >= daysInMonth
          ? offset - daysInMonth + 1
          : offset + 1;
      const ds = cellDateStr(cellIdx);
      const isToday = ds === today;
      const x = col * CELL_W;

      ctx.setFont(isToday ? Font.boldSystemFont(DATE_FONT) : Font.systemFont(DATE_FONT));
      ctx.setTextColor(new Color(
        !isCurMonth ? C.border :
        isToday     ? C.text  :
        col === 0   ? C.sun   :
        col === 6   ? C.sat   : C.text
      ));
      ctx.setTextAlignedCenter();
      ctx.drawTextInRect(String(d), new Rect(x, rowY + 2, CELL_W, DATE_FONT + 2));
    }

    // 3. Event bars (lanes 0 .. MAX_LANES-1)
    for (const bar of bars) {
      if (bar.lane >= MAX_LANES) continue;
      const { evt, lane, startCol, endCol, isStart } = bar;

      const barX = startCol * CELL_W + 1.5;
      const barW = (endCol - startCol + 1) * CELL_W - 3;
      const barY = rowY + DATE_H + BAR_PAD + lane * (BAR_H + BAR_GAP);

      // Safety: skip if bar would draw outside the cell
      if (barY + BAR_H > rowY + CELL_H - 1) continue;

      const barColor = evt.assignee === "me"
        ? C.today
        : evt.assignee === "partner"
          ? C.dotEvent
          : C.dotTodo;

      ctx.setFillColor(new Color(barColor));
      ctx.fillRoundedRect(new Rect(barX, barY, barW, BAR_H), BAR_H / 2);

      // Show title only when event starts in this week or at left edge
      if (isStart || startCol === 0) {
        ctx.setFont(Font.systemFont(BAR_FONT));
        ctx.setTextColor(new Color(C.text));
        ctx.setTextAlignedLeft();
        ctx.drawTextInRect(
          evt.title,
          new Rect(barX + 3, barY + (BAR_H - BAR_FONT) / 2, barW - 4, BAR_FONT + 1)
        );
      }
    }

    // 4. Overflow badge (+N) and todo dots
    for (let col = 0; col < 7; col++) {
      const cellIdx = cellIdx0 + col;
      const offset = cellIdx - firstDay;
      const isCurMonth = offset >= 0 && offset < daysInMonth;
      const ds = cellDateStr(cellIdx);
      const x = col * CELL_W;
      const over = overflowByDate[ds] ?? 0;

      // +N badge — only draw when there's actually vertical room
      if (over > 0 && isCurMonth) {
        const badgeY = rowY + DATE_H + BAR_PAD + MAX_LANES * (BAR_H + BAR_GAP);
        if (badgeY + BAR_FONT + 1 <= rowY + CELL_H - DOT_R - 3) {
          ctx.setFont(Font.systemFont(BAR_FONT));
          ctx.setTextColor(new Color(C.muted));
          ctx.setTextAlignedLeft();
          ctx.drawTextInRect(`+${over}`, new Rect(x + 2, badgeY, CELL_W - 2, BAR_FONT + 2));
        }
      }

      // Todo dot at bottom of cell
      if (isCurMonth && (hasTodoByDate ?? {})[ds]) {
        ctx.setFillColor(new Color(C.dotTodo));
        ctx.fillEllipse(new Rect(
          x + CELL_W / 2 - DOT_R / 2,
          rowY + CELL_H - DOT_R - 2,
          DOT_R, DOT_R
        ));
      }
    }
  }

  return ctx.getImage();
}

// ===== 위젯 — Small =====
function createSmallWidget(monthData, todayData) {
  const w = new ListWidget();
  w.backgroundColor = new Color(C.bg);
  w.setPadding(14, 14, 14, 14);
  w.url = APP_URL;

  const incomplete = todayData?.todos?.filter(t => !t.is_completed) ?? [];
  const now = new Date();
  const days = ["일", "월", "화", "수", "목", "금", "토"];

  const header = w.addText("하루투두");
  header.font = Font.boldSystemFont(10);
  header.textColor = new Color(C.muted);

  w.addSpacer();

  const count = w.addText(String(incomplete.length));
  count.font = Font.boldSystemFont(38);
  count.textColor = incomplete.length === 0 ? new Color("#6B9F7A") : new Color(C.text);
  count.centerAlignText();

  const label = w.addText(incomplete.length === 0 ? "완료! ✓" : "개 남음");
  label.font = Font.systemFont(12);
  label.textColor = new Color(C.muted);
  label.centerAlignText();

  w.addSpacer();

  const dateText = w.addText(
    `${now.getMonth() + 1}월 ${now.getDate()}일 ${days[now.getDay()]}`
  );
  dateText.font = Font.systemFont(9);
  dateText.textColor = new Color(C.muted);

  return w;
}

// ===== 위젯 — Large (월간 캘린더 — 다중 바 레이아웃) =====
function createLargeWidget(monthData) {
  const w = new ListWidget();
  w.backgroundColor = new Color(C.bg);
  w.setPadding(12, 14, 12, 14);
  w.url = `${APP_URL}/calendar`;
  w.refreshAfterDate = new Date(Date.now() + 5 * 60 * 1000);

  // 월 헤더
  const header = w.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();

  const monthTitle = header.addText(`${monthData.year}년 ${monthData.month}월`);
  monthTitle.font = Font.boldSystemFont(13);
  monthTitle.textColor = new Color(C.text);

  header.addSpacer();

  const todayDot = header.addText("● 오늘");
  todayDot.font = Font.systemFont(9);
  todayDot.textColor = new Color(C.today);

  w.addSpacer(4);

  // Large widget ~364pt wide, padding 14×2=28 → available 336pt
  const IMG_W = 336;
  const IMG_H = 310;
  const calImg = w.addImage(buildCalendarImage(monthData, IMG_W, IMG_H));
  calImg.imageSize = new Size(IMG_W, IMG_H);
  calImg.centerAlignImage();

  return w;
}

// ===== 위젯 — 잠금화면 =====
function createLockWidget(todayData) {
  const w = new ListWidget();
  const incomplete = todayData?.todos?.filter(t => !t.is_completed) ?? [];

  if (incomplete.length === 0) {
    const t = w.addText("오늘 할 일 완료 ✓");
    t.font = Font.mediumSystemFont(12);
    return w;
  }
  const count = w.addText(`● ${incomplete.length}개 남음`);
  count.font = Font.boldSystemFont(12);
  if (incomplete[0]) {
    const first = w.addText(incomplete[0].title);
    first.font = Font.systemFont(11);
    first.lineLimit = 1;
  }
  return w;
}

// ===== 자동 업데이트 =====
async function selfUpdate() {
  const fetchLatest = async () => {
    const req = new Request(`${APP_URL}/scriptable/harutodo-widget.js`);
    req.timeoutInterval = 5;
    const text = await req.loadString();
    // HTML 에러 페이지가 내려오면 덮어쓰기 금지
    if (!text || text.length < 500 || !text.startsWith("//")) return null;
    return text;
  };
  try {
    const latest = await fetchLatest();
    if (!latest) return;
    const fm = FileManager.iCloud();
    fm.writeString(
      fm.joinPath(fm.documentsDirectory(), `${Script.name()}.js`),
      latest
    );
  } catch {
    try {
      const latest = await fetchLatest();
      if (!latest) return;
      const fm = FileManager.local();
      fm.writeString(
        fm.joinPath(fm.documentsDirectory(), `${Script.name()}.js`),
        latest
      );
    } catch {}
  }
}

// ===== 에러 위젯 =====
function createErrorWidget(msg) {
  const w = new ListWidget();
  w.backgroundColor = new Color(C.bg);
  w.setPadding(16, 16, 16, 16);
  const t = w.addText(msg);
  t.font = Font.systemFont(12);
  t.textColor = new Color(C.muted);
  t.minimumScaleFactor = 0.7;
  return w;
}

// ===== 메인 =====
async function run() {
  // 앱에서 직접 실행 시
  if (config.runsInApp) {
    if (!Keychain.contains(KEYCHAIN_KEY)) {
      await setup();
      return;
    }

    // 스크립트를 최신 버전으로 조용히 업데이트 (다음 실행부터 반영)
    selfUpdate();

    const alert = new Alert();
    alert.title = "하루투두 위젯";
    alert.addAction("Large 미리보기");
    alert.addAction("다시 로그인");
    alert.addCancelAction("취소");
    const choice = await alert.presentAlert();
    if (choice === 1) { await setup(); return; }
    if (choice === -1) return;

    const token = await getAccessToken();
    if (!token) {
      const e = createErrorWidget("로그인이 필요합니다");
      await e.presentLarge();
      return;
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    try {
      const monthData = await fetchMonth(token, year, month);
      const w = createLargeWidget(monthData);
      await w.presentLarge();
    } catch (e) {
      const w = createErrorWidget(String(e));
      await w.presentLarge();
    }
    return;
  }

  const token = await getAccessToken();
  if (!token) {
    const w = createErrorWidget("Scriptable 앱에서 먼저 실행해 로그인하세요");
    Script.setWidget(w);
    return;
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const family = config.widgetFamily;

  let widget;
  try {
    if (family === "small") {
      const [monthData, todayData] = await Promise.all([
        fetchMonth(token, year, month),
        fetchToday(token),
      ]);
      widget = createSmallWidget(monthData, todayData);

    } else if (family === "large") {
      const monthData = await fetchMonth(token, year, month);
      widget = createLargeWidget(monthData);

    } else if (family === "accessoryRectangular") {
      const todayData = await fetchToday(token);
      widget = createLockWidget(todayData);

    } else {
      const monthData = await fetchMonth(token, year, month);
      widget = createLargeWidget(monthData);
    }
  } catch {
    widget = createErrorWidget("데이터를 불러오지 못했어요");
  }

  Script.setWidget(widget);
  await selfUpdate();
}

await run();
