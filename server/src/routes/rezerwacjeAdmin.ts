import { Router } from "express";
import type { Repository } from "@strzelnica/shared";
import { wymagaRoli } from "../middleware/autoryzacja.js";
import type { RequestZSesja } from "../middleware/autoryzacja.js";
import type { SessionStore } from "../services/sessions.js";

export function createRezerwacjeAdminRouter(repository: Repository, sessions: SessionStore): Router {
  const router = Router();

  router.get(
    "/api/administratorzy-strzelnicy/rezerwacje",
    wymagaRoli(sessions, "administratorStrzelnicy"),
    async (req, res) => {
      const { strzelnicaId } = (req as RequestZSesja).sesja as { strzelnicaId: string };
      const rezerwacje = await repository.listujRezerwacjeStrzelnicy(strzelnicaId);
      res.status(200).json({ rezerwacje });
    },
  );

  return router;
}
