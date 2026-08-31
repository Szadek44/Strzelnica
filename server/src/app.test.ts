import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "./app.js";
import { InMemoryRepository } from "./domain/repository.js";

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
