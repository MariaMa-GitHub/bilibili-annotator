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
- **CSS isolation**: Sidebar CSS classes use the `ba-` prefix (e.g. `.ba-panel`, `.ba-chip`). IDs use the `bili-annotator-` prefix (e.g. `#bili-annotator-root`, `#bili-annotator-toggle`). Do not mix these conventions.

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

## Implementation Status

Tasks completed (Tasks 1–17 of 18):

| Task | Status | Commit |
|---|---|---|
| 1. Project Scaffold | ✅ Done | `4beaa48` |
| 2. Shared Utilities (utils.js) | ✅ Done | `eaad016` |
| 3. Storage Module (storage.js) | ✅ Done | `b038f85` |
| 4. Sidebar CSS | ✅ Done | `99b81f8` |
| 5. Sidebar Injection & Chrome | ✅ Done | `cceae9d` |
| 6. SPA Navigation + Video Record | ✅ Done | `e0032be` |
| 7. Watch Progress Tracker | ✅ Done | `69117ac` |
| 8. Annotations Tab (List + Seek) | ✅ Done | `c53782d` |
| 9. Annotation Form + Keyboard Shortcut | ✅ Done | `8671878` |
| 10. Summary Tab | ✅ Done | `ae7aad5` |
| 11. Tags Tab | ✅ Done | `4aa8ee5` |
| 12. Rating Tab | ✅ Done | `5fee57e` |
| 13. Settings Panel + Fullscreen Detection | ✅ Done | `f295363` |
| 14. Background Service Worker | ✅ Done | — |
| 15. Dashboard HTML + CSS | ✅ Done | — |
| 16. Dashboard JS — Video Grid | ✅ Done | — |
| 17. Dashboard JS — Export / Import | ✅ Done | — |
| 18. End-to-End Verification | ⏳ Pending | — |

Implementation plan: `docs/superpowers/plans/2026-04-01-bilibili-annotator.md`

---

## What's Deferred (Do Not Implement in v1)

- Collections (video grouping)
- Live stream support
- Bangumi / licensed anime pages
- Cross-device sync
- Annotation export as SRT/VTT
