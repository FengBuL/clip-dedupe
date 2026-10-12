import { moment } from "obsidian";

/** Interface strings as [中文, English]. Obsidian's own language decides which one is shown. */
const S = {
  // names
  pluginName: ["Clip Dedupe", "Clip Dedupe"],
  ribbonScan: ["扫描重复内容", "Scan for duplicate content"],
  cmdScan: ["扫描重复内容", "Scan for duplicate content"],
  cmdOpen: ["打开重复内容报告", "Open duplicate report"],
  cmdUndo: ["撤销上一次清理", "Undo the last cleanup"],

  // header / states
  subtitle: ["找出跨笔记重复的内容，预览后再清理", "Find content repeated across notes, preview before you clean"],
  scan: ["扫描", "Scan"],
  rescan: ["重新扫描", "Rescan"],
  cancel: ["取消", "Cancel"],
  close: ["关闭", "Close"],
  settings: ["设置", "Settings"],
  undoLast: ["撤销上一次清理", "Undo last cleanup"],
  undoCount: ["撤销上一次清理（{0} 篇）", "Undo last cleanup ({0} notes)"],
  help: ["说明", "Help"],
  stale: ["笔记有改动，结果可能已过期", "Notes changed, results may be out of date"],
  scannedAt: ["扫描于 {0}", "Scanned {0}"],
  scanning: ["正在扫描…", "Scanning…"],
  scanningProgress: ["正在读取笔记 {0}/{1}", "Reading notes {0}/{1}"],
  grouping: ["正在比对内容…", "Comparing content…"],
  scanCancelled: ["已取消扫描", "Scan cancelled"],
  scanFailed: ["扫描失败，详情见开发者控制台", "Scan failed, see the developer console"],
  scanDone: ["扫描完成：{0} 组重复内容", "Scan finished: {0} duplicate groups"],
  idleTitle: ["还没有扫描", "Nothing scanned yet"],
  idleText: [
    "扫描会比较所有笔记里的段落、列表项、表格行和引用块，找出出现在多篇笔记里的相同内容。扫描只读，不会改动任何笔记。",
    "A scan compares paragraphs, list items, table rows and quotes across your notes and finds content that appears in more than one. Scanning is read-only and never changes a note.",
  ],
  startScan: ["开始扫描", "Start scan"],
  noneTitle: ["没有发现跨笔记的重复内容", "No content repeated across notes"],
  noneText: [
    "试试在设置里调低“最短块长度”，或检查“包含的文件夹”和“排除的文件夹”。",
    "Try lowering the minimum block length in settings, or check the included and excluded folders.",
  ],
  openSettings: ["打开设置", "Open settings"],

  // hero + KPIs
  heroTitle: ["可回收内容", "Reclaimable content"],
  heroHelp: [
    "如果每组重复内容只保留一份，可以少掉的字符数，以及它占全部笔记字符数的比例。只统计跨笔记的重复，同一篇笔记内部的重复不算。",
    "Characters you would save by keeping one copy of each duplicated block, and their share of all scanned characters. Only repeats across notes count; repeats inside one note do not.",
  ],
  heroChars: ["字符", "chars"],
  heroOfVault: ["占全部笔记", "of all notes"],
  heroSummary: ["约 {0} 个词，分布在 {1} 组重复内容里", "About {0} words across {1} duplicate groups"],
  kpiNotes: ["已扫描笔记", "Notes scanned"],
  kpiNotesHelp: ["本次参与比较的笔记数量，已按设置里的文件夹范围过滤。", "Notes that took part in the comparison, after the folder filters in settings."],
  kpiGroups: ["重复组", "Duplicate groups"],
  kpiGroupsHelp: ["内容相同、出现在至少两篇笔记里的块算一组。同一条 X 帖子（相同的 status ID）也会归为一组。", "Blocks with the same content in at least two notes form a group. Blocks that link the same X post (same status ID) are grouped too."],
  kpiBlocks: ["重复块", "Duplicated blocks"],
  kpiBlocksHelp: ["所有重复组里出现的块总数，包含每组里保留的那一份。", "All blocks inside duplicate groups, including the copy kept in each group."],
  kpiWords: ["可回收词数", "Reclaimable words"],
  kpiWordsHelp: ["中文按字、英文按词计。", "Han characters count one each, other text is counted by word."],

  // tabs / toolbar
  tabGroups: ["重复内容", "Duplicates"],
  tabPairs: ["高度重叠的笔记", "Overlapping notes"],
  tabGroupsHelp: [
    "每一项是一段在多篇笔记里重复出现的内容。选择要保留的那一份，其余的可以标记、替换为链接或删除。",
    "Each item is a block that appears in several notes. Pick the copy to keep; the others can be marked, replaced with a link, or removed.",
  ],
  tabPairsHelp: [
    "两篇笔记共享的内容占其中一篇很大比例（超过设置里的阈值）时列在这里，典型例子是“续查”笔记把上一次的内容整段带了进来。",
    "Two notes whose shared content makes up a large share of one of them (above the threshold in settings). A typical case is a follow-up note that re-includes the previous run.",
  ],
  sortLabel: ["排序", "Sort"],
  sortReclaim: ["可回收量", "Reclaimable"],
  sortCount: ["出现次数", "Occurrences"],
  sortNewest: ["最近出现", "Most recent"],
  filterLabel: ["类型", "Type"],
  filterAll: ["全部", "All"],
  filterText: ["相同文字", "Same text"],
  filterPost: ["同一条帖子", "Same post"],
  selectAll: ["全选", "Select all"],
  selectNone: ["清除选择", "Clear selection"],
  cleanSelected: ["预览并清理（{0}）", "Preview and clean ({0})"],
  selectedCount: ["已选 {0} 组", "{0} selected"],
  showMore: ["显示更多（还有 {0} 项）", "Show more ({0} left)"],
  keepHelp: [
    "“保留”的那一份不会被改动，其余出现位置才会被清理。默认保留最早的一篇，可点其他位置改成保留它。",
    "The kept copy is never changed; only the other places are cleaned. The earliest note is kept by default, click another row to keep that one instead.",
  ],

  // group card
  kindText: ["相同文字", "Same text"],
  kindPost: ["同一条帖子", "Same post"],
  kindPostDiff: ["同一条帖子 · 文字不同", "Same post · text differs"],
  kindPostHelp: [
    "这些块引用了同一条 X 帖子（链接里的 status ID 相同），但文字不完全一样，例如行号、备注或排版不同。清理前请确认它们确实是重复。",
    "These blocks link the same X post (same status ID) but their text is not identical, for example different row numbers, notes or layout. Check they really are duplicates before cleaning.",
  ],
  kindPostExactHelp: ["这些块引用了同一条 X 帖子（链接里的 status ID 相同），文字也一致。", "These blocks link the same X post (same status ID) and their text is identical."],
  blockKind_p: ["段落", "Paragraph"],
  blockKind_li: ["列表项", "List item"],
  blockKind_tr: ["表格行", "Table row"],
  blockKind_bq: ["引用块", "Quote"],
  blockKind_code: ["代码块", "Code block"],
  blockKind_h: ["标题", "Heading"],
  occCount: ["{0} 处", "{0} places"],
  reclaim: ["可回收 {0} 字", "Reclaim {0} chars"],
  expand: ["展开", "Expand"],
  collapse: ["收起", "Collapse"],
  loadingText: ["读取中…", "Loading…"],
  textUnavailable: ["（无法读取内容）", "(content unavailable)"],
  kept: ["保留", "Keep"],
  keepThis: ["保留这一份", "Keep this copy"],
  lineNo: ["第 {0} 行", "line {0}"],
  occMore: ["显示其余 {0} 处", "Show {0} more places"],
  occLess: ["收起", "Show fewer"],
  keepWhich: ["保留哪一份", "Copy to keep"],
  selectGroup: ["选择这一组", "Select this group"],
  keepNote: ["保留 {0} 里的这一份", "Keep the copy in {0}"],
  cleanGroup: ["预览并清理此项", "Preview and clean"],
  openAt: ["在 {0} 第 {1} 行打开", "Open {0} at line {1}"],

  // pairs
  pairInNewer: ["较新的 {0} 有 {1}% 的内容已出现在较旧的笔记里", "{1}% of the newer note {0} already appears in the older note"],
  pairOlder: ["较旧", "Older"],
  pairNewer: ["较新", "Newer"],
  pairShared: ["共享 {0} 个块，约 {1} 字符", "{0} shared blocks, about {1} characters"],
  pairOpenBoth: ["并排打开", "Open side by side"],
  pairClean: ["预览并清理较新的笔记", "Preview and clean the newer note"],
  pairRatioOf: ["{0}% 也出现在另一篇", "{0}% also in the other"],
  pairsNone: ["没有发现高度重叠的笔记", "No highly overlapping notes"],
  pairsNoneText: ["可以在设置里调低“重叠阈值”。", "You can lower the overlap threshold in settings."],
  pairsBroad: ["有 {0} 组内容出现在太多笔记里（多半是模板或页脚），没有计入这里。", "{0} groups appear in too many notes (likely templates or footers) and are left out here."],

  // preview modal
  previewTitle: ["清理预览", "Cleanup preview"],
  previewIntro: [
    "下面列出了每篇笔记会发生的改动。只有点“应用”之后才会写入，写入前会先备份，之后可以一键撤销。",
    "These are the exact changes per note. Nothing is written until you press Apply; a backup is made first and you can undo afterwards.",
  ],
  modeLabel: ["清理方式", "Cleanup mode"],
  modeMark: ["仅标记（推荐）", "Mark only (recommended)"],
  modeMarkDesc: ["不改正文，只在较晚的笔记属性里加上 {0}，指向保留的那篇。", "Leaves the text alone and adds a {0} property to the later notes, pointing at the kept note."],
  modeLink: ["替换为链接", "Replace with a link"],
  modeLinkDesc: ["把重复块换成指向保留块的链接或嵌入，并给保留块加上块 ID（表格行和代码块不支持）。", "Replaces duplicated blocks with a link or embed to the kept block, and adds a block id to the kept block (table rows and code blocks are not supported)."],
  modeRemove: ["删除重复块", "Delete duplicated blocks"],
  modeRemoveDesc: ["从较晚的笔记里直接删掉重复块。", "Deletes the duplicated blocks from the later notes."],
  destructive: ["会修改正文", "Changes text"],
  summary: ["将处理 {0} 篇笔记中的 {1} 个块（约 {2} 字符）", "{1} blocks (about {2} characters) in {0} notes will be handled"],
  summaryKept: ["另有 {0} 篇保留笔记会被加上块 ID", "{0} kept notes will get a block id"],
  summarySkipped: ["{0} 项将被跳过", "{0} items will be skipped"],
  nothingToDo: ["没有可以处理的内容。", "Nothing to do."],
  diffMoreEdits: ["…还有 {0} 处改动", "…{0} more changes"],
  diffMoreFiles: ["…还有 {0} 篇笔记", "…{0} more notes"],
  diffProp: ["添加属性 {0}", "Add property {0}"],
  diffBlockId: ["给保留的块加上 ^{0}", "Add ^{0} to the kept block"],
  diffRemoved: ["删除", "Removed"],
  diffReplaced: ["替换为", "Replaced with"],
  confirmCheck: ["我了解这会修改 {0} 篇笔记的正文。操作前会自动备份，之后可以撤销。", "I understand this changes the text of {0} notes. A backup is made first and the cleanup can be undone."],
  apply: ["应用", "Apply"],
  applying: ["正在清理 {0}/{1}", "Cleaning {0}/{1}"],
  loadingPlan: ["正在读取笔记…", "Reading notes…"],
  resultTitle: ["清理完成", "Cleanup finished"],
  resultSummary: ["已修改 {0} 篇笔记，共 {1} 处改动。", "{0} notes changed, {1} edits made."],
  resultNone: ["没有笔记被修改。", "No notes were changed."],
  resultCancelled: ["已取消，剩余笔记未处理。", "Cancelled; the remaining notes were left alone."],
  resultSkipped: ["跳过了 {0} 项：", "Skipped {0} items:"],
  resultUndoHint: ["做错了？可以撤销，只会恢复自清理后没被你再编辑过的笔记。", "Not what you wanted? Undo restores every note you have not edited since."],
  undoNow: ["撤销这次清理", "Undo this cleanup"],

  // skip reasons
  skip_recent: ["刚被修改过（2 秒内），为避免与同步冲突已跳过", "modified a moment ago (under 2 s), skipped to avoid clashing with sync"],
  skip_stale: ["扫描之后内容变了，已跳过", "changed since the scan, skipped"],
  skip_missing: ["笔记已不存在", "note no longer exists"],
  skip_unsupported: ["这种块不支持这种方式（表格行、代码块）", "this kind of block is not supported by this mode (table rows, code blocks)"],
  skip_dependency: ["指向的块没能加上 ID，已跳过", "the kept block could not get an id, skipped"],
  skip_edited: ["清理之后你又编辑过它，未恢复", "edited since the cleanup, not restored"],
  skip_cancelled: ["已取消", "cancelled"],
  skip_header: ["表格里还有保留的行，未删除表头", "table still has rows left, header kept"],

  // undo
  undoTitle: ["撤销上一次清理", "Undo the last cleanup"],
  undoBody: ["将恢复 {0} 篇笔记到 {1} 清理之前的样子。如果某篇笔记在清理之后被你编辑过，会跳过它。", "This restores {0} notes to how they were before the cleanup at {1}. Notes you edited since are skipped."],
  undoConfirm: ["撤销", "Undo"],
  undoNone: ["没有可以撤销的清理", "There is no cleanup to undo"],
  undoDone: ["已恢复 {0} 篇笔记", "Restored {0} notes"],
  undoDoneSkipped: ["已恢复 {0} 篇笔记，跳过 {1} 篇（清理后被编辑过或已不存在）", "Restored {0} notes, skipped {1} (edited since, or gone)"],
  undoProgress: ["正在撤销…", "Undoing…"],

  // settings
  setScope: ["范围", "Scope"],
  setIncludeName: ["包含的文件夹", "Included folders"],
  setIncludeDesc: ["只扫描这些文件夹（含子文件夹）。留空表示整个仓库。每行一个，或用逗号分隔。", "Only scan these folders (and subfolders). Leave empty for the whole vault. One per line or comma separated."],
  setExcludeName: ["排除的文件夹", "Excluded folders"],
  setExcludeDesc: ["这些文件夹里的笔记不参与比较。优先于“包含的文件夹”。", "Notes in these folders are left out. This wins over included folders."],
  setMatching: ["比较方式", "Matching"],
  setMinName: ["最短块长度", "Minimum block length"],
  setMinDesc: ["比这更短的块不参与比较。英文按字符，中文每个字算两个字符，所以默认 80 约等于 40 个汉字。", "Shorter blocks are ignored. Latin text counts one per character, Han characters count two, so the default of 80 is about 40 Han characters."],
  setFrontmatterName: ["忽略属性区（frontmatter）", "Ignore frontmatter"],
  setFrontmatterDesc: ["不比较笔记顶部的属性。", "Do not compare the properties at the top of a note."],
  setCodeName: ["忽略代码块", "Ignore code blocks"],
  setCodeDesc: ["不比较围栏代码块（```）。", "Do not compare fenced code blocks."],
  setHeadingsName: ["忽略标题", "Ignore headings"],
  setHeadingsDesc: ["只由一行标题组成的块不参与比较。", "Blocks that are just a heading line are ignored."],
  setLinksName: ["忽略只有链接的块", "Ignore link-only blocks"],
  setLinksDesc: ["只包含链接、嵌入或网址、没有其他文字的块不参与比较。", "Blocks that contain only links, embeds or URLs and no other text are ignored."],
  setStatusName: ["按 X 帖子 ID 归组", "Group by X post id"],
  setStatusDesc: ["链接里 status ID 相同的块视为同一条帖子，即使文字略有不同；这类块不受最短长度限制。", "Blocks that link the same status id count as the same post even if the text differs a little; such blocks ignore the minimum length."],
  setKeepName: ["默认保留哪一份", "Copy to keep by default"],
  setKeepDesc: ["自动：文件名里有日期时按日期，否则按创建时间；总是保留最早的一份。你可以在每组里单独改。", "Auto: use the date in the file name when there is one, otherwise the creation time; the earliest copy is kept. You can change it per group."],
  keepAuto: ["自动（文件名日期，其次创建时间）", "Auto (file name date, then created)"],
  keepCreated: ["创建时间", "Created time"],
  keepModified: ["修改时间", "Modified time"],
  keepName: ["文件名（字母顺序）", "File name (alphabetical)"],
  setOverlapName: ["重叠阈值（%）", "Overlap threshold (%)"],
  setOverlapDesc: ["一篇笔记至少有这么多内容出现在另一篇里，才会列入“高度重叠的笔记”。", "A note must share at least this much of its content with another to be listed under overlapping notes."],
  setCleanup: ["清理", "Cleanup"],
  setModeName: ["默认清理方式", "Default cleanup mode"],
  setModeDesc: ["预览窗口里默认选中的方式。删除和替换需要你在预览里再确认一次。", "The mode preselected in the preview. Deleting and replacing always need an extra confirmation there."],
  setLinkStyleName: ["替换时使用", "When replacing, use"],
  setLinkStyleDesc: ["嵌入会在原位置显示被引用的内容，链接只显示一个跳转链接。", "An embed shows the referenced content in place, a link shows only a clickable reference."],
  styleEmbed: ["嵌入", "Embed"],
  styleLink: ["链接", "Link"],
  setPropName: ["标记属性名", "Marker property name"],
  setPropDesc: ["“仅标记”方式写入的属性名称。", "Property written by the mark-only mode."],
  setBackupsName: ["保留的备份数量", "Backups to keep"],
  setBackupsDesc: ["每次清理前会备份被改动的笔记，超过这个数量时删除最旧的。", "Every cleanup backs up the notes it changes; the oldest are deleted beyond this number."],
  setNewTabName: ["在新标签页打开笔记", "Open notes in a new tab"],
  setNewTabDesc: ["点击报告里的笔记时，在新标签页打开，保留报告。", "Open notes from the report in a new tab so the report stays open."],
  setData: ["数据", "Data"],
  setClearCacheName: ["清除扫描缓存", "Clear scan cache"],
  setClearCacheDesc: ["缓存按修改时间记录每篇笔记的指纹，让再次扫描更快。清除后下次扫描会重新读取所有笔记。", "The cache stores each note's fingerprints by modified time so rescans are fast. After clearing, the next scan reads every note again."],
  clear: ["清除", "Clear"],
  cacheCleared: ["已清除缓存", "Cache cleared"],
} as const satisfies Record<string, readonly [string, string]>;

export type StrKey = keyof typeof S;

let lang: 0 | 1 = 1;

/** Chinese when Obsidian runs in a Chinese language, English otherwise. */
export function initLanguage(): void {
  // moment follows Obsidian's own language setting and exists in every supported version
  let l = "en";
  try {
    l = moment.locale() || document.documentElement.lang || "en";
  } catch {
    l = "en";
  }
  lang = l.toLowerCase().startsWith("zh") ? 0 : 1;
}

export function isChinese(): boolean {
  return lang === 0;
}

export function t(key: StrKey, ...args: (string | number)[]): string {
  let s: string = S[key][lang];
  args.forEach((a, i) => {
    s = s.split(`{${i}}`).join(String(a));
  });
  return s;
}
