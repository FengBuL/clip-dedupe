/* Renders the real ClipDedupeView and PreviewModal against a synthetic vault. Used only to produce screenshots. */
import { analyze, FileRecord } from "../../src/core/group";
import { buildPlan, CleanMode, groupItem, PlanItem } from "../../src/core/plan";
import { tokenize } from "../../src/core/tokenize";
import { initLanguage } from "../../src/i18n";
import { PreviewModal } from "../../src/modals";
import { ClipDedupeView } from "../../src/view";
import { OPTS, POSTS, Post, frontmatter, postBullet, postQuote, sampleNote, table } from "../../tests/fixtures";

const params = new URLSearchParams(location.search);
const scene = params.get("scene") ?? "groups";
document.body.classList.toggle("is-mobile", params.get("mobile") === "1");
initLanguage();

/* ---------- a synthetic vault ---------- */
const MORE: Post[] = [
  { id: "1843010000000000001", user: "alexalbert__", text: "Prompt caching cut our long-context bill by more than half, but only after we moved the static instructions to the top of every request." },
  { id: "1843010000000000002", user: "oran_ge", text: "整理了一份 AI 编程工具的选型清单：先看上下文管理，再看终端集成，最后才看模型本身，因为日常体验差距大多出在前两项上。" },
  { id: "1843010000000000003", user: "hwchase17", text: "An agent that can say it does not know is worth more than an agent that is right ninety percent of the time and confidently wrong the rest." },
  { id: "1843010000000000004", user: "lenny", text: "The best PMs I know write one page before every project and delete half of it before anyone else reads it, which forces the real priorities to show." },
];
const ALL = [...POSTS, ...MORE];
const day = (n: number) => `2026-10-${String(n).padStart(2, "0")}`;
const H = 3600e3;
const base = Date.UTC(2026, 9, 1, 1, 0, 0);
const vault = new Map<string, { text: string; ctime: number; mtime: number }>();
const add = (path: string, text: string, hours: number) => vault.set(path, { text, ctime: base + hours * H, mtime: base + hours * H + 600e3 });

let h = 0;
for (let d = 5; d <= 9; d++) {
  const off = ((d - 5) * 2) % 10;
  const a = ALL.slice(off, off + 6);
  const b = ALL.slice(off + 2, off + 9);
  const morning = sampleNote(day(d), "14:23", a, [a[1], a[2]], [a[3], a[4]]);
  const evening = sampleNote(day(d), "20:25", b, [b[1], b[4]], [b[2], b[5]], "## 新增观察\n\n晚间这一批里关于评测和工作流的讨论明显变多，值得单独开一篇笔记整理成方法论，以后写周报时直接引用，也方便和之前的结论对照。");
  add(`x/${day(d)}-1423-ForYou采样清单.md`, morning, (h += 4));
  add(`x/${day(d)}-2025-ForYou采样清单.md`, evening, (h += 6));
  if (d % 2 === 1) add(`x/${day(d + 1)}-0912-ForYou续查.md`, evening.replace("20:25", "09:12") + `\n## 续查结果\n\n${table(ALL.slice(off + 7, off + 10))}\n`, (h += 8));
}
const article = (title: string) =>
  frontmatter("2026-10-04", "clipped", `source: https://example.com/${title}\n`) +
  `\n# ${title}\n\nA second brain is a trusted external system that holds everything you know, so that your mind is free to focus on thinking rather than remembering where things are stored.\n\nThe core habit is simple: capture quickly, organise lightly, and review on a schedule that you actually keep, rather than the schedule you wish you had.\n\n- Capture everything that resonates without judging it first.\n- Organise by actionability, not by topic, so projects stay on top.\n- Distil only what you touch again; the rest can stay raw and searchable.\n`;
add("Clippings/How to build a second brain.md", article("How to build a second brain"), 70);
add("Clippings/How to build a second brain (1).md", article("How to build a second brain") + "\n\nSubscribe to the newsletter for weekly notes on productivity and tools.\n", 74);
const report = (d: number, extra: string) =>
  `---\ndate: ${day(d)}\nsource: ai-report\n---\n# AI 日报 ${day(d)}\n\n## 背景\n\n本报告由自动化流程每天生成，汇总过去二十四小时内关注账号发布的与 AI 相关的帖子，按主题归类后给出简要点评，并标出值得跟进的条目。\n\n## 今日要点\n\n${extra}\n\n## 方法说明\n\n- 数据来源：关注列表中的账号，以及 ForYou 推荐流里的高互动帖子。\n- 过滤规则：剔除转发、广告和纯表情回复，保留带有明确观点或数据的内容。\n- 去重规则：同一条帖子只在首次出现的那天记录，之后的日报不再重复展开。\n`;
for (let d = 6; d <= 9; d++) add(`AI报告/日报-${day(d)}.md`, report(d, `今天最值得关注的是 ${ALL[d].user} 的观点：${ALL[d].text}`), 90 + d * 3);
add("notes/周报-第41周.md", "# 第 41 周周报\n\n本周主要完成了看板插件的上架准备，以及公众号排版工具的两个小版本迭代，还顺手整理了一批采集笔记里重复出现的内容，确认了清理的基本思路。\n\n下周计划：整理采集笔记里重复的内容，建立固定的清理流程，并把清理前后的体积变化和遇到的问题都完整记录下来。\n", 120);
add("notes/周报-第42周.md", "# 第 42 周周报\n\n本周主要完成了看板插件的上架准备，以及公众号排版工具的两个小版本迭代，还顺手整理了一批采集笔记里重复出现的内容，确认了清理的基本思路。\n\n下周计划：开始做一个新的插件，并且更新社交媒体上的发布内容和介绍文案，同时抽时间回复用户反馈。\n", 130);
const topics = ["读书", "产品", "写作", "健身", "旅行", "投资", "编程", "摄影"];
for (let i = 0; i < 180; i++) {
  const tp = topics[i % topics.length];
  let body = "";
  for (let k = 0; k < 5; k++) body += `第 ${i + 1} 篇关于${tp}的笔记，第 ${k + 1} 段：今天想到的一个具体问题是，${tp}这件事真正的难点不在开始，而在于怎样把零散的观察整理成能反复使用的做法，编号 ${i * 7 + k}。\n\n`;
  add(`notes/${tp}/随笔-${i + 1}.md`, `# 随笔 ${i + 1}\n\n${body}`, 140 + i);
}

const records: FileRecord[] = [];
for (const [path, f] of vault) {
  const t = tokenize(f.text, OPTS);
  records.push({ path, ctime: f.ctime, mtime: f.mtime, len: f.text.length, lines: t.lines, totalW: t.totalW, blocks: t.blocks });
}
const analysis = analyze(records, { overlapThreshold: 0.7 });

/* ---------- a fake plugin ---------- */
const bn = (p: string) => p.replace(/\.md$/, "").split("/").pop() as string;
const settings = { cleanMode: "mark" as CleanMode, propertyName: "duplicate_of", linkStyle: "embed", openInNewTab: true };
const lines = (path: string) => (vault.get(path)?.text ?? "").split("\n");
const plugin = {
  settings,
  analysis: scene === "idle" ? null : analysis,
  analysisVersion: 1,
  scanning: scene === "scanning",
  stale: scene === "stale",
  scannedAt: Date.now(),
  latestBackup: scene === "idle" || scene === "scanning" ? null : { id: "x", createdAt: Date.now(), files: 4 },
  scan: async () => {},
  cancelScan: () => {},
  undoLast: async () => {},
  openSettings: () => {},
  openNote: async () => {},
  openBoth: async () => {},
  readBlock: async (o: { path: string; block: { s: number; e: number } }) => lines(o.path).slice(o.block.s, o.block.e + 1).join("\n"),
  readTexts: async (paths: string[]) => new Map(paths.map((p) => [p, vault.get(p)?.text ?? ""] as [string, string])),
  makePlan: (items: PlanItem[], texts: Map<string, string>, mode: CleanMode) => buildPlan(items, texts, { mode, embed: true, linkText: bn, linkLabel: bn }),
  applyPlan: async () => ({ backupId: null, changed: [], appliedEdits: 0, skipped: [], cancelled: false }),
  skipText: (r: string) => r,
  startCleanup: (items: PlanItem[]) => new PreviewModal({} as never, plugin as never, items).open(),
  pairItems: (ids: string[], older: string, newer: string): PlanItem[] => {
    const out: PlanItem[] = [];
    for (const id of ids) {
      const g = analysis.groups.find((x) => x.id === id);
      const keep = g?.occs.find((o) => o.path === older);
      const rm = g?.occs.find((o) => o.path === newer);
      if (g && keep && rm) out.push({ group: g, keep, remove: [rm] });
    }
    return out;
  },
};

const host = document.querySelector(".view-content-host") as HTMLElement;
host.className = "workspace-leaf-content";
const view = new ClipDedupeView({ app: {} } as never, plugin as never);
view.contentEl.classList.add("view-content");
host.appendChild(view.contentEl);

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
(async () => {
  try {
    await view.onOpen();
    if (scene === "scanning") view.setProgress({ done: 4210, total: 9800, phase: "read" });
    await wait(150);
    const q = <T extends Element>(s: string) => document.querySelector<T>(s);
    const qa = <T extends Element>(s: string) => Array.from(document.querySelectorAll<T>(s));
    if (scene === "groups" || scene === "modal" || scene === "modal-remove") {
      qa<HTMLInputElement>(".cd-group .cd-check").slice(0, 2).forEach((c) => c.click());
      q<HTMLButtonElement>(".cd-group .cd-expand")?.click();
    }
    if (scene === "pairs") qa<HTMLButtonElement>(".cd-seg-btn")[1]?.click();
    if (scene === "modal" || scene === "modal-remove") {
      const groupBtn = qa<HTMLButtonElement>(".cd-group .cd-btn.is-compact")[0];
      // pick a group with several occurrences for a more interesting preview
      (qa<HTMLButtonElement>(".cd-group .cd-btn.is-compact")[1] ?? groupBtn).click();
      await wait(250);
      if (scene === "modal-remove") {
        qa<HTMLInputElement>(".cd-mode input")[2]?.click();
        await wait(100);
      }
    }
    await wait(200);
    (window as unknown as { __ready: boolean }).__ready = true;
  } catch (e) {
    (window as unknown as { __err: string }).__err = String(e instanceof Error ? e.stack : e);
  }
})();
