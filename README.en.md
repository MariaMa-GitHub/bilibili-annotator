# Bilibili Annotator

A Chrome extension for annotating Bilibili videos. Add timestamped notes, summaries, tags, and ratings to any video — all stored locally in your browser.

[中文](README.md)

---

## Features

- **Annotations** — Add timestamped notes to any point in a video. Click a timestamp to seek directly to it. Categorize annotations (highlight / important / funny / note / custom) and optionally mark them with a color (8 presets, shown as a left-side color bar). Deleting shows an inline confirmation (确定 / 取消) to prevent accidental deletion.
- **Summary** — Write a short and long summary per video. Auto-saves as you type.
- **Tags** — Tag videos for easy filtering later. Autocomplete from your own tag history and a built-in list of common categories.
- **Rating** — Like/dislike or 1–5 star rating, plus a free-text rating note.
- **Watch progress** — Automatically tracks how far you've watched and when you last watched. The sidebar shows the exact position as `MM:SS / MM:SS (X%)`. For multi-part videos, progress is tracked globally across all parts (global position / total series duration). Progress saves immediately on pause, seek, or tab switch — with a periodic interval as backup.
- **Dashboard** — Browse all annotated videos in one page (only videos with at least one annotation, summary, rating, or like/dislike are shown). Search across titles, summaries, annotation text, and tags. Filter using three independent controls: a multi-select tag dropdown, 👍/👎 toggle buttons, and [3★+] [4★+] [5★] toggle buttons. Sort by last watched, date added, annotation count, or rating (ties broken alphabetically). Cards show a progress bar, exact timestamp (`X% · MM:SS / MM:SS`), and last-watched date. Paginated at 20 per page.
- **Export / Import** — Export your full library as a JSON file and import it on another machine.

All data is stored locally via `chrome.storage.local`. Nothing is sent to any server.

---

## Installation

This extension is not on the Chrome Web Store. Load it as an unpacked extension:

1. Clone or download this repo.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the project root folder.

---

## Usage

### Sidebar

The sidebar appears on any `www.bilibili.com/video/*` page.

- **Toggle** — click the tab on the right edge of the screen, click the extension icon, or press `Alt+S`.
- **Keyboard shortcut** — `Alt+A` opens the annotation form pre-filled with the current timestamp. Configurable in Settings.
- **Fullscreen** — the sidebar hides automatically in fullscreen and full-webpage mode, and restores when you exit.

### Dashboard

Press `Alt+D` from any page, or click the extension icon on any non-Bilibili video page, to open the dashboard in a new tab. Cards show the video title, tags, a watch progress bar, exact timestamp, and last-watched date.

### Export / Import

In the dashboard, use **导出数据** to download a `.json` backup. Use **导入数据** to restore — choose to skip existing records or overwrite them.

The export file contains all data (video records, tag index, settings). On import, only video records and the tag index are restored; **settings are intentionally not imported** to prevent accidentally overwriting your local preferences via a shared file.

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Alt+A` | Open annotation form at current timestamp |
| `Alt+S` | Toggle sidebar |
| `Alt+D` | Open dashboard |

`Alt+S` and `Alt+D` are browser-level shortcuts and can be changed at `chrome://extensions/shortcuts` — they work even when focus is in the video player.

`Alt+A` can be changed in two ways:
- **In-extension**: via the ⚙ Settings panel in the sidebar (applies when the page has focus)
- **Browser-level**: via `chrome://extensions/shortcuts` (works even when focus is in the video player; the `quick-annotate` entry has no default binding — set it manually if you want browser-level control)

---

## Settings

Accessible via the ⚙ icon in the sidebar footer.

| Setting | Default | Description |
|---|---|---|
| 侧边栏模式 | 悬浮 | Overlay (floats over page) or 推移 (pushes page content left) |
| 默认展开侧边栏 | Off | When enabled, the sidebar opens automatically on every video page |
| 键盘快捷键 | `Alt+A` | Shortcut to open annotation form |
| 进度追踪间隔 | 30s | How often watch progress is saved on a timer (also saves immediately on pause/seek/tab switch) |
| Feature toggles | All on | Enable/disable watch progress, summary, tags, and rating tabs individually |

---

## Data

All data lives in `chrome.storage.local` under the extension's origin. No external requests are made. Storage is unrestricted (`unlimitedStorage` permission) to accommodate thumbnail images.

Each video is stored by its BV ID. The export format is plain JSON — human-readable and easy to process with other tools.

---

## Technical notes

- Manifest V3, with `unlimitedStorage` permission
- Vanilla JS (ES2020+), no frameworks, no build tools
- No external dependencies
- Content scripts share scope via manifest load order (`utils.js` → `storage.js` → `content.js`)
- Bilibili SPA navigation is detected via `MutationObserver` on the page `<title>`
- Dashboard is a fixed-viewport layout with pagination (20 cards per page)
