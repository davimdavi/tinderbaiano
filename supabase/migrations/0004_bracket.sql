-- Fase 4: mata-mata (bracket) e votos.
-- Cole isto no SQL Editor do Supabase, depois da 0003_swipes.sql.

alter table rooms add column if not exists winner_appid bigint references games(appid);

create table if not exists bracket_matches (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  round_number int not null,
  slot_index int not null,
  game_a_appid bigint references games(appid),
  game_b_appid bigint references games(appid), -- null = bye (game_a passa direto)
  winner_appid bigint references games(appid),
  status text not null default 'voting' check (status in ('voting', 'decided')),
  voting_ends_at timestamptz,
  created_at timestamptz not null default now(),
  unique (room_id, round_number, slot_index)
);

create table if not exists bracket_votes (
  bracket_match_id uuid not null references bracket_matches(id) on delete cascade,
  -- Redundante de propósito (dá pra achar via bracket_matches) — só pra poder
  -- filtrar o Realtime por sala direto, já que bracket_votes não tem room_id.
  room_id uuid not null references rooms(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  voted_appid bigint not null references games(appid),
  voted_at timestamptz not null default now(),
  primary key (bracket_match_id, user_id)
);

create index if not exists idx_bracket_matches_room on bracket_matches (room_id, round_number);
create index if not exists idx_bracket_votes_match on bracket_votes (bracket_match_id);

alter table bracket_matches enable row level security;
alter table bracket_votes enable row level security;

drop policy if exists "bracket_matches_select_all" on bracket_matches;
create policy "bracket_matches_select_all" on bracket_matches for select using (true);

drop policy if exists "bracket_votes_select_all" on bracket_votes;
create policy "bracket_votes_select_all" on bracket_votes for select using (true);

alter publication supabase_realtime add table bracket_matches, bracket_votes;
