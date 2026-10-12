import { ItemView, Platform, WorkspaceLeaf, setIcon } from "obsidian";
import type ClipDedupePlugin from "./main";
import type { DupGroup, OverlapPair } from "./core/group";
import { groupItem } from "./core/plan";
import { StrKey, t } from "./i18n";
import type { ScanProgress } from "./scanner";
import { HelpManager, baseName, fmtFull, fmtNum, folderOf, iconButton, srLabel } from "./ui";

export const VIEW_TYPE_CLIP_DEDUPE = "clip-dedupe-view";

type Tab = "groups" | "pairs";
type Sort = "reclaim" | "count" | "newest";
type Filter = "all" | "text" | "post";

const PAGE = 30;
const SVG_NS = "http://www.w3.org/2000/svg";
let sortSeq = 0;

export class ClipDedupeView extends ItemView {
  plugin: ClipDedupePlugin;
  private tab: Tab = "groups";
  private sort: Sort = "reclaim";
  private filter: Filter = "all";
  private limit = PAGE;
  private pairLimit = PAGE;
  private selected = new Set<string>();
  private keepChoice = new Map<string, number>();
  private expanded = new Set<string>();
  private allPlaces = new Set<string>();
  private renderedVersion = -1;
  private blockText = new Map<string, string | null>();
  private help = new HelpManager();
  private headerActions!: HTMLElement;
  private bodyEl!: HTMLElement;
  private subtitleEl!: HTMLElement;
  private progressEl: HTMLElement | null = null;
  private progressFill: HTMLElement | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: ClipDedupePlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_CLIP_DEDUPE;
  }
  getDisplayText(): string {
    return t("pluginName");
  }
  getIcon(): string {
    return "layers";
  }

  async onOpen() {
    const root = this.contentEl;
    root.empty();
    root.addClass("cd-root");
    if (Platform.isMobile) root.addClass("is-mobile");
    const shell = root.createDiv({ cls: "cd-shell" });

    const header = shell.createDiv({ cls: "cd-header" });
    const brand = header.createDiv({ cls: "cd-brand" });
    setIcon(brand.createDiv({ cls: "cd-brand-badge", attr: { "aria-hidden": "true" } }), "layers");
    const titleWrap = brand.createDiv({ cls: "cd-header-text" });
    titleWrap.createEl("h1", { cls: "cd-title", text: t("pluginName") });
    this.subtitleEl = titleWrap.createDiv({ cls: "cd-subtitle", text: t("subtitle") });
    this.headerActions = header.createDiv({ cls: "cd-header-actions" });
    this.bodyEl = shell.createDiv({ cls: "cd-body" });

    // A bubble hides again on scroll or when anything else is clicked (touch screens have no hover)
    this.registerDomEvent(root, "scroll", () => this.help.hide(), { capture: true });
    this.registerDomEvent(root.ownerDocument, "pointerdown", (e: Event) => {
      if (!(e.target as HTMLElement | null)?.closest?.(".cd-help")) this.help.hide();
    });
    this.refresh();
  }

  async onClose() {
    this.help.destroy();
    this.contentEl.empty();
  }

  /* ================= state changes pushed by the plugin ================= */

  refresh() {
    if (!this.bodyEl) return;
    this.renderHeader();
    const p = this.plugin;
    if (p.analysis && this.renderedVersion !== p.analysisVersion) {
      this.renderedVersion = p.analysisVersion;
      this.selected.clear();
      this.keepChoice.clear();
      this.expanded.clear();
      this.allPlaces.clear();
      this.blockText.clear();
      this.limit = PAGE;
      this.pairLimit = PAGE;
      this.renderBody();
    } else if (!p.analysis) {
      this.renderBody();
    } else if (p.scanning) {
      // keep showing the previous result while rescanning
    }
    this.contentEl.toggleClass("is-scanning", p.scanning);
  }

  setProgress(pr: ScanProgress) {
    const label = pr.phase === "read" ? t("scanningProgress", pr.done, pr.total) : t("grouping");
    const status = this.headerActions?.querySelector(".cd-status");
    if (status) status.textContent = label;
    if (this.progressEl) {
      const text = this.progressEl.querySelector(".cd-loading-text");
      if (text) text.textContent = label;
    }
    this.progressFill?.setCssProps({ "--cd-progress": `${Math.round((pr.done / Math.max(1, pr.total)) * 100)}%` });
  }

  /* ================= header ================= */

  private renderHeader() {
    const p = this.plugin;
    const a = this.headerActions;
    a.empty();
    const status = a.createSpan({ cls: "cd-status", attr: { role: "status" } });
    if (p.scanning) status.setText(t("scanning"));
    else if (p.stale && p.analysis) {
      status.addClass("is-stale");
      status.setText(t("stale"));
    } else if (p.analysis) {
      const d = new Date(p.scannedAt);
      status.setText(t("scannedAt", d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })));
    }
    if (p.latestBackup && !p.scanning) {
      const undo = a.createEl("button", { cls: "cd-btn", attr: { type: "button" } });
      setIcon(undo.createSpan({ cls: "cd-btn-icon", attr: { "aria-hidden": "true" } }), "undo-2");
      undo.createSpan({ cls: "cd-btn-label", text: t("undoLast") });
      undo.addEventListener("click", () => void p.undoLast());
    }
    if (p.scanning) {
      const c = a.createEl("button", { cls: "cd-btn", text: t("cancel"), attr: { type: "button" } });
      c.addEventListener("click", () => p.cancelScan());
    } else {
      const s = a.createEl("button", { cls: "cd-btn is-primary", attr: { type: "button" } });
      setIcon(s.createSpan({ cls: "cd-btn-icon", attr: { "aria-hidden": "true" } }), p.analysis ? "refresh-cw" : "play");
      s.createSpan({ cls: "cd-btn-label", text: p.analysis ? t("rescan") : t("scan") });
      s.addEventListener("click", () => void p.scan());
    }
    iconButton(a, "settings", t("settings"), () => p.openSettings());
  }

  /* ================= body ================= */

  private renderBody() {
    const body = this.bodyEl;
    this.help.hide();
    body.empty();
    this.progressEl = null;
    this.progressFill = null;
    const p = this.plugin;
    if (!p.analysis) {
      if (p.scanning) this.renderLoading(body);
      else this.renderIdle(body);
      return;
    }
    const a = p.analysis;
    this.renderTop(body);
    if (a.groups.length === 0 && a.pairs.length === 0) {
      const card = body.createDiv({ cls: "cd-card cd-fullempty" });
      this.emptyState(card, "check-circle", t("noneTitle"), t("noneText"));
      const b = card.createEl("button", { cls: "cd-btn", text: t("openSettings"), attr: { type: "button" } });
      b.addEventListener("click", () => p.openSettings());
      return;
    }
    this.renderTabs(body);
    if (this.tab === "groups") this.renderGroups(body);
    else this.renderPairs(body);
  }

  private renderLoading(parent: HTMLElement) {
    const card = parent.createDiv({ cls: "cd-card cd-loading", attr: { role: "status" } });
    card.createDiv({ cls: "cd-spinner" });
    card.createDiv({ cls: "cd-loading-text", text: t("scanning") });
    const bar = card.createDiv({ cls: "cd-progress" });
    this.progressFill = bar.createDiv({ cls: "cd-progress-fill" });
    this.progressEl = card;
  }

  private renderIdle(parent: HTMLElement) {
    const card = parent.createDiv({ cls: "cd-card cd-fullempty cd-idle" });
    this.emptyState(card, "layers", t("idleTitle"), t("idleText"));
    const b = card.createEl("button", { cls: "cd-btn is-primary", text: t("startScan"), attr: { type: "button" } });
    b.addEventListener("click", () => void this.plugin.scan());
  }

  private emptyState(parent: HTMLElement, icon: string, title: string, text: string) {
    const e = parent.createDiv({ cls: "cd-empty" });
    setIcon(e.createDiv({ cls: "cd-empty-icon", attr: { "aria-hidden": "true" } }), icon);
    e.createDiv({ cls: "cd-empty-title", text: title });
    e.createDiv({ cls: "cd-empty-text", text });
  }

  /** Hero card with the headline number, and four supporting cards. */
  private renderTop(parent: HTMLElement) {
    const a = this.plugin.analysis;
    if (!a) return;
    const top = parent.createDiv({ cls: "cd-top" });
    const hero = top.createDiv({ cls: "cd-card cd-hero" });
    const head = hero.createDiv({ cls: "cd-hero-head" });
    const title = head.createDiv({ cls: "cd-card-title" });
    setIcon(title.createSpan({ cls: "cd-card-icon", attr: { "aria-hidden": "true" } }), "layers");
    title.createSpan({ text: t("heroTitle") });
    this.help.attach(title, t("heroHelp"));
    const main = hero.createDiv({ cls: "cd-hero-main" });
    const text = main.createDiv({ cls: "cd-hero-text" });
    const num = text.createDiv({ cls: "cd-num cd-num-hero" });
    num.createSpan({ cls: "cd-num-value", text: fmtNum(a.totals.reclaimChars) });
    num.createSpan({ cls: "cd-num-unit", text: t("heroChars") });
    text.createDiv({ cls: "cd-hero-note", text: t("heroSummary", fmtNum(a.totals.reclaimWords), fmtFull(a.totals.groups)) });
    this.ring(main, a.totals.ratio);

    const kpis = top.createDiv({ cls: "cd-kpis" });
    const kpi = (icon: string, label: StrKey, help: StrKey, value: string) => {
      const c = kpis.createDiv({ cls: "cd-card cd-kpi" });
      const h = c.createDiv({ cls: "cd-kpi-top" });
      setIcon(h.createSpan({ cls: "cd-kpi-icon", attr: { "aria-hidden": "true" } }), icon);
      h.createSpan({ cls: "cd-label", text: t(label) });
      this.help.attach(h, t(help));
      c.createDiv({ cls: "cd-num cd-num-lg" }).createSpan({ cls: "cd-num-value", text: value });
    };
    kpi("files", "kpiNotes", "kpiNotesHelp", fmtFull(a.totals.notes));
    kpi("copy", "kpiGroups", "kpiGroupsHelp", fmtFull(a.totals.groups));
    kpi("text", "kpiBlocks", "kpiBlocksHelp", fmtFull(a.totals.blocks));
    kpi("whole-word", "kpiWords", "kpiWordsHelp", fmtNum(a.totals.reclaimWords));
  }

  private ring(parent: HTMLElement, ratio: number) {
    const size = 112;
    const stroke = 12;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const shown = ratio <= 0 ? 0 : Math.max(0.02, Math.min(1, ratio));
    const wrap = parent.createDiv({ cls: "cd-ring" });
    const doc = wrap.ownerDocument;
    const svg = doc.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
    svg.setAttribute("aria-hidden", "true");
    const mk = (cls: string, dash?: string) => {
      const el = doc.createElementNS(SVG_NS, "circle");
      el.setAttribute("cx", String(size / 2));
      el.setAttribute("cy", String(size / 2));
      el.setAttribute("r", String(r));
      el.setAttribute("fill", "none");
      el.setAttribute("stroke-width", String(stroke));
      el.setAttribute("class", cls);
      if (dash) {
        el.setAttribute("stroke-dasharray", dash);
        el.setAttribute("stroke-linecap", "round");
        el.setAttribute("transform", `rotate(-90 ${size / 2} ${size / 2})`);
      }
      svg.appendChild(el);
    };
    mk("cd-ring-track");
    if (shown > 0) mk("cd-ring-value", `${(c * shown).toFixed(2)} ${c.toFixed(2)}`);
    wrap.appendChild(svg);
    const center = wrap.createDiv({ cls: "cd-ring-center" });
    const pct = ratio * 100;
    center.createDiv({ cls: "cd-ring-num", text: `${pct >= 10 ? Math.round(pct) : pct.toFixed(1)}%` });
    center.createDiv({ cls: "cd-ring-caption", text: t("heroOfVault") });
  }

  private renderTabs(parent: HTMLElement) {
    const a = this.plugin.analysis;
    if (!a) return;
    const bar = parent.createDiv({ cls: "cd-tabbar" });
    const seg = bar.createDiv({ cls: "cd-seg", attr: { role: "tablist" } });
    const mk = (id: Tab, label: StrKey, count: number, help: StrKey) => {
      const wrap = seg.createDiv({ cls: "cd-seg-item" });
      const b = wrap.createEl("button", {
        cls: "cd-seg-btn" + (this.tab === id ? " is-active" : ""),
        attr: { role: "tab", type: "button", "aria-selected": String(this.tab === id) },
      });
      b.createSpan({ text: t(label) });
      b.createSpan({ cls: "cd-count", text: fmtFull(count) });
      b.addEventListener("click", () => {
        if (this.tab === id) return;
        this.tab = id;
        this.renderBody();
      });
      this.help.attach(wrap, t(help));
    };
    mk("groups", "tabGroups", a.groups.length, "tabGroupsHelp");
    mk("pairs", "tabPairs", a.pairs.length, "tabPairsHelp");
  }

  /* ================= duplicate groups ================= */

  private visibleGroups(): DupGroup[] {
    const a = this.plugin.analysis;
    if (!a) return [];
    let list = a.groups.filter((g) => this.filter === "all" || g.kind === this.filter);
    if (this.sort === "count") list = list.slice().sort((x, y) => y.occs.length - x.occs.length || y.reclaimChars - x.reclaimChars);
    else if (this.sort === "newest") {
      const last = (g: DupGroup) => g.occs.reduce((m, o) => Math.max(m, a.files[o.f].mtime), 0);
      list = list.slice().sort((x, y) => last(y) - last(x));
    }
    return list;
  }

  private renderGroups(parent: HTMLElement) {
    const groups = this.visibleGroups();
    const wrap = parent.createDiv({ cls: "cd-groups" });
    const bar = wrap.createDiv({ cls: "cd-toolbar" });

    const left = bar.createDiv({ cls: "cd-toolbar-left" });
    const sortWrap = left.createDiv({ cls: "cd-field" });
    const sortLabel = sortWrap.createEl("label", { cls: "cd-label", text: t("sortLabel") });
    const sel = sortWrap.createEl("select", { cls: "dropdown cd-select" });
    const sortId = `cd-sort-${++sortSeq}`;
    sel.id = sortId;
    sortLabel.setAttr("for", sortId);
    for (const [v, label] of [["reclaim", "sortReclaim"], ["count", "sortCount"], ["newest", "sortNewest"]] as [Sort, StrKey][]) {
      const o = sel.createEl("option", { text: t(label), value: v });
      if (v === this.sort) o.selected = true;
    }
    sel.addEventListener("change", () => {
      this.sort = sel.value as Sort;
      this.limit = PAGE;
      this.renderBody();
    });
    const filt = left.createDiv({ cls: "cd-seg is-small", attr: { role: "group" } });
    srLabel(filt, t("filterLabel"));
    for (const [v, label] of [["all", "filterAll"], ["text", "filterText"], ["post", "filterPost"]] as [Filter, StrKey][]) {
      const b = filt.createEl("button", { cls: "cd-seg-btn" + (this.filter === v ? " is-active" : ""), text: t(label), attr: { type: "button", "aria-pressed": String(this.filter === v) } });
      b.addEventListener("click", () => {
        this.filter = v;
        this.limit = PAGE;
        this.renderBody();
      });
    }

    const right = bar.createDiv({ cls: "cd-toolbar-right" });
    const allSelected = groups.length > 0 && groups.every((g) => this.selected.has(g.id));
    const toggle = right.createEl("button", { cls: "cd-btn is-quiet", text: allSelected ? t("selectNone") : t("selectAll"), attr: { type: "button" } });
    toggle.addEventListener("click", () => {
      if (allSelected) for (const g of groups) this.selected.delete(g.id);
      else for (const g of groups) this.selected.add(g.id);
      this.renderBody();
    });
    const clean = right.createEl("button", { cls: "cd-btn is-primary", attr: { type: "button" } });
    const count = groups.filter((g) => this.selected.has(g.id)).length;
    clean.createSpan({ cls: "cd-btn-label", text: t("cleanSelected", count) });
    clean.disabled = count === 0;
    clean.addEventListener("click", () => this.plugin.startCleanup(groups.filter((g) => this.selected.has(g.id)).map((g) => groupItem(g, this.keepChoice.get(g.id) ?? 0))));

    const list = wrap.createDiv({ cls: "cd-list" });
    for (const g of groups.slice(0, this.limit)) this.renderGroup(list, g);
    if (groups.length > this.limit) {
      const more = wrap.createEl("button", { cls: "cd-btn cd-more", text: t("showMore", groups.length - this.limit), attr: { type: "button" } });
      more.addEventListener("click", () => {
        this.limit += PAGE;
        this.renderBody();
      });
    }
  }

  private async loadText(g: DupGroup, idx: number): Promise<string | null> {
    const o = g.occs[idx];
    const key = `${o.path}:${o.block.s}:${o.block.e}`;
    if (this.blockText.has(key)) return this.blockText.get(key) ?? null;
    const text = await this.plugin.readBlock(o);
    this.blockText.set(key, text);
    return text;
  }

  private renderGroup(parent: HTMLElement, g: DupGroup) {
    const a = this.plugin.analysis;
    if (!a) return;
    const card = parent.createDiv({ cls: "cd-card cd-group" + (this.selected.has(g.id) ? " is-selected" : "") });
    const head = card.createDiv({ cls: "cd-group-head" });
    const check = head.createEl("input", { cls: "cd-check", attr: { type: "checkbox" } });
    check.checked = this.selected.has(g.id);
    srLabel(check, t("selectGroup"));
    check.addEventListener("change", () => {
      if (check.checked) this.selected.add(g.id);
      else this.selected.delete(g.id);
      card.toggleClass("is-selected", check.checked);
      this.updateCleanButton();
    });

    const badges = head.createDiv({ cls: "cd-badges" });
    if (g.kind === "post") {
      const b = badges.createSpan({ cls: "cd-badge is-post" + (g.exact ? "" : " is-warn"), text: g.exact ? t("kindPost") : t("kindPostDiff") });
      this.help.attach(b, g.exact ? t("kindPostExactHelp") : t("kindPostHelp"));
    } else badges.createSpan({ cls: "cd-badge", text: t("kindText") });
    badges.createSpan({ cls: "cd-badge is-muted", text: t(`blockKind_${g.blockKind}` as StrKey) });
    head.createSpan({ cls: "cd-group-meta", text: `${t("occCount", g.occs.length)} · ${t("reclaim", fmtFull(g.reclaimChars))}` });
    const act = head.createEl("button", { cls: "cd-btn is-compact", text: t("cleanGroup"), attr: { type: "button" } });
    act.addEventListener("click", () => this.plugin.startCleanup([groupItem(g, this.keepChoice.get(g.id) ?? 0)]));

    const textBox = card.createDiv({ cls: "cd-text-wrap" });
    const textEl = textBox.createDiv({ cls: "cd-text" + (this.expanded.has(g.id) ? " is-expanded" : ""), text: t("loadingText") });
    const toggle = textBox.createEl("button", { cls: "cd-expand", attr: { type: "button" } });
    toggle.hide();
    const setToggle = () => {
      const open = this.expanded.has(g.id);
      toggle.empty();
      setIcon(toggle.createSpan({ cls: "cd-expand-icon", attr: { "aria-hidden": "true" } }), open ? "chevron-up" : "chevron-down");
      toggle.createSpan({ text: open ? t("collapse") : t("expand") });
      toggle.setAttr("aria-expanded", String(open));
    };
    toggle.addEventListener("click", () => {
      if (this.expanded.has(g.id)) this.expanded.delete(g.id);
      else this.expanded.add(g.id);
      textEl.toggleClass("is-expanded", this.expanded.has(g.id));
      setToggle();
    });
    const fill = async () => {
      const keep = this.keepChoice.get(g.id) ?? 0;
      const text = await this.loadText(g, keep);
      if (!card.isConnected) return;
      if (text === null) {
        textEl.setText(t("textUnavailable"));
        return;
      }
      const shown = g.blockKind === "tr" ? text.replace(/^\s*\|\s*|\s*\|\s*$/g, "").replace(/\s*\|\s*/g, "  ·  ") : text;
      const clipped = shown.length > 4000 ? shown.slice(0, 4000) + "…" : shown;
      textEl.setText(clipped);
      if (clipped.length > 140 || clipped.split("\n").length > 2) {
        setToggle();
        toggle.show();
      }
    };
    void fill();

    const occs = card.createDiv({ cls: "cd-occs", attr: { role: "radiogroup" } });
    const legend = occs.createDiv({ cls: "cd-occs-legend" });
    legend.createSpan({ text: t("keepWhich") });
    this.help.attach(legend, t("keepHelp"));
    const keepIdx = this.keepChoice.get(g.id) ?? 0;
    const PLACES = 5;
    const showAll = this.allPlaces.has(g.id) || g.occs.length <= PLACES + 1;
    g.occs.forEach((o, i) => {
      if (!showAll && i >= PLACES && i !== keepIdx) return;
      const file = a.files[o.f];
      const isKeep = i === keepIdx;
      const row = occs.createDiv({ cls: "cd-occ" + (isKeep ? " is-keep" : "") });
      const radio = row.createEl("button", { cls: "cd-radio", attr: { type: "button", role: "radio", "aria-checked": String(isKeep) } });
      radio.createSpan({ cls: "cd-radio-dot", attr: { "aria-hidden": "true" } });
      srLabel(radio, t("keepNote", baseName(o.path)));
      radio.addEventListener("click", () => {
        if (i === keepIdx) return;
        this.keepChoice.set(g.id, i);
        occs.querySelectorAll(".cd-occ").forEach((el, j) => {
          el.toggleClass("is-keep", j === i);
          el.querySelector(".cd-radio")?.setAttribute("aria-checked", String(j === i));
        });
        void fill();
      });
      const link = row.createEl("button", { cls: "cd-occ-link", attr: { type: "button" } });
      link.createSpan({ cls: "cd-occ-name", text: baseName(o.path) });
      link.createSpan({ cls: "cd-occ-line", text: `L${o.block.s + 1}` });
      srLabel(link, t("openAt", baseName(o.path), o.block.s + 1));
      link.addEventListener("click", (e) => void this.plugin.openNote(o.path, o.block.s, e));
      const folder = folderOf(o.path);
      if (folder) row.createSpan({ cls: "cd-occ-folder", text: folder });
      row.createSpan({ cls: "cd-occ-date", text: new Date(file.mtime).toLocaleDateString() });
      row.createSpan({ cls: "cd-pill", text: t("kept") });
    });
    if (g.occs.length > PLACES + 1) {
      const hidden = g.occs.length - PLACES - (keepIdx >= PLACES ? 1 : 0);
      const more = occs.createEl("button", { cls: "cd-expand cd-places", attr: { type: "button" } });
      setIcon(more.createSpan({ cls: "cd-expand-icon", attr: { "aria-hidden": "true" } }), showAll ? "chevron-up" : "chevron-down");
      more.createSpan({ text: showAll ? t("occLess") : t("occMore", hidden) });
      more.addEventListener("click", () => {
        if (showAll) this.allPlaces.delete(g.id);
        else this.allPlaces.add(g.id);
        this.renderBody();
      });
    }
  }

  private updateCleanButton() {
    const btn = this.bodyEl.querySelector<HTMLButtonElement>(".cd-toolbar-right .is-primary");
    if (!btn) return;
    const groups = this.visibleGroups();
    const count = groups.filter((g) => this.selected.has(g.id)).length;
    btn.disabled = count === 0;
    const label = btn.querySelector(".cd-btn-label");
    if (label) label.textContent = t("cleanSelected", count);
  }

  /* ================= overlapping notes ================= */

  private renderPairs(parent: HTMLElement) {
    const a = this.plugin.analysis;
    if (!a) return;
    const wrap = parent.createDiv({ cls: "cd-pairs" });
    if (a.pairs.length === 0) {
      const card = wrap.createDiv({ cls: "cd-card cd-fullempty" });
      this.emptyState(card, "files", t("pairsNone"), t("pairsNoneText"));
      return;
    }
    const list = wrap.createDiv({ cls: "cd-list" });
    for (const p of a.pairs.slice(0, this.pairLimit)) this.renderPair(list, p);
    if (a.pairs.length > this.pairLimit) {
      const more = wrap.createEl("button", { cls: "cd-btn cd-more", text: t("showMore", a.pairs.length - this.pairLimit), attr: { type: "button" } });
      more.addEventListener("click", () => {
        this.pairLimit += PAGE;
        this.renderBody();
      });
    }
    if (a.skippedBroad > 0) {
      const note = wrap.createDiv({ cls: "cd-aside" });
      note.createSpan({ text: t("pairsBroad", a.skippedBroad) });
    }
  }

  private renderPair(parent: HTMLElement, p: OverlapPair) {
    const card = parent.createDiv({ cls: "cd-card cd-pair" });
    const head = card.createDiv({ cls: "cd-pair-head" });
    const pct = Math.round(p.newerRatio * 100);
    head.createDiv({ cls: "cd-pair-title", text: t("pairInNewer", baseName(p.newer), pct) });
    head.createSpan({ cls: "cd-group-meta", text: t("pairShared", p.sharedBlocks, fmtFull(p.sharedChars)) });

    const rows = card.createDiv({ cls: "cd-pair-rows" });
    const row = (label: StrKey, path: string, ratio: number) => {
      const r = rows.createDiv({ cls: "cd-pair-row" });
      r.createSpan({ cls: "cd-badge is-muted", text: t(label) });
      const link = r.createEl("button", { cls: "cd-occ-link", attr: { type: "button" } });
      link.createSpan({ cls: "cd-occ-name", text: baseName(path) });
      srLabel(link, t("openAt", baseName(path), 1));
      link.addEventListener("click", (e) => void this.plugin.openNote(path, undefined, e));
      const folder = folderOf(path);
      if (folder) r.createSpan({ cls: "cd-occ-folder", text: folder });
      const meter = r.createDiv({ cls: "cd-meter", attr: { "aria-hidden": "true" } });
      meter.createDiv({ cls: "cd-meter-fill" }).setCssProps({ "--cd-fill": `${Math.round(ratio * 100)}%` });
      r.createSpan({ cls: "cd-pair-pct", text: t("pairRatioOf", Math.round(ratio * 100)) });
    };
    row("pairOlder", p.older, p.olderRatio);
    row("pairNewer", p.newer, p.newerRatio);

    const actions = card.createDiv({ cls: "cd-pair-actions" });
    const both = actions.createEl("button", { cls: "cd-btn is-compact", attr: { type: "button" } });
    setIcon(both.createSpan({ cls: "cd-btn-icon", attr: { "aria-hidden": "true" } }), "files");
    both.createSpan({ text: t("pairOpenBoth") });
    both.addEventListener("click", () => void this.plugin.openBoth(p.older, p.newer));
    const clean = actions.createEl("button", { cls: "cd-btn is-compact is-primary", text: t("pairClean"), attr: { type: "button" } });
    clean.addEventListener("click", () => this.plugin.startCleanup(this.plugin.pairItems(p.groupIds, p.older, p.newer)));
  }
}
