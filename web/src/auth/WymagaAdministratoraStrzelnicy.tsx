import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export function WymagaAdministratoraStrzelnicy({ children }: { children: ReactNode }) {
  const { administratorStrzelnicy } = useAuth();
  if (!administratorStrzelnicy) {
    return <Navigate to="/administrator-strzelnicy/logowanie" replace />;
  }
  return <>{children}</>;
}
