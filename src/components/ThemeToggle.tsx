import { useState } from "react";
import { applyTheme, resolvedTheme, saveTheme, type Theme } from "../lib/storage";

applyTheme(resolvedTheme());

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => resolvedTheme());

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    saveTheme(next);
    setTheme(next);
  }

  const dark = theme === "dark";
  return (
    <button
      type="button"
      className="btn ghost theme-toggle"
      onClick={toggle}
      aria-pressed={dark}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Light theme" : "Dark theme"}
    >
      {dark ? "Light" : "Dark"}
    </button>
  );
}
