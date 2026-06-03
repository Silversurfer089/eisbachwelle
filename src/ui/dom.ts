// Winziger DOM-Helfer, um ohne Framework sicher Elemente zu bauen (kein innerHTML
// mit Daten → kein XSS-Risiko). Bewusst minimal gehalten.

type Attrs = Record<string, string>;
type Child = Node | string;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  children: Child[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else node.setAttribute(k, v);
  }
  for (const c of children) {
    node.append(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return node;
}

/** Setzt statisches (nicht datengetriebenes) SVG-Markup als Icon. */
export function svgIcon(markup: string, label?: string): HTMLSpanElement {
  const span = document.createElement("span");
  span.className = "icon";
  span.innerHTML = markup;
  if (label) span.setAttribute("aria-label", label);
  else span.setAttribute("aria-hidden", "true");
  return span;
}

export function clear(node: HTMLElement): void {
  node.replaceChildren();
}
