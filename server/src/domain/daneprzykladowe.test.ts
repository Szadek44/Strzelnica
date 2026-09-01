import { describe, expect, it } from "vitest";
import { czyZasiewacDanePrzykladowe, zasiejDanePrzykladowe } from "./daneprzykladowe.js";
import { InMemoryRepository } from "./repository.js";
import { verifyPassword } from "../services/passwords.js";

describe("czyZasiewacDanePrzykladowe", () => {
  it("domyślnie zwraca true, gdy nie ustawiono żadnych zmiennych", () => {
    expect(czyZasiewacDanePrzykladowe({})).toBe(true);
  });

  it("zwraca false, gdy NODE_ENV=production", () => {
    expect(czyZasiewacDanePrzykladowe({ NODE_ENV: "production" })).toBe(false);
  });

  it("NODE_ENV=production jest weto nawet przy SEED_DANE_PRZYKLADOWE=true", () => {
    expect(czyZasiewacDanePrzykladowe({ NODE_ENV: "production", SEED_DANE_PRZYKLADOWE: "true" })).toBe(false);
  });

  it("pozwala wyłączyć seed poza produkcją flagą SEED_DANE_PRZYKLADOWE=false", () => {
    expect(czyZasiewacDanePrzykladowe({ NODE_ENV: "development", SEED_DANE_PRZYKLADOWE: "false" })).toBe(false);
  });

  it("zwraca true poza produkcją, gdy flaga nie jest ustawiona na false", () => {
    expect(czyZasiewacDanePrzykladowe({ NODE_ENV: "development" })).toBe(true);
    expect(czyZasiewacDanePrzykladowe({ NODE_ENV: "test" })).toBe(true);
  });
});

describe("zasiejDanePrzykladowe", () => {
  it("tworzy co najmniej dwie zatwierdzone Strzelnice, każda z Grafikiem i Osiami", async () => {
    const repository = new InMemoryRepository();

    await zasiejDanePrzykladowe(repository);

    const zatwierdzone = await repository.listujStrzelniceZatwierdzone();
    expect(zatwierdzone.length).toBeGreaterThanOrEqual(2);

    for (const strzelnica of zatwierdzone) {
      const grafik = await repository.znajdzGrafikPoStrzelnicaId(strzelnica.id);
      expect(grafik, `Strzelnica "${strzelnica.nazwa}" powinna mieć Grafik`).toBeDefined();

      const osie = await repository.listujOsieStrzelnicy(strzelnica.id);
      expect(osie.length, `Strzelnica "${strzelnica.nazwa}" powinna mieć co najmniej jedną Oś`).toBeGreaterThan(0);
    }
  });

  it("pozostawia dokładnie jedną Strzelnicę oczekującą na zatwierdzenie", async () => {
    const repository = new InMemoryRepository();

    await zasiejDanePrzykladowe(repository);

    const oczekujace = await repository.listujStrzelniceOczekujace();
    expect(oczekujace).toHaveLength(1);
  });

  it("tworzy przykładowe Rezerwacje w różnych stanach obejmujące pojedyncze i wieloosiowe/wielosegmentowe sloty", async () => {
    const repository = new InMemoryRepository();

    await zasiejDanePrzykladowe(repository);

    const zatwierdzone = await repository.listujStrzelniceZatwierdzone();
    const wszystkieRezerwacje = (
      await Promise.all(zatwierdzone.map((strzelnica) => repository.listujRezerwacjeStrzelnicy(strzelnica.id)))
    ).flat();

    expect(wszystkieRezerwacje.some((rezerwacja) => rezerwacja.status === "potwierdzona")).toBe(true);
    expect(wszystkieRezerwacje.some((rezerwacja) => rezerwacja.status === "anulowana")).toBe(true);
    expect(wszystkieRezerwacje.some((rezerwacja) => rezerwacja.liczbaSlotow > 1)).toBe(true);
    expect(wszystkieRezerwacje.some((rezerwacja) => rezerwacja.osIds.length > 1)).toBe(true);
  });

  it("tworzy co najmniej jedną Blokadę", async () => {
    const repository = new InMemoryRepository();

    await zasiejDanePrzykladowe(repository);

    const zatwierdzone = await repository.listujStrzelniceZatwierdzone();
    const wszystkieBlokady = (
      await Promise.all(zatwierdzone.map((strzelnica) => repository.listujBlokadyStrzelnicy(strzelnica.id)))
    ).flat();

    expect(wszystkieBlokady.length).toBeGreaterThan(0);
  });

  it("zwraca dane logowania Administratorów Strzelnicy, które faktycznie działają w repozytorium", async () => {
    const repository = new InMemoryRepository();

    const wynik = await zasiejDanePrzykladowe(repository);

    expect(wynik.administratorzy.length).toBeGreaterThanOrEqual(4);
    for (const daneLogowania of wynik.administratorzy) {
      const administrator = await repository.znajdzAdministratoraStrzelnicyPoEmail(daneLogowania.email);
      expect(administrator, `Administrator ${daneLogowania.email} powinien istnieć`).toBeDefined();
      await expect(verifyPassword(daneLogowania.haslo, administrator!.hasloHash)).resolves.toBe(true);
    }
  });
});
