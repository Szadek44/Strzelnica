import { DNI_TYGODNIA, type DzienTygodnia, type GodzinyOtwarciaDnia } from "@strzelnica/shared";

const DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function walidujFormatDaty(data: string): boolean {
  if (!DATA_REGEX.test(data)) {
    return false;
  }
  return !Number.isNaN(new Date(`${data}T00:00:00Z`).getTime());
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
