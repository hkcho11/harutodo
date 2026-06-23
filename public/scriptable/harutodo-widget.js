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
  const { year, month, today, markedDates } = monthData;
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const HEADER_H = 17;
  const CELL_W = imgW / 7;
  const CELL_H = (imgH - HEADER_H) / 6;
  const FONT_SIZE = Math.floor(CELL_H * 0.52);
  const DOT_SIZE = 3;

  const ctx = new DrawContext();
  ctx.size = new Size(imgW, imgH);
  ctx.opaque = false;
  ctx.respectScreenScale = true;

  // 요일 헤더
  for (let i = 0; i < 7; i++) {
    const rect = new Rect(i * CELL_W, 0, CELL_W, HEADER_H);
    ctx.setFont(Font.boldSystemFont(9));
    ctx.setTextColor(new Color(i === 0 ? C.sun : i === 6 ? C.sat : C.muted));
    ctx.setTextAlignedCenter();
    ctx.drawTextInRect(DAY_NAMES[i], rect);
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
    const marks = markedDates[dateStr] ?? [];

    // 날짜 숫자 — dot 영역을 아래에 남긴 텍스트 영역
    const textAreaH = CELL_H - DOT_SIZE - 3;

    // 오늘 원형 배경 — 텍스트 중심과 정확히 일치하도록 텍스트 영역 기준으로 배치
    if (isToday) {
      const cirSize = Math.min(CELL_W, CELL_H) * 0.72;
      const cirX = x + (CELL_W - cirSize) / 2;
      const cirY = y + (textAreaH - cirSize) / 2;
      ctx.setFillColor(new Color(C.today));
      ctx.fillEllipse(new Rect(cirX, cirY, cirSize, cirSize));
    }
    ctx.setFont(isToday ? Font.boldSystemFont(FONT_SIZE) : Font.systemFont(FONT_SIZE));
    ctx.setTextColor(new Color(
      isToday ? C.text :
      col === 0 ? C.sun :
      col === 6 ? C.sat :
      C.text
    ));
    ctx.setTextAlignedCenter();
    ctx.drawTextInRect(
      String(d),
      new Rect(x, y + (textAreaH - FONT_SIZE) / 2, CELL_W, FONT_SIZE + 2)
    );

    // 마커 dot — 셀 맨 아래
    if (marks.length > 0) {
      const hasEvent = marks.includes("event");
      const hasTodo = marks.includes("todo");
      const dotY = y + CELL_H - DOT_SIZE - 1;

      if (hasEvent && hasTodo) {
        ctx.setFillColor(new Color(C.dotEvent));
        ctx.fillEllipse(new Rect(x + CELL_W / 2 - DOT_SIZE - 1, dotY, DOT_SIZE, DOT_SIZE));
        ctx.setFillColor(new Color(C.dotTodo));
        ctx.fillEllipse(new Rect(x + CELL_W / 2 + 1, dotY, DOT_SIZE, DOT_SIZE));
      } else {
        ctx.setFillColor(new Color(hasEvent ? C.dotEvent : C.dotTodo));
        ctx.fillEllipse(new Rect(x + CELL_W / 2 - DOT_SIZE / 2, dotY, DOT_SIZE, DOT_SIZE));
      }
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

// ===== 위젯 — Large (캘린더 + 할 일 / 일정 2열) =====
function createLargeWidget(monthData, todayData) {
  const w = new ListWidget();
  w.backgroundColor = new Color(C.bg);
  w.setPadding(16, 16, 16, 16);
  w.url = `${APP_URL}/calendar`;
  // iOS 위젯은 실시간 불가 — 15분마다 갱신 요청 (OS가 최종 결정)
  w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);

  // 월 헤더
  const header = w.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();

  const monthTitle = header.addText(`${monthData.year}년 ${monthData.month}월`);
  monthTitle.font = Font.boldSystemFont(14);
  monthTitle.textColor = new Color(C.text);

  header.addSpacer();

  const legend = header.addStack();
  legend.layoutHorizontally();
  legend.centerAlignContent();
  legend.spacing = 4;
  const addLegend = (stack, color, label) => {
    const dot = stack.addText("●");
    dot.font = Font.systemFont(8);
    dot.textColor = new Color(color);
    const txt = stack.addText(label);
    txt.font = Font.systemFont(9);
    txt.textColor = new Color(C.muted);
  };
  addLegend(legend, C.dotEvent, "일정");
  legend.addSpacer(6);
  addLegend(legend, C.dotTodo, "할 일");

  w.addSpacer(8);

  // 달력 이미지 — IMG_W = widget_width(338) - padding*2(32) = 306
  const IMG_W = 306;
  const IMG_H = 168;
  const calImg = w.addImage(buildCalendarImage(monthData, IMG_W, IMG_H));
  calImg.imageSize = new Size(IMG_W, IMG_H);

  w.addSpacer(10);

  // 구분선
  const dividerRow = w.addStack();
  dividerRow.layoutHorizontally();
  const divLine = dividerRow.addStack();
  divLine.backgroundColor = new Color(C.border);
  divLine.size = new Size(306, 1);

  w.addSpacer(10);

  // 2열 섹션 (할 일 | 일정)
  const dotColors = { me: C.today, together: C.dotTodo, partner: C.dotEvent, other: C.border };
  const incomplete = todayData?.todos?.filter(t => !t.is_completed) ?? [];
  const events = todayData?.events ?? [];

  const twoCol = w.addStack();
  twoCol.layoutHorizontally();

  // ── 왼쪽: 할 일 ──
  const todoCol = twoCol.addStack();
  todoCol.layoutVertically();
  todoCol.spacing = 5;

  const todoHeader = todoCol.addText("할 일");
  todoHeader.font = Font.boldSystemFont(11);
  todoHeader.textColor = new Color(C.text);

  if (incomplete.length === 0) {
    const done = todoCol.addText("모두 완료 ✓");
    done.font = Font.systemFont(11);
    done.textColor = new Color("#6B9F7A");
  } else {
    for (const todo of incomplete.slice(0, 6)) {
      const row = todoCol.addStack();
      row.layoutHorizontally();
      row.centerAlignContent();
      row.spacing = 5;

      const dot = row.addText("●");
      dot.font = Font.systemFont(7);
      dot.textColor = new Color(dotColors[todo.assignee] ?? C.border);

      const title = row.addText(todo.title);
      title.font = Font.systemFont(11);
      title.textColor = new Color(C.text);
      title.lineLimit = 1;
    }
    if (incomplete.length > 6) {
      const more = todoCol.addText(`+${incomplete.length - 6}개 더`);
      more.font = Font.systemFont(10);
      more.textColor = new Color(C.muted);
    }
  }

  // ── 세로 구분선 ──
  twoCol.addSpacer(10);
  const vDivider = twoCol.addStack();
  vDivider.layoutVertically();
  vDivider.backgroundColor = new Color(C.border);
  vDivider.size = new Size(1, 100);
  twoCol.addSpacer(10);

  // ── 오른쪽: 일정 ──
  const eventCol = twoCol.addStack();
  eventCol.layoutVertically();
  eventCol.spacing = 5;

  const eventHeader = eventCol.addText("일정");
  eventHeader.font = Font.boldSystemFont(11);
  eventHeader.textColor = new Color(C.text);

  if (events.length === 0) {
    const noEv = eventCol.addText("일정 없음");
    noEv.font = Font.systemFont(11);
    noEv.textColor = new Color(C.muted);
  } else {
    for (const evt of events.slice(0, 6)) {
      const row = eventCol.addStack();
      row.layoutVertically();
      row.spacing = 1;

      const title = row.addText(evt.title);
      title.font = Font.mediumSystemFont(11);
      title.textColor = new Color(C.text);
      title.lineLimit = 1;

      if (evt.start_time) {
        const timeStr = evt.start_time.slice(0, 5);
        const time = row.addText(timeStr);
        time.font = Font.systemFont(9);
        time.textColor = new Color(C.muted);
      }
    }
  }

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
      const [monthData, todayData] = await Promise.all([
        fetchMonth(token, year, month),
        fetchToday(token),
      ]);
      const w = createLargeWidget(monthData, todayData);
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
      const [monthData, todayData] = await Promise.all([
        fetchMonth(token, year, month),
        fetchToday(token),
      ]);
      widget = createLargeWidget(monthData, todayData);

    } else if (family === "accessoryRectangular") {
      const todayData = await fetchToday(token);
      widget = createLockWidget(todayData);

    } else {
      const [monthData, todayData] = await Promise.all([
        fetchMonth(token, year, month),
        fetchToday(token),
      ]);
      widget = createLargeWidget(monthData, todayData);
    }
  } catch {
    widget = createErrorWidget("데이터를 불러오지 못했어요");
  }

  Script.setWidget(widget);
}

await run();
