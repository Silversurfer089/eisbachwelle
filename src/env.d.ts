/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /**
   * Basis-URL der Datendateien (current.json / history.json), mit abschließendem "/".
   * - Lokal/Default: "/data/" (Vite serviert public/data unter /data/).
   * - Produktion: Raw-URL des data-Branches, gesetzt im Deploy-Workflow, z. B.
   *   "https://raw.githubusercontent.com/<user>/<repo>/data/".
   */
  readonly VITE_DATA_BASE_URL?: string;
  /** GitHub-Repo-URL (im Deploy aus github.repository abgeleitet) für den Quellcode-Link. */
  readonly VITE_REPO_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
