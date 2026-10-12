import { App, Modal, Notice, setIcon } from "obsidian";
import type ClipDedupePlugin from "./main";
import type { ApplyResult } from "./core/engine";
import { CleanMode, Edit, Plan, PlanFile, PlanItem, ReplaceEdit } from "./core/plan";
import { StrKey, t } from "./i18n";
import { HelpManager, baseName, fmtFull, truncate } from "./ui";

/** A plain confirmation dialog. */
export class ConfirmModal extends Modal {
  constructor(app: App, private title: string, private body: string, private confirmText: string, private onConfirm: () => Promise<void>) {
    super(app);
  }

  onOpen() {
    this.modalEl.addClass("cd-modal", "is-small");
    this.setTitle(this.title);
    this.contentEl.createEl("p", { cls: "cd-modal-text", text: this.body });
    const bar = this.contentEl.createDiv({ cls: "cd-modal-actions" });
    bar.createEl("button", { text: t("cancel") }).addEventListener("click", () => this.close());
    const ok = bar.createEl("button", { cls: "mod-cta", text: this.confirmText });
    ok.addEventListener("click", () => {
      this.close();
      void this.onConfirm();
    });
    ok.focus();
  }

  onClose() {
    this.contentEl.empty();
  }
}

const MAX_FILES = 60;
const MAX_EDITS_PER_FILE = 25;

/** Shows exactly what a cleanup would change, lets the user pick a mode, and applies it. */
export class PreviewModal extends Modal {
  private mode: CleanMode;
  private texts = new Map<string, string>();
  private plan: Plan | null = null;
  private confirmed = false;
  private ctl = { cancelled: false };
  private help = new HelpManager();
  private summaryEl!: HTMLElement;
  private listEl!: HTMLElement;
  private confirmEl!: HTMLElement;
  private applyBtn!: HTMLButtonElement;
  private mainEl!: HTMLElement;
  private running = false;

  constructor(app: App, private plugin: ClipDedupePlugin, private items: PlanItem[]) {
    super(app);
    this.mode = plugin.settings.cleanMode;
  }

  async onOpen() {
    this.modalEl.addClass("cd-modal");
    this.setTitle(t("previewTitle"));
    const root = this.contentEl;
    root.addClass("cd-preview");
    this.mainEl = root.createDiv({ cls: "cd-preview-main" });
    this.mainEl.createDiv({ cls: "cd-loading-line", text: t("loadingPlan") });
    const paths = new Set<string>();
    for (const it of this.items) {
      paths.add(it.keep.path);
      for (const r of it.remove) paths.add(r.path);
    }
    this.texts = await this.plugin.readTexts(Array.from(paths));
    this.buildUi();
    this.refreshPlan();
  }

  onClose() {
    this.help.destroy();
    this.contentEl.empty();
  }

  private buildUi() {
    const main = this.mainEl;
    main.empty();
    main.createEl("p", { cls: "cd-modal-text", text: t("previewIntro") });

    const modes = main.createDiv({ cls: "cd-modes", attr: { role: "radiogroup" } });
    const opts: [CleanMode, StrKey, StrKey][] = [
      ["mark", "modeMark", "modeMarkDesc"],
      ["link", "modeLink", "modeLinkDesc"],
      ["remove", "modeRemove", "modeRemoveDesc"],
    ];
    for (const [m, label, desc] of opts) {
      const card = modes.createEl("label", { cls: "cd-mode" + (m === this.mode ? " is-selected" : "") });
      const input = card.createEl("input", { attr: { type: "radio", name: "cd-mode", value: m } });
      input.checked = m === this.mode;
      const text = card.createDiv({ cls: "cd-mode-text" });
      const head = text.createDiv({ cls: "cd-mode-head" });
      head.createSpan({ cls: "cd-mode-name", text: t(label) });
      if (m !== "mark") head.createSpan({ cls: "cd-badge is-warn", text: t("destructive") });
      text.createDiv({ cls: "cd-mode-desc", text: m === "mark" ? t(desc, this.plugin.settings.propertyName) : t(desc) });
      input.addEventListener("change", () => {
        this.mode = m;
        this.confirmed = false;
        modes.querySelectorAll(".cd-mode").forEach((el) => el.removeClass("is-selected"));
        card.addClass("is-selected");
        this.refreshPlan();
      });
    }

    this.summaryEl = main.createDiv({ cls: "cd-summary", attr: { role: "status" } });
    this.listEl = main.createDiv({ cls: "cd-diff-list" });
    this.confirmEl = main.createDiv({ cls: "cd-confirm" });

    const bar = this.contentEl.createDiv({ cls: "cd-modal-actions" });
    bar.createEl("button", { text: t("cancel") }).addEventListener("click", () => this.close());
    this.applyBtn = bar.createEl("button", { cls: "mod-cta", text: t("apply") });
    this.applyBtn.addEventListener("click", () => void this.apply());
  }

  private refreshPlan() {
    this.plan = this.plugin.makePlan(this.items, this.texts, this.mode);
    this.renderPlan();
  }

  private renderPlan() {
    const plan = this.plan;
    if (!plan) return;
    this.summaryEl.empty();
    this.listEl.empty();
    this.confirmEl.empty();
    const total = plan.blocks;
    const touched = plan.files.filter((f) => f.edits.some((e) => e.type !== "blockid")).length;
    if (total === 0) {
      this.summaryEl.createSpan({ text: t("nothingToDo") });
    } else {
      this.summaryEl.createSpan({ cls: "cd-summary-main", text: t("summary", touched, total, fmtFull(plan.chars)) });
      if (plan.keptNotes > 0) this.summaryEl.createSpan({ cls: "cd-summary-extra", text: t("summaryKept", plan.keptNotes) });
    }
    if (plan.skipped.length > 0) {
      const sk = this.summaryEl.createSpan({ cls: "cd-summary-extra is-warn", text: t("summarySkipped", plan.skipped.length) });
      this.help.attach(sk, this.skipSummary(plan));
    }

    plan.files.slice(0, MAX_FILES).forEach((f, i) => this.renderFile(f, i === 0));
    if (plan.files.length > MAX_FILES) this.listEl.createDiv({ cls: "cd-diff-more", text: t("diffMoreFiles", plan.files.length - MAX_FILES) });

    const destructive = this.mode !== "mark";
    if (destructive && total > 0) {
      const row = this.confirmEl.createEl("label", { cls: "cd-confirm-row" });
      const cb = row.createEl("input", { attr: { type: "checkbox" } });
      cb.checked = this.confirmed;
      row.createSpan({ text: t("confirmCheck", touched) });
      cb.addEventListener("change", () => {
        this.confirmed = cb.checked;
        this.updateApply();
      });
    }
    this.updateApply();
  }

  private updateApply() {
    const plan = this.plan;
    const destructive = this.mode !== "mark";
    this.applyBtn.disabled = !plan || plan.blocks === 0 || this.running || (destructive && !this.confirmed);
    this.applyBtn.toggleClass("mod-warning", destructive);
    this.applyBtn.toggleClass("mod-cta", !destructive);
  }

  private skipSummary(plan: Plan): string {
    const counts = new Map<string, number>();
    for (const s of plan.skipped) counts.set(s.reason, (counts.get(s.reason) ?? 0) + 1);
    return Array.from(counts.entries())
      .map(([r, n]) => `${n} × ${this.plugin.skipText(r)}`)
      .join("\n");
  }

  private renderFile(file: PlanFile, open: boolean) {
    const det = this.listEl.createEl("details", { cls: "cd-file" });
    if (open) det.setAttr("open", "");
    const sum = det.createEl("summary", { cls: "cd-file-head" });
    setIcon(sum.createSpan({ cls: "cd-file-icon", attr: { "aria-hidden": "true" } }), "file-text");
    sum.createSpan({ cls: "cd-file-name", text: baseName(file.path) });
    const n = file.edits.length;
    sum.createSpan({ cls: "cd-file-count", text: String(n) });
    sum.createSpan({ cls: "cd-file-path", text: file.path });
    const body = det.createDiv({ cls: "cd-file-body" });
    file.edits.slice(0, MAX_EDITS_PER_FILE).forEach((e) => this.renderEdit(body, e, file.path));
    if (n > MAX_EDITS_PER_FILE) body.createDiv({ cls: "cd-diff-more", text: t("diffMoreEdits", n - MAX_EDITS_PER_FILE) });
  }

  private renderEdit(parent: HTMLElement, e: Edit, path: string) {
    const box = parent.createDiv({ cls: "cd-edit" });
    if (e.type === "prop") {
      const row = box.createDiv({ cls: "cd-diff-line is-add" });
      row.createSpan({ cls: "cd-diff-sign", text: "+" });
      row.createSpan({ cls: "cd-diff-text", text: `${this.plugin.settings.propertyName}: ${e.values.join(", ")}` });
      return;
    }
    if (e.type === "blockid") {
      box.createDiv({ cls: "cd-edit-meta", text: `${t("lineNo", e.line + 1)} · ${t("diffBlockId", e.id)}` });
      const row = box.createDiv({ cls: "cd-diff-line is-add" });
      row.createSpan({ cls: "cd-diff-sign", text: "+" });
      row.createSpan({ cls: "cd-diff-text", text: `^${e.id}` });
      return;
    }
    const r: ReplaceEdit = e;
    const range = r.s === r.e ? t("lineNo", r.s + 1) : `${t("lineNo", r.s + 1)}–${r.e + 1}`;
    box.createDiv({ cls: "cd-edit-meta", text: `${range} · ${t(`blockKind_${r.kind}` as StrKey)} · ${baseName(r.keepPath)}` });
    const shown = r.before.slice(0, 4);
    for (const l of shown) {
      const row = box.createDiv({ cls: "cd-diff-line is-del" });
      row.createSpan({ cls: "cd-diff-sign", text: "−" });
      row.createSpan({ cls: "cd-diff-text", text: truncate(l.replace(/\r/g, ""), 220) || " " });
    }
    if (r.before.length > shown.length) box.createDiv({ cls: "cd-diff-line is-del is-more", text: `… +${r.before.length - shown.length}` });
    for (const l of r.lines) {
      const row = box.createDiv({ cls: "cd-diff-line is-add" });
      row.createSpan({ cls: "cd-diff-sign", text: "+" });
      row.createSpan({ cls: "cd-diff-text", text: l.replace(/\r/g, "") });
    }
    void path;
  }

  private async apply() {
    const plan = this.plan;
    if (!plan || this.running) return;
    this.running = true;
    this.updateApply();
    const root = this.contentEl;
    root.empty();
    const run = root.createDiv({ cls: "cd-run" });
    const label = run.createDiv({ cls: "cd-run-label", text: t("applying", 0, plan.files.length * 2), attr: { role: "status" } });
    const bar = run.createDiv({ cls: "cd-progress" });
    const fill = bar.createDiv({ cls: "cd-progress-fill" });
    const actions = root.createDiv({ cls: "cd-modal-actions" });
    const cancel = actions.createEl("button", { text: t("cancel") });
    cancel.addEventListener("click", () => {
      this.ctl.cancelled = true;
      cancel.disabled = true;
    });
    let result: ApplyResult | null = null;
    try {
      result = await this.plugin.applyPlan(
        plan,
        (d, total) => {
          label.setText(t("applying", d, total));
          fill.setCssProps({ "--cd-progress": `${Math.round((d / Math.max(1, total)) * 100)}%` });
        },
        this.ctl
      );
    } catch (e) {
      console.error("[clip-dedupe]", e);
      new Notice(String(e instanceof Error ? e.message : e));
    }
    this.running = false;
    this.showResult(result);
  }

  private showResult(res: ApplyResult | null) {
    const root = this.contentEl;
    root.empty();
    this.setTitle(t("resultTitle"));
    const box = root.createDiv({ cls: "cd-result" });
    const ok = box.createDiv({ cls: "cd-result-head" });
    setIcon(ok.createSpan({ cls: "cd-result-icon", attr: { "aria-hidden": "true" } }), res && res.changed.length ? "check" : "info");
    ok.createSpan({ text: res && res.changed.length ? t("resultSummary", res.changed.length, res.appliedEdits) : t("resultNone") });
    if (res?.cancelled) box.createDiv({ cls: "cd-result-line", text: t("resultCancelled") });
    if (res && res.skipped.length > 0) {
      box.createDiv({ cls: "cd-result-line", text: t("resultSkipped", res.skipped.length) });
      const counts = new Map<string, number>();
      for (const s of res.skipped) counts.set(s.reason, (counts.get(s.reason) ?? 0) + 1);
      const ul = box.createEl("ul", { cls: "cd-result-list" });
      for (const [r, n] of counts) ul.createEl("li", { text: `${n} × ${this.plugin.skipText(r)}` });
    }
    if (res && res.changed.length) box.createDiv({ cls: "cd-result-line is-muted", text: t("resultUndoHint") });
    const actions = root.createDiv({ cls: "cd-modal-actions" });
    if (res && res.backupId) {
      const undo = actions.createEl("button", { text: t("undoNow") });
      undo.addEventListener("click", () => {
        this.close();
        void this.plugin.undoLast();
      });
    }
    const close = actions.createEl("button", { cls: "mod-cta", text: t("close") });
    close.addEventListener("click", () => this.close());
    close.focus();
  }
}
