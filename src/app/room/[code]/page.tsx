import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getRoomSnapshot, isRoomMember } from "@/lib/rooms/service";
import { getOwnedGamesForUser } from "@/lib/steam/library";
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
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-br from-fuchsia-700 via-purple-800 to-indigo-900 px-6 text-center text-white">
        <h1 className="text-3xl font-extrabold">Sala não encontrada</h1>
        <p className="text-white/70">Confere se o código está certo.</p>
      </main>
    );
  }

  const isMember = await isRoomMember(snapshot.room.id, session.userId);
  const myLibrary = isMember ? await getOwnedGamesForUser(session.userId) : [];

  return (
    <RoomView
      code={code.toUpperCase()}
      currentUserId={session.userId}
      initialSnapshot={snapshot}
      initialIsMember={isMember}
      myLibrary={myLibrary}
    />
  );
}
