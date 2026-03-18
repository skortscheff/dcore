"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Lang = "en" | "es";

export const PRESETS = [
  { name: "indigo",  color: "#6366f1" },
  { name: "violet",  color: "#8b5cf6" },
  { name: "cyan",    color: "#06b6d4" },
  { name: "emerald", color: "#10b981" },
  { name: "rose",    color: "#f43f5e" },
  { name: "amber",   color: "#f59e0b" },
] as const;

export const TRANSLATIONS = {
  en: {
    dashboard:    "Dashboard",
    clients:      "Clients",
    products:     "Products",
    runbooks:     "Runbooks",
    changes:      "Changes",
    exceptions:   "Exceptions",
    evidence:     "Evidence",
    auditLog:     "Audit Log",
    signOut:      "Sign out",
    msspPlatform: "MSSP Platform",
  },
  es: {
    dashboard:    "Panel",
    clients:      "Clientes",
    products:     "Productos",
    runbooks:     "Manuales",
    changes:      "Cambios",
    exceptions:   "Excepciones",
    evidence:     "Evidencia",
    auditLog:     "Registro de Auditoría",
    signOut:      "Cerrar sesión",
    msspPlatform: "Plataforma MSSP",
  },
};

const DEFAULT_ACCENT = "#6366f1";
const DEFAULT_LANG: Lang = "en";

interface ThemeCtx {
  accent: string;
  setAccent: (c: string) => void;
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: keyof typeof TRANSLATIONS["en"]) => string;
}

const ThemeContext = createContext<ThemeCtx | null>(null);

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function applyAccent(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const s = document.documentElement.style;
  s.setProperty("--accent",        hex);
  s.setProperty("--accent-rgb",    `${r}, ${g}, ${b}`);
  s.setProperty("--accent-dark",   `rgb(${Math.round(r * 0.70)}, ${Math.round(g * 0.70)}, ${Math.round(b * 0.70)})`);
  s.setProperty("--accent-light",  `rgba(${r}, ${g}, ${b}, 0.85)`);
  s.setProperty("--accent-bg",     `rgba(${r}, ${g}, ${b}, 0.08)`);
  s.setProperty("--accent-border", `rgba(${r}, ${g}, ${b}, 0.28)`);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [accent, setAccentState] = useState(DEFAULT_ACCENT);
  const [lang,   setLangState]   = useState<Lang>(DEFAULT_LANG);

  useEffect(() => {
    const savedAccent = localStorage.getItem("dcore-accent") ?? DEFAULT_ACCENT;
    const savedLang   = (localStorage.getItem("dcore-lang") ?? DEFAULT_LANG) as Lang;
    setAccentState(savedAccent);
    setLangState(savedLang);
    applyAccent(savedAccent);
    document.documentElement.lang = savedLang;
  }, []);

  const setAccent = (c: string) => {
    setAccentState(c);
    localStorage.setItem("dcore-accent", c);
    applyAccent(c);
  };

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("dcore-lang", l);
    document.documentElement.lang = l;
  };

  const t = (key: keyof typeof TRANSLATIONS["en"]) => TRANSLATIONS[lang][key];

  return (
    <ThemeContext.Provider value={{ accent, setAccent, lang, setLang, t }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
