import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getOwnedGamesForUser } from "@/lib/steam/library";
import type { DbUser } from "@/lib/types";
import { Reveal, RevealItem } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
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
    <main className="min-h-screen px-4 py-10 text-white sm:px-6">
      <Reveal className="mx-auto max-w-3xl">
        <RevealItem>
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
              <h1 className="font-display text-3xl font-extrabold">
                {user?.persona_name ?? "Jogador"}
              </h1>
              <p className="text-sm text-white/70">{games.length} jogos na biblioteca</p>
            </div>
            <form action="/api/auth/logout" method="POST" className="ml-auto">
              <Button type="submit" variant="secondary" className="px-4 py-2">
                Sair
              </Button>
            </form>
          </header>
        </RevealItem>

        <RevealItem>
          <RoomActions />
        </RevealItem>

        <RevealItem>
          <GameLibrary games={games} />
        </RevealItem>
      </Reveal>
    </main>
  );
}
