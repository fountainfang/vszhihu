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
    } else {
      document.documentElement.classList.add('vsc-disabled');
    }
  } catch(e) {}
})();
