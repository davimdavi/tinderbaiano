export type DbUser = {
  id: string;
  steamid64: string;
  persona_name: string | null;
  avatar_url: string | null;
  profile_url: string | null;
  profile_public: boolean;
  created_at: string;
  last_login_at: string | null;
};

export type DbGame = {
  appid: number;
  name: string;
  icon_url: string | null;
  header_image: string | null;
  genres: string[] | null;
  tags: string[] | null;
  release_date: string | null;
  is_free: boolean | null;
  last_fetched_at: string;
};

export type DbUserOwnedGame = {
  user_id: string;
  appid: number;
  playtime_forever: number;
  playtime_2weeks: number;
  last_synced_at: string;
};

export type OwnedGameWithMeta = {
  appid: number;
  name: string;
  iconUrl: string | null;
  playtimeForever: number;
  playtime2Weeks: number;
};
