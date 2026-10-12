# Changelog

## 1.1.0

Made for people who have never used a dedupe tool.

- Welcome screen: what the plugin does in two sentences, a three-step guide, a plain scope picker (whole vault or one folder), a big **Start scan** button and "scanning is read-only".
- Results start with one sentence ("Found 8 repeated passages across 12 notes, saves about 12k words") and a **Handle all (recommended)** button. Each passage reads "This passage appears in 3 notes", with a readable preview, note names with dates, **Keep only the earliest** and **Ignore** (remembered across scans).
- Choosing a different copy, other ways to clean, sorting and "notes that are mostly repeats" moved into folded **Advanced options**.
- Preview shows before and after per note, big **Confirm** and **Cancel**; afterwards a notice with **Undo**. **Undo last cleanup** stays in the header.
- New **What does this do?** dialog with a before/after example, also available as a command.
- Settings split into Basics and Advanced, all in plain words. Ribbon and command renamed to **Find duplicate content**; the ribbon now opens the welcome screen instead of scanning right away.
- In Chinese the header reads 重复内容清理; the plugin name and id are unchanged.

中文：

- 新的欢迎页：两句话说明用途，三步引导（扫描、查看哪些内容重复了、选择怎么处理），扫描范围可选整个笔记库或某个文件夹，大大的“开始扫描”按钮，并说明扫描只读。
- 结果页先用一句话总结（在几篇笔记中发现几段重复内容、可减少多少字），提供“一键处理全部（推荐方式）”。每一段写成“这段内容在 3 篇笔记里出现”，附可读预览、带日期的笔记名，以及“只保留最早那份”和“忽略”（忽略会被记住）。
- 改保留哪一份、其他处理方式、排序、“整篇笔记大部分重复”都收进折叠的“高级选项”。
- 预览按笔记显示“之前 / 之后”，大号“确认处理”和“取消”；处理后弹出带“撤销”按钮的提示，页面顶部一直有“撤销上一次处理”。
- 新增“这是做什么的？”说明窗口，带处理前后示例。
- 设置分为“基础”和“高级”，全部改成大白话。侧边栏图标和命令改名为“查找重复内容”，点图标先显示欢迎页，不再直接扫描。

## 1.0.0

First release.

- Scan the vault (or chosen folders) for blocks that appear in more than one note: paragraphs, list items with their children, table rows and blockquotes.
- Exact matching on normalised text (Markdown markup, case, whitespace and URL tracking parameters ignored; CJK aware) plus "same post" matching by X/Twitter status id.
- Report view with summary cards, ranked duplicate groups, a per-group choice of which copy to keep, and a view of highly overlapping notes.
- Safe cleanup with an exact preview: mark only (`duplicate_of` property, default), replace with an embed or link, or delete. Every cleanup is backed up first and can be undone; undo skips notes edited since.
- Incremental scan cache keyed by modified time, cancellable scan, UI yields while scanning.
- Chinese and English interface, follows Obsidian's language. Works on desktop and mobile.
