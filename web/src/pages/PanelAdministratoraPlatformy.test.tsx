import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../test/renderWithProviders";
import { PanelAdministratoraPlatformy } from "./PanelAdministratoraPlatformy";

function zalogujWLocalStorage() {
  localStorage.setItem(
    "strzelnica.sesjaAdministratoraPlatformy",
    JSON.stringify({ token: "token-platformy" }),
  );
}

describe("PanelAdministratoraPlatformy", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("wyświetla listę oczekujących Strzelnic i pozwala je zatwierdzić", async () => {
    zalogujWLocalStorage();
    const fetchMock = vi.fn().mockImplementation((url: string, options?: { method?: string }) => {
      if (url.endsWith("/strzelnice-oczekujace")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            strzelnice: [
              { id: "1", nazwa: "Orzeł", adres: "Warszawa", status: "oczekujaca" },
              { id: "2", nazwa: "Sokół", adres: "Kraków", status: "oczekujaca" },
            ],
          }),
        });
      }
      if (options?.method === "POST" && url.includes("/zatwierdzenie")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ strzelnica: { id: "1", nazwa: "Orzeł", status: "zatwierdzona" } }),
        });
      }
      throw new Error(`Nieoczekiwane wywołanie fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    renderWithProviders(<PanelAdministratoraPlatformy />, { route: "/administrator-platformy/panel" });

    expect(await screen.findByText(/Orzeł/)).toBeInTheDocument();
    expect(screen.getByText(/Sokół/)).toBeInTheDocument();

    const wpisOrla = screen.getByText(/Orzeł/).closest("li")!;
    await user.click(within(wpisOrla).getByRole("button", { name: "Zatwierdź" }));

    await waitFor(() => expect(screen.queryByText(/Orzeł/)).not.toBeInTheDocument());
    expect(screen.getByText(/Sokół/)).toBeInTheDocument();
  });

  it("blokuje dostęp bez zalogowania jako administrator platformy", async () => {
    const { WymagaAdministratoraPlatformy } = await import("../auth/WymagaAdministratoraPlatformy");
    renderWithProviders(
      <WymagaAdministratoraPlatformy>
        <PanelAdministratoraPlatformy />
      </WymagaAdministratoraPlatformy>,
    );

    expect(screen.queryByText("Strzelnice oczekujące na zatwierdzenie")).not.toBeInTheDocument();
  });
});
