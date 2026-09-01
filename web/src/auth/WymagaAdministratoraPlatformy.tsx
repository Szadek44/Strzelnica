import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export function WymagaAdministratoraPlatformy({ children }: { children: ReactNode }) {
  const { administratorPlatformy } = useAuth();
  if (!administratorPlatformy) {
    return <Navigate to="/administrator-platformy/logowanie" replace />;
  }
  return <>{children}</>;
}
