// VSCode Zhihu - Open Source Basic Edition Popup Script

document.addEventListener('DOMContentLoaded', () => {
  const toggleEnabled = document.getElementById('toggle-enabled');
  const selectTheme = document.getElementById('select-theme');
  const btnBoss = document.getElementById('btn-boss');

  // Safely send message to active tab content script
  function safeSendMessageToActiveTab(message) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, message, () => {
          if (chrome.runtime.lastError) {
            // Suppress error if active tab is not zhihu.com
          }
        });
      }
    });
  }

  // Load saved settings
  chrome.storage.sync.get(['enabled', 'theme'], (res) => {
    if (res.enabled !== undefined) {
      toggleEnabled.checked = res.enabled;
    }
    if (res.theme) {
      selectTheme.value = res.theme;
    }
  });

  // Enable/Disable toggle handler
  toggleEnabled.addEventListener('change', () => {
    chrome.storage.sync.set({ enabled: toggleEnabled.checked }, () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0] && tabs[0].id && tabs[0].url && tabs[0].url.includes('zhihu.com')) {
          chrome.tabs.reload(tabs[0].id);
        }
      });
    });
  });

  // Theme selection handler
  selectTheme.addEventListener('change', () => {
    const selectedTheme = selectTheme.value;
    chrome.storage.sync.set({ theme: selectedTheme }, () => {
      safeSendMessageToActiveTab({ action: 'setTheme', theme: selectedTheme });
    });
  });

  // Stealth boss mode test button
  btnBoss.addEventListener('click', () => {
    safeSendMessageToActiveTab({ action: 'toggleBossKey' });
  });
});
