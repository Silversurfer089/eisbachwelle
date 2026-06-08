/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// Auf GitHub Pages liegt die App unter https://<user>.github.io/<repo>/.
// Der Basis-Pfad wird daher über die Umgebungsvariable BASE_PATH gesetzt
// (im Deploy-Workflow z. B. "/eisbachwelle/"). Lokal ist "/" korrekt.
const base = process.env.BASE_PATH ?? "/";

// Content-Security-Policy nur im Produktions-Build als <meta> einsetzen (nicht im Dev,
// da Vites HMR Inline-Skripte/WS bräuchte). Härtet die statische, datenlose Seite ab.
const CSP = [
  "default-src 'self'",
  "img-src 'self' data:",
  "style-src 'self' 'unsafe-inline'", // Inline-style-Attribute (Balken/Gauge)
  "script-src 'self'",
  "connect-src 'self' https://raw.githubusercontent.com", // Live-Daten (data-Branch)
  "manifest-src 'self'",
  "worker-src 'self'",
  "base-uri 'self'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join("; ");

const cspPlugin = {
  name: "csp-meta",
  apply: "build" as const,
  transformIndexHtml(html: string) {
    return html.replace(
      "</title>",
      `</title>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
    );
  },
};

export default defineConfig({
  base,
  build: {
    target: "es2022",
    sourcemap: true,
  },
  plugins: [
    cspPlugin,
    VitePWA({
      registerType: "prompt",
      injectRegister: false, // Registrierung erfolgt manuell in pwa.ts (CSP-freundlich)
      includeAssets: ["icons/*.png", "favicon.svg"],
      manifest: {
        name: "Eisbachwelle München",
        short_name: "Eisbachwelle",
        description:
          "Live-Zustand der Eisbachwelle: Abfluss, Pegel, Wasser- und Lufttemperatur.",
        lang: "de",
        theme_color: "#1a1a2e",
        background_color: "#1a1a2e",
        display: "standalone",
        start_url: ".",
        scope: ".",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        runtimeCaching: [
          {
            // Datendateien: stale-while-revalidate, damit offline der letzte
            // bekannte Stand sofort verfügbar ist und im Hintergrund aktualisiert wird.
            urlPattern: ({ url }) => url.pathname.endsWith(".json"),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "eisbach-data",
              expiration: { maxEntries: 16, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: "jsdom",
    globals: true,
    // Tests folgen in M2 (test-first für die Datenschicht). Bis dahin soll der
    // Runner nicht rot sein, nur weil noch keine Testdateien existieren.
    passWithNoTests: true,
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/data/**"],
    },
  },
});
