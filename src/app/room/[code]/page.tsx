import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import {
  getRoomSnapshot,
  getUserSwipedAppids,
  isRoomMember,
} from "@/lib/rooms/service";
import { getOwnedGamesForUser } from "@/lib/steam/library";
import { Panel } from "@/components/ui/Panel";
import { Reveal, RevealItem } from "@/components/ui/Reveal";
import RoomView from "./RoomView";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const { code } = await params;
  const snapshot = await getRoomSnapshot(code);

  if (!snapshot) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center text-white">
        <Reveal>
          <RevealItem>
            <Panel className="p-8">
              <h1 className="font-display text-3xl font-extrabold">Sala não encontrada</h1>
              <p className="mt-2 text-white/70">Confere se o código está certo.</p>
            </Panel>
          </RevealItem>
        </Reveal>
      </main>
    );
  }

  const isMember = await isRoomMember(snapshot.room.id, session.userId);
  const myLibrary = isMember ? await getOwnedGamesForUser(session.userId) : [];
  const mySwipedAppids = isMember
    ? await getUserSwipedAppids(snapshot.room.id, session.userId)
    : [];

  return (
    <RoomView
      code={code.toUpperCase()}
      currentUserId={session.userId}
      initialSnapshot={snapshot}
      initialIsMember={isMember}
      myLibrary={myLibrary}
      initialMySwipedAppids={mySwipedAppids}
    />
  );
}
