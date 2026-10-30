\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id) VALUES ('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222'),('44444444-4444-4444-8444-444444444444');
INSERT INTO public.profiles(id,display_name) SELECT id,'test' FROM auth.users;
INSERT INTO public.feedback_admins(user_id) VALUES ('44444444-4444-4444-8444-444444444444');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
SELECT (public.prepare_feedback_attachment('screen.png','image/png',10485760)->>'id')::uuid AS aid \gset
INSERT INTO storage.objects(bucket_id,name) SELECT 'feedback-images',storage_path FROM public.feedback_attachments WHERE id=:'aid';
DO $$ DECLARE aid uuid; BEGIN
 SELECT id INTO aid FROM public.feedback_attachments LIMIT 1;
 BEGIN PERFORM public.submit_feedback(gen_random_uuid(),'첨부','내용',ARRAY[aid]); RAISE EXCEPTION 'unverified attachment linked'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'invalid_attachments' THEN RAISE; END IF; END;
 BEGIN PERFORM public.prepare_feedback_attachment('bad.svg','image/svg+xml',10); RAISE EXCEPTION 'svg accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN PERFORM public.prepare_feedback_attachment('big.png','image/png',10485761); RAISE EXCEPTION 'oversize accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
RESET ROLE;
UPDATE public.feedback_attachments SET verified=true WHERE id=:'aid';
SET LOCAL ROLE authenticated;
SELECT (public.submit_feedback(gen_random_uuid(),'첨부','내용',ARRAY[:'aid'::uuid])->>'id')::uuid AS fid \gset
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
DO $$ BEGIN
 IF (SELECT count(*) FROM public.feedback_attachments)<>0 OR (SELECT count(*) FROM storage.objects)<>0 THEN RAISE EXCEPTION 'image leak'; END IF;
 IF public.feedback_json((SELECT id FROM public.feedback LIMIT 1)) IS NOT NULL THEN RAISE EXCEPTION 'detail leak'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',true);
DO $$ BEGIN
 IF (SELECT count(*) FROM storage.objects)<>1 THEN RAISE EXCEPTION 'admin cannot read'; END IF;
 DELETE FROM storage.objects WHERE bucket_id='feedback-images';
 IF (SELECT count(*) FROM storage.objects)<>1 THEN RAISE EXCEPTION 'admin object delete'; END IF;
END $$;
SELECT public.save_feedback_reply(:'fid',1,0,'답변');
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
DO $$ BEGIN
 DELETE FROM storage.objects WHERE bucket_id='feedback-images';
 IF (SELECT count(*) FROM storage.objects)<>1 THEN RAISE EXCEPTION 'author object delete after reply'; END IF;
END $$;
RESET ROLE;
DELETE FROM auth.users WHERE id='11111111-1111-4111-8111-111111111111';
DO $$ BEGIN IF (SELECT count(*) FROM public.claim_feedback_attachment_cleanup())<>1 THEN RAISE EXCEPTION 'deleted account image orphaned'; END IF; END $$;
ROLLBACK;
