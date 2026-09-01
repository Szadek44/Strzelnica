import { Router } from "express";
import type { Repository } from "@strzelnica/shared";
import { czyBlokMiesciSieWSlotach, obliczPotrzebneSloty, walidujFormatDaty } from "../domain/dostepnosc.js";
import { czyBlad, strzelnicaIdZSesji, zaladujOs } from "./kontekstStrzelnicy.js";
import { wolneSloty } from "./rezerwacje.js";
import { wymagaRoli } from "../middleware/autoryzacja.js";
import type { SessionStore } from "../services/sessions.js";

interface UtworzBlokadeBody {
  osId?: unknown;
  data?: unknown;
  slotOd?: unknown;
  czasTrwaniaMinut?: unknown;
  powod?: unknown;
}

function walidujBlad(body: UtworzBlokadeBody): string | undefined {
  if (typeof body.osId !== "string" || body.osId.trim() === "") {
    return "Wymagane jest wskazanie Osi";
  }
  if (typeof body.data !== "string" || !walidujFormatDaty(body.data)) {
    return "Data musi być w formacie RRRR-MM-DD";
  }
  if (typeof body.slotOd !== "string" || body.slotOd.trim() === "") {
    return "Wymagany jest wybór slotu początkowego";
  }
  if (
    typeof body.czasTrwaniaMinut !== "number" ||
    !Number.isInteger(body.czasTrwaniaMinut) ||
    body.czasTrwaniaMinut <= 0
  ) {
    return "Czas trwania blokady musi być dodatnią liczbą minut";
  }
  if (body.powod !== undefined && typeof body.powod !== "string") {
    return "Powód musi być tekstem";
  }
  return undefined;
}

export function createBlokadyRouter(repository: Repository, sessions: SessionStore): Router {
  const router = Router();

  router.get(
    "/api/administratorzy-strzelnicy/blokady",
    wymagaRoli(sessions, "administratorStrzelnicy"),
    async (req, res) => {
      const strzelnicaId = strzelnicaIdZSesji(req);
      const blokady = await repository.listujBlokadyStrzelnicy(strzelnicaId);
      res.status(200).json({ blokady });
    },
  );

  router.post(
    "/api/administratorzy-strzelnicy/blokady",
    wymagaRoli(sessions, "administratorStrzelnicy"),
    async (req, res) => {
      const body = req.body as UtworzBlokadeBody;
      const bladWalidacji = walidujBlad(body);
      if (bladWalidacji) {
        res.status(400).json({ blad: bladWalidacji });
        return;
      }
      const dane = {
        osId: body.osId as string,
        data: body.data as string,
        slotOd: body.slotOd as string,
        czasTrwaniaMinut: body.czasTrwaniaMinut as number,
        powod: body.powod as string | undefined,
      };

      const strzelnicaId = strzelnicaIdZSesji(req);
      const os = await zaladujOs(repository, strzelnicaId, dane.osId);
      if (czyBlad(os)) {
        res.status(os.status).json({ blad: os.blad });
        return;
      }
      const grafik = await repository.znajdzGrafikPoStrzelnicaId(strzelnicaId);
      if (!grafik) {
        res.status(404).json({ blad: "Grafik nie został jeszcze ustawiony dla tej Strzelnicy" });
        return;
      }

      const potrzebne = obliczPotrzebneSloty(grafik, dane.slotOd, dane.czasTrwaniaMinut);
      if ("blad" in potrzebne) {
        res.status(400).json({ blad: potrzebne.blad });
        return;
      }
      const { liczbaSlotow, sloty: potrzebneSloty } = potrzebne;

      const dostepne = await wolneSloty(repository, dane.osId, dane.data, grafik);
      if (!czyBlokMiesciSieWSlotach(potrzebneSloty, dostepne)) {
        res.status(400).json({
          blad: "Wybrany przedział czasu wykracza poza godziny otwarcia lub koliduje z potwierdzoną Rezerwacją albo inną Blokadą",
        });
        return;
      }

      const blokada = await repository.utworzBlokade({
        strzelnicaId,
        osId: dane.osId,
        data: dane.data,
        slotOd: dane.slotOd,
        liczbaSlotow,
        powod: dane.powod,
      });

      res.status(201).json({ blokada });
    },
  );

  router.delete(
    "/api/administratorzy-strzelnicy/blokady/:id",
    wymagaRoli(sessions, "administratorStrzelnicy"),
    async (req, res) => {
      const strzelnicaId = strzelnicaIdZSesji(req);
      const usunieto = await repository.usunBlokade(req.params.id, strzelnicaId);
      if (!usunieto) {
        res.status(404).json({ blad: "Nie znaleziono Blokady" });
        return;
      }
      res.status(204).send();
    },
  );

  return router;
}
