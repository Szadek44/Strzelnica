import type { Strzelnica } from "@strzelnica/shared";
import { apiFetch } from "./client";

export interface RejestracjaStrzelnicyDane {
  nazwa: string;
  adres: string;
  nip: string;
  opis: string;
  kontaktEmail: string;
  kontaktTelefon: string;
  adminEmail: string;
  adminHaslo: string;
}

export function zarejestrujStrzelnice(dane: RejestracjaStrzelnicyDane): Promise<{ strzelnica: Strzelnica }> {
  return apiFetch("/api/strzelnice", { method: "POST", body: dane });
}
