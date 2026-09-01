import { Router } from "express";
import type { Repository } from "@strzelnica/shared";
import { wyslijMail } from "../services/mailer.js";

function godzinDoTerminu(data: string, slotOd: string): number {
  const poczatek = new Date(`${data}T${slotOd}:00Z`).getTime();
  return (poczatek - Date.now()) / (1000 * 60 * 60);
}

export function createAnulowanieRouter(repository: Repository): Router {
  const router = Router();

  router.get("/api/rezerwacje/anulowanie/:token", async (req, res) => {
    const rezerwacja = await repository.znajdzRezerwacjePoTokenie(req.params.token);
    if (!rezerwacja) {
      res.status(404).json({ blad: "Nie znaleziono Rezerwacji dla podanego tokenu" });
      return;
    }
    const strzelnica = await repository.znajdzStrzelnicePoId(rezerwacja.strzelnicaId);
    res.status(200).json({ rezerwacja, strzelnicaNazwa: strzelnica?.nazwa });
  });

  router.post("/api/rezerwacje/anulowanie/:token", async (req, res) => {
    const rezerwacja = await repository.znajdzRezerwacjePoTokenie(req.params.token);
    if (!rezerwacja) {
      res.status(404).json({ blad: "Nie znaleziono Rezerwacji dla podanego tokenu" });
      return;
    }
    if (rezerwacja.status === "anulowana") {
      res.status(400).json({ blad: "Rezerwacja została już anulowana" });
      return;
    }

    const grafik = await repository.znajdzGrafikPoStrzelnicaId(rezerwacja.strzelnicaId);
    const limitAnulowaniaGodzin = grafik?.limitAnulowaniaGodzin ?? 0;
    if (godzinDoTerminu(rezerwacja.data, rezerwacja.slotOd) < limitAnulowaniaGodzin) {
      res.status(400).json({
        blad: `Anulowanie jest możliwe najpóźniej ${limitAnulowaniaGodzin}h przed terminem rezerwacji`,
      });
      return;
    }

    const anulowana = await repository.anulujRezerwacje(rezerwacja.id);

    await wyslijMail(repository, {
      do: rezerwacja.klientEmail,
      temat: "Rezerwacja anulowana",
      tresc: `Rezerwacja na ${rezerwacja.data} od ${rezerwacja.slotOd} została anulowana.`,
    });

    res.status(200).json({ rezerwacja: anulowana });
  });

  return router;
}
