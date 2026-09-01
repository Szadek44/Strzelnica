import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { InMemoryRepository } from "../domain/repository.js";
import { dataWPrzyszlosci, klientPayload, przygotujStrzelniceZOsia } from "../test/helpers.js";

async function utworzRezerwacje(
  app: ReturnType<typeof createApp>,
  strzelnicaId: string,
  osId: string,
  overrides: Partial<Record<string, unknown>> = {},
) {
  const res = await request(app)
    .post(`/api/katalog/strzelnice/${strzelnicaId}/rezerwacje`)
    .send({
      osIds: [osId],
      data: dataWPrzyszlosci(7),
      slotOd: "09:00",
      czasTrwaniaMinut: 60,
      ...klientPayload(),
      ...overrides,
    });
  return res.body.rezerwacja as { tokenAnulowania: string; data: string; slotOd: string };
}

describe("GET /api/rezerwacje/anulowanie/:token", () => {
  it("pokazuje szczegóły Rezerwacji dla poprawnego tokenu, bez logowania i bez jej anulowania", async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    const { strzelnicaId, os } = await przygotujStrzelniceZOsia(app, repository, {
      rejestracja: { nazwa: "Strzelnica Podglądowa" },
    });
    const rezerwacja = await utworzRezerwacje(app, strzelnicaId, os.id);

    const res = await request(app).get(`/api/rezerwacje/anulowanie/${rezerwacja.tokenAnulowania}`);

    expect(res.status).toBe(200);
    expect(res.body.strzelnicaNazwa).toBe("Strzelnica Podglądowa");
    expect(res.body.rezerwacja).toMatchObject({ status: "potwierdzona", slotOd: "09:00" });

    const sprawdzenie = await repository.znajdzRezerwacjePoTokenie(rezerwacja.tokenAnulowania);
    expect(sprawdzenie?.status).toBe("potwierdzona");
  });

  it("zwraca 404 dla nieznanego tokenu", async () => {
    const app = createApp(new InMemoryRepository());

    const res = await request(app).get("/api/rezerwacje/anulowanie/nieznany-token");

    expect(res.status).toBe(404);
  });
});

describe("POST /api/rezerwacje/anulowanie/:token", () => {
  it("pozwala klientowi anulować własną Rezerwację wyłącznie tokenem, bez logowania", async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    const { strzelnicaId, os } = await przygotujStrzelniceZOsia(app, repository, {
      grafik: { limitAnulowaniaGodzin: 24 },
    });
    const rezerwacja = await utworzRezerwacje(app, strzelnicaId, os.id);

    const res = await request(app).post(`/api/rezerwacje/anulowanie/${rezerwacja.tokenAnulowania}`);

    expect(res.status).toBe(200);
    expect(res.body.rezerwacja).toMatchObject({ status: "anulowana" });
  });

  it("odrzuca anulowanie po upływie limitu czasowego Strzelnicy", async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    const { strzelnicaId, os } = await przygotujStrzelniceZOsia(app, repository, {
      grafik: { limitAnulowaniaGodzin: 999999 },
    });
    const rezerwacja = await utworzRezerwacje(app, strzelnicaId, os.id);

    const res = await request(app).post(`/api/rezerwacje/anulowanie/${rezerwacja.tokenAnulowania}`);

    expect(res.status).toBe(400);

    const sprawdzenie = await repository.znajdzRezerwacjePoTokenie(rezerwacja.tokenAnulowania);
    expect(sprawdzenie?.status).toBe("potwierdzona");
  });

  it("po anulowaniu slot ponownie pojawia się jako dostępny", async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    const { strzelnicaId, os } = await przygotujStrzelniceZOsia(app, repository);
    const data = dataWPrzyszlosci(7);
    const rezerwacja = await utworzRezerwacje(app, strzelnicaId, os.id);

    await request(app).post(`/api/rezerwacje/anulowanie/${rezerwacja.tokenAnulowania}`);

    const dostepnosc = await request(app)
      .get(`/api/katalog/strzelnice/${strzelnicaId}/osie/${os.id}/dostepnosc`)
      .query({ data });
    expect(dostepnosc.body.sloty).toContain("09:00");
  });

  it("mail potwierdzający anulowanie pojawia się w logu maili", async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    const { strzelnicaId, os } = await przygotujStrzelniceZOsia(app, repository);
    const rezerwacja = await utworzRezerwacje(app, strzelnicaId, os.id, {
      klientEmail: "anulowanie@example.com",
    });

    await request(app).post(`/api/rezerwacje/anulowanie/${rezerwacja.tokenAnulowania}`);

    const logMaili = await request(app).get("/api/dev/log-maili");
    const wpis = logMaili.body.wpisy.find(
      (w: { do: string; temat: string }) => w.do === "anulowanie@example.com" && w.temat === "Rezerwacja anulowana",
    );
    expect(wpis).toBeDefined();
  });

  it("zwraca 404 dla nieznanego tokenu", async () => {
    const app = createApp(new InMemoryRepository());

    const res = await request(app).post("/api/rezerwacje/anulowanie/nieznany-token");

    expect(res.status).toBe(404);
  });

  it("odrzuca ponowne anulowanie już anulowanej Rezerwacji", async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    const { strzelnicaId, os } = await przygotujStrzelniceZOsia(app, repository);
    const rezerwacja = await utworzRezerwacje(app, strzelnicaId, os.id);
    await request(app).post(`/api/rezerwacje/anulowanie/${rezerwacja.tokenAnulowania}`);

    const res = await request(app).post(`/api/rezerwacje/anulowanie/${rezerwacja.tokenAnulowania}`);

    expect(res.status).toBe(400);
  });
});
