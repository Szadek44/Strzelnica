import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

interface SesjaAdministratoraStrzelnicy {
  token: string;
  strzelnicaId: string;
}

interface SesjaAdministratoraPlatformy {
  token: string;
}

const KLUCZ_ADMINISTRATOR_STRZELNICY = "strzelnica.sesjaAdministratoraStrzelnicy";
const KLUCZ_ADMINISTRATOR_PLATFORMY = "strzelnica.sesjaAdministratoraPlatformy";

function odczytajZPamieci<T>(klucz: string): T | undefined {
  const surowa = localStorage.getItem(klucz);
  if (!surowa) {
    return undefined;
  }
  try {
    return JSON.parse(surowa) as T;
  } catch {
    return undefined;
  }
}

interface AuthContextValue {
  administratorStrzelnicy: SesjaAdministratoraStrzelnicy | undefined;
  zalogujAdministratoraStrzelnicy: (sesja: SesjaAdministratoraStrzelnicy) => void;
  wylogujAdministratoraStrzelnicy: () => void;
  administratorPlatformy: SesjaAdministratoraPlatformy | undefined;
  zalogujAdministratoraPlatformy: (sesja: SesjaAdministratoraPlatformy) => void;
  wylogujAdministratoraPlatformy: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [administratorStrzelnicy, setAdministratorStrzelnicy] = useState<
    SesjaAdministratoraStrzelnicy | undefined
  >(() => odczytajZPamieci(KLUCZ_ADMINISTRATOR_STRZELNICY));
  const [administratorPlatformy, setAdministratorPlatformy] = useState<
    SesjaAdministratoraPlatformy | undefined
  >(() => odczytajZPamieci(KLUCZ_ADMINISTRATOR_PLATFORMY));

  const value = useMemo<AuthContextValue>(
    () => ({
      administratorStrzelnicy,
      zalogujAdministratoraStrzelnicy: (sesja) => {
        localStorage.setItem(KLUCZ_ADMINISTRATOR_STRZELNICY, JSON.stringify(sesja));
        setAdministratorStrzelnicy(sesja);
      },
      wylogujAdministratoraStrzelnicy: () => {
        localStorage.removeItem(KLUCZ_ADMINISTRATOR_STRZELNICY);
        setAdministratorStrzelnicy(undefined);
      },
      administratorPlatformy,
      zalogujAdministratoraPlatformy: (sesja) => {
        localStorage.setItem(KLUCZ_ADMINISTRATOR_PLATFORMY, JSON.stringify(sesja));
        setAdministratorPlatformy(sesja);
      },
      wylogujAdministratoraPlatformy: () => {
        localStorage.removeItem(KLUCZ_ADMINISTRATOR_PLATFORMY);
        setAdministratorPlatformy(undefined);
      },
    }),
    [administratorStrzelnicy, administratorPlatformy],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth musi być użyty wewnątrz AuthProvider");
  }
  return context;
}
