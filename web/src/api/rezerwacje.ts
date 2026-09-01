import type { Rezerwacja } from "@strzelnica/shared";
import { apiFetch } from "./client";

export function pobierzDostepnosc(
  strzelnicaId: string,
  osId: string,
  data: string,
): Promise<{ sloty: string[] }> {
  return apiFetch(
    `/api/katalog/strzelnice/${strzelnicaId}/osie/${osId}/dostepnosc?data=${encodeURIComponent(data)}`,
  );
}

export interface UtworzRezerwacjeDane {
  osIds: string[];
  data: string;
  slotOd: string;
  czasTrwaniaMinut: number;
  klientImie: string;
  klientTelefon: string;
  klientEmail: string;
}

export function utworzRezerwacje(
  strzelnicaId: string,
  dane: UtworzRezerwacjeDane,
): Promise<{ rezerwacja: Rezerwacja }> {
  return apiFetch(`/api/katalog/strzelnice/${strzelnicaId}/rezerwacje`, { method: "POST", body: dane });
}
