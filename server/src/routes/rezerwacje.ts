import { Router } from "express";
import type { Grafik, Os, Repository, Strzelnica } from "@strzelnica/shared";
import {
  czyBlokMiesciSieWSlotach,
  dzienTygodniaZDaty,
  slotyRezerwacji,
  walidujFormatDaty,
  wygenerujSlotyDnia,
} from "../domain/dostepnosc.js";
import { wyslijMail } from "../services/mailer.js";

interface KontekstOsi {
  strzelnica: Strzelnica;
  os: Os;
  grafik: Grafik;
}

async function zaladujKontekstOsi(
  repository: Repository,
  strzelnicaId: string,
  osId: string,
): Promise<KontekstOsi | { blad: string; status: number }> {
  const strzelnica = await repository.znajdzStrzelnicePoId(strzelnicaId);
  if (!strzelnica || strzelnica.status !== "zatwierdzona") {
    return { status: 404, blad: "Nie znaleziono Strzelnicy" };
  }
  const os = await repository.znajdzOsPoId(osId);
  if (!os || os.strzelnicaId !== strzelnicaId) {
    return { status: 404, blad: "Nie znaleziono Osi" };
  }
  const grafik = await repository.znajdzGrafikPoStrzelnicaId(strzelnicaId);
  if (!grafik) {
    return { status: 404, blad: "Grafik nie został jeszcze ustawiony dla tej Strzelnicy" };
  }
  return { strzelnica, os, grafik };
}

function czyKontekstBlad(
  kontekst: KontekstOsi | { blad: string; status: number },
): kontekst is { blad: string; status: number } {
  return "blad" in kontekst;
}

async function wolneSloty(
  repository: Repository,
  osId: string,
  data: string,
  grafik: Grafik,
): Promise<string[]> {
  const dzienTygodnia = dzienTygodniaZDaty(data);
  const wszystkieSloty = wygenerujSlotyDnia(grafik.godzinyOtwarcia[dzienTygodnia], grafik.dlugoscSlotuMinut);
  const rezerwacje = await repository.listujAktywneRezerwacjeOsiWDniu(osId, data);
  const zajete = new Set(
    rezerwacje.flatMap((rezerwacja) =>
      slotyRezerwacji(rezerwacja.slotOd, rezerwacja.liczbaSlotow, grafik.dlugoscSlotuMinut),
    ),
  );
  return wszystkieSloty.filter((slot) => !zajete.has(slot));
}

interface UtworzRezerwacjeBody {
  osId?: unknown;
  data?: unknown;
  slotOd?: unknown;
  klientImie?: unknown;
  klientTelefon?: unknown;
  klientEmail?: unknown;
}

function walidujBladRezerwacji(body: UtworzRezerwacjeBody): string | undefined {
  if (typeof body.osId !== "string" || body.osId.trim() === "") {
    return "Wymagane jest wskazanie Osi";
  }
  if (typeof body.data !== "string" || !walidujFormatDaty(body.data)) {
    return "Data musi być w formacie RRRR-MM-DD";
  }
  if (typeof body.slotOd !== "string" || body.slotOd.trim() === "") {
    return "Wymagany jest wybór slotu";
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

    const kontekst = await zaladujKontekstOsi(repository, req.params.strzelnicaId, req.params.osId);
    if (czyKontekstBlad(kontekst)) {
      res.status(kontekst.status).json({ blad: kontekst.blad });
      return;
    }

    const sloty = await wolneSloty(repository, kontekst.os.id, data, kontekst.grafik);
    res.status(200).json({ sloty });
  });

  router.post("/api/katalog/strzelnice/:strzelnicaId/rezerwacje", async (req, res) => {
    const body = req.body as UtworzRezerwacjeBody;
    const bladWalidacji = walidujBladRezerwacji(body);
    if (bladWalidacji) {
      res.status(400).json({ blad: bladWalidacji });
      return;
    }
    const dane = {
      osId: body.osId as string,
      data: body.data as string,
      slotOd: body.slotOd as string,
      klientImie: body.klientImie as string,
      klientTelefon: body.klientTelefon as string,
      klientEmail: body.klientEmail as string,
    };

    const kontekst = await zaladujKontekstOsi(repository, req.params.strzelnicaId, dane.osId);
    if (czyKontekstBlad(kontekst)) {
      res.status(kontekst.status).json({ blad: kontekst.blad });
      return;
    }
    const { strzelnica, os, grafik } = kontekst;

    const dostepne = await wolneSloty(repository, os.id, dane.data, grafik);
    if (!czyBlokMiesciSieWSlotach([dane.slotOd], dostepne)) {
      res.status(400).json({ blad: "Wybrany slot jest niedostępny" });
      return;
    }

    const rezerwacja = await repository.utworzRezerwacje({
      strzelnicaId: strzelnica.id,
      osIds: [os.id],
      data: dane.data,
      slotOd: dane.slotOd,
      liczbaSlotow: 1,
      cenaCalkowita: os.cenaZaSlot,
      klientImie: dane.klientImie,
      klientTelefon: dane.klientTelefon,
      klientEmail: dane.klientEmail,
    });

    await wyslijMail(repository, {
      do: rezerwacja.klientEmail,
      temat: "Potwierdzenie rezerwacji",
      tresc: `Rezerwacja Osi "${os.nazwa}" w Strzelnicy "${strzelnica.nazwa}" na ${rezerwacja.data} od ${rezerwacja.slotOd} została przyjęta. Cena: ${rezerwacja.cenaCalkowita} zł. Link do anulowania: /rezerwacje/anuluj/${rezerwacja.tokenAnulowania}`,
    });

    res.status(201).json({ rezerwacja });
  });

  return router;
}
