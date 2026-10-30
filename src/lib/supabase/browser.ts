import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase para o navegador — usa só a chave pública (anon key), segura
 * para expor no bundle do cliente. Usado para assinar subscriptions em tempo real
 * (a partir da Fase 2).
 */
export function getSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY não configurados."
    );
  }
  return createClient(url, anonKey, { auth: { persistSession: false } });
}
