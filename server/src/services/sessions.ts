import { randomUUID } from "node:crypto";

export type Sesja =
  | { rola: "administratorStrzelnicy"; administratorId: string; strzelnicaId: string }
  | { rola: "administratorPlatformy"; administratorId: string };

/**
 * Tokeny sesyjne administratorów (strzelnicy i platformy) trzymane w pamięci
 * serwera (bez ciasteczek/JWT na tym etapie — Implementation Decisions w spec #1).
 */
export class SessionStore {
  private readonly sesje = new Map<string, Sesja>();

  create(sesja: Sesja): string {
    const token = randomUUID();
    this.sesje.set(token, sesja);
    return token;
  }

  get(token: string): Sesja | undefined {
    return this.sesje.get(token);
  }
}
