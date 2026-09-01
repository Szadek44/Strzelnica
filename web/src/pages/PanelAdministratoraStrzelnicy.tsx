import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function PanelAdministratoraStrzelnicy() {
  const { wylogujAdministratoraStrzelnicy } = useAuth();
  const navigate = useNavigate();

  function wyloguj() {
    wylogujAdministratoraStrzelnicy();
    navigate("/administrator-strzelnicy/logowanie");
  }

  return (
    <section>
      <h1>Panel administratora Strzelnicy</h1>
      <nav>
        <NavLink to="/administrator-strzelnicy/panel/grafik">Grafik i osie</NavLink>
        {" | "}
        <NavLink to="/administrator-strzelnicy/panel/rezerwacje">Rezerwacje i blokady</NavLink>
        {" | "}
        <button type="button" onClick={wyloguj}>
          Wyloguj się
        </button>
      </nav>
      <Outlet />
    </section>
  );
}
