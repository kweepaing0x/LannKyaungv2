-- ================================================================
-- LANN KYAING — Supabase SQL Setup
-- Paste this entire file into:
-- Supabase Console → SQL Editor → New query → Run
-- ================================================================


-- ── 1. USERS TABLE ──────────────────────────────────────────────
create table if not exists public.users (
  id            uuid primary key default gen_random_uuid(),
  uid           text unique not null,        -- matches Supabase Auth user id
  display_name  text not null,
  email         text unique not null,
  phone         text,
  role          text not null default 'user', -- 'user' | 'checker' | 'admin'
  balance_credits integer not null default 0,
  total_earned  integer not null default 0,
  total_spent   integer not null default 0,
  check_requests_made      integer not null default 0,
  check_requests_fulfilled integer not null default 0,
  reports_submitted        integer not null default 0,
  rating        numeric(3,1) default 0,
  rating_count  integer default 0,
  is_active     boolean default true,
  is_verified   boolean default false,
  preferred_language text default 'my',
  created_at    timestamptz default now()
);

-- ── 2. ADMIN CONFIG TABLE ────────────────────────────────────────
create table if not exists public.admin_config (
  id                    serial primary key,
  commission_rate       numeric(4,2) default 0.10,
  min_request_credits   integer default 50,
  pin_expiry_hours      integer default 24,
  pin_history_days      integer default 7,
  checker_radius_km     numeric(4,1) default 2.0,
  max_active_pins_per_user integer default 5,
  video_max_size_mb     integer default 50,
  video_max_duration_sec integer default 60,
  app_version           text default '1.0.0',
  maintenance_mode      boolean default false,
  contact_telegram      text default '@doublepz Yet',
  default_language      text default 'my',
  updated_at            timestamptz default now()
);

-- ── 3. SITUATION TYPES TABLE ─────────────────────────────────────
create table if not exists public.situation_types (
  id        text primary key,   -- 'police', 'traffic', etc.
  emoji     text not null,
  label_my  text not null,
  label_en  text not null,
  color     text not null,
  severity  integer default 1,  -- 1=low 2=medium 3=high
  is_active boolean default true
);

-- ── 4. CREDIT PACKAGES TABLE ─────────────────────────────────────
create table if not exists public.credit_packages (
  id          text primary key,
  credits     integer not null,
  price_mmk   integer not null,
  label       text not null,
  is_active   boolean default true
);

-- ── 5. TIME WINDOW OPTIONS ───────────────────────────────────────
create table if not exists public.time_window_options (
  id            serial primary key,
  minutes       integer not null,
  credits_cost  integer not null,
  label_my      text not null,
  label_en      text not null,
  is_active     boolean default true
);

-- ── 6. PINS TABLE (warning posts on map) ────────────────────────
create table if not exists public.pins (
  id          uuid primary key default gen_random_uuid(),
  type        text not null references situation_types(id),
  emoji       text not null,
  label_my    text,
  label_en    text,
  lat         numeric(10,7) not null,
  lng         numeric(10,7) not null,
  posted_by   text not null,         -- uid
  posted_at   timestamptz default now(),
  expires_at  timestamptz not null,  -- posted_at + 24hr
  is_history  boolean default false
);

-- ── 7. CHECK REQUESTS TABLE ──────────────────────────────────────
create table if not exists public.check_requests (
  id              uuid primary key default gen_random_uuid(),
  requester_uid   text not null,
  checker_uid     text,
  target_lat      numeric(10,7) not null,
  target_lng      numeric(10,7) not null,
  target_label    text,
  window_minutes  integer not null,
  credits_cost    integer not null,
  status          text default 'pending', -- pending|accepted|fulfilled|expired|cancelled
  video_url       text,
  location_tag    text,
  created_at      timestamptz default now(),
  expires_at      timestamptz not null
);

-- ── 8. TRANSACTIONS TABLE (credit ledger) ────────────────────────
create table if not exists public.transactions (
  id          uuid primary key default gen_random_uuid(),
  uid         text not null,
  type        text not null,   -- 'spend'|'earn'|'topup'|'commission'
  amount      integer not null,
  description text,
  ref_id      text,            -- related check_request id
  created_at  timestamptz default now()
);


-- ================================================================
-- SEED DATA
-- ================================================================

-- Admin config (one row)
insert into public.admin_config
  (commission_rate, pin_expiry_hours, pin_history_days,
   checker_radius_km, contact_telegram, default_language)
values (0.10, 24, 7, 2.0, '@doublepz Yet', 'my')
on conflict do nothing;

-- Situation types
insert into public.situation_types (id, emoji, label_my, label_en, color, severity) values
  ('police',  '🚔', 'ရဲ ရှိသည်',      'Police',        '#E24B4A', 3),
  ('blocked', '🚧', 'လမ်းပိတ်',       'Road blocked',  '#EF9F27', 3),
  ('traffic', '🚗', 'လမ်းကြပ်',       'Heavy traffic', '#EF9F27', 2),
  ('danger',  '⚠️', 'အန္တရာယ်',      'Danger',        '#E24B4A', 3),
  ('flood',   '🌊', 'ရေကြီး',         'Flood',         '#378ADD', 3),
  ('repair',  '🔧', 'လမ်းပြုပြင်',   'Road repair',   '#888780', 1),
  ('event',   '🎉', 'အခမ်းအနား',      'Event',         '#534AB7', 1),
  ('other',   '❓', 'အခြား',          'Other',         '#888780', 1)
on conflict (id) do nothing;

-- Credit packages
insert into public.credit_packages (id, credits, price_mmk, label) values
  ('pack_100',  100,  1500,  'Starter'),
  ('pack_300',  300,  4000,  'Standard'),
  ('pack_700',  700,  8500,  'Pro'),
  ('pack_1500', 1500, 16000, 'Premium')
on conflict (id) do nothing;

-- Time window options
insert into public.time_window_options (minutes, credits_cost, label_my, label_en) values
  (30,  50,  '၃၀ မိနစ်', '30 min'),
  (60,  80,  '၁ နာရီ',   '1 hour'),
  (120, 120, '၂ နာရီ',   '2 hours')
on conflict do nothing;

-- Dummy users (passwords set in Supabase Auth separately)
insert into public.users (uid, display_name, email, role, balance_credits, total_earned, total_spent, reports_submitted, is_active, is_verified, preferred_language) values
  ('user-001', 'Aung Ko Ko',   'aungkoko@lannkyaing.app',   'user',    240,  0,    60,  5,  true, false, 'my'),
  ('user-002', 'Thida Win',    'thidawin@lannkyaing.app',   'checker', 890,  990,  100, 18, true, true,  'my'),
  ('user-003', 'Kyaw Zin',     'kyawzin@lannkyaing.app',    'user',    50,   0,    200, 2,  true, false, 'en'),
  ('user-004', 'Su Myat Noe',  'sumyatnoe@lannkyaing.app',  'checker', 1200, 1350, 150, 30, true, true,  'my'),
  ('admin-001','Admin',        'admin@lannkyaing.app',      'admin',   0,    0,    0,   0,  true, true,  'my')
on conflict (uid) do nothing;


-- ================================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================================

alter table public.users           enable row level security;
alter table public.pins            enable row level security;
alter table public.check_requests  enable row level security;
alter table public.transactions    enable row level security;
alter table public.admin_config    enable row level security;
alter table public.situation_types enable row level security;
alter table public.credit_packages enable row level security;
alter table public.time_window_options enable row level security;

-- Users: read own row; admin reads all
create policy "users_select_own" on public.users
  for select using (auth.uid()::text = uid);

create policy "users_update_own" on public.users
  for update using (auth.uid()::text = uid);

-- Pins: everyone can read; authenticated can insert
create policy "pins_select_all" on public.pins
  for select using (true);

create policy "pins_insert_auth" on public.pins
  for insert with check (auth.role() = 'authenticated');

-- Check requests: everyone authenticated can read
create policy "checkreqs_select" on public.check_requests
  for select using (auth.role() = 'authenticated');

create policy "checkreqs_insert" on public.check_requests
  for insert with check (auth.role() = 'authenticated');

create policy "checkreqs_update" on public.check_requests
  for update using (
    auth.uid()::text = requester_uid or
    auth.uid()::text = checker_uid
  );

-- Transactions: own only
create policy "tx_select_own" on public.transactions
  for select using (auth.uid()::text = uid);

create policy "tx_insert_auth" on public.transactions
  for insert with check (auth.role() = 'authenticated');

-- Config + lookup tables: read only for all authenticated
create policy "admin_config_read" on public.admin_config
  for select using (auth.role() = 'authenticated');

create policy "situation_types_read" on public.situation_types
  for select using (true);

create policy "credit_packages_read" on public.credit_packages
  for select using (true);

create policy "time_windows_read" on public.time_window_options
  for select using (true);


-- ================================================================
-- REALTIME — enable for live map pins
-- ================================================================
alter publication supabase_realtime add table public.pins;
alter publication supabase_realtime add table public.check_requests;


-- ================================================================
-- DONE! You should see all tables in Table Editor now.
-- ================================================================
