# Claude Code Prompt: Bilibili Video Annotator Chrome Extension

## Project Overview

Build a Chrome Extension (Manifest V3) for the Chinese video streaming site Bilibili (bilibili.com). The extension lets users annotate, summarize, tag, and rate Bilibili videos for personal use. All data is stored locally using Chrome's `chrome.storage.local` API. The UI must be in **Chinese (简体中文)** and injected as a sidebar panel on Bilibili video pages. All labels, buttons, placeholders, tooltips, tab names, and messages should be in Chinese. For example: tabs should read "标注", "摘要", "标签", "评分"; buttons like "添加标注", "导出数据", "导入数据"; status text like "上次观看：2025年1月15日 — 已观看65%".

## Tech Stack

- **Manifest V3** Chrome Extension
- **Vanilla JS + HTML + CSS** (no frameworks — keep it simple and dependency-free)
- **chrome.storage.local** for persistence
- No external servers or APIs

## Core Data Model

Each video record is keyed by Bilibili video ID (the `BV` ID from the URL, e.g. `BV1xx411c7mD`). Structure:

```json
{
  "BV1xx411c7mD": {
    "videoId": "BV1xx411c7mD",
    "title": "Auto-populated from page",
    "url": "https://www.bilibili.com/video/BV1xx411c7mD",
    "thumbnailUrl": "auto-populated if possible",
    "summaryShort": "One-line summary",
    "summaryLong": "Optional longer description...",
    "rating": "like" | "dislike" | null,
    "starRating": 1-5 | null,
    "ratingNote": "Optional short reason for the rating",
    "tags": ["Gaming", "Funny"],
    "annotations": [
      {
        "id": "uuid",
        "timestampStart": 754,
        "timestampEnd": null,
        "label": "Boss fight starts here",
        "category": "highlight" | "important" | "funny" | "note" | "custom"
      }
    ],
    "watchProgress": {
      "lastWatchedAt": "2025-01-15T10:30:00Z",
      "lastPosition": 1234,
      "completed": false
    },
    "collections": ["CS Lectures"],
    "createdAt": "2025-01-15T10:00:00Z",
    "updatedAt": "2025-01-15T10:30:00Z"
  }
}
```

## Features to Implement

### 1. Sidebar Panel (Content Script — injected on bilibili.com/video/* pages)

- Inject a collapsible sidebar on the right side of Bilibili video pages.
- The sidebar should have a toggle button (small floating icon) that opens/closes it.
- The sidebar contains tabbed sections: **Annotations**, **Summary**, **Tags**, **Rating**.
- Auto-detect the current video's BV ID from the URL and load any existing data.
- Auto-populate the video title from the page's DOM (`<h1>` or the appropriate selector on Bilibili).
- Auto-populate the video thumbnail URL from the page's `<meta property="og:image">` tag or Bilibili's video info element. Store this in the video record so the dashboard can display it without re-fetching.

### 2. Annotations Tab

- Display a list of existing annotations sorted by timestamp.
- Each annotation shows: formatted timestamp (e.g. "12:34" or "1:23:45"), label text, and category badge.
- "Add Annotation" button that:
  - Auto-fills the current video playback time by reading it from Bilibili's player (query the `<video>` element's `currentTime`).
  - Lets the user manually edit the timestamp if needed.
  - Has a text field for the annotation label.
  - Has a dropdown for category: 精彩 (Highlight), 重要 (Important), 搞笑 (Funny), 笔记 (Note), 自定义 (Custom).
  - An end timestamp field for marking time ranges (e.g. "fight scene from 12:34 to 15:20"). This is optional — if left empty, the annotation is a single-point marker.
- Clicking an annotation's timestamp should seek the video to that time (set `video.currentTime`).
- Each annotation has edit and delete buttons.
- **Keyboard shortcut**: Pressing `Alt+A` while on a video page should open a quick-add annotation dialog pre-filled with the current playback time.

### 3. Summary Tab

- A short summary field (single-line input, max ~150 chars, with character counter).
- A long summary field (multi-line textarea).
- Auto-save on blur or after 1 second of inactivity (debounced).

### 4. Tags Tab

- Display current tags as removable chips/badges.
- Input field with autocomplete that suggests from:
  - A set of predefined common tags (displayed in Chinese): 游戏, 音乐, 教程, 电影, 动漫, 美食, 科技, 日常, 纪录片, 搞笑, 教育, 体育, 新闻, 测评.
  - All tags the user has ever used across any video (pulled from storage).
- Tags are case-insensitive and normalized (stored lowercase, displayed capitalized).
- Press Enter or click to add a tag. Click the X on a chip to remove.

### 5. Rating Tab

- Provide two rating modes the user can toggle between:
  - **Simple mode**: Two large buttons: 👍 Like and 👎 Dislike. Clicking one highlights it; clicking again deselects (toggle behavior).
  - **Detailed mode**: A 5-star rating (clickable stars, click again to deselect). Display the star count next to the stars.
- The user can switch between modes via a small toggle in the tab. Both modes write to the same underlying data: simple mode maps to `rating: "like"|"dislike"|null`, detailed mode maps to `starRating: 1-5|null`. Both fields can coexist.
- Below the rating controls, an optional "评价理由" (reason) text field where the user can write a short note explaining their rating. This is especially useful when revisiting a video months later.
- Auto-save.

### 6. Watch Progress Tracking

- Automatically record the video's current playback position periodically (every 30 seconds) and on page unload.
- Store `lastWatchedAt`, `lastPosition`, and `completed` (mark as complete if position > 90% of duration).
- Display a small "上次观看：2025年1月15日 — 已观看65%" line at the top of the sidebar.

### 7. Dashboard Page (Extension Popup or New Tab)

- Accessible by clicking the extension icon in the toolbar. Opens as a new tab (`chrome.tabs.create` pointing to an HTML page bundled in the extension).
- Shows a searchable, filterable, sortable list/grid of all saved videos.
- Each video card shows: title (linked to the Bilibili URL), thumbnail if available, short summary, tags as chips, rating icon, annotation count, last watched date.
- **Search**: full-text search across titles, summaries, annotation labels, and tags.
- **Filters**: filter by tag (multi-select), by rating (like/dislike/unrated, and by star rating range), by collection.
- **Sort**: by date added, last watched, title alphabetical, annotation count.
- **Collections view**: group videos by collection. Users can create/rename/delete collections and drag videos into them from the dashboard.

### 8. Export / Import

- In the dashboard, provide "Export All Data" button that downloads a `.json` file with all stored data.
- "Import Data" button that accepts a `.json` file and merges it with existing data (prompt the user for conflict resolution strategy: skip existing, overwrite, or merge annotations).

### 9. Collections

- In the sidebar, a small "Collections" section or tab where the user can add/remove the current video from collections.
- Collections are just named groups (array of strings on each video record + a global list of collection names).

## UI/UX Guidelines

- **Visual style**: Clean, minimal, with a light theme that doesn't clash with Bilibili's dark/blue UI. Use a semi-transparent white background for the sidebar with subtle shadows. The sidebar should feel like a native part of the page, not an afterthought.
- **Width**: Sidebar should be ~320px wide, collapsible to just the toggle button.
- **Animations**: Smooth slide-in/out for the sidebar. Subtle transitions on hover/active states.
- **Responsive**: The sidebar should not break the video page layout. Bilibili's main content should shrink or the sidebar should overlay on top (user preference via a settings toggle: "push" vs "overlay" mode).
- **Fonts**: Use system fonts (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`).
- **Z-index**: Ensure the sidebar sits above Bilibili's UI but below any native modals/popups.

## File Structure

```
bilibili-annotator/
├── manifest.json
├── content/
│   ├── content.js          # Main content script
│   ├── content.css         # Sidebar styles
│   └── sidebar.html        # Sidebar HTML template (injected via JS)
├── dashboard/
│   ├── dashboard.html      # Full dashboard page
│   ├── dashboard.js
│   └── dashboard.css
├── background/
│   └── background.js       # Service worker for extension events
├── shared/
│   ├── storage.js          # All chrome.storage.local read/write helpers
│   └── utils.js            # Shared utilities (time formatting, ID extraction, etc.)
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## Implementation Notes

- **Bilibili URL patterns**: Match `*://www.bilibili.com/video/*`. The BV ID can be extracted from the URL path (e.g. `/video/BV1xx411c7mD` or with query params).
- **Bilibili player interaction**: The `<video>` element is inside nested iframes or shadow DOM on some page layouts. You'll need to query carefully. Start with `document.querySelector('video')` and handle edge cases.
- **SPA navigation**: Bilibili is a single-page app. The content script must detect URL changes (use `MutationObserver` on the `<title>` or listen to `popstate`/`hashchange`) and re-initialize the sidebar for the new video.
- **Storage limits**: `chrome.storage.local` has a 10MB default limit. For a personal tool with hundreds of videos, this should be fine, but the export feature serves as a backup.
- **No external dependencies**: Everything should be vanilla JS. Do not use React, Vue, jQuery, or any build tools. The extension should work by simply loading it as an unpacked extension in Chrome.

## Step-by-Step Build Order

1. Set up `manifest.json` with correct permissions (`storage`, `activeTab`) and content script matching.
2. Build the `shared/storage.js` module with all CRUD operations for the data model.
3. Build the `shared/utils.js` with time formatting and BV ID extraction.
4. Build the sidebar HTML/CSS structure with all tabs.
5. Build `content.js` — inject sidebar, wire up tabs, implement each feature (annotations, summary, tags, rating).
6. Implement watch progress auto-tracking.
7. Implement keyboard shortcut (`Alt+A`).
8. Build the dashboard page (HTML + JS + CSS).
9. Implement search, filter, sort, and collections in the dashboard.
10. Implement export/import.
11. Test on live Bilibili video pages and fix edge cases (SPA navigation, player element detection, etc.).
12. Create simple extension icons (can be placeholder colored squares for now).

## Quality Requirements

- All data operations must be defensive (handle missing fields, corrupted data gracefully).
- Use `async/await` with `chrome.storage.local` (it returns Promises in MV3).
- No console errors on any Bilibili page, even non-video pages where the sidebar shouldn't appear.
- The sidebar must not interfere with Bilibili's native functionality (comments, danmaku, player controls, etc.).
