import type { NextFunction, Request, Response } from "express";
import type { Sesja, SessionStore } from "../services/sessions.js";

export interface RequestZSesja extends Request {
  sesja: Sesja;
}

function wyciagnijToken(req: Request): string | undefined {
  const naglowek = req.header("authorization");
  if (!naglowek?.startsWith("Bearer ")) {
    return undefined;
  }
  return naglowek.slice("Bearer ".length);
}

/**
 * Bramka roli: token ważny, ale z inną rolą niż wymagana, dostaje 403 (nie
 * 401) — odróżnia "nie jesteś zalogowany" od "endpoint nie jest dla Ciebie",
 * co realizuje izolację ról administratora strzelnicy i administratora
 * platformy z acceptance criteria #3.
 */
export function wymagaRoli(sessions: SessionStore, rola: Sesja["rola"]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const token = wyciagnijToken(req);
    const sesja = token ? sessions.get(token) : undefined;

    if (!sesja) {
      res.status(401).json({ blad: "Brak autoryzacji" });
      return;
    }
    if (sesja.rola !== rola) {
      res.status(403).json({ blad: "Brak uprawnień do tego zasobu" });
      return;
    }

    (req as RequestZSesja).sesja = sesja;
    next();
  };
}
