// Run with: node tests/dashboard.test.js
// Tests for pure functions in dashboard/dashboard.js:
//   formatDate, hasAnnotationData, ratingScore, filterAndSort

const fs = require('fs');

// --- Minimal stubs so dashboard.js can load without a real browser ---

global.crypto = require('crypto');

// Mock chrome.storage (dashboard calls BiliStorage.getAllVideos / getTags on init())
let store = {};
global.chrome = {
  storage: {
    local: {
      get: async (key) => {
        if (key === null) return { ...store };
        if (typeof key === 'string') return { [key]: store[key] };
        return {};
      },
      set: async (obj) => { Object.assign(store, obj); }
    }
  }
};

// Mock document — dashboard.js calls getElementById / addEventListener at init
function makeMockEl() {
  return {
    innerHTML: '',
    style: { display: '' },
    value: '',
    classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
    querySelectorAll: () => [],
    addEventListener: () => {},
    dataset: {}
  };
}
global.document = {
  getElementById: () => makeMockEl(),
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: () => {}
};
global.alert = () => {};
global.FileReader = class { readAsText() {} };

// Load shared deps then dashboard.js.
// Module-level `let` in eval is scoped to the eval call and not reachable from test code.
// Rewrite those declarations to `var` so they land in the module scope and are shared with
// the functions that close over them (filterAndSort etc. use searchQuery, selectedTags, etc.)
eval(fs.readFileSync('shared/utils.js', 'utf8'));
const storageCode = fs.readFileSync('shared/storage.js', 'utf8')
  .replace(/^const BiliStorage\b/, 'global.BiliStorage');
eval(storageCode);

const dashCode = fs.readFileSync('dashboard/dashboard.js', 'utf8')
  .replace(
    /^let (allVideos|allTags|searchQuery|selectedTags|likeFilter|ratingFilter|sortBy|importPendingData|currentPage)\b/gm,
    'var $1'
  );
eval(dashCode);

let passed = 0, failed = 0;
function assert(condition, msg) {
  if (condition) { console.log('  PASS:', msg); passed++; }
  else { console.error('  FAIL:', msg); failed++; }
}

// ============================================================
// formatDate
// ============================================================
console.log('\nformatDate:');

assert(formatDate('') === '', 'empty string returns empty string');
assert(formatDate(null) === '', 'null returns empty string');

// Same year as now (2026): show "月日"
const sameYearResult = formatDate('2026-03-15T10:00:00.000Z');
assert(sameYearResult.includes('月') && sameYearResult.includes('日'), 'same year: shows 月日 format');
assert(!sameYearResult.includes('年'), 'same year: no 年');

// Past year: show "年月日"
const pastResult = formatDate('2020-06-15T10:00:00.000Z');
assert(pastResult.includes('年'), 'different year: includes 年');
assert(pastResult.includes('2020'), 'different year: includes the year number');

// ============================================================
// hasAnnotationData
// ============================================================
console.log('\nhasAnnotationData:');

assert(hasAnnotationData({ annotations: [{ id: '1' }] }) === true, 'has annotations → true');
assert(hasAnnotationData({ summaryShort: 'hi' }) === true, 'has summaryShort → true');
assert(hasAnnotationData({ summaryLong: 'hi' }) === true, 'has summaryLong → true');
assert(hasAnnotationData({ rating: 'like' }) === true, 'like rating → true');
assert(hasAnnotationData({ rating: 'dislike' }) === true, 'dislike rating → true');
assert(hasAnnotationData({ starRating: 3 }) === true, 'star rating → true');
assert(hasAnnotationData({}) === false, 'empty record → false');
assert(hasAnnotationData({ annotations: [] }) === false, 'empty annotations array → false');
assert(hasAnnotationData({ rating: null }) === false, 'null rating → false');
assert(hasAnnotationData({ summaryShort: '', summaryLong: '' }) === false, 'blank summaries → false');

// ============================================================
// ratingScore
// ============================================================
console.log('\nratingScore:');

assert(ratingScore({ starRating: 5 }) === 5, 'starRating 5 → 5');
assert(ratingScore({ starRating: 3 }) === 3, 'starRating 3 → 3');
assert(ratingScore({ starRating: 1 }) === 1, 'starRating 1 → 1');
assert(ratingScore({ rating: 'like' }) === 0.5, 'like (no star) → 0.5');
assert(ratingScore({ rating: 'dislike' }) === -1, 'dislike → -1');
assert(ratingScore({}) === 0, 'no rating → 0');
assert(ratingScore({ rating: null }) === 0, 'null rating → 0');
assert(ratingScore({ starRating: 4, rating: 'dislike' }) === 4, 'starRating takes precedence over dislike');

// ============================================================
// filterAndSort
// ============================================================
console.log('\nfilterAndSort:');

function makeVideo(overrides = {}) {
  return {
    videoId: 'BV1x',
    title: 'Default Title',
    annotations: [{ id: '1', label: 'note' }],
    summaryShort: '',
    summaryLong: '',
    rating: null,
    starRating: null,
    tags: [],
    watchProgress: { lastWatchedAt: null },
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  };
}

function resetFilters() {
  searchQuery = '';
  selectedTags = [];
  likeFilter = '';
  ratingFilter = '';
  sortBy = 'lastWatched';
}

// Only annotated videos pass through
resetFilters();
const mixedVideos = [
  makeVideo({ videoId: 'BV1ann', title: 'Annotated', annotations: [{ id: '1', label: 'x' }] }),
  makeVideo({ videoId: 'BV1empty', title: 'Empty', annotations: [] })
];
const annotatedOnly = filterAndSort(mixedVideos);
assert(annotatedOnly.length === 1, 'filterAndSort: bare record with no data excluded');
assert(annotatedOnly[0].videoId === 'BV1ann', 'filterAndSort: annotated record kept');

// Search — matches title
resetFilters();
searchQuery = 'hello';
const searchVids = [
  makeVideo({ videoId: 'BV1a', title: 'Hello World' }),
  makeVideo({ videoId: 'BV1b', title: 'Goodbye' })
];
const searchRes = filterAndSort(searchVids);
assert(searchRes.length === 1, 'search: filters by title match');
assert(searchRes[0].videoId === 'BV1a', 'search: correct video returned');

// Search — matches annotation label
resetFilters();
searchQuery = 'highlight';
const searchAnns = [
  makeVideo({ videoId: 'BV1c', title: 'Generic', annotations: [{ id: '1', label: 'highlight moment' }] }),
  makeVideo({ videoId: 'BV1d', title: 'Also Generic', annotations: [{ id: '1', label: 'boring' }] })
];
const annRes = filterAndSort(searchAnns);
assert(annRes.length === 1, 'search: filters by annotation label');
assert(annRes[0].videoId === 'BV1c', 'search: correct video by annotation label');

// Tag filter
resetFilters();
selectedTags = ['gaming'];
const tagVids = [
  makeVideo({ videoId: 'BV1e', tags: ['Gaming', 'fun'] }),
  makeVideo({ videoId: 'BV1f', tags: ['music'] })
];
const tagRes = filterAndSort(tagVids);
assert(tagRes.length === 1, 'tag filter: only matching tags kept');
assert(tagRes[0].videoId === 'BV1e', 'tag filter: correct video');

// Like filter
resetFilters();
likeFilter = 'like';
const likeVids = [
  makeVideo({ videoId: 'BV1g', rating: 'like' }),
  makeVideo({ videoId: 'BV1h', rating: 'dislike' }),
  makeVideo({ videoId: 'BV1i', starRating: 5 })
];
const likeRes = filterAndSort(likeVids);
assert(likeRes.length === 1, 'like filter: only liked videos');
assert(likeRes[0].videoId === 'BV1g', 'like filter: correct video');

// Star rating filter — star3 means starRating >= 3
resetFilters();
ratingFilter = 'star3';
const starVids = [
  makeVideo({ videoId: 'BV1j', starRating: 5 }),
  makeVideo({ videoId: 'BV1k', starRating: 3 }),
  makeVideo({ videoId: 'BV1l', starRating: 2 }),
  makeVideo({ videoId: 'BV1m', rating: 'like' })
];
const starRes = filterAndSort(starVids);
assert(starRes.length === 2, `star3 filter: keeps starRating >= 3 (got ${starRes.length})`);

// Sort by rating descending
resetFilters();
sortBy = 'rating';
const ratingVids = [
  makeVideo({ videoId: 'BV1n', rating: 'dislike' }),
  makeVideo({ videoId: 'BV1o', starRating: 5 }),
  makeVideo({ videoId: 'BV1p', rating: 'like' })
];
const ratingRes = filterAndSort(ratingVids);
assert(ratingRes[0].videoId === 'BV1o', 'sort by rating: starRating 5 is first');
assert(ratingRes[2].videoId === 'BV1n', 'sort by rating: dislike is last');

// Title tie-break
resetFilters();
sortBy = 'lastWatched';
const tieVids = [
  makeVideo({ videoId: 'BV1q', title: 'Zebra', watchProgress: { lastWatchedAt: '2026-01-01T00:00:00Z' } }),
  makeVideo({ videoId: 'BV1r', title: 'Apple', watchProgress: { lastWatchedAt: '2026-01-01T00:00:00Z' } })
];
const tieRes = filterAndSort(tieVids);
assert(tieRes[0].title === 'Apple', 'title tie-break: Apple before Zebra');

// Sort by annotations count
resetFilters();
sortBy = 'annotations';
const annCountVids = [
  makeVideo({ videoId: 'BV1s', title: 'Few', annotations: [{ id: '1', label: 'a' }] }),
  makeVideo({ videoId: 'BV1t', title: 'Many', annotations: [{ id: '1', label: 'a' }, { id: '2', label: 'b' }] })
];
const annCountRes = filterAndSort(annCountVids);
assert(annCountRes[0].videoId === 'BV1t', 'sort by annotations: more annotations first');

// Sort by createdAt descending
resetFilters();
sortBy = 'createdAt';
const dateVids = [
  makeVideo({ videoId: 'BV1u', title: 'Older', createdAt: '2025-01-01T00:00:00Z' }),
  makeVideo({ videoId: 'BV1v', title: 'Newer', createdAt: '2026-01-01T00:00:00Z' })
];
const dateRes = filterAndSort(dateVids);
assert(dateRes[0].videoId === 'BV1v', 'sort by createdAt: newer first');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
