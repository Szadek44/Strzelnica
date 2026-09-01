import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../test/renderWithProviders";
import { AnulowanieRezerwacji } from "./AnulowanieRezerwacji";

const REZERWACJA = {
  id: "r1",
  strzelnicaId: "strzelnica-1",
  osIds: ["os-1"],
  data: "2026-10-01",
  slotOd: "10:00",
  liczbaSlotow: 1,
  cenaCalkowita: 50,
  klientImie: "Jan Kowalski",
  klientTelefon: "600100200",
  klientEmail: "jan@example.com",
  tokenAnulowania: "token-abc",
  status: "potwierdzona",
  utworzonoAt: "2026-09-01T10:00:00.000Z",
};

function renderNaTrasie(token = "token-abc") {
  return renderWithProviders(<AnulowanieRezerwacji />, {
    route: `/rezerwacje/anulowanie/${token}`,
    path: "/rezerwacje/anulowanie/:token",
  });
}

describe("AnulowanieRezerwacji", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("pokazuje szczegóły Rezerwacji i pozwala ją anulować, bez logowania", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, options?: { method?: string }) => {
      if ((options?.method ?? "GET") === "GET") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ rezerwacja: REZERWACJA, strzelnicaNazwa: "Sokół Sport" }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ rezerwacja: { ...REZERWACJA, status: "anulowana" } }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    renderNaTrasie();

    expect(await screen.findByText("Strzelnica: Sokół Sport")).toBeInTheDocument();
    expect(screen.getByText(/2026-10-01 od 10:00/)).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Anuluj rezerwację" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Rezerwacja została anulowana");
    expect(screen.queryByRole("button", { name: "Anuluj rezerwację" })).not.toBeInTheDocument();
  });

  it("pokazuje czytelny błąd, gdy anulowanie jest odrzucone po przekroczeniu limitu czasowego", async () => {
    const fetchMock = vi.fn().mockImplementation((_url: string, options?: { method?: string }) => {
      if ((options?.method ?? "GET") === "GET") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ rezerwacja: REZERWACJA }) });
      }
      return Promise.resolve({
        ok: false,
        status: 400,
        json: async () => ({ blad: "Anulowanie jest możliwe najpóźniej 24h przed terminem rezerwacji" }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderNaTrasie();

    await screen.findByRole("button", { name: "Anuluj rezerwację" });
    await user.click(screen.getByRole("button", { name: "Anuluj rezerwację" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("najpóźniej 24h przed terminem");
    expect(screen.getByRole("button", { name: "Anuluj rezerwację" })).toBeInTheDocument();
  });

  it("pokazuje czytelny komunikat zamiast białego ekranu dla nieprawidłowego lub już użytego tokenu", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ blad: "Nie znaleziono Rezerwacji dla podanego tokenu" }),
      }),
    );
    renderNaTrasie("zly-token");

    expect(await screen.findByRole("alert")).toHaveTextContent("Nie znaleziono Rezerwacji dla podanego tokenu");
  });

  it("pokazuje informację, gdy rezerwacja pod tym linkiem jest już anulowana", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ rezerwacja: { ...REZERWACJA, status: "anulowana" } }),
      }),
    );
    renderNaTrasie();

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Ta rezerwacja została już anulowana."),
    );
    expect(screen.queryByRole("button", { name: "Anuluj rezerwację" })).not.toBeInTheDocument();
  });
});
