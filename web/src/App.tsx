import { Navigate, Route, Routes } from "react-router-dom";
import { WymagaAdministratoraPlatformy } from "./auth/WymagaAdministratoraPlatformy";
import { WymagaAdministratoraStrzelnicy } from "./auth/WymagaAdministratoraStrzelnicy";
import { TopNav } from "./components/TopNav";
import { AnulowanieRezerwacji } from "./pages/AnulowanieRezerwacji";
import { GrafikOsie } from "./pages/GrafikOsie";
import { Katalog } from "./pages/Katalog";
import { LogowanieAdministratoraPlatformy } from "./pages/LogowanieAdministratoraPlatformy";
import { LogowanieAdministratoraStrzelnicy } from "./pages/LogowanieAdministratoraStrzelnicy";
import { PanelAdministratoraPlatformy } from "./pages/PanelAdministratoraPlatformy";
import { PanelAdministratoraStrzelnicy } from "./pages/PanelAdministratoraStrzelnicy";
import { ProfilStrzelnicy } from "./pages/ProfilStrzelnicy";
import { RejestracjaStrzelnicy } from "./pages/RejestracjaStrzelnicy";

export function App() {
  return (
    <>
      <TopNav />
      <Routes>
        <Route path="/" element={<Katalog />} />
        <Route path="/strzelnice/:id" element={<ProfilStrzelnicy />} />
        <Route path="/rezerwacje/anulowanie/:token" element={<AnulowanieRezerwacji />} />
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
          <Route path="grafik" element={<GrafikOsie />} />
        </Route>
        <Route path="/administrator-platformy/logowanie" element={<LogowanieAdministratoraPlatformy />} />
        <Route
          path="/administrator-platformy/panel"
          element={
            <WymagaAdministratoraPlatformy>
              <PanelAdministratoraPlatformy />
            </WymagaAdministratoraPlatformy>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
