import { Link } from "react-router-dom";

export function TopNav() {
  return (
    <header>
      <nav>
        <Link to="/">Katalog Strzelnic</Link>
        {" | "}
        <Link to="/rejestracja">Zarejestruj Strzelnicę</Link>
        {" | "}
        <Link to="/administrator-strzelnicy/logowanie">Logowanie administratora Strzelnicy</Link>
        {" | "}
        <Link to="/administrator-platformy/logowanie">Logowanie administratora platformy</Link>
      </nav>
    </header>
  );
}
