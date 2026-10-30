"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export type RoomRealtimeHandlers = {
  onChange?: () => void;
  onPresenceChange?: (onlineUserIds: string[]) => void;
};

const WATCHED_TABLES = [
  "rooms",
  "room_members",
  "room_pool_games",
  "swipes",
  "room_matches",
  "bracket_matches",
  "bracket_votes",
] as const;

/**
 * Assina mudanças em tempo real de tudo que diz respeito a uma sala (lobby, pool,
 * swipes, matches, mata-mata) + presença (quem está com a aba aberta agora). Chama
 * `onChange` pra qualquer mudança nessas tabelas — mais simples e robusto do que
 * tentar aplicar o diff no cliente: a gente só re-busca o snapshot quando algo muda.
 */
export function subscribeToRoom(
  roomId: string,
  userId: string,
  handlers: RoomRealtimeHandlers
): () => void {
  const supabase = getSupabaseBrowserClient();
  const channel = supabase.channel(`room:${roomId}`, {
    config: { presence: { key: userId } },
  });

  for (const table of WATCHED_TABLES) {
    const filterColumn = table === "rooms" ? "id" : "room_id";
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table, filter: `${filterColumn}=eq.${roomId}` },
      () => handlers.onChange?.()
    );
  }

  channel
    .on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      handlers.onPresenceChange?.(Object.keys(state));
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ online_at: new Date().toISOString() });
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}
