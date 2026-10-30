"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export default function RoomActions() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/rooms", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao criar sala.");
      router.push(`/room/${data.code}`);
    } catch {
      setError("Não deu pra criar a sala agora. Tenta de novo.");
      setCreating(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setJoining(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${code}/join`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "not_found") throw new Error("Sala não encontrada.");
        if (data.error === "already_started")
          throw new Error("Essa sala já começou, não dá mais pra entrar.");
        throw new Error("Falha ao entrar na sala.");
      }
      router.push(`/room/${code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao entrar na sala.");
      setJoining(false);
    }
  }

  return (
    <div className="animate-rise mb-8 flex flex-col gap-3 rounded-2xl bg-white/10 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="font-display text-lg font-bold">Montar uma partida</h2>
        <p className="text-sm text-white/70">
          Crie uma sala pra chamar a galera, ou entre com um código que te mandaram.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button onClick={handleCreate} disabled={creating} variant="primary">
          {creating ? "Criando..." : "Criar sala"}
        </Button>
        <form onSubmit={handleJoin} className="flex gap-2">
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="CÓDIGO"
            maxLength={6}
            className="w-28 rounded-full bg-white/20 px-4 py-2.5 text-center text-sm font-bold uppercase tracking-widest text-white placeholder-white/50 outline-none transition-colors focus:bg-white/30"
          />
          <Button type="submit" disabled={joining} variant="accent-blue">
            {joining ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </div>
      {error && <p className="text-sm text-red-300 sm:basis-full">{error}</p>}
    </div>
  );
}
