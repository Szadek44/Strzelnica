export type StatusStrzelnicy = "oczekujaca" | "zatwierdzona";

export interface Strzelnica {
  id: string;
  nazwa: string;
  adres: string;
  nip: string;
  opis: string;
  kontaktEmail: string;
  kontaktTelefon: string;
  status: StatusStrzelnicy;
}

export interface AdministratorStrzelnicy {
  id: string;
  strzelnicaId: string;
  email: string;
  hasloHash: string;
}

export interface AdministratorPlatformy {
  id: string;
  email: string;
  hasloHash: string;
}

export interface WpisLoguMaili {
  id: string;
  do: string;
  temat: string;
  tresc: string;
  wyslanoAt: string;
}

export const DNI_TYGODNIA = [
  "poniedzialek",
  "wtorek",
  "sroda",
  "czwartek",
  "piatek",
  "sobota",
  "niedziela",
] as const;

export type DzienTygodnia = (typeof DNI_TYGODNIA)[number];

export type GodzinyOtwarciaDnia =
  | { otwarte: false }
  | { otwarte: true; od: string; do: string };

export type GodzinyOtwarcia = Record<DzienTygodnia, GodzinyOtwarciaDnia>;

export interface Grafik {
  strzelnicaId: string;
  dlugoscSlotuMinut: number;
  limitAnulowaniaGodzin: number;
  godzinyOtwarcia: GodzinyOtwarcia;
}

export interface Os {
  id: string;
  strzelnicaId: string;
  nazwa: string;
  dystansMetrow: number;
  dozwoloneTypyBroni: string[];
  cenaZaSlot: number;
}

export type StatusRezerwacji = "potwierdzona" | "anulowana";

export interface Rezerwacja {
  id: string;
  strzelnicaId: string;
  osIds: string[];
  data: string;
  slotOd: string;
  liczbaSlotow: number;
  cenaCalkowita: number;
  klientImie: string;
  klientTelefon: string;
  klientEmail: string;
  tokenAnulowania: string;
  status: StatusRezerwacji;
  utworzonoAt: string;
}

export interface Blokada {
  id: string;
  strzelnicaId: string;
  osId: string;
  data: string;
  slotOd: string;
  liczbaSlotow: number;
  powod?: string;
}
