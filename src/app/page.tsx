import Link from "next/link";
import { getSession } from "@/lib/auth/session";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ login?: string }>;
}) {
  const session = await getSession();
  const { login } = await searchParams;

  return (
    <main className="flex min-h-screen flex-1 flex-col items-center justify-center gap-8 bg-gradient-to-br from-fuchsia-700 via-purple-800 to-indigo-900 px-6 text-center text-white">
      <div>
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl">
          TinderBaiano
        </h1>
        <p className="mt-4 max-w-md text-lg text-white/80">
          Dá match no jogo certo com a galera. Swipe nos jogos, veja no que todo mundo
          bateu o olho e decida no mata-mata.
        </p>
      </div>

      {login === "erro" && (
        <p className="rounded-full bg-red-500/20 px-4 py-2 text-sm text-red-200">
          Não deu pra confirmar o login com a Steam. Tenta de novo.
        </p>
      )}

      {session ? (
        <Link
          href="/profile"
          className="rounded-full bg-white px-8 py-3 text-lg font-bold text-purple-900 shadow-lg transition hover:scale-105"
        >
          Ir pro meu perfil
        </Link>
      ) : (
        <a
          href="/api/auth/steam/login"
          className="rounded-full bg-white px-8 py-3 text-lg font-bold text-purple-900 shadow-lg transition hover:scale-105"
        >
          Entrar com Steam
        </a>
      )}
    </main>
  );
}
