import type { Blokada, Os, Rezerwacja } from "@strzelnica/shared";
import { useEffect, useState, type FormEvent } from "react";
import { listujBlokady, usunBlokade, utworzBlokade } from "../api/blokady";
import { ApiError } from "../api/client";
import { listujOsie } from "../api/osie";
import { listujRezerwacjeStrzelnicy } from "../api/rezerwacjeAdmin";
import { useAuth } from "../auth/AuthContext";

function RezerwacjeSekcja({ token, osie }: { token: string; osie: Os[] }) {
  const [rezerwacje, setRezerwacje] = useState<Rezerwacja[]>([]);
  const [ladowanie, setLadowanie] = useState(true);
  const [blad, setBlad] = useState<string | undefined>();

  useEffect(() => {
    let aktualne = true;
    listujRezerwacjeStrzelnicy(token)
      .then(({ rezerwacje }) => {
        if (aktualne) {
          setRezerwacje(rezerwacje);
        }
      })
      .catch((error) => {
        if (aktualne) {
          setBlad(error instanceof ApiError ? error.message : "Nie udało się wczytać Rezerwacji");
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

  function nazwyOsi(osIds: string[]): string {
    return osIds.map((osId) => osie.find((os) => os.id === osId)?.nazwa ?? osId).join(", ");
  }

  return (
    <section>
      <h2>Rezerwacje</h2>
      {blad && <p role="alert">{blad}</p>}
      {ladowanie ? (
        <p>Wczytywanie rezerwacji…</p>
      ) : rezerwacje.length === 0 ? (
        <p>Brak rezerwacji.</p>
      ) : (
        <ul>
          {rezerwacje.map((rezerwacja) => (
            <li key={rezerwacja.id}>
              {rezerwacja.data} {rezerwacja.slotOd} — {nazwyOsi(rezerwacja.osIds)} — {rezerwacja.klientImie} (
              {rezerwacja.klientTelefon}, {rezerwacja.klientEmail}) — {rezerwacja.cenaCalkowita} zł —{" "}
              {rezerwacja.status}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const PUSTY_FORMULARZ_BLOKADY = { osId: "", data: "", slotOd: "", czasTrwaniaMinut: "60", powod: "" };

function BlokadySekcja({ token, osie }: { token: string; osie: Os[] }) {
  const [blokady, setBlokady] = useState<Blokada[]>([]);
  const [ladowanie, setLadowanie] = useState(true);
  const [formularz, setFormularz] = useState(PUSTY_FORMULARZ_BLOKADY);
  const [blad, setBlad] = useState<string | undefined>();
  const [wysylanie, setWysylanie] = useState(false);

  useEffect(() => {
    let aktualne = true;
    listujBlokady(token)
      .then(({ blokady }) => {
        if (aktualne) {
          setBlokady(blokady);
        }
      })
      .catch((error) => {
        if (aktualne) {
          setBlad(error instanceof ApiError ? error.message : "Nie udało się wczytać Blokad");
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

  function nazwaOsi(osId: string): string {
    return osie.find((os) => os.id === osId)?.nazwa ?? osId;
  }

  async function obsluzDodanie(event: FormEvent) {
    event.preventDefault();
    setBlad(undefined);
    setWysylanie(true);
    try {
      const { blokada } = await utworzBlokade(
        {
          osId: formularz.osId,
          data: formularz.data,
          slotOd: formularz.slotOd,
          czasTrwaniaMinut: Number(formularz.czasTrwaniaMinut),
          powod: formularz.powod.trim() === "" ? undefined : formularz.powod,
        },
        token,
      );
      setBlokady((poprzednie) => [...poprzednie, blokada]);
      setFormularz(PUSTY_FORMULARZ_BLOKADY);
    } catch (error) {
      setBlad(error instanceof ApiError ? error.message : "Nie udało się utworzyć Blokady");
    } finally {
      setWysylanie(false);
    }
  }

  async function obsluzUsuniecie(id: string) {
    try {
      await usunBlokade(id, token);
      setBlokady((poprzednie) => poprzednie.filter((blokada) => blokada.id !== id));
    } catch (error) {
      setBlad(error instanceof ApiError ? error.message : "Nie udało się usunąć Blokady");
    }
  }

  return (
    <section>
      <h2>Blokady</h2>
      <form onSubmit={obsluzDodanie}>
        <label>
          Oś
          <select
            value={formularz.osId}
            onChange={(e) => setFormularz((f) => ({ ...f, osId: e.target.value }))}
            required
          >
            <option value="" disabled>
              Wybierz Oś
            </option>
            {osie.map((os) => (
              <option key={os.id} value={os.id}>
                {os.nazwa}
              </option>
            ))}
          </select>
        </label>
        <label>
          Data
          <input
            type="date"
            value={formularz.data}
            onChange={(e) => setFormularz((f) => ({ ...f, data: e.target.value }))}
            required
          />
        </label>
        <label>
          Od godziny
          <input
            type="time"
            value={formularz.slotOd}
            onChange={(e) => setFormularz((f) => ({ ...f, slotOd: e.target.value }))}
            required
          />
        </label>
        <label>
          Czas trwania (minuty)
          <input
            type="number"
            min={1}
            value={formularz.czasTrwaniaMinut}
            onChange={(e) => setFormularz((f) => ({ ...f, czasTrwaniaMinut: e.target.value }))}
            required
          />
        </label>
        <label>
          Powód (opcjonalnie)
          <input
            value={formularz.powod}
            onChange={(e) => setFormularz((f) => ({ ...f, powod: e.target.value }))}
          />
        </label>
        {blad && <p role="alert">{blad}</p>}
        <button type="submit" disabled={wysylanie}>
          Utwórz Blokadę
        </button>
      </form>
      {ladowanie ? (
        <p>Wczytywanie Blokad…</p>
      ) : blokady.length === 0 ? (
        <p>Brak Blokad.</p>
      ) : (
        <ul>
          {blokady.map((blokada) => (
            <li key={blokada.id}>
              {blokada.data} {blokada.slotOd} — {nazwaOsi(blokada.osId)}
              {blokada.powod ? ` — ${blokada.powod}` : ""}{" "}
              <button type="button" onClick={() => obsluzUsuniecie(blokada.id)}>
                Usuń
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function RezerwacjeBlokady() {
  const { administratorStrzelnicy } = useAuth();
  const token = administratorStrzelnicy!.token;
  const [osie, setOsie] = useState<Os[]>([]);

  useEffect(() => {
    let aktualne = true;
    listujOsie(token)
      .then(({ osie }) => {
        if (aktualne) {
          setOsie(osie);
        }
      })
      .catch(() => {
        // Osie są tylko pomocnicze dla tej strony (wybór w formularzu Blokady, nazwy w listach) —
        // sekcje Rezerwacji i Blokad renderują się niezależnie i zgłaszają własne błędy wczytywania.
      });
    return () => {
      aktualne = false;
    };
  }, [token]);

  return (
    <section>
      <RezerwacjeSekcja token={token} osie={osie} />
      <BlokadySekcja token={token} osie={osie} />
    </section>
  );
}
