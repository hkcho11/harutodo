\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id) VALUES ('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222'),('33333333-3333-4333-8333-333333333333'),('44444444-4444-4444-8444-444444444444');
INSERT INTO public.profiles(id,display_name) SELECT id,'test' FROM auth.users;
INSERT INTO public.feedback_admins(user_id) VALUES ('44444444-4444-4444-8444-444444444444');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
SELECT public.submit_feedback('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','제목','내용','{}');
DO $$ BEGIN IF (SELECT count(*) FROM public.feedback) <> 1 THEN RAISE EXCEPTION 'owner read denied'; END IF; END $$;
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
DO $$ BEGIN
 IF (SELECT count(*) FROM public.feedback) <> 0 THEN RAISE EXCEPTION 'private item leaked'; END IF;
 BEGIN INSERT INTO public.feedback_admins(user_id) VALUES (auth.uid()); RAISE EXCEPTION 'role escalation'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.save_feedback_reply('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',1,0,'forged'); RAISE EXCEPTION 'reply escalation'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',true);
DO $$ BEGIN IF (SELECT count(*) FROM public.feedback) <> 1 THEN RAISE EXCEPTION 'admin read denied'; END IF; END $$;
ROLLBACK;
