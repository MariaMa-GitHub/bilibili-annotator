# Bilibili Annotator — Claude Code Instructions

## What This Is

A Chrome Extension (Manifest V3) for bilibili.com. Lets the user annotate, summarize, tag, and rate Bilibili videos. All data stored locally in `chrome.storage.local`. No frameworks, no build tools, no external dependencies — vanilla JS + HTML + CSS only.

Read `SPEC.md` for the full technical specification before making any changes.

---

## Constraints

- **No frameworks**: No React, Vue, Svelte, jQuery, or any UI library.
- **No build tools**: No Webpack, Vite, Rollup, esbuild, or any bundler. The extension must work as an unpacked extension loaded directly in Chrome.
- **No ES modules**: Content scripts share scope via manifest loading order (`utils.js` → `storage.js` → `content.js`). Do not use `import`/`export`. Expose shared APIs as global objects (e.g., `BiliStorage`, `BiliUtils`).
- **No external dependencies**: No npm packages. No CDN scripts. Everything is self-contained.
- **Manifest V3**: Use `chrome.storage.local` (Promise-based), service worker for background, `chrome.action` (not `browserAction`). Do not use MV2 APIs.
- **Chinese UI**: All user-facing text is in Simplified Chinese (简体中文). This includes labels, buttons, placeholders, tooltips, status messages, and error messages.

---

## File Ownership

| File | Purpose |
|---|---|
| `manifest.json` | Extension manifest — permissions, content scripts, commands, action |
| `shared/utils.js` | Pure utility functions: BV ID extraction, timestamp formatting, debounce, UUID, tag normalization, tokenizer |
| `shared/storage.js` | All `chrome.storage.local` CRUD. Exposed as global `BiliStorage` object |
| `content/content.js` | All sidebar logic: injection, tabs, SPA navigation detection, watch progress |
| `content/content.css` | Sidebar styles, toggle button, all sidebar UI components |
| `dashboard/dashboard.html` | Dashboard page structure |
| `dashboard/dashboard.js` | Dashboard logic: rendering, search, filter, sort, export, import |
| `dashboard/dashboard.css` | Dashboard styles |
| `background/background.js` | Service worker: routes icon clicks (toggle sidebar vs open dashboard) |

---

## Chrome Extension Patterns

- **Storage**: Always use `async/await` with `chrome.storage.local.get`/`set`. It returns Promises in MV3. Never use callback style.
- **Content script ↔ background**: Use `chrome.tabs.sendMessage` (background → content) and `chrome.runtime.onMessage` (content listener).
- **Script load order**: The manifest lists `["shared/utils.js", "shared/storage.js", "content/content.js"]`. Functions defined in utils.js and storage.js are available as globals in content.js. Do not assume any other load order.
- **Service workers**: Background.js is a service worker — it has no access to the DOM and cannot use `window`. Use `chrome.runtime` and `chrome.tabs` APIs only.
- **Defensive data access**: All storage reads must handle missing/null/undefined fields gracefully. The data model evolves; old records may not have new fields.

---

## Bilibili-Specific Gotchas

- **SPA navigation**: Bilibili is a React SPA. Page navigations do not trigger a page reload. Detect navigation by observing `document.querySelector('title')` with a `MutationObserver`. See `SPEC.md §9` for the pattern.
- **Video player element**: Use `document.querySelector('video')`. If not immediately present at `document_idle`, poll every 250ms up to 10 times. Do not traverse iframes for v1.
- **BV ID extraction**: Regex `/(BV[a-zA-Z0-9]+)/` on `window.location.pathname`. Never rely on query params for the BV ID.
- **Multi-part videos**: Part number from `?p=` query param. Default to `1` if absent.
- **Fullscreen modes**: Bilibili has two non-standard fullscreen modes beyond the browser fullscreen API:
  - Full webpage mode: toggled by a class on the player container or body (observe `classList` changes)
  - Standard fullscreen: use `document.fullscreenchange` event
  - In both cases, hide the sidebar and show a small 📋 reminder icon.
- **Z-index**: Bilibili's UI uses z-index values up to ~1000. Use `z-index: 9000` for the sidebar and `z-index: 9999` for the fullscreen reminder icon.
- **CSS isolation**: Prefix all sidebar CSS classes with `bili-annotator-` to avoid conflicts with Bilibili's own CSS.

---

## Testing

There is no automated test suite. Test manually by loading the extension as unpacked in Chrome:

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click "Load unpacked" and select the project root
4. Navigate to a Bilibili video page (e.g., `https://www.bilibili.com/video/BV1xx411c7mD`)

**Key scenarios to verify after any change:**
- Sidebar opens/closes via toggle button
- Sidebar opens/closes via extension icon click on a video page
- Extension icon opens dashboard on a non-video page
- Navigating between videos (without page reload) reinitializes the sidebar
- Watch progress saves periodically and on tab close
- Annotations: add, edit, delete, timestamp seek
- Tags: add, remove, autocomplete
- Rating: like/dislike toggle, star rating toggle, rating note
- Summary: auto-save after 1s inactivity
- Dashboard: search, filter, sort, export, import
- Fullscreen mode: sidebar hides, reminder icon visible

**No console errors** should appear on any Bilibili page, including non-video pages where the sidebar is not active.

---

## What's Deferred (Do Not Implement in v1)

- Collections (video grouping)
- Live stream support
- Bangumi / licensed anime pages
- Cross-device sync
- Annotation export as SRT/VTT
