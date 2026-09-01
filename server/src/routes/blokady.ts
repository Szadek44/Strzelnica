import { Router } from "express";
import type { Repository } from "@strzelnica/shared";
import {
  czyBlokMiesciSieWSlotach,
  dzienTygodniaZDaty,
  slotyRezerwacji,
  walidujFormatDaty,
  wygenerujSlotyDnia,
} from "../domain/dostepnosc.js";
import { wymagaRoli } from "../middleware/autoryzacja.js";
import type { RequestZSesja } from "../middleware/autoryzacja.js";
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

      const { strzelnicaId } = (req as RequestZSesja).sesja as { strzelnicaId: string };
      const os = await repository.znajdzOsPoId(dane.osId);
      if (!os || os.strzelnicaId !== strzelnicaId) {
        res.status(404).json({ blad: "Nie znaleziono Osi" });
        return;
      }
      const grafik = await repository.znajdzGrafikPoStrzelnicaId(strzelnicaId);
      if (!grafik) {
        res.status(404).json({ blad: "Grafik nie został jeszcze ustawiony dla tej Strzelnicy" });
        return;
      }

      if (dane.czasTrwaniaMinut % grafik.dlugoscSlotuMinut !== 0) {
        res.status(400).json({
          blad: `Czas trwania blokady musi być wielokrotnością długości slotu (${grafik.dlugoscSlotuMinut} min)`,
        });
        return;
      }
      const liczbaSlotow = dane.czasTrwaniaMinut / grafik.dlugoscSlotuMinut;
      const potrzebneSloty = slotyRezerwacji(dane.slotOd, liczbaSlotow, grafik.dlugoscSlotuMinut);

      const dzienTygodnia = dzienTygodniaZDaty(dane.data);
      const slotyDnia = wygenerujSlotyDnia(grafik.godzinyOtwarcia[dzienTygodnia], grafik.dlugoscSlotuMinut);
      if (!czyBlokMiesciSieWSlotach(potrzebneSloty, slotyDnia)) {
        res.status(400).json({ blad: "Wybrany przedział czasu wykracza poza godziny otwarcia" });
        return;
      }

      const rezerwacje = await repository.listujAktywneRezerwacjeOsiWDniu(dane.osId, dane.data);
      const zajeteRezerwacjami = new Set(
        rezerwacje.flatMap((rezerwacja) =>
          slotyRezerwacji(rezerwacja.slotOd, rezerwacja.liczbaSlotow, grafik.dlugoscSlotuMinut),
        ),
      );
      if (potrzebneSloty.some((slot) => zajeteRezerwacjami.has(slot))) {
        res.status(400).json({ blad: "Wybrany przedział czasu koliduje z potwierdzoną Rezerwacją" });
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
      const { strzelnicaId } = (req as RequestZSesja).sesja as { strzelnicaId: string };
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
