# Bilibili Annotator — Technical Specification

## 1. Overview

A Chrome Extension (Manifest V3) for bilibili.com that lets users annotate, summarize, tag, and rate videos for personal use. All data is stored locally via `chrome.storage.local`. No external servers, no build tools, no frameworks — vanilla JS + HTML + CSS only.

**In scope (v1):**
- Standard Bilibili video pages (`bilibili.com/video/BV*`)
- Single-part and multi-part (分P) videos
- Normal mode and widescreen mode (sidebar visible)
- Full webpage mode and fullscreen mode (sidebar hidden, reminder icon visible)

**Out of scope (v2):**
- Collections/grouping (tags serve this purpose in v1)
- Live streams
- Bangumi / licensed anime pages
- Tag case configurability beyond the normalization rules below

**Tech stack:**
- Manifest V3 Chrome Extension
- Vanilla JS (ES2020+, no modules — scripts share scope via manifest content_scripts array)
- HTML + CSS (no preprocessors)
- `chrome.storage.local` for all persistence

---

## 2. Data Model

All video records are stored in `chrome.storage.local` keyed by BV ID. One reserved key `__settings` stores user preferences.

### Video record

```json
{
  "BV1xx411c7mD": {
    "videoId": "BV1xx411c7mD",
    "title": "string — auto-populated from page h1",
    "url": "https://www.bilibili.com/video/BV1xx411c7mD",
    "thumbnailUrl": "string | null — from og:image meta tag",
    "summaryShort": "string — max 150 chars",
    "summaryLong": "string",
    "rating": "'like' | 'dislike' | null",
    "starRating": "1-5 | null",
    "ratingNote": "string",
    "tags": ["教程", "python"],
    "annotations": [
      {
        "id": "uuid-v4",
        "partNumber": 1,
        "timestampStart": 754,
        "timestampEnd": null,
        "label": "string",
        "category": "'highlight' | 'important' | 'funny' | 'note' | 'custom'"
      }
    ],
    "watchProgress": {
      "lastWatchedAt": "ISO 8601 string",
      "lastPosition": 1234,
      "completed": false
    },
    "createdAt": "ISO 8601 string",
    "updatedAt": "ISO 8601 string"
  }
}
```

Fields explained:
- `partNumber` on annotations: 1-based index matching Bilibili's `?p=` query param. Default `1` for single-part videos.
- `timestampEnd`: null means point annotation; a number means range annotation.
- `rating` and `starRating` are independent and can both be set.
- `watchProgress` is per video (not per part).
- `thumbnailUrl`: stored on first visit so the dashboard can display it without re-fetching.

### Settings record

```json
{
  "__settings": {
    "sidebarMode": "overlay",
    "shortcutKey": "Alt+A",
    "progressInterval": 30,
    "features": {
      "watchProgress": true,
      "annotations": true,
      "summary": true,
      "tags": true,
      "rating": true
    }
  }
}
```

### Global tag index

```json
{
  "__tags": ["教程", "python", "游戏", "music"]
}
```

All tags ever used across all videos, kept in sync on every tag add/remove. Used for autocomplete.

---

## 3. File Structure

```
bilibili-annotator/
├── manifest.json               # Extension manifest (MV3)
├── background/
│   └── background.js           # Service worker: icon click routing
├── content/
│   ├── content.js              # All sidebar logic (injected on video pages)
│   └── content.css             # Sidebar + toggle button styles
├── dashboard/
│   ├── dashboard.html          # Full library page
│   ├── dashboard.js            # Search, filter, sort, export/import
│   └── dashboard.css           # Dashboard styles
├── shared/
│   ├── storage.js              # chrome.storage.local CRUD — loaded before content.js
│   └── utils.js                # BV ID extraction, time formatting, debounce, UUID
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── CLAUDE.md
├── SPEC.md
└── README.md
```

---

## 4. Extension Wiring (manifest.json)

```json
{
  "manifest_version": 3,
  "name": "B站注释器",
  "version": "1.0.0",
  "description": "为Bilibili视频添加标注、摘要、标签和评分",
  "permissions": ["storage", "activeTab"],
  "background": {
    "service_worker": "background/background.js"
  },
  "action": {
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "content_scripts": [
    {
      "matches": ["*://www.bilibili.com/video/*"],
      "js": ["shared/utils.js", "shared/storage.js", "content/content.js"],
      "css": ["content/content.css"],
      "run_at": "document_idle"
    }
  ],
  "commands": {
    "quick-annotate": {
      "suggested_key": {
        "default": "Alt+A"
      },
      "description": "打开快速添加标注"
    }
  },
  "web_accessible_resources": [
    {
      "resources": ["dashboard/dashboard.html"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

Note: `commands` declares the default shortcut for discoverability in Chrome's extension shortcuts UI (`chrome://extensions/shortcuts`). The actual shortcut handling is done exclusively by the content script's `keydown` listener using the configured shortcut string from settings. The background service worker does not forward `commands.onCommand` events — this avoids double-trigger when the configured shortcut matches the manifest-declared default.

---

## 5. Shared Modules

### shared/utils.js

Exported as global functions (no ES module syntax — shared via script loading order):

- `extractBVId(url)` — extracts `BV1xx411c7mD` from a bilibili video URL. Handles `/video/BV…`, `/video/BV…?p=2`, etc.
- `extractPartNumber(url)` — returns integer from `?p=` param, default `1`.
- `formatTimestamp(seconds)` — converts seconds to `MM:SS` or `H:MM:SS` string.
- `parseTimestamp(str)` — converts `MM:SS` or `H:MM:SS` string to seconds integer.
- `debounce(fn, ms)` — standard debounce implementation.
- `generateUUID()` — RFC 4122 v4 UUID using `crypto.randomUUID()` with fallback.
- `normalizeTag(tag)` — if tag is ASCII-only, return `tag.toLowerCase()`; otherwise return `tag` as-is (Chinese characters, mixed).
- `tokenize(text)` — splits text on whitespace, Chinese punctuation, and common delimiters. Returns array of lowercase tokens. Used for search.

### shared/storage.js

All functions return Promises (async/await). Exported as global object `BiliStorage`:

- `BiliStorage.getVideo(bvId)` → video record or `null`
- `BiliStorage.saveVideo(bvId, record)` → saves full record, updates `updatedAt`
- `BiliStorage.getAllVideos()` → object of all video records (excludes `__settings`, `__tags`)
- `BiliStorage.getSettings()` → settings object with defaults merged
- `BiliStorage.saveSettings(settings)` → saves settings
- `BiliStorage.getTags()` → array of all known tags
- `BiliStorage.addTag(tag)` → adds to `__tags` if not already present
- `BiliStorage.removeTagFromIndex(tag)` → only removes from index if no video uses it
- `BiliStorage.exportAll()` → returns full storage dump as JSON-serializable object
- `BiliStorage.importAll(data, strategy)` → strategy is `'skip'` or `'overwrite'`

---

## 6. Content Script — Sidebar

### 6.1 Lifecycle & SPA Navigation

On `document_idle`, `content.js` initializes once. Bilibili is a SPA, so navigation between videos must be detected without page reload.

Detection strategy:
1. `MutationObserver` on `document.querySelector('title')` — fires when the page title changes (Bilibili updates title on navigation).
2. `window.addEventListener('popstate', ...)` as fallback.

On navigation detected:
1. Save current video's watch progress.
2. Extract new BV ID from `window.location.href`.
3. If BV ID unchanged, do nothing.
4. Load or create new video record.
5. Re-render sidebar content without re-injecting the sidebar chrome (toggle button, sidebar shell persist).

On extension load (first run on a video page):
1. Inject sidebar chrome into `document.body`.
2. Load settings (sidebar mode, feature toggles).
3. Extract BV ID and part number.
4. Load or create video record (auto-populate title from `document.querySelector('h1')`, thumbnail from `document.querySelector('meta[property="og:image"]')`).
5. Render sidebar content.
6. Start watch progress interval if feature enabled.

### 6.2 Sidebar Chrome

The sidebar is injected as a `<div id="bili-annotator-sidebar">` appended to `document.body`. It contains:
- A toggle tab (`<div id="bili-annotator-toggle">`) on the left edge of the sidebar — always visible
- The sidebar panel with header, tab bar, tab content area, and footer

**Overlay mode** (default): sidebar is `position: fixed; right: 0; top: 0; height: 100vh; z-index: 9000`. The page content is not shifted.

**Push mode**: sidebar is `position: fixed; right: 0; top: 0; height: 100vh`. `document.body` gets `margin-right: 320px` while the sidebar is open.

**Collapsed state**: sidebar panel hidden, only toggle tab visible (small `position: fixed; right: 0` tab).

**Fullscreen / full-webpage detection**: Listen to `document.addEventListener('fullscreenchange', ...)` and a `MutationObserver` on `document.body` watching for Bilibili's full-webpage class (`player-full-win` or equivalent). When either is active:
- Hide the sidebar panel and toggle tab.
- Show a small reminder icon (`position: fixed; bottom: 80px; right: 16px; z-index: 9999`) with a 📋 icon. Clicking it does nothing (sidebar unavailable in fullscreen).
- On exit, restore sidebar state.

### 6.3 Watch Progress Tracker

Runs only if `features.watchProgress` is enabled.

- `setInterval` every `progressInterval` seconds (from settings, default 30).
- On each tick: read `video.currentTime` and `video.duration`. If `duration > 0`, update `watchProgress.lastPosition` and `watchProgress.lastWatchedAt`. If `currentTime / duration > 0.9`, set `watchProgress.completed = true`.
- `window.addEventListener('beforeunload', ...)` triggers a final save.
- Displayed at the top of the sidebar as: `上次观看：[date] — 已观看[percent]%` with a thin progress bar.

**Player element access:**
```js
function getVideoElement() {
  const el = document.querySelector('video');
  if (el) return el;
  // poll up to 10 times at 250ms intervals
}
```
If no video element found after 10 attempts, watch progress tracking is silently skipped for this session.

### 6.4 Tab: 标注 (Annotations)

**List view:**
- Annotations sorted by `timestampStart` ascending.
- If video has multiple parts: show annotations for current part number by default. A toggle button "显示全部分P" shows all parts (with part number badge on each annotation).
- Each row: `[timestamp] [label] [category badge] [edit] [delete]`
- Timestamp is a clickable link — clicking sets `video.currentTime = annotation.timestampStart`.
- Range annotations show `12:34 → 15:20` in the timestamp column.
- Category badge colors: 精彩=orange `#ff6d00`, 重要=green `#2e7d32`, 搞笑=pink `#880e4f`, 笔记=blue `#1565c0`, 自定义=gray `#757575`.

**Add/Edit form** (inline, below the list):
- Triggered by "+ 添加标注" button or configured keyboard shortcut.
- Fields:
  - 时间起点: pre-filled with current `video.currentTime`, formatted as `MM:SS`. Editable.
  - 时间终点: empty by default. Optional.
  - 分P: shown only if `video` has multiple parts. Pre-filled with current part.
  - 标注内容: text input, required.
  - 分类: `<select>` — 精彩 / 重要 / 搞笑 / 笔记 / 自定义.
- 保存 button: validates (label non-empty, timestamps are valid), generates UUID, saves, re-renders list, collapses form.
- 取消 button: collapses form with no save.
- Edit mode: pre-fills all fields from existing annotation, replaces on save.

**Keyboard shortcut:**
- Listen to `document.addEventListener('keydown', ...)` in the content script.
- Compare `event.key` and `event.altKey`/`event.ctrlKey` against the configured shortcut string.
- If match: prevent default, open the add-annotation form pre-filled with current `video.currentTime`.

### 6.5 Tab: 摘要 (Summary)

- Short summary: `<input type="text">` with `maxlength="150"`, character counter shown below (`n/150`).
- Long summary: `<textarea>` with no max length.
- Auto-save on both fields: debounced 1 second after last keypress. Also saves on `blur`.
- Both fields pre-filled from stored record on load.

### 6.6 Tab: 标签 (Tags)

- Existing tags displayed as chips with ✕ remove button.
- Input field below chips for adding tags.
- On input focus: show autocomplete dropdown combining:
  1. Predefined tags (Chinese): 游戏, 音乐, 教程, 电影, 动漫, 美食, 科技, 日常, 纪录片, 搞笑, 教育, 体育, 新闻, 测评
  2. All tags from `__tags` index
  - Filtered to exclude already-applied tags. Predefined tags listed first, then user tags alphabetically.
- Press Enter or click suggestion to add tag.
- Normalization: `normalizeTag(input)` applied before add. Deduplication check against normalized existing tags.
- On add: save to video record, add to `__tags` index, re-render chips.
- On remove: remove from video record, call `BiliStorage.removeTagFromIndex(tag)`, re-render chips.

### 6.7 Tab: 评分 (Rating)

- Mode toggle at top: "简单" / "详细" (simple / detailed). The selected mode is not persisted — defaults to "简单" each time the sidebar loads. The underlying `rating` and `starRating` values are independent and both stored in the record, so switching modes never loses data.
- **Simple mode**: Two large buttons 👍 and 👎. Clicking highlights the active one. Clicking active button deselects (sets `rating = null`). Auto-saves on click.
- **Detailed mode**: Five star icons. Click star N to set `starRating = N`. Click active star again to deselect (`starRating = null`). Display: `★★★☆☆ (3/5)`. Auto-saves on click.
- Below rating controls: `<textarea>` for 评价理由 (ratingNote). Debounced auto-save.

### 6.8 Settings Panel

Accessible via a ⚙ icon in the sidebar footer. Replaces tab content area (full-height within sidebar).

Settings:

| Label | Control | Key | Default |
|---|---|---|---|
| 侧边栏模式 | Toggle: 悬浮 / 推移 | `sidebarMode` | `overlay` |
| 键盘快捷键 | Key capture input | `shortcutKey` | `Alt+A` |
| 进度追踪间隔 | Number input (秒) | `progressInterval` | `30` |
| 观看进度追踪 | Checkbox | `features.watchProgress` | `true` |
| 标注功能 | Checkbox | `features.annotations` | `true` |
| 摘要功能 | Checkbox | `features.summary` | `true` |
| 标签功能 | Checkbox | `features.tags` | `true` |
| 评分功能 | Checkbox | `features.rating` | `true` |

Key capture input: on focus, listen for next keydown event and record `event.key` + modifier flags as the new shortcut string (e.g. `"Alt+A"`). Show the captured combo as text.

All settings auto-save on change. Sidebar mode change takes effect immediately (re-applies CSS class).

---

## 7. Background Service Worker

```js
chrome.action.onClicked.addListener(async (tab) => {
  const isVideoPage = tab.url && tab.url.match(/bilibili\.com\/video\//);
  if (isVideoPage) {
    chrome.tabs.sendMessage(tab.id, { type: 'toggleSidebar' });
  } else {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/dashboard.html') });
  }
});
```

The content script listens for `{ type: 'toggleSidebar' }` and toggles the sidebar open/closed state.

The keyboard shortcut for quick annotation is handled entirely in the content script's `keydown` listener (not via `chrome.commands.onCommand`) so that the user-configured shortcut from settings takes effect. The background service worker does not handle `commands.onCommand`.

---

## 8. Dashboard

### 8.1 Layout

Single HTML page opened in a new tab. No routing — one view.

Structure:
- Top bar: app name ("B站注释器"), search input, Export button, Import button
- Filter/sort bar: tag filter chip picker, rating filter dropdown, sort dropdown, video count
- Main grid: responsive 2–4 column card grid

### 8.2 Video Cards

Each card displays:
- Thumbnail (`<img>` from stored `thumbnailUrl`) with gradient placeholder fallback
- Title (linked to `video.url`, opens in new tab)
- Short summary (if set)
- Tag chips
- Rating indicator (👍/👎 or ⭐×N)
- Annotation count ("📌 N条标注")
- Last watched date

### 8.3 Search

Tokenized, Chinese-aware full-text search across: `title`, `summaryShort`, `summaryLong`, all `annotations[].label`, and all `tags`.

Algorithm:
1. Tokenize the query using `tokenize(query)`.
2. For each video, build a searchable text by concatenating all searchable fields, then tokenize.
3. A video matches if every query token is a substring of at least one of the video's tokens.
4. Results update as the user types (debounced 200ms).

### 8.4 Filters

**Tag filter**: Multi-select chip picker showing all known tags. Selected tags narrow results to videos that have ALL selected tags.

**Rating filter**: Dropdown options:
- 全部
- 已点赞
- 已点踩
- 未评分
- ⭐ 3星及以上
- ⭐ 4星及以上
- ⭐ 5星

### 8.5 Sort

Options:
- 最近观看 (by `watchProgress.lastWatchedAt` desc, or `updatedAt` if no watch progress)
- 添加日期 (by `createdAt` desc)
- 标题 (alphabetical asc, using `localeCompare` with Chinese locale)
- 标注数量 (by `annotations.length` desc)

### 8.6 Export

Button: "导出数据"
1. Call `BiliStorage.exportAll()`.
2. `JSON.stringify(data, null, 2)`.
3. Create `Blob` with `application/json`.
4. `URL.createObjectURL` → programmatic `<a download="bilibili-annotator-export-YYYY-MM-DD.json">` click.
5. Revoke object URL after download.

### 8.7 Import

Button: "导入数据" → triggers `<input type="file" accept=".json">`.

On file selected:
1. Read with `FileReader.readAsText`.
2. Parse JSON. On parse error: show inline error message.
3. Show a simple strategy picker (two buttons in an inline panel): "跳过已有记录" / "覆盖已有记录".
4. Call `BiliStorage.importAll(data, strategy)`.
5. Show success message: "已导入 N 条记录". Reload the video grid.

`importAll` with `'skip'`: for each BV ID in import data, only write if key doesn't exist in storage.
`importAll` with `'overwrite'`: write all keys from import data unconditionally. `__settings` and `__tags` from import data are merged, not replaced.

---

## 9. Bilibili-Specific Notes

### URL patterns
Match: `*://www.bilibili.com/video/*`

BV ID extraction: regex `/(BV[a-zA-Z0-9]+)/` against `window.location.pathname`.

Part number extraction: regex `/[?&]p=(\d+)/` against `window.location.search`. Default to `1` if absent.

### Player element
```js
document.querySelector('video')
```
Bilibili renders the `<video>` element directly in the main document on standard video pages. If not immediately available at `document_idle`, poll at 250ms intervals, up to 10 attempts (2.5s total). After 10 failures, disable watch progress and timestamp auto-fill for this session.

### Multi-part detection
Bilibili shows a part list element (`.video-sections-content` or similar) for multi-part videos. Check `document.querySelector('.video-sections-content')` or the `?p=` URL param. If either is present, the video is multi-part.

### SPA navigation
Bilibili uses React Router. `popstate` fires on back/forward but not on internal link clicks. Use `MutationObserver` on `document.querySelector('head title')` to catch all navigations:

```js
const observer = new MutationObserver(() => {
  const newUrl = window.location.href;
  if (newUrl !== lastUrl) {
    lastUrl = newUrl;
    onNavigation(newUrl);
  }
});
observer.observe(document.querySelector('title'), { childList: true });
```

### Fullscreen detection
- Standard fullscreen: `document.addEventListener('fullscreenchange', ...)`, check `document.fullscreenElement`.
- Bilibili full-webpage mode: watch for class changes on `document.body` or the player container. Common class: `player-full-win` on `.bilibili-player-video-wrap` or `body`. Use `MutationObserver` on `document.body` watching `classList`.

---

## 10. Settings Reference

| Key | Type | Default | Description |
|---|---|---|---|
| `sidebarMode` | `'overlay' \| 'push'` | `'overlay'` | Sidebar positioning mode |
| `shortcutKey` | `string` | `'Alt+A'` | Keyboard shortcut for quick annotation |
| `progressInterval` | `number` | `30` | Watch progress save interval in seconds |
| `features.watchProgress` | `boolean` | `true` | Enable/disable watch progress tracking |
| `features.annotations` | `boolean` | `true` | Show/hide annotations tab |
| `features.summary` | `boolean` | `true` | Show/hide summary tab |
| `features.tags` | `boolean` | `true` | Show/hide tags tab |
| `features.rating` | `boolean` | `true` | Show/hide rating tab |

Defaults are merged at read time in `BiliStorage.getSettings()` — settings saved before a new setting is added still work correctly.

---

## 11. v2 Backlog

- **Collections**: Named groups for videos. Global collection list, add/remove video from sidebar, group view in dashboard.
- **Live stream support**: Different URL pattern, no BV ID, no seek — limited annotation support.
- **Bangumi / licensed content**: Different URL structure (`/bangumi/play/`), episode-level tracking.
- **Tag configurability**: Option to preserve original case rather than lowercasing English tags.
- **Annotation export as subtitles**: Export annotations as SRT/VTT file.
- **Sync**: Optional cross-device sync via user-provided storage (e.g., a JSON file on a file server).
