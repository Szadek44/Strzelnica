import type { Repository, WpisLoguMaili } from "@strzelnica/shared";

/**
 * "Wysyłka" maila w prototypie: brak SMTP, wiadomość trafia do logu w
 * pamięci widocznego przez developerski endpoint (ADR-0001, spec #1).
 */
export function wyslijMail(
  repository: Repository,
  wpis: Omit<WpisLoguMaili, "id" | "wyslanoAt">,
): Promise<WpisLoguMaili> {
  return repository.dodajWpisLoguMaili(wpis);
}
