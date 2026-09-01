import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { zalogujAdministratoraPlatformy } from "../api/auth";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";

export function LogowanieAdministratoraPlatformy() {
  const [email, setEmail] = useState("");
  const [haslo, setHaslo] = useState("");
  const [blad, setBlad] = useState<string | undefined>();
  const [wysylanie, setWysylanie] = useState(false);
  const { zalogujAdministratoraPlatformy: zapiszSesje } = useAuth();
  const navigate = useNavigate();

  async function obsluzWyslanie(event: FormEvent) {
    event.preventDefault();
    setBlad(undefined);
    setWysylanie(true);
    try {
      const { token } = await zalogujAdministratoraPlatformy(email, haslo);
      zapiszSesje({ token });
      navigate("/administrator-platformy/panel");
    } catch (error) {
      setBlad(error instanceof ApiError ? error.message : "Nie udało się zalogować");
    } finally {
      setWysylanie(false);
    }
  }

  return (
    <section>
      <h1>Logowanie administratora platformy</h1>
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
    </section>
  );
}
