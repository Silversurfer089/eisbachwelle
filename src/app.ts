import { loadCurrent, loadHistory } from "./data/source";
import { present, type DashboardVM } from "./ui/present";
import { renderDashboard } from "./ui/dashboard";
import { el } from "./ui/dom";
import { de } from "./i18n/de";

// Lädt alle 5 Min neu (Quelle liefert ~15-Min-Werte; kein Sekundentakt).
const REFRESH_MS = 5 * 60_000;

let lastVM: DashboardVM | null = null;
let timer: number | undefined;

function renderLoading(root: HTMLElement): void {
  root.replaceChildren(
    el("div", { class: "app-shell app-shell--message" }, [
      el("p", { class: "message", role: "status" }, [de.status.loading]),
    ]),
  );
}

function renderError(root: HTMLElement, retry: () => void): void {
  const button = el("button", { class: "retry", type: "button" }, [
    de.status.retry,
  ]);
  button.addEventListener("click", retry);
  root.replaceChildren(
    el("div", { class: "app-shell app-shell--message" }, [
      el("p", { class: "message message--error", role: "alert" }, [
        de.status.loadError,
      ]),
      button,
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
    root.replaceChildren(renderDashboard(lastVM));
  } catch (err) {
    console.warn("[eisbach] Aktualisierung fehlgeschlagen:", err);
    if (lastVM) {
      // Letzten guten Stand behalten; das Stale-Badge entsteht aus dem Alter.
      root.replaceChildren(renderDashboard(lastVM));
    } else {
      renderError(root, () => void refresh(root));
    }
  }
}

export async function startApp(root: HTMLElement): Promise<void> {
  renderLoading(root);
  await refresh(root);

  if (timer !== undefined) window.clearInterval(timer);
  timer = window.setInterval(() => void refresh(root), REFRESH_MS);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void refresh(root);
  });
}
