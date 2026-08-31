import type {
  AdministratorPlatformy,
  AdministratorStrzelnicy,
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
}
