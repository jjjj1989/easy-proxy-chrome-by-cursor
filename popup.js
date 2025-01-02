document.addEventListener('DOMContentLoaded', function () {
  // 加载保存的设置
  chrome.storage.sync.get(['enableProxy', 'proxyType', 'proxyHost', 'proxyPort', 'bypassList'], function (items) {
    document.getElementById('enableProxy').checked = items.enableProxy === true;
    document.getElementById('proxyType').value = items.proxyType || 'http';
    document.getElementById('proxyHost').value = items.proxyHost || '';
    document.getElementById('proxyPort').value = items.proxyPort || '';
    document.getElementById('bypassList').value = items.bypassList || '';

    console.log('Loaded settings:', JSON.stringify(items));
  });

  // 保存设置
  document.getElementById('saveButton').addEventListener('click', function () {
    const settings = {
      enableProxy: document.getElementById('enableProxy').checked,
      proxyType: document.getElementById('proxyType').value,
      proxyHost: document.getElementById('proxyHost').value,
      proxyPort: document.getElementById('proxyPort').value,
      bypassList: document.getElementById('bypassList').value
    };

    console.log('Saving settings:', JSON.stringify(settings));

    chrome.storage.sync.set(settings, function () {
      if (chrome.runtime.lastError) {
        console.error('保存设置时出错:', chrome.runtime.lastError);
        alert('保存设置时出错，请重试。');
      } else {
        console.log('设置已保存');
        // 直接发送消息
        chrome.runtime.sendMessage({ action: "updateProxy" }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('发送消息时出错:', chrome.runtime.lastError);
          } else {
            console.log('消息已发送');
            alert('设置已保存');
          }
        });
      }
    });
  });
});