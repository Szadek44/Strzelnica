import { Router } from "express";
import { DNI_TYGODNIA, type GodzinyOtwarcia, type GodzinyOtwarciaDnia, type Repository } from "@strzelnica/shared";
import { wymagaRoli } from "../middleware/autoryzacja.js";
import { strzelnicaIdZSesji } from "./kontekstStrzelnicy.js";
import type { SessionStore } from "../services/sessions.js";

const CZAS_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

interface UstawGrafikuBody {
  dlugoscSlotuMinut?: unknown;
  limitAnulowaniaGodzin?: unknown;
  godzinyOtwarcia?: unknown;
}

function walidujGodzinyDnia(dzien: unknown): dzien is GodzinyOtwarciaDnia {
  if (typeof dzien !== "object" || dzien === null) {
    return false;
  }
  const wpis = dzien as Record<string, unknown>;
  if (wpis.otwarte === false) {
    return true;
  }
  if (wpis.otwarte !== true) {
    return false;
  }
  if (typeof wpis.od !== "string" || typeof wpis.do !== "string") {
    return false;
  }
  if (!CZAS_REGEX.test(wpis.od) || !CZAS_REGEX.test(wpis.do)) {
    return false;
  }
  return wpis.od < wpis.do;
}

function walidujGodzinyOtwarcia(godziny: unknown): godziny is GodzinyOtwarcia {
  if (typeof godziny !== "object" || godziny === null) {
    return false;
  }
  return DNI_TYGODNIA.every((dzien) => walidujGodzinyDnia((godziny as Record<string, unknown>)[dzien]));
}

function walidujBlad(body: UstawGrafikuBody): string | undefined {
  if (
    typeof body.dlugoscSlotuMinut !== "number" ||
    !Number.isInteger(body.dlugoscSlotuMinut) ||
    body.dlugoscSlotuMinut <= 0
  ) {
    return "Długość slotu musi być dodatnią liczbą minut";
  }
  if (
    typeof body.limitAnulowaniaGodzin !== "number" ||
    !Number.isInteger(body.limitAnulowaniaGodzin) ||
    body.limitAnulowaniaGodzin < 0
  ) {
    return "Limit anulowania musi być nieujemną liczbą godzin";
  }
  if (!walidujGodzinyOtwarcia(body.godzinyOtwarcia)) {
    return "Godziny otwarcia muszą być podane dla każdego dnia tygodnia";
  }
  return undefined;
}

export function createGrafikRouter(repository: Repository, sessions: SessionStore): Router {
  const router = Router();

  router.put(
    "/api/administratorzy-strzelnicy/grafik",
    wymagaRoli(sessions, "administratorStrzelnicy"),
    async (req, res) => {
      const body = req.body as UstawGrafikuBody;
      const blad = walidujBlad(body);
      if (blad) {
        res.status(400).json({ blad });
        return;
      }

      const strzelnicaId = strzelnicaIdZSesji(req);
      const grafik = await repository.ustawGrafik(strzelnicaId, {
        dlugoscSlotuMinut: body.dlugoscSlotuMinut as number,
        limitAnulowaniaGodzin: body.limitAnulowaniaGodzin as number,
        godzinyOtwarcia: body.godzinyOtwarcia as GodzinyOtwarcia,
      });

      res.status(200).json({ grafik });
    },
  );

  router.get(
    "/api/administratorzy-strzelnicy/grafik",
    wymagaRoli(sessions, "administratorStrzelnicy"),
    async (req, res) => {
      const strzelnicaId = strzelnicaIdZSesji(req);
      const grafik = await repository.znajdzGrafikPoStrzelnicaId(strzelnicaId);
      if (!grafik) {
        res.status(404).json({ blad: "Grafik nie został jeszcze ustawiony" });
        return;
      }
      res.status(200).json({ grafik });
    },
  );

  return router;
}
