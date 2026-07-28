/**
 * Helper to ensure DOM initialization logic runs regardless of whether
 * DOMContentLoaded has already fired (common in module scripts & Astro).
 */
export function onDOMReady(fn: () => void): void {
  if (typeof document === "undefined") return;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn);
  } else {
    fn();
  }
}

/**
 * Escapes HTML characters in user-provided text to prevent XSS vulnerabilities
 * when setting innerHTML.
 */
export function escapeHtml(str: string | null | undefined): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
