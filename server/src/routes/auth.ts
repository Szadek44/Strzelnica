import { Router } from "express";
import type { Repository } from "@strzelnica/shared";
import { verifyPassword } from "../services/passwords.js";
import type { SessionStore } from "../services/sessions.js";

export function createAuthRouter(repository: Repository, sessions: SessionStore): Router {
  const router = Router();

  router.post("/api/auth/administratorzy-strzelnicy/logowanie", async (req, res) => {
    const { email, haslo } = req.body as { email?: string; haslo?: string };

    const administrator = email
      ? await repository.znajdzAdministratoraStrzelnicyPoEmail(email)
      : undefined;
    const hasloPoprawne = administrator ? await verifyPassword(haslo ?? "", administrator.hasloHash) : false;

    if (!administrator || !hasloPoprawne) {
      res.status(401).json({ blad: "Nieprawidłowy e-mail lub hasło" });
      return;
    }

    const token = sessions.create({
      administratorId: administrator.id,
      strzelnicaId: administrator.strzelnicaId,
    });

    res.status(200).json({ token, strzelnicaId: administrator.strzelnicaId });
  });

  return router;
}
