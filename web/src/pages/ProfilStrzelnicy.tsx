import type { Os, Strzelnica } from "@strzelnica/shared";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ApiError } from "../api/client";
import { pobierzProfilStrzelnicy } from "../api/katalog";

export function ProfilStrzelnicy() {
  const { id } = useParams<{ id: string }>();
  const [strzelnica, setStrzelnica] = useState<Strzelnica | undefined>();
  const [osie, setOsie] = useState<Os[]>([]);
  const [ladowanie, setLadowanie] = useState(true);
  const [blad, setBlad] = useState<string | undefined>();

  useEffect(() => {
    if (!id) {
      return;
    }
    let aktualne = true;
    pobierzProfilStrzelnicy(id)
      .then((dane) => {
        if (aktualne) {
          setStrzelnica(dane.strzelnica);
          setOsie(dane.osie);
        }
      })
      .catch((error) => {
        if (aktualne) {
          setBlad(error instanceof ApiError ? error.message : "Nie udało się wczytać Profilu Strzelnicy");
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
  }, [id]);

  if (ladowanie) {
    return <p>Wczytywanie…</p>;
  }
  if (blad || !strzelnica) {
    return <p role="alert">{blad ?? "Nie znaleziono Profilu Strzelnicy"}</p>;
  }

  return (
    <section>
      <h1>{strzelnica.nazwa}</h1>
      <p>{strzelnica.opis}</p>
      <p>Adres: {strzelnica.adres}</p>
      <p>
        Kontakt: {strzelnica.kontaktEmail}, {strzelnica.kontaktTelefon}
      </p>
      <h2>Osie</h2>
      {osie.length === 0 ? (
        <p>Ta Strzelnica nie skonfigurowała jeszcze żadnej Osi.</p>
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
