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
  today:    "#B9DFA7",  // 연두 — 오늘 배경
  sun:      "#C97264",  // 빨강 — 일요일
  sat:      "#6B9F7A",  // 초록 — 토요일
  dotEvent: "#B8DCE8",  // 스카이 — 일정 dot
  dotTodo:  "#F2C6A0",  // 살구 — 할 일 dot
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
  return await req.loadJSON();
}

async function fetchToday(token) {
  const req = new Request(`${APP_URL}/api/widget/today`);
  req.headers = { Authorization: `Bearer ${token}` };
  return await req.loadJSON();
}

// ===== 캘린더 이미지 =====
function buildCalendarImage(monthData, imgW, imgH) {
  const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];
  const { year, month, today, days } = monthData;
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const HEADER_H = 16;
  const CELL_W = imgW / 7;
  const CELL_H = (imgH - HEADER_H) / 6;
  const DATE_FONT = 10;
  const DATE_H = DATE_FONT + 4;   // 날짜 숫자 영역 높이
  const EV_FONT = 7;
  const EV_ROW_H = EV_FONT + 2;   // 이벤트 한 줄 높이
  const DOT_R = 3;                 // todo 점 크기

  const ctx = new DrawContext();
  ctx.size = new Size(imgW, imgH);
  ctx.opaque = false;
  ctx.respectScreenScale = true;

  // 요일 헤더
  for (let i = 0; i < 7; i++) {
    ctx.setFont(Font.boldSystemFont(8));
    ctx.setTextColor(new Color(i === 0 ? C.sun : i === 6 ? C.sat : C.muted));
    ctx.setTextAlignedCenter();
    ctx.drawTextInRect(DAY_NAMES[i], new Rect(i * CELL_W, 0, CELL_W, HEADER_H));
  }

  let col = firstDay;
  let row = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const x = col * CELL_W;
    const y = HEADER_H + row * CELL_H;
    const mm = String(month).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    const dateStr = `${year}-${mm}-${dd}`;
    const isToday = dateStr === today;
    const dayData = days[dateStr] ?? { events: [], hasTodo: false };

    // 오늘 원형 배경
    if (isToday) {
      const cirSize = DATE_H * 1.1;
      ctx.setFillColor(new Color(C.today));
      ctx.fillEllipse(new Rect(
        x + (CELL_W - cirSize) / 2,
        y + 1,
        cirSize,
        cirSize
      ));
    }

    // 날짜 숫자
    ctx.setFont(isToday ? Font.boldSystemFont(DATE_FONT) : Font.systemFont(DATE_FONT));
    ctx.setTextColor(new Color(
      isToday ? C.text : col === 0 ? C.sun : col === 6 ? C.sat : C.text
    ));
    ctx.setTextAlignedCenter();
    ctx.drawTextInRect(String(d), new Rect(x, y + 1, CELL_W, DATE_H));

    // 일정 텍스트 (최대 4개)
    const evStartY = y + DATE_H + 2;
    const maxEvents = Math.min(dayData.events.length, 4);
    for (let i = 0; i < maxEvents; i++) {
      const evY = evStartY + i * EV_ROW_H;
      if (evY + EV_FONT > y + CELL_H) break; // 셀 영역 초과 시 중단

      // 이벤트 색상 점
      ctx.setFillColor(new Color(C.dotEvent));
      ctx.fillEllipse(new Rect(x + 2, evY + (EV_FONT - 3) / 2, 3, 3));

      // 이벤트 제목
      ctx.setFont(Font.systemFont(EV_FONT));
      ctx.setTextColor(new Color(C.text));
      ctx.setTextAlignedLeft();
      ctx.drawTextInRect(
        dayData.events[i].title,
        new Rect(x + 7, evY, CELL_W - 8, EV_FONT + 1)
      );
    }

    // 할 일 있을 때 셀 하단에 작은 점
    if (dayData.hasTodo) {
      ctx.setFillColor(new Color(C.dotTodo));
      ctx.fillEllipse(new Rect(
        x + CELL_W / 2 - DOT_R / 2,
        y + CELL_H - DOT_R - 1,
        DOT_R, DOT_R
      ));
    }

    col++;
    if (col === 7) { col = 0; row++; }
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

// ===== 위젯 — Large (월간 캘린더 — 셀 안에 일정 표시) =====
function createLargeWidget(monthData) {
  const w = new ListWidget();
  w.backgroundColor = new Color(C.bg);
  w.setPadding(16, 16, 16, 16);
  w.url = `${APP_URL}/calendar`;
  w.refreshAfterDate = new Date(Date.now() + 5 * 60 * 1000);

  // 월 헤더
  const header = w.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();

  const monthTitle = header.addText(`${monthData.year}년 ${monthData.month}월`);
  monthTitle.font = Font.boldSystemFont(14);
  monthTitle.textColor = new Color(C.text);

  header.addSpacer();

  const todayDot = header.addText("● 오늘");
  todayDot.font = Font.systemFont(9);
  todayDot.textColor = new Color(C.today);

  w.addSpacer(8);

  // 달력 — padding(32) + header(~18) + spacer(8) 제외한 전체 높이
  // Large widget ~354pt → 354 - 32 - 18 - 8 = 296pt
  const IMG_W = 306;
  const IMG_H = 296;
  const calImg = w.addImage(buildCalendarImage(monthData, IMG_W, IMG_H));
  calImg.imageSize = new Size(IMG_W, IMG_H);

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
  try {
    const req = new Request(`${APP_URL}/scriptable/harutodo-widget.js`);
    req.timeoutInterval = 5;
    const latest = await req.loadString();
    if (!latest || latest.length < 500) return;
    const fm = FileManager.iCloud();
    const path = fm.joinPath(fm.documentsDirectory(), `${Script.name()}.js`);
    fm.writeString(path, latest);
  } catch {
    try {
      const req = new Request(`${APP_URL}/scriptable/harutodo-widget.js`);
      req.timeoutInterval = 5;
      const latest = await req.loadString();
      if (!latest || latest.length < 500) return;
      const fm = FileManager.local();
      const path = fm.joinPath(fm.documentsDirectory(), `${Script.name()}.js`);
      fm.writeString(path, latest);
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
      const w = createErrorWidget("데이터를 불러오지 못했어요");
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
