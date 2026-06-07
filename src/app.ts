import { loadCurrent, loadHistory } from "./data/source";
import type { HistoryData } from "./data/model";
import { present, type DashboardVM } from "./ui/present";
import { renderDashboard, renderFooter, renderAbout } from "./ui/dashboard";
import { renderContextPanel } from "./ui/context-panel";
import { createHistorySection, type HistorySection } from "./ui/history";
import { el } from "./ui/dom";
import { de } from "./i18n/de";

// Lädt alle 5 Min neu (Quelle liefert ~15-Min-Werte; kein Sekundentakt).
const REFRESH_MS = 5 * 60_000;

let lastVM: DashboardVM | null = null;
let lastHistory: HistoryData | null = null;
let timer: number | undefined;

// Persistente Shell-Teile (einmal gebaut, dann nur aktualisiert).
let dashSlot: HTMLElement | null = null;
let contextSlot: HTMLElement | null = null;
let historySection: HistorySection | null = null;

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
      de.status.retry,
    ]);
    button.addEventListener("click", retry);
    children.push(button);
  }
  root.replaceChildren(
    el("div", { class: "app-shell app-shell--message" }, children),
  );
}

function ensureShell(root: HTMLElement): void {
  if (dashSlot && contextSlot && historySection && root.contains(dashSlot))
    return;
  dashSlot = el("div", { class: "dash-slot" });
  contextSlot = el("div", { class: "context-slot" });
  historySection = createHistorySection();
  root.replaceChildren(
    el("div", { class: "app-shell" }, [
      dashSlot,
      contextSlot,
      historySection.element,
      renderAbout(),
      renderFooter(),
    ]),
  );
}

async function refresh(root: HTMLElement): Promise<void> {
  try {
    const [current, history] = await Promise.all([
      loadCurrent(),
      loadHistory(),
    ]);
    lastVM = present(current, history);
    lastHistory = history;
    ensureShell(root);
    dashSlot!.replaceChildren(renderDashboard(lastVM));
    contextSlot!.replaceChildren(renderContextPanel(lastVM));
    historySection!.update(history);
  } catch (err) {
    console.warn("[eisbach] Aktualisierung fehlgeschlagen:", err);
    if (lastVM && lastHistory) {
      // Letzten guten Stand behalten; das Stale-Badge entsteht aus dem Alter.
      ensureShell(root);
      dashSlot!.replaceChildren(renderDashboard(lastVM));
      contextSlot!.replaceChildren(renderContextPanel(lastVM));
      historySection!.update(lastHistory);
    } else {
      renderMessage(
        root,
        de.status.loadError,
        "error",
        () => void refresh(root),
      );
    }
  }
}

export async function startApp(root: HTMLElement): Promise<void> {
  renderMessage(root, de.status.loading, "loading");
  await refresh(root);

  if (timer !== undefined) window.clearInterval(timer);
  timer = window.setInterval(() => void refresh(root), REFRESH_MS);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void refresh(root);
  });
}
