import type { Rezerwacja } from "@strzelnica/shared";
import { apiFetch } from "./client";

export function listujRezerwacjeStrzelnicy(token: string): Promise<{ rezerwacje: Rezerwacja[] }> {
  return apiFetch("/api/administratorzy-strzelnicy/rezerwacje", { token });
}
