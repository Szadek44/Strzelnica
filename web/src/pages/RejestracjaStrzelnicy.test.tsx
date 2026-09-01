import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../test/renderWithProviders";
import { RejestracjaStrzelnicy } from "./RejestracjaStrzelnicy";

async function wypelnijFormularz(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Nazwa"), "Orzeł");
  await user.type(screen.getByLabelText("Adres"), "ul. Testowa 1, Warszawa");
  await user.type(screen.getByLabelText("NIP"), "1234567890");
  await user.type(screen.getByLabelText("Opis"), "Opis strzelnicy");
  await user.type(screen.getByLabelText("E-mail kontaktowy"), "kontakt@orzel.pl");
  await user.type(screen.getByLabelText("Telefon kontaktowy"), "123456789");
  await user.type(screen.getByLabelText("E-mail administratora (login)"), "admin@orzel.pl");
  await user.type(screen.getByLabelText("Hasło administratora"), "haslo1234");
}

describe("RejestracjaStrzelnicy", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("pokazuje potwierdzenie statusu oczekująca po udanej rejestracji", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({
          strzelnica: { id: "1", nazwa: "Orzeł", status: "oczekujaca" },
        }),
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<RejestracjaStrzelnicy />);

    await wypelnijFormularz(user);
    await user.click(screen.getByRole("button", { name: "Zarejestruj Strzelnicę" }));

    expect(await screen.findByText(/oczekująca/)).toBeInTheDocument();
  });

  it("pokazuje błąd z API bez przeładowania strony", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ blad: "Administrator z tym adresem e-mail już istnieje" }),
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<RejestracjaStrzelnicy />);

    await wypelnijFormularz(user);
    await user.click(screen.getByRole("button", { name: "Zarejestruj Strzelnicę" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Administrator z tym adresem e-mail już istnieje"),
    );
    expect(screen.getByRole("button", { name: "Zarejestruj Strzelnicę" })).toBeInTheDocument();
  });
});
