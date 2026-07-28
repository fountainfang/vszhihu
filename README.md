# 💻 VSCode Zhihu (知乎 VS Code 皮肤)

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Manifest](https://img.shields.io/badge/Manifest-V3-green.svg)
![License](https://img.shields.io/badge/license-MIT-orange.svg)

**VSCode Zhihu** 是一款突破性的 Chrome / Edge 浏览器插件，能将知乎（zhihu.com）全量重构为现代化的 **VS Code 编辑器界面**。

无论是在办公室摸鱼、学习技术，还是享受沉浸式的代码化阅读体验，VSCode Zhihu 都能让您以极致优雅的开发者视角浏览知乎！

---

## ✨ 核心特性

- 🎨 **VS Code 经典 IDE 布局**：完整还原左侧 Activity Bar（活动栏）、Sidebar Explorer（文件树）、多标签页（Tab Bar）、代码行号（Line Numbers）及底部 Status Bar（状态栏）。
- 📝 **代码化内容渲染**：知乎首页推荐、全网热榜、问题回答及专栏文章均被智能格式化为结构优雅的 TypeScript / JSON 代码块。
- 💬 **VS Code 终端评论面板 (Terminal Comments Panel)**：
  - 点击评论自动唤起底部的 VS Code 终端面板，实时执行 `zhihu-cli comments` 命令。
  - 直连知乎官方 API 实时拉取最新评论与二级嵌套回复（`nestedReplies`），以树状 ASCII 日志形式清晰展现。
- 🙈 **一键摸鱼老板键 (Stealth Mode)**：
  - 按下 <kbd>Alt</kbd> + <kbd>V</kbd>（或 <kbd>Option</kbd> + <kbd>V</kbd>）瞬间将屏幕伪装为 100% 逼真的现代 C++ 线程池源码。
- ⚡ **命令面板 (Command Palette)**：
  - 按下 <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd> 或 <kbd>F1</kbd> 唤起命令面板，支持模糊搜索知乎问题、快速跳转路由及切换主题。
- 🎨 **多款经典 VS Code 主题**：
  - **VS Code Dark+**（默认暗黑主题）
  - **One Dark Pro**
  - **Monokai**
  - **Light Modern**（亮色浅色模式）
- 🔄 **无感无限滚动 (Infinite Scroll)**：向下滑动到底部自动同步加载下一页回答与推荐 Feed，滚动位置平滑保持不跳动。

---

## 🚀 安装指引

1. **下载源码**：克隆或下载本仓库至本地文件夹：
   ```bash
   git clone https://github.com/your-username/vszhihu.git
   ```
2. **打开 Chrome 扩展管理**：
   在浏览器地址栏输入 `chrome://extensions` 并按回车。
3. **开启开发者模式**：
   勾选右上角的 **“开发者模式” (Developer mode)** 开关。
4. **加载插件**：
   点击左上角的 **“加载已解压的扩展程序” (Load unpacked)** 按钮，选择本项目文件夹目录 `/vszhihu`。
5. **开始使用**：
   打开 [https://www.zhihu.com](https://www.zhihu.com) 或任意知乎问题/专栏文章页面，即可享受 VS Code 风格！

---

## ⌨️ 快捷键指南

| 快捷键 | 功能描述 |
| :--- | :--- |
| <kbd>Alt</kbd> + <kbd>V</kbd> (或 <kbd>Option</kbd> + <kbd>V</kbd>) | **摸鱼老板键**：瞬间切换/退出伪装 C++ 源码 |
| <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd> / <kbd>F1</kbd> | **命令面板**：搜索知乎、切换主题、跳转路由 |
| **点击代码内的 URL / 标题** | **代码跳转**：直接在 VS Code 界面中打开该问题/文章 |
| **点击 `💬 XX 评论`** | **终端评论**：唤起底部 Terminal 面板查看评论及回复 |

---

## 📂 项目结构

```text
vszhihu/
├── manifest.json         # Manifest V3 扩展配置文件
├── background.js          # 后台 Service Worker
├── content.js             # Content Script 入口脚本
├── README.md              # 项目说明文档
├── styles/
│   ├── vscode.css         # VS Code 界面主布局与组件样式
│   └── themes.css         # 颜色主题定义 (Dark+, One Dark, Monokai, Light)
├── scripts/
│   ├── parser.js          # 知乎 DOM 解析与 TypeScript 代码格式化引擎
│   ├── vscode-ui.js       # VS Code UI 渲染引擎与 Terminal 评论面板逻辑
│   └── command-palette.js # Cmd+Shift+P 命令面板模块
├── popup/                 # 扩展控制弹窗 UI
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
└── icons/                 # 扩展图标 (16px, 48px, 128px)
```

---

## 📄 开源协议

本项目基于 [MIT License](LICENSE) 协议开源。
