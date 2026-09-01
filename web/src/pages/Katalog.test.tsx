import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../test/renderWithProviders";
import { Katalog } from "./Katalog";

describe("Katalog", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("wyświetla listę zatwierdzonych Strzelnic i pozwala ją zawęzić filtrem", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      const zawezona = url.includes("q=Krak");
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          strzelnice: zawezona
            ? [{ id: "2", nazwa: "Sokół", adres: "Kraków", status: "zatwierdzona" }]
            : [
                { id: "1", nazwa: "Orzeł", adres: "Warszawa", status: "zatwierdzona" },
                { id: "2", nazwa: "Sokół", adres: "Kraków", status: "zatwierdzona" },
              ],
        }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderWithProviders(<Katalog />);

    expect(await screen.findByText("Orzeł")).toBeInTheDocument();
    expect(screen.getByText("Sokół")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Szukaj po mieście lub nazwie"), "Krak");

    expect(await screen.findByText("Sokół")).toBeInTheDocument();
    expect(screen.queryByText("Orzeł")).not.toBeInTheDocument();
  });
});
