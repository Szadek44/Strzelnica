import { Router } from "express";
import type { Repository } from "@strzelnica/shared";
import { hashPassword } from "../services/passwords.js";
import { wyslijMail } from "../services/mailer.js";

interface RejestracjaStrzelnicyBody {
  nazwa: string;
  adres: string;
  nip: string;
  opis: string;
  kontaktEmail: string;
  kontaktTelefon: string;
  adminEmail: string;
  adminHaslo: string;
}

const WYMAGANE_POLA = [
  "nazwa",
  "adres",
  "nip",
  "opis",
  "kontaktEmail",
  "kontaktTelefon",
  "adminEmail",
  "adminHaslo",
] as const satisfies readonly (keyof RejestracjaStrzelnicyBody)[];

function znajdzBrakujacePole(body: Record<string, unknown>): string | undefined {
  return WYMAGANE_POLA.find(
    (pole) => typeof body[pole] !== "string" || (body[pole] as string).trim() === "",
  );
}

export function createStrzelniceRouter(repository: Repository): Router {
  const router = Router();

  router.post("/api/strzelnice", async (req, res) => {
    const body = req.body as Record<string, unknown>;
    const brakujacePole = znajdzBrakujacePole(body);
    if (brakujacePole) {
      res.status(400).json({ blad: `Brak wymaganego pola: ${brakujacePole}` });
      return;
    }
    const dane = body as unknown as RejestracjaStrzelnicyBody;

    const istniejacyAdministrator = await repository.znajdzAdministratoraStrzelnicyPoEmail(
      dane.adminEmail,
    );
    if (istniejacyAdministrator) {
      res.status(400).json({ blad: "Administrator z tym adresem e-mail już istnieje" });
      return;
    }

    const adminHasloHash = await hashPassword(dane.adminHaslo);
    const { strzelnica } = await repository.utworzStrzelnice({
      nazwa: dane.nazwa,
      adres: dane.adres,
      nip: dane.nip,
      opis: dane.opis,
      kontaktEmail: dane.kontaktEmail,
      kontaktTelefon: dane.kontaktTelefon,
      adminEmail: dane.adminEmail,
      adminHasloHash,
    });

    await wyslijMail(repository, {
      do: dane.adminEmail,
      temat: "Rejestracja Strzelnicy przyjęta",
      tresc: `Dziękujemy za rejestrację Strzelnicy "${strzelnica.nazwa}". Wniosek oczekuje na zatwierdzenie przez administratora platformy.`,
    });

    res.status(201).json({ strzelnica });
  });

  return router;
}
