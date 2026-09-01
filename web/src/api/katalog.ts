import type { Os, Strzelnica } from "@strzelnica/shared";
import { apiFetch } from "./client";

export function listujKatalogStrzelnic(q: string | undefined): Promise<{ strzelnice: Strzelnica[] }> {
  const query = q ? `?q=${encodeURIComponent(q)}` : "";
  return apiFetch(`/api/katalog/strzelnice${query}`);
}

export function pobierzProfilStrzelnicy(id: string): Promise<{ strzelnica: Strzelnica; osie: Os[] }> {
  return apiFetch(`/api/katalog/strzelnice/${id}`);
}
