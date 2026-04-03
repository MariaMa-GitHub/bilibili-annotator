// Service worker — routes extension icon clicks and keyboard commands
// No DOM access available here

chrome.action.onClicked.addListener(async (tab) => {
  const isVideoPage = tab.url && /bilibili\.com\/video\//.test(tab.url);

  if (isVideoPage) {
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'toggleSidebar' });
    } catch (e) {
      console.debug('[bili-annotator background] Could not send toggleSidebar:', e.message);
    }
  } else {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/dashboard.html') });
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'open-dashboard') {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/dashboard.html') });
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  const isVideoPage = tab.url && /bilibili\.com\/video\//.test(tab.url);

  if (command === 'toggle-sidebar') {
    if (!isVideoPage) return;
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'toggleSidebar' });
    } catch (e) {
      console.debug('[bili-annotator background] Could not send toggleSidebar:', e.message);
    }
    return;
  }

  if (command === 'quick-annotate') {
    if (!isVideoPage) return;
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'quickAnnotate' });
    } catch (e) {
      console.debug('[bili-annotator background] Could not send quickAnnotate:', e.message);
    }
  }
});
