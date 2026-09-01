import type { Grafik, Os } from "@strzelnica/shared";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ApiError } from "../api/client";
import { pobierzDostepnosc, utworzRezerwacje } from "../api/rezerwacje";
import { czescWspolnaSlotow, czyBlokWolnyDlaWszystkich, slotyBloku } from "../domain/dostepnosc";

function dzisiaj(): string {
  return new Date().toISOString().slice(0, 10);
}

const PUSTY_KONTAKT = { klientImie: "", klientTelefon: "", klientEmail: "" };

export function RezerwacjaSekcja({
  strzelnicaId,
  osie,
  grafik,
}: {
  strzelnicaId: string;
  osie: Os[];
  grafik: Grafik | undefined;
}) {
  const [data, setData] = useState(dzisiaj);
  const [dostepnoscPerOs, setDostepnoscPerOs] = useState<Record<string, string[] | undefined>>({});
  const [ladowanieDostepnosci, setLadowanieDostepnosci] = useState(true);
  const [wybraneOsIds, setWybraneOsIds] = useState<string[]>([]);
  const [slotOd, setSlotOd] = useState<string | undefined>();
  const [liczbaSlotowStr, setLiczbaSlotowStr] = useState("1");
  const liczbaSlotow = Math.max(1, Number(liczbaSlotowStr) || 1);
  const [kontakt, setKontakt] = useState(PUSTY_KONTAKT);
  const [wysylanie, setWysylanie] = useState(false);
  const [blad, setBlad] = useState<string | undefined>();
  const [cenaPotwierdzona, setCenaPotwierdzona] = useState<number | undefined>();

  function odswiezDostepnosc() {
    setLadowanieDostepnosci(true);
    return Promise.all(
      osie.map((os) => pobierzDostepnosc(strzelnicaId, os.id, data).then((r) => [os.id, r.sloty] as const)),
    )
      .then((wpisy) => setDostepnoscPerOs(Object.fromEntries(wpisy)))
      .catch(() => setBlad("Nie udało się wczytać dostępności terminów"))
      .finally(() => setLadowanieDostepnosci(false));
  }

  useEffect(() => {
    setWybraneOsIds([]);
    setSlotOd(undefined);
    odswiezDostepnosc();
    // Zależy tylko od (strzelnicaId, data) — `osie` to stabilna referencja z propsów rodzica.
  }, [strzelnicaId, data]);

  const wspolneSloty = useMemo(
    () => czescWspolnaSlotow(wybraneOsIds.map((id) => dostepnoscPerOs[id] ?? [])),
    [wybraneOsIds, dostepnoscPerOs],
  );

  useEffect(() => {
    if (!slotOd || !wspolneSloty.includes(slotOd)) {
      setSlotOd(wspolneSloty[0]);
    }
  }, [wspolneSloty]);

  function przelaczOs(osId: string) {
    setWybraneOsIds((poprzednie) =>
      poprzednie.includes(osId) ? poprzednie.filter((id) => id !== osId) : [...poprzednie, osId],
    );
  }

  const wymaganeSloty = grafik && slotOd ? slotyBloku(slotOd, liczbaSlotow, grafik.dlugoscSlotuMinut) : [];
  const blokWolny =
    wybraneOsIds.length > 0 && wymaganeSloty.length > 0 && czyBlokWolnyDlaWszystkich(wymaganeSloty, wybraneOsIds, dostepnoscPerOs);
  const wybraneOsie = osie.filter((os) => wybraneOsIds.includes(os.id));
  const cenaCalkowita = wybraneOsie.reduce((suma, os) => suma + os.cenaZaSlot * liczbaSlotow, 0);

  async function obsluzRezerwacje(event: FormEvent) {
    event.preventDefault();
    if (!slotOd || !grafik) {
      return;
    }
    setBlad(undefined);
    setWysylanie(true);
    try {
      const { rezerwacja } = await utworzRezerwacje(strzelnicaId, {
        osIds: wybraneOsIds,
        data,
        slotOd,
        czasTrwaniaMinut: liczbaSlotow * grafik.dlugoscSlotuMinut,
        ...kontakt,
      });
      setCenaPotwierdzona(rezerwacja.cenaCalkowita);
      setKontakt(PUSTY_KONTAKT);
      setWybraneOsIds([]);
      setLiczbaSlotowStr("1");
      await odswiezDostepnosc();
    } catch (error) {
      setBlad(
        error instanceof ApiError
          ? error.message
          : "Nie udało się złożyć rezerwacji. Spróbuj ponownie.",
      );
      await odswiezDostepnosc();
    } finally {
      setWysylanie(false);
    }
  }

  if (!grafik) {
    return (
      <section>
        <h2>Zarezerwuj termin</h2>
        <p>Ta Strzelnica nie skonfigurowała jeszcze grafiku — rezerwacja jest chwilowo niedostępna.</p>
      </section>
    );
  }
  if (osie.length === 0) {
    return (
      <section>
        <h2>Zarezerwuj termin</h2>
        <p>Ta Strzelnica nie ma jeszcze skonfigurowanych Osi.</p>
      </section>
    );
  }

  if (cenaPotwierdzona !== undefined) {
    return (
      <section>
        <h2>Zarezerwuj termin</h2>
        <p role="status">
          Rezerwacja przyjęta. Cena do zapłaty na miejscu: {cenaPotwierdzona} zł. Potwierdzenie zostało
          wysłane e-mailem wraz z linkiem do anulowania.
        </p>
        <button type="button" onClick={() => setCenaPotwierdzona(undefined)}>
          Zarezerwuj kolejny termin
        </button>
      </section>
    );
  }

  return (
    <section>
      <h2>Zarezerwuj termin</h2>
      <label>
        Data
        <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
      </label>
      {ladowanieDostepnosci ? (
        <p>Wczytywanie dostępności…</p>
      ) : (
        <fieldset>
          <legend>Wybierz Oś (lub kilka naraz)</legend>
          <ul>
            {osie.map((os) => (
              <li key={os.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={wybraneOsIds.includes(os.id)}
                    onChange={() => przelaczOs(os.id)}
                  />
                  {os.nazwa} ({os.cenaZaSlot} zł/slot) — wolne sloty: {(dostepnoscPerOs[os.id] ?? []).join(", ") || "brak"}
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}
      {wybraneOsIds.length > 0 && (
        <>
          <label>
            Slot początkowy
            <select value={slotOd ?? ""} onChange={(e) => setSlotOd(e.target.value)}>
              {wspolneSloty.length === 0 && <option value="">Brak wspólnego wolnego terminu</option>}
              {wspolneSloty.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </label>
          <label>
            Liczba kolejnych slotów ({grafik.dlugoscSlotuMinut} min każdy)
            <input
              type="number"
              min={1}
              value={liczbaSlotowStr}
              onChange={(e) => setLiczbaSlotowStr(e.target.value)}
            />
          </label>
          {!blokWolny && slotOd && (
            <p role="alert">Wybrany przedział czasu nie jest w całości wolny na wszystkich wybranych Osiach.</p>
          )}
          <p>Łączna cena: {cenaCalkowita} zł</p>
          <form onSubmit={obsluzRezerwacje}>
            <label>
              Imię i nazwisko
              <input
                value={kontakt.klientImie}
                onChange={(e) => setKontakt((k) => ({ ...k, klientImie: e.target.value }))}
                required
              />
            </label>
            <label>
              Telefon
              <input
                value={kontakt.klientTelefon}
                onChange={(e) => setKontakt((k) => ({ ...k, klientTelefon: e.target.value }))}
                required
              />
            </label>
            <label>
              E-mail
              <input
                type="email"
                value={kontakt.klientEmail}
                onChange={(e) => setKontakt((k) => ({ ...k, klientEmail: e.target.value }))}
                required
              />
            </label>
            {blad && <p role="alert">{blad}</p>}
            <button type="submit" disabled={wysylanie || !slotOd || !blokWolny}>
              Zarezerwuj
            </button>
          </form>
        </>
      )}
    </section>
  );
}
