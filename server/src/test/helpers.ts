import type { Express } from "express";
import request from "supertest";
import { InMemoryRepository } from "../domain/repository.js";
import { hashPassword } from "../services/passwords.js";

export function rejestracjaPayload(overrides: Partial<Record<string, string>> = {}) {
  return {
    nazwa: "Strzelnica Testowa",
    adres: "ul. Testowa 1, Warszawa",
    nip: "1234563218",
    opis: "Kryta strzelnica sportowa",
    kontaktEmail: "kontakt@strzelnica-testowa.pl",
    kontaktTelefon: "500100200",
    adminEmail: "admin@strzelnica-testowa.pl",
    adminHaslo: "bardzoTajneHaslo123",
    ...overrides,
  };
}

export async function zasiejAdministratoraPlatformy(
  repository: InMemoryRepository,
  overrides: { email?: string; haslo?: string } = {},
) {
  const email = overrides.email ?? "admin@platforma-testowa.pl";
  const haslo = overrides.haslo ?? "tajneHasloPlatformy1";
  await repository.utworzAdministratoraPlatformy({ email, hasloHash: await hashPassword(haslo) });
  return { email, haslo };
}

export async function zalogujAdministratoraPlatformy(
  app: Express,
  dane: { email: string; haslo: string },
) {
  const res = await request(app).post("/api/auth/administratorzy-platformy/logowanie").send(dane);
  return res.body.token as string;
}

/**
 * Rejestruje Strzelnicę, zatwierdza ją (wymagane od #4 — nieopublikowana
 * Strzelnica nie ma katalogu/profilu), po czym loguje jej Administratora.
 * Zwraca token oraz id Strzelnicy do dalszych żądań w testach.
 */
export async function zarejestrujIZalogujAdministratoraStrzelnicy(
  app: Express,
  repository: InMemoryRepository,
  overrides: Partial<Record<string, string>> = {},
) {
  const payload = rejestracjaPayload(overrides);
  const rejestracja = await request(app).post("/api/strzelnice").send(payload);
  const strzelnicaId = rejestracja.body.strzelnica.id as string;

  const platformaDane = await zasiejAdministratoraPlatformy(repository, {
    email: `platforma-${strzelnicaId}@platforma-testowa.pl`,
  });
  const platformaToken = await zalogujAdministratoraPlatformy(app, platformaDane);
  await request(app)
    .post(`/api/administratorzy-platformy/strzelnice/${strzelnicaId}/zatwierdzenie`)
    .set("Authorization", `Bearer ${platformaToken}`);

  const logowanie = await request(app)
    .post("/api/auth/administratorzy-strzelnicy/logowanie")
    .send({ email: payload.adminEmail, haslo: payload.adminHaslo });

  return { token: logowanie.body.token as string, strzelnicaId };
}

export function godzinyOtwarciaCalyTydzien(od = "08:00", doGodz = "20:00") {
  const dni = ["poniedzialek", "wtorek", "sroda", "czwartek", "piatek", "sobota", "niedziela"] as const;
  return Object.fromEntries(dni.map((dzien) => [dzien, { otwarte: true, od, do: doGodz }]));
}

export function grafikPayload(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    dlugoscSlotuMinut: 60,
    limitAnulowaniaGodzin: 24,
    godzinyOtwarcia: godzinyOtwarciaCalyTydzien(),
    ...overrides,
  };
}

export function osPayload(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    nazwa: "Oś 1",
    dystansMetrow: 25,
    dozwoloneTypyBroni: ["pistolet"],
    cenaZaSlot: 50,
    ...overrides,
  };
}

/** Data (RRRR-MM-DD) `dni` dni od dziś, w UTC, żeby testy nie zależały od strefy czasowej maszyny CI. */
export function dataWPrzyszlosci(dni = 7): string {
  const data = new Date();
  data.setUTCDate(data.getUTCDate() + dni);
  return data.toISOString().slice(0, 10);
}

/**
 * Rejestruje i zatwierdza Strzelnicę, ustawia grafik otwarty całą dobę-ish
 * (08:00-20:00 każdego dnia) i dodaje jedną Oś — punkt wyjścia dla testów
 * dostępności i rezerwacji.
 */
export async function przygotujStrzelniceZOsia(
  app: Express,
  repository: InMemoryRepository,
  overrides: {
    rejestracja?: Partial<Record<string, string>>;
    grafik?: Partial<Record<string, unknown>>;
    os?: Partial<Record<string, unknown>>;
  } = {},
) {
  const { token, strzelnicaId } = await zarejestrujIZalogujAdministratoraStrzelnicy(
    app,
    repository,
    overrides.rejestracja,
  );
  await request(app)
    .put("/api/administratorzy-strzelnicy/grafik")
    .set("Authorization", `Bearer ${token}`)
    .send(grafikPayload(overrides.grafik));
  const osRes = await request(app)
    .post("/api/administratorzy-strzelnicy/osie")
    .set("Authorization", `Bearer ${token}`)
    .send(osPayload(overrides.os));

  return { token, strzelnicaId, os: osRes.body.os as { id: string; cenaZaSlot: number; nazwa: string } };
}

export function klientPayload(overrides: Partial<Record<string, string>> = {}) {
  return {
    klientImie: "Jan Kowalski",
    klientTelefon: "600100200",
    klientEmail: "jan.kowalski@example.com",
    ...overrides,
  };
}
