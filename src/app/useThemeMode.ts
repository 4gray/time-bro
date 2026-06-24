import { useCallback, useEffect, useState } from "react";
import type { ThemeMode } from "../components/Sidebar";

export const THEME_STORAGE_KEY = "timebro-theme";
export const LEGACY_THEME_STORAGE_KEY = "sprintf-theme";

const LIGHT_MEDIA_QUERY = "(prefers-color-scheme: light)";

const readStoredTheme = () => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) ?? localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : null;
  } catch {
    return null;
  }
};

const getSystemLightPreference = () =>
  typeof window !== "undefined" && window.matchMedia?.(LIGHT_MEDIA_QUERY).matches === true;

interface UseThemeModeOptions {
  initialTheme?: ThemeMode;
  persist?: boolean;
}

export const useThemeMode = ({ initialTheme, persist = true }: UseThemeModeOptions = {}) => {
  const [selectedTheme, setSelectedTheme] = useState<ThemeMode | null>(() => initialTheme ?? readStoredTheme());
  const [systemLight, setSystemLight] = useState(getSystemLightPreference);

  const effectiveTheme: ThemeMode = selectedTheme ?? (systemLight ? "light" : "dark");

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("theme-light", "theme-dark");
    if (selectedTheme === "light") {
      root.classList.add("theme-light");
    } else if (selectedTheme === "dark") {
      root.classList.add("theme-dark");
    }
  }, [selectedTheme]);

  useEffect(() => {
    const mq = window.matchMedia?.(LIGHT_MEDIA_QUERY);
    if (!mq) {
      return undefined;
    }
    const onChange = () => setSystemLight(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const selectTheme = useCallback(
    (next: ThemeMode) => {
      if (persist) {
        try {
          localStorage.setItem(THEME_STORAGE_KEY, next);
          localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
        } catch {
          /* ignore persistence failures */
        }
      }
      setSelectedTheme(next);
    },
    [persist]
  );

  return {
    selectedTheme,
    effectiveTheme,
    selectTheme
  };
};
