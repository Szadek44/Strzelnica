import { randomUUID } from "node:crypto";
import type {
  AdministratorStrzelnicy,
  DaneRejestracjiStrzelnicy,
  Repository,
  Strzelnica,
  WpisLoguMaili,
} from "@strzelnica/shared";

/**
 * Jedyna obecna implementacja `Repository` (ADR-0001): stan trzymany w
 * pamięci procesu, tracony przy restarcie serwera.
 */
export class InMemoryRepository implements Repository {
  private readonly strzelnice = new Map<string, Strzelnica>();
  private readonly administratorzyStrzelnicy = new Map<string, AdministratorStrzelnicy>();
  private readonly logMaili: WpisLoguMaili[] = [];

  async utworzStrzelnice(
    dane: DaneRejestracjiStrzelnicy,
  ): Promise<{ strzelnica: Strzelnica; administrator: AdministratorStrzelnicy }> {
    const strzelnica: Strzelnica = {
      id: randomUUID(),
      status: "oczekujaca",
      nazwa: dane.nazwa,
      adres: dane.adres,
      nip: dane.nip,
      opis: dane.opis,
      kontaktEmail: dane.kontaktEmail,
      kontaktTelefon: dane.kontaktTelefon,
    };
    this.strzelnice.set(strzelnica.id, strzelnica);

    const administrator: AdministratorStrzelnicy = {
      id: randomUUID(),
      strzelnicaId: strzelnica.id,
      email: dane.adminEmail,
      hasloHash: dane.adminHasloHash,
    };
    this.administratorzyStrzelnicy.set(administrator.id, administrator);

    return { strzelnica, administrator };
  }

  async znajdzAdministratoraStrzelnicyPoEmail(
    email: string,
  ): Promise<AdministratorStrzelnicy | undefined> {
    for (const administrator of this.administratorzyStrzelnicy.values()) {
      if (administrator.email.toLowerCase() === email.toLowerCase()) {
        return administrator;
      }
    }
    return undefined;
  }

  async znajdzStrzelnicePoId(id: string): Promise<Strzelnica | undefined> {
    return this.strzelnice.get(id);
  }

  async dodajWpisLoguMaili(
    wpis: Omit<WpisLoguMaili, "id" | "wyslanoAt">,
  ): Promise<WpisLoguMaili> {
    const zapisanyWpis: WpisLoguMaili = {
      id: randomUUID(),
      wyslanoAt: new Date().toISOString(),
      ...wpis,
    };
    this.logMaili.push(zapisanyWpis);
    return zapisanyWpis;
  }

  async listujLogMaili(): Promise<WpisLoguMaili[]> {
    return [...this.logMaili];
  }
}
