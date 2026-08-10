---
tags:
  - 测试记录
  - Playwright实现
  - WebPageTest
  - 性能
---

# WebPageTest 实现记录（Claude Code + Playwright）

> 用 **Claude Code 驱动 Playwright** 实现 [[02-WebPageTest]] 的核心功能：资源瀑布图（Waterfall）+ 电影胶片（Filmstrip）+ 加载时序。

## 0. 测试环境

| 项目 | 值 |
|---|---|
| 日期 | 2026-08-06 |
| 实现方式 | 真实浏览器加载 + 记录每个资源请求时序 + 逐帧截图 |
| 驱动方式 | Claude Code 编写/运行脚本 + 解读结果 |
| 脚本 | `02-实现脚本/05-webpagetest.js` |
| 靶标 | Juice Shop `http://localhost:3000`（首页，冷启动） |

## 1. 实现方法（怎么做）

WebPageTest 的核心产出是**瀑布图**（每个资源的加载时序）与**电影胶片**（首屏逐帧）。Playwright 实现：

1. **瀑布图数据**：加载后遍历 `performance.getEntriesByType('resource')`，得到每个资源的 `start / end / duration / type / size`，按开始时间排序（再合并 HTTP 状态码）。
2. **电影胶片**：在加载过程的关键时间点（0 / 250 / 500 / 1000 / 2000 / 4000ms / 完全加载）截屏。
3. **时序指标**：TTFB / First Paint / FCP / DCL / Load / Fully Loaded（networkidle）。

```js
// 核心（05-webpagetest.js）
const data = await page.evaluate(() => ({
  waterfall: performance.getEntriesByType('resource').map(r => ({
    start: Math.round(r.startTime), end: Math.round(r.responseEnd),
    duration: Math.round(r.responseEnd - r.startTime),
    type: r.initiatorType, size: r.transferSize || 0,
  })).sort((a, b) => a.start - b.start),
  timings: { ttfb, firstPaint, domContentLoaded, load, ... },
}));
```

产物：`05-webpagetest.json`（全量数据）+ `05-waterfall.html`（自绘瀑布图，浏览器可开）+ `filmstrip/*.png`（7 帧截图）。

## 2. 测试结果（首页）

### 加载时序

| 指标 | 实测 | 达标线 |
|---|---|---|
| **TTFB** | 5 ms | < 0.8s |
| First Paint | 160 ms | — |
| **FCP**（首次内容绘制） | 164 ms | — |
| DOMContentLoaded | 149 ms | — |
| Load | 183 ms | — |
| **Fully Loaded**（networkidle） | **4531 ms** | 越短越好 |

> ⚠️ 有趣发现：`Load` 只有 183ms，但 `Fully Loaded` 却要 4.5s——因为 Juice Shop 用 **socket.io 长连接**，networkidle 要等 socket 稳定。这类"页面已渲染但网络未完全安静"的现象，正是瀑布图/时序指标才能暴露的。

### 资源瀑布（53 个请求，~1.0 MB）

| 类型 | 请求数 | 传输量 |
|---|---|---|
| img | 17 | 460 KB |
| script | 5 | 314 KB |
| css | 1 | 129 KB |
| other | 11 | 79 KB |
| xmlhttprequest | 18 | 34 KB |
| link | 1 | 22 KB |

### 最慢的 5 个资源

| 耗时 | 类型 | URL |
|---|---|---|
| 192 ms | XHR | `/api/Challenges/?name=Score%20Board` |
| 166 ms | XHR | `/api/Challenges/?name=Score%20Board`（重复请求） |
| 146 ms | XHR | `/api/Quantitys/` |
| 112 ms | XHR | `/socket.io/?EIO=4...` |
| 105 ms | XHR | `/rest/products/search?q=` |

> 解读：瓶颈集中在 API 调用（Challenges / Quantitys 被重复请求），这是 SPA 的典型性能问题——同接口多次请求可以合并/缓存。

### 电影胶片

`03-测试记录/assets/filmstrip/00_commit.png … 06_fully_loaded.png`（7 帧，首屏渲染过程）。

## 3. 与原工具对比

| 能力 | 原工具 | Playwright 实现 | 可实现度 |
|---|---|---|---|
| 瀑布图 | ✅ | ✅ 数据 + HTML 自绘 | **100%** |
| 电影胶片 | ✅ | ✅ 逐帧 PNG | **100%** |
| TTFB/FCP/LCP/Fully Loaded | ✅ | ✅ | 100% |
| 多地域节点 | ✅ | ❌ 仅本地 | 弱 |
| 模拟网速（3G/4G） | ✅ | ⚠️ 可用 CDP `Network.emulateNetworkConditions` | 可实现 |
| 多轮取均值 | ✅ | 循环跑 N 次取中位数 | 100% |

## 4. 结论

- **核心可实现**：瀑布图数据 + 电影胶片 + 时序指标，信息量与 WebPageTest 等价。
- 本靶场测试揭示了 Juice Shop 的真实性能特征：**首屏快（Load 183ms）、长尾慢（socket.io + 重复 API 请求导致 4.5s networkidle）**。
- 唯一不可实现的是**多地域云端节点**（那是 WPT 的分布式基础设施）；但本地性能诊断（瀑布/胶片）完全够用。
- 若需要视觉化瀑布图，`05-waterfall.html` 即开即用；也可升级为 SVG/PNG 导出。

## 相关
- [[02-WebPageTest]] · [[测试记录_2026-08-06_Playwright实现_Lighthouse_JuiceShop]]（评分视角）
- 附：`03-测试记录/assets/05-waterfall.html` · `03-测试记录/assets/filmstrip/`
