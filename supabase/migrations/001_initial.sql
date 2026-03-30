-- Journal App Schema

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Issue threads (must come before entries for FK)
create table issue_threads (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references auth.users not null,
  title      text not null,
  started_at timestamptz default now(),
  status     text check (status in ('active', 'resolved')) default 'active'
);

alter table issue_threads enable row level security;
create policy "Users manage own threads" on issue_threads
  for all using (auth.uid() = user_id);

-- Entries
create table entries (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references auth.users not null,
  entry_type      text check (entry_type in ('quick', 'reflection', 'comprehensive', 'cbt')) not null,
  issue_thread_id uuid references issue_threads(id),
  title           text,
  content         jsonb,
  prompts         jsonb,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  imported        boolean default false
);

alter table entries enable row level security;
create policy "Users manage own entries" on entries
  for all using (auth.uid() = user_id);

-- Full-text search index
alter table entries add column fts tsvector
  generated always as (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content::text, ''))
  ) stored;
create index entries_fts_idx on entries using gin(fts);

-- Tags
create table tags (
  id      uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  name    text not null,
  color   text not null default '#6366f1'
);

alter table tags enable row level security;
create policy "Users manage own tags" on tags
  for all using (auth.uid() = user_id);

-- Entry-Tag junction
create table entry_tags (
  entry_id uuid references entries(id) on delete cascade,
  tag_id   uuid references tags(id) on delete cascade,
  primary key (entry_id, tag_id)
);

alter table entry_tags enable row level security;
create policy "Users manage own entry_tags" on entry_tags
  for all using (
    exists (select 1 from entries where entries.id = entry_id and entries.user_id = auth.uid())
  );

-- Mood logs
create table mood_logs (
  id             uuid primary key default uuid_generate_v4(),
  entry_id       uuid references entries(id) on delete cascade not null,
  user_id        uuid references auth.users not null,
  mood_score     int check (mood_score between 1 and 5) not null,
  custom_metrics jsonb
);

alter table mood_logs enable row level security;
create policy "Users manage own mood_logs" on mood_logs
  for all using (auth.uid() = user_id);

-- Metric definitions
create table metric_definitions (
  id      uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  name    text not null,
  type    text check (type in ('number', 'text', 'boolean')) not null,
  unit    text
);

alter table metric_definitions enable row level security;
create policy "Users manage own metric_definitions" on metric_definitions
  for all using (auth.uid() = user_id);

-- AI conversations
create table ai_conversations (
  id         uuid primary key default uuid_generate_v4(),
  entry_id   uuid references entries(id) on delete cascade not null,
  user_id    uuid references auth.users not null,
  messages   jsonb not null default '[]'::jsonb,
  created_at timestamptz default now()
);

alter table ai_conversations enable row level security;
create policy "Users manage own ai_conversations" on ai_conversations
  for all using (auth.uid() = user_id);

-- AI insights
create table ai_insights (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid references auth.users not null,
  period_start date,
  period_end   date,
  insight_type text not null,
  content      jsonb not null,
  created_at   timestamptz default now()
);

alter table ai_insights enable row level security;
create policy "Users manage own ai_insights" on ai_insights
  for all using (auth.uid() = user_id);

-- Full-text search function
create or replace function search_entries(search_query text, p_user_id uuid)
returns setof entries
language sql
as $$
  select * from entries
  where user_id = p_user_id
    and fts @@ plainto_tsquery('english', search_query)
  order by ts_rank(fts, plainto_tsquery('english', search_query)) desc;
$$;
