import { getSession } from "@/lib/auth/session";
import { ButtonLink } from "@/components/ui/ButtonLink";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ login?: string }>;
}) {
  const session = await getSession();
  const { login } = await searchParams;

  return (
    <main className="relative flex min-h-screen flex-1 flex-col items-center justify-center gap-8 overflow-hidden bg-gradient-to-br from-fuchsia-700 via-purple-800 to-indigo-900 px-6 text-center text-white">
      <div
        aria-hidden
        className="animate-blob pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-sky-400/30 blur-3xl"
      />
      <div
        aria-hidden
        className="animate-blob pointer-events-none absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-yellow-400/20 blur-3xl [animation-delay:4s]"
      />

      <div className="animate-rise relative">
        <h1 className="font-display bg-gradient-to-r from-pink-300 via-white to-sky-300 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent sm:text-6xl">
          TinderBaiano
        </h1>
        <p className="mt-4 max-w-md text-lg text-white/80">
          Dá match no jogo certo com a galera. Swipe nos jogos, veja no que todo mundo
          bateu o olho e decida no mata-mata.
        </p>
      </div>

      {login === "erro" && (
        <p className="animate-rise rounded-full bg-red-500/20 px-4 py-2 text-sm text-red-200">
          Não deu pra confirmar o login com a Steam. Tenta de novo.
        </p>
      )}

      <div className="animate-rise [animation-delay:150ms]">
        {session ? (
          <ButtonLink href="/profile" variant="primary" className="px-8 py-3 text-lg">
            Ir pro meu perfil
          </ButtonLink>
        ) : (
          <ButtonLink
            href="/api/auth/steam/login"
            variant="primary"
            className="px-8 py-3 text-lg"
          >
            Entrar com Steam
          </ButtonLink>
        )}
      </div>
    </main>
  );
}
