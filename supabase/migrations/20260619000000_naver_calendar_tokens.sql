-- 네이버 캘린더 OAuth 토큰 저장 테이블
create table if not exists public.naver_calendar_tokens (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  access_token   text not null,
  refresh_token  text not null,
  expires_at     timestamptz not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.naver_calendar_tokens enable row level security;

-- 본인 토큰만 읽기/쓰기 가능
create policy "naver_tokens_select_own"
  on public.naver_calendar_tokens for select
  using (auth.uid() = user_id);

create policy "naver_tokens_insert_own"
  on public.naver_calendar_tokens for insert
  with check (auth.uid() = user_id);

create policy "naver_tokens_update_own"
  on public.naver_calendar_tokens for update
  using (auth.uid() = user_id);

create policy "naver_tokens_delete_own"
  on public.naver_calendar_tokens for delete
  using (auth.uid() = user_id);
