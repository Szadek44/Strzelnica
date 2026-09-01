import { Link } from "react-router-dom";

export function Home() {
  return (
    <section>
      <h1>Platforma rezerwacji osi strzeleckich</h1>
      <p>
        <Link to="/rejestracja">Zarejestruj Strzelnicę</Link>
      </p>
      <p>
        <Link to="/administrator-strzelnicy/logowanie">Logowanie administratora Strzelnicy</Link>
      </p>
    </section>
  );
}
