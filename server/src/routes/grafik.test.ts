import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { InMemoryRepository } from "../domain/repository.js";
import { godzinyOtwarciaCalyTydzien, grafikPayload, zarejestrujIZalogujAdministratoraStrzelnicy } from "../test/helpers.js";

describe("PUT /api/administratorzy-strzelnicy/grafik", () => {
  it("ustawia godziny otwarcia per dzień tygodnia, długość slotu i limit anulowania", async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    const { token } = await zarejestrujIZalogujAdministratoraStrzelnicy(app, repository);

    const res = await request(app)
      .put("/api/administratorzy-strzelnicy/grafik")
      .set("Authorization", `Bearer ${token}`)
      .send(grafikPayload({ dlugoscSlotuMinut: 30, limitAnulowaniaGodzin: 12 }));

    expect(res.status).toBe(200);
    expect(res.body.grafik).toMatchObject({
      dlugoscSlotuMinut: 30,
      limitAnulowaniaGodzin: 12,
    });
    expect(res.body.grafik.godzinyOtwarcia.poniedzialek).toEqual({ otwarte: true, od: "08:00", do: "20:00" });
  });

  it("pozwala zamknąć wybrany dzień tygodnia", async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    const { token } = await zarejestrujIZalogujAdministratoraStrzelnicy(app, repository);
    const godziny = { ...godzinyOtwarciaCalyTydzien(), niedziela: { otwarte: false } };

    const res = await request(app)
      .put("/api/administratorzy-strzelnicy/grafik")
      .set("Authorization", `Bearer ${token}`)
      .send(grafikPayload({ godzinyOtwarcia: godziny }));

    expect(res.status).toBe(200);
    expect(res.body.grafik.godzinyOtwarcia.niedziela).toEqual({ otwarte: false });
  });

  it("odrzuca grafik z brakującym dniem tygodnia", async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    const { token } = await zarejestrujIZalogujAdministratoraStrzelnicy(app, repository);
    const { niedziela: _pominiety, ...niepelneGodziny } = godzinyOtwarciaCalyTydzien();

    const res = await request(app)
      .put("/api/administratorzy-strzelnicy/grafik")
      .set("Authorization", `Bearer ${token}`)
      .send(grafikPayload({ godzinyOtwarcia: niepelneGodziny }));

    expect(res.status).toBe(400);
  });

  it("odrzuca ujemną długość slotu", async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    const { token } = await zarejestrujIZalogujAdministratoraStrzelnicy(app, repository);

    const res = await request(app)
      .put("/api/administratorzy-strzelnicy/grafik")
      .set("Authorization", `Bearer ${token}`)
      .send(grafikPayload({ dlugoscSlotuMinut: -30 }));

    expect(res.status).toBe(400);
  });

  it("odrzuca żądanie bez tokenu Administratora strzelnicy", async () => {
    const app = createApp(new InMemoryRepository());

    const res = await request(app).put("/api/administratorzy-strzelnicy/grafik").send(grafikPayload());

    expect(res.status).toBe(401);
  });
});

describe("GET /api/administratorzy-strzelnicy/grafik", () => {
  it("zwraca 404, gdy grafik nie został jeszcze ustawiony", async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    const { token } = await zarejestrujIZalogujAdministratoraStrzelnicy(app, repository);

    const res = await request(app)
      .get("/api/administratorzy-strzelnicy/grafik")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it("zwraca ostatnio ustawiony grafik", async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    const { token } = await zarejestrujIZalogujAdministratoraStrzelnicy(app, repository);
    await request(app)
      .put("/api/administratorzy-strzelnicy/grafik")
      .set("Authorization", `Bearer ${token}`)
      .send(grafikPayload({ dlugoscSlotuMinut: 45 }));

    const res = await request(app)
      .get("/api/administratorzy-strzelnicy/grafik")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.grafik).toMatchObject({ dlugoscSlotuMinut: 45 });
  });
});
