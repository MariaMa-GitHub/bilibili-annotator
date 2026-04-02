# Bilibili Annotator

A Chrome extension for annotating Bilibili videos. Add timestamped notes, summaries, tags, and ratings to any video — all stored locally in your browser.

[中文](README.md)

---

## Features

- **Annotations** — Add timestamped notes to any point in a video. Click a timestamp to seek directly to it. Categorize annotations (highlight / important / funny / note / custom) and optionally mark them with a color (8 presets, shown as a left-side color bar).
- **Summary** — Write a short and long summary per video. Auto-saves as you type.
- **Tags** — Tag videos for easy filtering later. Autocomplete from your own tag history and a built-in list of common categories.
- **Rating** — Like/dislike or 1–5 star rating, plus a free-text rating note.
- **Watch progress** — Automatically tracks how far you've watched and when you last watched. The sidebar shows the exact position as `MM:SS / MM:SS (X%)`, and the dashboard card shows it alongside the date.
- **Dashboard** — Browse your entire library in one page. Search across titles, summaries, annotation text, and tags. Filter by tag or rating. Sort by last watched, date added, title, or annotation count.
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

The sidebar appears on any `bilibili.com/video/*` page.

- **Toggle** — click the tab on the right edge of the screen, or click the extension icon.
- **Keyboard shortcut** — `Alt+A` opens the annotation form pre-filled with the current timestamp. Configurable in Settings.
- **Fullscreen** — the sidebar hides automatically in fullscreen and full-webpage mode. A small 📋 icon appears as a reminder.

### Dashboard

Click the extension icon on any non-Bilibili page to open the dashboard in a new tab.

### Export / Import

In the dashboard, use **导出数据** to download a `.json` backup. Use **导入数据** to restore — choose to skip existing records or overwrite them.

---

## Keyboard Shortcut

| Shortcut | Action |
|---|---|
| `Alt+A` | Open annotation form at current timestamp |

The shortcut is configurable in the sidebar's Settings panel (⚙).

---

## Settings

Accessible via the ⚙ icon in the sidebar footer.

| Setting | Default | Description |
|---|---|---|
| 侧边栏模式 | 悬浮 | Overlay (floats over page) or 推移 (pushes page content) |
| 默认展开侧边栏 | Off | When enabled, the sidebar opens automatically on every video page |
| 键盘快捷键 | `Alt+A` | Shortcut to open annotation form |
| 进度追踪间隔 | 30s | How often watch progress is saved |
| Feature toggles | All on | Enable/disable each tab individually |

---

## Data

All data lives in `chrome.storage.local` under the extension's origin. No external requests are made.

Each video is stored by its BV ID. The export format is plain JSON — human-readable and easy to process with other tools.

---

## Technical notes

- Manifest V3
- Vanilla JS (ES2020+), no frameworks, no build tools
- No external dependencies
- Content scripts share scope via manifest load order (`utils.js` → `storage.js` → `content.js`)
- Bilibili SPA navigation is detected via `MutationObserver` on the page `<title>`
