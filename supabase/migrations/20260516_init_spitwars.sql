-- Spit Wars — initial schema
-- Runs against: nveucilrazggxybqipnz (prod Supabase project)
-- Apply via: Management API (see knowledge/migrations.md)

-- Players
create table if not exists spitwars_players (
  id            uuid primary key default gen_random_uuid(),
  username      text unique not null,
  email         text unique not null,
  password_hash text not null,
  wins          integer not null default 0,
  losses        integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists spitwars_players_username_idx on spitwars_players (username);
create index if not exists spitwars_players_email_idx on spitwars_players (email);
create index if not exists spitwars_players_wins_idx on spitwars_players (wins desc);

-- Sessions
create table if not exists spitwars_sessions (
  id          uuid primary key default gen_random_uuid(),
  player_id   uuid not null references spitwars_players(id) on delete cascade,
  token_hash  text unique not null,
  expires_at  timestamptz not null,
  user_agent  text,
  ip_address  text,
  created_at  timestamptz not null default now()
);

create index if not exists spitwars_sessions_token_hash_idx on spitwars_sessions (token_hash);
create index if not exists spitwars_sessions_player_id_idx on spitwars_sessions (player_id);
create index if not exists spitwars_sessions_expires_at_idx on spitwars_sessions (expires_at);

-- Rooms
create table if not exists spitwars_rooms (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,              -- 6-char code
  host_id     uuid not null references spitwars_players(id) on delete cascade,
  host_name   text not null,
  guest_id    uuid references spitwars_players(id) on delete set null,
  guest_name  text,
  status      text not null default 'waiting',  -- waiting|playing|finished
  game_state  jsonb,                             -- full game state snapshot
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists spitwars_rooms_code_idx on spitwars_rooms (code);
create index if not exists spitwars_rooms_status_idx on spitwars_rooms (status);
create index if not exists spitwars_rooms_host_id_idx on spitwars_rooms (host_id);

-- Games log
create table if not exists spitwars_games (
  id          uuid primary key default gen_random_uuid(),
  player_id   uuid not null references spitwars_players(id) on delete cascade,
  mode        text not null default 'local',     -- local|online
  room_code   text,
  winner_team integer,                           -- 0=LLAMAS, 1=ALPACAS
  played_at   timestamptz not null default now()
);

create index if not exists spitwars_games_player_id_idx on spitwars_games (player_id);

-- RLS: service role bypasses, no row-level restrictions needed
-- (we use service role key for all API routes — no Supabase Auth)
alter table spitwars_players enable row level security;
alter table spitwars_sessions enable row level security;
alter table spitwars_rooms enable row level security;
alter table spitwars_games enable row level security;

-- Allow service role full access (default behaviour — listed for clarity)
create policy "Service role full access on spitwars_players"
  on spitwars_players for all
  using (true)
  with check (true);

create policy "Service role full access on spitwars_sessions"
  on spitwars_sessions for all
  using (true)
  with check (true);

create policy "Service role full access on spitwars_rooms"
  on spitwars_rooms for all
  using (true)
  with check (true);

create policy "Service role full access on spitwars_games"
  on spitwars_games for all
  using (true)
  with check (true);

-- Enable Realtime for rooms
alter publication supabase_realtime add table spitwars_rooms;
