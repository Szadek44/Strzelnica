import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../test/renderWithProviders";
import { ProfilStrzelnicy } from "./ProfilStrzelnicy";

describe("ProfilStrzelnicy", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("pokazuje opis, adres, kontakt i listę Osi pod bezpośrednim URL", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          strzelnica: {
            id: "1",
            nazwa: "Orzeł",
            adres: "ul. Testowa 1, Warszawa",
            opis: "Nowoczesna strzelnica krytа",
            kontaktEmail: "kontakt@orzel.pl",
            kontaktTelefon: "123456789",
            status: "zatwierdzona",
          },
          osie: [
            { id: "os-1", strzelnicaId: "1", nazwa: "Oś 1", dystansMetrow: 25, dozwoloneTypyBroni: ["pistolet"], cenaZaSlot: 50 },
          ],
        }),
      }),
    );

    renderWithProviders(<ProfilStrzelnicy />, { route: "/strzelnice/1", path: "/strzelnice/:id" });

    expect(await screen.findByRole("heading", { name: "Orzeł" })).toBeInTheDocument();
    expect(screen.getByText(/ul. Testowa 1, Warszawa/)).toBeInTheDocument();
    expect(screen.getByText(/kontakt@orzel.pl/)).toBeInTheDocument();
    expect(screen.getByText(/Oś 1 — 25 m — pistolet — 50 zł\/slot/)).toBeInTheDocument();
  });

  it("pokazuje czytelny komunikat, gdy Strzelnica nie istnieje lub nie jest zatwierdzona", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ blad: "Nie znaleziono Profilu Strzelnicy" }),
      }),
    );

    renderWithProviders(<ProfilStrzelnicy />, { route: "/strzelnice/brak", path: "/strzelnice/:id" });

    expect(await screen.findByRole("alert")).toHaveTextContent("Nie znaleziono Profilu Strzelnicy");
  });
});
