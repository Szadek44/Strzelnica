import type { Rezerwacja } from "@strzelnica/shared";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { anulujRezerwacje, pobierzRezerwacjeDoAnulowania } from "../api/anulowanie";
import { ApiError } from "../api/client";

export function AnulowanieRezerwacji() {
  const { token } = useParams<{ token: string }>();
  const [rezerwacja, setRezerwacja] = useState<Rezerwacja | undefined>();
  const [strzelnicaNazwa, setStrzelnicaNazwa] = useState<string | undefined>();
  const [ladowanie, setLadowanie] = useState(true);
  const [bladLadowania, setBladLadowania] = useState<string | undefined>();
  const [anulowanie, setAnulowanie] = useState(false);
  const [bladAnulowania, setBladAnulowania] = useState<string | undefined>();
  const [wlasnieAnulowano, setWlasnieAnulowano] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }
    pobierzRezerwacjeDoAnulowania(token)
      .then((dane) => {
        setRezerwacja(dane.rezerwacja);
        setStrzelnicaNazwa(dane.strzelnicaNazwa);
      })
      .catch((error) => {
        setBladLadowania(
          error instanceof ApiError
            ? error.message
            : "Nie udało się wczytać szczegółów Rezerwacji dla tego linku",
        );
      })
      .finally(() => setLadowanie(false));
  }, [token]);

  async function obsluzAnulowanie() {
    if (!token) {
      return;
    }
    setBladAnulowania(undefined);
    setAnulowanie(true);
    try {
      const { rezerwacja } = await anulujRezerwacje(token);
      setRezerwacja(rezerwacja);
      setWlasnieAnulowano(true);
    } catch (error) {
      setBladAnulowania(
        error instanceof ApiError ? error.message : "Nie udało się anulować Rezerwacji. Spróbuj ponownie.",
      );
    } finally {
      setAnulowanie(false);
    }
  }

  if (ladowanie) {
    return <p>Wczytywanie…</p>;
  }
  if (bladLadowania || !rezerwacja) {
    return (
      <section>
        <h1>Anulowanie rezerwacji</h1>
        <p role="alert">{bladLadowania ?? "Nieprawidłowy lub nieznany link anulowania."}</p>
      </section>
    );
  }

  return (
    <section>
      <h1>Anulowanie rezerwacji</h1>
      {strzelnicaNazwa && <p>Strzelnica: {strzelnicaNazwa}</p>}
      <p>
        Termin: {rezerwacja.data} od {rezerwacja.slotOd} ({rezerwacja.liczbaSlotow}{" "}
        {rezerwacja.liczbaSlotow === 1 ? "slot" : "sloty"})
      </p>
      <p>Cena: {rezerwacja.cenaCalkowita} zł</p>
      {wlasnieAnulowano ? (
        <p role="status">Rezerwacja została anulowana. Potwierdzenie zostało wysłane e-mailem.</p>
      ) : rezerwacja.status === "anulowana" ? (
        <p role="status">Ta rezerwacja została już anulowana.</p>
      ) : (
        <>
          {bladAnulowania && <p role="alert">{bladAnulowania}</p>}
          <button type="button" onClick={obsluzAnulowanie} disabled={anulowanie}>
            Anuluj rezerwację
          </button>
        </>
      )}
    </section>
  );
}
