import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const PROJECT_REF = "ufktbteicipsjzoqqbat";
const DEMO_PREFIX = "portfolio.demo.";

function readEnv(source) {
  const values = {};
  for (const line of source.split(/\r?\n/)) {
    if (!line || line.trimStart().startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index < 1) continue;
    values[line.slice(0, index)] = line.slice(index + 1);
  }
  return values;
}

function randomToken(length = 18) {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  return Array.from(
    { length },
    () => alphabet[Math.floor(Math.random() * alphabet.length)]
  ).join("");
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDate(base, days) {
  const date = new Date(`${base}T12:00:00+09:00`);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

async function getServiceRoleKey(accessToken) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/api-keys`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!response.ok) {
    throw new Error(`Management API failed: ${response.status}`);
  }
  const keys = await response.json();
  const serviceRole = keys.find((key) => key.name === "service_role");
  if (!serviceRole?.api_key) {
    throw new Error("service_role key is unavailable");
  }
  return serviceRole.api_key;
}

async function removePreviousDemoUsers(admin) {
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 100,
    });
    if (error) throw error;
    const targets = data.users.filter((user) =>
      user.email?.startsWith(DEMO_PREFIX)
    );
    for (const target of targets) {
      const { error: deleteError } =
        await admin.auth.admin.deleteUser(target.id);
      if (deleteError) throw deleteError;
    }
    if (data.users.length < 100) break;
    page += 1;
  }
}

async function createDemoUser(admin, email, password, displayName) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (error || !data.user) throw error ?? new Error("User creation failed");
  return data.user;
}

const env = readEnv(await readFile(".env.local", "utf8"));
const accessToken = env.SUPABASE_ACCESS_TOKEN;
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!accessToken || !supabaseUrl || !anonKey) {
  throw new Error("Required Supabase environment variables are missing");
}
if (!supabaseUrl.includes(PROJECT_REF)) {
  throw new Error("Refusing to seed a project other than harutodo_dev");
}

const serviceRoleKey = await getServiceRoleKey(accessToken);
const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

await removePreviousDemoUsers(admin);

const suffix = Date.now().toString(36);
const password = `Haru!${randomToken()}7`;
const user1Email = `${DEMO_PREFIX}${suffix}.minseo@example.com`;
const user2Email = `${DEMO_PREFIX}${suffix}.jiho@example.com`;
const minseo = await createDemoUser(admin, user1Email, password, "민서");
const jiho = await createDemoUser(admin, user2Email, password, "지호");

const { error: profileError } = await admin
  .from("profiles")
  .update({ avatar_color: "mint" })
  .eq("id", minseo.id);
if (profileError) throw profileError;
const { error: partnerProfileError } = await admin
  .from("profiles")
  .update({ avatar_color: "lavender" })
  .eq("id", jiho.id);
if (partnerProfileError) throw partnerProfileError;

const { data: couple, error: coupleError } = await admin
  .from("couples")
  .insert({ user1_id: minseo.id, user2_id: jiho.id })
  .select("id")
  .single();
if (coupleError) throw coupleError;

const today = formatDate(new Date());
const yesterday = shiftDate(today, -1);
const tomorrow = shiftDate(today, 1);
const nextSaturday = shiftDate(today, 2);

const { data: group, error: groupError } = await admin
  .from("custom_groups")
  .insert({
    couple_id: couple.id,
    created_by: minseo.id,
    name: "여행 준비",
  })
  .select("id")
  .single();
if (groupError) throw groupError;

const todos = [
  {
    couple_id: couple.id,
    created_by: minseo.id,
    assignee_id: null,
    title: "주말 장보기 목록 확인",
    date: today,
    group: "together",
    is_completed: false,
  },
  {
    couple_id: couple.id,
    created_by: minseo.id,
    assignee_id: minseo.id,
    title: "여행 숙소 예약 확인",
    date: today,
    group: "individual",
    is_completed: true,
  },
  {
    couple_id: couple.id,
    created_by: jiho.id,
    assignee_id: jiho.id,
    title: "저녁 식당 후보 찾아보기",
    date: today,
    group: "individual",
    is_completed: false,
  },
  {
    couple_id: couple.id,
    created_by: minseo.id,
    assignee_id: null,
    title: "공용 생활비 정리",
    date: today,
    group: "other",
    is_completed: false,
  },
  {
    couple_id: couple.id,
    created_by: minseo.id,
    assignee_id: minseo.id,
    title: "렌터카 예약 조건 비교",
    date: today,
    group: "custom",
    custom_group_id: group.id,
    is_completed: false,
  },
  {
    couple_id: couple.id,
    created_by: jiho.id,
    assignee_id: jiho.id,
    title: "여행 준비물 체크",
    date: yesterday,
    group: "custom",
    custom_group_id: group.id,
    is_completed: false,
  },
];
const { error: todoError } = await admin.from("todo_items").insert(todos);
if (todoError) throw todoError;

const events = [
  {
    couple_id: couple.id,
    created_by: minseo.id,
    assignee_id: null,
    title: "주말 데이트",
    date: nextSaturday,
    start_time: "14:00",
    end_time: "18:00",
  },
  {
    couple_id: couple.id,
    created_by: minseo.id,
    assignee_id: minseo.id,
    title: "운동 수업",
    date: tomorrow,
    start_time: "19:30",
    end_time: "20:30",
  },
  {
    couple_id: couple.id,
    created_by: jiho.id,
    assignee_id: jiho.id,
    title: "친구 모임",
    date: shiftDate(today, 5),
    start_time: "18:30",
    end_time: "21:00",
  },
  {
    couple_id: couple.id,
    created_by: minseo.id,
    assignee_id: null,
    title: "여름 여행",
    date: shiftDate(today, 8),
    end_date: shiftDate(today, 10),
  },
];
const { error: eventError } = await admin.from("events").insert(events);
if (eventError) throw eventError;

await mkdir(".tmp-portfolio", { recursive: true });
await writeFile(
  ".tmp-portfolio/demo-session.json",
  JSON.stringify({
    projectRef: PROJECT_REF,
    email: user1Email,
    password,
    coupleId: couple.id,
    userIds: [minseo.id, jiho.id],
  }),
  { mode: 0o600 }
);

console.log(
  JSON.stringify({
    created: true,
    project: "harutodo_dev",
    profiles: ["민서", "지호"],
    todos: todos.length,
    events: events.length,
    sessionFile: ".tmp-portfolio/demo-session.json",
  })
);
