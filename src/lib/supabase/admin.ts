import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env.server";

let adminClient: SupabaseClient | null = null;

/**
 * Cliente Supabase com a service_role key — só pode ser usado em código de servidor
 * (route handlers, server components). Nunca importar isto em um componente client.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!adminClient) {
    adminClient = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClient;
}
