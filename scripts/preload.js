/**
 * VSCode Zhihu - Preload Script
 * Runs synchronously at document_start to inject vsc-enabled class & data-vsc-theme BEFORE page paint.
 * Eliminates cross-page navigation flashing.
 */
(function() {
  try {
    const enabled = localStorage.getItem('vsc_enabled') !== 'false';
    if (enabled) {
      document.documentElement.classList.add('vsc-enabled');
      const cachedTheme = localStorage.getItem('vsc_theme') || 'dark-plus';
      document.documentElement.setAttribute('data-vsc-theme', cachedTheme);
      // Fast-path early favicon override
      const faviconUrl = 'https://code.visualstudio.com/assets/favicon.ico';
      const applyEarlyIcon = () => {
        let links = document.querySelectorAll("link[rel*='icon']");
        if (links.length > 0) {
          links.forEach(l => {
            l.rel = 'shortcut icon';
            l.type = 'image/png';
            l.href = faviconUrl;
          });
        } else {
          const link = document.createElement('link');
          link.rel = 'shortcut icon';
          link.type = 'image/png';
          link.href = faviconUrl;
          (document.head || document.documentElement)?.appendChild(link);
        }
      };

      if (document.head || document.documentElement) {
        applyEarlyIcon();
        try { document.title = 'recommend.ts - Zhihu Workspace - Visual Studio Code'; } catch(e) {}
      } else {
        document.addEventListener('DOMContentLoaded', () => {
          applyEarlyIcon();
          try { document.title = 'recommend.ts - Zhihu Workspace - Visual Studio Code'; } catch(e) {}
        });
      }
    } else {
      document.documentElement.classList.add('vsc-disabled');
    }
  } catch(e) {}
})();
