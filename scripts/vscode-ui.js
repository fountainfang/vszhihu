function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#039;');
}

window.VSZhihuUI = {
  theme: 'dark-plus',
  codeViewMode: 'code', // 'code' or 'rich'
  bossKeyActive: false,
  activeTab: 'main',
  fetchApi: function(url) {
    // 1. Convert to relative URL ONLY if origins match, to avoid cross-subdomain 404s (e.g. zhuanlan vs www)
    let fetchUrl = url;
    try {
      const parsedUrl = new URL(url, window.location.href);
      if (parsedUrl.origin === window.location.origin) {
        fetchUrl = parsedUrl.pathname + parsedUrl.search;
      }
    } catch(e) {}

    return fetch(fetchUrl, { headers: { 'Accept': 'application/json' }, credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error('HTTP status ' + res.status);
        return res.json();
      })
      .catch(err => {
        // 2. Fallback to Service Worker proxy fetch (bypasses CORS & subdomain restrictions)
        return new Promise((resolve, reject) => {
          try {
            chrome.runtime.sendMessage({ action: 'fetchUrl', url: url }, (res) => {
              if (chrome.runtime.lastError || !res || !res.success) {
                reject(new Error(res?.error || chrome.runtime.lastError?.message || 'Fetch failed'));
              } else {
                resolve(res.data);
              }
            });
          } catch(e) {
            reject(e);
          }
        });
      });
  },

  fetchCommentThread: function(category, targetId, offset = 0) {
    let urls = [];
    if (category === 'articles' || category === 'posts') {
      urls = [
        `https://zhuanlan.zhihu.com/api/posts/${targetId}/root_comments?limit=20&offset=${offset}&order=normal`,
        `https://www.zhihu.com/api/v4/comment_v5/articles/${targetId}/root_comments?limit=20&offset=${offset}&order=normal`,
        `https://www.zhihu.com/api/v4/comment_v5/answers/${targetId}/root_comments?limit=20&offset=${offset}&order=normal`,
        `https://www.zhihu.com/api/v4/comment_v5/posts/${targetId}/root_comments?limit=20&offset=${offset}&order=normal`,
        `https://www.zhihu.com/api/v4/articles/${targetId}/root_comments?limit=20&offset=${offset}&order=normal`
      ];
    } else {
      urls = [
        `https://www.zhihu.com/api/v4/comment_v5/answers/${targetId}/root_comments?limit=20&offset=${offset}&order=normal`,
        `https://www.zhihu.com/api/v4/answers/${targetId}/root_comments?limit=20&offset=${offset}&order=normal`
      ];
    }

    const self = this;
    const tryNext = (index) => {
      if (index >= urls.length) {
        return Promise.reject(new Error('All comment API endpoints failed'));
      }
      return self.fetchApi(urls[index]).catch(() => {
        return tryNext(index + 1);
      });
    };

    return tryNext(0);
  },

  fetchSubCommentThread: function(commentId, offset = 0) {
    const urls = [
      `https://www.zhihu.com/api/v4/comment_v5/comments/${commentId}/child_comments?limit=20&offset=${offset}`,
      `https://www.zhihu.com/api/v4/comments/${commentId}/child_comments?limit=20&offset=${offset}`,
      `https://zhuanlan.zhihu.com/api/comments/${commentId}/child_comments?limit=20&offset=${offset}`
    ];
    const self = this;
    const tryNext = (index) => {
      if (index >= urls.length) {
        return Promise.reject(new Error('All sub-comment API endpoints failed'));
      }
      return self.fetchApi(urls[index]).catch(() => tryNext(index + 1));
    };
    return tryNext(0);
  },

  init: function(settings, parsedData) {
    this.theme = settings.theme || 'dark-plus';
    this.codeViewMode = settings.codeViewMode || 'code';
    this.customBossCode = settings.customBossCode || '';
    this.parsedData = parsedData;

    document.documentElement.classList.add('vsc-enabled');
    document.body.classList.add('vsc-enabled');
    document.documentElement.setAttribute('data-vsc-theme', this.theme);

    this.createBossScreen();
    this.createAppRoot();
    this.bindShortcuts();

    // Initialize Command Palette
    if (window.VSZhihuCommandPalette) {
      window.VSZhihuCommandPalette.init(this);
    }
  },

  createBossScreen: function() {
    let boss = document.getElementById('vsc-boss-screen');
    if (!boss) {
      if (!document.body) return;
      boss = document.createElement('div');
      boss.id = 'vsc-boss-screen';
      document.body.appendChild(boss);
    }

    const defaultCode = `
      <div style="color: #6a9955; margin-bottom: 12px;">// Copyright (c) Microsoft Corporation. All rights reserved.</div>
      <div style="color: #569cd6; font-weight: bold; margin-bottom: 8px;">#include &lt;iostream&gt;</div>
      <div style="color: #569cd6; font-weight: bold; margin-bottom: 8px;">#include &lt;vector&gt;</div>
      <div style="color: #569cd6; font-weight: bold; margin-bottom: 16px;">#include &lt;memory&gt;</div>
      
      <div style="color: #569cd6;">template <span style="color: #d4d4d4;">&lt;</span>typename T<span style="color: #d4d4d4;">&gt;</span></div>
      <div style="color: #569cd6;">class <span style="color: #4ec9b0;">ThreadPoolExecutor</span> <span style="color: #d4d4d4;">{</span></div>
      <div style="padding-left: 20px;">
        <span style="color: #569cd6;">private:</span><br>
        &nbsp;&nbsp;<span style="color: #4ec9b0;">std::vector</span>&lt;<span style="color: #4ec9b0;">std::thread</span>&gt; <span style="color: #9cdcfe;">workers</span>;<br>
        &nbsp;&nbsp;<span style="color: #4ec9b0;">std::queue</span>&lt;<span style="color: #4ec9b0;">std::function</span>&lt;<span style="color: #569cd6;">void</span>()&gt;&gt; <span style="color: #9cdcfe;">tasks</span>;<br>
        &nbsp;&nbsp;<span style="color: #4ec9b0;">std::mutex</span> <span style="color: #9cdcfe;">queue_mutex</span>;<br>
        &nbsp;&nbsp;<span style="color: #4ec9b0;">std::condition_variable</span> <span style="color: #9cdcfe;">cv</span>;<br>
        &nbsp;&nbsp;<span style="color: #569cd6;">bool</span> <span style="color: #9cdcfe;">stop_flag</span> = <span style="color: #569cd6;">false</span>;<br><br>
        <span style="color: #569cd6;">public:</span><br>
        &nbsp;&nbsp;<span style="color: #dcdcaa;">ThreadPoolExecutor</span>(<span style="color: #4ec9b0;">size_t</span> <span style="color: #9cdcfe;">threads</span>) {<br>
        &nbsp;&nbsp;&nbsp;&nbsp;<span style="color: #c586c0;">for</span> (<span style="color: #4ec9b0;">size_t</span> i = 0; i &lt; threads; ++i) {<br>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="color: #9cdcfe;">workers</span>.<span style="color: #dcdcaa;">emplace_back</span>([<span style="color: #569cd6;">this</span>] {<br>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="color: #c586c0;">while</span> (<span style="color: #569cd6;">true</span>) {<br>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="color: #4ec9b0;">std::function</span>&lt;<span style="color: #569cd6;">void</span>()&gt; <span style="color: #9cdcfe;">task</span>;<br>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{<br>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="color: #4ec9b0;">std::unique_lock</span>&lt;<span style="color: #4ec9b0;">std::mutex</span>&gt; lock(<span style="color: #569cd6;">this</span>-&gt;queue_mutex);<br>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="color: #569cd6;">this</span>-&gt;cv.wait(lock, [<span style="color: #569cd6;">this</span>] { <span style="color: #c586c0;">return</span> <span style="color: #569cd6;">this</span>-&gt;stop_flag || !<span style="color: #569cd6;">this</span>-&gt;tasks.empty(); });<br>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="color: #c586c0;">if</span> (<span style="color: #569cd6;">this</span>-&gt;stop_flag && <span style="color: #569cd6;">this</span>-&gt;tasks.empty()) <span style="color: #c586c0;">return</span>;<br>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;task = std::move(<span style="color: #569cd6;">this</span>-&gt;tasks.front());<br>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="color: #569cd6;">this</span>-&gt;tasks.pop();<br>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;}<br>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;task();<br>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;}<br>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;});<br>
        &nbsp;&nbsp;&nbsp;&nbsp;}<br>
        &nbsp;&nbsp;}<br>
      </div>
      <div style="color: #569cd6;">};</div>
      <div style="margin-top: 20px; color: #6a9955;">// Press Alt+V to exit stealth mode.</div>
    `;

    if (this.customBossCode) {
      const escapedCustom = this.customBossCode.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
      boss.innerHTML = `<pre style="font-family: 'Fira Code', monospace; line-height: 1.6; color: var(--vsc-fg);">${escapedCustom}</pre><div style="margin-top: 20px; color: #6a9955;">// Press Alt+V to exit custom stealth mode.</div>`;
    } else {
      boss.innerHTML = defaultCode;
    }
  },

  createAppRoot: function() {
    let app = document.getElementById('vsc-app-root');
    const existingCodeView = document.getElementById('vsc-code-view');
    const savedScrollTop = existingCodeView ? existingCodeView.scrollTop : 0;

    if (!app) {
      if (!document.body) return;
      app = document.createElement('div');
      app.id = 'vsc-app-root';
      document.body.appendChild(app);
    }

    const filename = this.getFileName();
    const formattedCode = window.VSZhihuParser.formatAsTypeScript(this.parsedData);
    const lineCount = formattedCode.split('\n').length;

    app.innerHTML = `
      <!-- Left Activity Bar -->
      <div id="vsc-activity-bar">
        <div class="vsc-act-group">
          <div class="vsc-act-icon active" title="Explorer (Files)" id="vsc-act-explorer">
            <svg viewBox="0 0 24 24"><path d="M17.5 0h-9L7 1.5V3H4.5L3 4.5v15L4.5 21h12l1.5-1.5V18h3l1.5-1.5v-15L21 0h-3.5zM16 19.5H4.5v-15H7V15l1.5 1.5h7.5v3zm4.5-3H9V1.5h8.5V6H21.5v10.5z"/></svg>
          </div>
          <div class="vsc-act-icon" title="Search Zhihu (Cmd+Shift+P)" id="vsc-act-search">
            <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
          </div>
          <div class="vsc-act-icon" title="Hot List / Trends" id="vsc-act-hot">
            <svg viewBox="0 0 24 24"><path d="M13.5 1.5c0 0-3.5 3.5-3.5 7 0 2 1.5 3.5 3.5 3.5s3.5-1.5 3.5-3.5c0-3.5-3.5-7-3.5-7zM7.5 8.5C7.5 6.5 9 5 9 5s-3.5 3.5-3.5 7c0 3 2.5 5.5 5.5 5.5s5.5-2.5 5.5-5.5c0-1.5-.5-3-1.5-4 0 0 .5 1.5.5 2.5 0 2-1.5 3.5-3.5 3.5s-3.5-1.5-3.5-3.5z"/></svg>
            <span class="vsc-badge">HOT</span>
          </div>
        </div>

        <div class="vsc-act-group">
          <div class="vsc-act-icon" title="Stealth Mode / Boss Key (Alt+V)" id="vsc-act-boss">
            <svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
          </div>
          <div class="vsc-act-icon" title="Settings / Themes" id="vsc-act-settings">
            <svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
          </div>
        </div>
      </div>

      <!-- Sidebar Explorer Panel -->
      <div id="vsc-sidebar-panel">
        <div class="vsc-sidebar-header">
          <span>Explorer: Zhihu Workspace</span>
          <span>...</span>
        </div>
        <div class="vsc-sidebar-content">
          <div class="vsc-tree-section">
            <div class="vsc-tree-title">▼ Open Editors</div>
            <div class="vsc-tree-item active">
              <span class="vsc-file-icon ts">TS</span>
              <span>${filename}</span>
            </div>
          </div>

          <div class="vsc-tree-section">
            <div class="vsc-tree-title">▼ ZHIHU REPOSITORY</div>
            
            <div class="vsc-tree-item" id="vsc-item-recommend">
              <span class="vsc-file-icon ts">TS</span>
              <span>recommend.ts</span>
            </div>
            
            <div class="vsc-tree-item" id="vsc-item-following">
              <span class="vsc-file-icon ts">TS</span>
              <span>following.ts</span>
            </div>
            
            <div class="vsc-tree-item" id="vsc-item-hot">
              <span class="vsc-file-icon ts">TS</span>
              <span>hot_rank.ts</span>
            </div>

            <div class="vsc-tree-item" id="vsc-item-search">
              <span class="vsc-file-icon json">JSON</span>
              <span>search.json</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Editor Area -->
      <div id="vsc-main-editor">
        <!-- Tab Bar -->
        <div id="vsc-tab-bar">
          <div class="vsc-tab active">
            <span class="vsc-file-icon ts">TS</span>
            <span class="vsc-tab-title">${filename}</span>
            <span class="vsc-tab-close">×</span>
          </div>
        </div>

        <!-- Breadcrumbs -->
        <div id="vsc-breadcrumbs">
          <span class="vsc-bc-item">zhihu</span>
          <span class="vsc-bc-sep">&gt;</span>
          <span class="vsc-bc-item">${this.parsedData.type}</span>
          <span class="vsc-bc-sep">&gt;</span>
          <span class="vsc-bc-item" style="color: var(--vsc-fg); font-weight: 500;">${filename}</span>
        </div>

        <!-- Code View -->
        <div id="vsc-code-view">
          <div id="vsc-gutter">
            ${Array.from({ length: lineCount }, (_, i) => `<div class="vsc-line-num">${i + 1}</div>`).join('')}
          </div>
          <div id="vsc-canvas">${formattedCode}</div>
        </div>
      </div>

      <!-- Bottom Status Bar -->
      <div id="vsc-statusbar">
        <div class="vsc-sb-section">
          <div class="vsc-sb-item" id="vsc-sb-branch">
            <span>🌿 main*</span>
          </div>
          <div class="vsc-sb-item">
            <span>⊗ 0  ⚠ 0</span>
          </div>
        </div>

        <div class="vsc-sb-section">
          <div class="vsc-sb-item" id="vsc-sb-cmd" title="Open Command Palette (Cmd+Shift+P)">
            <span>Cmd+Shift+P (Palette)</span>
          </div>
          <div class="vsc-sb-item">
            <span>Ln 1, Col 1</span>
          </div>
          <div class="vsc-sb-item">
            <span>UTF-8</span>
          </div>
          <div class="vsc-sb-item">
            <span>TypeScript</span>
          </div>
          <div class="vsc-sb-item" id="vsc-sb-sponsor" style="background: rgba(255, 65, 108, 0.2); font-weight: 600;" title="支持作者 / 爱发电">
            <span>☕ Sponsor Pro</span>
          </div>
          <div class="vsc-sb-item" id="vsc-sb-boss">
            <span>🙈 Boss Key (Alt+V)</span>
          </div>
        </div>
      </div>
    `;

    this.bindClickEvents();

    // Restore scroll position after re-rendering
    const newCodeView = document.getElementById('vsc-code-view');
    if (newCodeView) {
      if (savedScrollTop > 0) {
        newCodeView.scrollTop = savedScrollTop;
      }
      this.bindInfiniteScroll(newCodeView);
    }
  },

  bindInfiniteScroll: function(codeViewEl) {
    let isLoading = false;
    codeViewEl.addEventListener('scroll', () => {
      if (codeViewEl.scrollTop + codeViewEl.clientHeight >= codeViewEl.scrollHeight - 600) {
        if (!isLoading) {
          isLoading = true;

          // Incrementally scroll native window to trigger React pagination listeners
          const currentScroll = window.scrollY || window.pageYOffset || 0;
          const maxScroll = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, 6000);
          const nextScroll = currentScroll + 1200;

          window.scrollTo(0, Math.min(nextScroll, maxScroll));

          // Dispatch scroll events to all candidate native containers
          const targets = [
            window,
            document,
            document.documentElement,
            document.body,
            document.querySelector('.Question-mainColumn'),
            document.querySelector('.Question-main'),
            document.querySelector('.QuestionAnswers-answers'),
            document.querySelector('.List')
          ].filter(Boolean);

          targets.forEach(target => {
            try {
              target.dispatchEvent(new Event('scroll', { bubbles: true, cancelable: true }));
            } catch(e) {}
          });

          setTimeout(() => {
            isLoading = false;
          }, 350);
        }
      }
    });
  },

  getFileName: function() {
    const title = this.parsedData.title || 'index';
    const cleanTitle = title.replace(/[^\u4e00-\u9fa5a-zA-Z0-9_-]/g, '_').substring(0, 20);
    return `${cleanTitle || 'zhihu_feed'}.ts`;
  },

  setTheme: function(themeName) {
    this.theme = themeName;
    document.documentElement.setAttribute('data-vsc-theme', themeName);
    try { localStorage.setItem('vsc_theme', themeName); } catch(e) {}
    if (chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ action: 'saveSetting', key: 'theme', value: themeName });
    }
  },

  toggleBossKey: function() {
    this.bossKeyActive = !this.bossKeyActive;
    let boss = document.getElementById('vsc-boss-screen');
    if (!boss) {
      this.createBossScreen();
      boss = document.getElementById('vsc-boss-screen');
    }
    const app = document.getElementById('vsc-app-root');

    if (this.bossKeyActive) {
      if (boss) boss.style.setProperty('display', 'block', 'important');
      if (app) app.style.setProperty('display', 'none', 'important');
    } else {
      if (boss) boss.style.setProperty('display', 'none', 'important');
      if (app) app.style.setProperty('display', 'grid', 'important');
    }
  },

  toggleCodeViewMode: function() {
    this.codeViewMode = this.codeViewMode === 'code' ? 'rich' : 'code';
    alert(`Code View Mode switched to: ${this.codeViewMode.toUpperCase()}`);
  },

  bindClickEvents: function() {
    if (this._eventsBound) return;
    this._eventsBound = true;

    const self = this;
    document.addEventListener('click', (e) => {
      // 1. Comment Trigger / Comment Link
      const commentBtn = e.target.closest('.vsc-btn-comment-trigger, .vsc-code-comment-link:not(.vsc-btn-expand-sub)');
      if (commentBtn) {
        e.preventDefault();
        e.stopPropagation();

        const idx = parseInt(commentBtn.getAttribute('data-answer-idx'), 10) || 0;
        const btnAnswerId = commentBtn.getAttribute('data-answer-id');
        const targetAns = self.parsedData?.answers?.[idx];
        let answerId = btnAnswerId || targetAns?.answerId || '';

        const mainCol = document.querySelector('.Question-mainColumn, .Question-main') || document;
        const cards = Array.from(mainCol.querySelectorAll('.List-item, .AnswerCard, .AnswerItem, .ContentItem, .Post-Main, .ArticleItem, .Post-RichTextContainer, article'))
                          .filter(c => !c.closest('.QuestionHeader'));
        const card = cards[idx] || document.querySelector('.AnswerCard, .AnswerItem, .ContentItem, .Post-Main, .ArticleItem, .Post-RichTextContainer, article');

        if (!answerId && card && window.VSZhihuParser) {
          answerId = window.VSZhihuParser.extractAnswerId(card);
        }

        if (!answerId && window.location.pathname.includes('/answer/')) {
          const pathMatch = window.location.pathname.match(/answer\/(\d{8,20})/);
          if (pathMatch) answerId = pathMatch[1];
        }
        if (!answerId && window.location.pathname.includes('/p/')) {
          const pathMatch = window.location.pathname.match(/p\/(\d{8,20})/);
          if (pathMatch) answerId = pathMatch[1];
        }

        self.openCommentTerminal(idx, answerId);

        const searchContainer = card || document;
        const btns = Array.from(searchContainer.querySelectorAll('button, .Button, [role="button"], a[class*="comment"], div[class*="comment"]'));
        const nativeCommentBtn = btns.find(b => {
          const txt = (b.innerText || b.textContent || '').trim();
          return txt.includes('评论') || txt.includes('条评论');
        }) || document.querySelector('.Button--comment, [class*="CommentButton"], [class*="comment-button"]');

        if (nativeCommentBtn) {
          try {
            nativeCommentBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
            nativeCommentBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
            nativeCommentBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
            if (nativeCommentBtn.click) nativeCommentBtn.click();
          } catch(err) {}
        }
        return;
      }

      // 2. Expand sub-comments / child replies
      const expandSubBtn = e.target.closest('.vsc-btn-expand-sub');
      if (expandSubBtn) {
        e.preventDefault();
        e.stopPropagation();

        const commentId = expandSubBtn.getAttribute('data-comment-id');
        const offset = parseInt(expandSubBtn.getAttribute('data-offset'), 10) || 0;
        const rootAuthor = expandSubBtn.getAttribute('data-root-author') || '原作者';

        expandSubBtn.innerText = '⏳ 正在加载回复...';

        self.fetchSubCommentThread(commentId, offset)
          .then(subJson => {
            if (subJson.data && subJson.data.length > 0) {
              const listEl = document.getElementById(`vsc-sub-list-${commentId}`);
              if (listEl) {
                let subHtml = '';
                subJson.data.forEach((sub) => {
                  const subAuthor = sub.author?.member?.name || '回复者';
                  const replyTo = sub.reply_to_author?.member?.name || rootAuthor;
                  const subContent = sub.content ? sub.content.replace(/<[^>]+>/g, '') : '';
                  const subLikes = sub.vote_count || 0;

                  subHtml += `  <div class="vsc-comment-sub">`;
                  subHtml += `    <div style="color: var(--vsc-syn-keyword); font-weight: 500;">└─ @${subAuthor} <span style="color: var(--vsc-fg-muted);">回复</span> @${replyTo} <span style="color: var(--vsc-syn-number); float: right;">▲ ${subLikes}</span></div>`;
                  subHtml += `    <div>${subContent}</div>`;
                  subHtml += `  </div>`;
                });
                listEl.insertAdjacentHTML('beforeend', subHtml);
              }

              const isEnd = subJson.paging?.is_end;
              const nextOffset = offset + subJson.data.length;
              const totalCount = subJson.paging?.totals || 0;
              const remaining = totalCount - nextOffset;

              if (!isEnd && remaining > 0) {
                expandSubBtn.setAttribute('data-offset', nextOffset);
                expandSubBtn.innerText = `↳ 展开其他 ${remaining} 条回复...`;
              } else {
                expandSubBtn.remove();
              }
            } else {
              expandSubBtn.remove();
            }
          })
          .catch(() => {
            expandSubBtn.innerText = '⚠️ 加载失败，点击重试';
          });
        return;
      }

      // 3. Load more root comments
      const moreRootBtn = e.target.closest('.vsc-btn-more-root-comments');
      if (moreRootBtn) {
        e.preventDefault();
        e.stopPropagation();

        const answerId = moreRootBtn.getAttribute('data-answer-id');
        const apiCategory = moreRootBtn.getAttribute('data-category') || 'answers';
        const offset = parseInt(moreRootBtn.getAttribute('data-offset'), 10) || 0;

        moreRootBtn.innerText = '⏳ 正在加载更多评论...';
        moreRootBtn.disabled = true;

        self.fetchCommentThread(apiCategory, answerId, offset)
          .then(json => {
            moreRootBtn.disabled = false;
            if (json.data && json.data.length > 0) {
              const container = document.getElementById('vsc-term-comments-list');
              if (!container) return;

              let html = '';
              json.data.forEach((item) => {
                const author = item.author?.member?.name || '匿名用户';
                const content = item.content ? item.content.replace(/<[^>]+>/g, '') : '';
                const likes = item.vote_count || 0;
                const time = item.created_time ? new Date(item.created_time * 1000).toLocaleString() : '';
                const childCount = item.child_comment_count || 0;
                const initialChildren = item.child_comments || [];

                html += `<div class="vsc-comment-card" id="vsc-cmt-${item.id}">`;
                html += `  <div class="vsc-comment-header">`;
                html += `    <span>┌─ @${author} <span style="color: var(--vsc-fg-muted); font-size: 11px;">(${time})</span></span>`;
                html += `    <span style="color: var(--vsc-syn-number);">▲ ${likes} 赞</span>`;
                html += `  </div>`;
                html += `  <div style="padding-left: 12px; color: var(--vsc-fg);">${content}</div>`;
                html += `  <div class="vsc-comment-sub-list" id="vsc-sub-list-${item.id}">`;

                initialChildren.forEach((sub) => {
                  const subAuthor = sub.author?.member?.name || '回复者';
                  const replyTo = sub.reply_to_author?.member?.name || author;
                  const subContent = sub.content ? sub.content.replace(/<[^>]+>/g, '') : '';
                  const subLikes = sub.vote_count || 0;

                  html += `  <div class="vsc-comment-sub">`;
                  html += `    <div style="color: var(--vsc-syn-keyword); font-weight: 500;">└─ @${subAuthor} <span style="color: var(--vsc-fg-muted);">回复</span> @${replyTo} <span style="color: var(--vsc-syn-number); float: right;">▲ ${subLikes}</span></div>`;
                  html += `    <div>${subContent}</div>`;
                  html += `  </div>`;
                });

                html += `  </div>`;

                const remainingSubCount = childCount - initialChildren.length;
                if (remainingSubCount > 0) {
                  html += `  <div style="padding-left: 12px; margin-top: 6px;">`;
                  html += `    <span class="vsc-code-comment-link vsc-btn-expand-sub" data-comment-id="${item.id}" data-offset="${initialChildren.length}" data-root-author="${escapeHtml(author)}">`;
                  html += `      ↳ 展开其他 ${remainingSubCount} 条回复...`;
                  html += `    </span>`;
                  html += `  </div>`;
                }

                html += `</div>`;
              });

              container.insertAdjacentHTML('beforeend', html);

              const nextOffset = offset + json.data.length;
              const totals = json.paging?.totals || 0;
              const isEnd = json.paging?.is_end;

              if (!isEnd && (totals === 0 || nextOffset < totals)) {
                moreRootBtn.setAttribute('data-offset', nextOffset);
                moreRootBtn.innerText = `📥 加载更多评论 (已显示 ${nextOffset} / 共 ${totals || '多'} 条)`;
              } else {
                document.getElementById('vsc-term-load-more-box')?.remove();
              }
            } else {
              document.getElementById('vsc-term-load-more-box')?.remove();
            }
          })
          .catch(() => {
            moreRootBtn.disabled = false;
            moreRootBtn.innerText = '⚠️ 加载失败，点击重试';
          });

        return;
      }

      // 4. View All Answers Button
      const viewAllBtn = e.target.closest('.vsc-btn-view-all');
      if (viewAllBtn) {
        e.preventDefault();
        e.stopPropagation();
        const url = viewAllBtn.getAttribute('data-question-url') || viewAllBtn.getAttribute('href');
        const nativeBtn = document.querySelector('.ViewAll, .QuestionMainAction, [class*="ViewAll"]');
        if (nativeBtn) {
          try { nativeBtn.click(); } catch(err) {}
        }
        if (url) {
          const targetUrl = url.startsWith('http') ? url : `https://www.zhihu.com${url}`;
          window.location.href = targetUrl;
        }
        return;
      }

      // 5. Activity bar search / command palette
      if (e.target.closest('#vsc-act-search, #vsc-sb-cmd')) {
        if (window.VSZhihuCommandPalette) window.VSZhihuCommandPalette.open();
        return;
      }

      // 6. Boss key triggers
      if (e.target.closest('#vsc-act-boss, #vsc-sb-boss')) {
        self.toggleBossKey();
        return;
      }

      // 7. Sponsor button
      if (e.target.closest('#vsc-sb-sponsor')) {
        window.open('https://ifdian.net/a/7675a', '_blank');
        return;
      }

      // 8. Navigation items
      if (e.target.closest('#vsc-act-hot, #vsc-item-hot')) {
        window.location.href = 'https://www.zhihu.com/hot';
        return;
      }

      if (e.target.closest('#vsc-item-recommend')) {
        window.location.href = 'https://www.zhihu.com/';
        return;
      }

      if (e.target.closest('#vsc-item-following')) {
        window.location.href = 'https://www.zhihu.com/follow';
        return;
      }

      if (e.target.closest('#vsc-item-search')) {
        const query = prompt('Search Zhihu:');
        if (query) window.location.href = `https://www.zhihu.com/search?type=content&q=${encodeURIComponent(query)}`;
        return;
      }

      // 9. Terminal Panel close / clear
      if (e.target.closest('#vsc-panel-close')) {
        document.getElementById('vsc-bottom-panel')?.remove();
        return;
      }

      if (e.target.closest('#vsc-panel-clear')) {
        const body = document.getElementById('vsc-term-comments-list');
        if (body) body.innerHTML = '';
        return;
      }
    });
  },

  openCommentTerminal: function(answerIdx, answerId) {
    let panel = document.getElementById('vsc-bottom-panel');
    const editor = document.getElementById('vsc-main-editor');
    if (!editor) return;

    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'vsc-bottom-panel';
      editor.appendChild(panel);
    }
    panel.style.display = 'flex';

    const targetAns = this.parsedData?.answers?.[answerIdx];
    const targetAnswerId = answerId || targetAns?.answerId || '';
    const authorName = targetAns?.author || '知乎用户';

    const isArticle = this.parsedData?.type === 'article' || window.location.pathname.includes('/p/');
    const apiCategory = isArticle ? 'articles' : 'answers';
    const statusCategory = isArticle ? 'article' : 'answer';

    panel.innerHTML = `
      <div class="vsc-panel-header">
        <div class="vsc-panel-tabs">
          <span class="vsc-panel-tab">PROBLEMS 0</span>
          <span class="vsc-panel-tab">OUTPUT</span>
          <span class="vsc-panel-tab">TERMINAL</span>
          <span class="vsc-panel-tab active">COMMENTS (${isArticle ? 'Article' : 'Answer'} #${answerIdx + 1} - @${authorName})</span>
        </div>
        <div class="vsc-panel-actions">
          <span id="vsc-panel-clear" title="Clear Console">⊘</span>
          <span id="vsc-panel-close" title="Close Panel (Esc)">×</span>
        </div>
      </div>
      <div class="vsc-panel-body" id="vsc-panel-body">
        <div><span class="vsc-term-prompt">bash-5.2$</span> zhihu-cli comments --target ${statusCategory}/${targetAnswerId || 'N/A'} --author "@${authorName}"</div>
        <div style="color: var(--vsc-fg-muted); margin: 6px 0;">[Zhihu API] Connecting to live comment stream for ${statusCategory}/${targetAnswerId || 'N/A'}...</div>
        <div id="vsc-term-comments">
          <div id="vsc-term-comments-list">Fetching live comment thread...</div>
        </div>
      </div>
    `;

    if (targetAnswerId && !isArticle) {
      this.fetchCommentThread(apiCategory, targetAnswerId, 0)
        .then(json => {
          const container = document.getElementById('vsc-term-comments-list');
          const termBox = document.getElementById('vsc-term-comments');
          if (!container) return;

          if (!json.data || json.data.length === 0) {
            container.innerHTML = `<div style="color: var(--vsc-syn-string); font-style: italic;">// 该回答/文章暂无评论或已关闭评论区</div>`;
            return;
          }

          let html = `<div style="color: var(--vsc-syn-comment); margin-bottom: 12px;">// Successfully loaded ${json.data.length} root comment threads (Total: ${json.paging?.totals || json.data.length})</div>`;
          
          json.data.forEach((item) => {
            const author = item.author?.member?.name || item.author?.name || '匿名用户';
            const content = item.content ? item.content.replace(/<[^>]+>/g, '') : '';
            const likes = item.vote_count || item.likes_count || item.like_count || 0;
            const time = item.created_time ? new Date(item.created_time * 1000).toLocaleString() : '';
            const childCount = item.child_comment_count || item.child_comments_count || 0;
            const initialChildren = item.child_comments || [];

            html += `<div class="vsc-comment-card" id="vsc-cmt-${item.id}">`;
            html += `  <div class="vsc-comment-header">`;
            html += `    <span>┌─ @${author} <span style="color: var(--vsc-fg-muted); font-size: 11px;">(${time})</span></span>`;
            html += `    <span style="color: var(--vsc-syn-number);">▲ ${likes} 赞</span>`;
            html += `  </div>`;
            html += `  <div style="padding-left: 12px; color: var(--vsc-fg);">${content}</div>`;
            html += `  <div class="vsc-comment-sub-list" id="vsc-sub-list-${item.id}">`;

            initialChildren.forEach((sub) => {
              const subAuthor = sub.author?.member?.name || sub.author?.name || '回复者';
              const replyTo = sub.reply_to_author?.member?.name || sub.reply_to_author?.name || author;
              const subContent = sub.content ? sub.content.replace(/<[^>]+>/g, '') : '';
              const subLikes = sub.vote_count || sub.likes_count || sub.like_count || 0;

              html += `  <div class="vsc-comment-sub">`;
              html += `    <div style="color: var(--vsc-syn-keyword); font-weight: 500;">└─ @${subAuthor} <span style="color: var(--vsc-fg-muted);">回复</span> @${replyTo} <span style="color: var(--vsc-syn-number); float: right;">▲ ${subLikes}</span></div>`;
              html += `    <div>${subContent}</div>`;
              html += `  </div>`;
            });

            html += `  </div>`;

            const remainingSubCount = childCount - initialChildren.length;
            if (remainingSubCount > 0) {
              html += `  <div style="padding-left: 12px; margin-top: 6px;">`;
              html += `    <span class="vsc-code-comment-link vsc-btn-expand-sub" data-comment-id="${item.id}" data-offset="${initialChildren.length}" data-root-author="${escapeHtml(author)}">`;
              html += `      ↳ 展开其他 ${remainingSubCount} 条回复...`;
              html += `    </span>`;
              html += `  </div>`;
            }

            html += `</div>`;
          });
          container.innerHTML = html;

          // Render Load More Root Comments button if pagination is not ended
          if (!json.paging?.is_end && json.data.length >= 20) {
            const nextOffset = json.data.length;
            const totals = json.paging?.totals || 0;
            const moreHtml = `
              <div class="vsc-term-load-more" id="vsc-term-load-more-box">
                <button class="vsc-btn-action vsc-btn-more-root-comments" data-answer-id="${targetAnswerId}" data-category="${apiCategory}" data-offset="${nextOffset}">
                  📥 加载更多评论 (已显示 ${nextOffset} / 共 ${totals || '多'} 条)
                </button>
              </div>
            `;
            termBox?.insertAdjacentHTML('beforeend', moreHtml);
          }
        })
        .catch(() => {
          this.renderFallbackDomComments(answerIdx);
        });
    } else {
      this.renderFallbackDomComments(answerIdx);
    }
  },

  renderFallbackDomComments: function(answerIdx, retryCount = 0) {
    const container = document.getElementById('vsc-term-comments');
    if (!container) return;

    const targetAns = this.parsedData?.answers?.[answerIdx];
    let comments = (targetAns && targetAns.comments && targetAns.comments.length > 0) ? targetAns.comments : [];

    // If initial parse had no comments, dynamically extract from current DOM tree
    if (comments.length === 0) {
      const commentNodes = Array.from(document.querySelectorAll(
        '.NestComment, .CommentItemV2, .CommentItem, ' +
        '[class*="NestComment"], [class*="CommentItem"], [class*="commentItem"], ' +
        '.Comments-container [role="listitem"], .CommentsV2 [role="listitem"]'
      ));

      const topComments = commentNodes.filter(node => 
        !node.parentElement || !node.parentElement.closest('.NestComment, .CommentItemV2, .CommentItem, [class*="NestComment"], [class*="CommentItem"], [class*="replyList"], [class*="subList"]')
      );
      const domComments = [];

      topComments.forEach((cNode, cIdx) => {
        const cAuthorEl = cNode.querySelector('.UserLink-link, .CommentItem-author, .CommentItemV2-author, a[href*="/people/"], .AuthorInfo-name, [class*="UserLink"], [class*="author"]');
        const cAuthor = cAuthorEl ? cAuthorEl.innerText.trim() : '知乎用户';
        
        const cTextEl = cNode.querySelector('.CommentItem-content, .CommentItemV2-content, .CommentItem-text, .RichText, [class*="content"], [class*="text"]');
        const cText = cTextEl ? cTextEl.innerText.trim() : '';

        const cLikeEl = cNode.querySelector('.Button--like, .CommentItem-likeCount, [class*="like"], [class*="vote"]');
        const cLikes = cLikeEl ? cLikeEl.innerText.replace(/[^\d]/g, '').trim() || '0' : '0';

        const replyNodes = cNode.querySelectorAll(
          '.NestComment-children [class*="CommentItem"], .CommentItem-reply, ' +
          '.CommentItemV2-replyList [class*="CommentItemV2"], [class*="replyList"] [class*="CommentItem"], ' +
          '[class*="children"] [class*="CommentItem"], [class*="subList"] [class*="CommentItem"]'
        );
        const replies = [];

        replyNodes.forEach((rNode, rIdx) => {
          const rAuthorEl = rNode.querySelector('.UserLink-link, .CommentItem-author, .CommentItemV2-author, a[href*="/people/"], [class*="UserLink"], [class*="author"]');
          const rAuthor = rAuthorEl ? rAuthorEl.innerText.trim() : '回复者';

          const rTextEl = rNode.querySelector('.CommentItem-content, .CommentItemV2-content, .RichText, [class*="content"], [class*="text"]');
          const rText = rTextEl ? rTextEl.innerText.trim() : '';

          const rLikeEl = rNode.querySelector('.Button--like, [class*="like"], [class*="vote"]');
          const rLikes = rLikeEl ? rLikeEl.innerText.replace(/[^\d]/g, '').trim() || '0' : '0';

          if (rText && rText !== cText) {
            replies.push({ author: rAuthor, text: rText, likes: rLikes });
          }
        });

        if (cText) {
          domComments.push({ author: cAuthor, text: cText, likes: cLikes, replies: replies });
        }
      });

      if (domComments.length > 0) {
        comments = domComments;
      }
    }

    if (comments.length > 0) {
      let html = `<div style="color: var(--vsc-syn-comment);">// Loaded ${comments.length} comments from DOM tree</div>`;
      comments.forEach(cmt => {
        html += `<div class="vsc-comment-card">`;
        html += `  <div class="vsc-comment-header"><span>@${cmt.author}</span><span>▲ ${cmt.likes || 0}</span></div>`;
        html += `  <div style="padding-left: 12px;">${cmt.text}</div>`;
        if (cmt.replies && cmt.replies.length > 0) {
          cmt.replies.forEach(r => {
            html += `<div class="vsc-comment-sub"><div>@${r.author}: ${r.text}</div></div>`;
          });
        }
        html += `</div>`;
      });
      container.innerHTML = html;
    } else {
      container.innerHTML = `<div style="color: var(--vsc-syn-string); font-style: italic;">// 正在唤醒知乎原生评论组件... (${retryCount + 1}/4)</div>`;
      if (retryCount < 3) {
        setTimeout(() => {
          this.renderFallbackDomComments(answerIdx, retryCount + 1);
        }, 800 * (retryCount + 1));
      } else {
        container.innerHTML = `<div style="color: var(--vsc-syn-string); font-style: italic;">// 该文章/回答暂无评论或处于关闭状态。若包含评论，请点击界面原生评论按钮展开。</div>`;
      }
    }
  },

  bindShortcuts: function() {
    window.addEventListener('keydown', (e) => {
      // Alt+V or Option+V for Stealth Boss Key
      if (e.altKey && (e.key === 'v' || e.key === 'V' || e.key === '女')) {
        e.preventDefault();
        this.toggleBossKey();
      }
    });
  }
};
