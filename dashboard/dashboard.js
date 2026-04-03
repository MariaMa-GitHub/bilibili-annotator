// ============================================================
// B站注释器 — Dashboard
// Depends on: shared/utils.js, shared/storage.js (loaded first)
// ============================================================

let allVideos = {};
let allTags = [];
let searchQuery = '';
let selectedTags = [];
let likeFilter = '';   // '' | 'like' | 'dislike'
let ratingFilter = ''; // '' | 'star3' | 'star4' | 'star5'
let sortBy = 'lastWatched';
let importPendingData = null;
let currentPage = 1;
const ITEMS_PER_PAGE = 20;

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
  const allFiltered = filterAndSort(Object.values(allVideos));
  const totalPages = Math.max(1, Math.ceil(allFiltered.length / ITEMS_PER_PAGE));

  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const grid = document.getElementById('db-grid');
  const countEl = document.getElementById('db-video-count');
  countEl.textContent = `共 ${allFiltered.length} 个视频`;

  if (allFiltered.length === 0) {
    grid.innerHTML = `
      <div class="db-empty">
        <div>暂无标注视频</div>
        <div class="db-empty-sub">在Bilibili视频页面添加标注、摘要或评分后，视频将出现在这里</div>
      </div>`;
  } else {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const pageVideos = allFiltered.slice(start, start + ITEMS_PER_PAGE);
    grid.innerHTML = pageVideos.map(v => renderCard(v)).join('');
  }

  renderPagination(allFiltered.length, totalPages);
}

function renderPagination(total, totalPages) {
  const paginationEl = document.getElementById('db-pagination');
  const info = document.getElementById('db-page-info');
  const prevBtn = document.getElementById('db-page-prev');
  const nextBtn = document.getElementById('db-page-next');

  if (totalPages <= 1) {
    paginationEl.style.display = 'none';
    return;
  }

  paginationEl.style.display = 'flex';
  info.textContent = `第 ${currentPage} / ${totalPages} 页`;
  prevBtn.disabled = currentPage <= 1;
  nextBtn.disabled = currentPage >= totalPages;
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

  const wp = v.watchProgress;
  let progressTimestamp = '';
  let progressPct = 0;
  if (wp) {
    const useGlobal = (wp.partCount > 1) && (wp.totalDuration > 0);
    const displayPos = useGlobal ? (wp.globalPosition ?? 0) : (wp.lastPosition ?? 0);
    const displayDur = useGlobal ? wp.totalDuration : (wp.duration || 0);
    if (displayDur > 0) {
      progressTimestamp = `${formatTimestamp(displayPos)} / ${formatTimestamp(displayDur)}`;
      progressPct = Math.min(100, Math.round((displayPos / displayDur) * 100));
    }
  }

  const progressRow = progressTimestamp ? `
    <div class="db-card-progress-row">
      <div class="db-card-progress-bar"><div class="db-card-progress-fill" style="width:${progressPct}%"></div></div>
      <span class="db-card-progress">${progressPct}% · ${progressTimestamp}</span>
    </div>` : '';

  return `
    <a class="db-card" href="${escapeHtml(v.url)}" target="_blank" rel="noopener" title="${escapeHtml(v.title)}">
      <div class="db-card-title">${escapeHtml(v.title)}</div>
      ${(tags.length > 0 || moreCount > 0) ? `<div class="db-card-tags">${tagChips}${moreTags}</div>` : ''}
      ${progressRow}
      <div class="db-card-meta">
        <div class="db-card-stats">
          ${ratingStr ? `<span>${ratingStr}</span>` : ''}
          ${annStr ? `<span>${annStr}</span>` : ''}
        </div>
        ${lastWatched ? `<span class="db-card-date">${lastWatched}</span>` : ''}
      </div>
    </a>`;
}

function formatDate(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const now = new Date();
  if (d.getFullYear() !== now.getFullYear()) {
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  }
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
function hasAnnotationData(v) {
  if ((v.annotations || []).length > 0) return true;
  if (v.summaryShort || v.summaryLong) return true;
  if (v.rating === 'like' || v.rating === 'dislike') return true;
  if (v.starRating) return true;
  return false;
}

function ratingScore(v) {
  if (v.starRating) return v.starRating;
  if (v.rating === 'like') return 0.5;
  if (v.rating === 'dislike') return -1;
  return 0;
}

function filterAndSort(videos) {
  let result = videos.filter(hasAnnotationData);

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

  // Like/dislike filter
  if (likeFilter) {
    result = result.filter(v => v.rating === likeFilter);
  }

  // Star rating filter
  if (ratingFilter) {
    result = result.filter(v => {
      if (ratingFilter === 'star3') return (v.starRating || 0) >= 3;
      if (ratingFilter === 'star4') return (v.starRating || 0) >= 4;
      if (ratingFilter === 'star5') return v.starRating === 5;
      return true;
    });
  }

  // Sort with title tie-breaking
  result.sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'lastWatched') {
      const aTs = a.watchProgress?.lastWatchedAt || a.updatedAt || '';
      const bTs = b.watchProgress?.lastWatchedAt || b.updatedAt || '';
      cmp = bTs.localeCompare(aTs);
    } else if (sortBy === 'createdAt') {
      cmp = (b.createdAt || '').localeCompare(a.createdAt || '');
    } else if (sortBy === 'annotations') {
      cmp = (b.annotations || []).length - (a.annotations || []).length;
    } else if (sortBy === 'rating') {
      cmp = ratingScore(b) - ratingScore(a);
    }
    if (cmp === 0) cmp = (a.title || '').localeCompare(b.title || '', 'zh');
    return cmp;
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
      currentPage = 1;
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
    currentPage = 1;
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

  // Like/dislike toggle buttons
  document.querySelectorAll('.db-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const value = btn.dataset.value;
      likeFilter = likeFilter === value ? '' : value;
      document.querySelectorAll('.db-toggle-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.value === likeFilter)
      );
      currentPage = 1;
      renderGrid();
    });
  });

  // Star rating toggle buttons (mutually exclusive)
  document.querySelectorAll('#db-star3-filter, #db-star4-filter, #db-star5-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      const value = btn.dataset.value;
      ratingFilter = ratingFilter === value ? '' : value;
      document.querySelectorAll('#db-star3-filter, #db-star4-filter, #db-star5-filter').forEach(b =>
        b.classList.toggle('active', b.dataset.value === ratingFilter)
      );
      currentPage = 1;
      renderGrid();
    });
  });

  // Sort
  document.getElementById('db-sort').addEventListener('change', (e) => {
    sortBy = e.target.value;
    currentPage = 1;
    renderGrid();
  });

  // Pagination
  document.getElementById('db-page-prev').addEventListener('click', () => {
    if (currentPage > 1) { currentPage--; renderGrid(); }
  });
  document.getElementById('db-page-next').addEventListener('click', () => {
    currentPage++;
    renderGrid();
  });

  // Export/Import
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
  reader.onerror = () => {
    alert('文件读取失败');
    document.getElementById('db-import-file').value = '';
  };
  reader.readAsText(file);
}

async function runImport(strategy) {
  if (!importPendingData) return;
  try {
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
  } catch (e) {
    importPendingData = null;
    document.getElementById('db-import-panel').style.display = 'none';
    document.getElementById('db-import-file').value = '';
    alert('导入失败，请检查文件格式');
  }
}

// === BOOTSTRAP ===
init();
