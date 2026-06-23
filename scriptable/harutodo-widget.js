// 하루투두 Scriptable 위젯
// --------------------------------------------------
// 설치 방법:
// 1. Scriptable 앱에서 이 스크립트를 새로 만들고 내용을 붙여넣기
// 2. 앱 내에서 실행(▶) → 이메일/비밀번호 입력하여 로그인
// 3. 홈 화면에서 Scriptable 위젯 추가 → 스크립트 선택
// --------------------------------------------------

// ===== CONFIG =====
const APP_URL = "https://harutodo.vercel.app";
const SUPABASE_URL = "https://eefgpaqjdhgsqljknsfp.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZmdwYXFqZGhnc3Fsamtuc2ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4NTYxMDEsImV4cCI6MjA5NTQzMjEwMX0.qZtidXlb8Hh_fYozDZ-bYDgjVnWxWroY0q7LzSE5UQ4";
const KEYCHAIN_KEY = "harutodo_widget_v1";

// ===== 컬러 (앱 디자인 토큰과 동일) =====
const C = {
  bg: new Color("#FAFCF5"),
  text: new Color("#334033"),
  muted: new Color("#72806C"),
  border: new Color("#E3ECD9"),
  me: new Color("#B9DFA7"),        // 연두 — 나
  together: new Color("#F2C6A0"),  // 살구 — 함께
  partner: new Color("#B8DCE8"),   // 스카이 — 파트너
  other: new Color("#E3ECD9"),
};

// ===== 인증 =====
async function getAccessToken() {
  if (!Keychain.contains(KEYCHAIN_KEY)) return null;

  let refreshToken;
  try {
    refreshToken = JSON.parse(Keychain.get(KEYCHAIN_KEY)).refresh_token;
  } catch {
    return null;
  }

  const req = new Request(
    `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`
  );
  req.method = "POST";
  req.headers = {
    apikey: SUPABASE_ANON_KEY,
    "Content-Type": "application/json",
  };
  req.body = JSON.stringify({ refresh_token: refreshToken });

  try {
    const data = await req.loadJSON();
    if (data.access_token && data.refresh_token) {
      Keychain.set(
        KEYCHAIN_KEY,
        JSON.stringify({ refresh_token: data.refresh_token })
      );
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

  const email = alert.textFieldValue(0);
  const password = alert.textFieldValue(1);

  const req = new Request(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`
  );
  req.method = "POST";
  req.headers = {
    apikey: SUPABASE_ANON_KEY,
    "Content-Type": "application/json",
  };
  req.body = JSON.stringify({ email, password });

  try {
    const data = await req.loadJSON();
    if (data.access_token && data.refresh_token) {
      Keychain.set(
        KEYCHAIN_KEY,
        JSON.stringify({ refresh_token: data.refresh_token })
      );
      const ok = new Alert();
      ok.title = "연결 완료 ✓";
      ok.message = "홈 화면에 Scriptable 위젯을 추가하면 바로 사용할 수 있어요.";
      ok.addAction("확인");
      await ok.presentAlert();
    } else {
      throw new Error(data.error_description ?? "로그인에 실패했어요");
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
async function fetchData(accessToken) {
  const req = new Request(`${APP_URL}/api/widget/today`);
  req.headers = { Authorization: `Bearer ${accessToken}` };
  return await req.loadJSON();
}

// ===== 포맷 =====
function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00+09:00");
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${days[d.getDay()]}`;
}

function formatTime(timeStr) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour < 12 ? "오전" : "오후";
  const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${ampm} ${display}:${m}`;
}

function dotColor(assignee) {
  if (assignee === "me") return C.me;
  if (assignee === "together") return C.together;
  if (assignee === "partner") return C.partner;
  return C.other;
}

// ===== 위젯 — Small =====
function createSmallWidget(data) {
  const w = new ListWidget();
  w.backgroundColor = C.bg;
  w.setPadding(14, 14, 14, 14);
  w.url = APP_URL;

  const incomplete = data.todos.filter((t) => !t.is_completed);

  const header = w.addText("하루투두");
  header.font = Font.boldSystemFont(10);
  header.textColor = C.muted;

  w.addSpacer();

  const count = w.addText(String(incomplete.length));
  count.font = Font.boldSystemFont(38);
  count.textColor = incomplete.length === 0 ? new Color("#6B9F7A") : C.text;
  count.centerAlignText();

  const label = w.addText(incomplete.length === 0 ? "완료! ✓" : "개 남음");
  label.font = Font.systemFont(12);
  label.textColor = C.muted;
  label.centerAlignText();

  w.addSpacer();

  const date = w.addText(formatDate(data.date));
  date.font = Font.systemFont(9);
  date.textColor = C.muted;

  return w;
}

// ===== 위젯 — Medium =====
function createMediumWidget(data) {
  const w = new ListWidget();
  w.backgroundColor = C.bg;
  w.setPadding(14, 16, 12, 16);
  w.url = APP_URL;

  // 헤더
  const header = w.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();

  const title = header.addText("하루투두");
  title.font = Font.boldSystemFont(13);
  title.textColor = C.text;

  header.addSpacer();

  const dateText = header.addText(formatDate(data.date));
  dateText.font = Font.systemFont(11);
  dateText.textColor = C.muted;

  w.addSpacer(8);

  const incomplete = data.todos.filter((t) => !t.is_completed);
  const hasEvents = data.events.length > 0;
  const maxTodos = hasEvents ? 4 : 5;

  if (incomplete.length === 0) {
    w.addSpacer();
    const done = w.addText("오늘 할 일을 모두 완료했어요 ✓");
    done.font = Font.mediumSystemFont(13);
    done.textColor = new Color("#6B9F7A");
    done.centerAlignText();
    w.addSpacer();
  } else {
    for (const todo of incomplete.slice(0, maxTodos)) {
      const row = w.addStack();
      row.layoutHorizontally();
      row.centerAlignContent();
      row.spacing = 6;

      const dot = row.addText("●");
      dot.font = Font.systemFont(7);
      dot.textColor = dotColor(todo.assignee);

      const text = row.addText(todo.title);
      text.font = Font.systemFont(13);
      text.textColor = C.text;
      text.lineLimit = 1;

      w.addSpacer(5);
    }

    if (incomplete.length > maxTodos) {
      const more = w.addText(`  +${incomplete.length - maxTodos}개 더`);
      more.font = Font.systemFont(11);
      more.textColor = C.muted;
      w.addSpacer(4);
    }
  }

  // 이벤트
  if (hasEvents) {
    w.addSpacer(4);

    const divider = w.addStack();
    divider.size = new Size(0, 1);
    divider.backgroundColor = C.border;

    w.addSpacer(5);

    const event = data.events[0];
    const row = w.addStack();
    row.layoutHorizontally();
    row.centerAlignContent();
    row.spacing = 4;

    const icon = row.addText("📅");
    icon.font = Font.systemFont(11);

    const eventTitle = row.addText(event.title);
    eventTitle.font = Font.systemFont(11);
    eventTitle.textColor = C.muted;
    eventTitle.lineLimit = 1;

    if (event.start_time) {
      row.addSpacer();
      const time = row.addText(formatTime(event.start_time));
      time.font = Font.systemFont(11);
      time.textColor = C.muted;
    }
  }

  return w;
}

// ===== 위젯 — 잠금화면 (accessoryRectangular) =====
function createLockWidget(data) {
  const w = new ListWidget();
  const incomplete = data.todos.filter((t) => !t.is_completed);

  if (incomplete.length === 0) {
    const t = w.addText("오늘 할 일 완료 ✓");
    t.font = Font.mediumSystemFont(12);
    return w;
  }

  const countText = w.addText(`● ${incomplete.length}개 남음`);
  countText.font = Font.boldSystemFont(12);

  if (incomplete[0]) {
    const firstText = w.addText(incomplete[0].title);
    firstText.font = Font.systemFont(11);
    firstText.lineLimit = 1;
  }

  return w;
}

// ===== 에러 위젯 =====
function createErrorWidget(message) {
  const w = new ListWidget();
  w.backgroundColor = C.bg;
  w.setPadding(14, 14, 14, 14);
  const t = w.addText(message);
  t.font = Font.systemFont(12);
  t.textColor = C.muted;
  t.minimumScaleFactor = 0.7;
  return w;
}

// ===== 메인 =====
async function run() {
  // 앱에서 직접 실행
  if (config.runsInApp) {
    if (!Keychain.contains(KEYCHAIN_KEY)) {
      await setup();
      return;
    }

    const alert = new Alert();
    alert.title = "하루투두 위젯";
    alert.addAction("위젯 미리보기");
    alert.addAction("다시 로그인");
    alert.addCancelAction("취소");
    const choice = await alert.presentAlert();

    if (choice === 1) {
      await setup();
      return;
    }
    if (choice === -1) return;
  }

  const token = await getAccessToken();

  if (!token) {
    const w = createErrorWidget("Scriptable 앱에서 먼저 실행해 로그인하세요");
    Script.setWidget(w);
    if (config.runsInApp) w.presentMedium();
    return;
  }

  let data;
  try {
    data = await fetchData(token);
  } catch {
    const w = createErrorWidget("데이터를 불러오지 못했어요");
    Script.setWidget(w);
    if (config.runsInApp) w.presentMedium();
    return;
  }

  if (data.error) {
    const w = createErrorWidget(
      data.error === "no_couple" ? "커플 연결 후 사용할 수 있어요" : "오류가 발생했어요"
    );
    Script.setWidget(w);
    if (config.runsInApp) w.presentMedium();
    return;
  }

  const family = config.widgetFamily;
  let widget;

  if (family === "small") {
    widget = createSmallWidget(data);
  } else if (family === "accessoryRectangular") {
    widget = createLockWidget(data);
  } else {
    widget = createMediumWidget(data);
  }

  Script.setWidget(widget);
  if (config.runsInApp) widget.presentMedium();
}

await run();
