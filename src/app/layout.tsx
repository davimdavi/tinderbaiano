import type { Metadata } from "next";
import { Baloo_2, Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ArcadeBackdrop } from "@/components/ui/ArcadeBackdrop";
import { ThemePicker } from "@/components/ui/ThemePicker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const baloo2 = Baloo_2({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "TinderBaiano",
  description: "Dá match no jogo certo pra jogar com a galera.",
};

// Aplica o tema salvo (localStorage) antes da primeira pintura, pra não dar aquele
// "flash" da paleta padrão antes de trocar pra escolhida pelo jogador.
const THEME_INIT_SCRIPT = `
try {
  var t = localStorage.getItem("tb-theme");
  if (t) document.documentElement.setAttribute("data-theme", t);
} catch (e) {}
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} ${baloo2.variable} h-full antialiased`}
      // O script de tema (abaixo) seta data-theme antes da hidratação a partir do
      // localStorage, que o servidor não tem como saber — essa divergência é
      // esperada, então avisamos o React pra não reclamar dela.
      suppressHydrationWarning
    >
      <body className="arcade-bg flex min-h-full flex-col">
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
        <ArcadeBackdrop />
        <div className="relative z-10 flex min-h-full flex-1 flex-col">{children}</div>
        <ThemePicker />
      </body>
    </html>
  );
}
