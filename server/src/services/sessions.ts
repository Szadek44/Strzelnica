import { randomUUID } from "node:crypto";

export interface SesjaAdministratoraStrzelnicy {
  administratorId: string;
  strzelnicaId: string;
}

/**
 * Tokeny sesyjne administratorów strzelnicy trzymane w pamięci serwera
 * (bez ciasteczek/JWT na tym etapie — Implementation Decisions w spec #1).
 */
export class SessionStore {
  private readonly sesje = new Map<string, SesjaAdministratoraStrzelnicy>();

  create(sesja: SesjaAdministratoraStrzelnicy): string {
    const token = randomUUID();
    this.sesje.set(token, sesja);
    return token;
  }

  get(token: string): SesjaAdministratoraStrzelnicy | undefined {
    return this.sesje.get(token);
  }
}
