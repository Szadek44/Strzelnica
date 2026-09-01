import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../test/renderWithProviders";
import { LogowanieAdministratoraStrzelnicy } from "./LogowanieAdministratoraStrzelnicy";

describe("LogowanieAdministratoraStrzelnicy", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("zapisuje token sesji i przekierowuje do panelu po udanym logowaniu", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ token: "token-123", strzelnicaId: "strzelnica-1" }),
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<LogowanieAdministratoraStrzelnicy />, {
      route: "/administrator-strzelnicy/logowanie",
    });

    await user.type(screen.getByLabelText("E-mail"), "admin@orzel.pl");
    await user.type(screen.getByLabelText("Hasło"), "haslo1234");
    await user.click(screen.getByRole("button", { name: "Zaloguj się" }));

    await waitFor(() =>
      expect(localStorage.getItem("strzelnica.sesjaAdministratoraStrzelnicy")).toContain("token-123"),
    );
  });

  it("pokazuje czytelny błąd przy nieprawidłowych danych logowania", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ blad: "Nieprawidłowy e-mail lub hasło" }),
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<LogowanieAdministratoraStrzelnicy />, {
      route: "/administrator-strzelnicy/logowanie",
    });

    await user.type(screen.getByLabelText("E-mail"), "admin@orzel.pl");
    await user.type(screen.getByLabelText("Hasło"), "zla-haslo");
    await user.click(screen.getByRole("button", { name: "Zaloguj się" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Nieprawidłowy e-mail lub hasło"));
  });
});
