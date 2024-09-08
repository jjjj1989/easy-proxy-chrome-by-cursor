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

async function updateProxySettings() {
  try {
    const items = await getStorageData();
    console.log('Retrieved items:', JSON.stringify(items));

    // 添加默认值
    const enableProxy = items.enableProxy === true;
    const proxyType = items.proxyType || 'http';
    const proxyHost = items.proxyHost || '';
    const proxyPort = items.proxyPort || '';
    const bypassList = items.bypassList || '';

    console.log('Processed settings:', JSON.stringify({ enableProxy, proxyType, proxyHost, proxyPort, bypassList }));

    if (enableProxy) {
      let bypassUrls = [];
      if (typeof bypassList === 'string') {
        bypassUrls = bypassList.split('\n').filter(url => url.trim() !== '');
      } else {
        console.warn('bypassList is not a string:', bypassList);
      }
      bypassUrls.push('<local>');

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
              var bypassList = ${JSON.stringify(bypassUrls)};
              for (var i = 0; i < bypassList.length; i++) {
                if (shExpMatch(host, bypassList[i])) {
                  return 'DIRECT';
                }
              }
              return '${proxyType.toUpperCase()} ${proxyHost}:${proxyPort}';
            }
          `
        }
      };

      await new Promise((resolve, reject) => {
        chrome.proxy.settings.set({value: config, scope: "regular"}, () => {
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
        chrome.proxy.settings.clear({scope: "regular"}, () => {
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

// 监听来自popup.js的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateProxy") {
    console.log('Received updateProxy message');
    updateProxySettings();
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