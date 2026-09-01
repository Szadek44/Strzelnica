import { randomUUID } from "node:crypto";
import type {
  AdministratorPlatformy,
  AdministratorStrzelnicy,
  Blokada,
  DaneAdministratoraPlatformy,
  DaneDodaniaOsi,
  DaneGrafiku,
  DaneRejestracjiStrzelnicy,
  DaneUtworzeniaBlokady,
  DaneUtworzeniaRezerwacji,
  Grafik,
  Os,
  Repository,
  Rezerwacja,
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
  private readonly administratorzyPlatformy = new Map<string, AdministratorPlatformy>();
  private readonly logMaili: WpisLoguMaili[] = [];
  private readonly grafiki = new Map<string, Grafik>();
  private readonly osie = new Map<string, Os>();
  private readonly rezerwacje = new Map<string, Rezerwacja>();
  private readonly blokady = new Map<string, Blokada>();

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

  async znajdzAdministratoraStrzelnicyPoStrzelnicaId(
    strzelnicaId: string,
  ): Promise<AdministratorStrzelnicy | undefined> {
    for (const administrator of this.administratorzyStrzelnicy.values()) {
      if (administrator.strzelnicaId === strzelnicaId) {
        return administrator;
      }
    }
    return undefined;
  }

  async znajdzStrzelnicePoId(id: string): Promise<Strzelnica | undefined> {
    return this.strzelnice.get(id);
  }

  async listujStrzelniceOczekujace(): Promise<Strzelnica[]> {
    return [...this.strzelnice.values()].filter((strzelnica) => strzelnica.status === "oczekujaca");
  }

  async listujStrzelniceZatwierdzone(filtrTekstowy?: string): Promise<Strzelnica[]> {
    const filtr = filtrTekstowy?.trim().toLowerCase();
    return [...this.strzelnice.values()].filter((strzelnica) => {
      if (strzelnica.status !== "zatwierdzona") {
        return false;
      }
      if (!filtr) {
        return true;
      }
      return (
        strzelnica.nazwa.toLowerCase().includes(filtr) || strzelnica.adres.toLowerCase().includes(filtr)
      );
    });
  }

  async zatwierdzStrzelnice(id: string): Promise<Strzelnica | undefined> {
    const strzelnica = this.strzelnice.get(id);
    if (!strzelnica) {
      return undefined;
    }
    const zatwierdzona: Strzelnica = { ...strzelnica, status: "zatwierdzona" };
    this.strzelnice.set(id, zatwierdzona);
    return zatwierdzona;
  }

  async utworzAdministratoraPlatformy(
    dane: DaneAdministratoraPlatformy,
  ): Promise<AdministratorPlatformy> {
    const administrator: AdministratorPlatformy = {
      id: randomUUID(),
      email: dane.email,
      hasloHash: dane.hasloHash,
    };
    this.administratorzyPlatformy.set(administrator.id, administrator);
    return administrator;
  }

  async znajdzAdministratoraPlatformyPoEmail(
    email: string,
  ): Promise<AdministratorPlatformy | undefined> {
    for (const administrator of this.administratorzyPlatformy.values()) {
      if (administrator.email.toLowerCase() === email.toLowerCase()) {
        return administrator;
      }
    }
    return undefined;
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

  async ustawGrafik(strzelnicaId: string, dane: DaneGrafiku): Promise<Grafik> {
    const grafik: Grafik = { strzelnicaId, ...dane };
    this.grafiki.set(strzelnicaId, grafik);
    return grafik;
  }

  async znajdzGrafikPoStrzelnicaId(strzelnicaId: string): Promise<Grafik | undefined> {
    return this.grafiki.get(strzelnicaId);
  }

  async dodajOs(dane: DaneDodaniaOsi): Promise<Os> {
    const os: Os = { id: randomUUID(), ...dane };
    this.osie.set(os.id, os);
    return os;
  }

  async znajdzOsPoId(id: string): Promise<Os | undefined> {
    return this.osie.get(id);
  }

  async listujOsieStrzelnicy(strzelnicaId: string): Promise<Os[]> {
    return [...this.osie.values()].filter((os) => os.strzelnicaId === strzelnicaId);
  }

  async utworzRezerwacje(dane: DaneUtworzeniaRezerwacji): Promise<Rezerwacja> {
    const rezerwacja: Rezerwacja = {
      id: randomUUID(),
      tokenAnulowania: randomUUID(),
      status: "potwierdzona",
      utworzonoAt: new Date().toISOString(),
      ...dane,
    };
    this.rezerwacje.set(rezerwacja.id, rezerwacja);
    return rezerwacja;
  }

  async listujAktywneRezerwacjeOsiWDniu(osId: string, data: string): Promise<Rezerwacja[]> {
    return [...this.rezerwacje.values()].filter(
      (rezerwacja) =>
        rezerwacja.status === "potwierdzona" &&
        rezerwacja.data === data &&
        rezerwacja.osIds.includes(osId),
    );
  }

  async znajdzRezerwacjePoTokenie(tokenAnulowania: string): Promise<Rezerwacja | undefined> {
    for (const rezerwacja of this.rezerwacje.values()) {
      if (rezerwacja.tokenAnulowania === tokenAnulowania) {
        return rezerwacja;
      }
    }
    return undefined;
  }

  async anulujRezerwacje(id: string): Promise<Rezerwacja | undefined> {
    const rezerwacja = this.rezerwacje.get(id);
    if (!rezerwacja) {
      return undefined;
    }
    const anulowana: Rezerwacja = { ...rezerwacja, status: "anulowana" };
    this.rezerwacje.set(id, anulowana);
    return anulowana;
  }

  async listujRezerwacjeStrzelnicy(strzelnicaId: string): Promise<Rezerwacja[]> {
    return [...this.rezerwacje.values()].filter((rezerwacja) => rezerwacja.strzelnicaId === strzelnicaId);
  }

  async utworzBlokade(dane: DaneUtworzeniaBlokady): Promise<Blokada> {
    const blokada: Blokada = { id: randomUUID(), ...dane };
    this.blokady.set(blokada.id, blokada);
    return blokada;
  }

  async usunBlokade(id: string, strzelnicaId: string): Promise<boolean> {
    const blokada = this.blokady.get(id);
    if (!blokada || blokada.strzelnicaId !== strzelnicaId) {
      return false;
    }
    this.blokady.delete(id);
    return true;
  }

  async listujAktywneBlokadyOsiWDniu(osId: string, data: string): Promise<Blokada[]> {
    return [...this.blokady.values()].filter((blokada) => blokada.osId === osId && blokada.data === data);
  }

  async listujBlokadyStrzelnicy(strzelnicaId: string): Promise<Blokada[]> {
    return [...this.blokady.values()].filter((blokada) => blokada.strzelnicaId === strzelnicaId);
  }
}
