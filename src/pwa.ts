import { registerSW } from "virtual:pwa-register";
import { t } from "./i18n";
import { el } from "./ui/dom";

// Service-Worker-Registrierung + unaufdringlicher "Neue Version"-Hinweis.
// registerType ist "prompt": Updates werden NICHT automatisch eingespielt, sondern
// erst nach Bestätigung durch die Nutzerin (kein überraschender Reload).

function showUpdateToast(onUpdate: () => void): void {
  if (document.querySelector(".toast")) return;

  const button = el("button", { class: "toast__action", type: "button" }, [
    t.update.action,
  ]);
  button.addEventListener("click", onUpdate);

  const toast = el(
    "div",
    { class: "toast", role: "status", "aria-live": "polite" },
    [el("span", {}, [t.update.available]), button],
  );
  document.body.append(toast);
}

export function initPwa(): void {
  const updateSW = registerSW({
    onNeedRefresh() {
      showUpdateToast(() => {
        void updateSW(true); // aktiviert neuen SW und lädt neu
      });
    },
  });
}
