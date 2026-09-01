import { apiFetch } from "./client";

export interface LogowanieAdministratoraStrzelnicyOdpowiedz {
  token: string;
  strzelnicaId: string;
}

export function zalogujAdministratoraStrzelnicy(
  email: string,
  haslo: string,
): Promise<LogowanieAdministratoraStrzelnicyOdpowiedz> {
  return apiFetch("/api/auth/administratorzy-strzelnicy/logowanie", {
    method: "POST",
    body: { email, haslo },
  });
}

export function zalogujAdministratoraPlatformy(email: string, haslo: string): Promise<{ token: string }> {
  return apiFetch("/api/auth/administratorzy-platformy/logowanie", {
    method: "POST",
    body: { email, haslo },
  });
}
