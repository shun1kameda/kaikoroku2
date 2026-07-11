-- 回顧録 Phase 1.5 — predictions テーブル
-- src/types.ts の Prediction スキーマに準拠。
-- Supabase の SQL Editor に貼り付けて実行する(1回のみ)。
-- user_id + RLS は Supabase Auth(メールマジックリンク)と対で必須:
-- anon(公開)キーで接続するため、これが無いと全ユーザーのデータが読めてしまう。

create table if not exists public.predictions (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null default auth.uid() references auth.users(id) on delete cascade,
  race_name              text not null default '',
  race_date              date not null,
  venue                  text not null default '',
  pace_hypothesis        text not null default '',
  track_bias_hypothesis  text not null default '',
  pick_rationale         text not null default '',
  concerns               text not null default '',
  bet_type               text not null default 'bet'   check (bet_type in ('bet','pass')),
  bet_detail             text not null default '',
  confidence             int                            check (confidence between 1 and 5),
  status                 text not null default 'awaiting_result'
                         check (status in ('predicted','awaiting_result','verified')),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- 一覧を「新しい順」で速く出すためのインデックス
create index if not exists predictions_user_created_idx
  on public.predictions (user_id, created_at desc);

-- updated_at を保存時に自動更新するトリガー
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists predictions_set_updated_at on public.predictions;
create trigger predictions_set_updated_at
  before update on public.predictions
  for each row execute function public.set_updated_at();

-- 行レベルセキュリティ:自分の予想だけ見える・触れる
alter table public.predictions enable row level security;

drop policy if exists "own rows - select" on public.predictions;
drop policy if exists "own rows - insert" on public.predictions;
drop policy if exists "own rows - update" on public.predictions;
drop policy if exists "own rows - delete" on public.predictions;

create policy "own rows - select" on public.predictions
  for select using (auth.uid() = user_id);
create policy "own rows - insert" on public.predictions
  for insert with check (auth.uid() = user_id);
create policy "own rows - update" on public.predictions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows - delete" on public.predictions
  for delete using (auth.uid() = user_id);
