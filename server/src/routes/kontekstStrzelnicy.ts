import type { Grafik, Os, Repository, Strzelnica } from "@strzelnica/shared";

export type Blad = { blad: string; status: number };

export function czyBlad<T>(kontekst: T | Blad): kontekst is Blad {
  return typeof kontekst === "object" && kontekst !== null && "blad" in kontekst;
}

export async function zaladujStrzelnicaIGrafik(
  repository: Repository,
  strzelnicaId: string,
): Promise<{ strzelnica: Strzelnica; grafik: Grafik } | Blad> {
  const strzelnica = await repository.znajdzStrzelnicePoId(strzelnicaId);
  if (!strzelnica || strzelnica.status !== "zatwierdzona") {
    return { status: 404, blad: "Nie znaleziono Strzelnicy" };
  }
  const grafik = await repository.znajdzGrafikPoStrzelnicaId(strzelnicaId);
  if (!grafik) {
    return { status: 404, blad: "Grafik nie został jeszcze ustawiony dla tej Strzelnicy" };
  }
  return { strzelnica, grafik };
}

export async function zaladujOs(repository: Repository, strzelnicaId: string, osId: string): Promise<Os | Blad> {
  const os = await repository.znajdzOsPoId(osId);
  if (!os || os.strzelnicaId !== strzelnicaId) {
    return { status: 404, blad: "Nie znaleziono Osi" };
  }
  return os;
}

export async function zaladujOsie(
  repository: Repository,
  strzelnicaId: string,
  osIds: string[],
): Promise<Os[] | Blad> {
  const osie: Os[] = [];
  for (const osId of osIds) {
    const os = await zaladujOs(repository, strzelnicaId, osId);
    if (czyBlad(os)) {
      return os;
    }
    osie.push(os);
  }
  return osie;
}
