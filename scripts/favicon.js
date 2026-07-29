/**
 * VSCode Zhihu - Favicon Replacer
 */

(function() {
  const CUSTOM_FAVICON_URL = 'https://code.visualstudio.com/assets/favicon.ico';
  let faviconObserver = null;
  let headObserver = null;

  function replaceZhihuFavicon() {
    if (!document.head) return;

    // 移除所有 favicon 相关节点，避免 Chrome 继续优先使用知乎原图标。
    const existingIcons = document.querySelectorAll(
      'link[rel~="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]'
    );
    existingIcons.forEach(icon => icon.remove());

    const favicon = document.createElement('link');
    favicon.rel = 'icon';
    favicon.type = 'image/x-icon';
    favicon.href = CUSTOM_FAVICON_URL;
    document.head.appendChild(favicon);
  }

  function keepReplaced() {
    replaceZhihuFavicon();

    // document_start 阶段可能还没有 <head>，需要等它出现后再监听图标变化。
    if (!document.head) {
      if (headObserver) return;

      headObserver = new MutationObserver(() => {
        if (document.head) {
          headObserver.disconnect();
          headObserver = null;
          keepReplaced();
        }
      });
      headObserver.observe(document.documentElement, { childList: true });
      return;
    }

    if (faviconObserver) return;

    // 知乎 SPA 导航后可能重写 head 链接，因此发现图标被改回时要恢复。
    faviconObserver = new MutationObserver(() => {
      const currentIcon = document.querySelector('link[rel~="icon"], link[rel="shortcut icon"]');
      if (!currentIcon || currentIcon.href !== CUSTOM_FAVICON_URL) {
        replaceZhihuFavicon();
      }
    });
    faviconObserver.observe(document.head, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['href', 'rel']
    });
  }

  window.VSZhihuFavicon = {
    keepReplaced,
    replace: replaceZhihuFavicon
  };
})();
