BEGIN;
ALTER TABLE public.feedback_notification_outbox ADD COLUMN delivered_endpoints text[] NOT NULL DEFAULT '{}';
CREATE OR REPLACE FUNCTION public.claim_feedback_notifications() RETURNS SETOF public.feedback_notification_outbox LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 UPDATE public.feedback_notification_outbox SET status='failed' WHERE status='sending' AND lease_until<now() AND attempts>=3;
 RETURN QUERY UPDATE public.feedback_notification_outbox SET status='sending',attempts=attempts+1,lease_until=now()+interval '5 minutes',lease_token=gen_random_uuid()
 WHERE id IN (SELECT id FROM public.feedback_notification_outbox WHERE attempts<3 AND
 ((status='pending' AND next_attempt_at<=now()) OR (status='sending' AND lease_until<now()))
 ORDER BY created_at LIMIT 10 FOR UPDATE SKIP LOCKED) RETURNING *;
END $$;
-- Preserve metadata for removal after account deletion instead of leaking an orphaned object.
ALTER TABLE public.feedback_attachments DROP CONSTRAINT feedback_attachments_owner_id_fkey;
ALTER TABLE public.feedback_attachments ALTER COLUMN owner_id DROP NOT NULL;
ALTER TABLE public.feedback_attachments ADD CONSTRAINT feedback_attachments_owner_id_fkey FOREIGN KEY(owner_id) REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE FUNCTION public.claim_feedback_attachment_cleanup() RETURNS SETOF public.feedback_attachments LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 UPDATE public.feedback_attachments SET cleanup_ready=true WHERE id IN (
 SELECT id FROM public.feedback_attachments WHERE feedback_id IS NULL AND
 (cleanup_ready OR owner_id IS NULL OR created_at<now()-interval '24 hours') ORDER BY created_at LIMIT 100 FOR UPDATE SKIP LOCKED
 ) RETURNING *
$$;
REVOKE ALL ON FUNCTION public.claim_feedback_attachment_cleanup() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_feedback_attachment_cleanup() TO service_role;
COMMIT;

-- Only schedule when the existing environment's Vault configuration is present.
-- Local fixture DB has no Vault/pg_cron and must not contact live endpoints.
DO $$
DECLARE suffix text; target_url text; anon_key text; cron_secret text;
BEGIN
 IF to_regclass('vault.decrypted_secrets') IS NULL OR to_regnamespace('cron') IS NULL THEN RETURN; END IF;
 EXECUTE 'SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name=''harutodo_function_base_url'' LIMIT 1' INTO target_url;
 EXECUTE 'SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name=''harutodo_anon_key'' LIMIT 1' INTO anon_key;
 EXECUTE 'SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name=''harutodo_cron_secret'' LIMIT 1' INTO cron_secret;
 IF target_url IS NULL OR anon_key IS NULL OR cron_secret IS NULL THEN RAISE NOTICE 'Feedback cron not scheduled: configure existing Vault secrets first'; RETURN; END IF;
 FOREACH suffix IN ARRAY ARRAY['feedback-notifications','cleanup-feedback-attachments'] LOOP
  -- Secret values stay in Vault; cron stores only lookup expressions.
  EXECUTE format($outer$SELECT cron.schedule(%L,%L,$job$
   SELECT net.http_post(
    url:=(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='harutodo_function_base_url' LIMIT 1)||%L,
    headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='harutodo_anon_key' LIMIT 1),'X-Cron-Secret',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='harutodo_cron_secret' LIMIT 1)),
    body:='{}'::jsonb)
   $job$)$outer$,suffix,CASE WHEN suffix='feedback-notifications' THEN '* * * * *' ELSE '17 * * * *' END,'/'||suffix);
 END LOOP;
END $$;
