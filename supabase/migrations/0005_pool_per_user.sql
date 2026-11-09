-- Cada jogador pode adicionar o mesmo jogo ao PRÓPRIO pool, mesmo que outro já
-- tenha adicionado (ex: dois amigos com Sea of Thieves, cada um quer poder marcar
-- o seu). Antes a chave primária era (room_id, appid), então o segundo "adicionar"
-- não fazia nada (upsert com ignoreDuplicates silenciosamente ignorava).
-- added_by_user nunca é nulo na prática (sempre vem do usuário logado que clicou
-- "adicionar"), então dá pra torná-lo NOT NULL e fazer parte da chave.
alter table room_pool_games alter column added_by_user set not null;
alter table room_pool_games drop constraint room_pool_games_pkey;
alter table room_pool_games add constraint room_pool_games_pkey primary key (room_id, appid, added_by_user);
