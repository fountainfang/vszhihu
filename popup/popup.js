// VSCode Zhihu - Compact Pro Popup Script

document.addEventListener('DOMContentLoaded', () => {
  const toggleEnabled = document.getElementById('toggle-enabled');
  const selectTheme = document.getElementById('select-theme');
  const btnBoss = document.getElementById('btn-boss');
  
  const proTag = document.getElementById('pro-tag');
  const inputLicenseKey = document.getElementById('input-license-key');
  const btnActivatePro = document.getElementById('btn-activate-pro');
  const btnCopyCrypto = document.getElementById('btn-copy-crypto');

  let isProUser = false;
  const cryptoAddress = '0x51CA20f139462939788e703542517e4feea2Da10';

  // Safely send message to active tab content script
  function safeSendMessageToActiveTab(message) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, message, () => {
          if (chrome.runtime.lastError) {
            // Suppress error if active tab is not zhihu.com
          }
        });
      }
    });
  }

  // Cryptographic Salt License Key Verification Algorithm
  function verifyLicenseKey(key) {
    key = key.trim().toUpperCase();

    // Master VIP keys
    if (['PRO-2026-VIP', 'VIP-8888', 'ZH7675A', 'PRO-VIP-888'].includes(key)) return true;

    const parts = key.split('-');
    if (parts.length !== 3 || parts[0] !== 'PRO') return false;

    const body = parts[1];
    const checksum = parts[2];

    if (!body || !checksum || body.length < 4) return false;

    let hash = 0;
    const salt = 'vszhihu7675';
    const str = body + salt;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    const expectedChecksum = Math.abs(hash % 9000 + 1000).toString();
    return checksum === expectedChecksum;
  }

  function updateProUI(isPro, key = '') {
    isProUser = isPro;
    if (isPro) {
      proTag.innerText = 'PRO VIP';
      proTag.classList.add('active');
      if (key) inputLicenseKey.value = key;
      inputLicenseKey.disabled = true;
      inputLicenseKey.placeholder = 'PRO 已激活 ✨';
      btnActivatePro.innerText = '已激活';
      btnActivatePro.disabled = true;
      btnActivatePro.style.backgroundColor = '#4ec9b0';
    } else {
      proTag.innerText = 'FREE';
      proTag.classList.remove('active');
    }
  }

  // Load saved settings
  chrome.storage.sync.get(['enabled', 'theme', 'isPro', 'licenseKey'], (res) => {
    if (res.enabled !== undefined) {
      toggleEnabled.checked = res.enabled;
    }

    updateProUI(!!res.isPro, res.licenseKey || '');

    if (res.theme) {
      if (!res.isPro && res.theme !== 'dark-plus') {
        selectTheme.value = 'dark-plus';
        chrome.storage.sync.set({ theme: 'dark-plus' });
      } else {
        selectTheme.value = res.theme;
      }
    }
  });

  // Activate Pro License Key
  btnActivatePro.addEventListener('click', () => {
    const rawKey = inputLicenseKey.value.trim().toUpperCase();
    if (!rawKey) {
      alert('请输入有效的 Pro 激活码！');
      return;
    }

    if (verifyLicenseKey(rawKey)) {
      chrome.storage.sync.set({ isPro: true, licenseKey: rawKey }, () => {
        updateProUI(true, rawKey);
        alert('🎉 恭喜！Pro 尊享版激活成功！您现在可以自由切换所有 7 款高级主题样式！');
      });
    } else {
      alert('❌ 激活码无效！\n\n请核对您在爱发电获取的官方卡密，格式如：PRO-XXXXXX-YYYY。');
    }
  });

  // Enable/Disable toggle handler
  toggleEnabled.addEventListener('change', () => {
    chrome.storage.sync.set({ enabled: toggleEnabled.checked }, () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0] && tabs[0].id && tabs[0].url && tabs[0].url.includes('zhihu.com')) {
          chrome.tabs.reload(tabs[0].id);
        }
      });
    });
  });

  // Theme selection handler (Gated for Pro)
  selectTheme.addEventListener('change', () => {
    const selectedTheme = selectTheme.value;

    if (selectedTheme !== 'dark-plus' && !isProUser) {
      alert('🔒 该主题为 Pro 尊享皮肤！\n\n请在上方输入 Pro 激活码，或点击【爱发电】赞赏直接获取激活码！');
      selectTheme.value = 'dark-plus';
      return;
    }

    chrome.storage.sync.set({ theme: selectedTheme }, () => {
      safeSendMessageToActiveTab({ action: 'setTheme', theme: selectedTheme });
    });
  });

  // Stealth boss mode test button
  btnBoss.addEventListener('click', () => {
    safeSendMessageToActiveTab({ action: 'toggleBossKey' });
  });

  // Copy Crypto Wallet Address
  btnCopyCrypto?.addEventListener('click', () => {
    navigator.clipboard.writeText(cryptoAddress).then(() => {
      btnCopyCrypto.innerText = '已复制!';
      setTimeout(() => {
        btnCopyCrypto.innerText = '🪙 Crypto 钱包';
      }, 1500);
    });
  });
});
