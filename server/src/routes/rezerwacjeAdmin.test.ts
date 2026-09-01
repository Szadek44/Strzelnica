import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { InMemoryRepository } from "../domain/repository.js";
import { dataWPrzyszlosci, klientPayload, przygotujStrzelniceZOsia } from "../test/helpers.js";

describe("GET /api/administratorzy-strzelnicy/rezerwacje", () => {
  it("pokazuje listę wszystkich Rezerwacji własnej Strzelnicy", async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    const { token, strzelnicaId, os } = await przygotujStrzelniceZOsia(app, repository);
    await request(app)
      .post(`/api/katalog/strzelnice/${strzelnicaId}/rezerwacje`)
      .send({ osIds: [os.id], data: dataWPrzyszlosci(), slotOd: "09:00", czasTrwaniaMinut: 60, ...klientPayload() });

    const res = await request(app)
      .get("/api/administratorzy-strzelnicy/rezerwacje")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.rezerwacje).toHaveLength(1);
    expect(res.body.rezerwacje[0]).toMatchObject({ strzelnicaId, klientImie: "Jan Kowalski" });
  });

  it("nie pokazuje Rezerwacji innej Strzelnicy", async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    const pierwsza = await przygotujStrzelniceZOsia(app, repository, {
      rejestracja: { adminEmail: "pierwsza@strzelnica-testowa.pl" },
    });
    const druga = await przygotujStrzelniceZOsia(app, repository, {
      rejestracja: { adminEmail: "druga@strzelnica-testowa.pl" },
    });
    await request(app)
      .post(`/api/katalog/strzelnice/${druga.strzelnicaId}/rezerwacje`)
      .send({
        osIds: [druga.os.id],
        data: dataWPrzyszlosci(),
        slotOd: "09:00",
        czasTrwaniaMinut: 60,
        ...klientPayload(),
      });

    const res = await request(app)
      .get("/api/administratorzy-strzelnicy/rezerwacje")
      .set("Authorization", `Bearer ${pierwsza.token}`);

    expect(res.status).toBe(200);
    expect(res.body.rezerwacje).toHaveLength(0);
  });

  it("odrzuca żądanie bez tokenu", async () => {
    const app = createApp(new InMemoryRepository());

    const res = await request(app).get("/api/administratorzy-strzelnicy/rezerwacje");

    expect(res.status).toBe(401);
  });
});
