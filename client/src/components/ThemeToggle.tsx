// client/src/components/ThemeToggle.tsx
import { useEffect, useState } from "react";
import type { Theme } from "../theme";
import { getInitialTheme, applyTheme } from "../theme";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const isDark = theme === "dark";

  function toggle() {
    setTheme(isDark ? "light" : "dark");
  }

  return (
    <button
      type="button"
      className="ghost small"
      onClick={toggle}
      aria-label={isDark ? "Mudar para tema claro" : "Mudar para tema escuro"}
      title={isDark ? "Tema claro" : "Tema escuro"}
    >
      {isDark ? "🌞 Claro" : "🌙 Escuro"}
    </button>
  );
}
