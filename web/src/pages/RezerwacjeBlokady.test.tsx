import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../test/renderWithProviders";
import { RezerwacjeBlokady } from "./RezerwacjeBlokady";

function zalogujWLocalStorage() {
  localStorage.setItem(
    "strzelnica.sesjaAdministratoraStrzelnicy",
    JSON.stringify({ token: "token-strzelnicy", strzelnicaId: "strzelnica-1" }),
  );
}

const OS_JEDEN = {
  id: "os-1",
  strzelnicaId: "strzelnica-1",
  nazwa: "Oś 1",
  dystansMetrow: 25,
  dozwoloneTypyBroni: ["pistolet"],
  cenaZaSlot: 50,
};

function skonfigurujFetch({
  rezerwacje = [],
  blokady = [],
  odrzucKolizja = false,
}: {
  rezerwacje?: unknown[];
  blokady?: unknown[];
  odrzucKolizja?: boolean;
} = {}) {
  let blokadyStan = [...blokady];
  return vi.fn().mockImplementation((url: string, options?: { method?: string; body?: string }) => {
    const metoda = options?.method ?? "GET";
    if (url.endsWith("/rezerwacje") && metoda === "GET") {
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ rezerwacje }) });
    }
    if (url.endsWith("/osie") && metoda === "GET") {
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ osie: [OS_JEDEN] }) });
    }
    if (url.endsWith("/blokady") && metoda === "GET") {
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ blokady: blokadyStan }) });
    }
    if (url.endsWith("/blokady") && metoda === "POST") {
      if (odrzucKolizja) {
        return Promise.resolve({
          ok: false,
          status: 400,
          json: async () => ({ blad: "Wybrany przedział czasu koliduje z potwierdzoną Rezerwacją" }),
        });
      }
      const dane = JSON.parse(options!.body!);
      const blokada = { id: "blokada-1", strzelnicaId: "strzelnica-1", liczbaSlotow: 1, ...dane };
      blokadyStan = [...blokadyStan, blokada];
      return Promise.resolve({ ok: true, status: 201, json: async () => ({ blokada }) });
    }
    if (url.includes("/blokady/") && metoda === "DELETE") {
      const id = url.split("/blokady/")[1];
      blokadyStan = blokadyStan.filter((b) => (b as { id: string }).id !== id);
      return Promise.resolve({ ok: true, status: 204, json: async () => undefined });
    }
    throw new Error(`Nieoczekiwane wywołanie fetch: ${url} ${metoda}`);
  });
}

describe("RezerwacjeBlokady", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("pokazuje listę Rezerwacji Strzelnicy", async () => {
    zalogujWLocalStorage();
    vi.stubGlobal(
      "fetch",
      skonfigurujFetch({
        rezerwacje: [
          {
            id: "rezerwacja-1",
            strzelnicaId: "strzelnica-1",
            osIds: ["os-1"],
            data: "2026-09-10",
            slotOd: "10:00",
            liczbaSlotow: 1,
            cenaCalkowita: 50,
            klientImie: "Jan Kowalski",
            klientTelefon: "123456789",
            klientEmail: "jan@przyklad.pl",
            tokenAnulowania: "token-1",
            status: "potwierdzona",
            utworzonoAt: "2026-09-01T00:00:00.000Z",
          },
        ],
      }),
    );
    renderWithProviders(<RezerwacjeBlokady />);

    expect(await screen.findByText(/Oś 1 — Jan Kowalski/)).toBeInTheDocument();
  });

  it("tworzy Blokadę, która pojawia się na liście bez przeładowania strony", async () => {
    zalogujWLocalStorage();
    vi.stubGlobal("fetch", skonfigurujFetch());
    const user = userEvent.setup();
    renderWithProviders(<RezerwacjeBlokady />);

    await screen.findByRole("option", { name: "Oś 1" });
    await user.selectOptions(screen.getByLabelText("Oś"), "os-1");
    await user.type(screen.getByLabelText("Data"), "2026-09-10");
    await user.type(screen.getByLabelText("Od godziny"), "10:00");
    await user.clear(screen.getByLabelText("Czas trwania (minuty)"));
    await user.type(screen.getByLabelText("Czas trwania (minuty)"), "60");
    await user.type(screen.getByLabelText("Powód (opcjonalnie)"), "Konserwacja");
    await user.click(screen.getByRole("button", { name: "Utwórz Blokadę" }));

    expect(await screen.findByText(/2026-09-10 10:00 — Oś 1 — Konserwacja/)).toBeInTheDocument();
  });

  it("pokazuje czytelny komunikat, gdy Blokada koliduje z potwierdzoną Rezerwacją", async () => {
    zalogujWLocalStorage();
    vi.stubGlobal("fetch", skonfigurujFetch({ odrzucKolizja: true }));
    const user = userEvent.setup();
    renderWithProviders(<RezerwacjeBlokady />);

    await screen.findByRole("option", { name: "Oś 1" });
    await user.selectOptions(screen.getByLabelText("Oś"), "os-1");
    await user.type(screen.getByLabelText("Data"), "2026-09-10");
    await user.type(screen.getByLabelText("Od godziny"), "10:00");
    await user.click(screen.getByRole("button", { name: "Utwórz Blokadę" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/koliduje z potwierdzoną Rezerwacją/);
  });

  it("usuwa Blokadę z listy", async () => {
    zalogujWLocalStorage();
    vi.stubGlobal(
      "fetch",
      skonfigurujFetch({
        blokady: [{ id: "blokada-1", strzelnicaId: "strzelnica-1", osId: "os-1", data: "2026-09-10", slotOd: "10:00", liczbaSlotow: 1 }],
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<RezerwacjeBlokady />);

    const wpis = await screen.findByText(/2026-09-10 10:00 — Oś 1/);
    await user.click(within(wpis.closest("li")!).getByRole("button", { name: "Usuń" }));

    await waitFor(() => expect(screen.queryByText(/2026-09-10 10:00 — Oś 1/)).not.toBeInTheDocument());
  });
});
