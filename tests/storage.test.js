// Run with: node tests/storage.test.js
// Tests for shared/storage.js — importAll security and strategy logic, BiliStorage core methods

const fs = require('fs');

// --- chrome.storage.local mock ---
let store = {};
function resetStore(initial = {}) { store = { ...initial }; }

global.chrome = {
  storage: {
    local: {
      get: async (key) => {
        if (key === null) return { ...store };
        if (typeof key === 'string') return { [key]: store[key] };
        if (Array.isArray(key)) return key.reduce((a, k) => { a[k] = store[k]; return a; }, {});
        return {};
      },
      set: async (obj) => { Object.assign(store, obj); }
    }
  }
};

// Load dependencies in the same order as the extension.
// utils.js uses function declarations → become globals via eval.
// storage.js uses `const BiliStorage = ...` → const is not eval-global; rewrite to global assignment.
eval(fs.readFileSync('shared/utils.js', 'utf8'));
const storageCode = fs.readFileSync('shared/storage.js', 'utf8')
  .replace(/^const BiliStorage\b/, 'global.BiliStorage');
eval(storageCode);

let passed = 0, failed = 0;
function assert(condition, msg) {
  if (condition) { console.log('  PASS:', msg); passed++; }
  else { console.error('  FAIL:', msg); failed++; }
}

function makeRecord(overrides = {}) {
  return {
    videoId: 'BV1test',
    title: 'Test Video',
    url: 'https://www.bilibili.com/video/BV1test',
    ...overrides
  };
}

(async () => {
  // ============================================================
  // importAll — security: javascript: / data: URL rejection
  // ============================================================
  console.log('\nimportAll — javascript: URL rejection:');

  resetStore();
  const count0 = await BiliStorage.importAll(
    { BV1bad: makeRecord({ url: 'javascript:alert(1)' }) }, 'overwrite'
  );
  const s0 = await chrome.storage.local.get('BV1bad');
  assert(s0.BV1bad === undefined, 'javascript: URL record is rejected entirely');
  assert(count0 === 0, 'import count is 0 for rejected records');

  resetStore();
  await BiliStorage.importAll(
    { BV1bad2: makeRecord({ url: 'data:text/html,<script>alert(1)</script>' }) }, 'overwrite'
  );
  const s1 = await chrome.storage.local.get('BV1bad2');
  assert(s1.BV1bad2 === undefined, 'data: URL record is rejected');

  resetStore();
  const cnt1 = await BiliStorage.importAll(
    { BV1ok: makeRecord({ videoId: 'BV1ok', url: 'https://www.bilibili.com/video/BV1ok' }) }, 'overwrite'
  );
  const s2 = await chrome.storage.local.get('BV1ok');
  assert(s2.BV1ok !== undefined, 'https: URL record is accepted');
  assert(cnt1 === 1, 'import count is 1 for accepted record');

  resetStore();
  await BiliStorage.importAll(
    { BV1http: makeRecord({ videoId: 'BV1http', url: 'http://www.bilibili.com/video/BV1http' }) }, 'overwrite'
  );
  const s3 = await chrome.storage.local.get('BV1http');
  assert(s3.BV1http !== undefined, 'http: URL record is accepted');

  // ============================================================
  // importAll — security: __tags non-string filtering
  // ============================================================
  console.log('\nimportAll — __tags type filtering:');

  resetStore();
  await BiliStorage.importAll({
    BV1test: makeRecord(),
    __tags: ['valid', 42, null, 'also-valid', { evil: true }]
  }, 'overwrite');
  const tagsResult = await chrome.storage.local.get('__tags');
  const tags = tagsResult.__tags || [];
  assert(tags.includes('valid'), 'string tag "valid" is kept');
  assert(tags.includes('also-valid'), 'string tag "also-valid" is kept');
  assert(!tags.some(t => t === 42), 'numeric tag 42 is filtered out');
  assert(!tags.some(t => t === null), 'null tag is filtered out');
  assert(!tags.some(t => typeof t === 'object' && t !== null), 'object tag is filtered out');
  assert(tags.length === 2, `only 2 string tags survive (got ${tags.length})`);

  // ============================================================
  // importAll — strategy: skip
  // ============================================================
  console.log('\nimportAll — skip strategy:');

  resetStore({ BV1existing: makeRecord({ title: 'Original' }) });
  const skipCount = await BiliStorage.importAll({
    BV1existing: makeRecord({ title: 'New' }),
    BV1new: makeRecord({ videoId: 'BV1new', title: 'New Video', url: 'https://bilibili.com/video/BV1new' })
  }, 'skip');
  const skipExisting = await chrome.storage.local.get('BV1existing');
  const skipNew = await chrome.storage.local.get('BV1new');
  assert(skipExisting.BV1existing.title === 'Original', 'skip: existing record not overwritten');
  assert(skipNew.BV1new !== undefined, 'skip: new record is imported');
  assert(skipCount === 1, 'skip: count reflects only new records');

  // ============================================================
  // importAll — strategy: overwrite
  // ============================================================
  console.log('\nimportAll — overwrite strategy:');

  resetStore({ BV1existing: makeRecord({ title: 'Original' }) });
  await BiliStorage.importAll({ BV1existing: makeRecord({ title: 'Updated' }) }, 'overwrite');
  const overRes = await chrome.storage.local.get('BV1existing');
  assert(overRes.BV1existing.title === 'Updated', 'overwrite: existing record replaced');

  // ============================================================
  // importAll — __settings always skipped
  // ============================================================
  console.log('\nimportAll — __settings always skipped:');

  resetStore();
  await BiliStorage.importAll({ __settings: { shortcutKey: 'evil' }, BV1ok2: makeRecord({ videoId: 'BV1ok2', url: 'https://bilibili.com/video/BV1ok2' }) }, 'overwrite');
  const setRes = await chrome.storage.local.get('__settings');
  assert(setRes.__settings === undefined, '__settings is not imported');

  // ============================================================
  // importAll — invalid record shapes rejected
  // ============================================================
  console.log('\nimportAll — invalid records:');

  resetStore();
  const invalCount = await BiliStorage.importAll({
    BV1no_videoId: { title: 'Missing videoId' },
    BV1no_title: { videoId: 'BV1no_title' },
    BV1bad_anns: makeRecord({ annotations: 'not-an-array' }),
    BV1bad_tags: makeRecord({ tags: 'not-an-array' }),
    BV1valid: makeRecord({ videoId: 'BV1valid', url: 'https://bilibili.com/video/BV1valid' })
  }, 'overwrite');
  const validRec = await chrome.storage.local.get('BV1valid');
  assert(invalCount === 1, `only the valid record is imported (got ${invalCount})`);
  assert(validRec.BV1valid !== undefined, 'valid record is stored');

  // ============================================================
  // getSettings — defaults and merging
  // ============================================================
  console.log('\ngetSettings:');

  resetStore();
  const defaults = await BiliStorage.getSettings();
  assert(defaults.shortcutKey === 'Alt+A', 'default shortcutKey is Alt+A');
  assert(defaults.sidebarMode === 'overlay', 'default sidebarMode is overlay');
  assert(defaults.features.watchProgress === true, 'default watchProgress feature is true');

  await chrome.storage.local.set({ __settings: { shortcutKey: 'Ctrl+K', features: { watchProgress: false } } });
  const merged = await BiliStorage.getSettings();
  assert(merged.shortcutKey === 'Ctrl+K', 'saved shortcutKey overrides default');
  assert(merged.features.watchProgress === false, 'saved feature override applied');
  assert(merged.features.summary === true, 'unset feature keeps default');

  // ============================================================
  // getOrCreateVideo / saveVideo / getVideo
  // ============================================================
  console.log('\ngetOrCreateVideo / saveVideo / getVideo:');

  resetStore();
  const rec = await BiliStorage.getOrCreateVideo('BV1abc', 'My Video', 'https://bilibili.com/video/BV1abc', null);
  assert(rec.videoId === 'BV1abc', 'created record has correct videoId');
  assert(rec.title === 'My Video', 'created record has correct title');
  assert(Array.isArray(rec.annotations), 'annotations defaults to array');
  assert(Array.isArray(rec.tags), 'tags defaults to array');

  const rec2 = await BiliStorage.getOrCreateVideo('BV1abc', 'Different Title', 'https://x.com', null);
  assert(rec2.title === 'My Video', 'getOrCreate returns existing record unchanged');

  const before = rec2.updatedAt;
  await new Promise(r => setTimeout(r, 2));
  await BiliStorage.saveVideo('BV1abc', { ...rec2, title: 'Edited' });
  const fetched = await BiliStorage.getVideo('BV1abc');
  assert(fetched.title === 'Edited', 'saveVideo persists changes');
  assert(fetched.updatedAt > before, 'saveVideo updates updatedAt');

  // ============================================================
  // addTagToIndex / removeTagFromIndex
  // ============================================================
  console.log('\naddTagToIndex / removeTagFromIndex:');

  resetStore();
  await BiliStorage.addTagToIndex('Gaming');
  await BiliStorage.addTagToIndex('gaming'); // duplicate (normalized)
  await BiliStorage.addTagToIndex('音乐');
  const tagsIdx = await BiliStorage.getTags();
  assert(tagsIdx.includes('Gaming'), 'Gaming tag added');
  assert(tagsIdx.includes('音乐'), '音乐 tag added');
  assert(tagsIdx.length === 2, `duplicate normalized tag not added (got ${tagsIdx.length})`);

  // removeTagFromIndex only removes if no video uses it
  await BiliStorage.getOrCreateVideo('BV1x', 'Vid', 'https://bilibili.com/video/BV1x', null);
  await BiliStorage.saveVideo('BV1x', { ...(await BiliStorage.getVideo('BV1x')), tags: ['Gaming'] });
  await BiliStorage.removeTagFromIndex('Gaming');
  const tagsAfter = await BiliStorage.getTags();
  assert(tagsAfter.includes('Gaming'), 'in-use tag not removed from index');

  await BiliStorage.removeTagFromIndex('音乐');
  const tagsFinal = await BiliStorage.getTags();
  assert(!tagsFinal.includes('音乐'), 'unused tag removed from index');

  // ============================================================
  // getAllVideos excludes reserved keys
  // ============================================================
  console.log('\ngetAllVideos:');

  resetStore({
    BV1a: makeRecord({ videoId: 'BV1a' }),
    BV1b: makeRecord({ videoId: 'BV1b' }),
    __settings: { shortcutKey: 'Alt+A' },
    __tags: ['tag1']
  });
  const videos = await BiliStorage.getAllVideos();
  assert('BV1a' in videos, 'BV1a is returned');
  assert('BV1b' in videos, 'BV1b is returned');
  assert(!('__settings' in videos), '__settings excluded');
  assert(!('__tags' in videos), '__tags excluded');

  // ============================================================
  // Done
  // ============================================================
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
