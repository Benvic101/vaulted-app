const THEME_KEY = 'vaulted-theme';

// Reads the saved theme, defaults to "dark" if nothing's been chosen yet
export function getTheme() {
  return localStorage.getItem(THEME_KEY) || 'dark';
}

// Saves the choice and applies it as a class on <html>, so CSS can react to it later
export function setTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
  document.documentElement.classList.toggle('light-theme', theme === 'light');
}