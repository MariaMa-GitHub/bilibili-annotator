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
