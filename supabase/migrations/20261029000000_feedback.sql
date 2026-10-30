BEGIN;
CREATE TABLE public.feedback_admins(user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE);
CREATE TABLE public.feedback (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 request_id uuid NOT NULL, title text NOT NULL CHECK(length(btrim(title)) BETWEEN 1 AND 100),
 content text NOT NULL CHECK(length(btrim(content)) BETWEEN 1 AND 5000), revision integer NOT NULL DEFAULT 1,
 reply_content text CHECK(length(btrim(reply_content)) BETWEEN 1 AND 5000), reply_author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 reply_revision integer NOT NULL DEFAULT 0, read_reply_revision integer NOT NULL DEFAULT 0,
 reply_updated_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(author_id,request_id), CHECK(read_reply_revision BETWEEN 0 AND reply_revision),
 CONSTRAINT feedback_reply_consistent CHECK ((reply_revision=0 AND reply_content IS NULL AND reply_updated_at IS NULL) OR
 (reply_revision>0 AND reply_content IS NOT NULL AND reply_updated_at IS NOT NULL))
);
CREATE INDEX feedback_pending_order ON public.feedback(created_at,id) WHERE reply_revision=0;
CREATE INDEX feedback_answered_order ON public.feedback(reply_updated_at DESC,id DESC) WHERE reply_revision>0;
CREATE INDEX feedback_author_order ON public.feedback(author_id,created_at DESC,id DESC);
CREATE TABLE public.feedback_preferences (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, enabled boolean NOT NULL DEFAULT false, prompt_seen boolean NOT NULL DEFAULT false
);
CREATE TABLE public.feedback_attachments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 feedback_id uuid REFERENCES public.feedback(id) ON DELETE SET NULL, storage_path text NOT NULL UNIQUE,
 original_name text NOT NULL, media_type text NOT NULL CHECK(media_type IN ('image/jpeg','image/png','image/webp')),
 byte_size bigint NOT NULL CHECK(byte_size BETWEEN 1 AND 10485760), verified boolean NOT NULL DEFAULT false,
 cleanup_ready boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.feedback_notification_outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), feedback_id uuid NOT NULL REFERENCES public.feedback(id) ON DELETE CASCADE,
 recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('new','reply')), reply_revision integer NOT NULL DEFAULT 0,
 attempts integer NOT NULL DEFAULT 0, status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','sent','skipped','failed')),
 next_attempt_at timestamptz NOT NULL DEFAULT now(), lease_until timestamptz, lease_token uuid,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(feedback_id,recipient_id,kind,reply_revision)
);
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_notification_outbox ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.is_feedback_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM public.feedback_admins WHERE user_id=auth.uid())
$$;
CREATE POLICY feedback_read ON public.feedback FOR SELECT TO authenticated USING(author_id=auth.uid() OR public.is_feedback_admin());
CREATE POLICY feedback_preferences_read ON public.feedback_preferences FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY feedback_attachments_read ON public.feedback_attachments FOR SELECT TO authenticated USING(
 owner_id=auth.uid() OR (feedback_id IS NOT NULL AND public.is_feedback_admin())
);
REVOKE ALL ON public.feedback,public.feedback_admins,public.feedback_preferences,public.feedback_attachments,public.feedback_notification_outbox FROM anon,authenticated;
GRANT SELECT ON public.feedback,public.feedback_preferences,public.feedback_attachments TO authenticated;
GRANT ALL ON public.feedback,public.feedback_admins,public.feedback_preferences,public.feedback_attachments,public.feedback_notification_outbox TO service_role;

CREATE FUNCTION public.feedback_json(p_id uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT jsonb_build_object('id',f.id,'authorId',f.author_id,'authorName',coalesce(p.display_name,'사용자'),
 'title',f.title,'content',f.content,'revision',f.revision,'createdAt',f.created_at,'updatedAt',f.updated_at,
 'replyRevision',f.reply_revision,'readReplyRevision',f.read_reply_revision,
 'reply',CASE WHEN f.reply_revision=0 THEN NULL ELSE jsonb_build_object('content',f.reply_content,'revision',f.reply_revision,'updatedAt',f.reply_updated_at) END,
 'attachments',coalesce((SELECT jsonb_agg(jsonb_build_object('id',a.id,'originalName',a.original_name,'mediaType',a.media_type,'byteSize',a.byte_size) ORDER BY a.created_at,a.id)
 FROM public.feedback_attachments a WHERE a.feedback_id=f.id AND NOT a.cleanup_ready),'[]'::jsonb))
 FROM public.feedback f LEFT JOIN public.profiles p ON p.id=f.author_id
 WHERE f.id=p_id AND (f.author_id=auth.uid() OR public.is_feedback_admin())
$$;
CREATE FUNCTION public.feedback_context() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT jsonb_build_object('userId',auth.uid(),'isAdmin',public.is_feedback_admin(),
 'unreadReplies',(SELECT count(*) FROM public.feedback WHERE author_id=auth.uid() AND reply_revision>read_reply_revision),
 'pendingFeedback',CASE WHEN public.is_feedback_admin() THEN (SELECT count(*) FROM public.feedback WHERE reply_revision=0) ELSE 0 END,
 'answeredFeedback',CASE WHEN public.is_feedback_admin() THEN (SELECT count(*) FROM public.feedback WHERE reply_revision>0) ELSE 0 END)
$$;
CREATE FUNCTION public.list_feedback(p_status text DEFAULT 'mine',p_cursor jsonb DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result jsonb; last_row jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 IF p_status NOT IN ('mine','pending','answered') OR (p_status<>'mine' AND NOT public.is_feedback_admin()) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 WITH page AS (
 SELECT f.id,CASE WHEN p_status='answered' THEN f.reply_updated_at ELSE f.created_at END AS sort_at
 FROM public.feedback f WHERE
 ((p_status='mine' AND f.author_id=auth.uid()) OR (p_status='pending' AND f.reply_revision=0) OR (p_status='answered' AND f.reply_revision>0))
 AND (p_cursor IS NULL OR CASE WHEN p_status='pending' THEN (f.created_at,f.id)>((p_cursor->>'at')::timestamptz,(p_cursor->>'id')::uuid)
 ELSE (CASE WHEN p_status='answered' THEN f.reply_updated_at ELSE f.created_at END,f.id)<((p_cursor->>'at')::timestamptz,(p_cursor->>'id')::uuid) END)
 ORDER BY CASE WHEN p_status='pending' THEN f.created_at END ASC,
 CASE WHEN p_status='answered' THEN f.reply_updated_at WHEN p_status='mine' THEN f.created_at END DESC,
 CASE WHEN p_status='pending' THEN f.id END ASC, f.id DESC LIMIT 20
 ) SELECT coalesce(jsonb_agg(jsonb_build_object('item',public.feedback_json(id),'at',sort_at,'id',id)),'[]'::jsonb) INTO result FROM page;
 IF jsonb_array_length(result)=20 THEN last_row=result->19; END IF;
 RETURN jsonb_build_object('items',coalesce((SELECT jsonb_agg(value->'item') FROM jsonb_array_elements(result)),'[]'::jsonb),
 'nextCursor',CASE WHEN last_row IS NULL THEN NULL ELSE jsonb_build_object('at',last_row->'at','id',last_row->'id')::text END);
END $$;
CREATE FUNCTION public.link_feedback_attachments(p_id uuid,p_attachments uuid[]) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE n integer;
BEGIN
 IF coalesce(cardinality(p_attachments),0)>3 THEN RAISE EXCEPTION 'too_many_images'; END IF;
 PERFORM 1 FROM public.feedback_attachments WHERE id=ANY(p_attachments) ORDER BY id FOR UPDATE;
 SELECT count(*) INTO n FROM public.feedback_attachments WHERE id=ANY(p_attachments) AND owner_id=auth.uid() AND verified AND NOT cleanup_ready AND (feedback_id IS NULL OR feedback_id=p_id);
 IF n<>coalesce(cardinality(p_attachments),0) THEN RAISE EXCEPTION 'invalid_attachments'; END IF;
 UPDATE public.feedback_attachments SET cleanup_ready=true,feedback_id=NULL WHERE feedback_id=p_id AND NOT(id=ANY(coalesce(p_attachments,'{}')));
 UPDATE public.feedback_attachments SET feedback_id=p_id WHERE id=ANY(p_attachments);
END $$;
CREATE FUNCTION public.submit_feedback(p_request_id uuid,p_title text,p_content text,p_attachments uuid[] DEFAULT '{}') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE fid uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 -- Serialize request retries as well as attachment linking.
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_request_id::text,0));
 SELECT id INTO fid FROM public.feedback WHERE author_id=auth.uid() AND request_id=p_request_id;
 IF fid IS NOT NULL THEN RETURN public.feedback_json(fid); END IF;
 INSERT INTO public.feedback(author_id,request_id,title,content) VALUES(auth.uid(),p_request_id,btrim(p_title),btrim(p_content)) RETURNING id INTO fid;
 PERFORM public.link_feedback_attachments(fid,p_attachments);
 INSERT INTO public.feedback_notification_outbox(feedback_id,recipient_id,kind)
 SELECT fid,user_id,'new' FROM public.feedback_admins WHERE user_id<>auth.uid();
 RETURN public.feedback_json(fid);
END $$;
CREATE FUNCTION public.update_feedback(p_id uuid,p_revision integer,p_title text,p_content text,p_attachments uuid[] DEFAULT '{}') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE f public.feedback;
BEGIN
 SELECT * INTO f FROM public.feedback WHERE id=p_id AND author_id=auth.uid() FOR UPDATE;
 IF f.id IS NULL THEN RAISE EXCEPTION 'not_found' USING ERRCODE='42501'; END IF;
 IF f.reply_revision>0 OR f.revision IS DISTINCT FROM p_revision THEN RAISE EXCEPTION 'feedback_conflict' USING ERRCODE='40001'; END IF;
 PERFORM public.link_feedback_attachments(p_id,p_attachments);
 UPDATE public.feedback SET title=btrim(p_title),content=btrim(p_content),revision=revision+1,updated_at=now() WHERE id=p_id;
 RETURN public.feedback_json(p_id);
END $$;
CREATE FUNCTION public.delete_feedback(p_id uuid,p_revision integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE f public.feedback;
BEGIN
 SELECT * INTO f FROM public.feedback WHERE id=p_id AND author_id=auth.uid() FOR UPDATE;
 IF f.id IS NULL THEN RAISE EXCEPTION 'not_found' USING ERRCODE='42501'; END IF;
 IF f.reply_revision>0 OR f.revision IS DISTINCT FROM p_revision THEN RAISE EXCEPTION 'feedback_conflict' USING ERRCODE='40001'; END IF;
 UPDATE public.feedback_attachments SET cleanup_ready=true WHERE feedback_id=p_id;
 DELETE FROM public.feedback WHERE id=p_id;
END $$;
CREATE FUNCTION public.save_feedback_reply(p_id uuid,p_revision integer,p_reply_revision integer,p_content text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE f public.feedback;
BEGIN
 IF NOT public.is_feedback_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 SELECT * INTO f FROM public.feedback WHERE id=p_id FOR UPDATE;
 IF f.id IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
 IF f.revision IS DISTINCT FROM p_revision OR f.reply_revision IS DISTINCT FROM p_reply_revision THEN RAISE EXCEPTION 'feedback_conflict' USING ERRCODE='40001'; END IF;
 IF f.reply_content=btrim(p_content) THEN RETURN public.feedback_json(p_id); END IF;
 UPDATE public.feedback SET reply_content=btrim(p_content),reply_author_id=auth.uid(),reply_revision=reply_revision+1,reply_updated_at=now() WHERE id=p_id;
 INSERT INTO public.feedback_notification_outbox(feedback_id,recipient_id,kind,reply_revision) VALUES(p_id,f.author_id,'reply',f.reply_revision+1);
 RETURN public.feedback_json(p_id);
END $$;
CREATE FUNCTION public.mark_feedback_reply_read(p_id uuid,p_revision integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 UPDATE public.feedback SET read_reply_revision=greatest(read_reply_revision,p_revision)
 WHERE id=p_id AND author_id=auth.uid() AND p_revision BETWEEN 0 AND reply_revision;
END $$;
CREATE FUNCTION public.feedback_preferences_get() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT jsonb_build_object('enabled',coalesce((SELECT enabled FROM public.feedback_preferences WHERE user_id=auth.uid()),false),
 'promptSeen',coalesce((SELECT prompt_seen FROM public.feedback_preferences WHERE user_id=auth.uid()),false))
$$;
CREATE FUNCTION public.feedback_preferences_set(p_enabled boolean DEFAULT NULL,p_prompt_seen boolean DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 INSERT INTO public.feedback_preferences(user_id,enabled,prompt_seen) VALUES(auth.uid(),coalesce(p_enabled,false),coalesce(p_prompt_seen,false))
 ON CONFLICT(user_id) DO UPDATE SET enabled=coalesce(p_enabled,feedback_preferences.enabled),prompt_seen=feedback_preferences.prompt_seen OR coalesce(p_prompt_seen,false);
 RETURN public.feedback_preferences_get();
END $$;
CREATE FUNCTION public.prepare_feedback_attachment(p_name text,p_type text,p_size bigint) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE a public.feedback_attachments; aid uuid:=gen_random_uuid();
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 IF length(p_name)>255 OR length(p_name)=0 THEN RAISE EXCEPTION 'invalid_name'; END IF;
 IF (SELECT count(*) FROM public.feedback_attachments WHERE owner_id=auth.uid() AND feedback_id IS NULL AND NOT cleanup_ready)>30 THEN RAISE EXCEPTION 'too_many_pending_uploads'; END IF;
 INSERT INTO public.feedback_attachments(id,owner_id,storage_path,original_name,media_type,byte_size)
 VALUES(aid,auth.uid(),auth.uid()::text||'/'||aid::text,p_name,p_type,p_size) RETURNING * INTO a;
 RETURN jsonb_build_object('id',a.id,'storagePath',a.storage_path,'originalName',a.original_name,'mediaType',a.media_type,'byteSize',a.byte_size);
END $$;
CREATE FUNCTION public.discard_feedback_attachment(p_id uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 UPDATE public.feedback_attachments SET cleanup_ready=true WHERE id=p_id AND owner_id=auth.uid() AND feedback_id IS NULL
$$;
CREATE FUNCTION public.feedback_storage_access(p_path text,p_upload boolean) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM public.feedback_attachments a WHERE a.storage_path=p_path AND NOT a.cleanup_ready AND
 CASE WHEN p_upload THEN a.owner_id=auth.uid() AND a.feedback_id IS NULL AND NOT a.verified
 ELSE (a.owner_id=auth.uid() OR (a.feedback_id IS NOT NULL AND public.is_feedback_admin())) END)
$$;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES('feedback-images','feedback-images',false,10485760,ARRAY['image/jpeg','image/png','image/webp']);
CREATE POLICY feedback_images_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='feedback-images' AND public.feedback_storage_access(name,true));
CREATE POLICY feedback_images_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='feedback-images' AND public.feedback_storage_access(name,false));
-- No authenticated UPDATE/DELETE policy: linked objects are immutable; server cleanup only.

CREATE FUNCTION public.claim_feedback_notifications() RETURNS SETOF public.feedback_notification_outbox LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 UPDATE public.feedback_notification_outbox SET status='sending',attempts=attempts+1,lease_until=now()+interval '5 minutes',lease_token=gen_random_uuid()
 WHERE id IN (SELECT id FROM public.feedback_notification_outbox WHERE attempts<3 AND
 ((status='pending' AND next_attempt_at<=now()) OR (status='sending' AND lease_until<now()))
 ORDER BY created_at LIMIT 50 FOR UPDATE SKIP LOCKED) RETURNING *
$$;
REVOKE ALL ON FUNCTION public.claim_feedback_notifications() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_feedback_notifications() TO service_role;
REVOKE ALL ON FUNCTION public.link_feedback_attachments(uuid,uuid[]) FROM PUBLIC,anon,authenticated;
-- Explicitly restrict callable SECURITY DEFINER entrypoints.
DO $$ DECLARE fn regprocedure; BEGIN
 FOR fn IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname IN ('is_feedback_admin','feedback_json','feedback_context','list_feedback','submit_feedback','update_feedback','delete_feedback','save_feedback_reply','mark_feedback_reply_read','feedback_preferences_get','feedback_preferences_set','prepare_feedback_attachment','discard_feedback_attachment','feedback_storage_access') LOOP
 EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon',fn);
 EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated,service_role',fn);
 END LOOP;
END $$;
ALTER PUBLICATION supabase_realtime ADD TABLE public.feedback;
COMMIT;
