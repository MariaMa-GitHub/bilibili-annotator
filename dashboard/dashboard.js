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
