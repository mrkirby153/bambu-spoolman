"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

type Theme = "light" | "dark";

const storageKey = "bambu-spoolman-theme";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

function getCurrentTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function ThemeToggle() {
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
      if (localStorage.getItem(storageKey) !== null) return;

      const nextTheme = event.matches ? "dark" : "light";
      applyTheme(nextTheme);
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== storageKey) return;

      const nextTheme = event.newValue
        ? event.newValue === "dark"
          ? "dark"
          : "light"
        : mediaQuery.matches
          ? "dark"
          : "light";
      applyTheme(nextTheme);
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);
    window.addEventListener("storage", handleStorage);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  function toggleTheme() {
    const nextTheme: Theme = getCurrentTheme() === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    localStorage.setItem(storageKey, nextTheme);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80"
      onClick={toggleTheme}
      aria-label="Toggle light and dark theme"
      title="Toggle light and dark theme"
    >
      <Sun aria-hidden="true" className="hidden dark:block" />
      <Moon aria-hidden="true" className="block dark:hidden" />
    </Button>
  );
}
