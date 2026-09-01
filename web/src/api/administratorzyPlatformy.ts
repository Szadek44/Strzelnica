import type { Strzelnica } from "@strzelnica/shared";
import { apiFetch } from "./client";

export function listujStrzelniceOczekujace(token: string): Promise<{ strzelnice: Strzelnica[] }> {
  return apiFetch("/api/administratorzy-platformy/strzelnice-oczekujace", { token });
}

export function zatwierdzStrzelnice(id: string, token: string): Promise<{ strzelnica: Strzelnica }> {
  return apiFetch(`/api/administratorzy-platformy/strzelnice/${id}/zatwierdzenie`, {
    method: "POST",
    token,
  });
}
