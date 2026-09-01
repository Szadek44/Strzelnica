import type { Blokada } from "@strzelnica/shared";
import { apiFetch } from "./client";

export interface UtworzBlokadeDane {
  osId: string;
  data: string;
  slotOd: string;
  czasTrwaniaMinut: number;
  powod?: string;
}

export function listujBlokady(token: string): Promise<{ blokady: Blokada[] }> {
  return apiFetch("/api/administratorzy-strzelnicy/blokady", { token });
}

export function utworzBlokade(dane: UtworzBlokadeDane, token: string): Promise<{ blokada: Blokada }> {
  return apiFetch("/api/administratorzy-strzelnicy/blokady", { method: "POST", body: dane, token });
}

export function usunBlokade(id: string, token: string): Promise<void> {
  return apiFetch(`/api/administratorzy-strzelnicy/blokady/${id}`, { method: "DELETE", token });
}
