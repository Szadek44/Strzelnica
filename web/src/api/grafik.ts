import type { Grafik, GodzinyOtwarcia } from "@strzelnica/shared";
import { ApiError, apiFetch } from "./client";

export interface UstawGrafikuDane {
  dlugoscSlotuMinut: number;
  limitAnulowaniaGodzin: number;
  godzinyOtwarcia: GodzinyOtwarcia;
}

export function ustawGrafik(dane: UstawGrafikuDane, token: string): Promise<{ grafik: Grafik }> {
  return apiFetch("/api/administratorzy-strzelnicy/grafik", { method: "PUT", body: dane, token });
}

export async function pobierzGrafik(token: string): Promise<Grafik | undefined> {
  try {
    const { grafik } = await apiFetch<{ grafik: Grafik }>("/api/administratorzy-strzelnicy/grafik", { token });
    return grafik;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return undefined;
    }
    throw error;
  }
}
