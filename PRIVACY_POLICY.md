# Privacy Policy for VSCode Zhihu

**Last updated: July 28, 2026**

VSCode Zhihu ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how our Chrome extension handles information when you use it.

## 1. Data Collection & Usage
VSCode Zhihu **does NOT collect, store, transmit, or share any personal data or user information**.

- **No Remote Servers**: All code transformation, DOM formatting, theme switching, and local settings take place entirely inside your local web browser.
- **No Analytics / Tracking**: We do not use any analytics, telemetry, tracking scripts, or third-party cookies.
- **Local Storage Only**: User preferences (such as selected theme, font size, and enabled status) are stored exclusively in your browser's local storage (`chrome.storage.sync`) and are never sent to external servers.

## 2. Permissions Justification
- `https://*.zhihu.com/*`: Required solely to inject custom layout CSS and format DOM elements into VS Code code style on zhihu.com.
- `storage`: Required to save your local UI preferences (selected theme and enabled toggle state).

## 3. Third-Party Web APIs
When you click on the Terminal comment panel, the extension connects directly to Zhihu's public APIs (`https://www.zhihu.com/api/v4/...`) from your browser to load comment threads. We do not inspect or proxy any of these requests.

## 4. Contact & Support
If you have any questions about this Privacy Policy, you can reach out via GitHub or creator support.
