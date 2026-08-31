import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "./app.js";
import { InMemoryRepository } from "./domain/repository.js";
import { hashPassword } from "./services/passwords.js";

function rejestracjaPayload(overrides: Partial<Record<string, string>> = {}) {
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

async function zasiejAdministratoraPlatformy(
  repository: InMemoryRepository,
  overrides: { email?: string; haslo?: string } = {},
) {
  const email = overrides.email ?? "admin@platforma-testowa.pl";
  const haslo = overrides.haslo ?? "tajneHasloPlatformy1";
  await repository.utworzAdministratoraPlatformy({ email, hasloHash: await hashPassword(haslo) });
  return { email, haslo };
}

async function zalogujAdministratoraPlatformy(
  app: ReturnType<typeof createApp>,
  dane: { email: string; haslo: string },
) {
  const res = await request(app)
    .post("/api/auth/administratorzy-platformy/logowanie")
    .send(dane);
  return res.body.token as string;
}

describe("POST /api/strzelnice", () => {
  it("tworzy Strzelnicę ze statusem oczekująca", async () => {
    const app = createApp(new InMemoryRepository());

    const res = await request(app).post("/api/strzelnice").send(rejestracjaPayload());

    expect(res.status).toBe(201);
    expect(res.body.strzelnica).toMatchObject({
      nazwa: "Strzelnica Testowa",
      status: "oczekujaca",
    });
  });

  it("odrzuca rejestrację z brakującym polem", async () => {
    const app = createApp(new InMemoryRepository());

    const res = await request(app)
      .post("/api/strzelnice")
      .send(rejestracjaPayload({ nazwa: "" }));

    expect(res.status).toBe(400);
  });

  it("odrzuca rejestrację, gdy adres e-mail administratora już istnieje", async () => {
    const app = createApp(new InMemoryRepository());
    await request(app)
      .post("/api/strzelnice")
      .send(rejestracjaPayload({ adminEmail: "duplikat@strzelnica-testowa.pl" }));

    const res = await request(app)
      .post("/api/strzelnice")
      .send(rejestracjaPayload({ nazwa: "Inna Strzelnica", adminEmail: "duplikat@strzelnica-testowa.pl" }));

    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/administratorzy-strzelnicy/logowanie", () => {
  it("pozwala zalogować się kontem założonym przy rejestracji", async () => {
    const app = createApp(new InMemoryRepository());
    await request(app)
      .post("/api/strzelnice")
      .send(rejestracjaPayload({ adminEmail: "login@strzelnica-testowa.pl", adminHaslo: "sekretneHaslo1" }));

    const res = await request(app)
      .post("/api/auth/administratorzy-strzelnicy/logowanie")
      .send({ email: "login@strzelnica-testowa.pl", haslo: "sekretneHaslo1" });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe("string");
    expect(res.body.token.length).toBeGreaterThan(0);
  });

  it("odrzuca logowanie z nieprawidłowym hasłem", async () => {
    const app = createApp(new InMemoryRepository());
    await request(app)
      .post("/api/strzelnice")
      .send(rejestracjaPayload({ adminEmail: "zle-haslo@strzelnica-testowa.pl", adminHaslo: "poprawneHaslo1" }));

    const res = await request(app)
      .post("/api/auth/administratorzy-strzelnicy/logowanie")
      .send({ email: "zle-haslo@strzelnica-testowa.pl", haslo: "zleHaslo" });

    expect(res.status).toBe(401);
    expect(res.body.token).toBeUndefined();
  });
});

describe("GET /api/dev/log-maili", () => {
  it("pokazuje treść maila wysłanego po rejestracji", async () => {
    const app = createApp(new InMemoryRepository());
    await request(app)
      .post("/api/strzelnice")
      .send(rejestracjaPayload({ adminEmail: "log-maili@strzelnica-testowa.pl" }));

    const res = await request(app).get("/api/dev/log-maili");

    expect(res.status).toBe(200);
    expect(res.body.wpisy).toHaveLength(1);
    expect(res.body.wpisy[0]).toMatchObject({ do: "log-maili@strzelnica-testowa.pl" });
    expect(typeof res.body.wpisy[0].tresc).toBe("string");
    expect(res.body.wpisy[0].tresc.length).toBeGreaterThan(0);
  });
});

describe("POST /api/auth/administratorzy-platformy/logowanie", () => {
  it("pozwala zalogować się zaseedowanym kontem administratora platformy", async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    const dane = await zasiejAdministratoraPlatformy(repository);

    const res = await request(app)
      .post("/api/auth/administratorzy-platformy/logowanie")
      .send(dane);

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe("string");
    expect(res.body.token.length).toBeGreaterThan(0);
  });

  it("odrzuca logowanie z nieprawidłowym hasłem", async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    const dane = await zasiejAdministratoraPlatformy(repository, { email: "zle-haslo@platforma.pl" });

    const res = await request(app)
      .post("/api/auth/administratorzy-platformy/logowanie")
      .send({ email: dane.email, haslo: "zupelnieInneHaslo" });

    expect(res.status).toBe(401);
    expect(res.body.token).toBeUndefined();
  });
});

describe("Kolejka i zatwierdzanie Strzelnic przez Administratora platformy", () => {
  it("lista oczekujących pokazuje wyłącznie Strzelnice ze statusem oczekująca", async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    const platformaDane = await zasiejAdministratoraPlatformy(repository);
    const platformaToken = await zalogujAdministratoraPlatformy(app, platformaDane);

    const rejestracja = await request(app)
      .post("/api/strzelnice")
      .send(rejestracjaPayload({ nazwa: "Oczekująca Strzelnica", adminEmail: "oczekujaca@strzelnica-testowa.pl" }));
    const oczekujacaId = rejestracja.body.strzelnica.id as string;

    await request(app)
      .post(`/api/administratorzy-platformy/strzelnice/${oczekujacaId}/zatwierdzenie`)
      .set("Authorization", `Bearer ${platformaToken}`);
    await request(app)
      .post("/api/strzelnice")
      .send(rejestracjaPayload({ nazwa: "Druga Oczekująca", adminEmail: "druga-oczekujaca@strzelnica-testowa.pl" }));

    const res = await request(app)
      .get("/api/administratorzy-platformy/strzelnice-oczekujace")
      .set("Authorization", `Bearer ${platformaToken}`);

    expect(res.status).toBe(200);
    expect(res.body.strzelnice).toHaveLength(1);
    expect(res.body.strzelnice[0]).toMatchObject({ nazwa: "Druga Oczekująca", status: "oczekujaca" });
  });

  it("zatwierdzenie zmienia status na zatwierdzona i wysyła mail do Administratora strzelnicy", async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    const platformaDane = await zasiejAdministratoraPlatformy(repository);
    const platformaToken = await zalogujAdministratoraPlatformy(app, platformaDane);

    const rejestracja = await request(app)
      .post("/api/strzelnice")
      .send(rejestracjaPayload({ adminEmail: "do-zatwierdzenia@strzelnica-testowa.pl" }));
    const strzelnicaId = rejestracja.body.strzelnica.id as string;

    const res = await request(app)
      .post(`/api/administratorzy-platformy/strzelnice/${strzelnicaId}/zatwierdzenie`)
      .set("Authorization", `Bearer ${platformaToken}`);

    expect(res.status).toBe(200);
    expect(res.body.strzelnica).toMatchObject({ id: strzelnicaId, status: "zatwierdzona" });

    const logMaili = await request(app).get("/api/dev/log-maili");
    expect(logMaili.body.wpisy).toHaveLength(2);
    expect(logMaili.body.wpisy[1]).toMatchObject({
      do: "do-zatwierdzenia@strzelnica-testowa.pl",
      temat: "Strzelnica zatwierdzona",
    });
  });

  it("odrzuca żądania bez tokenu", async () => {
    const app = createApp(new InMemoryRepository());

    const res = await request(app).get("/api/administratorzy-platformy/strzelnice-oczekujace");

    expect(res.status).toBe(401);
  });

  it("odrzuca token Administratora strzelnicy na endpointach Administratora platformy", async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    await request(app)
      .post("/api/strzelnice")
      .send(rejestracjaPayload({ adminEmail: "cross-rola@strzelnica-testowa.pl", adminHaslo: "hasloStrzelnicy1" }));
    const logowanie = await request(app)
      .post("/api/auth/administratorzy-strzelnicy/logowanie")
      .send({ email: "cross-rola@strzelnica-testowa.pl", haslo: "hasloStrzelnicy1" });
    const tokenStrzelnicy = logowanie.body.token as string;

    const res = await request(app)
      .get("/api/administratorzy-platformy/strzelnice-oczekujace")
      .set("Authorization", `Bearer ${tokenStrzelnicy}`);

    expect(res.status).toBe(403);
  });
});
