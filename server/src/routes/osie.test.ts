import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { InMemoryRepository } from "../domain/repository.js";
import { osPayload, zarejestrujIZalogujAdministratoraStrzelnicy } from "../test/helpers.js";

describe("POST /api/administratorzy-strzelnicy/osie", () => {
  it("dodaje Oś z nazwą, dystansem, typami broni i ceną za slot", async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    const { token } = await zarejestrujIZalogujAdministratoraStrzelnicy(app, repository);

    const res = await request(app)
      .post("/api/administratorzy-strzelnicy/osie")
      .set("Authorization", `Bearer ${token}`)
      .send(osPayload({ nazwa: "Oś nr 1", dystansMetrow: 50, dozwoloneTypyBroni: ["pistolet", "karabinek"], cenaZaSlot: 80 }));

    expect(res.status).toBe(201);
    expect(res.body.os).toMatchObject({
      nazwa: "Oś nr 1",
      dystansMetrow: 50,
      dozwoloneTypyBroni: ["pistolet", "karabinek"],
      cenaZaSlot: 80,
    });
  });

  it("odrzuca Oś bez dozwolonych typów broni", async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    const { token } = await zarejestrujIZalogujAdministratoraStrzelnicy(app, repository);

    const res = await request(app)
      .post("/api/administratorzy-strzelnicy/osie")
      .set("Authorization", `Bearer ${token}`)
      .send(osPayload({ dozwoloneTypyBroni: [] }));

    expect(res.status).toBe(400);
  });

  it("odrzuca żądanie bez tokenu Administratora strzelnicy", async () => {
    const app = createApp(new InMemoryRepository());

    const res = await request(app).post("/api/administratorzy-strzelnicy/osie").send(osPayload());

    expect(res.status).toBe(401);
  });
});

describe("GET /api/administratorzy-strzelnicy/osie", () => {
  it("listuje wyłącznie Osie danej Strzelnicy", async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    const pierwsza = await zarejestrujIZalogujAdministratoraStrzelnicy(app, repository, {
      adminEmail: "pierwsza@strzelnica-testowa.pl",
    });
    const druga = await zarejestrujIZalogujAdministratoraStrzelnicy(app, repository, {
      adminEmail: "druga@strzelnica-testowa.pl",
    });
    await request(app)
      .post("/api/administratorzy-strzelnicy/osie")
      .set("Authorization", `Bearer ${pierwsza.token}`)
      .send(osPayload({ nazwa: "Oś A" }));
    await request(app)
      .post("/api/administratorzy-strzelnicy/osie")
      .set("Authorization", `Bearer ${druga.token}`)
      .send(osPayload({ nazwa: "Oś B" }));

    const res = await request(app)
      .get("/api/administratorzy-strzelnicy/osie")
      .set("Authorization", `Bearer ${pierwsza.token}`);

    expect(res.status).toBe(200);
    expect(res.body.osie).toHaveLength(1);
    expect(res.body.osie[0]).toMatchObject({ nazwa: "Oś A", strzelnicaId: pierwsza.strzelnicaId });
  });
});
