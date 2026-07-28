/**
 * VSCode Zhihu - Main UI Controller
 * Builds and renders the full VS Code application environment over Zhihu pages.
 */

window.VSZhihuUI = {
  theme: 'dark-plus',
  codeViewMode: 'code', // 'code' or 'rich'
  bossKeyActive: false,
  activeTab: 'main',
  tabs: [],

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
      if (codeViewEl.scrollTop + codeViewEl.clientHeight >= codeViewEl.scrollHeight - 400) {
        if (!isLoading) {
          isLoading = true;
          // Scroll native document to bottom
          const scrollH = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
          window.scrollTo(0, scrollH);
          
          // Multi-target scroll event dispatching for React pagination listeners
          const targets = [window, document, document.documentElement, document.body, document.querySelector('.Question-mainColumn'), document.querySelector('.Question-main')].filter(Boolean);
          targets.forEach(target => {
            try {
              target.dispatchEvent(new Event('scroll', { bubbles: true }));
            } catch(e) {}
          });

          setTimeout(() => {
            isLoading = false;
          }, 600);
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
    document.getElementById('vsc-act-search')?.addEventListener('click', () => {
      if (window.VSZhihuCommandPalette) window.VSZhihuCommandPalette.open();
    });

    document.getElementById('vsc-act-boss')?.addEventListener('click', () => this.toggleBossKey());
    document.getElementById('vsc-sb-boss')?.addEventListener('click', () => this.toggleBossKey());
    document.getElementById('vsc-sb-sponsor')?.addEventListener('click', () => window.open('https://ifdian.net/a/7675a', '_blank'));

    document.getElementById('vsc-sb-cmd')?.addEventListener('click', () => {
      if (window.VSZhihuCommandPalette) window.VSZhihuCommandPalette.open();
    });

    document.getElementById('vsc-act-hot')?.addEventListener('click', () => {
      window.location.href = 'https://www.zhihu.com/hot';
    });

    document.getElementById('vsc-item-recommend')?.addEventListener('click', () => {
      window.location.href = 'https://www.zhihu.com/';
    });

    document.getElementById('vsc-item-following')?.addEventListener('click', () => {
      window.location.href = 'https://www.zhihu.com/follow';
    });

    document.getElementById('vsc-item-hot')?.addEventListener('click', () => {
      window.location.href = 'https://www.zhihu.com/hot';
    });

    document.getElementById('vsc-item-search')?.addEventListener('click', () => {
      const query = prompt('Search Zhihu:');
      if (query) window.location.href = `https://www.zhihu.com/search?type=content&q=${encodeURIComponent(query)}`;
    });

    const self = this;
    document.querySelectorAll('.vsc-btn-comment-trigger, .vsc-code-comment-link').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-answer-idx'), 10);
        const btnAnswerId = btn.getAttribute('data-answer-id');
        const targetAns = self.parsedData?.answers?.[idx];
        const answerId = btnAnswerId || targetAns?.answerId || '';

        self.openCommentTerminal(idx, answerId);

        const mainCol = document.querySelector('.Question-mainColumn, .Question-main') || document;
        const cards = Array.from(mainCol.querySelectorAll('.List-item, .AnswerCard, .AnswerItem, .ContentItem'))
                          .filter(c => !c.closest('.QuestionHeader'));
        const card = cards[idx] || document.querySelector('.AnswerCard, .AnswerItem, .ContentItem');

        if (card) {
          const btns = Array.from(card.querySelectorAll('button, .Button, [role="button"]'));
          const nativeCommentBtn = btns.find(b => b.innerText.includes('评论')) || card.querySelector('.Button--comment');
          if (nativeCommentBtn) {
            nativeCommentBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
            nativeCommentBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
            nativeCommentBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
            if (nativeCommentBtn.click) nativeCommentBtn.click();
          }
        }
      });
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

    const targetAns = this.parsedData?.answers?.[answerIdx];
    const targetAnswerId = answerId || targetAns?.answerId || '';
    const authorName = targetAns?.author || '知乎用户';

    const isArticle = this.parsedData?.type === 'article' || window.location.pathname.includes('/p/');
    const apiCategory = isArticle ? 'articles' : 'answers';
    const apiUrl = `https://www.zhihu.com/api/v4/${apiCategory}/${targetAnswerId}/root_comments?limit=20&offset=0&order=normal`;

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
        <div><span class="vsc-term-prompt">bash-5.2$</span> zhihu-cli comments --target ${apiCategory}/${targetAnswerId || 'N/A'} --author "@${authorName}"</div>
        <div style="color: var(--vsc-fg-muted); margin: 6px 0;">[Zhihu API] Connecting to ${apiUrl}...</div>
        <div id="vsc-term-comments">Fetching live comment thread...</div>
      </div>
    `;

    document.getElementById('vsc-panel-close')?.addEventListener('click', () => {
      panel.remove();
    });

    document.getElementById('vsc-panel-clear')?.addEventListener('click', () => {
      const body = document.getElementById('vsc-term-comments');
      if (body) body.innerHTML = '';
    });

    if (targetAnswerId) {
      fetch(apiUrl)
        .then(res => res.json())
        .then(json => {
          const container = document.getElementById('vsc-term-comments');
          if (!container) return;

          if (!json.data || json.data.length === 0) {
            container.innerHTML = `<div style="color: var(--vsc-syn-string); font-style: italic;">// 该回答暂无评论或已关闭评论区</div>`;
            return;
          }

          let html = `<div style="color: var(--vsc-syn-comment); margin-bottom: 12px;">// Successfully loaded ${json.data.length} root comment threads</div>`;
          
          json.data.forEach((item) => {
            const author = item.author?.member?.name || '匿名用户';
            const content = item.content ? item.content.replace(/<[^>]+>/g, '') : '';
            const likes = item.vote_count || 0;
            const time = item.created_time ? new Date(item.created_time * 1000).toLocaleString() : '';

            html += `<div class="vsc-comment-card">`;
            html += `  <div class="vsc-comment-header">`;
            html += `    <span>┌─ @${author} <span style="color: var(--vsc-fg-muted); font-size: 11px;">(${time})</span></span>`;
            html += `    <span style="color: var(--vsc-syn-number);">▲ ${likes} 赞</span>`;
            html += `  </div>`;
            html += `  <div style="padding-left: 12px; color: var(--vsc-fg);">${content}</div>`;

            if (item.child_comments && item.child_comments.length > 0) {
              item.child_comments.forEach((sub) => {
                const subAuthor = sub.author?.member?.name || '回复者';
                const replyTo = sub.reply_to_author?.member?.name || author;
                const subContent = sub.content ? sub.content.replace(/<[^>]+>/g, '') : '';
                const subLikes = sub.vote_count || 0;

                html += `  <div class="vsc-comment-sub">`;
                html += `    <div style="color: var(--vsc-syn-keyword); font-weight: 500;">└─ @${subAuthor} <span style="color: var(--vsc-fg-muted);">回复</span> @${replyTo} <span style="color: var(--vsc-syn-number); float: right;">▲ ${subLikes}</span></div>`;
                html += `    <div>${subContent}</div>`;
                html += `  </div>`;
              });
            }
            html += `</div>`;
          });
          container.innerHTML = html;
        })
        .catch(err => {
          console.error('[VSCode-Zhihu] API fetch error:', err);
          this.renderFallbackDomComments(answerIdx);
        });
    } else {
      this.renderFallbackDomComments(answerIdx);
    }
  },

  renderFallbackDomComments: function(answerIdx) {
    const container = document.getElementById('vsc-term-comments');
    if (!container) return;

    const targetAns = this.parsedData?.answers?.[answerIdx];
    if (targetAns && targetAns.comments && targetAns.comments.length > 0) {
      let html = `<div style="color: var(--vsc-syn-comment);">// Loaded ${targetAns.comments.length} comments from DOM tree</div>`;
      targetAns.comments.forEach(cmt => {
        html += `<div class="vsc-comment-card">`;
        html += `  <div class="vsc-comment-header"><span>@${cmt.author}</span><span>▲ ${cmt.likes}</span></div>`;
        html += `  <div>${cmt.text}</div>`;
        if (cmt.replies) {
          cmt.replies.forEach(r => {
            html += `<div class="vsc-comment-sub"><div>@${r.author}: ${r.text}</div></div>`;
          });
        }
        html += `</div>`;
      });
      container.innerHTML = html;
    } else {
      container.innerHTML = `<div style="color: var(--vsc-syn-string);">// 正在唤醒知乎接口... 请点击下方按钮或再次重试</div>`;
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
