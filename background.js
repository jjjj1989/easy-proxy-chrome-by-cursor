function getStorageData() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(['enableProxy', 'proxyType', 'proxyHost', 'proxyPort', 'bypassList'], (items) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(items);
      }
    });
  });
}

function getProcessedSettings(items) {
  return {
    enableProxy: items.enableProxy === true,
    proxyType: items.proxyType || 'http',
    proxyHost: items.proxyHost || '',
    proxyPort: items.proxyPort || '',
    bypassList: items.bypassList || ''
  };
}

function getBypassUrls(bypassList) {
  if (typeof bypassList === 'string') {
    return bypassList.split('\n').filter(url => url.trim() !== '');
  }
  console.warn('bypassList is not a string:', bypassList);
  return [];
}

async function updateProxySettings() {
  try {
    const items = await getStorageData();
    console.log('Retrieved items:', JSON.stringify(items));

    const { enableProxy, proxyType, proxyHost, proxyPort, bypassList } = getProcessedSettings(items);
    console.log('Processed settings:', JSON.stringify({ enableProxy, proxyType, proxyHost, proxyPort, bypassList }));

    // 根据代理是否启用设置图标颜色
    const iconPath = enableProxy ? 'icon-green.png' : 'icon-red.png';
    chrome.action.setIcon({ path: iconPath });

    if (enableProxy) {
      const bypassUrls = [...getBypassUrls(bypassList), '<local>'];
      console.log('Bypass URLs:', JSON.stringify(bypassUrls));

      if (!proxyHost || !proxyPort) {
        console.error('代理主机或端口未设置');
        return;
      }

      const config = {
        mode: "pac_script",
        pacScript: {
          data: `
            function FindProxyForURL(url, host) {
              const bypassList = ${JSON.stringify(bypassUrls)};
              for (const bypassUrl of bypassList) {
                if (shExpMatch(host, bypassUrl)) {
                  return 'DIRECT';
                }
              }
              return '${proxyType.toUpperCase()} ${proxyHost}:${proxyPort}';
            }
          `
        }
      };

      await new Promise((resolve, reject) => {
        chrome.proxy.settings.set({ value: config, scope: "regular" }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });

      console.log('代理设置已更新');
    } else {
      await new Promise((resolve, reject) => {
        chrome.proxy.settings.clear({ scope: "regular" }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });

      console.log('代理设置已清除');
    }
  } catch (error) {
    console.error('更新代理设置时出错:', error);
  }
}

// 监听来自 popup.js 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateProxy") {
    console.log('Received updateProxy message');
    updateProxySettings().then(() => sendResponse({ success: true })).catch((error) => sendResponse({ success: false, error }));
    return true; // 保持消息通道打开以支持异步响应
  }
});

// 初始化时更新代理设置
console.log('Background script initialized');
updateProxySettings();

// 添加存储变化监听器
chrome.storage.onChanged.addListener((changes, namespace) => {
  console.log('Storage changed:', JSON.stringify(changes));
  updateProxySettings();
});