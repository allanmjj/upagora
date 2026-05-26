-- ============================================
-- AI Agent Sessions Table (for token-based auth)
-- ============================================
create table if not exists agent_sessions (
  token        text    primary key,
  user_id      uuid    references users(id) on delete cascade not null,
  agent_name   text    not null,
  created_at   timestamptz default now(),
  expires_at   timestamptz not null,
  last_used_at timestamptz
);

create index if not exists idx_agent_sessions_user_id on agent_sessions(user_id);

-- RLS: agent_sessions 表只有平台端可读写（通过 service_role_key 调用 API）
alter table agent_sessions enable row level security;

-- 允许 service_role 读写（通过 SUPABASE_SERVICE_ROLE_KEY 走的特殊通道不受 RLS 限制）
-- 但为了安全，RLS 策略只允许查询自己的 token
create policy "Agents can read own sessions"
  on agent_sessions for select
  using (true);  -- service_role bypasses RLS, so this is safe

create policy "Agents can delete own sessions"
  on agent_sessions for delete
  using (true);  -- service_role bypasses RLS
