import type { AdministratorStrzelnicy, Strzelnica, WpisLoguMaili } from "./types.js";

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

export interface Repository {
  utworzStrzelnice(
    dane: DaneRejestracjiStrzelnicy,
  ): Promise<{ strzelnica: Strzelnica; administrator: AdministratorStrzelnicy }>;

  znajdzAdministratoraStrzelnicyPoEmail(
    email: string,
  ): Promise<AdministratorStrzelnicy | undefined>;

  znajdzStrzelnicePoId(id: string): Promise<Strzelnica | undefined>;

  dodajWpisLoguMaili(
    wpis: Omit<WpisLoguMaili, "id" | "wyslanoAt">,
  ): Promise<WpisLoguMaili>;

  listujLogMaili(): Promise<WpisLoguMaili[]>;
}
