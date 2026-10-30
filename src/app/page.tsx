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
    <main className="flex min-h-screen flex-1 flex-col items-center justify-center gap-8 px-6 text-center text-white">
      <div className="animate-rise relative">
        <h1
          className="font-display bg-clip-text text-5xl font-extrabold tracking-tight text-transparent sm:text-6xl"
          style={{
            backgroundImage:
              "linear-gradient(to right, var(--accent-c), #ffffff, var(--accent-b))",
          }}
        >
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
