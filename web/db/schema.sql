-- BizzAssist schema. Applied at every boot (instrumentation.ts); every statement must stay idempotent.
-- Tenant rule: every table with business data carries business_id, and every query filters on it.

create table if not exists businesses (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  category      text,
  website       text,
  default_lang  text not null default 'en',
  support_hours text,
  logo_url      text,
  plan          text not null default 'free' check (plan in ('free', 'pro', 'business')),
  onboarded_at  timestamptz,
  created_at    timestamptz not null default now()
);

create table if not exists users (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  email       text not null unique,
  pass_hash   text not null,
  name        text not null,
  role        text not null default 'agent' check (role in ('owner', 'agent')),
  lang        text not null default 'en',
  nx_user_id  text not null unique,
  created_at  timestamptz not null default now()
);
create index if not exists users_business_idx on users(business_id);

create table if not exists sessions (
  token_hash text primary key,
  user_id    uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists sessions_user_idx on sessions(user_id);

create table if not exists widgets (
  id                  uuid primary key default gen_random_uuid(),
  business_id         uuid not null references businesses(id) on delete cascade,
  name                text not null,
  type                text not null default 'widget' check (type in ('widget', 'link')),
  color               text not null default '#0066cc',
  title               text not null default 'Support',
  greeting            text not null default 'Hi! How can we help you today?',
  avatar              text,
  languages           text[] not null default '{}',
  persona             text not null default '',
  allowed_domains     text[] not null default '{}',
  enabled_action_ids  uuid[] not null default '{}',
  escalation_keywords text[] not null default '{human,agent,person}',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists widgets_business_idx on widgets(business_id);

create table if not exists knowledge_items (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  source      text not null check (source in ('web', 'doc', 'qa', 'learned')),
  title       text not null default '',
  url         text,
  content     text not null default '',
  status      text not null default 'ready' check (status in ('pending', 'syncing', 'ready', 'error')),
  error       text,
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);
create index if not exists knowledge_business_idx on knowledge_items(business_id, source);

create table if not exists api_actions (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,
  name         text not null,
  description  text not null default '',
  kind         text not null check (kind in ('rest', 'sheet')),
  method       text not null default 'GET',
  url_template text not null,
  params       jsonb not null default '[]',
  headers_enc  text,
  sheet_match  jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists api_actions_business_idx on api_actions(business_id);

create table if not exists conversations (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references businesses(id) on delete cascade,
  widget_id        uuid not null references widgets(id) on delete cascade,
  nx_group_id      text not null unique,
  guest_nx_id      text not null,
  buyer_lang       text not null default 'en',
  status           text not null default 'bot' check (status in ('bot', 'waiting', 'agent', 'closed')),
  assigned_user_id uuid references users(id) on delete set null,
  summary          jsonb,
  rating           smallint check (rating between 1 and 5),
  resolved_by      text check (resolved_by in ('ai', 'agent')),
  created_at       timestamptz not null default now(),
  waiting_since    timestamptz,
  closed_at        timestamptz
);
create index if not exists conversations_business_idx on conversations(business_id, status);
create index if not exists conversations_guest_idx on conversations(widget_id, guest_nx_id, status);

create table if not exists messages (
  id              uuid primary key default gen_random_uuid(),
  nx_message_id   text not null unique,
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_role     text not null check (sender_role in ('buyer', 'bot', 'agent')),
  sender_nx_id    text,
  text            text not null,
  sources         jsonb,
  created_at      timestamptz not null default now()
);
create index if not exists messages_conversation_idx on messages(conversation_id, created_at);

create table if not exists learned_suggestions (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references businesses(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete set null,
  question        text not null,
  answer          text not null,
  status          text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  duplicate_of    uuid references knowledge_items(id) on delete set null,
  created_at      timestamptz not null default now()
);
create index if not exists learned_business_idx on learned_suggestions(business_id, status);

create table if not exists ai_events (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references businesses(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete cascade,
  kind            text not null check (kind in ('answered', 'escalated', 'action_call', 'error')),
  detail          jsonb not null default '{}',
  latency_ms      integer,
  created_at      timestamptz not null default now()
);
create index if not exists ai_events_business_idx on ai_events(business_id, kind, created_at);

-- ---- Phase 2 additions (idempotent) ----
-- alternative phrasings of a Q&A question, shown to the model with the entry
alter table knowledge_items add column if not exists alternatives text[] not null default '{}';
-- source conversation of a learned answer (for the "from conversation" link)
alter table knowledge_items add column if not exists conversation_id uuid references conversations(id) on delete set null;
-- one row per URL per business, so re-adding a page re-syncs it instead of duplicating
create unique index if not exists knowledge_web_url_uidx on knowledge_items(business_id, url) where source = 'web';

-- ---- Phase 3 additions (idempotent) ----
-- when an agent took the chat; claimed_at - waiting_since = buyer wait time (analytics)
alter table conversations add column if not exists claimed_at timestamptz;
-- translation of the message for the other side (agent views show it under the original)
alter table messages add column if not exists translation text;
