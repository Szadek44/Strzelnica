import type { Os } from "@strzelnica/shared";
import { apiFetch } from "./client";

export interface DodajOsDane {
  nazwa: string;
  dystansMetrow: number;
  dozwoloneTypyBroni: string[];
  cenaZaSlot: number;
}

export function dodajOs(dane: DodajOsDane, token: string): Promise<{ os: Os }> {
  return apiFetch("/api/administratorzy-strzelnicy/osie", { method: "POST", body: dane, token });
}

export function listujOsie(token: string): Promise<{ osie: Os[] }> {
  return apiFetch("/api/administratorzy-strzelnicy/osie", { token });
}
