const BiliStorage = (() => {
  const RESERVED_KEYS = ['__settings', '__tags'];

  const DEFAULT_SETTINGS = {
    sidebarMode: 'overlay',
    sidebarDefaultOpen: false,
    shortcutKey: 'Alt+A',
    progressInterval: 30,
    features: {
      watchProgress: true,
      summary: true,
      tags: true,
      rating: true
    }
  };

  function makeDefaultRecord(bvId, title, url) {
    const now = new Date().toISOString();
    return {
      videoId: bvId,
      title: title || bvId,
      url: url || `https://www.bilibili.com/video/${bvId}`,
      summaryShort: '',
      summaryLong: '',
      rating: null,
      starRating: null,
      ratingNote: '',
      tags: [],
      annotations: [],
      watchProgress: { lastWatchedAt: null, lastPosition: 0, duration: 0, completed: false },
      createdAt: now,
      updatedAt: now
    };
  }

  async function getVideo(bvId) {
    const result = await chrome.storage.local.get(bvId);
    return result[bvId] || null;
  }

  async function getOrCreateVideo(bvId, title, url) {
    const existing = await getVideo(bvId);
    if (existing) return existing;
    const record = makeDefaultRecord(bvId, title, url);
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

  function isValidRecord(val) {
    if (!val || typeof val !== 'object') return false;
    if (typeof val.videoId !== 'string' || !val.videoId) return false;
    if (typeof val.title !== 'string') return false;
    if ('annotations' in val && !Array.isArray(val.annotations)) return false;
    if ('tags' in val && !Array.isArray(val.tags)) return false;
    if (val.url != null) {
      if (typeof val.url !== 'string') return false;
      if (val.url && !/^https?:\/\//.test(val.url)) return false;
    }
    return true;
  }

  async function importAll(data, strategy) {
    const current = await chrome.storage.local.get(null);
    const toWrite = {};

    for (const [key, val] of Object.entries(data)) {
      if (key === '__settings') continue;
      if (key === '__tags') continue;
      if (!isValidRecord(val)) continue;
      if (strategy === 'skip' && key in current) continue;
      toWrite[key] = val;
    }

    if (data.__tags) {
      const currentTags = current.__tags || [];
      const importedTags = Array.isArray(data.__tags)
        ? data.__tags.filter(t => typeof t === 'string')
        : [];
      toWrite.__tags = [...new Set([...currentTags, ...importedTags])];
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
