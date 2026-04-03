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

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeColor(color) {
  if (!color) return null;
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : null;
}

function matchesShortcut(event, shortcutStr) {
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
