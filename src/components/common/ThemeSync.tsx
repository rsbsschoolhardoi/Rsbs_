import { useEffect, useContext } from "react";
import { useTheme } from "next-themes";
import { AuthContext } from "@/contexts/AuthContext";

export function ThemeSync() {
  const { theme, setTheme } = useTheme();
  const context = useContext(AuthContext);
  const profile = context?.profile;

  useEffect(() => {
    if (!profile?.theme_preference) return;
    // Only apply if the stored/active theme differs — prevents infinite loops
    // and avoids overriding a theme the user just picked in the same session.
    const persisted = localStorage.getItem('theme');
    if (profile.theme_preference !== persisted || profile.theme_preference !== theme) {
      setTheme(profile.theme_preference);
      localStorage.setItem('theme', profile.theme_preference);
    }
  }, [profile?.theme_preference, setTheme, theme]);

  return null;
}
