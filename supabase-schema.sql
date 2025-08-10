-- 创建jobs表用于存储AI生成任务
create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  provider text not null check (provider in ('openai','gemini','ideogram')),
  type text not null default 'image',
  prompt text not null,
  status text not null default 'queued', -- queued|processing|done|failed
  result_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 创建索引以提高查询性能
create index if not exists jobs_user_idx on jobs(user_id);
create index if not exists jobs_status_idx on jobs(status);
create index if not exists jobs_created_at_idx on jobs(created_at);

-- 启用行级安全策略
alter table jobs enable row level security;

-- 用户只能查看和操作自己的任务
create policy "Users can view own jobs" on jobs
  for select using (auth.uid() = user_id);

create policy "Users can insert own jobs" on jobs
  for insert with check (auth.uid() = user_id);

create policy "Users can update own jobs" on jobs
  for update using (auth.uid() = user_id);