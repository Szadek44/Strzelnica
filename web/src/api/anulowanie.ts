import type { Rezerwacja } from "@strzelnica/shared";
import { apiFetch } from "./client";

export function pobierzRezerwacjeDoAnulowania(
  token: string,
): Promise<{ rezerwacja: Rezerwacja; strzelnicaNazwa?: string }> {
  return apiFetch(`/api/rezerwacje/anulowanie/${token}`);
}

export function anulujRezerwacje(token: string): Promise<{ rezerwacja: Rezerwacja }> {
  return apiFetch(`/api/rezerwacje/anulowanie/${token}`, { method: "POST" });
}
