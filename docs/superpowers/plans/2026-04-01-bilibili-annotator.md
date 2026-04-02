# Bilibili Annotator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Manifest V3 Chrome Extension for bilibili.com with sidebar annotations, summaries, tags, ratings, watch progress tracking, and a library dashboard — all in vanilla JS with local storage only.

**Architecture:** Single JS file per context (content.js, dashboard.js, background.js) with shared globals from utils.js and storage.js loaded first via manifest content_scripts order. No build tools, no modules, no frameworks.

**Tech Stack:** Manifest V3 Chrome Extension, Vanilla JS (ES2020+), chrome.storage.local, HTML/CSS.

---

## File Map

| File | Responsibility |
|---|---|
| `manifest.json` | Extension manifest — permissions, content scripts, commands |
| `shared/utils.js` | Pure utility functions exposed as globals |
| `shared/storage.js` | chrome.storage.local CRUD, exposed as global `BiliStorage` |
| `content/content.js` | Sidebar injection, tabs, all video-page interactivity |
| `content/content.css` | Sidebar styles (all classes prefixed `ba-`) |
| `background/background.js` | Service worker — icon click routing |
| `dashboard/dashboard.html` | Library page structure |
| `dashboard/dashboard.js` | Search, filter, sort, export/import |
| `dashboard/dashboard.css` | Dashboard styles |
| `tests/utils.test.js` | Node.js tests for pure utility functions |

---

## Task 1: Project Scaffold

**Files:**
- Create: `manifest.json`
- Create: `background/background.js` (stub)
- Create: `content/content.js` (stub)
- Create: `content/content.css` (stub)
- Create: `shared/utils.js` (stub)
- Create: `shared/storage.js` (stub)
- Create: `dashboard/dashboard.html` (stub)
- Create: `dashboard/dashboard.js` (stub)
- Create: `dashboard/dashboard.css` (stub)
- Create: `tests/utils.test.js` (stub)
- Create: `icons/` (placeholder PNGs)

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p background content shared dashboard tests icons
```

- [ ] **Step 2: Write manifest.json**

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
      "suggested_key": { "default": "Alt+A" },
      "description": "打开快速添加标注"
    }
  }
}
```

- [ ] **Step 3: Generate placeholder icons**

Run this once in Node to create minimal solid-color PNG files:

```bash
node -e "
const {createCanvas} = require('canvas');
// If canvas not available, create minimal 1x1 PNGs manually
const fs = require('fs');
// Minimal valid 1x1 blue PNG (base64)
const png1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
fs.writeFileSync('icons/icon16.png', png1);
fs.writeFileSync('icons/icon48.png', png1);
fs.writeFileSync('icons/icon128.png', png1);
console.log('Icons created');
" 2>/dev/null || node -e "
const fs = require('fs');
// Minimal valid 1x1 PNG bytes (blue pixel)
const png = Buffer.from([
  0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,
  0x00,0x00,0x00,0x0d,0x49,0x48,0x44,0x52,
  0x00,0x00,0x00,0x01,0x00,0x00,0x00,0x01,
  0x08,0x02,0x00,0x00,0x00,0x90,0x77,0x53,
  0xde,0x00,0x00,0x00,0x0c,0x49,0x44,0x41,
  0x54,0x08,0xd7,0x63,0x60,0xa8,0xf8,0x0f,
  0x00,0x00,0x02,0x01,0x00,0x05,0x82,0x54,
  0x28,0x00,0x00,0x00,0x00,0x49,0x45,0x4e,
  0x44,0xae,0x42,0x60,0x82
]);
fs.writeFileSync('icons/icon16.png', png);
fs.writeFileSync('icons/icon48.png', png);
fs.writeFileSync('icons/icon128.png', png);
console.log('Icons created');
"
```

- [ ] **Step 4: Create stub files**

`background/background.js`:
```js
// Stub — implemented in Task 14
```

`content/content.js`:
```js
// Stub — implemented in Tasks 5–13
```

`content/content.css`:
```css
/* Stub — implemented in Task 4 */
```

`shared/utils.js`:
```js
// Stub — implemented in Task 2
```

`shared/storage.js`:
```js
// Stub — implemented in Task 3
```

`dashboard/dashboard.html`:
```html
<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><title>B站注释器</title></head>
<body><p>Dashboard — coming soon</p></body>
</html>
```

`dashboard/dashboard.js`:
```js
// Stub — implemented in Tasks 16–19
```

`dashboard/dashboard.css`:
```css
/* Stub — implemented in Task 15 */
```

`tests/utils.test.js`:
```js
// Stub — implemented in Task 2
```

- [ ] **Step 5: Load as unpacked extension and verify it loads**

1. Open `chrome://extensions`
2. Enable Developer mode (top right toggle)
3. Click "Load unpacked" → select project root
4. Verify: extension appears with name "B站注释器", no red errors
5. Navigate to any `bilibili.com/video/` page — no console errors expected

- [ ] **Step 6: Commit**

```bash
git init
git add .
git commit -m "chore: project scaffold — manifest, stubs, icons"
```

---

## Task 2: Shared Utilities (utils.js)

**Files:**
- Create: `shared/utils.js`
- Create: `tests/utils.test.js`

- [ ] **Step 1: Write tests/utils.test.js**

```js
// Run with: node tests/utils.test.js
// Simulates browser globals needed by the functions
global.crypto = require('crypto');

// Load the module (strip chrome-specific globals before loading)
const fs = require('fs');
eval(fs.readFileSync('shared/utils.js', 'utf8'));

let passed = 0, failed = 0;
function assert(condition, msg) {
  if (condition) { console.log('  PASS:', msg); passed++; }
  else { console.error('  FAIL:', msg); failed++; }
}

// extractBVId
console.log('\nextractBVId:');
assert(extractBVId('https://www.bilibili.com/video/BV1xx411c7mD') === 'BV1xx411c7mD', 'standard URL');
assert(extractBVId('https://www.bilibili.com/video/BV1xx411c7mD?p=2') === 'BV1xx411c7mD', 'URL with part param');
assert(extractBVId('https://www.bilibili.com/video/BV1xx411c7mD/') === 'BV1xx411c7mD', 'trailing slash');
assert(extractBVId('https://www.bilibili.com/') === null, 'non-video URL returns null');

// extractPartNumber
console.log('\nextractPartNumber:');
assert(extractPartNumber('https://www.bilibili.com/video/BV1xx?p=3') === 3, 'p=3');
assert(extractPartNumber('https://www.bilibili.com/video/BV1xx') === 1, 'no param defaults to 1');
assert(extractPartNumber('https://www.bilibili.com/video/BV1xx?p=1') === 1, 'p=1');

// formatTimestamp
console.log('\nformatTimestamp:');
assert(formatTimestamp(0) === '0:00', '0 seconds');
assert(formatTimestamp(65) === '1:05', '65 seconds');
assert(formatTimestamp(3661) === '1:01:01', '1 hour 1 min 1 sec');
assert(formatTimestamp(754) === '12:34', '12m 34s');

// parseTimestamp
console.log('\nparseTimestamp:');
assert(parseTimestamp('1:05') === 65, '1:05 → 65');
assert(parseTimestamp('12:34') === 754, '12:34 → 754');
assert(parseTimestamp('1:01:01') === 3661, '1:01:01 → 3661');
assert(parseTimestamp('') === 0, 'empty string → 0');

// normalizeTag
console.log('\nnormalizeTag:');
assert(normalizeTag('Gaming') === 'gaming', 'ASCII tag lowercased');
assert(normalizeTag('Python') === 'python', 'ASCII tag lowercased');
assert(normalizeTag('游戏') === '游戏', 'Chinese tag unchanged');
assert(normalizeTag('Python游戏') === 'Python游戏', 'mixed tag unchanged');
assert(normalizeTag('') === '', 'empty string');

// tokenize
console.log('\ntokenize:');
assert(JSON.stringify(tokenize('hello world')) === '["hello","world"]', 'splits on space');
assert(tokenize('你好世界').length > 0, 'Chinese text returns tokens');
assert(JSON.stringify(tokenize('A,B，C')) === '["a","b","c"]', 'splits on comma/ideographic comma');
assert(JSON.stringify(tokenize('')) === '[]', 'empty string returns []');

// generateUUID
console.log('\ngenerateUUID:');
const uuid = generateUUID();
assert(typeof uuid === 'string' && uuid.length === 36, 'returns 36-char string');
assert(/^[0-9a-f-]+$/.test(uuid), 'only hex and dashes');
assert(generateUUID() !== generateUUID(), 'generates unique values');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
```

- [ ] **Step 2: Run tests to see failures**

```bash
node tests/utils.test.js
```

Expected: errors about `extractBVId` not defined (or similar). This confirms the tests are wired up correctly.

- [ ] **Step 3: Write shared/utils.js**

```js
function extractBVId(url) {
  const match = url.match(/\/(BV[a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

function extractPartNumber(url) {
  const match = url.match(/[?&]p=(\d+)/);
  return match ? parseInt(match[1], 10) : 1;
}

function formatTimestamp(seconds) {
  if (!seconds && seconds !== 0) return '0:00';
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function parseTimestamp(str) {
  if (!str) return 0;
  const parts = str.trim().split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function debounce(fn, ms) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function normalizeTag(tag) {
  if (!tag) return '';
  if (/^[\x00-\x7F]+$/.test(tag)) return tag.toLowerCase();
  return tag;
}

function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .split(/[\s\u3000-\u303f\uff00-\uffef\u2000-\u206f,，。！？；：、·]+/)
    .filter(t => t.length > 0);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
node tests/utils.test.js
```

Expected output:
```
extractBVId:
  PASS: standard URL
  PASS: URL with part param
  PASS: trailing slash
  PASS: non-video URL returns null
...
N passed, 0 failed
```

- [ ] **Step 5: Commit**

```bash
git add shared/utils.js tests/utils.test.js
git commit -m "feat: add shared utility functions with tests"
```

---

## Task 3: Storage Module (storage.js)

**Files:**
- Create: `shared/storage.js`

- [ ] **Step 1: Write shared/storage.js**

```js
const BiliStorage = (() => {
  const RESERVED_KEYS = ['__settings', '__tags'];

  const DEFAULT_SETTINGS = {
    sidebarMode: 'overlay',
    shortcutKey: 'Alt+A',
    progressInterval: 30,
    features: {
      watchProgress: true,
      annotations: true,
      summary: true,
      tags: true,
      rating: true
    }
  };

  function makeDefaultRecord(bvId, title, url, thumbnailUrl) {
    const now = new Date().toISOString();
    return {
      videoId: bvId,
      title: title || bvId,
      url: url || `https://www.bilibili.com/video/${bvId}`,
      thumbnailUrl: thumbnailUrl || null,
      summaryShort: '',
      summaryLong: '',
      rating: null,
      starRating: null,
      ratingNote: '',
      tags: [],
      annotations: [],
      watchProgress: { lastWatchedAt: null, lastPosition: 0, completed: false },
      createdAt: now,
      updatedAt: now
    };
  }

  async function getVideo(bvId) {
    const result = await chrome.storage.local.get(bvId);
    return result[bvId] || null;
  }

  async function getOrCreateVideo(bvId, title, url, thumbnailUrl) {
    const existing = await getVideo(bvId);
    if (existing) return existing;
    const record = makeDefaultRecord(bvId, title, url, thumbnailUrl);
    await chrome.storage.local.set({ [bvId]: record });
    return record;
  }

  async function saveVideo(bvId, record) {
    record.updatedAt = new Date().toISOString();
    await chrome.storage.local.set({ [bvId]: record });
  }

  async function getAllVideos() {
    const all = await chrome.storage.local.get(null);
    const videos = {};
    for (const [key, val] of Object.entries(all)) {
      if (!RESERVED_KEYS.includes(key)) videos[key] = val;
    }
    return videos;
  }

  async function getSettings() {
    const result = await chrome.storage.local.get('__settings');
    const saved = result.__settings || {};
    return {
      ...DEFAULT_SETTINGS,
      ...saved,
      features: { ...DEFAULT_SETTINGS.features, ...(saved.features || {}) }
    };
  }

  async function saveSettings(settings) {
    await chrome.storage.local.set({ __settings: settings });
  }

  async function getTags() {
    const result = await chrome.storage.local.get('__tags');
    return result.__tags || [];
  }

  async function addTagToIndex(tag) {
    const tags = await getTags();
    const normalized = normalizeTag(tag);
    if (!tags.some(t => normalizeTag(t) === normalized)) {
      tags.push(tag);
      await chrome.storage.local.set({ __tags: tags });
    }
  }

  async function removeTagFromIndex(tag) {
    const videos = await getAllVideos();
    const normalized = normalizeTag(tag);
    const inUse = Object.values(videos).some(v =>
      v.tags && v.tags.some(t => normalizeTag(t) === normalized)
    );
    if (!inUse) {
      const tags = await getTags();
      await chrome.storage.local.set({
        __tags: tags.filter(t => normalizeTag(t) !== normalized)
      });
    }
  }

  async function exportAll() {
    return await chrome.storage.local.get(null);
  }

  async function importAll(data, strategy) {
    const current = await chrome.storage.local.get(null);
    const toWrite = {};

    for (const [key, val] of Object.entries(data)) {
      if (key === '__settings') continue; // never import settings
      if (key === '__tags') continue; // handle separately
      if (strategy === 'skip' && key in current) continue;
      toWrite[key] = val;
    }

    if (data.__tags) {
      const currentTags = current.__tags || [];
      toWrite.__tags = [...new Set([...currentTags, ...data.__tags])];
    }

    await chrome.storage.local.set(toWrite);
    return Object.keys(toWrite).filter(k => !RESERVED_KEYS.includes(k)).length;
  }

  return {
    getVideo,
    getOrCreateVideo,
    saveVideo,
    getAllVideos,
    getSettings,
    saveSettings,
    getTags,
    addTagToIndex,
    removeTagFromIndex,
    exportAll,
    importAll
  };
})();
```

- [ ] **Step 2: Reload extension and smoke-test storage in console**

1. Reload extension at `chrome://extensions`
2. Navigate to a Bilibili video page
3. Open DevTools console
4. Run: `BiliStorage.getSettings().then(console.log)`

Expected: settings object with all defaults printed.

5. Run: `BiliStorage.getOrCreateVideo('BVtest123', 'Test Video', 'https://...', null).then(console.log)`

Expected: a new video record object printed.

6. Run: `chrome.storage.local.get(null, console.log)`

Expected: `BVtest123` key present in storage.

- [ ] **Step 3: Commit**

```bash
git add shared/storage.js
git commit -m "feat: add BiliStorage module"
```

---

## Task 4: Sidebar CSS

**Files:**
- Create: `content/content.css`

- [ ] **Step 1: Write content/content.css**

```css
/* ============================================================
   B站注释器 — Sidebar Styles
   All classes prefixed with `ba-` to avoid Bilibili conflicts
   ============================================================ */

/* Sidebar container */
#bili-annotator-root {
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  display: flex;
  align-items: stretch;
  z-index: 9000;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  color: #333;
  pointer-events: none;
}

#bili-annotator-root * {
  box-sizing: border-box;
}

/* Toggle tab */
#bili-annotator-toggle {
  pointer-events: all;
  width: 20px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #e0e0e0;
  border-right: none;
  border-radius: 6px 0 0 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.08);
  user-select: none;
  align-self: center;
  height: 48px;
  font-size: 12px;
  color: #999;
  transition: background 0.15s;
}

#bili-annotator-toggle:hover {
  background: #fff;
  color: #00a1d6;
}

/* Sidebar panel */
.ba-panel {
  pointer-events: all;
  width: 320px;
  background: #fff;
  border-left: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  box-shadow: -2px 0 16px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  transition: transform 0.2s ease;
}

/* Collapsed state */
#bili-annotator-root.collapsed .ba-panel {
  transform: translateX(320px);
}

#bili-annotator-root.collapsed #bili-annotator-toggle {
  border-radius: 6px 0 0 6px;
}

/* Push mode: shift body */
body.ba-push-mode {
  margin-right: 320px !important;
  transition: margin-right 0.2s ease;
}

body.ba-push-mode.ba-sidebar-collapsed {
  margin-right: 0 !important;
}

/* Progress bar area */
.ba-progress {
  padding: 8px 14px;
  background: #f8f9fa;
  border-bottom: 1px solid #eee;
  font-size: 11px;
  color: #888;
  flex-shrink: 0;
}

.ba-progress-text {
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ba-progress-bar-track {
  height: 3px;
  background: #e8e8e8;
  border-radius: 2px;
  overflow: hidden;
}

.ba-progress-bar-fill {
  height: 100%;
  background: #00a1d6;
  border-radius: 2px;
  transition: width 0.3s;
}

/* Tab bar */
.ba-tabs {
  display: flex;
  border-bottom: 2px solid #f0f0f0;
  background: #fafafa;
  flex-shrink: 0;
}

.ba-tab {
  flex: 1;
  padding: 9px 0;
  text-align: center;
  font-size: 12px;
  color: #888;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: color 0.15s;
  user-select: none;
}

.ba-tab:hover {
  color: #00a1d6;
}

.ba-tab.ba-active {
  color: #00a1d6;
  border-bottom-color: #00a1d6;
  font-weight: 600;
}

/* Tab content area */
.ba-tab-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px 14px;
}

.ba-tab-content::-webkit-scrollbar {
  width: 4px;
}

.ba-tab-content::-webkit-scrollbar-thumb {
  background: #ddd;
  border-radius: 2px;
}

/* Footer */
.ba-footer {
  padding: 8px 14px;
  border-top: 1px solid #eee;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-shrink: 0;
}

.ba-footer-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #aaa;
  font-size: 16px;
  padding: 4px;
  border-radius: 4px;
  transition: color 0.15s;
  line-height: 1;
}

.ba-footer-btn:hover {
  color: #00a1d6;
}

/* ============================================================
   Annotations Tab
   ============================================================ */

.ba-annotation-list {
  margin-bottom: 10px;
}

.ba-annotation-item {
  display: flex;
  align-items: flex-start;
  padding: 7px 0;
  border-bottom: 1px solid #f4f4f4;
  gap: 8px;
}

.ba-annotation-item:last-child {
  border-bottom: none;
}

.ba-annotation-ts {
  font-family: monospace;
  font-size: 11px;
  color: #00a1d6;
  cursor: pointer;
  min-width: 52px;
  padding-top: 2px;
  white-space: nowrap;
  flex-shrink: 0;
}

.ba-annotation-ts:hover {
  text-decoration: underline;
}

.ba-annotation-ts-range {
  display: block;
  color: #aaa;
  font-size: 10px;
}

.ba-annotation-body {
  flex: 1;
  min-width: 0;
}

.ba-annotation-label {
  font-size: 12px;
  color: #333;
  line-height: 1.4;
  margin-bottom: 3px;
  word-break: break-word;
}

.ba-annotation-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.ba-icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #bbb;
  font-size: 12px;
  padding: 2px;
  line-height: 1;
  transition: color 0.15s;
}

.ba-icon-btn:hover {
  color: #555;
}

.ba-part-toggle {
  font-size: 11px;
  color: #00a1d6;
  cursor: pointer;
  margin-bottom: 8px;
  display: inline-block;
}

.ba-part-badge {
  font-size: 10px;
  padding: 1px 5px;
  background: #e3f2fd;
  color: #1565c0;
  border-radius: 8px;
  margin-right: 4px;
}

/* Category badges */
.ba-badge {
  display: inline-block;
  font-size: 10px;
  padding: 1px 7px;
  border-radius: 8px;
  white-space: nowrap;
}

.ba-badge-highlight { background: #fff3e0; color: #e65100; }
.ba-badge-important { background: #e8f5e9; color: #2e7d32; }
.ba-badge-funny     { background: #fce4ec; color: #880e4f; }
.ba-badge-note      { background: #e3f2fd; color: #1565c0; }
.ba-badge-custom    { background: #f5f5f5; color: #757575; }

/* Add annotation button */
.ba-add-btn {
  width: 100%;
  padding: 8px;
  background: #00a1d6;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;
}

.ba-add-btn:hover {
  background: #0091c2;
}

/* Annotation form */
.ba-form {
  background: #f8f9fa;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 10px;
}

.ba-form-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.ba-form-field {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
}

.ba-form-field label {
  font-size: 11px;
  color: #888;
}

.ba-input {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 5px 8px;
  font-size: 12px;
  background: #fff;
  outline: none;
  width: 100%;
  font-family: inherit;
}

.ba-input:focus {
  border-color: #00a1d6;
}

.ba-select {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 5px 8px;
  font-size: 12px;
  background: #fff;
  outline: none;
  width: 100%;
  font-family: inherit;
}

.ba-select:focus {
  border-color: #00a1d6;
}

.ba-form-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.ba-btn {
  padding: 6px 14px;
  border-radius: 5px;
  font-size: 12px;
  cursor: pointer;
  border: 1px solid transparent;
  font-family: inherit;
  transition: all 0.15s;
}

.ba-btn-primary {
  background: #00a1d6;
  color: #fff;
  border-color: #00a1d6;
}

.ba-btn-primary:hover {
  background: #0091c2;
}

.ba-btn-secondary {
  background: #fff;
  color: #666;
  border-color: #ddd;
}

.ba-btn-secondary:hover {
  background: #f5f5f5;
}

.ba-empty {
  font-size: 12px;
  color: #aaa;
  text-align: center;
  padding: 20px 0;
}

/* ============================================================
   Summary Tab
   ============================================================ */

.ba-summary-label {
  font-size: 11px;
  color: #888;
  margin-bottom: 4px;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.ba-char-counter {
  font-size: 10px;
  color: #bbb;
}

.ba-char-counter.ba-over {
  color: #e53935;
}

.ba-textarea {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 6px 8px;
  font-size: 12px;
  font-family: inherit;
  width: 100%;
  resize: vertical;
  outline: none;
  background: #fff;
  line-height: 1.5;
}

.ba-textarea:focus {
  border-color: #00a1d6;
}

.ba-field-group {
  margin-bottom: 14px;
}

/* ============================================================
   Tags Tab
   ============================================================ */

.ba-tags-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
  min-height: 10px;
}

.ba-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  background: #e3f2fd;
  color: #1565c0;
  border-radius: 12px;
  font-size: 12px;
}

.ba-chip-remove {
  background: none;
  border: none;
  cursor: pointer;
  color: #1565c0;
  font-size: 12px;
  padding: 0;
  line-height: 1;
  opacity: 0.6;
}

.ba-chip-remove:hover {
  opacity: 1;
}

.ba-tag-input-wrap {
  position: relative;
}

.ba-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid #ddd;
  border-top: none;
  border-radius: 0 0 4px 4px;
  max-height: 160px;
  overflow-y: auto;
  z-index: 10;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
}

.ba-suggestion {
  padding: 6px 10px;
  font-size: 12px;
  cursor: pointer;
  color: #333;
}

.ba-suggestion:hover {
  background: #f0f9ff;
  color: #00a1d6;
}

/* ============================================================
   Rating Tab
   ============================================================ */

.ba-rating-mode-toggle {
  display: flex;
  gap: 0;
  margin-bottom: 16px;
  border: 1px solid #ddd;
  border-radius: 5px;
  overflow: hidden;
}

.ba-mode-btn {
  flex: 1;
  padding: 6px;
  background: #fff;
  border: none;
  cursor: pointer;
  font-size: 12px;
  color: #888;
  transition: all 0.15s;
  font-family: inherit;
}

.ba-mode-btn.ba-active {
  background: #00a1d6;
  color: #fff;
}

.ba-simple-rating {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.ba-reaction-btn {
  flex: 1;
  padding: 12px;
  background: #f8f9fa;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  font-size: 22px;
  text-align: center;
  transition: all 0.15s;
  font-family: inherit;
}

.ba-reaction-btn:hover {
  background: #f0f0f0;
}

.ba-reaction-btn.ba-selected-like {
  background: #e8f5e9;
  border-color: #4caf50;
}

.ba-reaction-btn.ba-selected-dislike {
  background: #fce4ec;
  border-color: #e91e63;
}

.ba-stars {
  display: flex;
  gap: 6px;
  margin-bottom: 16px;
  font-size: 24px;
}

.ba-star {
  cursor: pointer;
  color: #ddd;
  transition: color 0.15s;
  user-select: none;
}

.ba-star.ba-filled {
  color: #ffc107;
}

.ba-star:hover,
.ba-star.ba-hover {
  color: #ffc107;
}

.ba-rating-note-label {
  font-size: 11px;
  color: #888;
  margin-bottom: 4px;
}

/* ============================================================
   Settings Panel
   ============================================================ */

.ba-settings {
  padding: 4px 0;
}

.ba-settings-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
}

.ba-setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #f4f4f4;
}

.ba-setting-label {
  font-size: 12px;
  color: #555;
}

.ba-setting-desc {
  font-size: 11px;
  color: #aaa;
  margin-top: 2px;
}

.ba-toggle-group {
  display: flex;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
}

.ba-toggle-opt {
  padding: 4px 10px;
  font-size: 11px;
  cursor: pointer;
  background: #fff;
  border: none;
  color: #888;
  font-family: inherit;
  transition: all 0.15s;
}

.ba-toggle-opt.ba-active {
  background: #00a1d6;
  color: #fff;
}

.ba-number-input {
  width: 60px;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 4px 6px;
  font-size: 12px;
  text-align: center;
}

.ba-key-capture {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 11px;
  font-family: monospace;
  min-width: 80px;
  text-align: center;
  cursor: pointer;
  background: #fff;
  color: #333;
}

.ba-key-capture:focus {
  border-color: #00a1d6;
  outline: none;
}

.ba-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #00a1d6;
}

/* ============================================================
   Fullscreen reminder icon
   ============================================================ */

#bili-annotator-fullscreen-hint {
  position: fixed;
  bottom: 80px;
  right: 16px;
  z-index: 9999;
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  display: none;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  cursor: default;
  title: '侧边栏在全屏模式下不可用';
}

#bili-annotator-fullscreen-hint.ba-visible {
  display: flex;
}
```

- [ ] **Step 2: Reload extension and verify CSS loads without errors**

1. Reload extension
2. Open any Bilibili video page
3. Open DevTools → Console tab — no CSS-related errors
4. Open DevTools → Sources → Content Scripts — confirm `content.css` is listed

- [ ] **Step 3: Commit**

```bash
git add content/content.css
git commit -m "feat: add sidebar CSS"
```

---

## Task 5: Content Script — Sidebar Injection & Chrome

**Files:**
- Modify: `content/content.js`

This task builds the sidebar shell: the toggle tab, panel, tab bar, and the open/close mechanism. No tab content yet.

- [ ] **Step 1: Write content/content.js (initial version)**

```js
// ============================================================
// B站注释器 — Content Script
// Depends on: shared/utils.js, shared/storage.js (loaded first)
// ============================================================

// === STATE ===
let currentBVId = null;
let currentPart = 1;
let videoEl = null;
let settings = {};
let currentRecord = null;
let sidebarOpen = true;
let progressIntervalId = null;
let isMultiPart = false;
let showAllParts = false;
let activeTab = 'annotations';
let ratingMode = 'simple'; // 'simple' or 'detailed'
let lastUrl = window.location.href;

// === INIT ===
async function init() {
  settings = await BiliStorage.getSettings();
  injectSidebar();
  startNavObserver();
  startFullscreenObserver();
  startShortcutListener();

  const bvId = extractBVId(window.location.href);
  if (bvId) {
    currentBVId = bvId;
    currentPart = extractPartNumber(window.location.href);
    await loadVideo();
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'toggleSidebar') toggleSidebar();
  });
}

async function loadVideo() {
  const title = document.querySelector('h1')?.textContent?.trim() || currentBVId;
  const url = window.location.href;
  const thumbnailUrl = document.querySelector('meta[property="og:image"]')?.content || null;

  currentRecord = await BiliStorage.getOrCreateVideo(currentBVId, title, url, thumbnailUrl);
  isMultiPart = !!document.querySelector('.video-sections-content') ||
                extractPartNumber(url) > 1;

  renderProgressBar();
  renderActiveTab();

  if (settings.features.watchProgress) {
    await findVideoEl();
    startProgressTracking();
  }
}

// === SIDEBAR CHROME ===
function injectSidebar() {
  if (document.getElementById('bili-annotator-root')) return;

  const root = document.createElement('div');
  root.id = 'bili-annotator-root';
  root.innerHTML = `
    <div id="bili-annotator-toggle" title="切换侧边栏">›</div>
    <div class="ba-panel">
      <div class="ba-progress">
        <div class="ba-progress-text">暂无观看记录</div>
        <div class="ba-progress-bar-track">
          <div class="ba-progress-bar-fill" style="width:0%"></div>
        </div>
      </div>
      <div class="ba-tabs">
        <div class="ba-tab ba-active" data-tab="annotations">标注</div>
        <div class="ba-tab" data-tab="summary">摘要</div>
        <div class="ba-tab" data-tab="tags">标签</div>
        <div class="ba-tab" data-tab="rating">评分</div>
      </div>
      <div class="ba-tab-content" id="ba-tab-content"></div>
      <div class="ba-footer">
        <button class="ba-footer-btn" id="ba-settings-btn" title="设置">⚙</button>
      </div>
    </div>
  `;

  document.body.appendChild(root);

  // Fullscreen hint icon
  const hint = document.createElement('div');
  hint.id = 'bili-annotator-fullscreen-hint';
  hint.title = '侧边栏在全屏模式下不可用';
  hint.textContent = '📋';
  document.body.appendChild(hint);

  // Event: toggle button
  document.getElementById('bili-annotator-toggle').addEventListener('click', toggleSidebar);

  // Event: tab clicks
  root.querySelectorAll('.ba-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activeTab = tab.dataset.tab;
      root.querySelectorAll('.ba-tab').forEach(t => t.classList.remove('ba-active'));
      tab.classList.add('ba-active');
      renderActiveTab();
    });
  });

  // Event: settings button
  document.getElementById('ba-settings-btn').addEventListener('click', () => {
    const content = document.getElementById('ba-tab-content');
    content.innerHTML = '';
    renderSettingsPanel();
  });

  applySidebarMode(settings.sidebarMode);
}

function toggleSidebar() {
  const root = document.getElementById('bili-annotator-root');
  if (!root) return;
  sidebarOpen = !sidebarOpen;
  root.classList.toggle('collapsed', !sidebarOpen);
  document.getElementById('bili-annotator-toggle').textContent = sidebarOpen ? '›' : '‹';

  if (settings.sidebarMode === 'push') {
    document.body.classList.toggle('ba-sidebar-collapsed', !sidebarOpen);
  }
}

function applySidebarMode(mode) {
  const root = document.getElementById('bili-annotator-root');
  if (!root) return;
  if (mode === 'push') {
    document.body.classList.add('ba-push-mode');
    if (!sidebarOpen) document.body.classList.add('ba-sidebar-collapsed');
  } else {
    document.body.classList.remove('ba-push-mode');
    document.body.classList.remove('ba-sidebar-collapsed');
  }
}

// === TAB RENDERING ===
function renderActiveTab() {
  const content = document.getElementById('ba-tab-content');
  if (!content) return;
  content.innerHTML = '';

  if (!settings.features[activeTab] && activeTab !== 'annotations') {
    content.innerHTML = '<p class="ba-empty">该功能已禁用</p>';
    return;
  }

  switch (activeTab) {
    case 'annotations': renderAnnotationsTab(); break;
    case 'summary':     renderSummaryTab();     break;
    case 'tags':        renderTagsTab();         break;
    case 'rating':      renderRatingTab();       break;
  }
}

// === PLACEHOLDERS (implemented in later tasks) ===
function renderAnnotationsTab() {
  document.getElementById('ba-tab-content').innerHTML =
    '<p class="ba-empty">标注功能即将实现</p>';
}
function renderSummaryTab() {
  document.getElementById('ba-tab-content').innerHTML =
    '<p class="ba-empty">摘要功能即将实现</p>';
}
function renderTagsTab() {
  document.getElementById('ba-tab-content').innerHTML =
    '<p class="ba-empty">标签功能即将实现</p>';
}
function renderRatingTab() {
  document.getElementById('ba-tab-content').innerHTML =
    '<p class="ba-empty">评分功能即将实现</p>';
}
function renderProgressBar() {}
function renderSettingsPanel() {
  document.getElementById('ba-tab-content').innerHTML =
    '<p class="ba-empty">设置即将实现</p>';
}
function startNavObserver() {}
function startFullscreenObserver() {}
function startShortcutListener() {}
async function findVideoEl() {}
function startProgressTracking() {}

// === BOOTSTRAP ===
init();
```

- [ ] **Step 2: Reload extension and verify sidebar appears**

1. Reload extension at `chrome://extensions`
2. Navigate to `https://www.bilibili.com/video/` any video
3. Verify: sidebar appears on the right side with tabs (标注, 摘要, 标签, 评分)
4. Click the toggle tab — sidebar should slide open/closed
5. No console errors

- [ ] **Step 3: Commit**

```bash
git add content/content.js
git commit -m "feat: sidebar injection and chrome"
```

---

## Task 6: Content Script — SPA Navigation + Video Record

**Files:**
- Modify: `content/content.js`

Replace the `startNavObserver` stub and add real navigation detection and progress bar rendering.

- [ ] **Step 1: Replace `startNavObserver` and `renderProgressBar` in content.js**

Find and replace the two stub functions:

```js
function startNavObserver() {
  const titleEl = document.querySelector('head title');
  if (!titleEl) return;

  const observer = new MutationObserver(() => {
    const newUrl = window.location.href;
    if (newUrl === lastUrl) return;
    lastUrl = newUrl;

    const newBVId = extractBVId(newUrl);
    if (!newBVId || newBVId === currentBVId) return;

    // Save progress for previous video before switching
    if (currentBVId && currentRecord) saveProgress();

    // Stop tracking previous video
    stopProgressTracking();

    currentBVId = newBVId;
    currentPart = extractPartNumber(newUrl);
    showAllParts = false;
    activeTab = 'annotations';

    // Reset tab UI
    const root = document.getElementById('bili-annotator-root');
    if (root) {
      root.querySelectorAll('.ba-tab').forEach(t => t.classList.remove('ba-active'));
      const annoTab = root.querySelector('[data-tab="annotations"]');
      if (annoTab) annoTab.classList.add('ba-active');
    }

    loadVideo();
  });

  observer.observe(titleEl, { childList: true });

  // Also handle popstate for back/forward navigation
  window.addEventListener('popstate', () => {
    const newUrl = window.location.href;
    if (newUrl !== lastUrl) {
      lastUrl = newUrl;
      const newBVId = extractBVId(newUrl);
      if (newBVId && newBVId !== currentBVId) {
        stopProgressTracking();
        currentBVId = newBVId;
        currentPart = extractPartNumber(newUrl);
        showAllParts = false;
        loadVideo();
      }
    }
  });
}

function stopProgressTracking() {
  if (progressIntervalId) {
    clearInterval(progressIntervalId);
    progressIntervalId = null;
  }
}

function renderProgressBar() {
  const textEl = document.querySelector('.ba-progress-text');
  const fillEl = document.querySelector('.ba-progress-bar-fill');
  if (!textEl || !fillEl) return;

  const wp = currentRecord?.watchProgress;
  if (!wp || !wp.lastWatchedAt) {
    textEl.textContent = '暂无观看记录';
    fillEl.style.width = '0%';
    return;
  }

  const date = new Date(wp.lastWatchedAt);
  const dateStr = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;

  let percentStr = '';
  if (videoEl && videoEl.duration > 0) {
    const pct = Math.round((wp.lastPosition / videoEl.duration) * 100);
    percentStr = ` — 已观看${pct}%`;
    fillEl.style.width = `${pct}%`;
  } else {
    fillEl.style.width = '0%';
  }

  textEl.textContent = `上次观看：${dateStr}${percentStr}`;
  if (wp.completed) textEl.textContent += ' ✓';
}
```

- [ ] **Step 2: Reload and test SPA navigation**

1. Reload extension
2. Navigate to a Bilibili video page
3. Click on another video link on the page (without a full page reload)
4. Verify: sidebar reloads with the new video's data (tab content placeholder changes)
5. Check: `chrome.storage.local.get(null, console.log)` shows records for visited BV IDs

- [ ] **Step 3: Commit**

```bash
git add content/content.js
git commit -m "feat: SPA navigation detection and video record initialization"
```

---

## Task 7: Content Script — Watch Progress Tracker

**Files:**
- Modify: `content/content.js`

Replace the `findVideoEl` and `startProgressTracking` stubs.

- [ ] **Step 1: Replace `findVideoEl` and `startProgressTracking` in content.js**

```js
async function findVideoEl() {
  videoEl = document.querySelector('video');
  if (videoEl) return videoEl;

  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 250));
    videoEl = document.querySelector('video');
    if (videoEl) return videoEl;
  }
  console.debug('[bili-annotator] Video element not found after 10 attempts');
  return null;
}

function startProgressTracking() {
  if (!videoEl) return;

  progressIntervalId = setInterval(saveProgress, (settings.progressInterval || 30) * 1000);

  window.addEventListener('beforeunload', saveProgress, { once: true });
}

async function saveProgress() {
  if (!currentRecord || !videoEl) return;
  if (!videoEl.duration || videoEl.duration === 0) return;

  const now = new Date().toISOString();
  currentRecord.watchProgress = {
    lastWatchedAt: now,
    lastPosition: Math.floor(videoEl.currentTime),
    completed: videoEl.currentTime / videoEl.duration > 0.9
  };

  await BiliStorage.saveVideo(currentBVId, currentRecord);
  renderProgressBar();
}
```

- [ ] **Step 2: Reload and test watch progress**

1. Reload extension
2. Navigate to a Bilibili video, let it play for a few seconds
3. Open DevTools console, run: `chrome.storage.local.get(null, console.log)`
4. Verify: the video's `watchProgress.lastPosition` has a non-zero value
5. Verify: progress bar at top of sidebar shows "上次观看" text

- [ ] **Step 3: Commit**

```bash
git add content/content.js
git commit -m "feat: watch progress tracking"
```

---

## Task 8: Content Script — Annotations Tab (List + Seek)

**Files:**
- Modify: `content/content.js`

Replace `renderAnnotationsTab` stub with the full list view (no add/edit form yet).

- [ ] **Step 1: Replace `renderAnnotationsTab` in content.js**

```js
function renderAnnotationsTab() {
  const content = document.getElementById('ba-tab-content');
  const annotations = currentRecord?.annotations || [];

  const visible = showAllParts
    ? [...annotations].sort((a, b) => a.timestampStart - b.timestampStart)
    : annotations
        .filter(a => (a.partNumber || 1) === currentPart)
        .sort((a, b) => a.timestampStart - b.timestampStart);

  const BADGE_MAP = {
    highlight: ['精彩', 'ba-badge-highlight'],
    important: ['重要', 'ba-badge-important'],
    funny:     ['搞笑', 'ba-badge-funny'],
    note:      ['笔记', 'ba-badge-note'],
    custom:    ['自定义', 'ba-badge-custom']
  };

  let html = '';

  if (isMultiPart) {
    html += `<span class="ba-part-toggle" id="ba-part-toggle">
      ${showAllParts ? '仅显示当前分P' : '显示全部分P'}
    </span>`;
  }

  html += '<div class="ba-annotation-list">';

  if (visible.length === 0) {
    html += '<p class="ba-empty">暂无标注</p>';
  } else {
    for (const ann of visible) {
      const [badgeLabel, badgeClass] = BADGE_MAP[ann.category] || ['笔记', 'ba-badge-note'];
      const tsDisplay = formatTimestamp(ann.timestampStart);
      const tsEnd = ann.timestampEnd != null
        ? `<span class="ba-annotation-ts-range">→ ${formatTimestamp(ann.timestampEnd)}</span>`
        : '';
      const partBadge = showAllParts && isMultiPart
        ? `<span class="ba-part-badge">P${ann.partNumber || 1}</span>`
        : '';

      html += `
        <div class="ba-annotation-item" data-id="${ann.id}">
          <div class="ba-annotation-ts" data-ts="${ann.timestampStart}">
            ${tsDisplay}${tsEnd}
          </div>
          <div class="ba-annotation-body">
            <div class="ba-annotation-label">${partBadge}${escapeHtml(ann.label)}</div>
            <span class="ba-badge ${badgeClass}">${badgeLabel}</span>
          </div>
          <div class="ba-annotation-actions">
            <button class="ba-icon-btn ba-edit-btn" data-id="${ann.id}" title="编辑">✏️</button>
            <button class="ba-icon-btn ba-delete-btn" data-id="${ann.id}" title="删除">🗑</button>
          </div>
        </div>`;
    }
  }

  html += '</div>';
  html += `<button class="ba-add-btn" id="ba-add-annotation-btn">+ 添加标注</button>`;

  content.innerHTML = html;

  // Event: toggle all parts
  document.getElementById('ba-part-toggle')?.addEventListener('click', () => {
    showAllParts = !showAllParts;
    renderAnnotationsTab();
  });

  // Event: seek on timestamp click
  content.querySelectorAll('.ba-annotation-ts').forEach(el => {
    el.addEventListener('click', () => {
      const ts = parseFloat(el.dataset.ts);
      seekTo(ts);
    });
  });

  // Event: edit button
  content.querySelectorAll('.ba-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const ann = (currentRecord?.annotations || []).find(a => a.id === btn.dataset.id);
      if (ann) openAnnotationForm(ann);
    });
  });

  // Event: delete button
  content.querySelectorAll('.ba-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteAnnotation(btn.dataset.id));
  });

  // Event: add button
  document.getElementById('ba-add-annotation-btn')?.addEventListener('click', () => {
    openAnnotationForm(null);
  });
}

function seekTo(seconds) {
  if (!videoEl) videoEl = document.querySelector('video');
  if (videoEl) videoEl.currentTime = seconds;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Stubs for next task
function openAnnotationForm(ann) {
  document.getElementById('ba-tab-content').innerHTML =
    '<p class="ba-empty">表单即将实现</p>';
}
async function deleteAnnotation(id) {}
```

- [ ] **Step 2: Reload and test annotations list**

1. Reload extension
2. Navigate to a Bilibili video
3. In DevTools console, manually inject a test annotation:

```js
// Get current BV ID
const bvId = extractBVId(location.href);
// Get record
chrome.storage.local.get(bvId, (res) => {
  const rec = res[bvId];
  rec.annotations.push({
    id: generateUUID(),
    partNumber: 1,
    timestampStart: 65,
    timestampEnd: null,
    label: '测试标注',
    category: 'note'
  });
  chrome.storage.local.set({ [bvId]: rec });
});
```

4. Reload the page — verify the annotation appears in the 标注 tab
5. Click the timestamp — video should seek to 1:05
6. Click 🗑 (delete) — no error (stub, no action yet)

- [ ] **Step 3: Commit**

```bash
git add content/content.js
git commit -m "feat: annotations tab list view with seek"
```

---

## Task 9: Content Script — Annotation Form + Keyboard Shortcut

**Files:**
- Modify: `content/content.js`

Replace `openAnnotationForm`, `deleteAnnotation`, and `startShortcutListener` stubs.

- [ ] **Step 1: Replace `openAnnotationForm`, `deleteAnnotation`, `startShortcutListener` in content.js**

```js
function openAnnotationForm(existingAnn) {
  const content = document.getElementById('ba-tab-content');
  const currentTs = videoEl ? Math.floor(videoEl.currentTime) : 0;
  const tsStart = existingAnn ? formatTimestamp(existingAnn.timestampStart) : formatTimestamp(currentTs);
  const tsEnd = existingAnn?.timestampEnd != null ? formatTimestamp(existingAnn.timestampEnd) : '';
  const label = existingAnn?.label || '';
  const category = existingAnn?.category || 'note';
  const partNum = existingAnn?.partNumber || currentPart;

  const partRow = isMultiPart ? `
    <div class="ba-form-row">
      <div class="ba-form-field">
        <label>分P</label>
        <input class="ba-input" id="ba-form-part" type="number" min="1" value="${partNum}">
      </div>
    </div>` : '';

  content.innerHTML = `
    <div class="ba-form">
      <div class="ba-form-row">
        <div class="ba-form-field">
          <label>时间起点</label>
          <input class="ba-input" id="ba-form-ts-start" type="text" value="${tsStart}" placeholder="0:00">
        </div>
        <div class="ba-form-field">
          <label>时间终点（选填）</label>
          <input class="ba-input" id="ba-form-ts-end" type="text" value="${tsEnd}" placeholder="留空为单点">
        </div>
      </div>
      ${partRow}
      <div class="ba-form-row">
        <div class="ba-form-field">
          <label>标注内容 *</label>
          <input class="ba-input" id="ba-form-label" type="text" value="${escapeHtml(label)}" placeholder="描述这个时间点...">
        </div>
      </div>
      <div class="ba-form-row">
        <div class="ba-form-field">
          <label>分类</label>
          <select class="ba-select" id="ba-form-category">
            <option value="highlight" ${category === 'highlight' ? 'selected' : ''}>精彩</option>
            <option value="important" ${category === 'important' ? 'selected' : ''}>重要</option>
            <option value="funny"     ${category === 'funny'     ? 'selected' : ''}>搞笑</option>
            <option value="note"      ${category === 'note'      ? 'selected' : ''}>笔记</option>
            <option value="custom"    ${category === 'custom'    ? 'selected' : ''}>自定义</option>
          </select>
        </div>
      </div>
      <div class="ba-form-actions">
        <button class="ba-btn ba-btn-primary" id="ba-form-save">保存</button>
        <button class="ba-btn ba-btn-secondary" id="ba-form-cancel">取消</button>
      </div>
    </div>
  `;

  document.getElementById('ba-form-label').focus();

  document.getElementById('ba-form-cancel').addEventListener('click', () => {
    renderAnnotationsTab();
  });

  document.getElementById('ba-form-save').addEventListener('click', () => {
    const labelVal = document.getElementById('ba-form-label').value.trim();
    if (!labelVal) {
      document.getElementById('ba-form-label').style.borderColor = '#e53935';
      return;
    }

    const tsStartVal = parseTimestamp(document.getElementById('ba-form-ts-start').value);
    const tsEndRaw = document.getElementById('ba-form-ts-end').value.trim();
    const tsEndVal = tsEndRaw ? parseTimestamp(tsEndRaw) : null;
    const catVal = document.getElementById('ba-form-category').value;
    const partVal = isMultiPart
      ? parseInt(document.getElementById('ba-form-part').value, 10) || currentPart
      : currentPart;

    const annData = {
      id: existingAnn?.id || generateUUID(),
      partNumber: partVal,
      timestampStart: tsStartVal,
      timestampEnd: tsEndVal,
      label: labelVal,
      category: catVal
    };

    saveAnnotation(annData, existingAnn?.id);
  });
}

async function saveAnnotation(annData, replaceId) {
  if (!currentRecord) return;
  if (!currentRecord.annotations) currentRecord.annotations = [];

  if (replaceId) {
    const idx = currentRecord.annotations.findIndex(a => a.id === replaceId);
    if (idx !== -1) currentRecord.annotations[idx] = annData;
    else currentRecord.annotations.push(annData);
  } else {
    currentRecord.annotations.push(annData);
  }

  await BiliStorage.saveVideo(currentBVId, currentRecord);
  renderAnnotationsTab();
}

async function deleteAnnotation(id) {
  if (!currentRecord) return;
  currentRecord.annotations = (currentRecord.annotations || []).filter(a => a.id !== id);
  await BiliStorage.saveVideo(currentBVId, currentRecord);
  renderAnnotationsTab();
}

function startShortcutListener() {
  document.addEventListener('keydown', (e) => {
    const key = settings.shortcutKey || 'Alt+A';
    if (!matchesShortcut(e, key)) return;
    e.preventDefault();

    // Switch to annotations tab and open form
    activeTab = 'annotations';
    const root = document.getElementById('bili-annotator-root');
    if (root) {
      root.querySelectorAll('.ba-tab').forEach(t => t.classList.remove('ba-active'));
      root.querySelector('[data-tab="annotations"]')?.classList.add('ba-active');
    }
    if (sidebarOpen) {
      openAnnotationForm(null);
    } else {
      toggleSidebar();
      setTimeout(() => openAnnotationForm(null), 250);
    }
  });
}

function matchesShortcut(event, shortcutStr) {
  // Parse shortcut strings like "Alt+A", "Ctrl+Shift+N"
  const parts = shortcutStr.split('+');
  const key = parts[parts.length - 1].toLowerCase();
  const needsAlt = parts.includes('Alt');
  const needsCtrl = parts.includes('Ctrl');
  const needsShift = parts.includes('Shift');

  return event.key.toLowerCase() === key &&
    event.altKey === needsAlt &&
    event.ctrlKey === needsCtrl &&
    event.shiftKey === needsShift;
}
```

- [ ] **Step 2: Reload and test annotation CRUD**

1. Reload extension
2. Navigate to a Bilibili video page
3. Click "+ 添加标注" — form should appear
4. Fill in label "Test annotation", click 保存 — annotation appears in list
5. Click the ✏️ button on the annotation — form appears pre-filled
6. Edit the label, click 保存 — annotation updates
7. Click 🗑 — annotation disappears
8. Test keyboard shortcut: press `Alt+A` on the video page — form opens pre-filled with current timestamp

- [ ] **Step 3: Commit**

```bash
git add content/content.js
git commit -m "feat: annotation add/edit/delete form and keyboard shortcut"
```

---

## Task 10: Content Script — Summary Tab

**Files:**
- Modify: `content/content.js`

Replace `renderSummaryTab` stub.

- [ ] **Step 1: Replace `renderSummaryTab` in content.js**

```js
function renderSummaryTab() {
  const content = document.getElementById('ba-tab-content');
  const short = currentRecord?.summaryShort || '';
  const long = currentRecord?.summaryLong || '';

  content.innerHTML = `
    <div class="ba-field-group">
      <div class="ba-summary-label">
        <span>简短摘要</span>
        <span class="ba-char-counter" id="ba-short-counter">${short.length}/150</span>
      </div>
      <input class="ba-input" id="ba-summary-short" type="text" maxlength="150"
        value="${escapeHtml(short)}" placeholder="一句话描述这个视频...">
    </div>
    <div class="ba-field-group">
      <div class="ba-summary-label"><span>详细摘要</span></div>
      <textarea class="ba-textarea" id="ba-summary-long" rows="8"
        placeholder="详细描述、笔记、想法...">${escapeHtml(long)}</textarea>
    </div>
  `;

  const shortInput = document.getElementById('ba-summary-short');
  const longInput = document.getElementById('ba-summary-long');
  const counter = document.getElementById('ba-short-counter');

  const saveSummary = debounce(async () => {
    if (!currentRecord) return;
    currentRecord.summaryShort = shortInput.value;
    currentRecord.summaryLong = longInput.value;
    await BiliStorage.saveVideo(currentBVId, currentRecord);
  }, 1000);

  shortInput.addEventListener('input', () => {
    const len = shortInput.value.length;
    counter.textContent = `${len}/150`;
    counter.classList.toggle('ba-over', len > 150);
    saveSummary();
  });

  shortInput.addEventListener('blur', async () => {
    if (!currentRecord) return;
    currentRecord.summaryShort = shortInput.value;
    currentRecord.summaryLong = longInput.value;
    await BiliStorage.saveVideo(currentBVId, currentRecord);
  });

  longInput.addEventListener('input', saveSummary);

  longInput.addEventListener('blur', async () => {
    if (!currentRecord) return;
    currentRecord.summaryShort = shortInput.value;
    currentRecord.summaryLong = longInput.value;
    await BiliStorage.saveVideo(currentBVId, currentRecord);
  });
}
```

- [ ] **Step 2: Test summary auto-save**

1. Reload extension
2. Navigate to a Bilibili video page, click 摘要 tab
3. Type in the short summary field — character counter should update
4. Wait 1 second — verify save: `chrome.storage.local.get(null, console.log)` in console
5. Verify `summaryShort` is updated in storage
6. Click on another tab then back to 摘要 — text should persist

- [ ] **Step 3: Commit**

```bash
git add content/content.js
git commit -m "feat: summary tab with debounced auto-save"
```

---

## Task 11: Content Script — Tags Tab

**Files:**
- Modify: `content/content.js`

Replace `renderTagsTab` stub.

- [ ] **Step 1: Replace `renderTagsTab` in content.js**

```js
const PREDEFINED_TAGS = ['游戏', '音乐', '教程', '电影', '动漫', '美食', '科技', '日常', '纪录片', '搞笑', '教育', '体育', '新闻', '测评'];

function renderTagsTab() {
  const content = document.getElementById('ba-tab-content');
  const currentTags = currentRecord?.tags || [];

  const chipsHtml = currentTags.map(tag => `
    <span class="ba-chip">
      ${escapeHtml(tag)}
      <button class="ba-chip-remove" data-tag="${escapeHtml(tag)}" title="移除">✕</button>
    </span>`).join('');

  content.innerHTML = `
    <div class="ba-tags-chips" id="ba-tags-chips">${chipsHtml}</div>
    <div class="ba-tag-input-wrap">
      <input class="ba-input" id="ba-tag-input" type="text" placeholder="添加标签，按回车确认...">
      <div class="ba-suggestions" id="ba-tag-suggestions" style="display:none;"></div>
    </div>
  `;

  // Remove tag events
  content.querySelectorAll('.ba-chip-remove').forEach(btn => {
    btn.addEventListener('click', () => removeTagFromVideo(btn.dataset.tag));
  });

  const input = document.getElementById('ba-tag-input');
  const suggestionsEl = document.getElementById('ba-tag-suggestions');

  // Show suggestions on focus/input
  async function updateSuggestions() {
    const query = input.value.trim().toLowerCase();
    const allStoredTags = await BiliStorage.getTags();

    // Predefined first, then user tags, excluding already-applied
    const normalizedCurrent = currentTags.map(normalizeTag);
    const combined = [
      ...PREDEFINED_TAGS.filter(t => !normalizedCurrent.includes(normalizeTag(t))),
      ...allStoredTags.filter(t => !normalizedCurrent.includes(normalizeTag(t)) &&
        !PREDEFINED_TAGS.some(p => normalizeTag(p) === normalizeTag(t)))
    ];

    const filtered = query
      ? combined.filter(t => normalizeTag(t).includes(query))
      : combined.slice(0, 10);

    if (filtered.length === 0) {
      suggestionsEl.style.display = 'none';
      return;
    }

    suggestionsEl.innerHTML = filtered
      .map(t => `<div class="ba-suggestion" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</div>`)
      .join('');
    suggestionsEl.style.display = 'block';

    suggestionsEl.querySelectorAll('.ba-suggestion').forEach(el => {
      el.addEventListener('click', () => {
        addTagToVideo(el.dataset.tag);
        input.value = '';
        suggestionsEl.style.display = 'none';
      });
    });
  }

  input.addEventListener('focus', updateSuggestions);
  input.addEventListener('input', updateSuggestions);

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = input.value.trim();
      if (val) {
        addTagToVideo(val);
        input.value = '';
        suggestionsEl.style.display = 'none';
      }
    }
    if (e.key === 'Escape') {
      suggestionsEl.style.display = 'none';
    }
  });

  document.addEventListener('click', (e) => {
    if (!content.contains(e.target)) suggestionsEl.style.display = 'none';
  }, { once: true });
}

async function addTagToVideo(rawTag) {
  if (!currentRecord) return;
  const tag = normalizeTag(rawTag) === rawTag.toLowerCase()
    ? normalizeTag(rawTag)
    : rawTag; // normalized for ASCII, original for Chinese
  const normalized = normalizeTag(tag);
  if ((currentRecord.tags || []).some(t => normalizeTag(t) === normalized)) return;

  currentRecord.tags = [...(currentRecord.tags || []), tag];
  await BiliStorage.saveVideo(currentBVId, currentRecord);
  await BiliStorage.addTagToIndex(tag);
  renderTagsTab();
}

async function removeTagFromVideo(tag) {
  if (!currentRecord) return;
  const normalized = normalizeTag(tag);
  currentRecord.tags = (currentRecord.tags || []).filter(t => normalizeTag(t) !== normalized);
  await BiliStorage.saveVideo(currentBVId, currentRecord);
  await BiliStorage.removeTagFromIndex(tag);
  renderTagsTab();
}
```

- [ ] **Step 2: Test tags tab**

1. Reload extension, navigate to a video, click 标签 tab
2. Click the input — predefined tags should appear as suggestions
3. Click on "游戏" — chip appears
4. Type "pyt" in the input — suggestions should filter
5. Type "python" + Enter — new tag chip appears
6. Verify storage: `chrome.storage.local.get(['__tags'], console.log)` — both tags in index
7. Click ✕ on a chip — chip removed, storage updated

- [ ] **Step 3: Commit**

```bash
git add content/content.js
git commit -m "feat: tags tab with autocomplete"
```

---

## Task 12: Content Script — Rating Tab

**Files:**
- Modify: `content/content.js`

Replace `renderRatingTab` stub.

- [ ] **Step 1: Replace `renderRatingTab` in content.js**

```js
function renderRatingTab() {
  const content = document.getElementById('ba-tab-content');
  const rec = currentRecord || {};

  content.innerHTML = `
    <div class="ba-rating-mode-toggle">
      <button class="ba-mode-btn ${ratingMode === 'simple' ? 'ba-active' : ''}"
        id="ba-mode-simple">简单</button>
      <button class="ba-mode-btn ${ratingMode === 'detailed' ? 'ba-active' : ''}"
        id="ba-mode-detailed">详细</button>
    </div>

    <div id="ba-simple-rating" style="${ratingMode === 'simple' ? '' : 'display:none'}">
      <div class="ba-simple-rating">
        <button class="ba-reaction-btn ${rec.rating === 'like' ? 'ba-selected-like' : ''}"
          id="ba-btn-like">👍<br><span style="font-size:11px">喜欢</span></button>
        <button class="ba-reaction-btn ${rec.rating === 'dislike' ? 'ba-selected-dislike' : ''}"
          id="ba-btn-dislike">👎<br><span style="font-size:11px">不喜欢</span></button>
      </div>
    </div>

    <div id="ba-detailed-rating" style="${ratingMode === 'detailed' ? '' : 'display:none'}">
      <div class="ba-stars" id="ba-stars">
        ${[1,2,3,4,5].map(n => `
          <span class="ba-star ${(rec.starRating || 0) >= n ? 'ba-filled' : ''}"
            data-n="${n}">★</span>`).join('')}
      </div>
      <div style="font-size:12px;color:#888;margin-bottom:12px;">
        ${rec.starRating ? `${rec.starRating}/5` : '未评分'}
      </div>
    </div>

    <div class="ba-field-group">
      <div class="ba-rating-note-label">评价理由（选填）</div>
      <textarea class="ba-textarea" id="ba-rating-note" rows="3"
        placeholder="为什么给这个评分？">${escapeHtml(rec.ratingNote || '')}</textarea>
    </div>
  `;

  // Mode toggle
  document.getElementById('ba-mode-simple').addEventListener('click', () => {
    ratingMode = 'simple';
    renderRatingTab();
  });
  document.getElementById('ba-mode-detailed').addEventListener('click', () => {
    ratingMode = 'detailed';
    renderRatingTab();
  });

  // Like / dislike
  document.getElementById('ba-btn-like').addEventListener('click', async () => {
    currentRecord.rating = currentRecord.rating === 'like' ? null : 'like';
    await BiliStorage.saveVideo(currentBVId, currentRecord);
    renderRatingTab();
  });
  document.getElementById('ba-btn-dislike').addEventListener('click', async () => {
    currentRecord.rating = currentRecord.rating === 'dislike' ? null : 'dislike';
    await BiliStorage.saveVideo(currentBVId, currentRecord);
    renderRatingTab();
  });

  // Stars
  const stars = document.querySelectorAll('.ba-star');
  stars.forEach(star => {
    star.addEventListener('mouseover', () => {
      const n = parseInt(star.dataset.n);
      stars.forEach(s => s.classList.toggle('ba-hover', parseInt(s.dataset.n) <= n));
    });
    star.addEventListener('mouseout', () => {
      stars.forEach(s => s.classList.remove('ba-hover'));
    });
    star.addEventListener('click', async () => {
      const n = parseInt(star.dataset.n);
      currentRecord.starRating = currentRecord.starRating === n ? null : n;
      await BiliStorage.saveVideo(currentBVId, currentRecord);
      renderRatingTab();
    });
  });

  // Rating note
  const noteEl = document.getElementById('ba-rating-note');
  const saveNote = debounce(async () => {
    if (!currentRecord) return;
    currentRecord.ratingNote = noteEl.value;
    await BiliStorage.saveVideo(currentBVId, currentRecord);
  }, 1000);

  noteEl.addEventListener('input', saveNote);
  noteEl.addEventListener('blur', async () => {
    if (!currentRecord) return;
    currentRecord.ratingNote = noteEl.value;
    await BiliStorage.saveVideo(currentBVId, currentRecord);
  });
}
```

- [ ] **Step 2: Test rating tab**

1. Reload extension, navigate to a video, click 评分 tab
2. Click 👍 — button highlights, click again — deselects
3. Click 👎 — button highlights
4. Switch to 详细 mode — stars appear
5. Click 3rd star — 3 stars highlighted, click again — deselects
6. Type in 评价理由 field, wait 1s — verify save in storage

- [ ] **Step 3: Commit**

```bash
git add content/content.js
git commit -m "feat: rating tab with like/dislike and star rating"
```

---

## Task 13: Content Script — Settings Panel + Fullscreen Detection

**Files:**
- Modify: `content/content.js`

Replace `renderSettingsPanel` and `startFullscreenObserver` stubs.

- [ ] **Step 1: Replace `renderSettingsPanel` in content.js**

```js
function renderSettingsPanel() {
  const content = document.getElementById('ba-tab-content');

  content.innerHTML = `
    <div class="ba-settings">
      <div class="ba-settings-title">设置</div>

      <div class="ba-setting-row">
        <div>
          <div class="ba-setting-label">侧边栏模式</div>
        </div>
        <div class="ba-toggle-group">
          <button class="ba-toggle-opt ${settings.sidebarMode === 'overlay' ? 'ba-active' : ''}"
            data-mode="overlay">悬浮</button>
          <button class="ba-toggle-opt ${settings.sidebarMode === 'push' ? 'ba-active' : ''}"
            data-mode="push">推移</button>
        </div>
      </div>

      <div class="ba-setting-row">
        <div>
          <div class="ba-setting-label">键盘快捷键</div>
          <div class="ba-setting-desc">快速添加标注</div>
        </div>
        <div class="ba-key-capture" id="ba-key-capture" tabindex="0">
          ${settings.shortcutKey || 'Alt+A'}
        </div>
      </div>

      <div class="ba-setting-row">
        <div>
          <div class="ba-setting-label">进度追踪间隔</div>
          <div class="ba-setting-desc">秒</div>
        </div>
        <input class="ba-number-input" id="ba-progress-interval" type="number"
          min="5" max="300" value="${settings.progressInterval || 30}">
      </div>

      <div class="ba-setting-row">
        <div><div class="ba-setting-label">观看进度追踪</div></div>
        <input class="ba-checkbox" type="checkbox" id="ba-feat-watchProgress"
          ${settings.features.watchProgress ? 'checked' : ''}>
      </div>
      <div class="ba-setting-row">
        <div><div class="ba-setting-label">标注功能</div></div>
        <input class="ba-checkbox" type="checkbox" id="ba-feat-annotations"
          ${settings.features.annotations ? 'checked' : ''}>
      </div>
      <div class="ba-setting-row">
        <div><div class="ba-setting-label">摘要功能</div></div>
        <input class="ba-checkbox" type="checkbox" id="ba-feat-summary"
          ${settings.features.summary ? 'checked' : ''}>
      </div>
      <div class="ba-setting-row">
        <div><div class="ba-setting-label">标签功能</div></div>
        <input class="ba-checkbox" type="checkbox" id="ba-feat-tags"
          ${settings.features.tags ? 'checked' : ''}>
      </div>
      <div class="ba-setting-row">
        <div><div class="ba-setting-label">评分功能</div></div>
        <input class="ba-checkbox" type="checkbox" id="ba-feat-rating"
          ${settings.features.rating ? 'checked' : ''}>
      </div>
    </div>
  `;

  async function saveAndApply() {
    await BiliStorage.saveSettings(settings);
  }

  // Sidebar mode toggle
  content.querySelectorAll('.ba-toggle-opt[data-mode]').forEach(btn => {
    btn.addEventListener('click', async () => {
      settings.sidebarMode = btn.dataset.mode;
      content.querySelectorAll('.ba-toggle-opt[data-mode]').forEach(b =>
        b.classList.toggle('ba-active', b.dataset.mode === settings.sidebarMode));
      applySidebarMode(settings.sidebarMode);
      await saveAndApply();
    });
  });

  // Key capture
  const keyCaptureEl = document.getElementById('ba-key-capture');
  keyCaptureEl.addEventListener('focus', () => {
    keyCaptureEl.textContent = '按下快捷键...';
    keyCaptureEl.style.color = '#00a1d6';
  });
  keyCaptureEl.addEventListener('keydown', async (e) => {
    e.preventDefault();
    const parts = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
    if (!['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) parts.push(key);
    if (parts.length > 1) {
      settings.shortcutKey = parts.join('+');
      keyCaptureEl.textContent = settings.shortcutKey;
      keyCaptureEl.style.color = '';
      keyCaptureEl.blur();
      await saveAndApply();
    }
  });
  keyCaptureEl.addEventListener('blur', () => {
    keyCaptureEl.textContent = settings.shortcutKey || 'Alt+A';
    keyCaptureEl.style.color = '';
  });

  // Progress interval
  const intervalEl = document.getElementById('ba-progress-interval');
  intervalEl.addEventListener('change', async () => {
    const val = parseInt(intervalEl.value, 10);
    if (val >= 5 && val <= 300) {
      settings.progressInterval = val;
      // Restart interval with new value
      stopProgressTracking();
      if (settings.features.watchProgress && videoEl) startProgressTracking();
      await saveAndApply();
    }
  });

  // Feature toggles
  ['watchProgress', 'annotations', 'summary', 'tags', 'rating'].forEach(feat => {
    const el = document.getElementById(`ba-feat-${feat}`);
    if (!el) return;
    el.addEventListener('change', async () => {
      settings.features[feat] = el.checked;
      if (feat === 'watchProgress') {
        if (el.checked) { await findVideoEl(); startProgressTracking(); }
        else stopProgressTracking();
      }
      await saveAndApply();
    });
  });
}
```

- [ ] **Step 2: Replace `startFullscreenObserver` in content.js**

```js
function startFullscreenObserver() {
  const hint = document.getElementById('bili-annotator-fullscreen-hint');
  const root = document.getElementById('bili-annotator-root');

  function onFullscreenChange(isFullscreen) {
    if (!root || !hint) return;
    root.style.display = isFullscreen ? 'none' : '';
    hint.classList.toggle('ba-visible', isFullscreen);
  }

  // Standard fullscreen API
  document.addEventListener('fullscreenchange', () => {
    onFullscreenChange(!!document.fullscreenElement);
  });

  // Bilibili full-webpage mode: watch for class changes on body
  const bodyObserver = new MutationObserver(() => {
    const isFullWin = document.body.classList.contains('player-full-win') ||
      !!document.querySelector('.player-full-win');
    onFullscreenChange(isFullWin || !!document.fullscreenElement);
  });
  bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
}
```

- [ ] **Step 3: Reload and test settings + fullscreen**

1. Reload extension, navigate to a video
2. Click ⚙ icon in sidebar footer — settings panel opens
3. Toggle sidebar mode to 推移 — page content should shift right
4. Change shortcut: click the key capture field, press `Ctrl+M` — shortcut updates
5. Verify: `Ctrl+M` now opens annotation form
6. Check feature toggles: uncheck 评分功能 — 评分 tab shows "该功能已禁用"
7. Test fullscreen: click Bilibili's fullscreen button — sidebar disappears, 📋 icon appears
8. Exit fullscreen — sidebar reappears

- [ ] **Step 4: Commit**

```bash
git add content/content.js
git commit -m "feat: settings panel and fullscreen detection"
```

---

## Task 14: Background Service Worker

**Files:**
- Create: `background/background.js`

- [ ] **Step 1: Write background/background.js**

```js
// Service worker — routes extension icon clicks
// No DOM access available here

chrome.action.onClicked.addListener(async (tab) => {
  const isVideoPage = tab.url && /bilibili\.com\/video\//.test(tab.url);

  if (isVideoPage) {
    // Send toggle message to content script
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'toggleSidebar' });
    } catch (e) {
      // Content script not ready (e.g., page still loading) — ignore
      console.debug('[bili-annotator background] Could not send toggleSidebar:', e.message);
    }
  } else {
    // Open dashboard in a new tab
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/dashboard.html') });
  }
});
```

- [ ] **Step 2: Reload and test icon click routing**

1. Reload extension
2. On a Bilibili video page: click extension icon — sidebar should toggle open/closed
3. On any non-Bilibili page (e.g., `chrome://newtab`): click extension icon — dashboard opens in new tab (showing "Dashboard — coming soon")

- [ ] **Step 3: Commit**

```bash
git add background/background.js
git commit -m "feat: background service worker icon click routing"
```

---

## Task 15: Dashboard HTML + CSS

**Files:**
- Create: `dashboard/dashboard.html`
- Create: `dashboard/dashboard.css`

- [ ] **Step 1: Write dashboard/dashboard.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>B站注释器 — 视频库</title>
  <link rel="stylesheet" href="dashboard.css">
</head>
<body>
  <!-- Top bar -->
  <div class="db-topbar">
    <div class="db-brand">B站注释器</div>
    <input class="db-search" id="db-search" type="text" placeholder="🔍 搜索标题、摘要、标注、标签...">
    <div class="db-topbar-actions">
      <button class="db-btn db-btn-primary" id="db-export-btn">导出数据</button>
      <button class="db-btn db-btn-secondary" id="db-import-btn">导入数据</button>
      <input type="file" id="db-import-file" accept=".json" style="display:none">
    </div>
  </div>

  <!-- Filter/sort bar -->
  <div class="db-filterbar">
    <span class="db-filter-label">筛选：</span>
    <div class="db-tag-filter" id="db-tag-filter">
      <button class="db-filter-btn" id="db-tag-filter-btn">标签 ▾</button>
      <div class="db-tag-filter-dropdown" id="db-tag-dropdown" style="display:none"></div>
    </div>
    <select class="db-select" id="db-rating-filter">
      <option value="">全部评分</option>
      <option value="like">已点赞</option>
      <option value="dislike">已点踩</option>
      <option value="unrated">未评分</option>
      <option value="star3">⭐ 3星及以上</option>
      <option value="star4">⭐ 4星及以上</option>
      <option value="star5">⭐ 5星</option>
    </select>
    <div class="db-spacer"></div>
    <span class="db-filter-label">排序：</span>
    <select class="db-select" id="db-sort">
      <option value="lastWatched">最近观看</option>
      <option value="createdAt">添加日期</option>
      <option value="title">标题</option>
      <option value="annotations">标注数量</option>
    </select>
    <span class="db-video-count" id="db-video-count"></span>
  </div>

  <!-- Import strategy panel (hidden by default) -->
  <div class="db-import-panel" id="db-import-panel" style="display:none">
    <span>导入策略：</span>
    <button class="db-btn db-btn-secondary" id="db-import-skip">跳过已有记录</button>
    <button class="db-btn db-btn-primary" id="db-import-overwrite">覆盖已有记录</button>
    <button class="db-btn db-btn-secondary" id="db-import-cancel">取消</button>
    <span class="db-import-info" id="db-import-info"></span>
  </div>

  <!-- Main grid -->
  <div class="db-grid" id="db-grid"></div>

  <script src="../shared/utils.js"></script>
  <script src="../shared/storage.js"></script>
  <script src="dashboard.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write dashboard/dashboard.css**

```css
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  color: #333;
  background: #f4f5f7;
  min-height: 100vh;
}

/* Top bar */
.db-topbar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
  padding: 10px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

.db-brand {
  font-size: 17px;
  font-weight: 700;
  color: #00a1d6;
  white-space: nowrap;
  min-width: 110px;
}

.db-search {
  flex: 1;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 7px 12px;
  font-size: 13px;
  outline: none;
  font-family: inherit;
}

.db-search:focus {
  border-color: #00a1d6;
  box-shadow: 0 0 0 2px rgba(0,161,214,0.1);
}

.db-topbar-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.db-btn {
  padding: 6px 14px;
  border-radius: 5px;
  font-size: 12px;
  cursor: pointer;
  border: 1px solid transparent;
  font-family: inherit;
  white-space: nowrap;
  transition: all 0.15s;
}

.db-btn-primary {
  background: #00a1d6;
  color: #fff;
  border-color: #00a1d6;
}

.db-btn-primary:hover { background: #0091c2; }

.db-btn-secondary {
  background: #fff;
  color: #555;
  border-color: #ddd;
}

.db-btn-secondary:hover { background: #f5f5f5; }

/* Filter bar */
.db-filterbar {
  background: #fff;
  border-bottom: 1px solid #eee;
  padding: 8px 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.db-filter-label {
  font-size: 12px;
  color: #888;
}

.db-tag-filter {
  position: relative;
}

.db-filter-btn {
  padding: 4px 10px;
  border: 1px solid #ddd;
  border-radius: 12px;
  background: #fff;
  font-size: 12px;
  color: #555;
  cursor: pointer;
  font-family: inherit;
}

.db-filter-btn:hover, .db-filter-btn.active {
  border-color: #00a1d6;
  color: #00a1d6;
}

.db-tag-filter-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 8px;
  min-width: 200px;
  max-height: 240px;
  overflow-y: auto;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  z-index: 100;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.db-tag-option {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  background: #f5f5f5;
  border-radius: 10px;
  font-size: 11px;
  cursor: pointer;
  border: 1px solid transparent;
  user-select: none;
}

.db-tag-option.selected {
  background: #e3f2fd;
  color: #1565c0;
  border-color: #90caf9;
}

.db-select {
  border: 1px solid #ddd;
  border-radius: 5px;
  padding: 4px 8px;
  font-size: 12px;
  background: #fff;
  color: #555;
  font-family: inherit;
  cursor: pointer;
}

.db-spacer { flex: 1; }

.db-video-count {
  font-size: 11px;
  color: #aaa;
  white-space: nowrap;
}

/* Import panel */
.db-import-panel {
  background: #fff8e1;
  border-bottom: 1px solid #ffe082;
  padding: 10px 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.db-import-info {
  color: #888;
  font-size: 12px;
}

/* Video grid */
.db-grid {
  padding: 16px 20px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
}

/* Video card */
.db-card {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  transition: box-shadow 0.2s, transform 0.2s;
  cursor: pointer;
  text-decoration: none;
  display: flex;
  flex-direction: column;
}

.db-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  transform: translateY(-2px);
}

.db-card-thumb {
  width: 100%;
  height: 100px;
  object-fit: cover;
  display: block;
  background: linear-gradient(135deg, #1a237e, #283593);
}

.db-card-thumb-placeholder {
  width: 100%;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  background: linear-gradient(135deg, #37474f, #546e7a);
  color: rgba(255,255,255,0.3);
}

.db-card-body {
  padding: 10px 12px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.db-card-title {
  font-size: 13px;
  font-weight: 600;
  color: #222;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.db-card-summary {
  font-size: 11px;
  color: #888;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.db-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.db-tag-chip {
  font-size: 10px;
  padding: 1px 7px;
  background: #e3f2fd;
  color: #1565c0;
  border-radius: 8px;
}

.db-card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: #bbb;
  margin-top: auto;
}

.db-card-stats {
  display: flex;
  gap: 8px;
}

/* Empty state */
.db-empty {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px 20px;
  color: #aaa;
  font-size: 16px;
}

.db-empty-sub {
  font-size: 13px;
  margin-top: 8px;
  color: #ccc;
}
```

- [ ] **Step 3: Reload and verify dashboard opens**

1. Reload extension
2. Click extension icon on a non-Bilibili page
3. Dashboard opens in new tab — shows top bar, filter bar, empty grid
4. No console errors

- [ ] **Step 4: Commit**

```bash
git add dashboard/dashboard.html dashboard/dashboard.css
git commit -m "feat: dashboard HTML structure and CSS"
```

---

## Task 16: Dashboard JS — Video Grid

**Files:**
- Create: `dashboard/dashboard.js`

- [ ] **Step 1: Write dashboard/dashboard.js (initial version)**

```js
// ============================================================
// B站注释器 — Dashboard
// Depends on: shared/utils.js, shared/storage.js (loaded first)
// ============================================================

let allVideos = {};
let allTags = [];
let searchQuery = '';
let selectedTags = [];
let ratingFilter = '';
let sortBy = 'lastWatched';
let importPendingData = null;

// === INIT ===
async function init() {
  allVideos = await BiliStorage.getAllVideos();
  allTags = await BiliStorage.getTags();
  renderTagFilterOptions();
  renderGrid();
  bindEvents();
}

// === RENDER GRID ===
function renderGrid() {
  const videos = filterAndSort(Object.values(allVideos));
  const grid = document.getElementById('db-grid');
  const countEl = document.getElementById('db-video-count');
  countEl.textContent = `共 ${videos.length} 个视频`;

  if (videos.length === 0) {
    grid.innerHTML = `
      <div class="db-empty">
        <div>暂无视频记录</div>
        <div class="db-empty-sub">在Bilibili视频页面使用侧边栏添加标注后，视频将出现在这里</div>
      </div>`;
    return;
  }

  grid.innerHTML = videos.map(v => renderCard(v)).join('');
}

function renderCard(v) {
  const tags = (v.tags || []).slice(0, 3);
  const tagChips = tags.map(t => `<span class="db-tag-chip">${escapeHtml(t)}</span>`).join('');
  const moreCount = (v.tags || []).length - tags.length;
  const moreTags = moreCount > 0 ? `<span class="db-tag-chip">+${moreCount}</span>` : '';

  const ratingStr = v.rating === 'like' ? '👍'
    : v.rating === 'dislike' ? '👎'
    : v.starRating ? '⭐'.repeat(v.starRating)
    : '';

  const annCount = (v.annotations || []).length;
  const annStr = annCount > 0 ? `📌 ${annCount}条` : '';

  const lastWatched = v.watchProgress?.lastWatchedAt
    ? formatDate(v.watchProgress.lastWatchedAt)
    : '';

  const thumb = v.thumbnailUrl
    ? `<img class="db-card-thumb" src="${escapeHtml(v.thumbnailUrl)}" alt="" loading="lazy"
         onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
    : '';
  const placeholder = `<div class="db-card-thumb-placeholder" ${v.thumbnailUrl ? 'style="display:none"' : ''}>🎬</div>`;

  return `
    <a class="db-card" href="${escapeHtml(v.url)}" target="_blank" rel="noopener" title="${escapeHtml(v.title)}">
      ${thumb}${placeholder}
      <div class="db-card-body">
        <div class="db-card-title">${escapeHtml(v.title)}</div>
        ${v.summaryShort ? `<div class="db-card-summary">${escapeHtml(v.summaryShort)}</div>` : ''}
        <div class="db-card-tags">${tagChips}${moreTags}</div>
        <div class="db-card-meta">
          <div class="db-card-stats">
            ${ratingStr ? `<span>${ratingStr}</span>` : ''}
            ${annStr ? `<span>${annStr}</span>` : ''}
          </div>
          <span>${lastWatched}</span>
        </div>
      </div>
    </a>`;
}

function formatDate(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// === FILTER AND SORT ===
function filterAndSort(videos) {
  let result = videos;

  // Search filter
  if (searchQuery.trim()) {
    const queryTokens = tokenize(searchQuery);
    result = result.filter(v => {
      const fields = [
        v.title || '',
        v.summaryShort || '',
        v.summaryLong || '',
        ...(v.annotations || []).map(a => a.label || ''),
        ...(v.tags || [])
      ].join(' ');
      const fieldTokens = tokenize(fields);
      return queryTokens.every(qt =>
        fieldTokens.some(ft => ft.includes(qt))
      );
    });
  }

  // Tag filter
  if (selectedTags.length > 0) {
    result = result.filter(v =>
      selectedTags.every(st =>
        (v.tags || []).some(t => normalizeTag(t) === normalizeTag(st))
      )
    );
  }

  // Rating filter
  if (ratingFilter) {
    result = result.filter(v => {
      if (ratingFilter === 'like') return v.rating === 'like';
      if (ratingFilter === 'dislike') return v.rating === 'dislike';
      if (ratingFilter === 'unrated') return !v.rating && !v.starRating;
      if (ratingFilter === 'star3') return (v.starRating || 0) >= 3;
      if (ratingFilter === 'star4') return (v.starRating || 0) >= 4;
      if (ratingFilter === 'star5') return v.starRating === 5;
      return true;
    });
  }

  // Sort
  result.sort((a, b) => {
    if (sortBy === 'lastWatched') {
      const aTs = a.watchProgress?.lastWatchedAt || a.updatedAt || '';
      const bTs = b.watchProgress?.lastWatchedAt || b.updatedAt || '';
      return bTs.localeCompare(aTs);
    }
    if (sortBy === 'createdAt') return (b.createdAt || '').localeCompare(a.createdAt || '');
    if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '', 'zh');
    if (sortBy === 'annotations') return (b.annotations || []).length - (a.annotations || []).length;
    return 0;
  });

  return result;
}

// === TAG FILTER UI ===
function renderTagFilterOptions() {
  const dropdown = document.getElementById('db-tag-dropdown');
  if (!allTags.length) {
    dropdown.innerHTML = '<span style="font-size:12px;color:#aaa">暂无标签</span>';
    return;
  }
  dropdown.innerHTML = allTags.map(tag => `
    <div class="db-tag-option ${selectedTags.includes(tag) ? 'selected' : ''}" data-tag="${escapeHtml(tag)}">
      ${escapeHtml(tag)}
    </div>`).join('');
  dropdown.querySelectorAll('.db-tag-option').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const tag = el.dataset.tag;
      if (selectedTags.includes(tag)) {
        selectedTags = selectedTags.filter(t => t !== tag);
      } else {
        selectedTags.push(tag);
      }
      el.classList.toggle('selected', selectedTags.includes(tag));
      document.getElementById('db-tag-filter-btn').classList.toggle('active', selectedTags.length > 0);
      renderGrid();
    });
  });
}

// === EVENTS ===
function bindEvents() {
  // Search
  const searchEl = document.getElementById('db-search');
  searchEl.addEventListener('input', debounce(() => {
    searchQuery = searchEl.value;
    renderGrid();
  }, 200));

  // Tag filter dropdown toggle
  const tagBtn = document.getElementById('db-tag-filter-btn');
  const tagDropdown = document.getElementById('db-tag-dropdown');
  tagBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = tagDropdown.style.display !== 'none';
    tagDropdown.style.display = isOpen ? 'none' : 'flex';
  });
  document.addEventListener('click', () => { tagDropdown.style.display = 'none'; });

  // Rating filter
  document.getElementById('db-rating-filter').addEventListener('change', (e) => {
    ratingFilter = e.target.value;
    renderGrid();
  });

  // Sort
  document.getElementById('db-sort').addEventListener('change', (e) => {
    sortBy = e.target.value;
    renderGrid();
  });

  // Export/Import — wired in Tasks 19
  document.getElementById('db-export-btn').addEventListener('click', exportData);
  document.getElementById('db-import-btn').addEventListener('click', () => {
    document.getElementById('db-import-file').click();
  });
  document.getElementById('db-import-file').addEventListener('change', onImportFileSelected);
  document.getElementById('db-import-skip').addEventListener('click', () => runImport('skip'));
  document.getElementById('db-import-overwrite').addEventListener('click', () => runImport('overwrite'));
  document.getElementById('db-import-cancel').addEventListener('click', () => {
    importPendingData = null;
    document.getElementById('db-import-panel').style.display = 'none';
    document.getElementById('db-import-file').value = '';
  });
}

// Stubs for Tasks 19
async function exportData() { alert('导出功能即将实现'); }
function onImportFileSelected() {}
async function runImport(strategy) {}

// === BOOTSTRAP ===
init();
```

- [ ] **Step 2: Reload and test dashboard grid**

1. First, add some test data: on a Bilibili video page, add a few annotations, tags, and ratings
2. Click extension icon on a non-video page — dashboard opens
3. Video cards should appear with thumbnails, tags, rating icons, annotation counts
4. Verify: search box updates results as you type
5. Verify: sorting by title works (click sort dropdown)
6. Verify: tag filter shows known tags and filters correctly

- [ ] **Step 3: Commit**

```bash
git add dashboard/dashboard.js
git commit -m "feat: dashboard grid with search, filter, and sort"
```

---

## Task 17: Dashboard JS — Export / Import

**Files:**
- Modify: `dashboard/dashboard.js`

Replace the export/import stubs.

- [ ] **Step 1: Replace `exportData`, `onImportFileSelected`, `runImport` in dashboard.js**

```js
async function exportData() {
  const data = await BiliStorage.exportAll();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const today = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bilibili-annotator-export-${today}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function onImportFileSelected(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      importPendingData = JSON.parse(evt.target.result);
    } catch {
      alert('文件解析失败，请确认是有效的JSON文件');
      document.getElementById('db-import-file').value = '';
      return;
    }

    const count = Object.keys(importPendingData).filter(k => !k.startsWith('__')).length;
    document.getElementById('db-import-info').textContent = `文件中包含 ${count} 条视频记录`;
    document.getElementById('db-import-panel').style.display = 'flex';
  };
  reader.readAsText(file);
}

async function runImport(strategy) {
  if (!importPendingData) return;
  const count = await BiliStorage.importAll(importPendingData, strategy);

  importPendingData = null;
  document.getElementById('db-import-panel').style.display = 'none';
  document.getElementById('db-import-file').value = '';
  document.getElementById('db-import-info').textContent = '';

  // Refresh data
  allVideos = await BiliStorage.getAllVideos();
  allTags = await BiliStorage.getTags();
  renderTagFilterOptions();
  renderGrid();

  alert(`已导入 ${count} 条记录`);
}
```

- [ ] **Step 2: Test export and import**

**Export:**
1. Open dashboard
2. Click "导出数据" — a `.json` file downloads
3. Open the file — verify it contains your video records

**Import (skip):**
1. Edit the downloaded JSON: add a new video entry with a unique BV ID and some annotation data
2. Click "导入数据" → select the file → click "跳过已有记录"
3. Verify: new video appears in the grid, existing videos unchanged

**Import (overwrite):**
1. Edit the downloaded JSON: change `summaryShort` on an existing video
2. Import with "覆盖已有记录"
3. Verify: the modified video now shows the new summary

- [ ] **Step 3: Commit**

```bash
git add dashboard/dashboard.js
git commit -m "feat: dashboard export/import"
```

---

## Task 18: End-to-End Verification

No code changes — this is a complete manual test checklist.

- [ ] **Reload extension one final time** at `chrome://extensions`

- [ ] **Sidebar — basic**
  - [ ] Navigate to `bilibili.com/video/*` — sidebar appears on right
  - [ ] Toggle button opens/closes sidebar smoothly
  - [ ] Extension icon click on video page toggles sidebar
  - [ ] Extension icon click on non-video page opens dashboard

- [ ] **Sidebar — SPA navigation**
  - [ ] Click a video link within Bilibili — sidebar re-initializes for new video
  - [ ] Previous video's watch progress was saved before navigation

- [ ] **Watch progress**
  - [ ] Play video for 30s — `chrome.storage.local.get(null, console.log)` shows updated `lastPosition`
  - [ ] Progress bar at top of sidebar shows "上次观看" with percentage

- [ ] **Annotations tab**
  - [ ] Add annotation with timestamp, label, category — appears in list
  - [ ] Click timestamp in list — video seeks to that time
  - [ ] Edit annotation — form pre-fills, save updates list
  - [ ] Delete annotation — removed from list and storage
  - [ ] Press `Alt+A` (or configured shortcut) — form opens with current timestamp
  - [ ] For a multi-part video: annotations show part number, toggle shows/hides all parts

- [ ] **Summary tab**
  - [ ] Type short summary — auto-saves after 1s (check storage)
  - [ ] Character counter updates and turns red at 150+
  - [ ] Type long summary — auto-saves
  - [ ] Navigate away and back — summaries persist

- [ ] **Tags tab**
  - [ ] Click input — predefined tags appear as suggestions
  - [ ] Select predefined tag — chip appears
  - [ ] Type custom tag + Enter — chip appears, added to `__tags` index
  - [ ] Remove chip — removed from video and index (if no other video uses it)

- [ ] **Rating tab**
  - [ ] Click 👍 — highlights; click again — deselects
  - [ ] Click 👎 — highlights
  - [ ] Switch to 详细 — stars appear
  - [ ] Click 3rd star — 3 stars filled; click again — deselects
  - [ ] Type rating note — auto-saves after 1s

- [ ] **Settings**
  - [ ] Switch to 推移 mode — page content shifts right, sidebar pushes page
  - [ ] Switch back to 悬浮 — page content returns to normal
  - [ ] Change shortcut to `Ctrl+M` — new shortcut opens annotation form
  - [ ] Disable 评分功能 — 评分 tab shows "该功能已禁用"
  - [ ] Re-enable 评分功能 — tab works again

- [ ] **Fullscreen**
  - [ ] Click Bilibili fullscreen button — sidebar disappears, 📋 icon visible bottom-right
  - [ ] Exit fullscreen — sidebar reappears in previous state

- [ ] **Dashboard**
  - [ ] All visited videos appear as cards with thumbnails/placeholders
  - [ ] Search for a video title — results filter as you type
  - [ ] Search for an annotation label — video containing that annotation appears
  - [ ] Filter by tag — only tagged videos shown
  - [ ] Filter by rating — only matching videos shown
  - [ ] Sort by title — alphabetical order (Chinese locale)
  - [ ] Sort by annotation count — most-annotated first
  - [ ] Click a card — opens Bilibili video in new tab

- [ ] **Export/Import**
  - [ ] Export — JSON file downloads with all data
  - [ ] Import with skip — new records added, existing unchanged
  - [ ] Import with overwrite — existing records replaced
  - [ ] Import with invalid JSON — error message shown (no crash)

- [ ] **No console errors** on any Bilibili page (video and non-video)

- [ ] **Final commit**

```bash
git add .
git commit -m "chore: end-to-end verification complete"
```
