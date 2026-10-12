import { Notice, Plugin, TAbstractFile, TFile, WorkspaceLeaf, debounce, normalizePath } from "obsidian";
import { Analysis, DupGroup, Occurrence } from "./core/group";
import { ApplyIO, ApplyResult, BackupRecord, UndoResult, executePlan, undoBackup } from "./core/engine";
import { CleanMode, Plan, PlanItem, buildPlan } from "./core/plan";
import { StrKey, initLanguage, t } from "./i18n";
import { ConfirmModal, PreviewModal } from "./modals";
import { ScanControl, ScanProgress, cacheKey, runScan } from "./scanner";
import { ClipDedupeSettingTab, ClipDedupeSettings, DEFAULT_SETTINGS } from "./settings";
import { BackupStore, ScanCache } from "./store";
import { ClipDedupeView, VIEW_TYPE_CLIP_DEDUPE } from "./view";

interface AppInternals {
  setting?: {
    open?: () => void;
    openTabById?: (id: string) => void;
  };
}

export interface BackupInfo {
  id: string;
  createdAt: number;
  files: number;
}

const nextTick = () => new Promise<void>((resolve) => window.setTimeout(resolve, 0));

export default class ClipDedupePlugin extends Plugin {
  settings: ClipDedupeSettings = { ...DEFAULT_SETTINGS };
  analysis: Analysis | null = null;
  scannedAt = 0;
  scanning = false;
  progress: ScanProgress | null = null;
  stale = false;
  latestBackup: BackupInfo | null = null;
  /** Bumps whenever a new analysis replaces the old one, so views can drop selections that no longer apply. */
  analysisVersion = 0;
  private ctl: ScanControl = { cancelled: false };
  private cache!: ScanCache;
  private backups!: BackupStore;
  private working = false;
  private groupIndex = new Map<string, DupGroup>();
  private markStale = debounce(() => this.setStale(), 1500, true);

  async onload() {
    initLanguage();
    await this.loadSettings();
    const dir = this.manifest.dir ?? `${this.app.vault.configDir}/plugins/${this.manifest.id}`;
    this.cache = new ScanCache(this.app.vault.adapter, normalizePath(`${dir}/cache.json`));
    this.backups = new BackupStore(this.app.vault.adapter, normalizePath(`${dir}/backups`));
    await this.cache.load(cacheKey(this.settings));
    await this.refreshBackupInfo();

    this.registerView(VIEW_TYPE_CLIP_DEDUPE, (leaf) => new ClipDedupeView(leaf, this));
    this.addRibbonIcon("layers", t("ribbonScan"), () => void this.openReport(true));
    this.addCommand({ id: "scan", name: t("cmdScan"), callback: () => void this.openReport(true) });
    this.addCommand({ id: "open-report", name: t("cmdOpen"), callback: () => void this.openReport(false) });
    this.addCommand({ id: "undo-last", name: t("cmdUndo"), callback: () => void this.undoLast() });
    this.addSettingTab(new ClipDedupeSettingTab(this.app, this));

    this.app.workspace.onLayoutReady(() => {
      const changed = (f: TAbstractFile) => {
        if (f instanceof TFile && f.extension === "md" && this.analysis && !this.working) this.markStale();
      };
      this.registerEvent(this.app.vault.on("modify", changed));
      this.registerEvent(this.app.vault.on("create", changed));
      this.registerEvent(this.app.vault.on("delete", changed));
      this.registerEvent(this.app.vault.on("rename", changed));
    });
  }

  onunload() {
    this.ctl.cancelled = true;
  }

  /* ---------------- views ---------------- */

  getViews(): ClipDedupeView[] {
    return this.app.workspace
      .getLeavesOfType(VIEW_TYPE_CLIP_DEDUPE)
      .map((l) => l.view)
      .filter((v): v is ClipDedupeView => v instanceof ClipDedupeView);
  }

  notifyViews() {
    for (const v of this.getViews()) v.refresh();
  }

  async openReport(scanNow: boolean) {
    const { workspace } = this.app;
    let leaf: WorkspaceLeaf | null = workspace.getLeavesOfType(VIEW_TYPE_CLIP_DEDUPE)[0] ?? null;
    if (!leaf) {
      leaf = workspace.getLeaf("tab");
      await leaf.setViewState({ type: VIEW_TYPE_CLIP_DEDUPE, active: true });
    }
    await workspace.revealLeaf(leaf);
    if (scanNow && !this.scanning) void this.scan();
  }

  openSettings() {
    const setting = (this.app as unknown as AppInternals).setting;
    if (setting) {
      setting.open?.();
      setting.openTabById?.(this.manifest.id);
    }
  }

  /* ---------------- scanning ---------------- */

  private setStale() {
    if (this.stale) return;
    this.stale = true;
    this.notifyViews();
  }

  async scan(): Promise<void> {
    if (this.scanning) return;
    this.scanning = true;
    this.ctl = { cancelled: false };
    this.progress = null;
    this.notifyViews();
    try {
      const result = await runScan(this.app, this.settings, this.cache, this.ctl, (p) => {
        this.progress = p;
        for (const v of this.getViews()) v.setProgress(p);
      });
      if (result === null) {
        new Notice(t("scanCancelled"));
      } else {
        this.analysis = result;
        this.analysisVersion++;
        this.groupIndex = new Map(result.groups.map((g) => [g.id, g]));
        this.scannedAt = Date.now();
        this.stale = false;
      }
    } catch (e) {
      console.error("[clip-dedupe]", e);
      new Notice(t("scanFailed"));
    } finally {
      this.scanning = false;
      this.progress = null;
      this.notifyViews();
    }
  }

  cancelScan() {
    this.ctl.cancelled = true;
  }

  async clearCache() {
    await this.cache.clear();
    new Notice(t("cacheCleared"));
  }

  groupById(id: string): DupGroup | undefined {
    return this.groupIndex.get(id);
  }

  /* ---------------- reading and opening ---------------- */

  /** Raw text of a block as it is in the note right now. */
  async readBlock(occ: Occurrence): Promise<string | null> {
    const file = this.app.vault.getFileByPath(occ.path);
    if (!file) return null;
    const lines = (await this.app.vault.cachedRead(file)).split("\n");
    if (occ.block.e >= lines.length) return null;
    return lines
      .slice(occ.block.s, occ.block.e + 1)
      .join("\n")
      .replace(/\r/g, "");
  }

  async openNote(path: string, line?: number, evt?: MouseEvent | KeyboardEvent, split = false) {
    const file = this.app.vault.getFileByPath(path);
    if (!file) return;
    const newTab = this.settings.openInNewTab || (evt && (evt.ctrlKey || evt.metaKey));
    const leaf = split ? this.app.workspace.getLeaf("split", "vertical") : this.app.workspace.getLeaf(newTab ? "tab" : false);
    await leaf.openFile(file, line !== undefined ? { eState: { line } } : undefined);
    this.app.workspace.setActiveLeaf(leaf, { focus: true });
  }

  /** Opens two notes next to each other. */
  async openBoth(older: string, newer: string) {
    await this.openNote(older);
    await this.openNote(newer, undefined, undefined, true);
  }

  /* ---------------- cleanup ---------------- */

  linkText(path: string, from?: string): string {
    const file = this.app.vault.getFileByPath(path);
    return file ? this.app.metadataCache.fileToLinktext(file, from ?? "", true) : path.replace(/\.md$/, "");
  }

  makePlan(items: PlanItem[], texts: Map<string, string>, mode: CleanMode): Plan {
    return buildPlan(items, texts, {
      mode,
      embed: this.settings.linkStyle === "embed",
      linkText: (p) => this.linkText(p),
      linkLabel: (p) => this.linkText(p),
    });
  }

  async readTexts(paths: string[]): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    for (const p of paths) {
      const f = this.app.vault.getFileByPath(p);
      if (f) out.set(p, await this.app.vault.read(f));
    }
    return out;
  }

  startCleanup(items: PlanItem[]) {
    if (items.length === 0) return;
    new PreviewModal(this.app, this, items).open();
  }

  /** Itemises one group, optionally cleaning only some of its notes (used by the overlapping-notes view). */
  pairItems(groupIds: string[], older: string, newer: string): PlanItem[] {
    const items: PlanItem[] = [];
    for (const id of groupIds) {
      const g = this.groupIndex.get(id);
      const keep = g?.occs.find((o) => o.path === older);
      const rm = g?.occs.find((o) => o.path === newer);
      if (g && keep && rm) items.push({ group: g, keep, remove: [rm] });
    }
    return items;
  }

  private io(): ApplyIO {
    const fileOf = (p: string) => this.app.vault.getFileByPath(p);
    return {
      now: () => Date.now(),
      mtime: (p) => fileOf(p)?.stat.mtime ?? null,
      read: async (p) => {
        const f = fileOf(p);
        return f ? await this.app.vault.read(f) : null;
      },
      process: async (p, fn) => {
        const f = fileOf(p);
        if (!f) throw new Error(`Missing note: ${p}`);
        return await this.app.vault.process(f, fn);
      },
      processFrontMatter: async (p, fn) => {
        const f = fileOf(p);
        if (!f) throw new Error(`Missing note: ${p}`);
        await this.app.fileManager.processFrontMatter(f, (fm: Record<string, unknown>) => fn(fm));
      },
      saveBackup: (rec) => this.backups.save(rec),
      deleteBackup: (id) => this.backups.remove(id),
      yieldToUi: nextTick,
    };
  }

  async applyPlan(plan: Plan, onProgress: (done: number, total: number) => void, ctl: { cancelled: boolean }): Promise<ApplyResult> {
    this.working = true;
    const notice = new Notice(t("applying", 0, plan.files.length * 2), 0);
    try {
      return await executePlan(plan, this.io(), this.settings.propertyName, {
        progress: (d, tot) => {
          onProgress(d, tot);
          notice.setMessage(t("applying", d, tot));
        },
        cancelled: () => ctl.cancelled,
      });
    } finally {
      notice.hide();
      await this.backups.prune(this.settings.backupsToKeep);
      await this.refreshBackupInfo();
      this.working = false;
      this.setStale();
      this.rescanSoon();
    }
  }

  /** Re-reads the notes a moment after a cleanup or undo so the report matches what is on disk. */
  private rescanSoon() {
    window.setTimeout(() => void this.scan(), 800);
  }

  async refreshBackupInfo() {
    const rec = await this.backups.latest();
    this.latestBackup = rec ? { id: rec.id, createdAt: rec.createdAt, files: rec.files.length } : null;
    this.notifyViews();
  }

  async runUndo(rec: BackupRecord): Promise<UndoResult> {
    this.working = true;
    const notice = new Notice(t("undoProgress"), 0);
    try {
      return await undoBackup(rec, this.io());
    } finally {
      notice.hide();
      this.working = false;
      await this.refreshBackupInfo();
      this.setStale();
      this.rescanSoon();
    }
  }

  async undoLast(): Promise<void> {
    const rec = await this.backups.latest();
    if (!rec) {
      new Notice(t("undoNone"));
      return;
    }
    new ConfirmModal(
      this.app,
      t("undoTitle"),
      t("undoBody", rec.files.length, new Date(rec.createdAt).toLocaleString()),
      t("undoConfirm"),
      async () => {
        const res = await this.runUndo(rec);
        new Notice(res.skipped.length ? t("undoDoneSkipped", res.restored.length, res.skipped.length) : t("undoDone", res.restored.length));
      }
    ).open();
  }

  skipText(reason: string): string {
    return t(`skip_${reason}` as StrKey);
  }

  /* ---------------- settings ---------------- */

  async loadSettings() {
    const raw = ((await this.loadData()) ?? {}) as Partial<ClipDedupeSettings>;
    this.settings = Object.assign({}, DEFAULT_SETTINGS, raw);
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.cache.useKey(cacheKey(this.settings));
    if (this.analysis) this.setStale();
  }
}
