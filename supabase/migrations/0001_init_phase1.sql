-- Fase 1: usuários (login Steam) + cache de jogos + biblioteca por usuário.
-- Cole isto no SQL Editor do seu projeto Supabase (Project > SQL Editor > New query).

create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  steamid64 text unique not null,
  persona_name text,
  avatar_url text,
  profile_url text,
  profile_public boolean not null default true,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

-- Cache global de metadados de jogos (compartilhado entre todos os usuários/salas).
-- header_image/genres/tags/release_date/is_free começam nulos e são preenchidos
-- sob demanda nas próximas fases (busca/recomendação), não no login.
create table if not exists games (
  appid bigint primary key,
  name text not null,
  icon_url text,
  header_image text,
  genres text[],
  tags text[],
  release_date date,
  is_free boolean,
  last_fetched_at timestamptz not null default now()
);

create table if not exists user_owned_games (
  user_id uuid not null references users(id) on delete cascade,
  appid bigint not null references games(appid) on delete cascade,
  playtime_forever integer not null default 0,
  playtime_2weeks integer not null default 0,
  last_synced_at timestamptz not null default now(),
  primary key (user_id, appid)
);

create index if not exists idx_user_owned_games_user on user_owned_games (user_id);
create index if not exists idx_user_owned_games_playtime
  on user_owned_games (user_id, playtime_forever desc);
