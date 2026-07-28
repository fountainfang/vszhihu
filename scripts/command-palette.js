/**
 * VSCode Zhihu - Command Palette Component
 * Provides Cmd+Shift+P / F1 Command Palette overlay.
 */

window.VSZhihuCommandPalette = {
  isOpen: false,
  selectedIndex: 0,
  commands: [],

  init: function(vscodeInstance) {
    this.vscode = vscodeInstance;
    this.bindGlobalKeys();
    this.createDom();
  },

  createDom: function() {
    if (document.getElementById('vsc-cmd-palette-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'vsc-cmd-palette-overlay';
    overlay.style.display = 'none';

    overlay.innerHTML = `
      <div id="vsc-cmd-palette">
        <input type="text" class="vsc-cmd-input" id="vsc-cmd-input" placeholder="Type a command or search Zhihu..." autocomplete="off">
        <div class="vsc-cmd-list" id="vsc-cmd-list"></div>
      </div>
    `;

    document.body.appendChild(overlay);

    const input = document.getElementById('vsc-cmd-input');
    input.addEventListener('input', () => this.renderList());
    input.addEventListener('keydown', (e) => this.handleKeyDown(e));

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.close();
      }
    });
  },

  getCommands: function() {
    return [
      {
        id: 'search',
        label: 'Zhihu: Search Questions & Topics...',
        shortcut: 'Cmd+F',
        action: () => {
          const q = prompt('Search Zhihu:');
          if (q) window.location.href = `https://www.zhihu.com/search?type=content&q=${encodeURIComponent(q)}`;
        }
      },
      {
        id: 'nav-recommend',
        label: 'Zhihu: Open Recommend Timeline (首页推荐)',
        shortcut: 'Alt+1',
        action: () => window.location.href = 'https://www.zhihu.com/'
      },
      {
        id: 'nav-follow',
        label: 'Zhihu: Open Following Feed (关注)',
        shortcut: 'Alt+2',
        action: () => window.location.href = 'https://www.zhihu.com/follow'
      },
      {
        id: 'nav-hot',
        label: 'Zhihu: Open Hot List (热榜)',
        shortcut: 'Alt+3',
        action: () => window.location.href = 'https://www.zhihu.com/hot'
      },
      {
        id: 'theme-dark',
        label: 'Preferences: Color Theme - VS Code Dark+',
        shortcut: '',
        action: () => this.vscode.setTheme('dark-plus')
      },
      {
        id: 'theme-onedark',
        label: 'Preferences: Color Theme - One Dark Pro',
        shortcut: '',
        action: () => this.vscode.setTheme('one-dark')
      },
      {
        id: 'theme-monokai',
        label: 'Preferences: Color Theme - Monokai',
        shortcut: '',
        action: () => this.vscode.setTheme('monokai')
      },
      {
        id: 'theme-light',
        label: 'Preferences: Color Theme - Light Modern',
        shortcut: '',
        action: () => this.vscode.setTheme('light-modern')
      },
      {
        id: 'toggle-view',
        label: 'View: Toggle Code View Mode (TypeScript Code vs Rich Text)',
        shortcut: 'Alt+R',
        action: () => this.vscode.toggleCodeViewMode()
      },
      {
        id: 'boss-key',
        label: 'Zhihu: Toggle Boss Key / Stealth Mode (摸鱼老板键)',
        shortcut: 'Alt+V',
        action: () => this.vscode.toggleBossKey()
      }
    ];
  },

  open: function() {
    this.commands = this.getCommands();
    this.selectedIndex = 0;
    this.isOpen = true;
    const overlay = document.getElementById('vsc-cmd-palette-overlay');
    const input = document.getElementById('vsc-cmd-input');

    overlay.style.display = 'flex';
    input.value = '';
    input.focus();
    this.renderList();
  },

  close: function() {
    this.isOpen = false;
    const overlay = document.getElementById('vsc-cmd-palette-overlay');
    if (overlay) overlay.style.display = 'none';
  },

  renderList: function() {
    const input = document.getElementById('vsc-cmd-input');
    const list = document.getElementById('vsc-cmd-list');
    const query = input.value.toLowerCase().trim();

    const filtered = this.commands.filter(c => c.label.toLowerCase().includes(query));
    if (this.selectedIndex >= filtered.length) this.selectedIndex = 0;

    list.innerHTML = '';
    filtered.forEach((cmd, idx) => {
      const item = document.createElement('div');
      item.className = `vsc-cmd-item ${idx === this.selectedIndex ? 'selected' : ''}`;
      item.innerHTML = `
        <span>${cmd.label}</span>
        ${cmd.shortcut ? `<span class="vsc-cmd-key">${cmd.shortcut}</span>` : ''}
      `;
      item.addEventListener('click', () => {
        this.close();
        cmd.action();
      });
      list.appendChild(item);
    });
  },

  handleKeyDown: function(e) {
    const input = document.getElementById('vsc-cmd-input');
    const query = input.value.toLowerCase().trim();
    const filtered = this.commands.filter(c => c.label.toLowerCase().includes(query));

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.selectedIndex = (this.selectedIndex + 1) % (filtered.length || 1);
      this.renderList();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.selectedIndex = (this.selectedIndex - 1 + filtered.length) % (filtered.length || 1);
      this.renderList();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[this.selectedIndex]) {
        this.close();
        filtered[this.selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      this.close();
    }
  },

  bindGlobalKeys: function() {
    window.addEventListener('keydown', (e) => {
      // Cmd+Shift+P or Ctrl+Shift+P or F1
      if ((e.key === 'P' || e.key === 'p') && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        this.open();
      } else if (e.key === 'F1') {
        e.preventDefault();
        this.open();
      } else if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }
};
