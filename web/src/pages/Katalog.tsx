import type { Strzelnica } from "@strzelnica/shared";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listujKatalogStrzelnic } from "../api/katalog";
import { ApiError } from "../api/client";

export function Katalog() {
  const [q, setQ] = useState("");
  const [strzelnice, setStrzelnice] = useState<Strzelnica[]>([]);
  const [ladowanie, setLadowanie] = useState(true);
  const [blad, setBlad] = useState<string | undefined>();

  useEffect(() => {
    let aktualne = true;
    setLadowanie(true);
    const opoznienie = setTimeout(() => {
      listujKatalogStrzelnic(q.trim() || undefined)
        .then(({ strzelnice }) => {
          if (aktualne) {
            setStrzelnice(strzelnice);
            setBlad(undefined);
          }
        })
        .catch((error) => {
          if (aktualne) {
            setBlad(error instanceof ApiError ? error.message : "Nie udało się wczytać katalogu Strzelnic");
          }
        })
        .finally(() => {
          if (aktualne) {
            setLadowanie(false);
          }
        });
    }, 250);
    return () => {
      aktualne = false;
      clearTimeout(opoznienie);
    };
  }, [q]);

  return (
    <section>
      <h1>Katalog Strzelnic</h1>
      <label>
        Szukaj po mieście lub nazwie
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="np. Warszawa" />
      </label>
      {blad && <p role="alert">{blad}</p>}
      {ladowanie ? (
        <p>Wczytywanie…</p>
      ) : strzelnice.length === 0 ? (
        <p>Brak Strzelnic spełniających kryteria wyszukiwania.</p>
      ) : (
        <ul>
          {strzelnice.map((strzelnica) => (
            <li key={strzelnica.id}>
              <Link to={`/strzelnice/${strzelnica.id}`}>{strzelnica.nazwa}</Link> — {strzelnica.adres}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
