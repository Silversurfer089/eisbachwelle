import { t } from "../i18n";
import type { CommunityStatus } from "../data/model";
import { VOTE_STATUSES } from "../data/model";
import { loadCommunityStatus, submitVote } from "../data/source";
import { el } from "./dom";
import { formatRelative } from "./format";

// Renders die optionale Community-Abstimmungs-Sektion.
// Wird nur angezeigt wenn VITE_LIVE_URL gesetzt ist (Worker konfiguriert).
// Hat keine Geschäftslogik: Präsentation + Event-Handling, sonst nichts.

// Keine Emojis – CSS-Farbpunkte passen besser zum sachlichen Design der App.

// LocalStorage-Key für Cooldown-Tracking (kein Login nötig).
const LS_KEY = "eisbach_last_vote";
const COOLDOWN_MS = 60 * 60 * 1000; // 1 Stunde

function canVote(): boolean {
  try {
    const last = localStorage.getItem(LS_KEY);
    return !last || Date.now() - Number(last) >= COOLDOWN_MS;
  } catch {
    return true;
  }
}

function markVoted(): void {
  try {
    localStorage.setItem(LS_KEY, String(Date.now()));
  } catch {
    // localStorage nicht verfügbar (z. B. Private Mode) → Cooldown entfällt
  }
}

function statusRow(cs: CommunityStatus, now: Date): HTMLElement {
  const c = t.community;
  const children: HTMLElement[] = [];

  if (cs.status && cs.total > 0) {
    children.push(
      el("span", { class: `community__dot community__dot--${cs.status}` }, []),
      el("span", { class: "community__status-text" }, [
        c.status[cs.status],
      ]),
      el("span", { class: "community__meta" }, [
        `· ${c.voteCount(cs.total)}`,
      ]),
    );
    if (cs.lastVoteAt) {
      children.push(
        el("span", { class: "community__meta" }, [
          `· ${c.lastVote(formatRelative(cs.lastVoteAt, now))}`,
        ]),
      );
    }
  } else {
    children.push(el("span", { class: "community__no-votes" }, [c.noVotes]));
  }

  return el("div", { class: "community__status-row" }, children);
}

export interface CommunitySection {
  element: HTMLElement;
  update(cs: CommunityStatus | null): void;
}

export function createCommunitySection(): CommunitySection {
  const body = el("div", { class: "community__body" });
  const feedback = el("p", { class: "community__feedback", hidden: "" });

  const element = el("section", { class: "community", "aria-label": t.community.title }, [
    el("h2", { class: "community__title" }, [t.community.title]),
    body,
    feedback,
    el("p", { class: "community__disclaimer" }, [t.community.disclaimer]),
  ]);

  function showFeedback(msg: string, ok: boolean): void {
    feedback.textContent = msg;
    feedback.className = `community__feedback${ok ? "" : " community__feedback--warn"}`;
    feedback.removeAttribute("hidden");
    window.setTimeout(() => feedback.setAttribute("hidden", ""), 3500);
  }

  function renderVoteButtons(): HTMLElement {
    const wrap = el("div", { class: "community__vote-row" }, []);
    const off = !canVote();

    for (const s of VOTE_STATUSES) {
      const btn = el(
        "button",
        {
          class: `community__vote-btn community__vote-btn--${s}`,
          type: "button",
          title: t.community.statusHint[s],
          "aria-label": t.community.status[s],
          ...(off ? { disabled: "" } : {}),
        },
        [t.community.status[s]],
      );
      if (!off) {
        btn.addEventListener("click", () => {
          void (async () => {
            // Alle Buttons sofort deaktivieren → kein Doppelklick.
            wrap.querySelectorAll("button").forEach((b) =>
              b.setAttribute("disabled", ""),
            );
            const result = await submitVote(s);
            if (result === "ok") {
              markVoted();
              showFeedback(t.community.thanks, true);
              // Status aktualisieren.
              const fresh = await loadCommunityStatus();
              update(fresh);
            } else if (result === "cooldown") {
              showFeedback(t.community.cooldown, false);
            } else {
              showFeedback(t.community.error, false);
              // Buttons wieder freischalten bei Fehler.
              wrap.querySelectorAll("button").forEach((b) =>
                b.removeAttribute("disabled"),
              );
            }
          })();
        });
      }
      wrap.appendChild(btn);
    }
    return wrap;
  }

  function update(cs: CommunityStatus | null): void {
    if (!cs) {
      // Worker nicht erreichbar oder nicht konfiguriert → Sektion ausblenden.
      element.setAttribute("hidden", "");
      return;
    }
    element.removeAttribute("hidden");
    body.replaceChildren(statusRow(cs, new Date()), renderVoteButtons());
  }

  // Initial ausgeblendet bis update() aufgerufen wird.
  element.setAttribute("hidden", "");

  return { element, update };
}
