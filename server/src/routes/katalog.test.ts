import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { InMemoryRepository } from "../domain/repository.js";
import { osPayload, rejestracjaPayload, zarejestrujIZalogujAdministratoraStrzelnicy } from "../test/helpers.js";

describe("GET /api/katalog/strzelnice", () => {
  it("pokazuje wyłącznie zatwierdzone Strzelnice", async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    await zarejestrujIZalogujAdministratoraStrzelnicy(app, repository, {
      nazwa: "Zatwierdzona Strzelnica",
      adminEmail: "zatwierdzona@strzelnica-testowa.pl",
    });
    await request(app)
      .post("/api/strzelnice")
      .send(rejestracjaPayload({ nazwa: "Oczekująca Strzelnica", adminEmail: "oczekujaca@strzelnica-testowa.pl" }));

    const res = await request(app).get("/api/katalog/strzelnice");

    expect(res.status).toBe(200);
    expect(res.body.strzelnice).toHaveLength(1);
    expect(res.body.strzelnice[0]).toMatchObject({ nazwa: "Zatwierdzona Strzelnica", status: "zatwierdzona" });
  });

  it("filtruje wyniki tekstowo po nazwie", async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    await zarejestrujIZalogujAdministratoraStrzelnicy(app, repository, {
      nazwa: "Strzelnica Krakowska",
      adres: "ul. Długa 5, Kraków",
      adminEmail: "krakow@strzelnica-testowa.pl",
    });
    await zarejestrujIZalogujAdministratoraStrzelnicy(app, repository, {
      nazwa: "Strzelnica Warszawska",
      adres: "ul. Krótka 2, Warszawa",
      adminEmail: "warszawa@strzelnica-testowa.pl",
    });

    const res = await request(app).get("/api/katalog/strzelnice").query({ q: "krak" });

    expect(res.status).toBe(200);
    expect(res.body.strzelnice).toHaveLength(1);
    expect(res.body.strzelnice[0]).toMatchObject({ nazwa: "Strzelnica Krakowska" });
  });

  it("filtruje wyniki tekstowo po mieście z adresu", async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    await zarejestrujIZalogujAdministratoraStrzelnicy(app, repository, {
      nazwa: "Strzelnica A",
      adres: "ul. Długa 5, Kraków",
      adminEmail: "a@strzelnica-testowa.pl",
    });
    await zarejestrujIZalogujAdministratoraStrzelnicy(app, repository, {
      nazwa: "Strzelnica B",
      adres: "ul. Krótka 2, Warszawa",
      adminEmail: "b@strzelnica-testowa.pl",
    });

    const res = await request(app).get("/api/katalog/strzelnice").query({ q: "Warszawa" });

    expect(res.status).toBe(200);
    expect(res.body.strzelnice).toHaveLength(1);
    expect(res.body.strzelnice[0]).toMatchObject({ nazwa: "Strzelnica B" });
  });
});

describe("GET /api/katalog/strzelnice/:id", () => {
  it("pokazuje opis, adres, dane kontaktowe i listę Osi zatwierdzonej Strzelnicy", async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    const { token, strzelnicaId } = await zarejestrujIZalogujAdministratoraStrzelnicy(app, repository);
    await request(app)
      .post("/api/administratorzy-strzelnicy/osie")
      .set("Authorization", `Bearer ${token}`)
      .send(osPayload({ nazwa: "Oś 1" }));

    const res = await request(app).get(`/api/katalog/strzelnice/${strzelnicaId}`);

    expect(res.status).toBe(200);
    expect(res.body.strzelnica).toMatchObject({
      id: strzelnicaId,
      opis: "Kryta strzelnica sportowa",
      adres: "ul. Testowa 1, Warszawa",
      kontaktEmail: "kontakt@strzelnica-testowa.pl",
      kontaktTelefon: "500100200",
    });
    expect(res.body.osie).toHaveLength(1);
    expect(res.body.osie[0]).toMatchObject({ nazwa: "Oś 1" });
  });

  it("zwraca 404 dla oczekującej Strzelnicy", async () => {
    const app = createApp(new InMemoryRepository());
    const rejestracja = await request(app).post("/api/strzelnice").send(rejestracjaPayload());
    const oczekujacaId = rejestracja.body.strzelnica.id as string;

    const res = await request(app).get(`/api/katalog/strzelnice/${oczekujacaId}`);

    expect(res.status).toBe(404);
  });

  it("zwraca 404 dla nieistniejącego id", async () => {
    const app = createApp(new InMemoryRepository());

    const res = await request(app).get("/api/katalog/strzelnice/nieistniejace-id");

    expect(res.status).toBe(404);
  });
});
