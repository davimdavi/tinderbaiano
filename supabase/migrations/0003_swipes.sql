-- Fase 3: swipes e os matches derivados deles.
-- Cole isto no SQL Editor do Supabase, depois da 0002_rooms.sql.

create table if not exists swipes (
  room_id   uuid not null references rooms(id) on delete cascade,
  user_id   uuid not null references users(id) on delete cascade,
  appid     bigint not null references games(appid) on delete cascade,
  liked     boolean not null,
  swiped_at timestamptz not null default now(),
  primary key (room_id, user_id, appid)
);

-- Jogos que todo mundo da sala curtiu (calculado no servidor a cada swipe).
create table if not exists room_matches (
  room_id    uuid not null references rooms(id) on delete cascade,
  appid      bigint not null references games(appid) on delete cascade,
  matched_at timestamptz not null default now(),
  primary key (room_id, appid)
);

create index if not exists idx_swipes_room_user on swipes (room_id, user_id);
create index if not exists idx_swipes_room_appid on swipes (room_id, appid);

alter table swipes enable row level security;
alter table room_matches enable row level security;

drop policy if exists "swipes_select_all" on swipes;
create policy "swipes_select_all" on swipes for select using (true);

drop policy if exists "room_matches_select_all" on room_matches;
create policy "room_matches_select_all" on room_matches for select using (true);

alter publication supabase_realtime add table swipes, room_matches;
