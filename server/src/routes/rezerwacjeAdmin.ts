import { Router } from "express";
import type { Repository } from "@strzelnica/shared";
import { wymagaRoli } from "../middleware/autoryzacja.js";
import { strzelnicaIdZSesji } from "./kontekstStrzelnicy.js";
import type { SessionStore } from "../services/sessions.js";

export function createRezerwacjeAdminRouter(repository: Repository, sessions: SessionStore): Router {
  const router = Router();

  router.get(
    "/api/administratorzy-strzelnicy/rezerwacje",
    wymagaRoli(sessions, "administratorStrzelnicy"),
    async (req, res) => {
      const strzelnicaId = strzelnicaIdZSesji(req);
      const rezerwacje = await repository.listujRezerwacjeStrzelnicy(strzelnicaId);
      res.status(200).json({ rezerwacje });
    },
  );

  return router;
}
