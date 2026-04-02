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
    if (!currentRecord) return;
    currentRecord.rating = currentRecord.rating === 'like' ? null : 'like';
    await BiliStorage.saveVideo(currentBVId, currentRecord);
    renderRatingTab();
  });
  document.getElementById('ba-btn-dislike').addEventListener('click', async () => {
    if (!currentRecord) return;
    currentRecord.rating = currentRecord.rating === 'dislike' ? null : 'dislike';
    await BiliStorage.saveVideo(currentBVId, currentRecord);
    renderRatingTab();
  });

  // Stars
  const stars = content.querySelectorAll('.ba-star');
  stars.forEach(star => {
    star.addEventListener('mouseover', () => {
      const n = parseInt(star.dataset.n);
      stars.forEach(s => s.classList.toggle('ba-hover', parseInt(s.dataset.n) <= n));
    });
    star.addEventListener('mouseout', () => {
      stars.forEach(s => s.classList.remove('ba-hover'));
    });
    star.addEventListener('click', async () => {
      if (!currentRecord) return;
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
    } else {
      intervalEl.value = settings.progressInterval || 30;
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
      // Re-render active tab so feature enable/disable takes effect immediately
      renderActiveTab();
    });
  });
}
function startNavObserver() {
  const titleEl = document.querySelector('head title');
  if (!titleEl) return;

  const observer = new MutationObserver(() => {
    const newUrl = window.location.href;
    if (newUrl === lastUrl) return;
    lastUrl = newUrl;

    const newBVId = extractBVId(newUrl);
    if (!newBVId) return;

    if (newBVId === currentBVId) {
      // Same video — check if part changed
      const newPart = extractPartNumber(newUrl);
      if (newPart !== currentPart) {
        currentPart = newPart;
        renderActiveTab();
      }
      return;
    }

    // Save progress for previous video before switching
    if (currentBVId && currentRecord) saveProgress();

    // Stop tracking previous video
    stopProgressTracking();

    currentBVId = newBVId;
    currentPart = extractPartNumber(newUrl);
    showAllParts = false;
    activeTab = 'annotations';
    ratingMode = 'simple';

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
      if (!newBVId) return;
      if (newBVId === currentBVId) {
        const newPart = extractPartNumber(newUrl);
        if (newPart !== currentPart) {
          currentPart = newPart;
          renderActiveTab();
        }
        return;
      }
      stopProgressTracking();
      currentBVId = newBVId;
      currentPart = extractPartNumber(newUrl);
      showAllParts = false;
      loadVideo();
    }
  });
}

function stopProgressTracking() {
  if (progressIntervalId) {
    clearInterval(progressIntervalId);
    progressIntervalId = null;
  }
}
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
    const isFullWin = document.body.classList.contains('player-full-win');
    onFullscreenChange(isFullWin || !!document.fullscreenElement);
  });
  bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
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

// === BOOTSTRAP ===
init();
