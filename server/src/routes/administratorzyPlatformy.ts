import { Router } from "express";
import type { Repository } from "@strzelnica/shared";
import { wymagaRoli } from "../middleware/autoryzacja.js";
import { wyslijMail } from "../services/mailer.js";
import { verifyPassword } from "../services/passwords.js";
import type { SessionStore } from "../services/sessions.js";

export function createAdministratorzyPlatformyRouter(
  repository: Repository,
  sessions: SessionStore,
): Router {
  const router = Router();

  router.post("/api/auth/administratorzy-platformy/logowanie", async (req, res) => {
    const { email, haslo } = req.body as { email?: string; haslo?: string };

    const administrator = email
      ? await repository.znajdzAdministratoraPlatformyPoEmail(email)
      : undefined;
    const hasloPoprawne = administrator
      ? await verifyPassword(haslo ?? "", administrator.hasloHash)
      : false;

    if (!administrator || !hasloPoprawne) {
      res.status(401).json({ blad: "Nieprawidłowy e-mail lub hasło" });
      return;
    }

    const token = sessions.create({
      rola: "administratorPlatformy",
      administratorId: administrator.id,
    });

    res.status(200).json({ token });
  });

  router.get(
    "/api/administratorzy-platformy/strzelnice-oczekujace",
    wymagaRoli(sessions, "administratorPlatformy"),
    async (_req, res) => {
      const strzelnice = await repository.listujStrzelniceOczekujace();
      res.status(200).json({ strzelnice });
    },
  );

  router.post(
    "/api/administratorzy-platformy/strzelnice/:id/zatwierdzenie",
    wymagaRoli(sessions, "administratorPlatformy"),
    async (req, res) => {
      const strzelnica = await repository.zatwierdzStrzelnice(req.params.id);
      if (!strzelnica) {
        res.status(404).json({ blad: "Nie znaleziono Strzelnicy" });
        return;
      }

      const administratorStrzelnicy = await repository.znajdzAdministratoraStrzelnicyPoStrzelnicaId(
        strzelnica.id,
      );
      if (administratorStrzelnicy) {
        await wyslijMail(repository, {
          do: administratorStrzelnicy.email,
          temat: "Strzelnica zatwierdzona",
          tresc: `Twoja Strzelnica "${strzelnica.nazwa}" została zatwierdzona i jest teraz widoczna w katalogu platformy.`,
        });
      }

      res.status(200).json({ strzelnica });
    },
  );

  return router;
}
