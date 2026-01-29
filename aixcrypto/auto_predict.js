let LATEST_SESSION_ID = null;

// 拦截 fetch 获取 sessionId
(function() {
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const [url, options] = args;

    if (url.includes("/api/game/bet") && options && options.body) {
      try {
        const body = JSON.parse(options.body);
        if (body.sessionId) {
          LATEST_SESSION_ID = body.sessionId;
          console.log("✅ 捕获 sessionId:", LATEST_SESSION_ID);
        }
      } catch (e) { console.error(e); }
    }

    return originalFetch.apply(this, args);
  };
  console.log("🚀 fetch 拦截已安装");
})();

// 自动下注逻辑
let lastStatus = null;
let pendingTimer = null;

function watcher() {
  const statusSpan = [...document.querySelectorAll("span")]
    .find(el => el.textContent.trim() === "Placing Open" || el.textContent.trim() === "Settling");

  const status = statusSpan ? statusSpan.textContent.trim() : null;

  // 新一轮 Placing Open
  if (status === "Placing Open" && lastStatus !== "Placing Open") {
    scheduleBetAfterDelay();
  }

  // 离开 Placing Open
  if (status !== "Placing Open" && lastStatus === "Placing Open") {
    if (pendingTimer) { clearTimeout(pendingTimer); pendingTimer = null; }
  }

  lastStatus = status;
}

function scheduleBetAfterDelay() {
  const delay = 1000 + Math.random() * 4000; // 1~5 秒
  console.log("进入 Open，等待", Math.round(delay), "ms 后下注");

  pendingTimer = setTimeout(() => {
    pendingTimer = null;
    placeBet();
  }, delay);
}

function placeBet() {
  if (!LATEST_SESSION_ID) {
    console.warn("没有获取到 sessionId，等待下一轮...");
    return;
  }

  // 随机选择 UP / DOWN
  const prediction = Math.random() < 0.5 ? "UP" : "DOWN";

  fetch("https://hub.aixcrypto.ai/api/game/bet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prediction, sessionId: LATEST_SESSION_ID })
  })
    .then(res => res.json())
    .then(data => {
      console.log("下注结果:", prediction, data, new Date().toLocaleTimeString());
    })
    .catch(err => console.error("下注失败:", err));
}

// 每 200ms 监听状态
window._autoBetWatcher = setInterval(watcher, 200);

// 停止脚本用：
/*
clearInterval(window._autoBetWatcher);
*/
