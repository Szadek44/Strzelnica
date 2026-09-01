import {
  DNI_TYGODNIA,
  type DzienTygodnia,
  type GodzinyOtwarcia,
  type GodzinyOtwarciaDnia,
  type Grafik,
} from "@strzelnica/shared";

const DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function walidujFormatDaty(data: string): boolean {
  if (!DATA_REGEX.test(data)) {
    return false;
  }
  return !Number.isNaN(new Date(`${data}T00:00:00Z`).getTime());
}

/** Godziny otwarcia identyczne każdego dnia tygodnia, od `od` do `doGodz`. */
export function calyTydzienOtwarte(od: string, doGodz: string): GodzinyOtwarcia {
  return Object.fromEntries(
    DNI_TYGODNIA.map((dzien) => [dzien, { otwarte: true, od, do: doGodz }]),
  ) as GodzinyOtwarcia;
}

/** Data (RRRR-MM-DD) `dni` dni od dziś, w UTC, żeby wynik nie zależał od strefy czasowej maszyny. */
export function dataZaDni(dni: number): string {
  const data = new Date();
  data.setUTCDate(data.getUTCDate() + dni);
  return data.toISOString().slice(0, 10);
}

export function dzienTygodniaZDaty(data: string): DzienTygodnia {
  const numerDnia = new Date(`${data}T00:00:00Z`).getUTCDay();
  // JS: niedziela = 0 ... sobota = 6; DNI_TYGODNIA zaczyna się od poniedziałku.
  return DNI_TYGODNIA[(numerDnia + 6) % 7];
}

function czasNaMinuty(czas: string): number {
  const [godziny, minuty] = czas.split(":").map(Number);
  return godziny * 60 + minuty;
}

function minutyNaCzas(minuty: number): string {
  const godziny = Math.floor(minuty / 60)
    .toString()
    .padStart(2, "0");
  const reszta = (minuty % 60).toString().padStart(2, "0");
  return `${godziny}:${reszta}`;
}

/** Wszystkie sloty startowe mieszczące się w całości w godzinach otwarcia danego dnia. */
export function wygenerujSlotyDnia(
  godzinyDnia: GodzinyOtwarciaDnia,
  dlugoscSlotuMinut: number,
): string[] {
  if (!godzinyDnia.otwarte) {
    return [];
  }
  const start = czasNaMinuty(godzinyDnia.od);
  const koniec = czasNaMinuty(godzinyDnia.do);
  const sloty: string[] = [];
  for (let poczatek = start; poczatek + dlugoscSlotuMinut <= koniec; poczatek += dlugoscSlotuMinut) {
    sloty.push(minutyNaCzas(poczatek));
  }
  return sloty;
}

/** Kolejne sloty startowe zajmowane przez rezerwację długości `liczbaSlotow` zaczynającą się o `slotOd`. */
export function slotyRezerwacji(slotOd: string, liczbaSlotow: number, dlugoscSlotuMinut: number): string[] {
  const start = czasNaMinuty(slotOd);
  return Array.from({ length: liczbaSlotow }, (_, i) => minutyNaCzas(start + i * dlugoscSlotuMinut));
}

/** Czy żądany blok slotów mieści się w całości w dostępnych slotach dnia (ciągłość + brak wyjścia poza grafik). */
export function czyBlokMiesciSieWSlotach(blok: string[], sloty: string[]): boolean {
  const dostepne = new Set(sloty);
  return blok.every((slot) => dostepne.has(slot));
}

export interface PotrzebneSloty {
  liczbaSlotow: number;
  sloty: string[];
}

/**
 * Waliduje, że `czasTrwaniaMinut` jest wielokrotnością długości slotu Strzelnicy
 * (wspólny wymóg rezerwacji z #7 i blokad z #9), i wylicza sloty startowe, jakie
 * zajmuje żądanie długości `czasTrwaniaMinut` zaczynające się o `slotOd`.
 */
export function obliczPotrzebneSloty(
  grafik: Grafik,
  slotOd: string,
  czasTrwaniaMinut: number,
): PotrzebneSloty | { blad: string } {
  if (czasTrwaniaMinut % grafik.dlugoscSlotuMinut !== 0) {
    return { blad: `Czas trwania musi być wielokrotnością długości slotu (${grafik.dlugoscSlotuMinut} min)` };
  }
  const liczbaSlotow = czasTrwaniaMinut / grafik.dlugoscSlotuMinut;
  return { liczbaSlotow, sloty: slotyRezerwacji(slotOd, liczbaSlotow, grafik.dlugoscSlotuMinut) };
}
