import type {
  AdministratorPlatformy,
  AdministratorStrzelnicy,
  Grafik,
  GodzinyOtwarcia,
  Os,
  Rezerwacja,
  Strzelnica,
  WpisLoguMaili,
} from "./types.js";

export interface DaneRejestracjiStrzelnicy {
  nazwa: string;
  adres: string;
  nip: string;
  opis: string;
  kontaktEmail: string;
  kontaktTelefon: string;
  adminEmail: string;
  adminHasloHash: string;
}

export interface DaneAdministratoraPlatformy {
  email: string;
  hasloHash: string;
}

export interface DaneGrafiku {
  dlugoscSlotuMinut: number;
  limitAnulowaniaGodzin: number;
  godzinyOtwarcia: GodzinyOtwarcia;
}

export interface DaneDodaniaOsi {
  strzelnicaId: string;
  nazwa: string;
  dystansMetrow: number;
  dozwoloneTypyBroni: string[];
  cenaZaSlot: number;
}

export interface DaneUtworzeniaRezerwacji {
  strzelnicaId: string;
  osIds: string[];
  data: string;
  slotOd: string;
  liczbaSlotow: number;
  cenaCalkowita: number;
  klientImie: string;
  klientTelefon: string;
  klientEmail: string;
}

export interface Repository {
  utworzStrzelnice(
    dane: DaneRejestracjiStrzelnicy,
  ): Promise<{ strzelnica: Strzelnica; administrator: AdministratorStrzelnicy }>;

  znajdzAdministratoraStrzelnicyPoEmail(
    email: string,
  ): Promise<AdministratorStrzelnicy | undefined>;

  znajdzAdministratoraStrzelnicyPoStrzelnicaId(
    strzelnicaId: string,
  ): Promise<AdministratorStrzelnicy | undefined>;

  znajdzStrzelnicePoId(id: string): Promise<Strzelnica | undefined>;

  listujStrzelniceOczekujace(): Promise<Strzelnica[]>;

  listujStrzelniceZatwierdzone(filtrTekstowy?: string): Promise<Strzelnica[]>;

  zatwierdzStrzelnice(id: string): Promise<Strzelnica | undefined>;

  utworzAdministratoraPlatformy(
    dane: DaneAdministratoraPlatformy,
  ): Promise<AdministratorPlatformy>;

  znajdzAdministratoraPlatformyPoEmail(
    email: string,
  ): Promise<AdministratorPlatformy | undefined>;

  dodajWpisLoguMaili(
    wpis: Omit<WpisLoguMaili, "id" | "wyslanoAt">,
  ): Promise<WpisLoguMaili>;

  listujLogMaili(): Promise<WpisLoguMaili[]>;

  ustawGrafik(strzelnicaId: string, dane: DaneGrafiku): Promise<Grafik>;

  znajdzGrafikPoStrzelnicaId(strzelnicaId: string): Promise<Grafik | undefined>;

  dodajOs(dane: DaneDodaniaOsi): Promise<Os>;

  znajdzOsPoId(id: string): Promise<Os | undefined>;

  listujOsieStrzelnicy(strzelnicaId: string): Promise<Os[]>;

  utworzRezerwacje(dane: DaneUtworzeniaRezerwacji): Promise<Rezerwacja>;

  listujAktywneRezerwacjeOsiWDniu(osId: string, data: string): Promise<Rezerwacja[]>;
}
