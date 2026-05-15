/**
 * Inline boot script — runs in <head> before React hydrates so the dark
 * class is set on <html> before first paint. No FOUC.
 *
 * Reads `theme` from localStorage (values: "system" | "light" | "dark";
 * default "system") and combines with `matchMedia("(prefers-color-scheme:
 * dark)")` to decide whether to add `.dark` to the root element.
 *
 * Kept as a single string so Next.js inlines it verbatim. The runtime
 * `<ThemeProvider>` matches this logic exactly so first-paint and React
 * state stay in sync.
 */
const SCRIPT = `(function(){
  try {
    var stored = localStorage.getItem('theme');
    var mode = (stored === 'light' || stored === 'dark' || stored === 'system') ? stored : 'system';
    var systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var dark = mode === 'dark' || (mode === 'system' && systemDark);
    var root = document.documentElement;
    if (dark) { root.classList.add('dark'); } else { root.classList.remove('dark'); }
    root.style.colorScheme = dark ? 'dark' : 'light';
  } catch (e) {}
})();`;

export function ThemeScript() {
  // dangerouslySetInnerHTML is required to emit a script element with the
  // raw IIFE — it's a static, hard-coded constant under our control.
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
