import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { InMemoryRepository } from "../domain/repository.js";
import { dataWPrzyszlosci, klientPayload, przygotujStrzelniceZOsia } from "../test/helpers.js";

describe("GET /api/katalog/strzelnice/:strzelnicaId/osie/:osId/dostepnosc", () => {
  it("liczy dostępne sloty z godzin otwarcia i długości slotu", async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    const { strzelnicaId, os } = await przygotujStrzelniceZOsia(app, repository, {
      grafik: { dlugoscSlotuMinut: 60 },
    });
    const data = dataWPrzyszlosci();

    const res = await request(app)
      .get(`/api/katalog/strzelnice/${strzelnicaId}/osie/${os.id}/dostepnosc`)
      .query({ data });

    expect(res.status).toBe(200);
    expect(res.body.sloty).toEqual([
      "08:00", "09:00", "10:00", "11:00", "12:00", "13:00",
      "14:00", "15:00", "16:00", "17:00", "18:00", "19:00",
    ]);
  });

  it("nie pokazuje już zarezerwowanego slotu", async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    const { strzelnicaId, os } = await przygotujStrzelniceZOsia(app, repository);
    const data = dataWPrzyszlosci();
    await request(app)
      .post(`/api/katalog/strzelnice/${strzelnicaId}/rezerwacje`)
      .send({ osId: os.id, data, slotOd: "10:00", ...klientPayload() });

    const res = await request(app)
      .get(`/api/katalog/strzelnice/${strzelnicaId}/osie/${os.id}/dostepnosc`)
      .query({ data });

    expect(res.status).toBe(200);
    expect(res.body.sloty).not.toContain("10:00");
  });

  it("zwraca 400 dla nieprawidłowego formatu daty", async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    const { strzelnicaId, os } = await przygotujStrzelniceZOsia(app, repository);

    const res = await request(app)
      .get(`/api/katalog/strzelnice/${strzelnicaId}/osie/${os.id}/dostepnosc`)
      .query({ data: "07-09-2026" });

    expect(res.status).toBe(400);
  });

  it("zwraca 404 dla nieistniejącej Osi", async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    const { strzelnicaId } = await przygotujStrzelniceZOsia(app, repository);

    const res = await request(app)
      .get(`/api/katalog/strzelnice/${strzelnicaId}/osie/nieistniejaca/dostepnosc`)
      .query({ data: dataWPrzyszlosci() });

    expect(res.status).toBe(404);
  });
});

describe("POST /api/katalog/strzelnice/:strzelnicaId/rezerwacje", () => {
  it("rezerwuje dokładnie jeden wolny slot bez zakładania konta i liczy cenę", async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    const { strzelnicaId, os } = await przygotujStrzelniceZOsia(app, repository, {
      os: { cenaZaSlot: 75 },
    });
    const data = dataWPrzyszlosci();

    const res = await request(app)
      .post(`/api/katalog/strzelnice/${strzelnicaId}/rezerwacje`)
      .send({ osId: os.id, data, slotOd: "09:00", ...klientPayload() });

    expect(res.status).toBe(201);
    expect(res.body.rezerwacja).toMatchObject({
      strzelnicaId,
      osIds: [os.id],
      data,
      slotOd: "09:00",
      liczbaSlotow: 1,
      cenaCalkowita: 75,
      status: "potwierdzona",
      klientImie: "Jan Kowalski",
    });
    expect(typeof res.body.rezerwacja.tokenAnulowania).toBe("string");
    expect(res.body.rezerwacja.tokenAnulowania.length).toBeGreaterThan(0);
  });

  it("wysyła mail potwierdzający z unikalnym tokenem/linkiem do anulowania", async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    const { strzelnicaId, os } = await przygotujStrzelniceZOsia(app, repository);
    const data = dataWPrzyszlosci();

    const rezerwacja = await request(app)
      .post(`/api/katalog/strzelnice/${strzelnicaId}/rezerwacje`)
      .send({ osId: os.id, data, slotOd: "09:00", ...klientPayload({ klientEmail: "potwierdzenie@example.com" }) });
    const token = rezerwacja.body.rezerwacja.tokenAnulowania as string;

    const logMaili = await request(app).get("/api/dev/log-maili");
    const wpis = logMaili.body.wpisy.find((w: { do: string }) => w.do === "potwierdzenie@example.com");
    expect(wpis).toBeDefined();
    expect(wpis.tresc).toContain(token);
  });

  it("po rezerwacji slot znika z dostępności dla innych klientów", async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    const { strzelnicaId, os } = await przygotujStrzelniceZOsia(app, repository);
    const data = dataWPrzyszlosci();
    await request(app)
      .post(`/api/katalog/strzelnice/${strzelnicaId}/rezerwacje`)
      .send({ osId: os.id, data, slotOd: "09:00", ...klientPayload() });

    const res = await request(app)
      .post(`/api/katalog/strzelnice/${strzelnicaId}/rezerwacje`)
      .send({ osId: os.id, data, slotOd: "09:00", ...klientPayload({ klientEmail: "drugi@example.com" }) });

    expect(res.status).toBe(400);
  });

  it("odrzuca rezerwację slotu spoza godzin otwarcia", async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    const { strzelnicaId, os } = await przygotujStrzelniceZOsia(app, repository);

    const res = await request(app)
      .post(`/api/katalog/strzelnice/${strzelnicaId}/rezerwacje`)
      .send({ osId: os.id, data: dataWPrzyszlosci(), slotOd: "23:00", ...klientPayload() });

    expect(res.status).toBe(400);
  });

  it("odrzuca rezerwację z brakującymi danymi klienta", async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    const { strzelnicaId, os } = await przygotujStrzelniceZOsia(app, repository);

    const res = await request(app)
      .post(`/api/katalog/strzelnice/${strzelnicaId}/rezerwacje`)
      .send({ osId: os.id, data: dataWPrzyszlosci(), slotOd: "09:00", klientImie: "Jan" });

    expect(res.status).toBe(400);
  });

  it("zwraca 404 dla nieoczekującej/nieistniejącej Strzelnicy", async () => {
    const app = createApp(new InMemoryRepository());

    const res = await request(app)
      .post("/api/katalog/strzelnice/nieistniejaca/rezerwacje")
      .send({ osId: "cokolwiek", data: dataWPrzyszlosci(), slotOd: "09:00", ...klientPayload() });

    expect(res.status).toBe(404);
  });
});
