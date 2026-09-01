import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { zarejestrujStrzelnice, type RejestracjaStrzelnicyDane } from "../api/strzelnice";
import { ApiError } from "../api/client";

const PUSTY_FORMULARZ: RejestracjaStrzelnicyDane = {
  nazwa: "",
  adres: "",
  nip: "",
  opis: "",
  kontaktEmail: "",
  kontaktTelefon: "",
  adminEmail: "",
  adminHaslo: "",
};

export function RejestracjaStrzelnicy() {
  const [formularz, setFormularz] = useState(PUSTY_FORMULARZ);
  const [blad, setBlad] = useState<string | undefined>();
  const [wysylanie, setWysylanie] = useState(false);
  const [zarejestrowana, setZarejestrowana] = useState(false);

  function ustawPole(pole: keyof RejestracjaStrzelnicyDane) {
    return (event: { target: { value: string } }) =>
      setFormularz((poprzedni) => ({ ...poprzedni, [pole]: event.target.value }));
  }

  async function obsluzWyslanie(event: FormEvent) {
    event.preventDefault();
    setBlad(undefined);
    setWysylanie(true);
    try {
      await zarejestrujStrzelnice(formularz);
      setZarejestrowana(true);
    } catch (error) {
      setBlad(error instanceof ApiError ? error.message : "Nie udało się zarejestrować Strzelnicy");
    } finally {
      setWysylanie(false);
    }
  }

  if (zarejestrowana) {
    return (
      <section>
        <h1>Rejestracja przyjęta</h1>
        <p role="status">
          Twoja Strzelnica ma status <strong>oczekująca</strong>. Zostanie opublikowana w katalogu po
          zatwierdzeniu przez administratora platformy.
        </p>
        <Link to="/administrator-strzelnicy/logowanie">Przejdź do logowania</Link>
      </section>
    );
  }

  return (
    <section>
      <h1>Rejestracja Strzelnicy</h1>
      <form onSubmit={obsluzWyslanie}>
        <label>
          Nazwa
          <input value={formularz.nazwa} onChange={ustawPole("nazwa")} required />
        </label>
        <label>
          Adres
          <input value={formularz.adres} onChange={ustawPole("adres")} required />
        </label>
        <label>
          NIP
          <input value={formularz.nip} onChange={ustawPole("nip")} required />
        </label>
        <label>
          Opis
          <textarea value={formularz.opis} onChange={ustawPole("opis")} required />
        </label>
        <label>
          E-mail kontaktowy
          <input type="email" value={formularz.kontaktEmail} onChange={ustawPole("kontaktEmail")} required />
        </label>
        <label>
          Telefon kontaktowy
          <input value={formularz.kontaktTelefon} onChange={ustawPole("kontaktTelefon")} required />
        </label>
        <label>
          E-mail administratora (login)
          <input type="email" value={formularz.adminEmail} onChange={ustawPole("adminEmail")} required />
        </label>
        <label>
          Hasło administratora
          <input type="password" value={formularz.adminHaslo} onChange={ustawPole("adminHaslo")} required />
        </label>
        {blad && <p role="alert">{blad}</p>}
        <button type="submit" disabled={wysylanie}>
          Zarejestruj Strzelnicę
        </button>
      </form>
      <p>
        Masz już konto? <Link to="/administrator-strzelnicy/logowanie">Zaloguj się</Link>
      </p>
    </section>
  );
}
