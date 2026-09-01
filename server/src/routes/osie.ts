import { Router } from "express";
import type { Repository } from "@strzelnica/shared";
import { wymagaRoli } from "../middleware/autoryzacja.js";
import type { RequestZSesja } from "../middleware/autoryzacja.js";
import type { SessionStore } from "../services/sessions.js";

interface DodajOsBody {
  nazwa?: unknown;
  dystansMetrow?: unknown;
  dozwoloneTypyBroni?: unknown;
  cenaZaSlot?: unknown;
}

function walidujBlad(body: DodajOsBody): string | undefined {
  if (typeof body.nazwa !== "string" || body.nazwa.trim() === "") {
    return "Nazwa Osi jest wymagana";
  }
  if (typeof body.dystansMetrow !== "number" || body.dystansMetrow <= 0) {
    return "Dystans musi być dodatnią liczbą metrów";
  }
  if (
    !Array.isArray(body.dozwoloneTypyBroni) ||
    body.dozwoloneTypyBroni.length === 0 ||
    !body.dozwoloneTypyBroni.every((typ) => typeof typ === "string" && typ.trim() !== "")
  ) {
    return "Wymagany jest co najmniej jeden dozwolony typ broni";
  }
  if (typeof body.cenaZaSlot !== "number" || body.cenaZaSlot < 0) {
    return "Cena za slot musi być nieujemną liczbą";
  }
  return undefined;
}

export function createOsieRouter(repository: Repository, sessions: SessionStore): Router {
  const router = Router();

  router.post(
    "/api/administratorzy-strzelnicy/osie",
    wymagaRoli(sessions, "administratorStrzelnicy"),
    async (req, res) => {
      const body = req.body as DodajOsBody;
      const blad = walidujBlad(body);
      if (blad) {
        res.status(400).json({ blad });
        return;
      }

      const { strzelnicaId } = (req as RequestZSesja).sesja as { strzelnicaId: string };
      const os = await repository.dodajOs({
        strzelnicaId,
        nazwa: body.nazwa as string,
        dystansMetrow: body.dystansMetrow as number,
        dozwoloneTypyBroni: body.dozwoloneTypyBroni as string[],
        cenaZaSlot: body.cenaZaSlot as number,
      });

      res.status(201).json({ os });
    },
  );

  router.get(
    "/api/administratorzy-strzelnicy/osie",
    wymagaRoli(sessions, "administratorStrzelnicy"),
    async (req, res) => {
      const { strzelnicaId } = (req as RequestZSesja).sesja as { strzelnicaId: string };
      const osie = await repository.listujOsieStrzelnicy(strzelnicaId);
      res.status(200).json({ osie });
    },
  );

  return router;
}
