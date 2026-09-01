import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../test/renderWithProviders";
import { RezerwacjaSekcja } from "./RezerwacjaSekcja";

const GRAFIK = {
  strzelnicaId: "strzelnica-1",
  dlugoscSlotuMinut: 30,
  limitAnulowaniaGodzin: 24,
  godzinyOtwarcia: {} as never,
};

const OS_1 = { id: "os-1", strzelnicaId: "strzelnica-1", nazwa: "Oś 1", dystansMetrow: 25, dozwoloneTypyBroni: ["pistolet"], cenaZaSlot: 50 };
const OS_2 = { id: "os-2", strzelnicaId: "strzelnica-1", nazwa: "Oś 2", dystansMetrow: 50, dozwoloneTypyBroni: ["karabin"], cenaZaSlot: 80 };

function skonfigurujFetch(dostepnoscPerOs: Record<string, string[]>, obslugaPost: (body: unknown) => unknown) {
  return vi.fn().mockImplementation((url: string, options?: { method?: string; body?: string }) => {
    if (url.includes("/dostepnosc")) {
      const osId = url.match(/osie\/([^/]+)\/dostepnosc/)?.[1] ?? "";
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ sloty: dostepnoscPerOs[osId] ?? [] }) });
    }
    if (url.endsWith("/rezerwacje") && options?.method === "POST") {
      const wynik = obslugaPost(JSON.parse(options.body!));
      if (wynik && typeof wynik === "object" && "blad" in wynik) {
        return Promise.resolve({ ok: false, status: 400, json: async () => wynik });
      }
      return Promise.resolve({ ok: true, status: 201, json: async () => wynik });
    }
    throw new Error(`Nieoczekiwane wywołanie fetch: ${url} ${options?.method}`);
  });
}

async function wypelnijKontakt(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Imię i nazwisko"), "Jan Kowalski");
  await user.type(screen.getByLabelText("Telefon"), "600100200");
  await user.type(screen.getByLabelText("E-mail"), "jan@example.com");
}

describe("RezerwacjaSekcja", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("rezerwuje pojedynczy wolny slot na jednej Osi", async () => {
    const fetchMock = skonfigurujFetch({ "os-1": ["10:00", "10:30", "11:00"] }, (body) => ({
      rezerwacja: { id: "r1", cenaCalkowita: (body as { osIds: string[] }).osIds.length * 50 },
    }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderWithProviders(<RezerwacjaSekcja strzelnicaId="strzelnica-1" osie={[OS_1]} grafik={GRAFIK} />);

    await user.click(await screen.findByRole("checkbox", { name: /Oś 1/ }));
    expect(await screen.findByRole("option", { name: "10:00" })).toBeInTheDocument();
    await wypelnijKontakt(user);
    await user.click(screen.getByRole("button", { name: "Zarezerwuj" }));

    expect(await screen.findByRole("status")).toHaveTextContent("50 zł");
    const wywolaniePost = fetchMock.mock.calls.find(([url]: any[]) => (url as string).endsWith("/rezerwacje"));
    expect(JSON.parse(wywolaniePost![1].body!)).toMatchObject({ osIds: ["os-1"], slotOd: "10:00", czasTrwaniaMinut: 30 });
  });

  it("rezerwuje kilka kolejnych slotów (sesja wielosegmentowa) na jednej Osi", async () => {
    const fetchMock = skonfigurujFetch({ "os-1": ["10:00", "10:30", "11:00"] }, (body) => ({
      rezerwacja: { id: "r1", cenaCalkowita: 100 },
    }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderWithProviders(<RezerwacjaSekcja strzelnicaId="strzelnica-1" osie={[OS_1]} grafik={GRAFIK} />);

    await user.click(await screen.findByRole("checkbox", { name: /Oś 1/ }));
    await screen.findByRole("option", { name: "10:00" });
    const liczbaSlotow = screen.getByLabelText(/Liczba kolejnych slotów/);
    await user.clear(liczbaSlotow);
    await user.type(liczbaSlotow, "2");
    expect(screen.getByText("Łączna cena: 100 zł")).toBeInTheDocument();

    await wypelnijKontakt(user);
    await user.click(screen.getByRole("button", { name: "Zarezerwuj" }));

    const wywolaniePost = fetchMock.mock.calls.find(([url]: any[]) => (url as string).endsWith("/rezerwacje"));
    expect(JSON.parse(wywolaniePost![1].body!)).toMatchObject({ czasTrwaniaMinut: 60 });
  });

  it("rezerwuje kilka Osi naraz w tym samym przedziale czasu i sumuje cenę", async () => {
    const fetchMock = skonfigurujFetch(
      { "os-1": ["10:00", "10:30"], "os-2": ["10:00", "10:30", "11:00"] },
      () => ({ rezerwacja: { id: "r1", cenaCalkowita: 130 } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderWithProviders(<RezerwacjaSekcja strzelnicaId="strzelnica-1" osie={[OS_1, OS_2]} grafik={GRAFIK} />);

    await user.click(await screen.findByRole("checkbox", { name: /Oś 1/ }));
    await user.click(screen.getByRole("checkbox", { name: /Oś 2/ }));

    expect(screen.getByText("Łączna cena: 130 zł")).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "11:00" })).not.toBeInTheDocument();

    await wypelnijKontakt(user);
    await user.click(screen.getByRole("button", { name: "Zarezerwuj" }));

    const wywolaniePost = fetchMock.mock.calls.find(([url]: any[]) => (url as string).endsWith("/rezerwacje"));
    expect(JSON.parse(wywolaniePost![1].body!)).toMatchObject({ osIds: ["os-1", "os-2"], slotOd: "10:00" });
  });

  it("pokazuje czytelny błąd konfliktu i odświeża dostępność, gdy slot przestał być wolny", async () => {
    let pierwszeZapytanie = true;
    const fetchMock = vi.fn().mockImplementation((url: string, options?: { method?: string; body?: string }) => {
      if (url.includes("/dostepnosc")) {
        const sloty = pierwszeZapytanie ? ["10:00", "10:30"] : ["10:30"];
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ sloty }) });
      }
      if (url.endsWith("/rezerwacje") && options?.method === "POST") {
        pierwszeZapytanie = false;
        return Promise.resolve({
          ok: false,
          status: 400,
          json: async () => ({ blad: "Wybrany przedział czasu jest niedostępny na Osi \"Oś 1\"" }),
        });
      }
      throw new Error(`Nieoczekiwane wywołanie fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderWithProviders(<RezerwacjaSekcja strzelnicaId="strzelnica-1" osie={[OS_1]} grafik={GRAFIK} />);

    await user.click(await screen.findByRole("checkbox", { name: /Oś 1/ }));
    await screen.findByRole("option", { name: "10:00" });
    await wypelnijKontakt(user);
    await user.click(screen.getByRole("button", { name: "Zarezerwuj" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("niedostępny");
    await waitFor(() => expect(screen.queryByRole("option", { name: "10:00" })).not.toBeInTheDocument());
  });
});
