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
  document.getElementById('ba-tab-content').innerHTML =
    '<p class="ba-empty">设置即将实现</p>';
}
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
function startFullscreenObserver() {}
function startShortcutListener() {}
async function findVideoEl() {}
function startProgressTracking() {}

// === BOOTSTRAP ===
init();
