import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { InMemoryRepository } from "../domain/repository.js";
import { dataWPrzyszlosci, klientPayload, przygotujStrzelniceZOsia } from "../test/helpers.js";

describe("POST /api/administratorzy-strzelnicy/blokady", () => {
  it("tworzy Blokadę na wybranej Osi i przedziale czasu", async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    const { token, os } = await przygotujStrzelniceZOsia(app, repository);
    const data = dataWPrzyszlosci();

    const res = await request(app)
      .post("/api/administratorzy-strzelnicy/blokady")
      .set("Authorization", `Bearer ${token}`)
      .send({ osId: os.id, data, slotOd: "10:00", czasTrwaniaMinut: 60, powod: "Awaria" });

    expect(res.status).toBe(201);
    expect(res.body.blokada).toMatchObject({ osId: os.id, data, slotOd: "10:00", liczbaSlotow: 1, powod: "Awaria" });
  });

  it("zablokowany termin znika z dostępności w widoku rezerwacji klienta", async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    const { token, strzelnicaId, os } = await przygotujStrzelniceZOsia(app, repository);
    const data = dataWPrzyszlosci();
    await request(app)
      .post("/api/administratorzy-strzelnicy/blokady")
      .set("Authorization", `Bearer ${token}`)
      .send({ osId: os.id, data, slotOd: "10:00", czasTrwaniaMinut: 60 });

    const dostepnosc = await request(app)
      .get(`/api/katalog/strzelnice/${strzelnicaId}/osie/${os.id}/dostepnosc`)
      .query({ data });

    expect(dostepnosc.body.sloty).not.toContain("10:00");
  });

  it("odrzuca Blokadę kolidującą z potwierdzoną Rezerwacją", async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    const { token, strzelnicaId, os } = await przygotujStrzelniceZOsia(app, repository);
    const data = dataWPrzyszlosci();
    await request(app)
      .post(`/api/katalog/strzelnice/${strzelnicaId}/rezerwacje`)
      .send({ osIds: [os.id], data, slotOd: "10:00", czasTrwaniaMinut: 60, ...klientPayload() });

    const res = await request(app)
      .post("/api/administratorzy-strzelnicy/blokady")
      .set("Authorization", `Bearer ${token}`)
      .send({ osId: os.id, data, slotOd: "10:00", czasTrwaniaMinut: 60 });

    expect(res.status).toBe(400);
  });

  it("odrzuca Blokadę kolidującą z inną Blokadą", async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    const { token, os } = await przygotujStrzelniceZOsia(app, repository);
    const data = dataWPrzyszlosci();
    await request(app)
      .post("/api/administratorzy-strzelnicy/blokady")
      .set("Authorization", `Bearer ${token}`)
      .send({ osId: os.id, data, slotOd: "10:00", czasTrwaniaMinut: 60 });

    const res = await request(app)
      .post("/api/administratorzy-strzelnicy/blokady")
      .set("Authorization", `Bearer ${token}`)
      .send({ osId: os.id, data, slotOd: "10:00", czasTrwaniaMinut: 60 });

    expect(res.status).toBe(400);
  });

  it("odrzuca żądanie bez tokenu Administratora strzelnicy", async () => {
    const app = createApp(new InMemoryRepository());

    const res = await request(app)
      .post("/api/administratorzy-strzelnicy/blokady")
      .send({ osId: "cokolwiek", data: dataWPrzyszlosci(), slotOd: "10:00", czasTrwaniaMinut: 60 });

    expect(res.status).toBe(401);
  });
});

describe("DELETE /api/administratorzy-strzelnicy/blokady/:id", () => {
  it("usuwa własną Blokadę, przywracając dostępność terminu", async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    const { token, strzelnicaId, os } = await przygotujStrzelniceZOsia(app, repository);
    const data = dataWPrzyszlosci();
    const blokada = await request(app)
      .post("/api/administratorzy-strzelnicy/blokady")
      .set("Authorization", `Bearer ${token}`)
      .send({ osId: os.id, data, slotOd: "10:00", czasTrwaniaMinut: 60 });

    const usuniecie = await request(app)
      .delete(`/api/administratorzy-strzelnicy/blokady/${blokada.body.blokada.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(usuniecie.status).toBe(204);
    const dostepnosc = await request(app)
      .get(`/api/katalog/strzelnice/${strzelnicaId}/osie/${os.id}/dostepnosc`)
      .query({ data });
    expect(dostepnosc.body.sloty).toContain("10:00");
  });

  it("odrzuca usunięcie Blokady należącej do innej Strzelnicy", async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    const pierwsza = await przygotujStrzelniceZOsia(app, repository, {
      rejestracja: { adminEmail: "pierwsza@strzelnica-testowa.pl" },
    });
    const druga = await przygotujStrzelniceZOsia(app, repository, {
      rejestracja: { adminEmail: "druga@strzelnica-testowa.pl" },
    });
    const blokada = await request(app)
      .post("/api/administratorzy-strzelnicy/blokady")
      .set("Authorization", `Bearer ${pierwsza.token}`)
      .send({ osId: pierwsza.os.id, data: dataWPrzyszlosci(), slotOd: "10:00", czasTrwaniaMinut: 60 });

    const res = await request(app)
      .delete(`/api/administratorzy-strzelnicy/blokady/${blokada.body.blokada.id}`)
      .set("Authorization", `Bearer ${druga.token}`);

    expect(res.status).toBe(404);
  });

  it("zwraca 404 dla nieistniejącej Blokady", async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    const { token } = await przygotujStrzelniceZOsia(app, repository);

    const res = await request(app)
      .delete("/api/administratorzy-strzelnicy/blokady/nieistniejaca")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
