import { Navigate, Route, Routes } from "react-router-dom";
import { WymagaAdministratoraStrzelnicy } from "./auth/WymagaAdministratoraStrzelnicy";
import { Home } from "./pages/Home";
import { LogowanieAdministratoraStrzelnicy } from "./pages/LogowanieAdministratoraStrzelnicy";
import { PanelAdministratoraStrzelnicy } from "./pages/PanelAdministratoraStrzelnicy";
import { RejestracjaStrzelnicy } from "./pages/RejestracjaStrzelnicy";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/rejestracja" element={<RejestracjaStrzelnicy />} />
      <Route path="/administrator-strzelnicy/logowanie" element={<LogowanieAdministratoraStrzelnicy />} />
      <Route
        path="/administrator-strzelnicy/panel"
        element={
          <WymagaAdministratoraStrzelnicy>
            <PanelAdministratoraStrzelnicy />
          </WymagaAdministratoraStrzelnicy>
        }
      >
        <Route index element={<p>Wybierz sekcję panelu z menu powyżej.</p>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
