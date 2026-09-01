import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { zalogujAdministratoraStrzelnicy } from "../api/auth";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";

export function LogowanieAdministratoraStrzelnicy() {
  const [email, setEmail] = useState("");
  const [haslo, setHaslo] = useState("");
  const [blad, setBlad] = useState<string | undefined>();
  const [wysylanie, setWysylanie] = useState(false);
  const { zalogujAdministratoraStrzelnicy: zapiszSesje } = useAuth();
  const navigate = useNavigate();

  async function obsluzWyslanie(event: FormEvent) {
    event.preventDefault();
    setBlad(undefined);
    setWysylanie(true);
    try {
      const { token, strzelnicaId } = await zalogujAdministratoraStrzelnicy(email, haslo);
      zapiszSesje({ token, strzelnicaId });
      navigate("/administrator-strzelnicy/panel");
    } catch (error) {
      setBlad(error instanceof ApiError ? error.message : "Nie udało się zalogować");
    } finally {
      setWysylanie(false);
    }
  }

  return (
    <section>
      <h1>Logowanie administratora Strzelnicy</h1>
      <form onSubmit={obsluzWyslanie}>
        <label>
          E-mail
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Hasło
          <input type="password" value={haslo} onChange={(e) => setHaslo(e.target.value)} required />
        </label>
        {blad && <p role="alert">{blad}</p>}
        <button type="submit" disabled={wysylanie}>
          Zaloguj się
        </button>
      </form>
      <p>
        Nie masz jeszcze konta? <Link to="/rejestracja">Zarejestruj Strzelnicę</Link>
      </p>
    </section>
  );
}
