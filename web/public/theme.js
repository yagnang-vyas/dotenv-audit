// Applies the saved or system colour theme before first paint. Kept as a
// separate file so the Content-Security-Policy can forbid inline scripts.
// Only the theme choice is ever stored; editor contents never are.
(function () {
  var theme;
  try {
    theme = window.localStorage.getItem('dotenv-audit:theme');
  } catch {
    theme = null;
  }
  var dark =
    theme === 'dark' ||
    (theme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
})();
