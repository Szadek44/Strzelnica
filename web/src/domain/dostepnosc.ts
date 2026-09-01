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

/** Kolejne sloty startowe zajmowane przez blok długości `liczbaSlotow` zaczynający się o `slotOd`. */
export function slotyBloku(slotOd: string, liczbaSlotow: number, dlugoscSlotuMinut: number): string[] {
  const start = czasNaMinuty(slotOd);
  return Array.from({ length: liczbaSlotow }, (_, i) => minutyNaCzas(start + i * dlugoscSlotuMinut));
}

/** Część wspólna list wolnych slotów startowych kilku Osi (wymagana do rezerwacji tego samego przedziału na wszystkich naraz). */
export function czescWspolnaSlotow(listy: string[][]): string[] {
  if (listy.length === 0) {
    return [];
  }
  const [pierwsza, ...pozostale] = listy;
  return pierwsza.filter((slot) => pozostale.every((lista) => lista.includes(slot)));
}

/** Czy cały blok slotów wymaganych przez sesję jest wolny na każdej z wybranych Osi. */
export function czyBlokWolnyDlaWszystkich(
  wymaganeSloty: string[],
  wybraneOsIds: string[],
  dostepnoscPerOs: Record<string, string[] | undefined>,
): boolean {
  return wybraneOsIds.every((osId) => {
    const wolne = dostepnoscPerOs[osId] ?? [];
    return wymaganeSloty.every((slot) => wolne.includes(slot));
  });
}
