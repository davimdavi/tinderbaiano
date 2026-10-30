import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getOwnedGamesForUser } from "@/lib/steam/library";
import type { DbUser } from "@/lib/types";
import GameLibrary from "./GameLibrary";
import RoomActions from "./RoomActions";

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

  const games = await getOwnedGamesForUser(session.userId);

  return (
    <main className="min-h-screen bg-gradient-to-br from-fuchsia-700 via-purple-800 to-indigo-900 px-6 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <header className="animate-rise mb-8 flex items-center gap-4">
          {user?.avatar_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatar_url}
              alt=""
              className="h-16 w-16 rounded-full border-2 border-white/50"
            />
          )}
          <div>
            <h1 className="font-display text-3xl font-extrabold">
              {user?.persona_name ?? "Jogador"}
            </h1>
            <p className="text-sm text-white/70">{games.length} jogos na biblioteca</p>
          </div>
          <form action="/api/auth/logout" method="POST" className="ml-auto">
            <button className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold transition-colors hover:bg-white/20">
              Sair
            </button>
          </form>
        </header>

        <RoomActions />

        <GameLibrary games={games} />
      </div>
    </main>
  );
}
