# Changelog

## 1.0.0

First release.

- Scan the vault (or chosen folders) for blocks that appear in more than one note: paragraphs, list items with their children, table rows and blockquotes.
- Exact matching on normalised text (Markdown markup, case, whitespace and URL tracking parameters ignored; CJK aware) plus "same post" matching by X/Twitter status id.
- Report view with summary cards, ranked duplicate groups, a per-group choice of which copy to keep, and a view of highly overlapping notes.
- Safe cleanup with an exact preview: mark only (`duplicate_of` property, default), replace with an embed or link, or delete. Every cleanup is backed up first and can be undone; undo skips notes edited since.
- Incremental scan cache keyed by modified time, cancellable scan, UI yields while scanning.
- Chinese and English interface, follows Obsidian's language. Works on desktop and mobile.
