export const THEMES = ["earth", "ocean", "lavender"] as const;
export type Theme = (typeof THEMES)[number];

export function getThemeClass(theme: Theme): string {
  return `theme-${theme}`;
}

export function setThemeCookie(theme: Theme) {
  document.cookie = `journal-theme=${theme};path=/;max-age=31536000;samesite=lax`;
}

export function getThemeFromCookie(cookieStr: string): Theme {
  const match = cookieStr.match(/journal-theme=(earth|ocean|lavender)/);
  return (match?.[1] as Theme) || "earth";
}
