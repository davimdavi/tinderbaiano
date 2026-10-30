import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { DbUser, OwnedGameWithMeta } from "@/lib/types";
import GameLibrary from "./GameLibrary";

type OwnedGameRow = {
  appid: number;
  playtime_forever: number;
  playtime_2weeks: number;
  games: { name: string; icon_url: string | null } | null;
};

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const admin = getSupabaseAdmin();

  const { data: user } = await admin
    .from("users")
    .select("*")
    .eq("id", session.userId)
    .single<DbUser>();

  const { data: ownedRows } = await admin
    .from("user_owned_games")
    .select("appid, playtime_forever, playtime_2weeks, games(name, icon_url)")
    .eq("user_id", session.userId)
    .returns<OwnedGameRow[]>();

  const games: OwnedGameWithMeta[] = (ownedRows ?? []).map((row) => ({
    appid: row.appid,
    name: row.games?.name ?? `App ${row.appid}`,
    iconUrl: row.games?.icon_url ?? null,
    playtimeForever: row.playtime_forever,
    playtime2Weeks: row.playtime_2weeks,
  }));

  return (
    <main className="min-h-screen bg-gradient-to-br from-fuchsia-700 via-purple-800 to-indigo-900 px-6 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex items-center gap-4">
          {user?.avatar_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatar_url}
              alt=""
              className="h-16 w-16 rounded-full border-2 border-white/50"
            />
          )}
          <div>
            <h1 className="text-3xl font-extrabold">
              {user?.persona_name ?? "Jogador"}
            </h1>
            <p className="text-sm text-white/70">{games.length} jogos na biblioteca</p>
          </div>
          <form action="/api/auth/logout" method="POST" className="ml-auto">
            <button className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/20">
              Sair
            </button>
          </form>
        </header>

        <GameLibrary games={games} />
      </div>
    </main>
  );
}
