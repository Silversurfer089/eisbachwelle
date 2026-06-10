import {
  communityConfigured,
  loadCurrent,
  loadHistory,
  loadCommunityStatus,
  loadNews,
} from "./data/source";
import { withCurrentReadings } from "./data/domain/series";
import type { CommunityStatus, HistoryData } from "./data/model";
import { present, type DashboardVM } from "./ui/present";
import {
  renderDashboard,
  renderForecast,
  renderFooter,
  renderAbout,
} from "./ui/dashboard";
import { renderContextPanel } from "./ui/context-panel";
import { renderWaveAnatomy } from "./ui/wave-anatomy";
import { createHistorySection, type HistorySection } from "./ui/history";
import { createCommunitySection, type CommunitySection } from "./ui/community";
import { createNewsSection, type NewsSection } from "./ui/news";
import { el } from "./ui/dom";
import { t, onLangChange } from "./i18n";

// Lädt alle 5 Min neu (Quelle liefert ~15-Min-Werte; kein Sekundentakt).
const REFRESH_MS = 5 * 60_000;

let lastVM: DashboardVM | null = null;
let lastHistory: HistoryData | null = null;
let lastCommunity: CommunityStatus | null = null;
let timer: number | undefined;

// Persistente Shell-Teile (einmal gebaut, dann nur aktualisiert).
// Reihenfolge: Dashboard → Einordnung → Vorhersage → Verlauf → Über → Fuß.
let dashSlot: HTMLElement | null = null;
let contextSlot: HTMLElement | null = null;
let communitySection: CommunitySection | null = null;
let forecastSlot: HTMLElement | null = null;
let historySection: HistorySection | null = null;
let newsSection: NewsSection | null = null;
let rootEl: HTMLElement | null = null;

/** Setzt die Shell zurück, sodass sie (z. B. nach Sprachwechsel) neu aufgebaut wird. */
function resetShell(): void {
  dashSlot = null;
  contextSlot = null;
  communitySection = null;
  forecastSlot = null;
  historySection = null;
  newsSection = null;
}

function renderMessage(
  root: HTMLElement,
  text: string,
  variant: "loading" | "error",
  retry?: () => void,
): void {
  const children: HTMLElement[] = [
    el(
      "p",
      {
        class: `message ${variant === "error" ? "message--error" : ""}`,
        role: variant === "error" ? "alert" : "status",
      },
      [text],
    ),
  ];
  if (retry) {
    const button = el("button", { class: "retry", type: "button" }, [
      t.status.retry,
    ]);
    button.addEventListener("click", retry);
    children.push(button);
  }
  root.replaceChildren(
    el("div", { class: "app-shell app-shell--message" }, children),
  );
}

function ensureShell(root: HTMLElement): void {
  if (
    dashSlot &&
    contextSlot &&
    communitySection &&
    forecastSlot &&
    historySection &&
    root.contains(dashSlot)
  )
    return;
  dashSlot = el("div", { class: "dash-slot" });
  contextSlot = el("div", { class: "context-slot" });
  communitySection = createCommunitySection();
  forecastSlot = el("div", { class: "forecast-slot" });
  historySection = createHistorySection();
  newsSection = createNewsSection();
  root.replaceChildren(
    el("div", { class: "app-shell" }, [
      dashSlot,
      contextSlot,
      communitySection.element,
      forecastSlot,
      historySection.element,
      newsSection.element,
      renderWaveAnatomy(),
      renderAbout(),
      renderFooter(),
    ]),
  );
}

/** Rendert die live aktualisierten Teile aus dem aktuellen View-Model. */
function paint(history: HistoryData): void {
  dashSlot!.replaceChildren(renderDashboard(lastVM!));
  contextSlot!.replaceChildren(renderContextPanel(lastVM!));
  const fc = renderForecast(lastVM!);
  forecastSlot!.replaceChildren(...(fc ? [fc] : []));
  historySection!.update(history);
}

/**
 * Aktualisiert den Community-Status separat (optional, kein Fehler wenn nicht
 * verfügbar). Kurze Netz-Aussetzer direkt nach dem Laden werden mit bis zu zwei
 * Wiederholungen überbrückt; schlagen alle fehl, bleibt der letzte bekannte
 * Stand dieser Sitzung stehen, statt die Sektion grundlos auszublenden.
 */
async function refreshCommunity(): Promise<void> {
  if (!communitySection || !communityConfigured()) return;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 1500 * attempt));
    const cs = await loadCommunityStatus();
    if (cs) {
      lastCommunity = cs;
      communitySection?.update(cs);
      return;
    }
  }
  communitySection?.update(lastCommunity);
}

/** Aktualisiert den News-Feed separat (optional; ohne Datei bleibt die Sektion versteckt). */
async function refreshNews(): Promise<void> {
  if (!newsSection) return;
  newsSection.update(await loadNews());
}

async function refresh(root: HTMLElement): Promise<void> {
  try {
    const [current, rawHistory] = await Promise.all([
      loadCurrent(),
      loadHistory(),
    ]);
    // Aktuellen Messwert (inkl. Near-Live) an die Cron-Historie anhängen,
    // damit Trend, Einordnung und Verlaufs-Chart bis "jetzt" reichen.
    const history = withCurrentReadings(rawHistory, current);
    lastVM = present(current, history);
    lastHistory = history;
    ensureShell(root);
    paint(history);
    void refreshCommunity();
    void refreshNews();
  } catch (err) {
    console.warn("[eisbach] Aktualisierung fehlgeschlagen:", err);
    if (lastVM && lastHistory) {
      // Letzten guten Stand behalten; das Stale-Badge entsteht aus dem Alter.
      ensureShell(root);
      paint(lastHistory);
    } else {
      renderMessage(
        root,
        t.status.loadError,
        "error",
        () => void refresh(root),
      );
    }
  }
}

export async function startApp(root: HTMLElement): Promise<void> {
  rootEl = root;
  renderMessage(root, t.status.loading, "loading");
  await refresh(root);

  if (timer !== undefined) window.clearInterval(timer);
  timer = window.setInterval(() => void refresh(root), REFRESH_MS);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void refresh(root);
  });

  // Sprachwechsel: Shell neu aufbauen (Tab-Labels etc. werden einmalig erzeugt).
  onLangChange(() => {
    if (!rootEl) return;
    resetShell();
    if (lastVM && lastHistory) {
      ensureShell(rootEl);
      paint(lastHistory);
    } else {
      void refresh(rootEl);
    }
  });
}
