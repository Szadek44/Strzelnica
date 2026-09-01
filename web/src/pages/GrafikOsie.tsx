import { DNI_TYGODNIA, type DzienTygodnia, type GodzinyOtwarcia, type Os } from "@strzelnica/shared";
import { useEffect, useState, type FormEvent } from "react";
import { ApiError } from "../api/client";
import { pobierzGrafik, ustawGrafik } from "../api/grafik";
import { dodajOs, listujOsie } from "../api/osie";
import { useAuth } from "../auth/AuthContext";

const ETYKIETY_DNI: Record<DzienTygodnia, string> = {
  poniedzialek: "Poniedziałek",
  wtorek: "Wtorek",
  sroda: "Środa",
  czwartek: "Czwartek",
  piatek: "Piątek",
  sobota: "Sobota",
  niedziela: "Niedziela",
};

function domyslneGodzinyOtwarcia(): GodzinyOtwarcia {
  return Object.fromEntries(DNI_TYGODNIA.map((dzien) => [dzien, { otwarte: false }])) as GodzinyOtwarcia;
}

function GrafikSekcja({ token }: { token: string }) {
  const [godzinyOtwarcia, setGodzinyOtwarcia] = useState<GodzinyOtwarcia>(domyslneGodzinyOtwarcia);
  const [dlugoscSlotuMinut, setDlugoscSlotuMinut] = useState(60);
  const [limitAnulowaniaGodzin, setLimitAnulowaniaGodzin] = useState(24);
  const [ladowanie, setLadowanie] = useState(true);
  const [zapisywanie, setZapisywanie] = useState(false);
  const [blad, setBlad] = useState<string | undefined>();
  const [zapisano, setZapisano] = useState(false);

  useEffect(() => {
    let aktualne = true;
    pobierzGrafik(token)
      .then((grafik) => {
        if (aktualne && grafik) {
          setGodzinyOtwarcia(grafik.godzinyOtwarcia);
          setDlugoscSlotuMinut(grafik.dlugoscSlotuMinut);
          setLimitAnulowaniaGodzin(grafik.limitAnulowaniaGodzin);
        }
      })
      .catch((error) => {
        if (aktualne) {
          setBlad(error instanceof ApiError ? error.message : "Nie udało się wczytać grafiku");
        }
      })
      .finally(() => {
        if (aktualne) {
          setLadowanie(false);
        }
      });
    return () => {
      aktualne = false;
    };
  }, [token]);

  function ustawDzien(dzien: DzienTygodnia, otwarte: boolean) {
    setGodzinyOtwarcia((poprzednie) => ({
      ...poprzednie,
      [dzien]: otwarte ? { otwarte: true, od: "08:00", do: "20:00" } : { otwarte: false },
    }));
  }

  function ustawGodzineDnia(dzien: DzienTygodnia, pole: "od" | "do", wartosc: string) {
    setGodzinyOtwarcia((poprzednie) => {
      const bieżący = poprzednie[dzien];
      if (!bieżący.otwarte) {
        return poprzednie;
      }
      return { ...poprzednie, [dzien]: { ...bieżący, [pole]: wartosc } };
    });
  }

  async function obsluzZapis(event: FormEvent) {
    event.preventDefault();
    setBlad(undefined);
    setZapisano(false);
    setZapisywanie(true);
    try {
      await ustawGrafik({ dlugoscSlotuMinut, limitAnulowaniaGodzin, godzinyOtwarcia }, token);
      setZapisano(true);
    } catch (error) {
      setBlad(error instanceof ApiError ? error.message : "Nie udało się zapisać grafiku");
    } finally {
      setZapisywanie(false);
    }
  }

  if (ladowanie) {
    return <p>Wczytywanie grafiku…</p>;
  }

  return (
    <form onSubmit={obsluzZapis}>
      <h2>Grafik</h2>
      <table>
        <tbody>
          {DNI_TYGODNIA.map((dzien) => {
            const godzinyDnia = godzinyOtwarcia[dzien];
            return (
              <tr key={dzien}>
                <td>
                  <label>
                    <input
                      type="checkbox"
                      checked={godzinyDnia.otwarte}
                      onChange={(e) => ustawDzien(dzien, e.target.checked)}
                    />
                    {ETYKIETY_DNI[dzien]}
                  </label>
                </td>
                <td>
                  {godzinyDnia.otwarte && (
                    <>
                      <input
                        type="time"
                        aria-label={`${ETYKIETY_DNI[dzien]} od`}
                        value={godzinyDnia.od}
                        onChange={(e) => ustawGodzineDnia(dzien, "od", e.target.value)}
                      />
                      {" – "}
                      <input
                        type="time"
                        aria-label={`${ETYKIETY_DNI[dzien]} do`}
                        value={godzinyDnia.do}
                        onChange={(e) => ustawGodzineDnia(dzien, "do", e.target.value)}
                      />
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <label>
        Długość slotu (minuty)
        <input
          type="number"
          min={1}
          value={dlugoscSlotuMinut}
          onChange={(e) => setDlugoscSlotuMinut(Number(e.target.value))}
          required
        />
      </label>
      <label>
        Limit anulowania (godziny)
        <input
          type="number"
          min={0}
          value={limitAnulowaniaGodzin}
          onChange={(e) => setLimitAnulowaniaGodzin(Number(e.target.value))}
          required
        />
      </label>
      {blad && <p role="alert">{blad}</p>}
      {zapisano && <p role="status">Grafik zapisany</p>}
      <button type="submit" disabled={zapisywanie}>
        Zapisz grafik
      </button>
    </form>
  );
}

const PUSTY_FORMULARZ_OSI = { nazwa: "", dystansMetrow: "", dozwoloneTypyBroni: "", cenaZaSlot: "" };

function OsieSekcja({ token }: { token: string }) {
  const [osie, setOsie] = useState<Os[]>([]);
  const [ladowanie, setLadowanie] = useState(true);
  const [formularz, setFormularz] = useState(PUSTY_FORMULARZ_OSI);
  const [blad, setBlad] = useState<string | undefined>();
  const [wysylanie, setWysylanie] = useState(false);

  useEffect(() => {
    let aktualne = true;
    listujOsie(token)
      .then(({ osie }) => {
        if (aktualne) {
          setOsie(osie);
        }
      })
      .finally(() => {
        if (aktualne) {
          setLadowanie(false);
        }
      });
    return () => {
      aktualne = false;
    };
  }, [token]);

  async function obsluzDodanie(event: FormEvent) {
    event.preventDefault();
    setBlad(undefined);
    setWysylanie(true);
    try {
      const { os } = await dodajOs(
        {
          nazwa: formularz.nazwa,
          dystansMetrow: Number(formularz.dystansMetrow),
          dozwoloneTypyBroni: formularz.dozwoloneTypyBroni
            .split(",")
            .map((typ) => typ.trim())
            .filter((typ) => typ !== ""),
          cenaZaSlot: Number(formularz.cenaZaSlot),
        },
        token,
      );
      setOsie((poprzednie) => [...poprzednie, os]);
      setFormularz(PUSTY_FORMULARZ_OSI);
    } catch (error) {
      setBlad(error instanceof ApiError ? error.message : "Nie udało się dodać Osi");
    } finally {
      setWysylanie(false);
    }
  }

  return (
    <section>
      <h2>Osie</h2>
      <form onSubmit={obsluzDodanie}>
        <label>
          Nazwa/numer
          <input
            value={formularz.nazwa}
            onChange={(e) => setFormularz((f) => ({ ...f, nazwa: e.target.value }))}
            required
          />
        </label>
        <label>
          Dystans (m)
          <input
            type="number"
            min={1}
            value={formularz.dystansMetrow}
            onChange={(e) => setFormularz((f) => ({ ...f, dystansMetrow: e.target.value }))}
            required
          />
        </label>
        <label>
          Dozwolone typy broni (oddziel przecinkami)
          <input
            value={formularz.dozwoloneTypyBroni}
            onChange={(e) => setFormularz((f) => ({ ...f, dozwoloneTypyBroni: e.target.value }))}
            required
          />
        </label>
        <label>
          Cena za slot (zł)
          <input
            type="number"
            min={0}
            value={formularz.cenaZaSlot}
            onChange={(e) => setFormularz((f) => ({ ...f, cenaZaSlot: e.target.value }))}
            required
          />
        </label>
        {blad && <p role="alert">{blad}</p>}
        <button type="submit" disabled={wysylanie}>
          Dodaj Oś
        </button>
      </form>
      {ladowanie ? (
        <p>Wczytywanie Osi…</p>
      ) : (
        <ul>
          {osie.map((os) => (
            <li key={os.id}>
              {os.nazwa} — {os.dystansMetrow} m — {os.dozwoloneTypyBroni.join(", ")} — {os.cenaZaSlot} zł/slot
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function GrafikOsie() {
  const { administratorStrzelnicy } = useAuth();
  const token = administratorStrzelnicy!.token;

  return (
    <section>
      <GrafikSekcja token={token} />
      <OsieSekcja token={token} />
    </section>
  );
}
