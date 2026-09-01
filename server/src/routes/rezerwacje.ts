import { Router } from "express";
import type { Grafik, Repository } from "@strzelnica/shared";
import {
  czyBlokMiesciSieWSlotach,
  dzienTygodniaZDaty,
  obliczPotrzebneSloty,
  slotyRezerwacji,
  walidujFormatDaty,
  wygenerujSlotyDnia,
} from "../domain/dostepnosc.js";
import { czyBlad, zaladujOs, zaladujOsie, zaladujStrzelnicaIGrafik } from "./kontekstStrzelnicy.js";
import { wyslijMail } from "../services/mailer.js";

export async function wolneSloty(
  repository: Repository,
  osId: string,
  data: string,
  grafik: Grafik,
): Promise<string[]> {
  const dzienTygodnia = dzienTygodniaZDaty(data);
  const wszystkieSloty = wygenerujSlotyDnia(grafik.godzinyOtwarcia[dzienTygodnia], grafik.dlugoscSlotuMinut);
  const [rezerwacje, blokady] = await Promise.all([
    repository.listujAktywneRezerwacjeOsiWDniu(osId, data),
    repository.listujAktywneBlokadyOsiWDniu(osId, data),
  ]);
  const zajete = new Set(
    [...rezerwacje, ...blokady].flatMap((wpis) =>
      slotyRezerwacji(wpis.slotOd, wpis.liczbaSlotow, grafik.dlugoscSlotuMinut),
    ),
  );
  return wszystkieSloty.filter((slot) => !zajete.has(slot));
}

interface UtworzRezerwacjeBody {
  osIds?: unknown;
  data?: unknown;
  slotOd?: unknown;
  czasTrwaniaMinut?: unknown;
  klientImie?: unknown;
  klientTelefon?: unknown;
  klientEmail?: unknown;
}

function walidujBlad(body: UtworzRezerwacjeBody): string | undefined {
  if (
    !Array.isArray(body.osIds) ||
    body.osIds.length === 0 ||
    !body.osIds.every((id) => typeof id === "string" && id.trim() !== "") ||
    new Set(body.osIds).size !== body.osIds.length
  ) {
    return "Wymagane jest wskazanie co najmniej jednej Osi (bez powtórzeń)";
  }
  if (typeof body.data !== "string" || !walidujFormatDaty(body.data)) {
    return "Data musi być w formacie RRRR-MM-DD";
  }
  if (typeof body.slotOd !== "string" || body.slotOd.trim() === "") {
    return "Wymagany jest wybór slotu początkowego";
  }
  if (typeof body.czasTrwaniaMinut !== "number" || !Number.isInteger(body.czasTrwaniaMinut) || body.czasTrwaniaMinut <= 0) {
    return "Czas trwania rezerwacji musi być dodatnią liczbą minut";
  }
  if (typeof body.klientImie !== "string" || body.klientImie.trim() === "") {
    return "Imię jest wymagane";
  }
  if (typeof body.klientTelefon !== "string" || body.klientTelefon.trim() === "") {
    return "Telefon jest wymagany";
  }
  if (typeof body.klientEmail !== "string" || body.klientEmail.trim() === "") {
    return "E-mail jest wymagany";
  }
  return undefined;
}

export function createRezerwacjeRouter(repository: Repository): Router {
  const router = Router();

  router.get("/api/katalog/strzelnice/:strzelnicaId/osie/:osId/dostepnosc", async (req, res) => {
    const { data } = req.query as { data?: string };
    if (typeof data !== "string" || !walidujFormatDaty(data)) {
      res.status(400).json({ blad: "Data musi być w formacie RRRR-MM-DD" });
      return;
    }

    const kontekst = await zaladujStrzelnicaIGrafik(repository, req.params.strzelnicaId);
    if (czyBlad(kontekst)) {
      res.status(kontekst.status).json({ blad: kontekst.blad });
      return;
    }
    const os = await zaladujOs(repository, req.params.strzelnicaId, req.params.osId);
    if (czyBlad(os)) {
      res.status(os.status).json({ blad: os.blad });
      return;
    }

    const sloty = await wolneSloty(repository, os.id, data, kontekst.grafik);
    res.status(200).json({ sloty });
  });

  router.post("/api/katalog/strzelnice/:strzelnicaId/rezerwacje", async (req, res) => {
    const body = req.body as UtworzRezerwacjeBody;
    const bladWalidacji = walidujBlad(body);
    if (bladWalidacji) {
      res.status(400).json({ blad: bladWalidacji });
      return;
    }
    const dane = {
      osIds: body.osIds as string[],
      data: body.data as string,
      slotOd: body.slotOd as string,
      czasTrwaniaMinut: body.czasTrwaniaMinut as number,
      klientImie: body.klientImie as string,
      klientTelefon: body.klientTelefon as string,
      klientEmail: body.klientEmail as string,
    };

    const kontekst = await zaladujStrzelnicaIGrafik(repository, req.params.strzelnicaId);
    if (czyBlad(kontekst)) {
      res.status(kontekst.status).json({ blad: kontekst.blad });
      return;
    }
    const { strzelnica, grafik } = kontekst;

    const potrzebne = obliczPotrzebneSloty(grafik, dane.slotOd, dane.czasTrwaniaMinut);
    if ("blad" in potrzebne) {
      res.status(400).json({ blad: potrzebne.blad });
      return;
    }
    const { liczbaSlotow, sloty: potrzebneSloty } = potrzebne;

    const osie = await zaladujOsie(repository, strzelnica.id, dane.osIds);
    if (czyBlad(osie)) {
      res.status(osie.status).json({ blad: osie.blad });
      return;
    }

    for (const os of osie) {
      const dostepne = await wolneSloty(repository, os.id, dane.data, grafik);
      if (!czyBlokMiesciSieWSlotach(potrzebneSloty, dostepne)) {
        res.status(400).json({ blad: `Wybrany przedział czasu jest niedostępny na Osi "${os.nazwa}"` });
        return;
      }
    }

    const cenaCalkowita = osie.reduce((suma, os) => suma + os.cenaZaSlot * liczbaSlotow, 0);

    const rezerwacja = await repository.utworzRezerwacje({
      strzelnicaId: strzelnica.id,
      osIds: osie.map((os) => os.id),
      data: dane.data,
      slotOd: dane.slotOd,
      liczbaSlotow,
      cenaCalkowita,
      klientImie: dane.klientImie,
      klientTelefon: dane.klientTelefon,
      klientEmail: dane.klientEmail,
    });

    const nazwyOsi = osie.map((os) => `"${os.nazwa}"`).join(", ");
    await wyslijMail(repository, {
      do: rezerwacja.klientEmail,
      temat: "Potwierdzenie rezerwacji",
      tresc: `Rezerwacja Osi ${nazwyOsi} w Strzelnicy "${strzelnica.nazwa}" na ${rezerwacja.data} od ${rezerwacja.slotOd} (${dane.czasTrwaniaMinut} min) została przyjęta. Cena: ${rezerwacja.cenaCalkowita} zł. Link do anulowania: /api/rezerwacje/anulowanie/${rezerwacja.tokenAnulowania}`,
    });

    res.status(201).json({ rezerwacja });
  });

  return router;
}
