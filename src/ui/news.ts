import type { NewsItem } from "../data/model";
import { freshNews } from "../data/domain/news";
import { t } from "../i18n";
import { dtf } from "./format";
import { el } from "./dom";

// News-Feed (Phase 1): Schlagzeile + Quelle + Datum, Link zur Originalquelle.
// Keine Neuigkeiten = keine Sektion (komplett ausgeblendet).

export interface NewsSection {
  element: HTMLElement;
  update(items: NewsItem[] | null): void;
}

function newsRow(item: NewsItem): HTMLElement {
  const date = dtf({
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Berlin",
  }).format(Date.parse(item.t));
  return el("li", { class: "news__item" }, [
    el(
      "a",
      {
        class: "news__link",
        href: item.url,
        target: "_blank",
        rel: "noopener noreferrer",
      },
      [item.title],
    ),
    el("span", { class: "news__meta" }, [`${date} · ${item.source}`]),
  ]);
}

export function createNewsSection(): NewsSection {
  const list = el("ul", { class: "news__list" });
  const element = el("section", { class: "news", "aria-label": t.news.title }, [
    el("h2", { class: "news__title" }, [t.news.title]),
    list,
    el("p", { class: "news__note" }, [t.news.note]),
  ]);
  element.setAttribute("hidden", "");

  return {
    element,
    update(items: NewsItem[] | null): void {
      const fresh = freshNews(items ?? []);
      if (fresh.length === 0) {
        element.setAttribute("hidden", "");
        return;
      }
      list.replaceChildren(...fresh.map(newsRow));
      element.removeAttribute("hidden");
    },
  };
}
