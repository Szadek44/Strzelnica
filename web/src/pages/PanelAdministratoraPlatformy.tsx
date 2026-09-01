import type { Strzelnica } from "@strzelnica/shared";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listujStrzelniceOczekujace, zatwierdzStrzelnice } from "../api/administratorzyPlatformy";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";

export function PanelAdministratoraPlatformy() {
  const { administratorPlatformy, wylogujAdministratoraPlatformy } = useAuth();
  const token = administratorPlatformy!.token;
  const navigate = useNavigate();

  const [strzelnice, setStrzelnice] = useState<Strzelnica[]>([]);
  const [ladowanie, setLadowanie] = useState(true);
  const [blad, setBlad] = useState<string | undefined>();
  const [zatwierdzanieId, setZatwierdzanieId] = useState<string | undefined>();

  useEffect(() => {
    let aktualne = true;
    listujStrzelniceOczekujace(token)
      .then(({ strzelnice }) => {
        if (aktualne) {
          setStrzelnice(strzelnice);
        }
      })
      .catch((error) => {
        if (aktualne) {
          setBlad(error instanceof ApiError ? error.message : "Nie udało się wczytać listy Strzelnic");
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

  async function zatwierdz(id: string) {
    setZatwierdzanieId(id);
    setBlad(undefined);
    try {
      await zatwierdzStrzelnice(id, token);
      setStrzelnice((poprzednie) => poprzednie.filter((strzelnica) => strzelnica.id !== id));
    } catch (error) {
      setBlad(error instanceof ApiError ? error.message : "Nie udało się zatwierdzić Strzelnicy");
    } finally {
      setZatwierdzanieId(undefined);
    }
  }

  function wyloguj() {
    wylogujAdministratoraPlatformy();
    navigate("/administrator-platformy/logowanie");
  }

  return (
    <section>
      <h1>Strzelnice oczekujące na zatwierdzenie</h1>
      <button type="button" onClick={wyloguj}>
        Wyloguj się
      </button>
      {blad && <p role="alert">{blad}</p>}
      {ladowanie ? (
        <p>Wczytywanie…</p>
      ) : strzelnice.length === 0 ? (
        <p>Brak Strzelnic oczekujących na zatwierdzenie.</p>
      ) : (
        <ul>
          {strzelnice.map((strzelnica) => (
            <li key={strzelnica.id}>
              {strzelnica.nazwa} — {strzelnica.adres}
              <button
                type="button"
                disabled={zatwierdzanieId === strzelnica.id}
                onClick={() => zatwierdz(strzelnica.id)}
              >
                Zatwierdź
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
