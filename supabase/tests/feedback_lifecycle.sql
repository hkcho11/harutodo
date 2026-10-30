\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id) VALUES ('11111111-1111-4111-8111-111111111111'),('44444444-4444-4444-8444-444444444444');
INSERT INTO public.profiles(id,display_name) SELECT id,'test' FROM auth.users;
INSERT INTO public.feedback_admins(user_id) VALUES ('44444444-4444-4444-8444-444444444444');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
SELECT (public.submit_feedback('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','첫 의견','내용','{}')->>'id')::uuid AS fid \gset
SELECT (public.submit_feedback('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','다시 보냄','내용','{}')->>'id')::uuid = :'fid'::uuid AS retry_same \gset
\if :retry_same
\else
\quit 1
\endif
DO $$ BEGIN
 IF (SELECT count(*) FROM public.feedback)<>1 THEN RAISE EXCEPTION 'duplicate submission'; END IF;
 IF public.feedback_preferences_get()->>'enabled'<>'false' THEN RAISE EXCEPTION 'default notification on'; END IF;
 PERFORM public.feedback_preferences_set(false,true);
 PERFORM public.feedback_preferences_set(false,false);
 IF public.feedback_preferences_get()->>'promptSeen'<>'true' THEN RAISE EXCEPTION 'prompt repeated'; END IF;
END $$;
SELECT public.update_feedback(:'fid',1,'수정','수정 내용','{}');
SELECT set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',true);
DO $$ DECLARE fid uuid; BEGIN
 SELECT id INTO fid FROM public.feedback;
 BEGIN PERFORM public.save_feedback_reply(fid,1,0,'오래된 내용에 답변'); RAISE EXCEPTION 'stale reply allowed'; EXCEPTION WHEN serialization_failure THEN NULL; END;
 BEGIN PERFORM public.save_feedback_reply(fid,NULL,0,'버전 누락'); RAISE EXCEPTION 'null revision allowed'; EXCEPTION WHEN serialization_failure THEN NULL; END;
 PERFORM public.save_feedback_reply(fid,2,0,'첫 답변');
 PERFORM public.save_feedback_reply(fid,2,1,' 첫 답변 ');
 IF (SELECT reply_revision FROM public.feedback WHERE id=fid)<>1 THEN RAISE EXCEPTION 'noop creates revision'; END IF;
 PERFORM public.save_feedback_reply(fid,2,1,'수정 답변');
 BEGIN PERFORM public.save_feedback_reply(fid,2,1,'덮어쓰기'); RAISE EXCEPTION 'stale answer allowed'; EXCEPTION WHEN serialization_failure THEN NULL; END;
 BEGIN PERFORM public.save_feedback_reply(fid,2,2,NULL); RAISE EXCEPTION 'null reply allowed'; EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
DO $$ DECLARE fid uuid; BEGIN
 SELECT id INTO fid FROM public.feedback;
 PERFORM public.mark_feedback_reply_read(fid,1);
 IF (public.feedback_context()->>'unreadReplies')::int<>1 THEN RAISE EXCEPTION 'new revision incorrectly cleared'; END IF;
 PERFORM public.mark_feedback_reply_read(fid,999);
 IF (public.feedback_context()->>'unreadReplies')::int<>1 THEN RAISE EXCEPTION 'forged future read'; END IF;
 PERFORM public.mark_feedback_reply_read(fid,2);
 IF (public.feedback_context()->>'unreadReplies')::int<>0 THEN RAISE EXCEPTION 'read not saved'; END IF;
 BEGIN PERFORM public.update_feedback(fid,2,'수정','내용','{}'); RAISE EXCEPTION 'answered edit allowed'; EXCEPTION WHEN serialization_failure THEN NULL; END;
 BEGIN PERFORM public.delete_feedback(fid,2); RAISE EXCEPTION 'answered delete allowed'; EXCEPTION WHEN serialization_failure THEN NULL; END;
END $$;
RESET ROLE;
DO $$ BEGIN IF (SELECT count(*) FROM public.feedback_notification_outbox)<>3 THEN RAISE EXCEPTION 'wrong event count'; END IF; END $$;
ROLLBACK;
