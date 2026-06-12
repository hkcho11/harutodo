-- ============================================================
-- pg_cron 스케줄: 알림 Edge Function 주기적 호출
-- ============================================================
-- anon key는 공개 값이므로 소스코드 포함 허용.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

select cron.schedule(
  'morning-summary-every-15min',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://eefgpaqjdhgsqljknsfp.supabase.co/functions/v1/morning-summary',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZmdwYXFqZGhnc3Fsamtuc2ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4NTYxMDEsImV4cCI6MjA5NTQzMjEwMX0.qZtidXlb8Hh_fYozDZ-bYDgjVnWxWroY0q7LzSE5UQ4"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);

select cron.schedule(
  'evening-reminder-every-15min',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://eefgpaqjdhgsqljknsfp.supabase.co/functions/v1/evening-reminder',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZmdwYXFqZGhnc3Fsamtuc2ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4NTYxMDEsImV4cCI6MjA5NTQzMjEwMX0.qZtidXlb8Hh_fYozDZ-bYDgjVnWxWroY0q7LzSE5UQ4"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);

select cron.schedule(
  'event-reminder-every-5min',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://eefgpaqjdhgsqljknsfp.supabase.co/functions/v1/event-reminder',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZmdwYXFqZGhnc3Fsamtuc2ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4NTYxMDEsImV4cCI6MjA5NTQzMjEwMX0.qZtidXlb8Hh_fYozDZ-bYDgjVnWxWroY0q7LzSE5UQ4"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);
