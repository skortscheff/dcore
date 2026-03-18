"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  AuthTokens,
  JWTPayload,
  clearTokens,
  decodeToken,
  getAccessToken,
  isTokenExpired,
  passwordLogin,
  saveTokens,
} from "@/lib/auth";

interface AuthContextValue {
  user: JWTPayload | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<JWTPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (token && !isTokenExpired(token)) {
      setUser(decodeToken(token));
    }
    setLoading(false);
  }, []);

  async function login(username: string, password: string) {
    const tokens: AuthTokens = await passwordLogin(username, password);
    saveTokens(tokens);
    setUser(decodeToken(tokens.access_token));
  }

  function logout() {
    clearTokens();
    setUser(null);
  }

  function hasRole(role: string): boolean {
    return user?.roles?.includes(role) ?? false;
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, isAuthenticated: !!user, hasRole }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
