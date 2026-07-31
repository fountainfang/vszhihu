# 💻 VSCode Zhihu (知乎 VS Code 皮肤)

![Version](https://img.shields.io/badge/version-1.0.3-blue.svg)
![Manifest](https://img.shields.io/badge/Manifest-V3-green.svg)
![License](https://img.shields.io/badge/license-MIT-orange.svg)
[![GitHub stars](https://img.shields.io/github/stars/fountainfang/vszhihu?style=social)](https://github.com/fountainfang/vszhihu)

**VSCode Zhihu** 是一款突破性的 Chrome / Edge 浏览器插件，能将知乎（zhihu.com）全量重构为现代化的 **VS Code 编辑器界面**。

无论是在办公室摸鱼、学习技术，还是享受沉浸式的代码化阅读体验，VSCode Zhihu 都能让您以极致优雅的开发者视角浏览知乎！

---

## ✨ 核心特性

- 🎨 **VS Code 经典 IDE 布局**：完整还原左侧 Activity Bar（活动栏）、Sidebar Explorer（文件树）、内置多标签页（Tab Bar）、代码行号（Line Numbers）及底部 Status Bar（状态栏）。
- 🥷 **极致伪装与纯代码 Title (Stealth Mode & Code Titles)**：
  - 浏览器 Tab 页标题及内置标签页文件名**全量转换为纯 ASCII 代码文件名**（如 `question_20556808.ts`、`article_20659198.ts`、`recommend.ts`），**绝不出任何中文字样**。
  - 双重 `MutationObserver` 结合定时锁定机制，强力锁定官方 VS Code Favicon 及网页 Title，彻底拦截知乎 SPA/WebSocket 异步消息对标题的篡改。
- 📝 **代码化内容渲染与 CSS 干净清洗**：
  - 知乎首页推荐、全网热榜、问题回答及专栏文章均被智能格式化为结构优雅的 TypeScript / JSON 代码块。
  - 全量剥离知乎 Emotion / Styled-components 的内嵌 `<style>` 标签与 `.css-1od93p9{...}` 样式声明，输出零噪点干净正文。
- 🔄 **API 级动态无限滚动 (Answer Stream Pagination)**：
  - 滚动到底部时自动通过知乎 API 动态分页拉取后续回答（包含完整正文），解决知乎 SSR 初始只包含 2 条回答的问题。
- 💬 **VS Code 终端评论面板 (Terminal Comments Panel)**：
  - 点击评论自动唤起底部的 VS Code 终端面板，支持二级嵌套回复（`nestedReplies`）展开，并具备 DOM 重绘持久化保障，不会闪退或被覆盖。
- 🙈 **一键摸鱼老板键 (Stealth Boss Key)**：
  - 按下 <kbd>Alt</kbd> + <kbd>V</kbd>（或 <kbd>Option</kbd> + <kbd>V</kbd>）瞬间将屏幕伪装为 100% 逼真的现代 C++ 线程池源码。
- ⚡ **命令面板 (Command Palette)**：
  - 按下 <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd> 或 <kbd>F1</kbd> 唤起命令面板，支持模糊搜索知乎问题、快速跳转路由及切换主题。
- 🎨 **多款经典 VS Code 主题**：
  - **VS Code Dark+**（默认暗黑主题）
  - **One Dark Pro**
  - **Monokai**
  - **Light Modern**（浅色亮色模式）

---

## 🚀 安装指引

### 方式 1：Chrome Web Store 官方商店安装（推荐）
👉 [点击前往 Chrome Web Store 直接一键安装](https://chromewebstore.google.com/detail/vscode-zhihu-%E7%9F%A5%E4%B9%8E-vs-code-%E7%9A%AE/flfmjjfkfnmnlkhnfjghhefpapfcdedn?authuser=0&hl=zh-CN)

### 方式 2：开发者模式本地安装
1. **下载源码**：克隆或下载本仓库至本地文件夹：
   ```bash
   git clone https://github.com/fountainfang/vszhihu.git
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
| **点击代码内的 URL / 标题** | **内置新标签页打开**：直接在 VS Code 标签页中加载渲染 |
| **点击 `💬 XX 评论`** | **终端评论**：唤起底部 Terminal 面板查看评论及回复 |

---

## 📂 项目结构

```text
vszhihu/
├── manifest.json         # Manifest V3 扩展配置文件 (v1.0.3)
├── background.js          # 后台 Service Worker
├── content.js             # Content Script 入口脚本
├── README.md              # 项目说明文档
├── styles/
│   ├── vscode.css         # VS Code 界面主布局与组件样式
│   └── themes.css         # 颜色主题定义 (Dark+, One Dark, Monokai, Light)
├── scripts/
│   ├── preload.js         # document_start 零闪烁预加载脚本与标题/图标锁
│   ├── parser.js          # 知乎 DOM 解析、CSS 噪声清洗与 TypeScript 格式化引擎
│   ├── vscode-ui.js       # VS Code UI 渲染引擎、API 触底分页与 Terminal 评论面板
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
