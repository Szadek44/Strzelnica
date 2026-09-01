import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../test/renderWithProviders";
import { GrafikOsie } from "./GrafikOsie";

function zalogujWLocalStorage() {
  localStorage.setItem(
    "strzelnica.sesjaAdministratoraStrzelnicy",
    JSON.stringify({ token: "token-strzelnicy", strzelnicaId: "strzelnica-1" }),
  );
}

function skonfigurujFetch() {
  return vi.fn().mockImplementation((url: string, options?: { method?: string; body?: string }) => {
    if (url.endsWith("/grafik") && (options?.method ?? "GET") === "GET") {
      return Promise.resolve({
        ok: false,
        status: 404,
        json: async () => ({ blad: "Grafik nie został jeszcze ustawiony" }),
      });
    }
    if (url.endsWith("/grafik") && options?.method === "PUT") {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ grafik: JSON.parse(options.body!) }),
      });
    }
    if (url.endsWith("/osie") && (options?.method ?? "GET") === "GET") {
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ osie: [] }) });
    }
    if (url.endsWith("/osie") && options?.method === "POST") {
      const dane = JSON.parse(options.body!);
      return Promise.resolve({
        ok: true,
        status: 201,
        json: async () => ({ os: { id: "os-1", strzelnicaId: "strzelnica-1", ...dane } }),
      });
    }
    throw new Error(`Nieoczekiwane wywołanie fetch: ${url} ${options?.method}`);
  });
}

describe("GrafikOsie", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("zapisuje grafik po ustawieniu godzin i długości slotu", async () => {
    zalogujWLocalStorage();
    vi.stubGlobal("fetch", skonfigurujFetch());
    const user = userEvent.setup();
    renderWithProviders(<GrafikOsie />);

    await screen.findByText("Grafik");
    await user.click(screen.getByLabelText("Poniedziałek"));
    await user.click(screen.getByRole("button", { name: "Zapisz grafik" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Grafik zapisany"));
  });

  it("dodaje Oś, która pojawia się na liście bez przeładowania strony", async () => {
    zalogujWLocalStorage();
    vi.stubGlobal("fetch", skonfigurujFetch());
    const user = userEvent.setup();
    renderWithProviders(<GrafikOsie />);

    await screen.findByText("Osie");
    await user.type(screen.getByLabelText("Nazwa/numer"), "Oś 1");
    await user.type(screen.getByLabelText("Dystans (m)"), "25");
    await user.type(screen.getByLabelText("Dozwolone typy broni (oddziel przecinkami)"), "pistolet, karabin");
    await user.type(screen.getByLabelText("Cena za slot (zł)"), "50");
    await user.click(screen.getByRole("button", { name: "Dodaj Oś" }));

    expect(await screen.findByText(/Oś 1 — 25 m — pistolet, karabin — 50 zł\/slot/)).toBeInTheDocument();
    expect(screen.getByLabelText("Nazwa/numer")).toHaveValue("");
  });
});
