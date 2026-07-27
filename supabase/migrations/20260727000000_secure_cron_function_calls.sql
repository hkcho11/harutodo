-- 예약 알림 Edge Function은 service-role로 동작하므로 cron 전용 secret을
-- 검증한다. 환경별 값은 Git에 저장하지 않고 Supabase Vault에서 조회한다.

DO $$
DECLARE
  missing_names text;
BEGIN
  SELECT string_agg(required.name, ', ' ORDER BY required.name)
  INTO missing_names
  FROM (
    VALUES
      ('harutodo_anon_key'),
      ('harutodo_cron_secret'),
      ('harutodo_function_base_url')
  ) AS required(name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM vault.decrypted_secrets AS secret
    WHERE secret.name = required.name
      AND secret.decrypted_secret IS NOT NULL
      AND secret.decrypted_secret <> ''
  );

  IF missing_names IS NOT NULL THEN
    RAISE EXCEPTION 'Required Vault secrets are missing: %', missing_names;
  END IF;
END
$$;

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname IN (
  'morning-summary-every-15min',
  'evening-reminder-every-15min',
  'event-reminder-every-5min'
);

SELECT cron.schedule(
  'morning-summary-every-15min',
  '*/15 * * * *',
  $schedule$
  SELECT net.http_post(
    url := (
      SELECT decrypted_secret || '/morning-summary'
      FROM vault.decrypted_secrets
      WHERE name = 'harutodo_function_base_url'
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'harutodo_anon_key'
      ),
      'X-Cron-Secret', (
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'harutodo_cron_secret'
      )
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $schedule$
);

SELECT cron.schedule(
  'evening-reminder-every-15min',
  '*/15 * * * *',
  $schedule$
  SELECT net.http_post(
    url := (
      SELECT decrypted_secret || '/evening-reminder'
      FROM vault.decrypted_secrets
      WHERE name = 'harutodo_function_base_url'
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'harutodo_anon_key'
      ),
      'X-Cron-Secret', (
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'harutodo_cron_secret'
      )
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $schedule$
);

SELECT cron.schedule(
  'event-reminder-every-5min',
  '*/5 * * * *',
  $schedule$
  SELECT net.http_post(
    url := (
      SELECT decrypted_secret || '/event-reminder'
      FROM vault.decrypted_secrets
      WHERE name = 'harutodo_function_base_url'
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'harutodo_anon_key'
      ),
      'X-Cron-Secret', (
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'harutodo_cron_secret'
      )
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $schedule$
);
