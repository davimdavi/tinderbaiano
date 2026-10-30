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

export type RoomStatus = "curating_pool" | "swiping" | "bracket" | "finished";

export type DbRoom = {
  id: string;
  code: string;
  host_user_id: string;
  status: RoomStatus;
  created_at: string;
  winner_appid: number | null;
};

export type DbRoomMember = {
  room_id: string;
  user_id: string;
  joined_at: string;
  is_ready: boolean;
};

export type DbRoomPoolGame = {
  room_id: string;
  appid: number;
  added_by_user: string | null;
  added_at: string;
};

export type RoomMemberView = {
  userId: string;
  personaName: string | null;
  avatarUrl: string | null;
  isReady: boolean;
  isHost: boolean;
  swipedCount: number;
};

export type PoolGameView = {
  appid: number;
  name: string;
  iconUrl: string | null;
  headerImage: string | null;
  genres: string[] | null;
  releaseDate: string | null;
  isFree: boolean | null;
  addedByUserId: string | null;
  addedByName: string | null;
};

export type DbSwipe = {
  room_id: string;
  user_id: string;
  appid: number;
  liked: boolean;
  swiped_at: string;
};

export type DbRoomMatch = {
  room_id: string;
  appid: number;
  matched_at: string;
};

export type MatchedGameView = {
  appid: number;
  name: string;
  iconUrl: string | null;
  headerImage: string | null;
};

export type BracketMatchStatus = "voting" | "decided";

export type DbBracketMatch = {
  id: string;
  room_id: string;
  round_number: number;
  slot_index: number;
  game_a_appid: number | null;
  game_b_appid: number | null;
  winner_appid: number | null;
  status: BracketMatchStatus;
  voting_ends_at: string | null;
  created_at: string;
};

export type DbBracketVote = {
  bracket_match_id: string;
  user_id: string;
  voted_appid: number;
  voted_at: string;
};

export type BracketMatchView = {
  id: string;
  roundNumber: number;
  slotIndex: number;
  gameA: MatchedGameView | null;
  gameB: MatchedGameView | null;
  winnerAppid: number | null;
  status: BracketMatchStatus;
  votingEndsAt: string | null;
  votesA: number;
  votesB: number;
  myVote: number | null;
};

export type BracketRound = {
  roundNumber: number;
  matches: BracketMatchView[];
};
