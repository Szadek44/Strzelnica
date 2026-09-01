import type { Repository } from "@strzelnica/shared";
import { calyTydzienOtwarte, dataZaDni } from "./dostepnosc.js";
import { hashPassword } from "../services/passwords.js";

/**
 * NODE_ENV=production jest twardym weto — seed nie może wystartować na
 * produkcji nawet przy błędnie ustawionej fladze SEED_DANE_PRZYKLADOWE.
 */
export function czyZasiewacDanePrzykladowe(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.NODE_ENV === "production") {
    return false;
  }
  if (env.SEED_DANE_PRZYKLADOWE !== undefined) {
    return env.SEED_DANE_PRZYKLADOWE !== "false";
  }
  return true;
}

export interface DaneLogowaniaAdministratoraSeeda {
  nazwaStrzelnicy: string;
  email: string;
  haslo: string;
}

export interface WynikSeeda {
  administratorzy: DaneLogowaniaAdministratoraSeeda[];
}

interface DaneStrzelnicySeeda {
  nazwa: string;
  adres: string;
  nip: string;
  opis: string;
  kontaktEmail: string;
  kontaktTelefon: string;
  adminEmail: string;
  adminHaslo: string;
}

/**
 * Wypełnia repozytorium realistycznymi danymi demonstracyjnymi wyłącznie przez
 * publiczne metody `Repository` (zgodnie z ADR-0001, bez dotykania store'u
 * bezpośrednio), tak by świeżo wystartowany serwer miał od razu niepusty
 * katalog, panele administratora i kolejkę zatwierdzania do demo/testów ręcznych.
 */
export async function zasiejDanePrzykladowe(repository: Repository): Promise<WynikSeeda> {
  const administratorzy: DaneLogowaniaAdministratoraSeeda[] = [];

  async function zarejestruj(dane: DaneStrzelnicySeeda): Promise<string> {
    const { strzelnica } = await repository.utworzStrzelnice({
      nazwa: dane.nazwa,
      adres: dane.adres,
      nip: dane.nip,
      opis: dane.opis,
      kontaktEmail: dane.kontaktEmail,
      kontaktTelefon: dane.kontaktTelefon,
      adminEmail: dane.adminEmail,
      adminHasloHash: await hashPassword(dane.adminHaslo),
    });
    administratorzy.push({ nazwaStrzelnicy: dane.nazwa, email: dane.adminEmail, haslo: dane.adminHaslo });
    return strzelnica.id;
  }

  // Strzelnica 1: zatwierdzona, z pełnym kompletem Osi, Rezerwacji i Blokad.
  const mokotowId = await zarejestruj({
    nazwa: "Strzelnica Sportowa Mokotów",
    adres: "ul. Wołoska 12, Warszawa",
    nip: "5213456789",
    opis: "Kryta strzelnica sportowa w centrum Warszawy, dystanse od 10 do 50 m.",
    kontaktEmail: "kontakt@mokotow-strzelnica.pl",
    kontaktTelefon: "221234567",
    adminEmail: "admin@mokotow-strzelnica.pl",
    adminHaslo: "MokotowDemo123",
  });
  await repository.zatwierdzStrzelnice(mokotowId);
  await repository.ustawGrafik(mokotowId, {
    dlugoscSlotuMinut: 60,
    limitAnulowaniaGodzin: 24,
    godzinyOtwarcia: calyTydzienOtwarte("08:00", "21:00"),
  });
  const mokotowOs1 = await repository.dodajOs({
    strzelnicaId: mokotowId,
    nazwa: "Oś 1 (10 m, pistolet)",
    dystansMetrow: 10,
    dozwoloneTypyBroni: ["pistolet", "rewolwer"],
    cenaZaSlot: 40,
  });
  const mokotowOs2 = await repository.dodajOs({
    strzelnicaId: mokotowId,
    nazwa: "Oś 2 (25 m, pistolet/karabinek)",
    dystansMetrow: 25,
    dozwoloneTypyBroni: ["pistolet", "karabinek"],
    cenaZaSlot: 60,
  });
  const mokotowOs3 = await repository.dodajOs({
    strzelnicaId: mokotowId,
    nazwa: "Oś 3 (50 m, karabin)",
    dystansMetrow: 50,
    dozwoloneTypyBroni: ["karabin"],
    cenaZaSlot: 80,
  });

  // Pojedynczy slot, potwierdzona.
  await repository.utworzRezerwacje({
    strzelnicaId: mokotowId,
    osIds: [mokotowOs1.id],
    data: dataZaDni(3),
    slotOd: "10:00",
    liczbaSlotow: 1,
    cenaCalkowita: mokotowOs1.cenaZaSlot,
    klientImie: "Anna Nowak",
    klientTelefon: "600111222",
    klientEmail: "anna.nowak@example.com",
  });

  // Kilka kolejnych slotów na jednej Osi (dłuższa sesja), potwierdzona.
  await repository.utworzRezerwacje({
    strzelnicaId: mokotowId,
    osIds: [mokotowOs1.id],
    data: dataZaDni(3),
    slotOd: "14:00",
    liczbaSlotow: 2,
    cenaCalkowita: mokotowOs1.cenaZaSlot * 2,
    klientImie: "Piotr Zieliński",
    klientTelefon: "600333444",
    klientEmail: "piotr.zielinski@example.com",
  });

  // Kilka Osi naraz w tym samym przedziale czasu (rezerwacja grupowa), potwierdzona.
  await repository.utworzRezerwacje({
    strzelnicaId: mokotowId,
    osIds: [mokotowOs2.id, mokotowOs3.id],
    data: dataZaDni(4),
    slotOd: "11:00",
    liczbaSlotow: 1,
    cenaCalkowita: mokotowOs2.cenaZaSlot + mokotowOs3.cenaZaSlot,
    klientImie: "Grupa Strzelecka Orzeł",
    klientTelefon: "600555666",
    klientEmail: "grupa.orzel@example.com",
  });

  // Anulowana rezerwacja — panel powinien pokazać też ten stan.
  const doAnulowania = await repository.utworzRezerwacje({
    strzelnicaId: mokotowId,
    osIds: [mokotowOs1.id],
    data: dataZaDni(5),
    slotOd: "09:00",
    liczbaSlotow: 1,
    cenaCalkowita: mokotowOs1.cenaZaSlot,
    klientImie: "Marek Wiśniewski",
    klientTelefon: "600777888",
    klientEmail: "marek.wisniewski@example.com",
  });
  await repository.anulujRezerwacje(doAnulowania.id);

  await repository.utworzBlokade({
    strzelnicaId: mokotowId,
    osId: mokotowOs3.id,
    data: dataZaDni(3),
    slotOd: "18:00",
    liczbaSlotow: 1,
    powod: "Przegląd techniczny",
  });

  // Strzelnica 2: zatwierdzona, z odrębnym grafikiem (inna długość slotu) i Rezerwacją.
  const krakowId = await zarejestruj({
    nazwa: "Strzelnica Krakowska Nowa Huta",
    adres: "al. Przyjaźni 5, Kraków",
    nip: "6762345678",
    opis: "Odkryta strzelnica sportowa z dystansami 15 i 25 m.",
    kontaktEmail: "kontakt@krakow-strzelnica.pl",
    kontaktTelefon: "121234567",
    adminEmail: "admin@krakow-strzelnica.pl",
    adminHaslo: "KrakowDemo123",
  });
  await repository.zatwierdzStrzelnice(krakowId);
  await repository.ustawGrafik(krakowId, {
    dlugoscSlotuMinut: 30,
    limitAnulowaniaGodzin: 12,
    godzinyOtwarcia: calyTydzienOtwarte("08:00", "20:00"),
  });
  const krakowOsA = await repository.dodajOs({
    strzelnicaId: krakowId,
    nazwa: "Oś A (15 m, pistolet)",
    dystansMetrow: 15,
    dozwoloneTypyBroni: ["pistolet"],
    cenaZaSlot: 45,
  });
  const krakowOsB = await repository.dodajOs({
    strzelnicaId: krakowId,
    nazwa: "Oś B (25 m, karabinek/strzelba)",
    dystansMetrow: 25,
    dozwoloneTypyBroni: ["karabinek", "strzelba"],
    cenaZaSlot: 65,
  });

  await repository.utworzRezerwacje({
    strzelnicaId: krakowId,
    osIds: [krakowOsA.id],
    data: dataZaDni(2),
    slotOd: "10:00",
    liczbaSlotow: 1,
    cenaCalkowita: krakowOsA.cenaZaSlot,
    klientImie: "Ewa Kowalczyk",
    klientTelefon: "600999000",
    klientEmail: "ewa.kowalczyk@example.com",
  });

  await repository.utworzBlokade({
    strzelnicaId: krakowId,
    osId: krakowOsB.id,
    data: dataZaDni(6),
    slotOd: "09:00",
    liczbaSlotow: 2,
    powod: "Wydarzenie prywatne",
  });

  // Strzelnica 3: zatwierdzona, żeby katalog nie był ograniczony do dwóch pozycji.
  const wroclawId = await zarejestruj({
    nazwa: "Strzelnica Wrocławska Fabryczna",
    adres: "ul. Fabryczna 20, Wrocław",
    nip: "8971234567",
    opis: "Nowoczesna strzelnica sportowa z osiami pistoletowymi i karabinowymi.",
    kontaktEmail: "kontakt@wroclaw-strzelnica.pl",
    kontaktTelefon: "711234567",
    adminEmail: "admin@wroclaw-strzelnica.pl",
    adminHaslo: "WroclawDemo123",
  });
  await repository.zatwierdzStrzelnice(wroclawId);
  await repository.ustawGrafik(wroclawId, {
    dlugoscSlotuMinut: 60,
    limitAnulowaniaGodzin: 24,
    godzinyOtwarcia: calyTydzienOtwarte("09:00", "19:00"),
  });
  await repository.dodajOs({
    strzelnicaId: wroclawId,
    nazwa: "Oś 1 (10 m, pistolet)",
    dystansMetrow: 10,
    dozwoloneTypyBroni: ["pistolet"],
    cenaZaSlot: 35,
  });
  await repository.dodajOs({
    strzelnicaId: wroclawId,
    nazwa: "Oś 2 (50 m, karabin)",
    dystansMetrow: 50,
    dozwoloneTypyBroni: ["karabin"],
    cenaZaSlot: 75,
  });

  // Strzelnica 4: pozostawiona oczekująca, żeby kolejka zatwierdzania nie była pusta.
  await zarejestruj({
    nazwa: "Strzelnica Gdańska Przymorze",
    adres: "ul. Piastowska 8, Gdańsk",
    nip: "5851234567",
    opis: "Nowo zarejestrowana strzelnica sportowa, oczekuje na zatwierdzenie.",
    kontaktEmail: "kontakt@gdansk-strzelnica.pl",
    kontaktTelefon: "581234567",
    adminEmail: "admin@gdansk-strzelnica.pl",
    adminHaslo: "GdanskDemo123",
  });

  return { administratorzy };
}
