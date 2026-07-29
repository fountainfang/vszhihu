/**
 * VSCode Zhihu - Content Script Entry Point
 */

(function() {
  console.log('[VSCode-Zhihu] Content script initialized on:', window.location.href);

  let currentSettings = { enabled: true, theme: 'dark-plus', codeViewMode: 'code' };
  let lastPathname = window.location.pathname;

  // Retrieve user settings from background/storage
  try {
    chrome.runtime.sendMessage({ action: 'getSettings' }, (settings) => {
      if (!chrome.runtime.lastError && settings && settings.enabled !== undefined) {
        currentSettings = Object.assign(currentSettings, settings);
      }

      if (currentSettings.enabled !== false) {
        startVSCodeMode(currentSettings);
      } else {
        // Extension disabled — reveal the original page
        document.documentElement.classList.add('vsc-zhihu-ready');
      }
    });
  } catch(e) {
    // Fallback if background extension context is warming up
    startVSCodeMode(currentSettings);
  }

  // Listen for popup settings messages (theme change, boss key, custom code)
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'setTheme' && window.VSZhihuUI) {
      window.VSZhihuUI.setTheme(msg.theme);
    } else if (msg.action === 'toggleBossKey' && window.VSZhihuUI) {
      window.VSZhihuUI.toggleBossKey();
    } else if (msg.action === 'updateBossCode' && window.VSZhihuUI) {
      window.VSZhihuUI.customBossCode = msg.code;
      window.VSZhihuUI.createBossScreen();
    } else if (msg.action === 'openCommandPalette' && window.VSZhihuCommandPalette) {
      window.VSZhihuCommandPalette.open();
    }
  });

  function parseCurrentPage() {
    if (!window.VSZhihuParser) {
      return { type: 'general', title: document.title, answers: [], feedList: [] };
    }
    const pageType = window.VSZhihuParser.getPageType();
    let data = { type: pageType, title: document.title, answers: [], feedList: [] };

    if (pageType === 'question') {
      data = window.VSZhihuParser.parseQuestionPage();
    } else if (pageType === 'article') {
      data = window.VSZhihuParser.parseArticlePage();
    } else if (pageType === 'hot') {
      data = window.VSZhihuParser.parseHotPage();
    } else {
      data = window.VSZhihuParser.parseFeedPage();
    }

    return data;
  }

  function startVSCodeMode(settings) {
    let data = parseCurrentPage();

    // Initialize UI engine
    if (window.VSZhihuUI) {
      window.VSZhihuUI.init(settings, data);
    }

    // Reveal the VS Code overlay (hidden since document_start to prevent flash)
    document.documentElement.classList.add('vsc-zhihu-ready');

    // Dynamic retry polling for delayed React hydration (up to 30 seconds)
    let retryCount = 0;
    const retryInterval = setInterval(() => {
      retryCount++;
      const refreshedData = parseCurrentPage();
      const hasContent = (refreshedData.feedList && refreshedData.feedList.length > 0) || (refreshedData.answers && refreshedData.answers.length > 0);

      if (hasContent || retryCount >= 100) {
        if (hasContent && window.VSZhihuUI) {
          window.VSZhihuUI.parsedData = refreshedData;
          window.VSZhihuUI.createAppRoot();
        }
        if (hasContent || retryCount >= 100) {
          clearInterval(retryInterval);
        }
      }
    }, 300);

    // Observe DOM updates & scroll lazy loading
    let updateTimer = null;
    const observer = new MutationObserver(() => {
      clearTimeout(updateTimer);
      updateTimer = setTimeout(() => {
        if (!window.VSZhihuUI) return;

        // Detect SPA path change
        if (window.location.pathname !== lastPathname) {
          lastPathname = window.location.pathname;
          data = parseCurrentPage();
          if (window.VSZhihuUI) {
            window.VSZhihuUI.parsedData = data;
            window.VSZhihuUI.createAppRoot();
          }
          return;
        }

        const currentParsed = window.VSZhihuUI?.parsedData || {};
        const newData = parseCurrentPage();
        const itemCountChanged = (newData.answers?.length !== currentParsed.answers?.length) ||
                                 (newData.feedList?.length !== currentParsed.feedList?.length);

        if (newData && itemCountChanged && window.VSZhihuUI) {
          window.VSZhihuUI.parsedData = newData;
          window.VSZhihuUI.createAppRoot();
        }
      }, 250);
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
