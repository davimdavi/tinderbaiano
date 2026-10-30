-- Fase 2: salas (lobby), membros e o pool de jogos de cada sala.
-- Cole isto no SQL Editor do Supabase, depois da 0001_init_phase1.sql.

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  host_user_id uuid not null references users(id),
  status text not null default 'curating_pool'
    check (status in ('curating_pool', 'swiping', 'bracket', 'finished')),
  created_at timestamptz not null default now()
);

create table if not exists room_members (
  room_id uuid not null references rooms(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  is_ready boolean not null default false,
  primary key (room_id, user_id)
);

create table if not exists room_pool_games (
  room_id uuid not null references rooms(id) on delete cascade,
  appid bigint not null references games(appid) on delete cascade,
  added_by_user uuid references users(id),
  added_at timestamptz not null default now(),
  primary key (room_id, appid)
);

create index if not exists idx_room_members_room on room_members (room_id);
create index if not exists idx_room_pool_games_room on room_pool_games (room_id);

alter table rooms enable row level security;
alter table room_members enable row level security;
alter table room_pool_games enable row level security;

-- Leitura liberada pra chave anônima (necessário pro Supabase Realtime no navegador).
-- Toda escrita passa pelas rotas do servidor com a service_role key, que ignora RLS.
-- Trade-off aceito pra v1 (grupo fechado de amigos, nada sensível nessas tabelas).
drop policy if exists "rooms_select_all" on rooms;
create policy "rooms_select_all" on rooms for select using (true);

drop policy if exists "room_members_select_all" on room_members;
create policy "room_members_select_all" on room_members for select using (true);

drop policy if exists "room_pool_games_select_all" on room_pool_games;
create policy "room_pool_games_select_all" on room_pool_games for select using (true);

-- Necessário pro Supabase Realtime (postgres_changes) entregar updates dessas
-- tabelas pros clientes no navegador.
alter publication supabase_realtime add table rooms, room_members, room_pool_games;
