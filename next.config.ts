import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Este app é todo dinâmico (sessão/login, salas em tempo real) — não tem páginas
  // estáticas que se beneficiem de Cache Components/PPR, então desligamos pra evitar
  // ter que encapsular cookies()/searchParams em Suspense em toda página.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
