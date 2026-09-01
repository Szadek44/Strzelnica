import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../test/renderWithProviders";
import { LogowanieAdministratoraPlatformy } from "./LogowanieAdministratoraPlatformy";

describe("LogowanieAdministratoraPlatformy", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("zapisuje token sesji administratora platformy po udanym logowaniu", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ token: "token-platformy" }),
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<LogowanieAdministratoraPlatformy />, {
      route: "/administrator-platformy/logowanie",
    });

    await user.type(screen.getByLabelText("E-mail"), "admin@platforma.pl");
    await user.type(screen.getByLabelText("Hasło"), "admin1234");
    await user.click(screen.getByRole("button", { name: "Zaloguj się" }));

    await waitFor(() =>
      expect(localStorage.getItem("strzelnica.sesjaAdministratoraPlatformy")).toContain("token-platformy"),
    );
    expect(localStorage.getItem("strzelnica.sesjaAdministratoraStrzelnicy")).toBeNull();
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
    renderWithProviders(<LogowanieAdministratoraPlatformy />, {
      route: "/administrator-platformy/logowanie",
    });

    await user.type(screen.getByLabelText("E-mail"), "admin@platforma.pl");
    await user.type(screen.getByLabelText("Hasło"), "zle-haslo");
    await user.click(screen.getByRole("button", { name: "Zaloguj się" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Nieprawidłowy e-mail lub hasło"));
  });
});
