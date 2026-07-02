import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "light" | "dark" | "system";
export type Accent = "emerald" | "ocean" | "lavender" | "sunset" | "mono";

interface ThemeCtx {
  theme: Theme;
  accent: Accent;
  setTheme: (t: Theme) => void;
  setAccent: (a: Accent) => void;
  resolvedTheme: "light" | "dark";
}

const Ctx = createContext<ThemeCtx | null>(null);

function resolve(theme: Theme): "light" | "dark" {
  if (theme === "system" && typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme === "dark" ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [accent, setAccentState] = useState<Accent>("emerald");
  const [resolvedTheme, setResolved] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const t = (localStorage.getItem("sm.theme") as Theme) || "dark";
    const a = (localStorage.getItem("sm.accent") as Accent) || "emerald";
    setThemeState(t);
    setAccentState(a);
  }, []);

  useEffect(() => {
    const r = resolve(theme);
    setResolved(r);
    document.documentElement.classList.toggle("dark", r === "dark");
    document.documentElement.dataset.accent = accent;
    localStorage.setItem("sm.theme", theme);
    localStorage.setItem("sm.accent", accent);
  }, [theme, accent]);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const r = mq.matches ? "dark" : "light";
      setResolved(r);
      document.documentElement.classList.toggle("dark", r === "dark");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  return (
    <Ctx.Provider value={{ theme, accent, setTheme: setThemeState, setAccent: setAccentState, resolvedTheme }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTheme() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useTheme must be inside ThemeProvider");
  return c;
}
