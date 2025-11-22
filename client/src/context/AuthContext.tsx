// client/src/context/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Navigate, useLocation } from "react-router-dom";
import { setAuthToken } from "../api/http";

type AuthState = {
  token: string | null;
  email: string | null;
};

type AuthCtx = {
  isAuthenticated: boolean;
  user: { email: string } | null;
  setAuth: (data: { token: string; email: string }) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthCtx | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [auth, setAuthState] = useState<AuthState>(() => {
    const token = localStorage.getItem("authToken");
    const email = localStorage.getItem("authEmail");
    // aplica logo o token ao axios se existir
    if (token) setAuthToken(token);
    return { token, email };
  });

  useEffect(() => {
    // sempre que token/email mudam, sincroniza axios + localStorage
    setAuthToken(auth.token);

    if (auth.token) localStorage.setItem("authToken", auth.token);
    else localStorage.removeItem("authToken");

    if (auth.email) localStorage.setItem("authEmail", auth.email);
    else localStorage.removeItem("authEmail");
  }, [auth.token, auth.email]);

  const value = useMemo<AuthCtx>(
    () => ({
      isAuthenticated: !!auth.token,
      user: auth.email ? { email: auth.email } : null,
      setAuth: ({ token, email }) => {
        // garante que o axios já fica com o token ANTES de navegares
        setAuthToken(token);
        setAuthState({ token, email });
      },
      logout: () => {
        setAuthToken(null);
        setAuthState({ token: null, email: null });
        localStorage.removeItem("authToken");
        localStorage.removeItem("authEmail");
      },
    }),
    [auth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
};
