import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { InMemoryRepository } from "../domain/repository.js";
import { dataWPrzyszlosci, klientPayload, osPayload, przygotujStrzelniceZOsia } from "../test/helpers.js";

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
      .send({ osIds: [os.id], data, slotOd: "10:00", czasTrwaniaMinut: 60, ...klientPayload() });

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

describe("POST /api/katalog/strzelnice/:strzelnicaId/rezerwacje — pojedynczy slot na jednej Osi", () => {
  it("rezerwuje dokładnie jeden wolny slot bez zakładania konta i liczy cenę", async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    const { strzelnicaId, os } = await przygotujStrzelniceZOsia(app, repository, {
      os: { cenaZaSlot: 75 },
    });
    const data = dataWPrzyszlosci();

    const res = await request(app)
      .post(`/api/katalog/strzelnice/${strzelnicaId}/rezerwacje`)
      .send({ osIds: [os.id], data, slotOd: "09:00", czasTrwaniaMinut: 60, ...klientPayload() });

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
      .send({
        osIds: [os.id],
        data,
        slotOd: "09:00",
        czasTrwaniaMinut: 60,
        ...klientPayload({ klientEmail: "potwierdzenie@example.com" }),
      });
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
      .send({ osIds: [os.id], data, slotOd: "09:00", czasTrwaniaMinut: 60, ...klientPayload() });

    const res = await request(app)
      .post(`/api/katalog/strzelnice/${strzelnicaId}/rezerwacje`)
      .send({
        osIds: [os.id],
        data,
        slotOd: "09:00",
        czasTrwaniaMinut: 60,
        ...klientPayload({ klientEmail: "drugi@example.com" }),
      });

    expect(res.status).toBe(400);
  });

  it("odrzuca rezerwację slotu spoza godzin otwarcia", async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    const { strzelnicaId, os } = await przygotujStrzelniceZOsia(app, repository);

    const res = await request(app)
      .post(`/api/katalog/strzelnice/${strzelnicaId}/rezerwacje`)
      .send({ osIds: [os.id], data: dataWPrzyszlosci(), slotOd: "23:00", czasTrwaniaMinut: 60, ...klientPayload() });

    expect(res.status).toBe(400);
  });

  it("odrzuca rezerwację z brakującymi danymi klienta", async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    const { strzelnicaId, os } = await przygotujStrzelniceZOsia(app, repository);

    const res = await request(app)
      .post(`/api/katalog/strzelnice/${strzelnicaId}/rezerwacje`)
      .send({ osIds: [os.id], data: dataWPrzyszlosci(), slotOd: "09:00", czasTrwaniaMinut: 60, klientImie: "Jan" });

    expect(res.status).toBe(400);
  });

  it("zwraca 404 dla nieoczekującej/nieistniejącej Strzelnicy", async () => {
    const app = createApp(new InMemoryRepository());

    const res = await request(app)
      .post("/api/katalog/strzelnice/nieistniejaca/rezerwacje")
      .send({ osIds: ["cokolwiek"], data: dataWPrzyszlosci(), slotOd: "09:00", czasTrwaniaMinut: 60, ...klientPayload() });

    expect(res.status).toBe(404);
  });
});

describe("POST /api/katalog/strzelnice/:strzelnicaId/rezerwacje — wiele slotów na jednej Osi", () => {
  it("rezerwuje kilka kolejnych slotów na jednej Osi jako jedną Rezerwację i sumuje cenę", async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    const { strzelnicaId, os } = await przygotujStrzelniceZOsia(app, repository, {
      grafik: { dlugoscSlotuMinut: 60 },
      os: { cenaZaSlot: 50 },
    });
    const data = dataWPrzyszlosci();

    const res = await request(app)
      .post(`/api/katalog/strzelnice/${strzelnicaId}/rezerwacje`)
      .send({ osIds: [os.id], data, slotOd: "09:00", czasTrwaniaMinut: 180, ...klientPayload() });

    expect(res.status).toBe(201);
    expect(res.body.rezerwacja).toMatchObject({ liczbaSlotow: 3, cenaCalkowita: 150 });

    const dostepnosc = await request(app)
      .get(`/api/katalog/strzelnice/${strzelnicaId}/osie/${os.id}/dostepnosc`)
      .query({ data });
    expect(dostepnosc.body.sloty).not.toContain("09:00");
    expect(dostepnosc.body.sloty).not.toContain("10:00");
    expect(dostepnosc.body.sloty).not.toContain("11:00");
    expect(dostepnosc.body.sloty).toContain("12:00");
  });

  it("odrzuca czas trwania niebędący wielokrotnością długości slotu", async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    const { strzelnicaId, os } = await przygotujStrzelniceZOsia(app, repository, {
      grafik: { dlugoscSlotuMinut: 60 },
    });

    const res = await request(app)
      .post(`/api/katalog/strzelnice/${strzelnicaId}/rezerwacje`)
      .send({ osIds: [os.id], data: dataWPrzyszlosci(), slotOd: "09:00", czasTrwaniaMinut: 90, ...klientPayload() });

    expect(res.status).toBe(400);
  });

  it("odrzuca wielosegmentową rezerwację kolidującą z istniejącą rezerwacją w środku zakresu", async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    const { strzelnicaId, os } = await przygotujStrzelniceZOsia(app, repository, {
      grafik: { dlugoscSlotuMinut: 60 },
    });
    const data = dataWPrzyszlosci();
    await request(app)
      .post(`/api/katalog/strzelnice/${strzelnicaId}/rezerwacje`)
      .send({ osIds: [os.id], data, slotOd: "10:00", czasTrwaniaMinut: 60, ...klientPayload() });

    const res = await request(app)
      .post(`/api/katalog/strzelnice/${strzelnicaId}/rezerwacje`)
      .send({
        osIds: [os.id],
        data,
        slotOd: "09:00",
        czasTrwaniaMinut: 180,
        ...klientPayload({ klientEmail: "inny@example.com" }),
      });

    expect(res.status).toBe(400);
  });
});

describe("POST /api/katalog/strzelnice/:strzelnicaId/rezerwacje — kilka Osi naraz", () => {
  it("rezerwuje kilka Osi naraz w tym samym przedziale czasu jako jedną Rezerwację i sumuje cenę", async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    const { token, strzelnicaId, os: os1 } = await przygotujStrzelniceZOsia(app, repository, {
      os: { nazwa: "Oś 1", cenaZaSlot: 50 },
    });
    const os2Res = await request(app)
      .post("/api/administratorzy-strzelnicy/osie")
      .set("Authorization", `Bearer ${token}`)
      .send(osPayload({ nazwa: "Oś 2", cenaZaSlot: 60 }));
    const os2 = os2Res.body.os as { id: string };
    const data = dataWPrzyszlosci();

    const res = await request(app)
      .post(`/api/katalog/strzelnice/${strzelnicaId}/rezerwacje`)
      .send({ osIds: [os1.id, os2.id], data, slotOd: "09:00", czasTrwaniaMinut: 60, ...klientPayload() });

    expect(res.status).toBe(201);
    expect(res.body.rezerwacja).toMatchObject({
      osIds: [os1.id, os2.id],
      liczbaSlotow: 1,
      cenaCalkowita: 110,
    });

    const dostepnoscOs1 = await request(app)
      .get(`/api/katalog/strzelnice/${strzelnicaId}/osie/${os1.id}/dostepnosc`)
      .query({ data });
    const dostepnoscOs2 = await request(app)
      .get(`/api/katalog/strzelnice/${strzelnicaId}/osie/${os2.id}/dostepnosc`)
      .query({ data });
    expect(dostepnoscOs1.body.sloty).not.toContain("09:00");
    expect(dostepnoscOs2.body.sloty).not.toContain("09:00");
  });

  it("odrzuca rezerwację wieloosiową, gdy jedna z Osi ma zajęty slot w wybranym zakresie", async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    const { token, strzelnicaId, os: os1 } = await przygotujStrzelniceZOsia(app, repository);
    const os2Res = await request(app)
      .post("/api/administratorzy-strzelnicy/osie")
      .set("Authorization", `Bearer ${token}`)
      .send(osPayload({ nazwa: "Oś 2" }));
    const os2 = os2Res.body.os as { id: string };
    const data = dataWPrzyszlosci();
    await request(app)
      .post(`/api/katalog/strzelnice/${strzelnicaId}/rezerwacje`)
      .send({ osIds: [os2.id], data, slotOd: "09:00", czasTrwaniaMinut: 60, ...klientPayload() });

    const res = await request(app)
      .post(`/api/katalog/strzelnice/${strzelnicaId}/rezerwacje`)
      .send({
        osIds: [os1.id, os2.id],
        data,
        slotOd: "09:00",
        czasTrwaniaMinut: 60,
        ...klientPayload({ klientEmail: "inny@example.com" }),
      });

    expect(res.status).toBe(400);
    const dostepnoscOs1 = await request(app)
      .get(`/api/katalog/strzelnice/${strzelnicaId}/osie/${os1.id}/dostepnosc`)
      .query({ data });
    expect(dostepnoscOs1.body.sloty).toContain("09:00");
  });
});
