import type { Metadata } from "next";
import { Baloo_2, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ArcadeBackdrop } from "@/components/ui/ArcadeBackdrop";
import { ThemePicker } from "@/components/ui/ThemePicker";

const baloo2 = Baloo_2({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-numeric",
  subsets: ["latin"],
  weight: ["500", "700"],
});

export const metadata: Metadata = {
  title: "TinderBaiano",
  description: "Dá match no jogo certo pra jogar com a galera.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${baloo2.variable} ${hankenGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased`}
      // O ThemePicker reaplica o tema salvo (localStorage) assim que monta, antes
      // que o servidor tenha como saber qual é — essa divergência é esperada.
      suppressHydrationWarning
    >
      <body className="arcade-bg flex min-h-full flex-col font-body">
        <ArcadeBackdrop />
        <div className="relative z-10 flex min-h-full flex-1 flex-col">{children}</div>
        <ThemePicker />
      </body>
    </html>
  );
}
