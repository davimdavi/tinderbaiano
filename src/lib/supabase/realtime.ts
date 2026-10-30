"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export type RoomRealtimeHandlers = {
  onChange?: () => void;
  onPresenceChange?: (onlineUserIds: string[]) => void;
};

/**
 * Assina mudanças em tempo real de uma sala (rooms/room_members/room_pool_games) +
 * presença (quem está com a aba aberta agora). Chama `onChange` pra qualquer mudança
 * nas três tabelas — mais simples e robusto do que tentar aplicar o diff no cliente:
 * a gente só re-busca o snapshot da sala quando algo muda.
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

  channel
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
      () => handlers.onChange?.()
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "room_members",
        filter: `room_id=eq.${roomId}`,
      },
      () => handlers.onChange?.()
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "room_pool_games",
        filter: `room_id=eq.${roomId}`,
      },
      () => handlers.onChange?.()
    )
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
