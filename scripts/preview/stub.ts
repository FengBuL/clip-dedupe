/* A tiny stand-in for the Obsidian API, just enough to render the plugin's views in a plain browser for screenshots. */
declare const ICONS: Record<string, string>;
type Opts = string | { cls?: string | string[]; text?: string; attr?: Record<string, string>; value?: string };

function create(this: Element | void, tag: string, o: Opts = {}): HTMLElement {
  const el = document.createElement(tag);
  const opts = typeof o === "string" ? { cls: o } : o;
  if (opts.cls) el.className = Array.isArray(opts.cls) ? opts.cls.join(" ") : opts.cls;
  if (opts.text !== undefined) el.textContent = opts.text;
  if (opts.attr) for (const k of Object.keys(opts.attr)) el.setAttribute(k, opts.attr[k]);
  if (opts.value !== undefined) (el as HTMLOptionElement).value = opts.value;
  if (this && (this as Element).appendChild) (this as Element).appendChild(el);
  return el;
}
const P = Element.prototype as unknown as Record<string, unknown>;
P.createEl = function (this: Element, tag: string, o?: Opts) { return create.call(this, tag, o); };
P.createDiv = function (this: Element, o?: Opts) { return create.call(this, "div", o); };
P.createSpan = function (this: Element, o?: Opts) { return create.call(this, "span", o); };
P.empty = function (this: Element) { while (this.firstChild) this.removeChild(this.firstChild); };
P.setText = function (this: Element, t: string) { this.textContent = t; };
P.addClass = function (this: Element, ...c: string[]) { this.classList.add(...c.flatMap((x) => x.split(" ")).filter(Boolean)); };
P.removeClass = function (this: Element, ...c: string[]) { this.classList.remove(...c); };
P.toggleClass = function (this: Element, c: string, v: boolean) { this.classList.toggle(c, v); };
P.setAttr = function (this: Element, k: string, v: string) { this.setAttribute(k, v); };
P.setCssProps = function (this: HTMLElement, props: Record<string, string>) { for (const k of Object.keys(props)) this.style.setProperty(k, props[k]); };
P.hide = function (this: HTMLElement) { this.style.display = "none"; };
P.show = function (this: HTMLElement) { this.style.display = ""; };
(HTMLElement.prototype as unknown as Record<string, unknown>).isShown = function () { return true; };
const g = window as unknown as Record<string, unknown>;
g.createSpan = (o?: Opts) => create("span", o);
g.createDiv = (o?: Opts) => create("div", o);
g.createEl = (t: string, o?: Opts) => create(t, o);

export class ItemView {
  app: unknown; contentEl: HTMLElement; containerEl: HTMLElement; leaf: unknown;
  constructor(leaf: { app: unknown }) { this.leaf = leaf; this.app = leaf.app; this.contentEl = document.createElement("div"); this.containerEl = this.contentEl; }
  registerInterval(id: number) { return id; }
  registerDomEvent(el: EventTarget, t: string, f: EventListener, o?: boolean | AddEventListenerOptions) { el.addEventListener(t, f, o); }
}
export class Modal {
  app: unknown; modalEl: HTMLElement; contentEl: HTMLElement; titleEl: HTMLElement; private root: HTMLElement;
  constructor(app: unknown) {
    this.app = app;
    this.root = document.createElement("div"); this.root.className = "modal-container";
    this.root.appendChild(Object.assign(document.createElement("div"), { className: "modal-bg" }));
    this.modalEl = document.createElement("div"); this.modalEl.className = "modal";
    this.titleEl = document.createElement("div"); this.titleEl.className = "modal-title";
    this.contentEl = document.createElement("div"); this.contentEl.className = "modal-content";
    this.modalEl.append(this.titleEl, this.contentEl); this.root.appendChild(this.modalEl);
  }
  setTitle(t: string) { this.titleEl.textContent = t; return this; }
  open() { document.body.appendChild(this.root); void (this as unknown as { onOpen?: () => unknown }).onOpen?.(); }
  close() { this.root.remove(); (this as unknown as { onClose?: () => void }).onClose?.(); }
}
export class Notice { constructor(m: string) { console.log("NOTICE", m); } setMessage(_m: string) { return this; } hide() {} }
export class TFile {}
export class TAbstractFile {}
export class Plugin {}
export class PluginSettingTab {}
export class Setting {}
export class WorkspaceLeaf {}
export type App = unknown;
export function setIcon(el: HTMLElement, name: string) {
  const svg = ICONS[name];
  if (!svg) { console.warn("missing icon", name); return; }
  el.insertAdjacentHTML("beforeend", svg.replace("<svg", `<svg class="svg-icon lucide-${name}"`));
}
export const moment = { locale: () => new URLSearchParams(location.search).get("lang") ?? "zh-cn" };
export function normalizePath(p: string) { return p; }
export function debounce<T extends (...a: never[]) => unknown>(f: T) { return f; }
export const Platform = { get isMobile() { return document.body.classList.contains("is-mobile"); } };
