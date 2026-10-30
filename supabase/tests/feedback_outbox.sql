\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id) VALUES ('11111111-1111-4111-8111-111111111111'),('44444444-4444-4444-8444-444444444444');
INSERT INTO public.profiles(id,display_name) SELECT id,'test' FROM auth.users;
INSERT INTO public.feedback_admins(user_id) VALUES ('44444444-4444-4444-8444-444444444444');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
SELECT public.submit_feedback(gen_random_uuid(),'의견','내용','{}');
DO $$ BEGIN
 BEGIN PERFORM public.claim_feedback_notifications(); RAISE EXCEPTION 'user can send'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET LOCAL ROLE service_role;
DO $$ DECLARE job public.feedback_notification_outbox; BEGIN
 SELECT * INTO job FROM public.claim_feedback_notifications();
 IF job.attempts<>1 OR job.lease_token IS NULL THEN RAISE EXCEPTION 'job not leased'; END IF;
 IF (SELECT count(*) FROM public.claim_feedback_notifications())<>0 THEN RAISE EXCEPTION 'active job double claimed'; END IF;
 UPDATE public.feedback_notification_outbox SET lease_until=now()-interval '1 minute' WHERE id=job.id;
 SELECT * INTO job FROM public.claim_feedback_notifications();
 IF job.attempts<>2 THEN RAISE EXCEPTION 'retry not counted'; END IF;
 UPDATE public.feedback_notification_outbox SET lease_until=now()-interval '1 minute',attempts=3 WHERE id=job.id;
 PERFORM public.claim_feedback_notifications();
 IF (SELECT status FROM public.feedback_notification_outbox WHERE id=job.id)<>'failed' THEN RAISE EXCEPTION 'exhausted job not finalized'; END IF;
END $$;
ROLLBACK;
